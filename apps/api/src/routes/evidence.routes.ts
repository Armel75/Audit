import { Router } from 'express';
import * as evidenceController from '../controllers/evidence.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', evidenceController.getEvidences);
router.post('/', evidenceController.createEvidence);
router.put('/:id', evidenceController.updateEvidence);
router.delete('/:id', evidenceController.deleteEvidence);

export default router;
