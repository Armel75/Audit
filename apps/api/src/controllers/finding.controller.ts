import { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
const prisma = require('@audit/database').default;
import { findingWorkflow } from '../services/workflow/finding.workflow';
import { NotificationService, NOTIFICATION_TYPES } from '../services/notification.service';


// ✅ AJOUT — helper local (pas intrusif)
const canTransition = (current: string, next: string) => {
  return findingWorkflow[current]?.includes(next);
};

export const getFindings = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const findings = await prisma.finding.findMany({
      where: { tenantId },
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            members: {
              select: {
                user: { select: { firstName: true, lastName: true } },
                roleInMission: true,
              },
            },
          },
        },
        author: { select: { firstName: true, lastName: true } },
        validator: { select: { firstName: true, lastName: true } },
        riskLevel: true,
        residualRiskLevel: true,
        _count: { select: { recos: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(findings);
  } catch (error) {
    console.error('Error fetching findings:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des constats' });
  }
};

export const getFinding = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const finding = await prisma.finding.findFirst({
      where: { id: Number(id), tenantId },
      include: {
        mission: { select: { id: true, title: true } },
        author: { select: { id: true, firstName: true, lastName: true } },
        validator: { select: { id: true, firstName: true, lastName: true } },
        riskLevel: true,
        residualRiskLevel: true,
        recos: {
          include: {
            priority: true,
            department: true
          }
        },
        comments: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        },
        statusHistory: {
          include: { changedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { changedAt: 'desc' }
        },
        documents: true,
        evidences: true,
        approvals: {
          include: { approver: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!finding) return res.status(404).json({ error: 'Constat introuvable' });
    res.json(finding);
  } catch (error) {
    console.error('Error fetching finding:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du constat' });
  }
};

export const createFinding = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const authorId = req.user?.id;
    if (!tenantId || !authorId) return res.status(401).json({ error: 'Non autorisé' });

    const { title, description, criteria, riskLevelId, process, cause, impact, managementResponse, severityScore, missionId } = req.body;

    if (!title || !description || !missionId) {
      return res.status(400).json({ error: 'Titre, description et mission sont requis' });
    }

    const mission = await prisma.auditMission.findFirst({
      where: {
        id: Number(missionId),
        tenantId
      },
      include: { members: true }
    });

    if (!mission) {
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    if (mission.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        error: 'Impossible de créer un constat : mission non démarrée'
      });
    }
    
    const finding = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newFinding = await tx.finding.create({
        data: {
          tenantId,
          title,
          description,
          criteria,
          riskLevelId: riskLevelId ? Number(riskLevelId) : null,
          process,
          cause,
          impact,
          managementResponse,
          severityScore: severityScore ? Number(severityScore) : null,
          missionId: Number(missionId),
          authorId,
          status: 'DRAFT'
        }
      });

      await tx.findingStatusHistory.create({
        data: {
          tenantId,
          findingId: newFinding.id,
          newStatus: 'DRAFT',
          reason: 'Création initiale',
          changedById: authorId
        }
      });

      return newFinding;
    });

    // 🔔 Notification aux membres + leader de la mission
    try {
      await NotificationService.notifyMissionMembers(
        tenantId,
        { id: mission.id, leaderId: mission.leaderId, members: mission.members },
        NOTIFICATION_TYPES.FINDING_CREATED,
        'Nouveau constat',
        `Un constat "${title}" a été créé dans la mission "${mission.title}".`,
        authorId,
      );
    } catch (notifErr) {
      console.error('Erreur notification constat:', notifErr);
    }

    res.status(201).json(finding);
  } catch (error) {
    console.error('Error creating finding:', error);
    res.status(500).json({ error: 'Erreur lors de la création du constat' });
  }
};

export const updateFinding = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { title, description, criteria, riskLevelId, residualRiskLevelId, process, cause, impact, managementResponse, severityScore, modificationReason } = req.body;

    const existing = await prisma.finding.findFirst({
      where: { id: Number(id), tenantId },
      select: {
        id: true,
        title: true,
        description: true,
        criteria: true,
        riskLevelId: true,
        residualRiskLevelId: true,
        process: true,
        cause: true,
        impact: true,
        managementResponse: true,
        severityScore: true,
        status: true,
      }
    });

    if (!existing) return res.status(404).json({ error: 'Constat introuvable' });

    const reason = typeof modificationReason === 'string' ? modificationReason.trim() : '';
    if (reason.length < 10) {
      return res.status(400).json({ error: 'La raison de modification est obligatoire (minimum 10 caracteres)' });
    }

    const updatedData = {
      title,
      description,
      criteria,
      riskLevelId: riskLevelId ? Number(riskLevelId) : null,
      residualRiskLevelId: residualRiskLevelId ? Number(residualRiskLevelId) : null,
      process,
      cause,
      impact,
      managementResponse,
      severityScore: severityScore ? Number(severityScore) : null,
    };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.finding.update({
        where: { id: Number(id) },
        data: updatedData,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'FINDING_UPDATE_WITH_REASON',
          entityName: 'Finding',
          entityId: String(existing.id),
          oldValues: JSON.stringify({
            title: existing.title,
            description: existing.description,
            criteria: existing.criteria,
            riskLevelId: existing.riskLevelId,
            residualRiskLevelId: existing.residualRiskLevelId,
            process: existing.process,
            cause: existing.cause,
            impact: existing.impact,
            managementResponse: existing.managementResponse,
            severityScore: existing.severityScore,
            status: existing.status,
          }),
          newValues: JSON.stringify({
            ...updatedData,
            modificationReason: reason,
          }),
          userId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
        }
      });
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating finding:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du constat' });
  }
};

// export const updateFindingStatus = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const tenantId = req.user?.tenantId;
//     const userId = req.user?.id;
//     if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

//     const { status, reason } = req.body;
//     if (!status || !reason) return res.status(400).json({ error: 'Statut et raison requis' });

//     const existing = await prisma.finding.findFirst({ where: { id: Number(id), tenantId } });
//     if (!existing) return res.status(404).json({ error: 'Constat introuvable' });

//     await prisma.$transaction(async (tx) => {
//       await tx.finding.update({
//         where: { id: Number(id) },
//         data: { status }
//       });

//       await tx.findingStatusHistory.create({
//         data: {
//           tenantId,
//           findingId: Number(id),
//           previousStatus: existing.status,
//           newStatus: status,
//           reason,
//           changedById: userId
//         }
//       });
//     });

//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error updating finding status:', error);
//     res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
//   }
// };


export const updateFindingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { status, reason } = req.body;
    if (!status || !reason) return res.status(400).json({ error: 'Statut et raison requis' });

    const existing = await prisma.finding.findFirst({ where: { id: Number(id), tenantId } });
    if (!existing) return res.status(404).json({ error: 'Constat introuvable' });

    // 🔴 AJOUT — verrouillage du workflow
    if (!canTransition(existing.status, status)) {
      return res.status(400).json({
        error: `Transition interdite: ${existing.status} → ${status}`
      });
    }

    // 🔴 AJOUT — APPROVAL OBLIGATOIRE
    if (status === 'CONFIRMED') {
      const approval = await prisma.approval.findFirst({
        where: {
          findingId: Number(id),
          decision: 'APPROVED'
        }
      });

      if (!approval) {
        return res.status(400).json({
          error: 'Validation requise pour confirmer le constat'
        });
      }
    }
    
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.finding.update({
        where: { id: Number(id) },
        data: { status }
      });

      await tx.findingStatusHistory.create({
        data: {
          tenantId,
          findingId: Number(id),
          previousStatus: existing.status,
          newStatus: status,
          reason,
          changedById: userId
        }
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating finding status:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
};

export const addFindingComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authorId = req.user?.id;
    if (!authorId) return res.status(401).json({ error: 'Non autorisé' });

    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Contenu requis' });

    const comment = await prisma.findingComment.create({
      data: {
        findingId: Number(id),
        authorId,
        content
      },
      include: { author: { select: { firstName: true, lastName: true } } }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
  }
};
