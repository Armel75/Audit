import { Router } from 'express';
import * as auditLogController from '../controllers/auditLog.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('can_view_tasks'), auditLogController.getAuditLogs);

export default router;
