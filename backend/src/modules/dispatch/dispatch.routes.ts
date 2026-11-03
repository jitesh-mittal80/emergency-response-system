import { Router } from 'express';
import {
  listDispatches,
  getDispatch,
  completeDispatch,
  getDispatchRoute,
} from './dispatch.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listDispatches);
router.get('/:id', getDispatch);
router.post('/:id/complete', completeDispatch);
router.get('/:id/route', getDispatchRoute);

export default router;
