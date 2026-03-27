import { Router } from 'express';
import * as controller from '../controllers/auditableEntity.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', controller.getAuditableEntities);
router.post('/', controller.createAuditableEntity);
router.put('/:id', controller.updateAuditableEntity);
router.delete('/:id', controller.deleteAuditableEntity);

export default router;