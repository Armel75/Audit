import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Tenants
router.get('/tenants', adminController.getTenants);
router.post('/tenants', adminController.createTenant);
router.put('/tenants/:id', adminController.updateTenant);
router.delete('/tenants/:id', adminController.deleteTenant);

// Roles
router.get('/roles', adminController.getRoles);
router.post('/roles', adminController.createRole);
router.put('/roles/:id', adminController.updateRole);
router.delete('/roles/:id', adminController.deleteRole);

// Permissions
router.get('/permissions', adminController.getPermissions);
router.post('/permissions', adminController.createPermission);
router.put('/permissions/:id', adminController.updatePermission);
router.delete('/permissions/:id', adminController.deletePermission);

// RolePermissions
router.post('/roles/:id/permissions', adminController.syncRolePermissions);

// Users
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/users/:id/approve', adminController.approveUser);

// Tokens
router.get('/tokens/refresh', adminController.getRefreshTokens);
router.post('/tokens/refresh/:id/revoke', adminController.revokeRefreshToken);

router.get('/tokens/reset', adminController.getPasswordResetTokens);
router.post('/tokens/reset/:id/revoke', adminController.invalidatePasswordResetToken);

export default router;
