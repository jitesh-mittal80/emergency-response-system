import { Router } from 'express';
import {
  runAstar,
  runDijkstra,
  getComparison,
} from './algorithm.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/astar', runAstar);
router.post('/dijkstra', runDijkstra);
router.get('/comparison/:emergencyId', getComparison);

export default router;
