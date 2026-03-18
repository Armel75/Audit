import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as referentialController from '../controllers/referential.controller';

const router = Router();

router.use(requireAuth);

// AuditableEntity
router.get('/auditable-entities', referentialController.getAuditableEntities);
router.post('/auditable-entities', referentialController.createAuditableEntity);
router.put('/auditable-entities/:id', referentialController.updateAuditableEntity);
router.delete('/auditable-entities/:id', referentialController.deleteAuditableEntity);

// BusinessProcess
router.get('/business-processes', referentialController.getBusinessProcesses);
router.post('/business-processes', referentialController.createBusinessProcess);
router.put('/business-processes/:id', referentialController.updateBusinessProcess);
router.delete('/business-processes/:id', referentialController.deleteBusinessProcess);

// Control
router.get('/controls', referentialController.getControls);
router.post('/controls', referentialController.createControl);
router.put('/controls/:id', referentialController.updateControl);
router.delete('/controls/:id', referentialController.deleteControl);

// Risk
router.get('/risks', referentialController.getRisks);
router.post('/risks', referentialController.createRisk);
router.put('/risks/:id', referentialController.updateRisk);
router.delete('/risks/:id', referentialController.deleteRisk);

// RiskControl
router.get('/risk-controls', referentialController.getRiskControls);
router.post('/risk-controls', referentialController.createRiskControl);
router.put('/risk-controls/:id', referentialController.updateRiskControl);
router.delete('/risk-controls/:id', referentialController.deleteRiskControl);

export default router;
