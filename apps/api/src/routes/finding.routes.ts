import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import * as findingController from '../controllers/finding.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('can_view_tasks'), findingController.getFindings);
router.get('/:id', requirePermission('can_view_tasks'), findingController.getFinding);
router.post('/', requirePermission('can_manage_tasks'), findingController.createFinding);
router.put('/:id', requirePermission('can_manage_tasks'), findingController.updateFinding);
router.patch('/:id/status', requirePermission('can_manage_tasks'), findingController.updateFindingStatus);
router.post('/:id/comments', requirePermission('can_view_tasks'), findingController.addFindingComment);

export default router;
