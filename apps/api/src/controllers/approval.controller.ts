import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getApprovals = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { targetType, targetId } = req.query;

    const where: any = { tenantId };
    if (targetType) where.targetType = targetType as string;
    if (targetId) where.targetId = parseInt(targetId as string);

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

    const { targetType, targetId, status, comments } = req.body;

    const approval = await prisma.approval.create({
      data: {
        tenantId,
        targetType,
        targetId: parseInt(targetId),
        approverId: userId,
        status,
        comments
      },
      include: {
        approver: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(approval);
  } catch (error: any) {
    console.error('Error creating approval:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'approbation' });
  }
};
