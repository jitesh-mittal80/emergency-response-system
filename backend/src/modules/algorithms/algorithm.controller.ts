import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth';
import { buildDelhiRoadGraph, nearestNode } from './roadGraph';
import { astar } from './astar';
import { dijkstra } from './dijkstra';
import { prisma } from '../../utils/prisma';
import { createError } from '../../middleware/errorHandler';

const coordSchema = z.object({
  originLat: z.number(),
  originLng: z.number(),
  destLat: z.number(),
  destLng: z.number(),
  emergencyId: z.string().optional(),
});

function buildResult(type: 'ASTAR' | 'DIJKSTRA', graph: ReturnType<typeof buildDelhiRoadGraph>, originNode: string, destNode: string) {
  const result = type === 'ASTAR' ? astar(graph, originNode, destNode) : dijkstra(graph, originNode, destNode);
  const pathCoords = result.path.map((nodeId) => {
    const n = graph.nodes.get(nodeId)!;
    return { lat: n.lat, lng: n.lng };
  });
  return { ...result, pathCoords, algorithm: type };
}

export async function runAstar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { originLat, originLng, destLat, destLng, emergencyId } = coordSchema.parse(req.body);
    const graph = buildDelhiRoadGraph();
    const originNode = nearestNode(graph, originLat, originLng);
    const destNode = nearestNode(graph, destLat, destLng);
    const result = buildResult('ASTAR', graph, originNode, destNode);

    if (emergencyId && result.found) {
      await prisma.algorithmExecution.create({
        data: {
          emergencyId,
          algorithm: 'ASTAR',
          executionTimeMs: result.executionTimeMs,
          exploredNodes: result.exploredNodes,
          pathDistance: result.cost,
          pathCost: result.cost,
          pathJson: result.path,
        },
      });
    }

    res.json({ result });
  } catch (err) {
    next(err);
  }
}

export async function runDijkstra(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { originLat, originLng, destLat, destLng, emergencyId } = coordSchema.parse(req.body);
    const graph = buildDelhiRoadGraph();
    const originNode = nearestNode(graph, originLat, originLng);
    const destNode = nearestNode(graph, destLat, destLng);
    const result = buildResult('DIJKSTRA', graph, originNode, destNode);

    if (emergencyId && result.found) {
      await prisma.algorithmExecution.create({
        data: {
          emergencyId,
          algorithm: 'DIJKSTRA',
          executionTimeMs: result.executionTimeMs,
          exploredNodes: result.exploredNodes,
          pathDistance: result.cost,
          pathCost: result.cost,
          pathJson: result.path,
        },
      });
    }

    res.json({ result });
  } catch (err) {
    next(err);
  }
}

export async function getComparison(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { emergencyId } = req.params;

    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id: emergencyId },
      include: { dispatch: { include: { ambulance: true } } },
    });
    if (!emergency) return next(createError('Emergency not found', 404));

    const ambulance = emergency.dispatch?.ambulance;
    const graph = buildDelhiRoadGraph();
    const originLat = ambulance?.latitude ?? emergency.latitude;
    const originLng = ambulance?.longitude ?? emergency.longitude;
    const destLat = emergency.latitude;
    const destLng = emergency.longitude;

    const originNode = nearestNode(graph, originLat, originLng);
    const destNode = nearestNode(graph, destLat, destLng);

    const astarResult = buildResult('ASTAR', graph, originNode, destNode);
    const dijkstraResult = buildResult('DIJKSTRA', graph, originNode, destNode);

    const winner = astarResult.executionTimeMs <= dijkstraResult.executionTimeMs ? 'ASTAR' : 'DIJKSTRA';
    const speedupPercent = winner === 'ASTAR'
      ? ((dijkstraResult.executionTimeMs - astarResult.executionTimeMs) / dijkstraResult.executionTimeMs) * 100
      : ((astarResult.executionTimeMs - dijkstraResult.executionTimeMs) / astarResult.executionTimeMs) * 100;

    // Persist executions
    for (const r of [astarResult, dijkstraResult]) {
      if (r.found) {
        const existing = await prisma.algorithmExecution.findFirst({
          where: { emergencyId, algorithm: r.algorithm as 'ASTAR' | 'DIJKSTRA' },
        });
        if (!existing) {
          await prisma.algorithmExecution.create({
            data: {
              emergencyId,
              algorithm: r.algorithm as 'ASTAR' | 'DIJKSTRA',
              executionTimeMs: r.executionTimeMs,
              exploredNodes: r.exploredNodes,
              pathDistance: r.cost,
              pathCost: r.cost,
              pathJson: r.path,
            },
          });
        }
      }
    }

    res.json({
      comparison: {
        astar: astarResult,
        dijkstra: dijkstraResult,
        winner,
        speedupPercent: Math.round(speedupPercent * 100) / 100,
        startNodeId: originNode,
        goalNodeId: destNode,
      },
    });
  } catch (err) {
    next(err);
  }
}
