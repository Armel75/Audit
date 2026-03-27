import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import * as findingController from '../controllers/finding.controller';

const router = Router();
router.use(requireAuth);

router.get('/', findingController.getFindings);
router.get('/:id', findingController.getFinding);
router.post('/', findingController.createFinding);
router.put('/:id', findingController.updateFinding);
router.patch('/:id/status', findingController.updateFindingStatus);
router.post('/:id/comments', findingController.addFindingComment);

export default router;
