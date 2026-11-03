import { Router } from 'express';
import { startSimulation, pauseSimulation, resetSimulation, getSimulationStatus } from './simulation.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/start', startSimulation);
router.post('/pause', pauseSimulation);
router.post('/reset', resetSimulation);
router.get('/status', getSimulationStatus);

export default router;
