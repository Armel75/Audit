import { Router } from 'express';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';
import {
  getAuditPrograms,
  getAuditProgramById,
  createAuditProgram,
  updateAuditProgram,
  deleteAuditProgram,
  createAuditProcedure,
  updateAuditProcedure,
  deleteAuditProcedure
} from '../controllers/auditProgram.controller';

const router = Router();

router.use(requireAuth);

// Audit Programs
router.get('/', requirePermission('audit_program:read'), getAuditPrograms);
router.get('/:id', requirePermission('audit_program:read'), getAuditProgramById);
router.post('/', requirePermission('audit_program:create'), createAuditProgram);
router.put('/:id', requirePermission('audit_program:update'), updateAuditProgram);
router.delete('/:id', requireAnyPermission(['audit_program:delete', 'audit_program:update']), deleteAuditProgram);

// Audit Procedures
router.post('/:programId/procedures', requirePermission('audit_procedure:create'), createAuditProcedure);
router.put('/procedures/:procedureId', requirePermission('audit_procedure:update'), updateAuditProcedure);
router.delete('/procedures/:procedureId', requireAnyPermission(['audit_procedure:delete', 'audit_procedure:update']), deleteAuditProcedure);

export default router;
