import { prisma } from '../../utils/prisma';
import { haversineDistance } from '../../utils/haversine';
import { getRoute } from '../routing/routingService';
import { buildDelhiRoadGraph, nearestNode } from '../algorithms/roadGraph';
import { astar } from '../algorithms/astar';
import { dijkstra } from '../algorithms/dijkstra';
import { getIO, SocketEvents } from '../../sockets/socketServer';
import { logger } from '../../utils/logger';

// The graph's edges are scaled by this factor to approximate road distance.
// Keep the off-graph portions of a journey on the same scale when an
// ambulance or emergency does not fall exactly on an intersection node.
const ROAD_DISTANCE_FACTOR = 1.35;

export interface DispatchResult {
  success: boolean;
  dispatchId?: string;
  ambulanceId?: string;
  distanceKm?: number;
  etaMinutes?: number;
  error?: string;
}

// Only one queue worker may assign waiting emergencies at a time. This keeps
// requests in creation order even when several ambulances become available
// close together.
let waitingQueuePromise: Promise<void> | null = null;

/**
 * Assign waiting emergencies in first-come-first-served order while an
 * ambulance is available. The closest suitable ambulance is still selected
 * for each individual emergency by dispatchAmbulance.
 */
export function processWaitingEmergencyQueue(): Promise<void> {
  if (waitingQueuePromise) return waitingQueuePromise;

  const processQueue = async (): Promise<void> => {
    while (true) {
      const availableCount = await prisma.ambulance.count({
        where: { status: 'AVAILABLE' },
      });
      if (availableCount === 0) return;

      const nextEmergency = await prisma.emergencyRequest.findFirst({
        where: { status: 'WAITING_FOR_AMBULANCE' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (!nextEmergency) return;

      const result = await dispatchAmbulance(nextEmergency.id);
      if (!result.success || !result.dispatchId) {
        // Stop rather than repeatedly retrying an emergency that cannot be
        // routed at the moment; it remains first in the waiting queue.
        logger.warn(`[Dispatch] Could not assign waiting emergency ${nextEmergency.id}: ${result.error}`);
        return;
      }

      await emitDispatchEvents(result.dispatchId);
    }
  };

  const processing = processQueue();
  waitingQueuePromise = processing;
  const releaseQueue = () => {
    if (waitingQueuePromise === processing) waitingQueuePromise = null;
  };
  void processing.then(releaseQueue, releaseQueue);

  return processing;
}

/**
 * Core dispatch engine.
 * 1. Fetch all AVAILABLE ambulances at their latest tracked positions.
 * 2. Run A* from every ambulance's nearest road-graph node to the emergency.
 * 3. Select the ambulance with the lowest AI road-network cost.
 * 4. Fetch the selected ambulance's fastest drivable route and ETA.
 * 5. Assign ambulance, store route on both ambulance and dispatch records.
 * 6. Tell SimulationEngine to stop random roaming and follow the dispatch route.
 * 7. Run A* + Dijkstra comparison asynchronously for analytics.
 * 8. Emit Socket.IO events.
 */
export async function dispatchAmbulance(emergencyId: string): Promise<DispatchResult> {
  // ── 1. Fetch emergency ───────────────────────────────────────────────────
  const emergency = await prisma.emergencyRequest.findUnique({
    where: { id: emergencyId },
    include: { patient: true },
  });

  if (!emergency) return { success: false, error: 'Emergency not found' };
  if (emergency.status !== 'PENDING' && emergency.status !== 'WAITING_FOR_AMBULANCE') {
    return { success: false, error: 'Emergency is not in dispatchable state' };
  }

  // ── 2. Fetch available ambulances ────────────────────────────────────────
  const available = await prisma.ambulance.findMany({
    where: { status: 'AVAILABLE' },
  });

  if (available.length === 0) {
    await prisma.emergencyRequest.update({
      where: { id: emergencyId },
      data: { status: 'WAITING_FOR_AMBULANCE' },
    });
    return { success: false, error: 'No available ambulances' };
  }

  // ── 3. Pre-filter by straight-line distance ──────────────────────────────
  // ── 4. Compute road ETA for each candidate, pick the best ────────────────
  const graph = buildDelhiRoadGraph();
  const destinationNodeId = nearestNode(graph, emergency.latitude, emergency.longitude);
  const destinationNode = graph.nodes.get(destinationNodeId)!;

  // Evaluate every AVAILABLE ambulance from its latest position.  A* finds the
  // shortest traversable route through the road graph; the two small connector
  // distances account for locations that lie between graph intersections.
  const candidates = available
    .map((amb) => {
      const originNodeId = nearestNode(graph, amb.latitude, amb.longitude);
      const originNode = graph.nodes.get(originNodeId)!;
      const result = astar(graph, originNodeId, destinationNodeId);
      const connectorCost = (
        haversineDistance(amb.latitude, amb.longitude, originNode.lat, originNode.lng) +
        haversineDistance(emergency.latitude, emergency.longitude, destinationNode.lat, destinationNode.lng)
      ) * ROAD_DISTANCE_FACTOR;

      return { amb, result, totalRoadCost: result.cost + connectorCost };
    })
    .filter((candidate) => candidate.result.found)
    .sort((a, b) => a.totalRoadCost - b.totalRoadCost);

  if (candidates.length === 0) {
    await prisma.emergencyRequest.update({
      where: { id: emergencyId },
      data: { status: 'WAITING_FOR_AMBULANCE' },
    });
    return { success: false, error: 'No available ambulance can reach this emergency' };
  }

  const bestCandidate = candidates[0];
  const bestAmbulance = bestCandidate.amb;

  // A* selects the closest ambulance over the local road graph.  The routing
  // provider then supplies an exact, drivable route and ETA from the selected
  // ambulance's current GPS position (traffic-aware when Google Routes is on).
  const bestRoute = await getRoute(
    bestAmbulance.latitude, bestAmbulance.longitude,
    emergency.latitude, emergency.longitude
  );
  const bestEta = bestRoute.durationMinutes;

  // ── 5. Atomically assign ambulance ───────────────────────────────────────
  await prisma.$transaction([
    prisma.ambulance.update({
      where: { id: bestAmbulance.id },
      data: {
        status: 'ASSIGNED',
        assignedEmergencyId: emergencyId,
        currentRoute: bestRoute.points as object[],
      },
    }),
    prisma.emergencyRequest.update({
      where: { id: emergencyId },
      data: { status: 'ASSIGNED' },
    }),
  ]);

  // ── 6. Create dispatch record ─────────────────────────────────────────────
  const dispatch = await prisma.dispatch.create({
    data: {
      emergencyId,
      ambulanceId: bestAmbulance.id,
      distanceKm: bestRoute.distanceKm,
      initialEtaMinutes: bestEta,
      currentEtaMinutes: bestEta,
      route: bestRoute.points as object[],
      status: 'ASSIGNED',
    },
    include: {
      ambulance: true,
      emergency: { include: { patient: true } },
    },
  });

  // ── 7. Tell simulation engine to follow the dispatch route ────────────────
  //    Import lazily to avoid circular dependency at module load time.
  setImmediate(async () => {
    try {
      const { SimulationEngine } = await import('../simulation/simulationEngine');
      const { getIO: io } = await import('../../sockets/socketServer');
      const sim = SimulationEngine.getInstance(io());
      sim.pauseAmbulance(
        bestAmbulance.id,
        bestRoute.points,
        emergency.latitude,
        emergency.longitude
      );
      logger.info(`[Dispatch] Simulation told to route ${bestAmbulance.name} to emergency ${emergencyId}`);
    } catch (err) {
      logger.error('[Dispatch] Failed to update simulation route:', err);
    }
  });

  // ── 8. Run AI algorithm comparison async (analytics only) ────────────────
  setImmediate(async () => {
    try {
      const graph = buildDelhiRoadGraph();
      const originNode = nearestNode(graph, bestAmbulance.latitude, bestAmbulance.longitude);
      const destNode = nearestNode(graph, emergency.latitude, emergency.longitude);

      const astarResult = astar(graph, originNode, destNode);
      const dijkstraResult = dijkstra(graph, originNode, destNode);

      await prisma.algorithmExecution.createMany({
        data: [
          {
            emergencyId,
            algorithm: 'ASTAR',
            executionTimeMs: astarResult.executionTimeMs,
            exploredNodes: astarResult.exploredNodes,
            pathDistance: astarResult.cost,
            pathCost: astarResult.cost,
            pathJson: astarResult.path,
          },
          {
            emergencyId,
            algorithm: 'DIJKSTRA',
            executionTimeMs: dijkstraResult.executionTimeMs,
            exploredNodes: dijkstraResult.exploredNodes,
            pathDistance: dijkstraResult.cost,
            pathCost: dijkstraResult.cost,
            pathJson: dijkstraResult.path,
          },
        ],
        skipDuplicates: true,
      });
    } catch (err) {
      logger.error('Failed to save algorithm executions:', err);
    }
  });

  return {
    success: true,
    dispatchId: dispatch.id,
    ambulanceId: bestAmbulance.id,
    distanceKm: bestRoute.distanceKm,
    etaMinutes: bestEta,
  };
}

/**
 * Emit dispatch-related socket events (called after assignment completes).
 */
export async function emitDispatchEvents(dispatchId: string): Promise<void> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: {
        ambulance: true,
        emergency: { include: { patient: true } },
      },
    });
    if (!dispatch) return;

    const io = getIO();

    io.emit(SocketEvents.DISPATCH_ASSIGNED, {
      dispatch,
      emergency: dispatch.emergency,
      ambulance: dispatch.ambulance,
    });

    io.emit(SocketEvents.AMBULANCE_STATUS_UPDATE, {
      ambulanceId: dispatch.ambulanceId,
      status: dispatch.ambulance.status,
      assignedEmergencyId: dispatch.emergencyId,
    });

    io.emit(SocketEvents.EMERGENCY_STATUS_UPDATE, {
      emergencyId: dispatch.emergencyId,
      status: dispatch.emergency.status,
    });
  } catch (err) {
    logger.error('emitDispatchEvents error:', err);
  }
}
