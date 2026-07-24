import { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
const prisma = require('@audit/database').default;
import { getRecommendationsByMission } from '../services/recommendation.service';
import { recommendationWorkflow } from '../services/workflow/recommendation.workflow';
import { NotificationService, NOTIFICATION_TYPES } from '../services/notification.service';

// ✅ AJOUT helper local
const canTransition = (current: string, next: string) => {
  return recommendationWorkflow[current]?.includes(next);
};

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const recommendations = await prisma.recommendation.findMany({
      where: { tenantId },
      include: {
        finding: {
          select: {
            title: true,
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
          },
        },
        priority: true,
        department: true,
        assigneeUser: { select: { firstName: true, lastName: true } },
        _count: { select: { comments: true, followUps: true, ticketLinks: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des recommandations' });
  }
};

export const getRecommendation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const recommendation = await prisma.recommendation.findFirst({
      where: { id: Number(id), tenantId },
      include: {
        finding: {
          select: {
            id: true,
            title: true,
            description: true,
            process: true,
            impact: true,
            missionId: true,
            mission: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        priority: true,
        department: true,
        assigneeUser: { select: { id: true, firstName: true, lastName: true } },
        assigneeGlpiUser: { select: { id: true, fullName: true, email: true } },
        validatedBy: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        },
        statusHistory: {
          include: { changedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { changedAt: 'desc' }
        },
        followUps: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        },
        ticketLinks: {
          include: { ticket: true }
        },
        documents: true,
        evidences: true,
        approvals: {
          include: { approver: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!recommendation) return res.status(404).json({ error: 'Recommandation introuvable' });
    res.json(recommendation);
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la recommandation' });
  }
};

export const createRecommendation = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const authorId = req.user?.id;
    if (!tenantId || !authorId) return res.status(401).json({ error: 'Non autorisé' });

    const {
      title,
      actionPlan,
      targetDate,
      priorityId,
      departmentId,
      assigneeName,
      assigneeUserId,
      assigneeGlpiUserId,
      findingId
    } = req.body;

    if (!title || !findingId) {
      return res.status(400).json({ error: 'Titre et constat sont requis' });
    }

    // Récupérer le constat et sa mission pour la notification
    const finding = await prisma.finding.findUnique({
      where: { id: Number(findingId) },
      include: {
        mission: {
          include: { members: true }
        }
      }
    });

    const recommendation = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newReco = await tx.recommendation.create({
        data: {
          tenantId,
          title,
          actionPlan,
          ...(targetDate && { targetDate: new Date(targetDate) }),
          priorityId: priorityId ? Number(priorityId) : null,
          departmentId: departmentId ? Number(departmentId) : null,
          assigneeName: assigneeName || null,
          assigneeUserId: assigneeUserId ? Number(assigneeUserId) : null,
          assigneeGlpiUserId: assigneeGlpiUserId ? Number(assigneeGlpiUserId) : null,
          findingId: Number(findingId),
          status: 'DRAFT'
        }
      });

      await tx.recommendationStatusHistory.create({
        data: {
          tenantId,
          recommendationId: newReco.id,
          newStatus: 'DRAFT',
          reason: 'Création initiale',
          changedById: authorId
        }
      });

      return newReco;
    });

    // 🔔 Notification aux membres + leader de la mission
    if (finding?.mission) {
      try {
        await NotificationService.notifyMissionMembers(
          tenantId,
          { id: finding.mission.id, leaderId: finding.mission.leaderId, members: finding.mission.members },
          NOTIFICATION_TYPES.RECOMMENDATION_CREATED,
          'Nouvelle recommandation',
          `Une recommandation "${title}" a été créée dans la mission "${finding.mission.title}".`,
          authorId,
        );
      } catch (notifErr) {
        console.error('Erreur notification recommandation:', notifErr);
      }
    }

    res.status(201).json(recommendation);
  } catch (error) {
    console.error('Error creating recommendation:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la recommandation' });
  }
};

export const updateRecommendation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const {
      title,
      actionPlan,
      targetDate,
      revisedTargetDate,
      priorityId,
      departmentId,
      assigneeName,
      assigneeUserId,
      assigneeGlpiUserId,
      implementedPercent
    } = req.body;

    // 🔴 AJOUT — récupération + verrouillage
    const existing = await prisma.recommendation.findFirst({
      where: { id: Number(id), tenantId }
    });

    if (!existing) return res.status(404).json({ error: 'Recommandation introuvable' });

    if (
      existing.status === 'VALIDATED' ||
      existing.status === 'CLOSED' ||
      existing.status === 'REJECTED'
    ) {
      return res.status(400).json({
        error: 'Modification interdite après validation ou rejet'
      });
    }

    const recommendation = await prisma.recommendation.updateMany({
      where: { id: Number(id), tenantId },
      data: {
        title,
        actionPlan,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        revisedTargetDate: revisedTargetDate ? new Date(revisedTargetDate) : null,
        priorityId: priorityId ? Number(priorityId) : null,
        departmentId: departmentId ? Number(departmentId) : null,
        assigneeName: assigneeName || null,
        assigneeUserId: assigneeUserId ? Number(assigneeUserId) : null,
        assigneeGlpiUserId: assigneeGlpiUserId ? Number(assigneeGlpiUserId) : null,
        implementedPercent: implementedPercent ? Number(implementedPercent) : undefined,
      }
    });

    if (recommendation.count === 0) return res.status(404).json({ error: 'Recommandation introuvable' });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating recommendation:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la recommandation' });
  }
};

export const updateRecommendationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { status, reason } = req.body;
    if (!status || !reason) return res.status(400).json({ error: 'Statut et raison requis' });

    const existing = await prisma.recommendation.findFirst({ where: { id: Number(id), tenantId } });
    if (!existing) return res.status(404).json({ error: 'Recommandation introuvable' });

    // 🔴 AJOUT — verrouillage workflow
    if (!canTransition(existing.status, status)) {
      return res.status(400).json({
        error: `Transition interdite: ${existing.status} → ${status}`
      });
    }

    // 🔴 AJOUT — APPROVAL OBLIGATOIRE
    if (status === 'VALIDATED') {
      const approval = await prisma.approval.findFirst({
        where: {
          recommendationId: Number(id),
          decision: 'APPROVED'
        }
      });

      if (!approval) {
        return res.status(400).json({
          error: 'Validation requise pour valider la recommandation'
        });
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.recommendation.update({
        where: { id: Number(id) },
        data: {
          status,
          closedAt: status === 'CLOSED' ? new Date() : null,
          validatedAt: status === 'VALIDATED' ? new Date() : null,
          validatedById: status === 'VALIDATED' ? userId : null
        }
      });

      await tx.recommendationStatusHistory.create({
        data: {
          tenantId,
          recommendationId: Number(id),
          previousStatus: existing.status,
          newStatus: status,
          reason,
          changedById: userId
        }
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating recommendation status:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
};


export const addRecommendationComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authorId = req.user?.id;
    if (!authorId) return res.status(401).json({ error: 'Non autorisé' });

    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Contenu requis' });

    const comment = await prisma.recommendationComment.create({
      data: {
        recommendationId: Number(id),
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

export const addRecommendationFollowUp = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const authorId = req.user?.id;
    if (!tenantId || !authorId) return res.status(401).json({ error: 'Non autorisé' });

    const { statusSnapshot, progressPercent, comment, evidenceSummary, nextAction, nextDueDate } = req.body;

    const existing = await prisma.recommendation.findFirst({ where: { id: Number(id), tenantId } });
    if (!existing) return res.status(404).json({ error: 'Recommandation introuvable' });

    const followUp = await prisma.recommendationFollowUp.create({
      data: {
        tenantId,
        recommendationId: Number(id),
        statusSnapshot: statusSnapshot || existing.status,
        progressPercent: progressPercent !== undefined ? Number(progressPercent) : undefined,
        comment,
        evidenceSummary,
        nextAction,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        authorId
      },
      include: { author: { select: { firstName: true, lastName: true } } }
    });

    // Update the recommendation's implemented percent if provided
    if (progressPercent !== undefined) {
      await prisma.recommendation.update({
        where: { id: Number(id) },
        data: { implementedPercent: Number(progressPercent) }
      });
    }

    res.status(201).json(followUp);
  } catch (error) {
    console.error('Error adding follow-up:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du suivi' });
  }
};

export const getMissionRecommendations = async (req: Request, res: Response) => {
  try {
    const missionId = Number(req.params.missionId);

    if (!missionId) {
      return res.status(400).json({ error: 'missionId invalide' });
    }

    const recos = await getRecommendationsByMission(missionId);

    res.json(recos);
  } catch (error) {
    console.error('getMissionRecommendations error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

