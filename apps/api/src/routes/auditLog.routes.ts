import { Router } from 'express';
import * as auditLogController from '../controllers/auditLog.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('audit_log:read'), auditLogController.getAuditLogs);

export default router;
