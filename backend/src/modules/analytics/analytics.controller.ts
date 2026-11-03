import { Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';

export async function getOverview(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const [
      totalAmbulances,
      availableAmbulances,
      busyAmbulances,
      offlineAmbulances,
      totalEmergencies,
      activeEmergencies,
      completedEmergencies,
      completedDispatches,
    ] = await Promise.all([
      prisma.ambulance.count(),
      prisma.ambulance.count({ where: { status: 'AVAILABLE' } }),
      prisma.ambulance.count({ where: { status: { in: ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE'] } } }),
      prisma.ambulance.count({ where: { status: 'OFFLINE' } }),
      prisma.emergencyRequest.count(),
      prisma.emergencyRequest.count({ where: { status: { in: ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'WAITING_FOR_AMBULANCE'] } } }),
      prisma.emergencyRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.dispatch.findMany({
        where: { status: 'COMPLETED', arrivedAt: { not: null } },
        select: { assignedAt: true, arrivedAt: true },
      }),
    ]);

    const responseTimes = completedDispatches
      .filter((d) => d.arrivedAt)
      .map((d) => (d.arrivedAt!.getTime() - d.assignedAt.getTime()) / 60000); // minutes

    const averageResponseTimeMinutes = responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    const fastestResponseTimeMinutes = responseTimes.length ? Math.min(...responseTimes) : 0;
    const slowestResponseTimeMinutes = responseTimes.length ? Math.max(...responseTimes) : 0;

    res.json({
      stats: {
        totalAmbulances,
        availableAmbulances,
        busyAmbulances,
        offlineAmbulances,
        totalEmergencies,
        activeEmergencies,
        completedEmergencies,
        averageResponseTimeMinutes: Math.round(averageResponseTimeMinutes * 10) / 10,
        fastestResponseTimeMinutes: Math.round(fastestResponseTimeMinutes * 10) / 10,
        slowestResponseTimeMinutes: Math.round(slowestResponseTimeMinutes * 10) / 10,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getResponseTimes(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispatches = await prisma.dispatch.findMany({
      where: { status: 'COMPLETED', arrivedAt: { not: null } },
      include: { emergency: { include: { patient: true } } },
      orderBy: { assignedAt: 'desc' },
      take: 50,
    });

    const data = dispatches.map((d) => ({
      id: d.id,
      patientName: d.emergency.patient.name,
      locationName: d.emergency.patient.locationName,
      emergencyType: d.emergency.emergencyType,
      priority: d.emergency.priority,
      assignedAt: d.assignedAt,
      arrivedAt: d.arrivedAt,
      responseTimeMinutes: d.arrivedAt
        ? Math.round(((d.arrivedAt.getTime() - d.assignedAt.getTime()) / 60000) * 10) / 10
        : null,
      distanceKm: d.distanceKm,
      initialEtaMinutes: d.initialEtaMinutes,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getAlgorithmPerformance(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const executions = await prisma.algorithmExecution.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const astar = executions.filter((e) => e.algorithm === 'ASTAR');
    const dijkstra = executions.filter((e) => e.algorithm === 'DIJKSTRA');

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const result = {
      astar: {
        count: astar.length,
        avgExecutionTimeMs: avg(astar.map((e) => e.executionTimeMs)),
        avgExploredNodes: avg(astar.map((e) => e.exploredNodes)),
        avgPathDistance: avg(astar.map((e) => e.pathDistance)),
      },
      dijkstra: {
        count: dijkstra.length,
        avgExecutionTimeMs: avg(dijkstra.map((e) => e.executionTimeMs)),
        avgExploredNodes: avg(dijkstra.map((e) => e.exploredNodes)),
        avgPathDistance: avg(dijkstra.map((e) => e.pathDistance)),
      },
      recent: executions.slice(0, 20).map((e) => ({
        id: e.id,
        algorithm: e.algorithm,
        executionTimeMs: e.executionTimeMs,
        exploredNodes: e.exploredNodes,
        pathDistance: e.pathDistance,
        emergencyId: e.emergencyId,
        createdAt: e.createdAt,
      })),
    };

    res.json({ performance: result });
  } catch (err) {
    next(err);
  }
}
