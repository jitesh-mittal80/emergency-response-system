import { Router } from 'express';
import {
  listAmbulances,
  createAmbulance,
  getAmbulance,
  updateAmbulance,
  deleteAmbulance,
  updateAmbulanceStatus,
  getAmbulanceHistory,
} from './ambulance.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listAmbulances);
router.post('/', createAmbulance);
router.get('/:id', getAmbulance);
router.patch('/:id', updateAmbulance);
router.delete('/:id', deleteAmbulance);
router.patch('/:id/status', updateAmbulanceStatus);
router.get('/:id/history', getAmbulanceHistory);

export default router;
