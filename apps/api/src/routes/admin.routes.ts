import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// Tenants
router.get('/tenants', requirePermission('tenant:read'), adminController.getTenants);
router.post('/tenants', requirePermission('tenant:create'), adminController.createTenant);
router.put('/tenants/:id', requirePermission('tenant:update'), adminController.updateTenant);
router.delete('/tenants/:id', requirePermission('tenant:delete'), adminController.deleteTenant);

// Roles
router.get('/roles', requirePermission('role:read'), adminController.getRoles);
router.post('/roles', requirePermission('role:create'), adminController.createRole);
router.put('/roles/:id', requirePermission('role:update'), adminController.updateRole);
router.delete('/roles/:id', requirePermission('role:delete'), adminController.deleteRole);

// Permissions
router.get('/permissions', requirePermission('permission:read'), adminController.getPermissions);
router.post('/permissions', requirePermission('permission:create'), adminController.createPermission);
router.put('/permissions/:id', requirePermission('permission:update'), adminController.updatePermission);
router.delete('/permissions/:id', requirePermission('permission:delete'), adminController.deletePermission);

// RolePermissions
router.post('/roles/:id/permissions', requirePermission('role:assign_permissions'), adminController.syncRolePermissions);

// Users
router.get('/users', requirePermission('user:read'), adminController.getUsers);
router.post('/users', requirePermission('user:create'), adminController.createUser);
router.put('/users/:id', requirePermission('user:update'), adminController.updateUser);
router.delete('/users/:id', requirePermission('user:delete'), adminController.deleteUser);
router.patch('/users/:id/approve', requirePermission('user:approve'), adminController.approveUser);

// Tokens
router.get('/tokens/refresh', requirePermission('token:read'), adminController.getRefreshTokens);
router.post('/tokens/refresh/:id/revoke', requirePermission('token:revoke'), adminController.revokeRefreshToken);

router.get('/tokens/reset', requirePermission('token:read'), adminController.getPasswordResetTokens);
router.post('/tokens/reset/:id/revoke', requirePermission('token:revoke'), adminController.invalidatePasswordResetToken);

export default router;
