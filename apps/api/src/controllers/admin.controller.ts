import { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
const prisma = require('@audit/database').default;
import bcrypt from 'bcryptjs';

// 🔒 AJOUT UNIQUEMENT
const CRITICAL_PERMISSIONS = [
  'admin:access',
  'role:delete',
  'permission:delete'
];

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
    const { name, code, isActive } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Nom requis' });
    }

    if (!code?.trim()) {
      return res.status(400).json({ error: 'Code requis' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        code: code.trim(),
        isActive: isActive ?? true
      }
    });

    res.status(201).json(tenant);
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;

      if (target?.includes('name')) {
        return res.status(400).json({
          error: 'Un tenant avec ce nom existe déjà'
        });
      }

      if (target?.includes('code')) {
        return res.status(400).json({
          error: 'Un tenant avec ce code existe déjà'
        });
      }

      return res.status(400).json({
        error: 'Contrainte unique violée'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la création du tenant'
    });
  }
};

export const updateTenant = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    let { name, code, isActive } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Nom requis' });
    }

    if (!code?.trim()) {
      return res.status(400).json({ error: 'Code requis' });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code.trim(),
        isActive
      }
    });

    res.json(tenant);
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;

      if (target?.includes('name')) {
        return res.status(400).json({
          error: 'Un tenant avec ce nom existe déjà'
        });
      }

      if (target?.includes('code')) {
        return res.status(400).json({
          error: 'Un tenant avec ce code existe déjà'
        });
      }

      return res.status(400).json({
        error: 'Contrainte unique violée'
      });
    }

    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};


export const deleteTenant = async (req: Request, res: Response) => {
  try {
    const tenant = await prisma.tenant.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { isActive: false },
    });
    res.json({ message: 'Tenant désactivé', tenant });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= ROLES =================
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
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({ error: 'Nom du rôle requis' });
    }

    const existing = await prisma.role.findFirst({ where: { name } });

    if (existing) {
      return res.status(400).json({ error: 'Rôle déjà existant' });
    }

    const role = await prisma.role.create({ data: { name } });

    res.status(201).json(role);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({ error: 'Nom requis' });
    }

    // 🔒 Vérifier d'abord si le rôle existe
    const existingRole = await prisma.role.findUnique({ where: { id } });

    if (!existingRole) {
      return res.status(404).json({ error: 'Rôle introuvable' });
    }

    // 🔒 Interdire modification du SUPER_ADMIN AVANT update
    if (existingRole.name === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Modification interdite' });
    }

    // 🔒 Vérifier conflit de nom (sauf lui-même)
    const existing = await prisma.role.findFirst({ where: { name } });

    if (existing && existing.id !== id) {
      return res.status(400).json({ error: 'Nom déjà utilisé' });
    }

    const role = await prisma.role.update({
      where: { id },
      data: { name }
    });

    res.json(role);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!role) return res.status(404).json({ error: 'Introuvable' });

    if (role.name === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Interdit' });
    }

    if (role._count.users > 0) {
      return res.status(409).json({
        error: 'Ce rôle est encore assigné à un ou plusieurs utilisateurs'
      });
    }

    await prisma.role.delete({ where: { id } });

    res.json({ message: 'Supprimé' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= PERMISSIONS =================
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
    let { code, description } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code requis' });
    }

    code = code.trim().toLowerCase();

    const permission = await prisma.permission.create({
      data: { code, description: description ?? null }
    });

    res.status(201).json(permission);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Une permission avec ce code existe déjà'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la création'
    });
  }
};

export const updatePermission = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    let { code, description } = req.body;

    const current = await prisma.permission.findUnique({ where: { id } });

    if (!current) {
      return res.status(404).json({ error: 'Permission introuvable' });
    }

    // 🔒 Protection permissions critiques
    if (CRITICAL_PERMISSIONS.includes(current.code)) {
      return res.status(403).json({ error: 'Modification interdite pour cette permission' });
    }

    // 🔒 Validation code
    if (!code) {
      return res.status(400).json({ error: 'Code requis' });
    }

    code = code.trim().toLowerCase();

    // 🔥 RESTAURÉ (important)
    const existing = await prisma.permission.findFirst({
      where: {
        code,
        NOT: { id }
      }
    });

    if (existing) {
      return res.status(400).json({
        error: 'Une autre permission avec ce code existe déjà'
      });
    }

    const permission = await prisma.permission.update({
      where: { id },
      data: { code, description: description ?? null }
    });

    res.json(permission);
  } catch (error: any) {
    // 🔒 sécurité réelle (DB)
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Une permission avec ce code existe déjà'
      });
    }

    res.status(500).json({
      error: 'Erreur lors de la mise à jour'
    });
  }
};

export const deletePermission = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const permission = await prisma.permission.findUnique({ where: { id } });

    if (permission && CRITICAL_PERMISSIONS.includes(permission.code)) {
      return res.status(403).json({ error: 'Permission critique protégée' });
    }

    await prisma.permission.delete({ where: { id } });

    res.json({ message: 'Supprimée' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= ROLE PERMISSIONS =================
export const syncRolePermissions = async (req: Request, res: Response) => {
  const roleId = parseInt(req.params.id, 10);
  const { permissionIds } = req.body;

  try {
    const role = await prisma.role.findUnique({ where: { id: roleId } });

    if (!role) return res.status(404).json({ error: 'Rôle introuvable' });

    if (role.name === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Interdit' });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      if (permissionIds?.length) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((id: number) => ({
            roleId,
            permissionId: id
          }))
        });
      }
    });

    res.json({ message: 'OK' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= USERS =================
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        tenant: true
      }
    });

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const { password, ...data } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { ...data, passwordHash }
  });

  res.json(user);
};

// export const updateUser = async (req: Request, res: Response) => {
//   const { password, ...data } = req.body;

//   if (password) {
//     data.passwordHash = await bcrypt.hash(password, 10);
//   }

//   const user = await prisma.user.update({
//     where: { id: parseInt(req.params.id, 10) },
//     data
//   });

//   res.json(user);
// };
export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { password, roleId, tenantId, ...rest } = req.body;

    const data: any = {};

    // ✅ Champs simples autorisés uniquement
    if (rest.email !== undefined) data.email = rest.email;
    if (rest.status !== undefined) data.status = rest.status;
    if (rest.name !== undefined) data.name = rest.name;

    // ✅ Password
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    // ✅ Relations (IMPORTANT)
    if (roleId !== undefined) {
      data.role = {
        connect: { id: Number(roleId) }
      };
    }

    if (tenantId !== undefined) {
      data.tenant = {
        connect: { id: Number(tenantId) }
      };
    }

    const user = await prisma.user.update({
      where: { id },
      data
    });

    res.json(user);

  } catch (error: any) {
    console.error('UPDATE USER ERROR:', error);

    // Prisma erreurs propres
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.status(500).json({
      error: 'Erreur lors de la mise à jour utilisateur'
    });
  }
};


export const deleteUser = async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { status: 'INACTIVE' }
  });

  res.json(user);
};

// ================= TOKENS =================
export const getRefreshTokens = async (req: Request, res: Response) => {
  const tokens = await prisma.refreshToken.findMany();
  res.json(tokens);
};

export const revokeRefreshToken = async (req: Request, res: Response) => {
  await prisma.refreshToken.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { revokedAt: new Date() }
  });

  res.json({ message: 'Révoqué' });
};

export const getPasswordResetTokens = async (req: Request, res: Response) => {
  const tokens = await prisma.passwordResetToken.findMany();
  res.json(tokens);
};

export const invalidatePasswordResetToken = async (req: Request, res: Response) => {
  await prisma.passwordResetToken.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { used: true }
  });

  res.json({ message: 'Invalidé' });
};

export const approveUser = async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { status: 'ACTIVE' }
  });

  res.json(user);
};
