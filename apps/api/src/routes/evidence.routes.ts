import { Router } from 'express';
import * as evidenceController from '../controllers/evidence.controller';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('evidence:read'), evidenceController.getEvidences);
router.post('/', requirePermission('evidence:create'), evidenceController.createEvidence);
router.put('/:id', requireAnyPermission(['evidence:update', 'evidence:create']), evidenceController.updateEvidence);
router.delete('/:id', requireAnyPermission(['evidence:delete', 'evidence:create']), evidenceController.deleteEvidence);

export default router;
