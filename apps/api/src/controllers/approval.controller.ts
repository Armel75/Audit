import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getApprovals = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    // const { targetType, targetId } = req.query;

    // const where: any = { tenantId };
    // if (targetType) where.targetType = targetType as string;
    // if (targetId) where.targetId = parseInt(targetId as string);
    const where: any = { tenantId };

    if (req.query.planId) where.planId = parseInt(req.query.planId as string);
    if (req.query.missionId) where.missionId = parseInt(req.query.missionId as string);
    if (req.query.findingId) where.findingId = parseInt(req.query.findingId as string);
    if (req.query.recommendationId) where.recommendationId = parseInt(req.query.recommendationId as string);

    const approvals = await prisma.approval.findMany({
      where,
      include: {
        approver: { select: { id: true, firstName: true, lastName: true } }
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

    const { approvalType, level, comments, planId, missionId, findingId, recommendationId } = req.body;

    const approval = await prisma.approval.create({
      data: {
        tenantId,
        approvalType,
        level,
        comments,
        requestedById: userId,
        decision: 'PENDING',
        planId,
        missionId,
        findingId,
        recommendationId
      }
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
    const { id } = req.params;
    const { decision, comments } = req.body;

    const approval = await prisma.approval.update({
      where: { id: parseInt(id) },
      data: {
        decision,
        comments,
        approverId: userId,
        decidedAt: new Date()
      }
    });

    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: 'Erreur décision approval' });
  }
};