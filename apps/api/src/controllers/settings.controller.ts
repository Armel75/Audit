import { Request, Response } from 'express';
import prisma from '@audit/database';

// ================= DEPARTMENTS =================
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const departments = await prisma.department.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });
    res.json(departments);
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des départements: ' + error.message });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    let { name, code } = req.body;

    // ✅ Normalisation (clé de la solution)
    name = name?.trim().toUpperCase();
    code = code?.trim().toUpperCase();

    if (!name || !code) {
      return res.status(400).json({ error: 'Nom et code requis' });
    }

    // ✅ Vérification doublon name
    const existingByName = await prisma.department.findFirst({
      where: {
        tenantId,
        name
      }
    });

    if (existingByName) {
      return res.status(400).json({ error: 'Un département avec ce nom existe déjà' });
    }

    // ✅ Vérification doublon code
    const existingByCode = await prisma.department.findFirst({
      where: {
        tenantId,
        code
      }
    });

    if (existingByCode) {
      return res.status(400).json({ error: 'Un département avec ce code existe déjà' });
    }

    const department = await prisma.department.create({
      data: { tenantId, name, code }
    });

    res.status(201).json(department);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur lors de la création du département' });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tenantId = parseInt((req as any).user.tenantId, 10);
    let { name, code } = req.body;

    // ✅ Normalisation
    name = name?.trim().toUpperCase();
    code = code?.trim().toUpperCase();

    if (!name || !code) {
      return res.status(400).json({ error: 'Nom et code requis' });
    }

    // ✅ Récupérer l’existant
    const existingDepartment = await prisma.department.findUnique({
      where: { id }
    });

    if (!existingDepartment) {
      return res.status(404).json({ error: 'Département introuvable' });
    }

    // =============================
    // 🔥 BLOQUER MODIFICATION DU CODE SI UTILISÉ
    // =============================
    if (existingDepartment.code !== code) {
      const [
        userDepartments,
        recos,
        auditableEntities,
        businessProcesses,
        risks,
        controls
      ] = await Promise.all([
        prisma.userDepartment.count({ where: { departmentId: id } }),
        prisma.recommendation.count({ where: { departmentId: id } }),
        prisma.auditableEntity.count({ where: { ownerDepartmentId: id } }),
        prisma.businessProcess.count({ where: { ownerDepartmentId: id } }),
        prisma.risk.count({ where: { ownerDepartmentId: id } }),
        prisma.control.count({ where: { ownerDepartmentId: id } })
      ]);

      const totalDependencies =
        userDepartments +
        recos +
        auditableEntities +
        businessProcesses +
        risks +
        controls;

      if (totalDependencies > 0) {
        return res.status(400).json({
          error: 'Impossible de modifier le code d’un département utilisé',
          details: {
            userDepartments,
            recos,
            auditableEntities,
            businessProcesses,
            risks,
            controls
          }
        });
      }
    }

    // =============================
    // ✅ Vérification doublon name
    // =============================
    const existingByName = await prisma.department.findFirst({
      where: {
        tenantId,
        name,
        NOT: { id }
      }
    });

    if (existingByName) {
      return res.status(400).json({ error: 'Un département avec ce nom existe déjà' });
    }

    // =============================
    // ✅ Vérification doublon code
    // =============================
    const existingByCode = await prisma.department.findFirst({
      where: {
        tenantId,
        code,
        NOT: { id }
      }
    });

    if (existingByCode) {
      return res.status(400).json({ error: 'Un département avec ce code existe déjà' });
    }

    // ✅ Update
    const department = await prisma.department.update({
      where: { id },
      data: { name, code }
    });

    res.json(department);

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    // ✅ Vérifier les dépendances
    const [
      userDepartments,
      recos,
      auditableEntities,
      businessProcesses,
      risks,
      controls
    ] = await Promise.all([
      prisma.userDepartment.count({ where: { departmentId: id } }),
      prisma.recommendation.count({ where: { departmentId: id } }),
      prisma.auditableEntity.count({ where: { ownerDepartmentId: id } }),
      prisma.businessProcess.count({ where: { ownerDepartmentId: id } }),
      prisma.risk.count({ where: { ownerDepartmentId: id } }),
      prisma.control.count({ where: { ownerDepartmentId: id } })
    ]);

    const totalDependencies =
      userDepartments +
      recos +
      auditableEntities +
      businessProcesses +
      risks +
      controls;

    // ❌ Si utilisé → bloquer
    if (totalDependencies > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce département car il est utilisé',
        details: {
          userDepartments,
          recos,
          auditableEntities,
          businessProcesses,
          risks,
          controls
        }
      });
    }

    // ✅ Suppression safe
    await prisma.department.delete({ where: { id } });

    res.json({ message: 'Département supprimé avec succès' });

  } catch (error: any) {
    res.status(400).json({
      error: 'Erreur lors de la suppression du département'
    });
  }
};

// ================= USER DEPARTMENTS =================
export const getUserDepartments = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);

    const { active } = req.query;

    let whereClause: any = { tenantId };

    // 🔥 Filtrage intelligent
    if (active === 'true') {
      whereClause.OR = [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ];
    }

    if (active === 'false') {
      whereClause.endDate = { lte: new Date() };
    }

    const userDepartments = await prisma.userDepartment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(userDepartments);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUserDepartment = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const { userId, departmentId, isPrimary, startDate, endDate } = req.body;

    const uId = parseInt(userId, 10);
    const dId = parseInt(departmentId, 10);

    if (isNaN(uId) || isNaN(dId)) {
      return res.status(400).json({ error: "userId ou departmentId invalide" });
    }

    const [user, department] = await Promise.all([
      prisma.user.findUnique({ where: { id: uId } }),
      prisma.department.findUnique({ where: { id: dId } })
    ]);

    if (!user || user.tenantId !== tenantId) {
      return res.status(403).json({ error: "Utilisateur invalide ou hors tenant" });
    }

    if (!department || department.tenantId !== tenantId) {
      return res.status(403).json({ error: "Département invalide ou hors tenant" });
    }

    const result = await prisma.$transaction(async (tx) => {

      // 🔥 Gestion PRIMARY
      if (isPrimary === true) {
        await tx.userDepartment.updateMany({
          where: {
            userId: uId,
            tenantId,
            isPrimary: true
          },
          data: { isPrimary: false }
        });
      }

      return tx.userDepartment.create({
        data: {
          tenantId,
          userId: uId,
          departmentId: dId,
          isPrimary: isPrimary || false,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null
        }
      });
    });

    res.status(201).json(result);

  } catch (error: any) {
    res.status(400).json({
      error: "Erreur lors de l'affectation de l'utilisateur au département"
    });
  }
};

export const updateUserDepartment = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);

    const { userId, departmentId } = req.params;
    const { isPrimary, startDate, endDate } = req.body;

    const uId = parseInt(userId, 10);
    const dId = parseInt(departmentId, 10);

    if (isNaN(uId) || isNaN(dId)) {
      return res.status(400).json({ error: "IDs invalides" });
    }

    // 🔒 Vérifier existence + tenant
    const existing = await prisma.userDepartment.findFirst({
      where: {
        userId: uId,
        departmentId: dId,
        tenantId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Affectation introuvable" });
    }

    const result = await prisma.$transaction(async (tx) => {

      // 🔥 Gestion PRIMARY
      if (isPrimary === true) {
        await tx.userDepartment.updateMany({
          where: {
            userId: uId,
            tenantId,
            isPrimary: true
          },
          data: { isPrimary: false }
        });
      }

      // ✅ UPDATE PARTIEL
      return tx.userDepartment.update({
        where: {
          userId_departmentId: {
            userId: uId,
            departmentId: dId
          }
        },
        data: {
          ...(isPrimary !== undefined && { isPrimary }),
          ...(startDate !== undefined && {
            startDate: startDate ? new Date(startDate) : null
          }),
          ...(endDate !== undefined && {
            endDate: endDate ? new Date(endDate) : null
          })
        }
      });
    });

    res.json(result);

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteUserDepartment = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);

    const { userId, departmentId } = req.params;

    const uId = parseInt(userId, 10);
    const dId = parseInt(departmentId, 10);

    if (isNaN(uId) || isNaN(dId)) {
      return res.status(400).json({ error: "IDs invalides" });
    }

    // 🔒 Vérifier existence + tenant
    const existing = await prisma.userDepartment.findFirst({
      where: {
        userId: uId,
        departmentId: dId,
        tenantId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Affectation introuvable" });
    }

    const result = await prisma.$transaction(async (tx) => {

      // 🔥 SOFT DELETE
      await tx.userDepartment.update({
        where: {
          userId_departmentId: {
            userId: uId,
            departmentId: dId
          }
        },
        data: {
          endDate: new Date(),
          isPrimary: false
        }
      });

      // 🔥 Si c'était un PRIMARY → en assigner un autre
      if (existing.isPrimary) {

        const next = await tx.userDepartment.findFirst({
          where: {
            userId: uId,
            tenantId,
            departmentId: { not: dId },
            OR: [
              { endDate: null },
              { endDate: { gt: new Date() } }
            ]
          },
          orderBy: { createdAt: 'asc' }
        });

        if (next) {
          await tx.userDepartment.update({
            where: {
              userId_departmentId: {
                userId: next.userId,
                departmentId: next.departmentId
              }
            },
            data: { isPrimary: true }
          });
        }
      }

      return { message: "Affectation terminée avec succès" };
    });

    res.json(result);

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getDepartmentsByUser = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const userId = parseInt(req.params.id, 10);

    const { active } = req.query;

    if (isNaN(userId)) {
      return res.status(400).json({ error: "userId invalide" });
    }

    // 🔒 Vérifier user + tenant
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.tenantId !== tenantId) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // 🔍 filtre
    let whereClause: any = {
      tenantId,
      userId
    };

    if (active === 'true') {
      whereClause.OR = [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ];
    }

    if (active === 'false') {
      whereClause.endDate = { lte: new Date() };
    }

    const departments = await prisma.userDepartment.findMany({
      where: whereClause,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' }, // primary en premier
        { createdAt: 'desc' }
      ]
    });

    res.json(departments);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const assignDepartmentToUser = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const userId = parseInt(req.params.id, 10);

    const { departmentId, isPrimary, startDate } = req.body;

    const dId = parseInt(departmentId, 10);

    if (isNaN(userId) || isNaN(dId)) {
      return res.status(400).json({ error: "IDs invalides" });
    }

    // 🔒 Vérifier user + department + tenant
    const [user, department] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.department.findUnique({ where: { id: dId } })
    ]);

    if (!user || user.tenantId !== tenantId) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    if (!department || department.tenantId !== tenantId) {
      return res.status(404).json({ error: "Département introuvable" });
    }

    const result = await prisma.$transaction(async (tx) => {

      if (isPrimary === true) {
        await tx.userDepartment.updateMany({
          where: { userId, tenantId, isPrimary: true },
          data: { isPrimary: false }
        });
      }

      return tx.userDepartment.create({
        data: {
          tenantId,
          userId,
          departmentId: dId,
          isPrimary: !!isPrimary,
          startDate: startDate ? new Date(startDate) : new Date()
        }
      });
    });

    res.status(201).json(result);

  } catch (error: any) {
    res.status(400).json({ error: "Affectation impossible (déjà existante ?)" });
  }
};

export const setPrimaryDepartment = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);

    const userId = parseInt(req.params.id, 10);
    const departmentId = parseInt(req.params.departmentId, 10);

    if (isNaN(userId) || isNaN(departmentId)) {
      return res.status(400).json({ error: "IDs invalides" });
    }

    const existing = await prisma.userDepartment.findFirst({
      where: { userId, departmentId, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Affectation introuvable" });
    }

    const result = await prisma.$transaction(async (tx) => {

      // reset anciens primary
      await tx.userDepartment.updateMany({
        where: { userId, tenantId, isPrimary: true },
        data: { isPrimary: false }
      });

      // set nouveau
      return tx.userDepartment.update({
        where: {
          userId_departmentId: { userId, departmentId }
        },
        data: { isPrimary: true }
      });
    });

    res.json(result);

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const removeDepartmentFromUser = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);

    const userId = parseInt(req.params.id, 10);
    const departmentId = parseInt(req.params.departmentId, 10);

    if (isNaN(userId) || isNaN(departmentId)) {
      return res.status(400).json({ error: "IDs invalides" });
    }

    const existing = await prisma.userDepartment.findFirst({
      where: { userId, departmentId, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Affectation introuvable" });
    }

    const result = await prisma.$transaction(async (tx) => {

      // soft delete
      await tx.userDepartment.update({
        where: {
          userId_departmentId: { userId, departmentId }
        },
        data: {
          endDate: new Date(),
          isPrimary: false
        }
      });

      // si primary → remplacer
      if (existing.isPrimary) {
        const next = await tx.userDepartment.findFirst({
          where: {
            userId,
            tenantId,
            departmentId: { not: departmentId },
            OR: [
              { endDate: null },
              { endDate: { gt: new Date() } }
            ]
          }
        });

        if (next) {
          await tx.userDepartment.update({
            where: {
              userId_departmentId: {
                userId: next.userId,
                departmentId: next.departmentId
              }
            },
            data: { isPrimary: true }
          });
        }
      }

      return { message: "Département retiré" };
    });

    res.json(result);

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ================= AUDIT TYPES =================
export const getAuditTypes = async (req: Request, res: Response) => {
  try {

    const tenantId = Number((req as any).user?.tenantId);

    if (!tenantId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const auditTypes = await prisma.auditType.findMany({
      where: {
        tenantId,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    res.json(auditTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createAuditType = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const { name } = req.body;
    const auditType = await prisma.auditType.create({
      data: { tenantId, name }
    });
    res.status(201).json(auditType);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur de création (Nom potentiellement dupliqué)' });
  }
};

export const updateAuditType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    const auditType = await prisma.auditType.update({
      where: { id },
      data: { name }
    });
    res.json(auditType);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteAuditType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    // Vérifier existence + tenant
    const auditType = await prisma.auditType.findFirst({
      where: {
        id,
        tenantId
      }
    });

    if (!auditType) {
      return res.status(404).json({ error: "Type d'audit introuvable" });
    }

    // Toggle actif/inactif
    const updated = await prisma.auditType.update({
      where: { id },
      data: { isActive: !auditType.isActive }
    });

    res.json({
      message: updated.isActive
        ? "Type d'audit réactivé avec succès"
        : "Type d'audit désactivé avec succès"
    });

  } catch (error: any) {
    res.status(500).json({
      error: "Erreur serveur lors de la modification"
    });
  }
};

// ================= RISK LEVELS =================
export const getRiskLevels = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const riskLevels = await prisma.riskLevel.findMany({
      where: { tenantId },
      orderBy: { level: 'asc' }
    });
    res.json(riskLevels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createRiskLevel = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const { name, color, level } = req.body;
    const riskLevel = await prisma.riskLevel.create({
      data: { tenantId, name, color, level: parseInt(level, 10) }
    });
    res.status(201).json(riskLevel);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur de création (Nom ou Niveau potentiellement dupliqué)' });
  }
};

export const updateRiskLevel = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, color, level } = req.body;
    const riskLevel = await prisma.riskLevel.update({
      where: { id },
      data: { name, color, level: parseInt(level, 10) }
    });
    res.json(riskLevel);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteRiskLevel = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.riskLevel.delete({ where: { id } });
    res.json({ message: 'Niveau de risque supprimé avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: 'Impossible de supprimer ce niveau de risque' });
  }
};

// ================= PRIORITY LEVELS =================
export const getPriorityLevels = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const priorityLevels = await prisma.priorityLevel.findMany({
      where: { tenantId },
      orderBy: { level: 'asc' }
    });
    res.json(priorityLevels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createPriorityLevel = async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt((req as any).user.tenantId, 10);
    const { name, level } = req.body;
    const priorityLevel = await prisma.priorityLevel.create({
      data: { tenantId, name, level: parseInt(level, 10) }
    });
    res.status(201).json(priorityLevel);
  } catch (error: any) {
    res.status(400).json({ error: 'Erreur de création (Nom ou Niveau potentiellement dupliqué)' });
  }
};

export const updatePriorityLevel = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, level } = req.body;
    const priorityLevel = await prisma.priorityLevel.update({
      where: { id },
      data: { name, level: parseInt(level, 10) }
    });
    res.json(priorityLevel);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePriorityLevel = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.priorityLevel.delete({ where: { id } });
    res.json({ message: 'Niveau de priorité supprimé avec succès' });
  } catch (error: any) {
    res.status(400).json({ error: 'Impossible de supprimer ce niveau de priorité' });
  }
};
