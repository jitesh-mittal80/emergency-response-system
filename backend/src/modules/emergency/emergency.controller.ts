import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { EmergencyStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';
import { getIO, SocketEvents } from '../../sockets/socketServer';
import { dispatchAmbulance, emitDispatchEvents } from '../dispatch/dispatchEngine';

const simulateSchema = z.object({
  patientId: z.string().uuid(),
});

const statusSchema = z.object({
  status: z.nativeEnum(EmergencyStatus),
});

const emergencyInclude = {
  patient: true,
  dispatch: {
    include: {
      ambulance: true,
    },
  },
};

export async function listPatients(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const patients = await prisma.patient.findMany({ orderBy: { name: 'asc' } });
    res.json({ patients });
  } catch (err) {
    next(err);
  }
}

export async function listEmergencies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as EmergencyStatus | undefined;
    const emergencies = await prisma.emergencyRequest.findMany({
      where: status ? { status } : undefined,
      include: emergencyInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ emergencies });
  } catch (err) {
    next(err);
  }
}

export async function simulateEmergency(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { patientId } = simulateSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return next(createError('Patient not found', 404));

    // Create emergency request
    const emergency = await prisma.emergencyRequest.create({
      data: {
        patientId: patient.id,
        emergencyType: patient.emergencyType,
        priority: patient.emergencyPriority,
        latitude: patient.latitude,
        longitude: patient.longitude,
        status: 'PENDING',
      },
      include: emergencyInclude,
    });

    // Emit new emergency event
    const io = getIO();
    io.emit(SocketEvents.EMERGENCY_NEW, { emergency });

    // Trigger dispatch engine
    const result = await dispatchAmbulance(emergency.id);

    if (result.success && result.dispatchId) {
      await emitDispatchEvents(result.dispatchId);
    }

    // Return updated emergency
    const updated = await prisma.emergencyRequest.findUnique({
      where: { id: emergency.id },
      include: emergencyInclude,
    });

    res.status(201).json({ emergency: updated, dispatch: result });
  } catch (err) {
    next(err);
  }
}

export async function getEmergency(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id: req.params.id },
      include: {
        ...emergencyInclude,
        algorithmExecutions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!emergency) return next(createError('Emergency not found', 404));
    res.json({ emergency });
  } catch (err) {
    next(err);
  }
}

export async function updateEmergencyStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = statusSchema.parse(req.body);
    const emergency = await prisma.emergencyRequest.update({
      where: { id: req.params.id },
      data: { status },
      include: emergencyInclude,
    });

    getIO().emit(SocketEvents.EMERGENCY_STATUS_UPDATE, {
      emergencyId: emergency.id,
      status: emergency.status,
    });

    res.json({ emergency });
  } catch (err) {
    next(err);
  }
}
