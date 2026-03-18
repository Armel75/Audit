import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
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
router.get('/', requirePermission('can_view_tasks'), getAuditPrograms);
router.get('/:id', requirePermission('can_view_tasks'), getAuditProgramById);
router.post('/', requirePermission('can_manage_tasks'), createAuditProgram);
router.put('/:id', requirePermission('can_manage_tasks'), updateAuditProgram);
router.delete('/:id', requirePermission('can_manage_tasks'), deleteAuditProgram);

// Audit Procedures
router.post('/:programId/procedures', requirePermission('can_manage_tasks'), createAuditProcedure);
router.put('/procedures/:procedureId', requirePermission('can_manage_tasks'), updateAuditProcedure);
router.delete('/procedures/:procedureId', requirePermission('can_manage_tasks'), deleteAuditProcedure);

export default router;
