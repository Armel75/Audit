import { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';

const prisma = require('@audit/database').default;
import * as missionService from '../services/mission.service';

import {
  getMissionReportData,
  buildReportHTML,
  generatePDF,
  getMissionOrderData,
  buildMissionOrderHTML
} from '../services/report.service';

import { DocumentService } from '../services/document.service';
// ==========================================
// AUDIT MISSION
// ==========================================

/**
 * Returns a Prisma WHERE filter that restricts missions to those
 * where the user is leader or an active member.
 * Returns null if the user has read_all (no restriction needed).
 */
function getMissionAccessFilter(user: Express.Request['user']): any | null {
  if (!user) return null;
  const perms = user.permissions.map((p: string) => p.toLowerCase());
  console.log('[MISSION ACCESS] userId:', user.id, 'permissions:', perms);
  console.log('[MISSION ACCESS] has read_all:', perms.includes('audit_mission:read_all'));
  if (perms.includes('audit_mission:read_all')) return null;
  return {
    OR: [
      { leaderId: user.id },
      { members: { some: { userId: user.id, assignmentStatus: 'ACTIVE' } } }
    ]
  };
}

// export const getMissions = async (req: Request, res: Response) => {
//   try {
//     const tenantId = req.user?.tenantId;
//     if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;    
//     const skip = (page - 1) * limit;

//     const [missions, total] = await Promise.all([
//       prisma.auditMission.findMany({
//         where: { tenantId },
//         include: {
//           leader: {
//             select: { id: true, firstName: true, lastName: true, email: true }
//           },
//           plan: {
//             select: { id: true, year: true, title: true }
//           },
//           auditType: {
//             select: { id: true, name: true }
//           },
//           _count: {
//             select: { findings: true, documents: true, members: true, scopes: true }
//           }
//         },
//         orderBy: { createdAt: 'desc' },
//         skip,
//         take: limit
//       }),

//       prisma.auditMission.count({
//         where: { tenantId }
//       })
//     ]);

//     res.json({
//       data: missions,
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit)
//     });

//   } catch (error: any) {
//     console.error('Error fetching missions:', error);
//     res.status(500).json({ error: 'Erreur lors de la récupération des missions' });
//   }
// };

export const getMissions = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;    
    const skip = (page - 1) * limit;

    const type = req.query.type as string; // 'active' | 'archive'
    const leaderId = req.query.leaderId as string;

    const where: any = { tenantId };

    if (type === 'active') {
      where.status = { not: 'CLOSED' };
    }

    if (type === 'archive') {
      where.status = 'CLOSED';
    }

    if (leaderId) {
      where.leaderId = parseInt(leaderId);
    }

    // Permission-based filtering: read_all sees everything, read sees only assigned
    const accessFilter = getMissionAccessFilter(req.user);
    if (accessFilter) {
      where.AND = [...(where.AND || []), accessFilter];
    }

    const [missions, total] = await Promise.all([
      prisma.auditMission.findMany({
        where,
        include: {
          leader: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          plan: {
            select: { id: true, year: true, title: true }
          },
          auditType: {
            select: { id: true, name: true }
          },
          _count: {
            select: { findings: true, documents: true, members: true, scopes: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),

      prisma.auditMission.count({
        where
      })
    ]);

    res.json({
      data: missions,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error: any) {
    console.error('Error fetching missions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des missions' });
  }
};


export const getMission = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const findWhere: any = { id: parseInt(id), tenantId };

    // Permission-based filtering: read_all sees everything, read sees only assigned
    const accessFilter = getMissionAccessFilter(req.user);
    if (accessFilter) {
      findWhere.AND = [accessFilter];
    }

    const mission = await prisma.auditMission.findFirst({
      where: findWhere,
      include: {
        leader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        plan: {
          select: { id: true, year: true, title: true }
        },
        auditType: {
          select: { id: true, name: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { assignedAt: 'desc' }
        },
        scopes: {
          include: {
            auditableEntity: {
              select: { id: true, name: true, code: true, entityType: true }
            },
            addedBy: {
              select: { id: true, firstName: true, lastName: true }
            },
            removedBy: {
              select: { id: true, firstName: true, lastName: true }
            }
          },
          where: { status: 'IN_SCOPE' }, // Only show active scopes
          orderBy: { createdAt: 'desc' }
        },
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, firstName: true, lastName: true }
            }
          },
          orderBy: { changedAt: 'desc' }
        },
        findings: {
          include: {
            riskLevel: true,
            _count: {
              select: { recos: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        // programs: {
        //   select: {
        //     id: true,
        //     title: true,
        //     status: true,
        //     _count: {
        //       select: { procedures: true }
        //     }
        //   },
        //   orderBy: { createdAt: 'desc' }
        // },
        programs: {
          include: {
            approvals: {
              where: {
                approvalType: 'PROGRAM_APPROVAL'
              },
              orderBy: { createdAt: 'desc' }
            },
            _count: {
              select: { procedures: true }
            }
          }
        },
        documents: true,
        approvals: {
          include: { approver: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });

    res.json(mission);
  } catch (error: any) {
    console.error('Error fetching mission:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la mission' });
  }
};


export const evaluateMissionReadiness = async (tx: any, missionId: number) => {
  const mission = await tx.auditMission.findUnique({
    where: { id: missionId },
    include: {
      members: true,
      scopes: true,
      programs: true
    }
  });

  if (!mission) return;

  const hasMembers = mission.members.length > 0;
  const hasScopes = mission.scopes.filter((s: { status: string }) => s.status === 'IN_SCOPE').length > 0;
  //const hasApprovedProgram = mission.programs.some(p => p.status === 'APPROVED');
  const hasApprovedProgram = mission.programs.some(
    (p: { status: string }) => p.status === 'APPROVED'
  );

  if (hasMembers && hasScopes && hasApprovedProgram && mission.status === 'PLANNED') {
    await tx.auditMission.update({
      where: { id: missionId },
      data: { status: 'READY' }
    });
  }
}

export const createMission = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const {
      title,
      description,
      objective,
      scopeDescription,
      methodology,
      startDate,
      endDate,
      planId,
      auditTypeId,
      leaderId
    } = req.body;

    const auditableEntityIds = Array.isArray(req.body.auditableEntityIds)
      ? req.body.auditableEntityIds
      : [];
    const parsedPlanId = Number(planId);
    const parsedLeaderId = Number(leaderId);
    const parsedAuditTypeId = auditTypeId ? Number(auditTypeId) : null;
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (!title || !description || !parsedPlanId || !parsedLeaderId) {
      return res.status(400).json({ error: 'Titre, description, plan et chef de mission sont requis' });
    }

    if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
      return res.status(400).json({
        error: 'La date de fin de mission doit etre posterieure a la date de debut'
      });
    }

    const plan = await prisma.auditPlan.findFirst({
      where: { id: parsedPlanId, tenantId }
    });

    if (!plan) {
      return res.status(404).json({ error: "Plan d'audit non trouvé" });
    }

    if (plan.status !== "VALIDATED") {
      return res.status(400).json({
        error: `Le plan doit être validé (status actuel: ${plan.status})`
      });
    }

    const leader = await prisma.user.findFirst({
      where: { id: parsedLeaderId, tenantId }
    });
    if (!leader) return res.status(404).json({ error: 'Chef de mission non trouvé' });

    const mission = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newMission = await tx.auditMission.create({
        data: {
          tenantId,
          title,
          description,
          objective,
          scopeDescription,
          methodology,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          status: 'PLANNED',
          planId: parsedPlanId,
          auditTypeId: parsedAuditTypeId,
          leaderId: parsedLeaderId
        }
      });

      await tx.missionStatusHistory.create({
        data: {
          tenantId,
          missionId: newMission.id,
          previousStatus: null,
          newStatus: 'PLANNED',
          reason: 'Création de la mission',
          changedById: userId
        }
      });

      // 🔥 AJOUT SCOPE
      if (Array.isArray(auditableEntityIds) && auditableEntityIds.length > 0) {

        // Vérifier tenant (sécurité)
        const validEntities = await tx.auditableEntity.findMany({
          where: {
            id: { in: auditableEntityIds.map((id: any) => Number(id)) },
            tenantId
          },
          select: { id: true }
        });

        const validIds = validEntities.map(e => e.id);

        // 🔒 éviter doublons manuellement
        const existingScopes = await tx.auditMissionScope.findMany({
          where: {
            missionId: newMission.id,
            tenantId, // ✅ AJOUT CRITIQUE
            auditableEntityId: { in: validIds }
          },
          select: { auditableEntityId: true }
        });

        const existingIds = existingScopes.map(s => s.auditableEntityId);

        const newIds = validIds.filter(id => !existingIds.includes(id));

        if (newIds.length > 0) {
          await tx.auditMissionScope.createMany({
            data: newIds.map(id => ({
              tenantId,
              missionId: newMission.id,
              auditableEntityId: id,
              addedById: userId
            }))
          });
        }
      }

      return newMission;
    });

    res.status(201).json(mission);
  } catch (error: any) {
    console.error('Error creating mission:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la mission' });
  }
};

export const updateMission = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const {
      title,
      description,
      objective,
      scopeDescription,
      methodology,
      startDate,
      endDate,
      planId,
      auditTypeId,
      leaderId
    } = req.body;

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    const existing = await prisma.auditMission.findFirst({
      where: { id: parseInt(id), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Mission non trouvée' });

    if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
      return res.status(400).json({
        error: 'La date de fin de mission doit etre posterieure a la date de debut'
      });
    }

    const updated = await prisma.auditMission.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        objective,
        scopeDescription,
        methodology,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        planId: planId ? parseInt(planId) : undefined,
        auditTypeId: auditTypeId ? parseInt(auditTypeId) : null,
        leaderId: leaderId ? parseInt(leaderId) : undefined
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating mission:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la mission' });
  }
};


export const updateMissionStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const user = req.user;

    if (!tenantId || !user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Le nouveau statut est requis' });
    }

    const updated = await missionService.updateMissionStatus(
      parseInt(id),
      status,
      user,
      reason
    );

    res.json(updated);

  } catch (error: any) {
    console.error('Error updating mission status:', error);

    // 🔥 IMPORTANT — renvoyer erreurs métier propres
    res.status(400).json({
      error: error.message || 'Erreur lors du changement de statut'
    });
  }
};


export const deleteMission = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const mission = await prisma.auditMission.findFirst({
      where: { id: parseInt(id), tenantId },
      include: {
        _count: {
          select: { findings: true, documents: true }
        }
      }
    });

    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });

    if (mission._count.findings > 0 || mission._count.documents > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer cette mission car elle contient des constats ou des documents.' });
    }

    await prisma.auditMission.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Mission supprimée avec succès' });
  } catch (error: any) {
    console.error('Error deleting mission:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la mission' });
  }
};

// ==========================================
// AUDIT MISSION MEMBER
// ==========================================

export const addMissionMember = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params; // missionId
    const { userId, roleInMission, isLead, notes } = req.body;

    const mission = await prisma.auditMission.findUnique({
      where: { id: parseInt(id) }
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    if (!['PLANNED', 'READY'].includes(mission.status)) {
      return res.status(400).json({
        error: 'Cadrage verrouillé : mission déjà démarrée'
      });
    }

    if (!userId || !roleInMission) {
      return res.status(400).json({ error: 'L\'utilisateur et le rôle sont requis' });
    }

    // Check if already exists
    const existing = await prisma.auditMissionMember.findFirst({
      where: {
        missionId: parseInt(id),
        userId: parseInt(userId),
        roleInMission,
        tenantId
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Cet utilisateur a déjà ce rôle dans la mission' });
    }

    const member = await prisma.auditMissionMember.create({
      data: {
        tenantId,
        missionId: parseInt(id),
        userId: parseInt(userId),
        roleInMission,
        isLead: isLead || false,
        notes,
        assignmentStatus: 'ACTIVE'
      }
    });

    await evaluateMissionReadiness(prisma, parseInt(id));

    res.status(201).json(member);
  } catch (error: any) {
    console.error('Error adding mission member:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du membre' });
  }
};

export const updateMissionMember = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { memberId } = req.params;
    const { roleInMission, isLead, assignmentStatus, notes } = req.body;

    const existing = await prisma.auditMissionMember.findFirst({
      where: { id: parseInt(memberId), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Membre non trouvé' });

    const updated = await prisma.auditMissionMember.update({
      where: { id: parseInt(memberId) },
      data: {
        roleInMission,
        isLead,
        assignmentStatus,
        notes,
        removedAt: assignmentStatus === 'REMOVED' ? new Date() : null
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating mission member:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du membre' });
  }
};

export const removeMissionMember = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { memberId } = req.params;

    const existing = await prisma.auditMissionMember.findFirst({
      where: { id: parseInt(memberId), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Membre non trouvé' });

    await prisma.auditMissionMember.delete({
      where: { id: parseInt(memberId) }
    });

    res.json({ message: 'Membre retiré avec succès' });
  } catch (error: any) {
    console.error('Error removing mission member:', error);
    res.status(500).json({ error: 'Erreur lors du retrait du membre' });
  }
};

// ==========================================
// AUDIT MISSION SCOPE
// ==========================================

export const addMissionScope = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params; // missionId
    const { auditableEntityId, scopeRole, criticality } = req.body;

    const mission = await prisma.auditMission.findUnique({
      where: { id: parseInt(id) }
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    if (!['PLANNED', 'READY'].includes(mission.status)) {
      return res.status(400).json({
        error: 'Cadrage verrouillé : mission déjà démarrée'
      });
    }

    if (!auditableEntityId) {
      return res.status(400).json({ error: 'L\'entité auditable est requise' });
    }

    // Check if already exists (active scope)
    const existing = await prisma.auditMissionScope.findFirst({
      where: {
        missionId: parseInt(id),
        auditableEntityId: parseInt(auditableEntityId),
        tenantId,
        status: 'IN_SCOPE' // Only check active scopes
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Cette entité est déjà dans le périmètre de la mission' });
    }

    const scope = await prisma.auditMissionScope.create({
      data: {
        tenantId,
        missionId: parseInt(id),
        auditableEntityId: parseInt(auditableEntityId),
        scopeRole,
        criticality,
        addedById: userId
      }
    });

    await evaluateMissionReadiness(prisma, parseInt(id));
    
    res.status(201).json(scope);
  } catch (error: any) {
    console.error('Error adding mission scope:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout au périmètre' });
  }
};

export const updateMissionScope = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { scopeId } = req.params;
    const { auditableEntityId, scopeRole, criticality, notes } = req.body;

    const existingScope = await prisma.auditMissionScope.findFirst({
      where: { id: parseInt(scopeId), tenantId, status: 'IN_SCOPE' },
      include: { mission: true }
    });

    if (!existingScope) {
      return res.status(404).json({ error: 'Périmètre actif non trouvé' });
    }

    if (!['PLANNED', 'READY'].includes(existingScope.mission.status)) {
      return res.status(400).json({ error: 'Cadrage verrouillé : mission déjà démarrée' });
    }

    if (!auditableEntityId) {
      return res.status(400).json({ error: 'L\'entité auditable est requise' });
    }

    const duplicate = await prisma.auditMissionScope.findFirst({
      where: {
        missionId: existingScope.missionId,
        auditableEntityId: parseInt(auditableEntityId),
        tenantId,
        status: 'IN_SCOPE',
        NOT: { id: parseInt(scopeId) }
      }
    });

    if (duplicate) {
      return res.status(400).json({ error: 'Cette entité est déjà dans le périmètre de la mission' });
    }

    const updatedScope = await prisma.auditMissionScope.update({
      where: { id: parseInt(scopeId) },
      data: {
        auditableEntityId: parseInt(auditableEntityId),
        scopeRole,
        criticality,
        notes
      }
    });

    await evaluateMissionReadiness(prisma, existingScope.missionId);

    res.json(updatedScope);
  } catch (error: any) {
    console.error('Error updating mission scope:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du périmètre' });
  }
};

export const removeMissionScope = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { scopeId } = req.params;
    const { removalReason } = req.body;

    const existing = await prisma.auditMissionScope.findFirst({
      where: { id: parseInt(scopeId), tenantId, status: 'IN_SCOPE' }
    });

    if (!existing) return res.status(404).json({ error: 'Périmètre actif non trouvé' });

    // Soft delete: update status and removal info
    await prisma.auditMissionScope.update({
      where: { id: parseInt(scopeId) },
      data: {
        status: 'REMOVED',
        removedById: userId,
        removedAt: new Date(),
        removalReason: removalReason || null
      }
    });

    res.json({ message: 'Entité retirée du périmètre avec succès' });
  } catch (error: any) {
    console.error('Error removing mission scope:', error);
    res.status(500).json({ error: 'Erreur lors du retrait du périmètre' });
  }
};

// ==========================================
// MISSION STATUS HISTORY
// ==========================================

export const updateMissionStatusHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { historyId } = req.params;
    const { reason } = req.body;

    const existing = await prisma.missionStatusHistory.findFirst({
      where: { id: parseInt(historyId), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Historique non trouvé' });

    const updated = await prisma.missionStatusHistory.update({
      where: { id: parseInt(historyId) },
      data: { reason }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating mission status history:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'historique' });
  }
};

export const deleteMissionStatusHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { historyId } = req.params;

    const existing = await prisma.missionStatusHistory.findFirst({
      where: { id: parseInt(historyId), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Historique non trouvé' });

    await prisma.missionStatusHistory.delete({
      where: { id: parseInt(historyId) }
    });

    res.json({ message: 'Historique supprimé avec succès' });
  } catch (error: any) {
    console.error('Error deleting mission status history:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'historique' });
  }
};

export const getMissionReport = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const reportWhere: any = { id: parseInt(id), tenantId };
    const accessFilter = getMissionAccessFilter(req.user);
    if (accessFilter) {
      reportWhere.AND = [accessFilter];
    }

    const mission = await prisma.auditMission.findFirst({
      where: reportWhere,
      include: {
        leader: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        plan: true,
        findings: {
          include: {
            riskLevel: true,
            author: {
              select: { firstName: true, lastName: true }
            },
            recos: {
              include: {
                priority: true,
                department: true
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });

    res.json(mission);
  } catch (error: any) {
    console.error('Error generating mission report:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
  }
};


export const generateMissionReport = async (req: Request, res: Response) => {
  try {
    const missionId = Number(req.params.id);
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Permission-based access check
    const accessFilter = getMissionAccessFilter(req.user);
    if (accessFilter) {
      const allowed = await prisma.auditMission.findFirst({
        where: { id: missionId, tenantId, AND: [accessFilter] },
        select: { id: true }
      });
      if (!allowed) return res.status(403).json({ error: 'Accès non autorisé à cette mission' });
    }

    // 1. récupérer données
    const mission = await getMissionReportData(missionId, tenantId);

    if (!mission) {
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    // 2. construire HTML
    const html = buildReportHTML(mission);

    // 3. générer PDF
    const pdfBuffer = await generatePDF(html);

    // 4. sauvegarder fichier (TON système existant)
    const metadata = await DocumentService.saveFileLocally(
      tenantId,
      pdfBuffer,
      `rapport-mission-${missionId}.pdf`,
      'application/pdf'
    );

    // 5. enregistrer en base
    const document = await prisma.document.create({
      data: {
        tenantId,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        sizeBytes: metadata.sizeBytes,
        storagePath: metadata.storagePath,
        fileHash: metadata.fileHash,
        isGenerated: true,
        missionId,
        uploadedById: userId,
      }
    });

    res.json(document);

  } catch (error) {
    console.error('PDF ERROR FULL:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Erreur génération rapport',
      details: message
    });
  }
};

// ==========================================
// ORDRE DE MISSION (PDF download)
// ==========================================
export const generateMissionOrder = async (req: Request, res: Response) => {
  try {
    const missionId = Number(req.params.id);
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Permission-based access check
    const accessFilter = getMissionAccessFilter(req.user);
    if (accessFilter) {
      const allowed = await prisma.auditMission.findFirst({
        where: { id: missionId, tenantId, AND: [accessFilter] },
        select: { id: true }
      });
      if (!allowed) return res.status(403).json({ error: 'Accès non autorisé à cette mission' });
    }

    const mission = await getMissionOrderData(missionId, tenantId);

    if (!mission) {
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    const html = buildMissionOrderHTML(mission);
    const pdfBuffer = await generatePDF(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ordre-mission-${missionId}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating mission order:', error);
    res.status(500).json({ error: "Erreur lors de la génération de l'ordre de mission" });
  }
};

// ==========================================
// AGGREGATED TICKETS (read-only)
// ==========================================
export const getMissionTickets = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const missionId = parseInt(req.params.id);

    // Permission-based access check
    const accessFilter = getMissionAccessFilter(req.user);
    if (accessFilter) {
      const allowed = await prisma.auditMission.findFirst({
        where: { id: missionId, tenantId, AND: [accessFilter] },
        select: { id: true }
      });
      if (!allowed) return res.status(403).json({ error: 'Accès non autorisé à cette mission' });
    }

    const links = await prisma.recommendationTicket.findMany({
      where: {
        tenantId,
        recommendation: {
          finding: { missionId }
        }
      },
      include: {
        ticket: {
          include: {
            requesterGlpiUser: { select: { id: true, fullName: true } },
            assigneeGlpiUser: { select: { id: true, fullName: true } }
          }
        },
        recommendation: {
          select: {
            id: true,
            title: true,
            finding: {
              select: { id: true, title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(links);
  } catch (error: any) {
    console.error('Error fetching mission tickets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des tickets' });
  }
};

