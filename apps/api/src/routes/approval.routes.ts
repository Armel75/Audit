import { Router } from 'express';
import * as approvalController from '../controllers/approval.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('can_view_tasks'), approvalController.getApprovals);
router.post('/', requirePermission('can_manage_tasks'), approvalController.createApproval);

export default router;
