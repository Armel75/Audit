import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getEvidences = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { missionId, findingId, recommendationId } = req.query;

    const where: any = { tenantId };
    if (missionId) where.missionId = parseInt(missionId as string);
    if (findingId) where.findingId = parseInt(findingId as string);
    if (recommendationId) where.recommendationId = parseInt(recommendationId as string);

    const evidences = await prisma.evidence.findMany({
      where,
      include: {
        document: true,
        collectedBy: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(evidences);
  } catch (error: any) {
    console.error('Error fetching evidences:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des preuves' });
  }
};

export const createEvidence = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { title, description, evidenceType, source, collectionDate, chainOfCustodyNote, isSensitive, documentId, missionId, findingId, recommendationId } = req.body;

    const evidence = await prisma.evidence.create({
      data: {
        tenantId,
        title,
        description,
        evidenceType,
        source,
        collectionDate: collectionDate ? new Date(collectionDate) : null,
        chainOfCustodyNote,
        isSensitive: isSensitive || false,
        documentId: documentId ? parseInt(documentId) : null,
        missionId: missionId ? parseInt(missionId) : null,
        findingId: findingId ? parseInt(findingId) : null,
        recommendationId: recommendationId ? parseInt(recommendationId) : null,
        collectedById: userId
      },
      include: {
        document: true,
        collectedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(evidence);
  } catch (error: any) {
    console.error('Error creating evidence:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la preuve' });
  }
};

export const updateEvidence = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { title, description, evidenceType, source, collectionDate, chainOfCustodyNote, isSensitive } = req.body;

    const evidence = await prisma.evidence.updateMany({
      where: { id: parseInt(id), tenantId },
      data: {
        title,
        description,
        evidenceType,
        source,
        collectionDate: collectionDate ? new Date(collectionDate) : null,
        chainOfCustodyNote,
        isSensitive
      }
    });

    if (evidence.count === 0) {
      return res.status(404).json({ error: 'Preuve non trouvée' });
    }

    const updatedEvidence = await prisma.evidence.findUnique({
      where: { id: parseInt(id) },
      include: {
        document: true,
        collectedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json(updatedEvidence);
  } catch (error: any) {
    console.error('Error updating evidence:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la preuve' });
  }
};

export const deleteEvidence = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const evidence = await prisma.evidence.deleteMany({
      where: { id: parseInt(id), tenantId }
    });

    if (evidence.count === 0) {
      return res.status(404).json({ error: 'Preuve non trouvée' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la preuve' });
  }
};
