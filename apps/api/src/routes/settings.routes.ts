import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { requireAuth, requireAnyPermission } from '../middleware/auth.middleware';

const router = Router();

// All settings routes require authentication
router.use(requireAuth);

// Departments
router.get('/departments', requireAnyPermission(['settings:read', 'department:read']), settingsController.getDepartments);
router.post('/departments', requireAnyPermission(['settings:update', 'department:create']), settingsController.createDepartment);
router.put('/departments/:id', requireAnyPermission(['settings:update', 'department:update']), settingsController.updateDepartment);
router.delete('/departments/:id', requireAnyPermission(['settings:update', 'department:delete']), settingsController.deleteDepartment);

// User Departments
router.get('/user-departments', requireAnyPermission(['settings:read', 'department:read', 'user:read']), settingsController.getUserDepartments);
router.post('/user-departments', requireAnyPermission(['settings:update', 'department:update', 'user:update']), settingsController.createUserDepartment);
router.put('/user-departments/:userId/:departmentId', requireAnyPermission(['settings:update', 'department:update', 'user:update']), settingsController.updateUserDepartment);
router.delete('/user-departments/:userId/:departmentId', requireAnyPermission(['settings:update', 'department:update', 'user:update']), settingsController.deleteUserDepartment);


// ================= USER ↔ DEPARTMENTS (METIER) =================

// Get departments by user
router.get('/users/:id/departments', requireAnyPermission(['settings:read', 'department:read', 'user:read']), settingsController.getDepartmentsByUser);

// Assign department to user
router.post('/users/:id/departments', requireAnyPermission(['settings:update', 'department:update', 'user:update']), settingsController.assignDepartmentToUser);

// Set primary department
router.patch('/users/:id/departments/:departmentId/primary', requireAnyPermission(['settings:update', 'department:update', 'user:update']), settingsController.setPrimaryDepartment);

// Remove department from user (soft delete)
router.delete('/users/:id/departments/:departmentId', requireAnyPermission(['settings:update', 'department:update', 'user:update']), settingsController.removeDepartmentFromUser);



// Audit Types
router.get('/audit-types', requireAnyPermission(['settings:read', 'department:read']), settingsController.getAuditTypes);
router.post('/audit-types', requireAnyPermission(['settings:update', 'department:update']), settingsController.createAuditType);
router.put('/audit-types/:id', requireAnyPermission(['settings:update', 'department:update']), settingsController.updateAuditType);
router.delete('/audit-types/:id', requireAnyPermission(['settings:update', 'department:delete']), settingsController.deleteAuditType);

// Risk Levels
router.get('/risk-levels', requireAnyPermission(['settings:read', 'department:read']), settingsController.getRiskLevels);
router.post('/risk-levels', requireAnyPermission(['settings:update', 'risk:update']), settingsController.createRiskLevel);
router.put('/risk-levels/:id', requireAnyPermission(['settings:update', 'risk:update']), settingsController.updateRiskLevel);
router.delete('/risk-levels/:id', requireAnyPermission(['settings:update', 'risk:update']), settingsController.deleteRiskLevel);

// Priority Levels
router.get('/priority-levels', requireAnyPermission(['settings:read', 'department:read']), settingsController.getPriorityLevels);
router.post('/priority-levels', requireAnyPermission(['settings:update', 'department:update']), settingsController.createPriorityLevel);
router.put('/priority-levels/:id', requireAnyPermission(['settings:update', 'department:update']), settingsController.updatePriorityLevel);
router.delete('/priority-levels/:id', requireAnyPermission(['settings:update', 'department:delete']), settingsController.deletePriorityLevel);

export default router;
