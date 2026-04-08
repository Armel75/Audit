import { Router } from 'express';
import { requireAuth, requirePermission, requireAnyPermission } from '../middleware/auth.middleware';
import * as findingController from '../controllers/finding.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('finding:read'), findingController.getFindings);
router.get('/:id', requirePermission('finding:read'), findingController.getFinding);
router.post('/', requirePermission('finding:create'), findingController.createFinding);
router.put('/:id', requirePermission('finding:update'), findingController.updateFinding);
router.patch('/:id/status', requireAnyPermission(['finding:update', 'finding:validate']), findingController.updateFindingStatus);
router.post('/:id/comments', requireAnyPermission(['finding:comment', 'finding:update']), findingController.addFindingComment);

export default router;
