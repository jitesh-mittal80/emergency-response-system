import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { getIO, SocketEvents } from '../../sockets/socketServer';
import { SimulationEngine } from '../simulation/simulationEngine';
import { processWaitingEmergencyQueue } from './dispatchEngine';

export async function listDispatches(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const dispatches = await prisma.dispatch.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        ambulance: true,
        emergency: { include: { patient: true } },
      },
      orderBy: { assignedAt: 'desc' },
      take: 50,
    });
    res.json({ dispatches });
  } catch (err) {
    next(err);
  }
}

export async function getDispatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: req.params.id },
      include: {
        ambulance: true,
        emergency: { include: { patient: true } },
      },
    });
    if (!dispatch) return next(createError('Dispatch not found', 404));
    res.json({ dispatch });
  } catch (err) {
    next(err);
  }
}

export async function completeDispatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: req.params.id },
      include: { ambulance: true },
    });
    if (!dispatch) return next(createError('Dispatch not found', 404));
    if (dispatch.status === 'COMPLETED') {
      res.json({ message: 'Already completed', dispatch });
      return;
    }

    // Mark dispatch completed
    const updatedDispatch = await prisma.dispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        currentEtaMinutes: 0,
      },
    });

    // Return ambulance to AVAILABLE
    await prisma.ambulance.update({
      where: { id: dispatch.ambulanceId },
      data: {
        status: 'AVAILABLE',
        assignedEmergencyId: null,
        currentRoute: Prisma.DbNull,
      },
    });

    // Mark emergency completed
    await prisma.emergencyRequest.update({
      where: { id: dispatch.emergencyId },
      data: { status: 'COMPLETED' },
    });

    const io = getIO();
    io.emit(SocketEvents.DISPATCH_COMPLETED, {
      dispatchId: dispatch.id,
      emergencyId: dispatch.emergencyId,
      ambulanceId: dispatch.ambulanceId,
    });
    io.emit(SocketEvents.AMBULANCE_STATUS_UPDATE, {
      ambulanceId: dispatch.ambulanceId,
      status: 'AVAILABLE',
      assignedEmergencyId: null,
    });
    io.emit(SocketEvents.EMERGENCY_STATUS_UPDATE, {
      emergencyId: dispatch.emergencyId,
      status: 'COMPLETED',
    });

    // Give the oldest waiting emergency the newly available ambulance before
    // returning it to free roaming.
    await processWaitingEmergencyQueue();

    const currentAmbulance = await prisma.ambulance.findUnique({
      where: { id: dispatch.ambulanceId },
      select: { status: true },
    });
    if (currentAmbulance?.status === 'AVAILABLE') {
      const sim = SimulationEngine.getInstance(io);
      sim.resumeAmbulance(dispatch.ambulanceId);
    }

    res.json({ message: 'Dispatch completed', dispatch: updatedDispatch });
  } catch (err) {
    next(err);
  }
}

export async function getDispatchRoute(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        route: true,
        distanceKm: true,
        initialEtaMinutes: true,
        currentEtaMinutes: true,
        status: true,
      },
    });
    if (!dispatch) return next(createError('Dispatch not found', 404));
    res.json({ route: dispatch.route, distanceKm: dispatch.distanceKm, currentEtaMinutes: dispatch.currentEtaMinutes });
  } catch (err) {
    next(err);
  }
}
