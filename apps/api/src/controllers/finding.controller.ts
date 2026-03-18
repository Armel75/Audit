import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getFindings = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const findings = await prisma.finding.findMany({
      where: { tenantId },
      include: {
        mission: { select: { title: true } },
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

    const finding = await prisma.$transaction(async (tx) => {
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
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { title, description, criteria, riskLevelId, residualRiskLevelId, process, cause, impact, managementResponse, severityScore } = req.body;

    const finding = await prisma.finding.updateMany({
      where: { id: Number(id), tenantId },
      data: {
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
      }
    });

    if (finding.count === 0) return res.status(404).json({ error: 'Constat introuvable' });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating finding:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du constat' });
  }
};

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

    await prisma.$transaction(async (tx) => {
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
