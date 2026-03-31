import { Request, Response } from 'express';
import prisma from '@audit/database';
import { missionWorkflow } from '../services/workflow/mission.workflow';
import {
  getMissionReportData,
  buildReportHTML,
  generatePDF
} from '../services/report.service';
import { isMissionReady, validateMissionStart } from '../services/mission.service';

import { DocumentService } from '../services/document.service';
// ==========================================
// AUDIT MISSION
// ==========================================

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

    // ✅ NOUVEAU : paramètre de filtre
    const type = req.query.type as string; // 'active' | 'archive'

    // ✅ NOUVEAU : construction dynamique du where
    const where: any = { tenantId };

    if (type === 'active') {
      where.status = { not: 'CLOSED' };
    }

    if (type === 'archive') {
      where.status = 'CLOSED';
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

    const mission = await prisma.auditMission.findFirst({
      where: { id: parseInt(id), tenantId },
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
            }
          },
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
  const hasScopes = mission.scopes.length > 0;
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

    if (!title || !description || !parsedPlanId || !parsedLeaderId) {
      return res.status(400).json({ error: 'Titre, description, plan et chef de mission sont requis' });
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

    const mission = await prisma.$transaction(async (tx) => {
      const newMission = await tx.auditMission.create({
        data: {
          tenantId,
          title,
          description,
          objective,
          scopeDescription,
          methodology,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
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
              auditableEntityId: id
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

    const existing = await prisma.auditMission.findFirst({
      where: { id: parseInt(id), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Mission non trouvée' });

    const updated = await prisma.auditMission.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        objective,
        scopeDescription,
        methodology,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
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
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) return res.status(400).json({ error: 'Le nouveau statut est requis' });

    const mission = await prisma.auditMission.findFirst({
      where: { id: parseInt(id), tenantId }
    });

    if (!mission) return res.status(404).json({ error: 'Mission non trouvée' });

    // 🔒 WORKFLOW UNIQUE (corrigé)
    if (!missionWorkflow[mission.status]?.includes(status)) {
      return res.status(400).json({
        error: `Transition interdite : ${mission.status} → ${status}`
      });
    }

    // 🔴 NOUVEAU — Vérification READY / IN_PROGRESS (sans casser)
    if (status === 'READY' || status === 'IN_PROGRESS') {
      const fullMission = await prisma.auditMission.findUnique({
        where: { id: parseInt(id) },
        include: {
          scopes: true,
          members: true,
          programs: {
            include: { procedures: true }
          }
        }
      });

      if (!isMissionReady(fullMission)) {
        return res.status(400).json({
          error: 'Mission non prête : cadrage incomplet'
        });
      }

      // 🔴 BONUS TOP 1% — uniquement pour IN_PROGRESS
      if (status === 'IN_PROGRESS') {
        try {
          validateMissionStart(fullMission);
        } catch (err: any) {
          return res.status(400).json({ error: err.message });
        }
      }
    }

    // 🔴 EXISTANT CONSERVÉ
    if (status === 'CLOSED') {
      const pendingRecos = await prisma.recommendation.count({
        where: {
          finding: { missionId: parseInt(id) },
          status: { not: 'VALIDATED' }
        }
      });

      if (pendingRecos > 0) {
        return res.status(400).json({
          error: 'Impossible de clôturer : recommandations non validées'
        });
      }
    }

    // 🔴 EXISTANT CONSERVÉ (corrigé statuts)
    if (status === 'APPROVED' || status === 'CLOSED') {
      const approval = await prisma.approval.findFirst({
        where: {
          missionId: parseInt(id),
          decision: 'APPROVED'
        }
      });

      if (!approval) {
        return res.status(400).json({
          error: 'Une approbation valide est requise'
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedMission = await tx.auditMission.update({
        where: { id: parseInt(id) },
        data: { status }
      });

      await tx.missionStatusHistory.create({
        data: {
          tenantId,
          missionId: parseInt(id),
          previousStatus: mission.status,
          newStatus: status,
          reason: reason || 'Changement de statut',
          changedById: userId
        }
      });

      return updatedMission;
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating mission status:', error);
    res.status(500).json({ error: 'Erreur lors du changement de statut' });
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
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params; // missionId
    const { auditableEntityId, scopeRole, notes } = req.body;

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

    // Check if already exists
    const existing = await prisma.auditMissionScope.findFirst({
      where: {
        missionId: parseInt(id),
        auditableEntityId: parseInt(auditableEntityId),
        tenantId
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
        notes
      }
    });

    await evaluateMissionReadiness(prisma, parseInt(id));
    
    res.status(201).json(scope);
  } catch (error: any) {
    console.error('Error adding mission scope:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout au périmètre' });
  }
};

export const removeMissionScope = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { scopeId } = req.params;

    const existing = await prisma.auditMissionScope.findFirst({
      where: { id: parseInt(scopeId), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Périmètre non trouvé' });

    await prisma.auditMissionScope.delete({
      where: { id: parseInt(scopeId) }
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

    const mission = await prisma.auditMission.findFirst({
      where: { id: parseInt(id), tenantId },
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

