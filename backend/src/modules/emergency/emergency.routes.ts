import { Router } from 'express';
import {
  listEmergencies,
  simulateEmergency,
  getEmergency,
  updateEmergencyStatus,
  listPatients,
} from './emergency.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/patients', listPatients);
router.get('/', listEmergencies);
router.post('/simulate', simulateEmergency);
router.get('/:id', getEmergency);
router.patch('/:id/status', updateEmergencyStatus);

export default router;
