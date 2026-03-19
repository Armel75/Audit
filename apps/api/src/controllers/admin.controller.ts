import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ================= TENANTS =================
export const getTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({ orderBy: { name: 'asc' } });
    res.json(tenants);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  try {
    const tenant = await prisma.tenant.create({ data: req.body });
    res.status(201).json(tenant);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur lors de la création du tenant (Code potentiellement dupliqué)' });
  }
};

export const updateTenant = async (req: Request, res: Response) => {
  try {
    const tenant = await prisma.tenant.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body,
    });
    res.json(tenant);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  try {
    // Soft delete / désactivation
    const tenant = await prisma.tenant.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { isActive: false },
    });
    res.json({ message: 'Tenant désactivé avec succès', tenant });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= ROLES & PERMISSIONS =================
export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const role = await prisma.role.create({ data: { name: req.body.name } });
    res.status(201).json(role);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const role = await prisma.role.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { name: req.body.name },
    });
    res.json(role);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    await prisma.role.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ message: 'Rôle supprimé avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: 'Impossible de supprimer ce rôle (des utilisateurs y sont probablement rattachés)' });
  }
};

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: { code: 'asc' } });
    res.json(permissions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createPermission = async (req: Request, res: Response) => {
  try {
    const permission = await prisma.permission.create({ data: req.body });
    res.status(201).json(permission);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur lors de la création de la permission (Code potentiellement dupliqué)' });
  }
};

export const updatePermission = async (req: Request, res: Response) => {
  try {
    const permission = await prisma.permission.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body,
    });
    res.json(permission);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePermission = async (req: Request, res: Response) => {
  try {
    await prisma.permission.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ message: 'Permission supprimée avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const syncRolePermissions = async (req: Request, res: Response) => {
  const roleId = parseInt(req.params.id, 10);
  const { permissionIds } = req.body; // Array of Int

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds && permissionIds.length > 0) {
        const data = permissionIds.map((pid: number) => ({ roleId, permissionId: pid }));
        await tx.rolePermission.createMany({ data });
      }
    });
    res.json({ message: 'Permissions synchronisées avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= USERS =================
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, tenantId: true, matricule: true, email: true, 
        firstName: true, lastName: true, phone: true, status: true, 
        failedLogins: true, lockedUntil: true, lastLoginAt: true, roleId: true,
        role: { select: { name: true } },
        tenant: { select: { name: true } }
      },
      orderBy: { lastName: 'asc' }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { password, ...userData } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { ...userData, passwordHash },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur de création (Email ou Matricule potentiellement dupliqué)' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { password, ...userData } = req.body;
    const updateData: any = { ...userData };

    if (password && password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id, 10) },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    // Soft delete by changing status
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { status: 'INACTIVE' },
      select: { id: true, email: true, status: true }
    });
    res.json({ message: 'Utilisateur désactivé avec succès', user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= TOKENS (SECURITY) =================
export const getRefreshTokens = async (req: Request, res: Response) => {
  try {
    const tokens = await prisma.refreshToken.findMany({
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(tokens);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const revokeRefreshToken = async (req: Request, res: Response) => {
  try {
    await prisma.refreshToken.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { revokedAt: new Date() }
    });
    res.json({ message: 'Refresh Token révoqué' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getPasswordResetTokens = async (req: Request, res: Response) => {
  try {
    const tokens = await prisma.passwordResetToken.findMany({
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(tokens);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const invalidatePasswordResetToken = async (req: Request, res: Response) => {
  try {
    await prisma.passwordResetToken.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { used: true, usedAt: new Date() }
    });
    res.json({ message: 'Password Reset Token invalidé' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};


export const approveUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Identifiant utilisateur invalide' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        matricule: true,
        status: true,
        tenantId: true,
        roleId: true
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (existingUser.status === 'ACTIVE') {
      return res.json({
        message: 'Cet utilisateur est déjà actif',
        user: existingUser
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        failedLogins: 0,
        lockedUntil: null
      },
      select: {
        id: true,
        tenantId: true,
        matricule: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        failedLogins: true,
        lockedUntil: true,
        lastLoginAt: true,
        roleId: true,
        role: { select: { name: true } },
        tenant: { select: { name: true } }
      }
    });

    res.json({
      message: 'Utilisateur validé avec succès',
      user: updatedUser
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};