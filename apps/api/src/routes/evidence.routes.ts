import { Router } from 'express';
import * as evidenceController from '../controllers/evidence.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('can_view_tasks'), evidenceController.getEvidences);
router.post('/', requirePermission('can_manage_tasks'), evidenceController.createEvidence);
router.put('/:id', requirePermission('can_manage_tasks'), evidenceController.updateEvidence);
router.delete('/:id', requirePermission('can_manage_tasks'), evidenceController.deleteEvidence);

export default router;
