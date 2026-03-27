import { Request, Response } from 'express';
import prisma from '@audit/database';

// ================= GET ALL =================
export const getAuditableEntities = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const entities = await prisma.auditableEntity.findMany({
      where: { tenantId },
      include: {
        parent: { select: { id: true, name: true } },
        ownerDepartment: { select: { id: true, name: true } },
        managerUser: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(entities);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ================= CREATE =================
export const createAuditableEntity = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    let {
      code,
      name,
      entityType,
      description,
      criticality,
      parentId,
      ownerDepartmentId,
      managerUserId
    } = req.body;

    // 🔥 Normalisation (comme Department)
    code = code?.trim().toUpperCase();
    name = name?.trim();

    if (!code || !name || !entityType) {
      return res.status(400).json({
        error: "Code, nom et type requis"
      });
    }

    // 🔒 UNIQUE CODE
    const existing = await prisma.auditableEntity.findFirst({
      where: { tenantId, code }
    });

    if (existing) {
      return res.status(400).json({
        error: "Une entité avec ce code existe déjà"
      });
    }

    // 🔒 Vérification parent
    if (parentId) {
      const parent = await prisma.auditableEntity.findFirst({
        where: { id: parseInt(parentId), tenantId }
      });

      if (!parent) {
        return res.status(400).json({
          error: "Parent invalide ou hors tenant"
        });
      }
    }

    // 🔒 Vérification department
    if (ownerDepartmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: parseInt(ownerDepartmentId), tenantId }
      });

      if (!dept) {
        return res.status(400).json({
          error: "Département invalide"
        });
      }
    }

    // 🔒 Vérification manager
    if (managerUserId) {
      const user = await prisma.user.findFirst({
        where: { id: parseInt(managerUserId), tenantId }
      });

      if (!user) {
        return res.status(400).json({
          error: "Manager invalide"
        });
      }
    }

    const entity = await prisma.auditableEntity.create({
      data: {
        tenantId,
        code,
        name,
        entityType,
        description,
        criticality,
        parentId: parentId ? parseInt(parentId) : null,
        ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null,
        managerUserId: managerUserId ? parseInt(managerUserId) : null
      }
    });

    res.status(201).json(entity);

  } catch (error: any) {
    res.status(400).json({
      error: "Erreur lors de la création"
    });
  }
};

// ================= UPDATE =================
export const updateAuditableEntity = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const id = parseInt(req.params.id, 10);

    if (!tenantId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    let {
      code,
      name,
      entityType,
      description,
      criticality,
      parentId,
      ownerDepartmentId,
      managerUserId
    } = req.body;

    // 🔒 Existence
    const existing = await prisma.auditableEntity.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        error: "Entité introuvable"
      });
    }

    // 🔥 Normalisation
    code = code?.trim().toUpperCase();
    name = name?.trim();

    // 🔒 UNIQUE CODE (si modifié)
    if (code && code !== existing.code) {
      const duplicate = await prisma.auditableEntity.findFirst({
        where: {
          tenantId,
          code,
          NOT: { id }
        }
      });

      if (duplicate) {
        return res.status(400).json({
          error: "Code déjà utilisé"
        });
      }
    }

    // 🔒 Vérification parent (anti boucle simple)
    if (parentId) {
      const pId = parseInt(parentId);

      if (pId === id) {
        return res.status(400).json({
          error: "Une entité ne peut pas être son propre parent"
        });
      }

      const parent = await prisma.auditableEntity.findFirst({
        where: { id: pId, tenantId }
      });

      if (!parent) {
        return res.status(400).json({
          error: "Parent invalide"
        });
      }
    }

    const updated = await prisma.auditableEntity.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(entityType && { entityType }),
        ...(description !== undefined && { description }),
        ...(criticality !== undefined && { criticality }),
        ...(parentId !== undefined && {
          parentId: parentId ? parseInt(parentId) : null
        }),
        ...(ownerDepartmentId !== undefined && {
          ownerDepartmentId: ownerDepartmentId ? parseInt(ownerDepartmentId) : null
        }),
        ...(managerUserId !== undefined && {
          managerUserId: managerUserId ? parseInt(managerUserId) : null
        })
      }
    });

    res.json(updated);

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= DELETE =================
export const deleteAuditableEntity = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const id = parseInt(req.params.id, 10);

    if (!tenantId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    // 🔒 Vérifier enfants
    const children = await prisma.auditableEntity.count({
      where: { parentId: id }
    });

    if (children > 0) {
      return res.status(400).json({
        error: "Impossible de supprimer une entité avec des enfants"
      });
    }

    // 🔒 Vérifier dépendances métier
    const [missions, risks, processes] = await Promise.all([
      prisma.auditMissionScope.count({ where: { auditableEntityId: id } }),
      prisma.risk.count({ where: { auditableEntityId: id } }),
      prisma.businessProcess.count({ where: { auditableEntityId: id } })
    ]);

    const total = missions + risks + processes;

    if (total > 0) {
      return res.status(400).json({
        error: "Entité utilisée, suppression impossible",
        details: { missions, risks, processes }
      });
    }

    await prisma.auditableEntity.delete({
      where: { id }
    });

    res.json({ message: "Supprimée avec succès" });

  } catch (error: any) {
    res.status(400).json({
      error: "Erreur lors de la suppression"
    });
  }
};