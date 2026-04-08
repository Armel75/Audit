import { Router } from 'express';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';
import * as auditPlanController from '../controllers/audit-plan.controller';

const router = Router();

router.use(requireAuth);

// Audit Plan
router.get('/', requirePermission('audit_plan:read'), auditPlanController.getPlans);
router.get('/:id', requirePermission('audit_plan:read'), auditPlanController.getPlan);
router.post('/', requirePermission('audit_plan:create'), auditPlanController.createPlan);
router.put('/:id', requirePermission('audit_plan:update'), auditPlanController.updatePlan);
router.delete('/:id', requireAnyPermission(['audit_plan:delete', 'audit_plan:update']), auditPlanController.deletePlan);

// Audit Plan Status
router.patch('/:id/status', requireAnyPermission(['audit_plan:update', 'audit_plan:approve']), auditPlanController.updatePlanStatus);
router.put('/history/:historyId', requirePermission('audit_plan:update'), auditPlanController.updatePlanStatusHistory);
router.delete('/history/:historyId', requirePermission('audit_plan:update'), auditPlanController.deletePlanStatusHistory);

// Audit Plan Version
router.post('/:id/versions', requirePermission('audit_plan:update'), auditPlanController.createPlanVersion);
router.put('/versions/:versionId', requirePermission('audit_plan:update'), auditPlanController.updatePlanVersion);
router.delete('/versions/:versionId', requirePermission('audit_plan:update'), auditPlanController.deletePlanVersion);

export default router;
