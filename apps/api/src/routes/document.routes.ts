import { Router } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/document.service';
const prisma = require('@audit/database').default;
import { requireAuth } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';
import { STORAGE_PATH } from '../config/storage';

const router = Router();
router.use(requireAuth);

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif'
];

// Use memory storage for Multer so we can process the buffer in our Service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and images are allowed.'));
    }
  }
});


router.post(
  '/upload',
  requireAuth, // 🔥 IMPORTANT (manquait)
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const tenantId = (req as any).user?.tenantId;
      const userId = (req as any).user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Non autorisé' });
      }

      const { missionId, findingId, recommendationId, procedureId } = req.body;

      const links = [missionId, findingId, recommendationId, procedureId].filter(Boolean);

      if (links.length === 0) {
        return res.status(400).json({
          error: 'Le document doit être lié à au moins une entité'
        });
      }

      // 🔥 stockage centralisé propre
      const metadata = await DocumentService.saveFileLocally(
        tenantId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const document = await prisma.document.create({
        data: {
          tenantId,
          originalName: metadata.originalName,
          mimeType: metadata.mimeType,
          sizeBytes: metadata.sizeBytes,
          storagePath: metadata.storagePath,
          fileHash: metadata.fileHash,
          uploadedById: userId,
          missionId:        missionId        ? parseInt(missionId)        : null,
          findingId:        findingId        ? parseInt(findingId)        : null,
          recommendationId: recommendationId ? parseInt(recommendationId) : null,
          procedureId:      procedureId      ? parseInt(procedureId)      : null
        }
      });

      return res.json({
        message: 'File uploaded securely',
        document
      });

    } catch (error) {
      console.error('UPLOAD ERROR:', error);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }
);


router.get('/download/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const id = Number(req.params.id);

    const doc = await prisma.document.findFirst({
      where: { id, tenantId }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const normalizedPath = path
      .normalize(doc.storagePath)
      .replace(/^(\.\.(\/|\\|$))+/, '');

    const fullPath = path.join(STORAGE_PATH, normalizedPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${doc.originalName}"`
    );

    const stream = fs.createReadStream(fullPath);

    stream.pipe(res);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur téléchargement' });
  }
});


router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { missionId, findingId, recommendationId } = req.query;

    const documents = await prisma.document.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(missionId ? { missionId: Number(missionId) } : {}),
        ...(findingId ? { findingId: Number(findingId) } : {}),
        ...(recommendationId ? { recommendationId: Number(recommendationId) } : {})
      },
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const id = parseInt(req.params.id);

    const document = await prisma.document.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        mission: {
          select: { id: true, title: true }
        },
        finding: {
          select: { id: true, title: true }
        },
        recommendation: {
          select: { id: true, title: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document introuvable' });
    }

    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération du document' });
  }
});


router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const existing = await prisma.document.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document introuvable' });
    }

    if (existing.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    if (existing.deletedAt) {
      return res.status(404).json({ error: 'Document déjà supprimé' });
    }

    if (existing.storagePath) {
      const normalizedPath = path
        .normalize(existing.storagePath)
        .replace(/^(\.\.(\/|\\|$))+/, '');

      const fullPath = path.join(STORAGE_PATH, normalizedPath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return res.json({ success: true });

  } catch (error) {
    console.error('DELETE DOCUMENT ERROR:', error);
    return res.status(500).json({
      error: 'Erreur lors de la suppression du document'
    });
  }
});


export default router;
