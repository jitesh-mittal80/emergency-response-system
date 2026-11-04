import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AmbulanceStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { getIO, SocketEvents } from '../../sockets/socketServer';
import { processWaitingEmergencyQueue } from '../dispatch/dispatchEngine';
import { SimulationEngine } from '../simulation/simulationEngine';

const createSchema = z.object({
  name: z.string().min(2),
  vehicleNumber: z.string().min(3),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.nativeEnum(AmbulanceStatus).optional(),
});

const updateSchema = createSchema.partial();

const statusSchema = z.object({
  status: z.nativeEnum(AmbulanceStatus),
});

export async function listAmbulances(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as AmbulanceStatus | undefined;
    const ambulances = await prisma.ambulance.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    res.json({ ambulances });
  } catch (err) {
    next(err);
  }
}

export async function createAmbulance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createSchema.parse(req.body);
    const ambulance = await prisma.ambulance.create({ data });
    res.status(201).json({ ambulance });
  } catch (err) {
    next(err);
  }
}

export async function getAmbulance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id: req.params.id },
      include: {
        dispatches: {
          orderBy: { assignedAt: 'desc' },
          take: 10,
          include: { emergency: { include: { patient: true } } },
        },
      },
    });
    if (!ambulance) return next(createError('Ambulance not found', 404));
    res.json({ ambulance });
  } catch (err) {
    next(err);
  }
}

export async function updateAmbulance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = updateSchema.parse(req.body);
    const ambulance = await prisma.ambulance.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ ambulance });
  } catch (err) {
    next(err);
  }
}

export async function deleteAmbulance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.ambulance.delete({ where: { id: req.params.id } });
    res.json({ message: 'Ambulance deleted' });
  } catch (err) {
    next(err);
  }
}

export async function updateAmbulanceStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = statusSchema.parse(req.body);
    const ambulance = await prisma.ambulance.update({
      where: { id: req.params.id },
      data: { status },
    });

    getIO().emit(SocketEvents.AMBULANCE_STATUS_UPDATE, {
      ambulanceId: ambulance.id,
      status: ambulance.status,
      assignedEmergencyId: ambulance.assignedEmergencyId,
    });

    const sim = SimulationEngine.getInstance(getIO());
    if (ambulance.status === 'OFFLINE') {
      sim.stopAmbulance(ambulance.id);
      res.json({ ambulance });
      return;
    }

    if (ambulance.status === 'AVAILABLE') {
      await processWaitingEmergencyQueue();

      // The queued emergency may have immediately claimed this ambulance.
      const currentAmbulance = await prisma.ambulance.findUnique({
        where: { id: ambulance.id },
      });
      if (currentAmbulance?.status === 'AVAILABLE') {
        sim.resumeAmbulance(
          currentAmbulance.id,
          currentAmbulance.latitude,
          currentAmbulance.longitude
        );
      }
      res.json({ ambulance: currentAmbulance ?? ambulance });
      return;
    }

    res.json({ ambulance });
  } catch (err) {
    next(err);
  }
}

export async function getAmbulanceHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const history = await prisma.ambulanceLocationHistory.findMany({
      where: { ambulanceId: req.params.id },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });
    res.json({ history });
  } catch (err) {
    next(err);
  }
}
