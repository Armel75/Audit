import { Router } from 'express';
import * as approvalController from '../controllers/approval.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', approvalController.getApprovals);
router.post('/', approvalController.createApproval);
router.put('/:id/decide', approvalController.decideApproval);
router.put('/:id/decide', approvalController.decideApproval);

export default router;
