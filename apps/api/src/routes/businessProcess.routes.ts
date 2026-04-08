import { Router } from 'express';
import { BusinessProcessController } from '../controllers/businessProcess.controller';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('business_process:read'), BusinessProcessController.findAll);
router.get('/:id', requirePermission('business_process:read'), BusinessProcessController.findById);
router.put('/:id', requirePermission('business_process:update'), BusinessProcessController.update);
router.delete('/:id', requireAnyPermission(['business_process:delete', 'business_process:update']), BusinessProcessController.delete);

export default router;
