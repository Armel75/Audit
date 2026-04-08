import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApprovalType } from '../types/approval';
import { evaluateMissionReadiness } from './mission.controller';

const prisma = new PrismaClient();

export const getApprovals = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const where: any = { tenantId };

    if (req.query.planId) where.planId = parseInt(req.query.planId as string);
    if (req.query.missionId) where.missionId = parseInt(req.query.missionId as string);
    if (req.query.findingId) where.findingId = parseInt(req.query.findingId as string);
    if (req.query.recommendationId) where.recommendationId = parseInt(req.query.recommendationId as string);

    const approvals = await prisma.approval.findMany({
      where,
      include: {
        approver:    { select: { id: true, firstName: true, lastName: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        mission:     { select: { id: true, title: true, status: true } },
        auditProgram: {
          select: {
            id: true, title: true, code: true, status: true,
            mission: { select: { id: true, title: true } }
          }
        },
        finding:        { select: { id: true, title: true, status: true } },
        recommendation: { select: { id: true, title: true, status: true } },
        plan:           { select: { id: true, year: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(approvals);
  } catch (error: any) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des approbations' });
  }
};

export const createApproval = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    //const { approvalType, level, comments, planId, missionId, findingId, recommendationId } = req.body;
    const { approvalType, level, comments, planId, missionId, findingId, recommendationId, auditProgramId } =
      req.body as {
        approvalType: ApprovalType;
        level: number;
        comments?: string;
        planId?: number;
        missionId?: number;
        findingId?: number;
        recommendationId?: number;
        auditProgramId?: number;
      };

      const allowedTypes: ApprovalType[] = [
        'PLAN_APPROVAL',
        'MISSION_APPROVAL',
        'FINDING_APPROVAL',
        'RECOMMENDATION_APPROVAL',
        'PROGRAM_APPROVAL' // 🔥 AJOUT
      ];

      if (!allowedTypes.includes(approvalType)) {
        return res.status(400).json({ error: 'approvalType invalide' });
      }
      
      // 🔥 ICI (TA NOUVELLE LOGIQUE)

      // 🔒 Empêcher double approval pour mission déjà validée
      if (missionId) {
        const existingApproved = await prisma.approval.findFirst({
          where: {
            missionId,
            decision: 'APPROVED'
          }
        });

        if (existingApproved) {
          return res.status(400).json({
            error: 'Mission déjà approuvée'
          });
        }
      }

    // 🔒 Empêcher doublon
    if (findingId) {
      const existing = await prisma.approval.findFirst({
        where: {
          findingId,
          decision: {
            in: ['PENDING', 'APPROVED']
          }
        }
      });

      if (existing) {
        return res.status(400).json({
          error: 'Une approbation est déjà en attente pour ce constat'
        });
      }
    }

    // 🔒 Empêcher double approval pour programme
    if (auditProgramId) {
      const existing = await prisma.approval.findFirst({
        where: {
          auditProgramId,
          decision: 'PENDING'
        }
      });

      if (existing) {
        return res.status(400).json({
          error: 'Une approbation est déjà en attente pour ce programme'
        });
      }
    }

    // Résoudre la version du programme si applicable
    let auditProgramVersionId: number | undefined = undefined;
    if (auditProgramId) {
      const latestVersion = await prisma.auditProgramVersion.findFirst({
        where: { programId: auditProgramId },
        orderBy: { versionNumber: 'desc' }
      });
      if (latestVersion) {
        auditProgramVersionId = latestVersion.id;
      }
    }

    const approvalData = {
      tenantId,
      approvalType,
      level,
      comments,
      requestedById: userId,
      decision: 'PENDING',
      planId,
      missionId,
      findingId,
      recommendationId,
      auditProgramId,
      auditProgramVersionId
    };

    // auditProgramVersionId est Int? dans le schéma (nullable) — cast transitoire
    // jusqu'à la prochaine exécution de prisma generate.
    const approval = await prisma.approval.create({
      data: approvalData as any
    });

    res.status(201).json(approval);
  } catch (error: any) {
    console.error('Error creating approval:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'approbation' });
  }
};


export const decideApproval = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { decision, comments } = req.body;

    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const approval = await prisma.approval.findUnique({
      where: { id: parseInt(id) }
    });

    if (!approval || approval.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Approval introuvable' });
    }

    if (approval.decision !== 'PENDING') {
      return res.status(400).json({ error: 'Approval déjà traité' });
    }

    // 🔒 TRANSACTION CRITIQUE
    const result = await prisma.$transaction(async (tx) => {
      const updatedApproval = await tx.approval.update({
        where: { id: approval.id },
        data: {
          decision,
          comments,
          approverId: userId,
          decidedAt: new Date()
        }
      });

      // 🔥 LOGIQUE MÉTIER
      if (decision === 'APPROVED') {

        // 👉 FINDING
        if (approval.findingId) {
          await tx.finding.update({
            where: { id: approval.findingId },
            data: {
              status: 'VALIDATED',
              validatorId: userId
            }
          });
        }

        if (decision === 'REJECTED') {
            if (approval.recommendationId) {
              await tx.recommendation.update({
                where: { id: approval.recommendationId },
                data: {
                  status: 'REJECTED'
                }
              });
            }
        }

        // 👉 RECOMMENDATION
        if (approval.recommendationId) {
          await tx.recommendation.update({
            where: { id: approval.recommendationId },
            data: {
              status: 'VALIDATED',
              validatedById: userId,
              validatedAt: new Date()
            }
          });
        }

        // 👉 PLAN (optionnel)
        if (approval.planId) {
          await tx.auditPlan.update({
            where: { id: approval.planId },
            data: {
              status: 'APPROVED',
              approvedById: userId,
              approvedAt: new Date()
            }
          });
        }

        // 👉 AUDIT PROGRAM
        if (approval.auditProgramId) {
          await tx.auditProgram.update({
            where: { id: approval.auditProgramId },
            data: {
              status: 'APPROVED'
            }
          });

          // 🔥 CLEANUP des approvals en attente
          await tx.approval.updateMany({
            where: {
              auditProgramId: approval.auditProgramId,
              decision: 'PENDING'
            },
            data: {
              decision: 'CANCELLED'
            }
          });

          // 🔥 récupérer missionId correctement
          const fullProgram = await tx.auditProgram.findUnique({
            where: { id: approval.auditProgramId },
            select: { missionId: true }
          });

          if (fullProgram?.missionId) {
            await evaluateMissionReadiness(tx, fullProgram.missionId);
          }
        }

        // 👉 MISSION
        if (approval.missionId) {
          await tx.auditMission.update({
            where: { id: approval.missionId },
            data: {
              status: 'APPROVED'
            }
          });
        }
      }

      return updatedApproval;
    });

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur décision approval' });
  }
};