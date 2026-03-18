import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All settings routes require authentication
router.use(requireAuth);

// Departments
router.get('/departments', settingsController.getDepartments);
router.post('/departments', settingsController.createDepartment);
router.put('/departments/:id', settingsController.updateDepartment);
router.delete('/departments/:id', settingsController.deleteDepartment);

// User Departments
router.get('/user-departments', settingsController.getUserDepartments);
router.post('/user-departments', settingsController.createUserDepartment);
router.put('/user-departments/:userId/:departmentId', settingsController.updateUserDepartment);
router.delete('/user-departments/:userId/:departmentId', settingsController.deleteUserDepartment);

// Audit Types
router.get('/audit-types', settingsController.getAuditTypes);
router.post('/audit-types', settingsController.createAuditType);
router.put('/audit-types/:id', settingsController.updateAuditType);
router.delete('/audit-types/:id', settingsController.deleteAuditType);

// Risk Levels
router.get('/risk-levels', settingsController.getRiskLevels);
router.post('/risk-levels', settingsController.createRiskLevel);
router.put('/risk-levels/:id', settingsController.updateRiskLevel);
router.delete('/risk-levels/:id', settingsController.deleteRiskLevel);

// Priority Levels
router.get('/priority-levels', settingsController.getPriorityLevels);
router.post('/priority-levels', settingsController.createPriorityLevel);
router.put('/priority-levels/:id', settingsController.updatePriorityLevel);
router.delete('/priority-levels/:id', settingsController.deletePriorityLevel);

export default router;
