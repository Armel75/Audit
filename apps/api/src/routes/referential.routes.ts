import { Router } from 'express';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';
import * as referentialController from '../controllers/referential.controller';

const router = Router();

router.use(requireAuth);

// AuditableEntity
router.get('/auditable-entities', requirePermission('auditable_entity:read'), referentialController.getAuditableEntities);
router.post('/auditable-entities', requirePermission('auditable_entity:create'), referentialController.createAuditableEntity);
router.put('/auditable-entities/:id', requirePermission('auditable_entity:update'), referentialController.updateAuditableEntity);
router.delete('/auditable-entities/:id', requireAnyPermission(['auditable_entity:delete', 'auditable_entity:update']), referentialController.deleteAuditableEntity);

// BusinessProcess
router.get('/business-processes', requirePermission('business_process:read'), referentialController.getBusinessProcesses);
router.post('/business-processes', requirePermission('business_process:create'), referentialController.createBusinessProcess);
router.put('/business-processes/:id', requirePermission('business_process:update'), referentialController.updateBusinessProcess);
router.delete('/business-processes/:id', requireAnyPermission(['business_process:delete', 'business_process:update']), referentialController.deleteBusinessProcess);

// Control
router.get('/controls', requirePermission('control:read'), referentialController.getControls);
router.post('/controls', requirePermission('control:create'), referentialController.createControl);
router.put('/controls/:id', requirePermission('control:update'), referentialController.updateControl);
router.delete('/controls/:id', requireAnyPermission(['control:delete', 'control:update']), referentialController.deleteControl);

// Risk
router.get('/risks', requirePermission('risk:read'), referentialController.getRisks);
router.post('/risks', requirePermission('risk:create'), referentialController.createRisk);
router.put('/risks/:id', requirePermission('risk:update'), referentialController.updateRisk);
router.delete('/risks/:id', requireAnyPermission(['risk:delete', 'risk:update']), referentialController.deleteRisk);

// RiskControl
router.get('/risk-controls', requirePermission('risk_control:read'), referentialController.getRiskControls);
router.post('/risk-controls', requirePermission('risk_control:create'), referentialController.createRiskControl);
router.put('/risk-controls/:id', requirePermission('risk_control:update'), referentialController.updateRiskControl);
router.delete('/risk-controls/:id', requireAnyPermission(['risk_control:delete', 'risk_control:update']), referentialController.deleteRiskControl);

export default router;
