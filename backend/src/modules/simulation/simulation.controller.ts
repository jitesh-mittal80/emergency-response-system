import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { SimulationEngine } from './simulationEngine';
import { getIO, SocketEvents } from '../../sockets/socketServer';

export async function startSimulation(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sim = SimulationEngine.getInstance(getIO());
    if (!sim.isRunning()) {
      await sim.start();
    }
    getIO().emit(SocketEvents.SIMULATION_STATUS, sim.getStatus());
    res.json({ message: 'Simulation started', status: sim.getStatus() });
  } catch (err) {
    next(err);
  }
}

export async function pauseSimulation(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sim = SimulationEngine.getInstance();
    sim.stop();
    getIO().emit(SocketEvents.SIMULATION_STATUS, sim.getStatus());
    res.json({ message: 'Simulation paused', status: sim.getStatus() });
  } catch (err) {
    next(err);
  }
}

export async function resetSimulation(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sim = SimulationEngine.getInstance();
    sim.stop();
    await sim.start();
    getIO().emit(SocketEvents.SIMULATION_STATUS, sim.getStatus());
    res.json({ message: 'Simulation reset', status: sim.getStatus() });
  } catch (err) {
    next(err);
  }
}

export async function getSimulationStatus(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sim = SimulationEngine.getInstance();
    res.json({ status: sim.getStatus() });
  } catch (err) {
    next(err);
  }
}
