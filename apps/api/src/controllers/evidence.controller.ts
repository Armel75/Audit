import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { DocumentService } from '../services/document.service';

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
        evidenceDocuments: {
          include: { document: true },
          orderBy: { createdAt: 'desc' }
        },
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
        evidenceDocuments: {
          include: { document: true },
          orderBy: { createdAt: 'desc' }
        },
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
        evidenceDocuments: {
          include: { document: true },
          orderBy: { createdAt: 'desc' }
        },
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

export const uploadEvidenceFile = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.id;
    const { id: evidenceId } = req.params;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const files: Express.Multer.File[] = [];
    if ((req as any).file) {
      files.push((req as any).file);
    }

    const reqFiles: any = (req as any).files;
    if (Array.isArray(reqFiles)) {
      files.push(...reqFiles);
    } else if (reqFiles && typeof reqFiles === 'object') {
      if (Array.isArray(reqFiles.file)) files.push(...reqFiles.file);
      if (Array.isArray(reqFiles.files)) files.push(...reqFiles.files);
    }

    if (files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Verify evidence exists and belongs to tenant
    const evidence = await prisma.evidence.findFirst({
      where: { id: parseInt(evidenceId), tenantId }
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Preuve non trouvée' });
    }

    const createdDocuments = [] as Array<{ id: number }>;

    for (const file of files) {
      const metadata = await DocumentService.saveFileLocally(
        tenantId,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      const document = await prisma.document.create({
        data: {
          tenantId,
          originalName: metadata.originalName,
          mimeType: metadata.mimeType,
          sizeBytes: metadata.sizeBytes,
          storagePath: metadata.storagePath,
          fileHash: metadata.fileHash,
          uploadedById: userId
        }
      });

      createdDocuments.push({ id: document.id });
    }

    // EvidenceDocument — raw inserts (client not yet regenerated after schema addition)
    for (const doc of createdDocuments) {
      await prisma.$executeRaw`
        IF NOT EXISTS (
          SELECT 1 FROM [dbo].[EvidenceDocument]
          WHERE [evidenceId] = ${parseInt(evidenceId)} AND [documentId] = ${doc.id}
        )
        INSERT INTO [dbo].[EvidenceDocument] ([tenantId],[evidenceId],[documentId],[createdAt])
        VALUES (${tenantId}, ${parseInt(evidenceId)}, ${doc.id}, GETDATE())
      `;
    }

    const legacyDocumentData = !evidence.documentId && createdDocuments.length > 0
      ? { documentId: createdDocuments[0].id }
      : {};

    const updatedEvidence = await prisma.evidence.update({
      where: { id: parseInt(evidenceId) },
      data: legacyDocumentData,
      include: {
        document: true,
        collectedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    // Fetch linked documents via raw query (evidenceDocuments relation not in current client)
    const linkedDocs: any[] = await prisma.$queryRaw`
      SELECT ed.id, ed.createdAt, d.id AS documentId, d.originalName, d.mimeType, d.sizeBytes, d.storagePath
      FROM [dbo].[EvidenceDocument] ed
      INNER JOIN [dbo].[Document] d ON d.id = ed.documentId
      WHERE ed.evidenceId = ${parseInt(evidenceId)}
      ORDER BY ed.createdAt DESC
    `;

    const evidenceWithDocs = {
      ...updatedEvidence,
      evidenceDocuments: linkedDocs.map((row: any) => ({
        id: row.id,
        createdAt: row.createdAt,
        document: {
          id: row.documentId,
          originalName: row.originalName,
          mimeType: row.mimeType,
          sizeBytes: row.sizeBytes,
          storagePath: row.storagePath,
        }
      }))
    };

    res.json({
      message: 'Fichier(s) attaché(s) à la preuve avec succès',
      uploadedCount: createdDocuments.length,
      evidence: evidenceWithDocs
    });
  } catch (error: any) {
    console.error('Error uploading evidence file:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'upload du fichier' });
  }
};

