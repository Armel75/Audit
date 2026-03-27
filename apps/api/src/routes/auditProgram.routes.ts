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
router.get('/', getAuditPrograms);
router.get('/:id', getAuditProgramById);
router.post('/', createAuditProgram);
router.put('/:id', updateAuditProgram);
router.delete('/:id', deleteAuditProgram);

// Audit Procedures
router.post('/:programId/procedures', createAuditProcedure);
router.put('/procedures/:procedureId', updateAuditProcedure);
router.delete('/procedures/:procedureId', deleteAuditProcedure);

export default router;
