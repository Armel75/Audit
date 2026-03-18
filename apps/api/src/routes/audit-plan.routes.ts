import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as auditPlanController from '../controllers/audit-plan.controller';

const router = Router();

router.use(requireAuth);

// Audit Plan
router.get('/', auditPlanController.getPlans);
router.get('/:id', auditPlanController.getPlan);
router.post('/', auditPlanController.createPlan);
router.put('/:id', auditPlanController.updatePlan);
router.delete('/:id', auditPlanController.deletePlan);

// Audit Plan Status
router.patch('/:id/status', auditPlanController.updatePlanStatus);
router.put('/history/:historyId', auditPlanController.updatePlanStatusHistory);
router.delete('/history/:historyId', auditPlanController.deletePlanStatusHistory);

// Audit Plan Version
router.post('/:id/versions', auditPlanController.createPlanVersion);
router.put('/versions/:versionId', auditPlanController.updatePlanVersion);
router.delete('/versions/:versionId', auditPlanController.deletePlanVersion);

export default router;
