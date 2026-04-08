import { Router } from 'express';
import * as controller from '../controllers/auditableEntity.controller';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('auditable_entity:read'), controller.getAuditableEntities);
router.post('/', requirePermission('auditable_entity:create'), controller.createAuditableEntity);
router.put('/:id', requirePermission('auditable_entity:update'), controller.updateAuditableEntity);
router.delete('/:id', requireAnyPermission(['auditable_entity:delete', 'auditable_entity:update']), controller.deleteAuditableEntity);

export default router;
