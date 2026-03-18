import { Request, Response } from 'express';
import prisma from '@audit/database';

// ==========================================
// AUDIT MISSION
// ==========================================

export const getMissions = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const missions = await prisma.auditMission.findMany({
      where: { tenantId },
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
      orderBy: { createdAt: 'desc' }
    });

    res.json(missions);
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
        programs: {
          select: {
            id: true,
            title: true,
            status: true,
            _count: {
              select: { procedures: true }
            }
          },
          orderBy: { createdAt: 'desc' }
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

    if (!title || !description || !planId || !leaderId) {
      return res.status(400).json({ error: 'Titre, description, plan et chef de mission sont requis' });
    }

    // Verify plan exists
    const plan = await prisma.auditPlan.findFirst({
      where: { id: parseInt(planId), tenantId }
    });
    if (!plan) return res.status(404).json({ error: 'Plan d\'audit non trouvé' });

    // Verify leader exists
    const leader = await prisma.user.findFirst({
      where: { id: parseInt(leaderId), tenantId }
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
          planId: parseInt(planId),
          auditTypeId: auditTypeId ? parseInt(auditTypeId) : null,
          leaderId: parseInt(leaderId)
        }
      });

      // Create initial status history
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

    // Valid transitions
    const validTransitions: Record<string, string[]> = {
      'PLANNED': ['IN_PROGRESS', 'CLOSED'],
      'IN_PROGRESS': ['IN_REVIEW', 'PLANNED'],
      'IN_REVIEW': ['VALIDATED', 'IN_PROGRESS'],
      'VALIDATED': ['CLOSED', 'IN_REVIEW'],
      'CLOSED': ['PLANNED'] // Reopen
    };

    if (!validTransitions[mission.status]?.includes(status)) {
      return res.status(400).json({ error: `Transition de statut invalide de ${mission.status} vers ${status}` });
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
