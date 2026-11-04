import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../../utils/prisma';
import { haversineDistance } from '../../utils/haversine';
import { getRoute } from '../routing/routingService';
import { SocketEvents } from '../../sockets/socketServer';
import { logger } from '../../utils/logger';

// West Delhi bounding box
const BOUNDS = {
  minLat: 28.540,
  maxLat: 28.660,
  minLng: 77.020,
  maxLng: 77.110,
};

interface AmbulanceState {
  id: string;
  lat: number;
  lng: number;
  /** Full route waypoints for current journey */
  routePoints: Array<{ lat: number; lng: number }>;
  routeIndex: number;
  /** true = following a dispatch route; false = random roaming */
  isDispatched: boolean;
  /** emergency coords when dispatched, for arrival check */
  targetLat?: number;
  targetLng?: number;
  /** prevent repeated ON_SCENE fires */
  arrivedAtScene: boolean;
  /** prevents overlapping road-route requests when a route ends */
  isRouting?: boolean;
}

const TICK_MS = parseInt(process.env.SIMULATION_TICK_MS || '3000', 10);
const SPEED_MULTIPLIER = parseFloat(process.env.SIMULATION_SPEED_MULTIPLIER || '1');
const HISTORY_WRITE_EVERY = 5;

// Arrival threshold: 50 metres — ambulance must visually overlap the patient pin
const ARRIVAL_THRESHOLD_KM = 0.05;

export class SimulationEngine {
  private static instance: SimulationEngine;
  private io: SocketIOServer;
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private states = new Map<string, AmbulanceState>();
  private tickCount = 0;

  private constructor(io: SocketIOServer) {
    this.io = io;
  }

  static getInstance(io?: SocketIOServer): SimulationEngine {
    if (!SimulationEngine.instance) {
      if (!io) throw new Error('IO required for first SimulationEngine instantiation');
      SimulationEngine.instance = new SimulationEngine(io);
    }
    return SimulationEngine.instance;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    const ambulances = await prisma.ambulance.findMany({
      where: { status: { not: 'OFFLINE' } },
    });

    for (const amb of ambulances) {
      if (amb.status === 'ASSIGNED' || amb.status === 'EN_ROUTE' || amb.status === 'ON_SCENE') {
        // Reload the dispatch route from DB so we follow the right path after restart
        const dispatch = await prisma.dispatch.findFirst({
          where: { ambulanceId: amb.id, status: { in: ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE'] } },
          include: { emergency: true },
        });

        const routePoints = (amb.currentRoute as Array<{ lat: number; lng: number }>) || [];
        this.states.set(amb.id, {
          id: amb.id,
          lat: amb.latitude,
          lng: amb.longitude,
          routePoints,
          routeIndex: 0,
          isDispatched: true,
          targetLat: dispatch?.emergency.latitude,
          targetLng: dispatch?.emergency.longitude,
          arrivedAtScene: amb.status === 'ON_SCENE',
        });
      } else {
        await this.initRoam(amb.id, amb.latitude, amb.longitude);
      }
    }

    this.timer = setInterval(() => this.tick(), TICK_MS);
    logger.info(`Simulation started — tick every ${TICK_MS}ms, speed ×${SPEED_MULTIPLIER}`);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.running = false;
    logger.info('Simulation stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Called by the dispatch engine when an ambulance is assigned.
   * Immediately switches the ambulance from random roaming to following
   * the dispatch route toward the patient.
   */
  pauseAmbulance(
    ambulanceId: string,
    routePoints: Array<{ lat: number; lng: number }>,
    targetLat?: number,
    targetLng?: number
  ): void {
    const existing = this.states.get(ambulanceId);
    const currentLat = existing?.lat ?? routePoints[0]?.lat ?? 0;
    const currentLng = existing?.lng ?? routePoints[0]?.lng ?? 0;

    this.states.set(ambulanceId, {
      id: ambulanceId,
      lat: currentLat,
      lng: currentLng,
      routePoints,
      routeIndex: 0,
      isDispatched: true,
      targetLat,
      targetLng,
      arrivedAtScene: false,
    });

    logger.info(`[Sim] Ambulance ${ambulanceId} now following dispatch route (${routePoints.length} waypoints)`);
  }

  /**
   * Called when a dispatch is completed — resume free roaming.
   */
  resumeAmbulance(ambulanceId: string, latitude?: number, longitude?: number): void {
    const state = this.states.get(ambulanceId);
    const lat = state?.lat ?? latitude ?? 28.6;
    const lng = state?.lng ?? longitude ?? 77.06;

    // Immediately start a new random roam from current position
    this.initRoam(ambulanceId, lat, lng);
    logger.info(`[Sim] Ambulance ${ambulanceId} resumed roaming`);
  }

  /** Stop emitting movement updates for an ambulance that is taken offline. */
  stopAmbulance(ambulanceId: string): void {
    this.states.delete(ambulanceId);
    logger.info(`[Sim] Ambulance ${ambulanceId} stopped`);
  }

  getStatus() {
    return {
      running: this.running,
      speed: SPEED_MULTIPLIER,
      ambulanceCount: this.states.size,
      tickMs: TICK_MS,
    };
  }

  private async tick(): Promise<void> {
    this.tickCount++;
    const updates: Array<{ id: string; lat: number; lng: number }> = [];

    for (const [id, state] of this.states) {
      if (state.routePoints.length === 0) continue;
      if (state.arrivedAtScene) continue; // don't move further after arriving

      if (state.isDispatched) {
        const atEnd = this.advanceAlongRoute(state);
        if (atEnd && state.targetLat !== undefined) {
          // Snap to exact target coords at route end
          state.lat = state.targetLat!;
          state.lng = state.targetLng!;
        }
      } else {
        const atEnd = this.advanceAlongRoute(state);
        if (atEnd) {
          await this.scheduleNewDestination(id, state.lat, state.lng);
        }
      }

      updates.push({ id, lat: state.lat, lng: state.lng });
    }

    // Broadcast location updates via Socket.IO
    for (const u of updates) {
      this.io.emit(SocketEvents.AMBULANCE_LOCATION_UPDATE, {
        ambulanceId: u.id,
        latitude: u.lat,
        longitude: u.lng,
        timestamp: new Date().toISOString(),
      });
    }

    // DB position update (every tick)
    if (updates.length > 0) {
      await Promise.allSettled(
        updates.map((u) =>
          prisma.ambulance.update({
            where: { id: u.id },
            data: { latitude: u.lat, longitude: u.lng, lastLocationUpdate: new Date() },
          })
        )
      );

      // Location history (throttled)
      if (this.tickCount % HISTORY_WRITE_EVERY === 0) {
        await prisma.ambulanceLocationHistory.createMany({
          data: updates.map((u) => ({
            ambulanceId: u.id,
            latitude: u.lat,
            longitude: u.lng,
            recordedAt: new Date(),
          })),
          skipDuplicates: false,
        });
      }
    }

    // Check arrivals for dispatched ambulances
    await this.checkArrivals();
  }

  /**
   * Advance ambulance along its route by a fixed distance per tick (metres).
   * This ensures the ambulance lands exactly on each waypoint and never
   * overshoots the destination, regardless of waypoint spacing.
   *
   * Dispatched ambulances travel at ~40 km/h simulated.
   * Free-roaming ambulances travel at ~20 km/h simulated.
   * Both are scaled by SPEED_MULTIPLIER.
   *
   * Returns true when the last waypoint is reached.
   */
  private advanceAlongRoute(state: AmbulanceState): boolean {
    // metres to travel this tick
    const speedKmh = state.isDispatched ? 40 : 20;
    const tickHours = (TICK_MS / 1000) / 3600;
    let remainingMetres = speedKmh * 1000 * tickHours * SPEED_MULTIPLIER;

    while (remainingMetres > 0) {
      if (state.routeIndex >= state.routePoints.length - 1) {
        // Already at or past the last waypoint — snap and stop
        const last = state.routePoints[state.routePoints.length - 1];
        if (last) { state.lat = last.lat; state.lng = last.lng; }
        return true;
      }

      const next = state.routePoints[state.routeIndex + 1];
      const segMetres = haversineDistance(state.lat, state.lng, next.lat, next.lng) * 1000;

      if (segMetres <= 0) {
        // Zero-length segment — skip it
        state.routeIndex++;
        continue;
      }

      if (remainingMetres >= segMetres) {
        // Can fully traverse this segment
        remainingMetres -= segMetres;
        state.routeIndex++;
        state.lat = next.lat;
        state.lng = next.lng;
      } else {
        // Partial segment — interpolate within it
        const fraction = remainingMetres / segMetres;
        state.lat = state.lat + (next.lat - state.lat) * fraction;
        state.lng = state.lng + (next.lng - state.lng) * fraction;
        remainingMetres = 0;
      }
    }

    return state.routeIndex >= state.routePoints.length - 1;
  }

  private async initRoam(ambulanceId: string, lat: number, lng: number): Promise<void> {
    const dest = this.randomPoint();
    const route = await getRoute(lat, lng, dest.lat, dest.lng);

    // A straight-line fallback would cut through buildings and parks.  Keep
    // the ambulance stationary until a drivable route can be obtained instead.
    if (route.isMock || route.points.length < 2) {
      logger.warn(`[Sim] No drivable roaming route for ambulance ${ambulanceId}; it will remain stationary`);
      return;
    }

    // OSRM/Google may snap the supplied origin to the nearest road.  Start the
    // state there so every interpolated movement point remains on that route.
    const origin = route.points[0];
    this.states.set(ambulanceId, {
      id: ambulanceId,
      lat: origin.lat,
      lng: origin.lng,
      routePoints: route.points,
      routeIndex: 0,
      isDispatched: false,
      arrivedAtScene: false,
    });
  }

  private async scheduleNewDestination(ambulanceId: string, lat: number, lng: number): Promise<void> {
    const state = this.states.get(ambulanceId);
    if (!state || state.isRouting) return;

    state.isRouting = true;
    try {
      const dest = this.randomPoint();
      const route = await getRoute(lat, lng, dest.lat, dest.lng);

      // Do not use the straight-line fallback for idle roaming.  It would make
      // the marker travel across non-drivable map features.
      if (route.isMock || route.points.length < 2) {
        state.routePoints = [];
        state.routeIndex = 0;
        logger.warn(`[Sim] No drivable next route for ambulance ${ambulanceId}; it will remain stationary`);
        return;
      }

      state.lat = route.points[0].lat;
      state.lng = route.points[0].lng;
      state.routePoints = route.points;
      state.routeIndex = 0;
    } finally {
      state.isRouting = false;
    }
  }

  private randomPoint(): { lat: number; lng: number } {
    return {
      lat: BOUNDS.minLat + Math.random() * (BOUNDS.maxLat - BOUNDS.minLat),
      lng: BOUNDS.minLng + Math.random() * (BOUNDS.maxLng - BOUNDS.minLng),
    };
  }

  /** Check if any dispatched ambulance has reached its patient. */
  private async checkArrivals(): Promise<void> {
    const assignedDispatches = await prisma.dispatch.findMany({
      where: { status: { in: ['ASSIGNED', 'EN_ROUTE'] } },
      include: { emergency: true },
    });

    for (const dispatch of assignedDispatches) {
      const state = this.states.get(dispatch.ambulanceId);
      if (!state || !state.isDispatched) continue;

      const dist = haversineDistance(
        state.lat, state.lng,
        dispatch.emergency.latitude, dispatch.emergency.longitude
      );

      // Transition ASSIGNED → EN_ROUTE once the ambulance starts moving
      if (dispatch.status === 'ASSIGNED' && state.routeIndex > 0) {
        await prisma.$transaction([
          prisma.dispatch.update({ where: { id: dispatch.id }, data: { status: 'EN_ROUTE' } }),
          prisma.ambulance.update({ where: { id: dispatch.ambulanceId }, data: { status: 'EN_ROUTE' } }),
          prisma.emergencyRequest.update({ where: { id: dispatch.emergencyId }, data: { status: 'EN_ROUTE' } }),
        ]);

        this.io.emit(SocketEvents.AMBULANCE_STATUS_UPDATE, {
          ambulanceId: dispatch.ambulanceId,
          status: 'EN_ROUTE',
          assignedEmergencyId: dispatch.emergencyId,
        });
        this.io.emit(SocketEvents.EMERGENCY_STATUS_UPDATE, {
          emergencyId: dispatch.emergencyId,
          status: 'EN_ROUTE',
        });
      }

      // Update remaining ETA based on route progress, not straight-line distance
      const totalPoints = state.routePoints.length;
      const remainingFraction = totalPoints > 1
        ? (totalPoints - 1 - state.routeIndex) / (totalPoints - 1)
        : 0;
      const remainingEtaMin = dispatch.initialEtaMinutes > 0
        ? dispatch.initialEtaMinutes * remainingFraction
        : (dist / 40) * 60;

      await prisma.dispatch.update({
        where: { id: dispatch.id },
        data: { currentEtaMinutes: Math.max(0, remainingEtaMin) },
      });

      this.io.emit(SocketEvents.DISPATCH_ETA_UPDATE, {
        dispatchId: dispatch.id,
        currentEtaMinutes: Math.max(0, remainingEtaMin),
        remainingDistanceKm: dist,
      });

      // Arrival: ambulance must be within 50m of the patient pin
      // reachedEnd alone is not enough — it only means the route array ended,
      // but OSRM's last waypoint may still be a few metres from the exact pin.
      // When the route ends, snap the ambulance to the exact target coords
      // so the distance check passes cleanly on the next (or same) tick.
      const reachedEnd = state.routeIndex >= state.routePoints.length - 1;
      if (reachedEnd && state.targetLat !== undefined) {
        state.lat = state.targetLat!;
        state.lng = state.targetLng!;
      }

      const finalDist = haversineDistance(
        state.lat, state.lng,
        dispatch.emergency.latitude, dispatch.emergency.longitude
      );

      if (finalDist <= ARRIVAL_THRESHOLD_KM && !state.arrivedAtScene) {
        state.arrivedAtScene = true; // prevent repeat triggers

        await prisma.$transaction([
          prisma.dispatch.update({
            where: { id: dispatch.id },
            data: { status: 'ON_SCENE', arrivedAt: new Date(), currentEtaMinutes: 0 },
          }),
          prisma.ambulance.update({
            where: { id: dispatch.ambulanceId },
            data: {
              status: 'ON_SCENE',
              // Snap DB coords to exact patient location
              latitude: dispatch.emergency.latitude,
              longitude: dispatch.emergency.longitude,
            },
          }),
          prisma.emergencyRequest.update({
            where: { id: dispatch.emergencyId },
            data: { status: 'ON_SCENE' },
          }),
        ]);

        this.io.emit(SocketEvents.AMBULANCE_STATUS_UPDATE, {
          ambulanceId: dispatch.ambulanceId,
          status: 'ON_SCENE',
          assignedEmergencyId: dispatch.emergencyId,
        });
        // Also broadcast the snapped position so the marker moves to the exact pin
        this.io.emit(SocketEvents.AMBULANCE_LOCATION_UPDATE, {
          ambulanceId: dispatch.ambulanceId,
          latitude: dispatch.emergency.latitude,
          longitude: dispatch.emergency.longitude,
          timestamp: new Date().toISOString(),
        });
        this.io.emit(SocketEvents.EMERGENCY_STATUS_UPDATE, {
          emergencyId: dispatch.emergencyId,
          status: 'ON_SCENE',
        });

        logger.info(`[Sim] Ambulance ${dispatch.ambulanceId} arrived ON_SCENE for emergency ${dispatch.emergencyId}`);
      }
    }
  }
}
