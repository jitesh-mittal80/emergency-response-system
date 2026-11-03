import { Router } from 'express';
import { getOverview, getResponseTimes, getAlgorithmPerformance } from './analytics.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/overview', getOverview);
router.get('/response-times', getResponseTimes);
router.get('/algorithm-performance', getAlgorithmPerformance);

export default router;
