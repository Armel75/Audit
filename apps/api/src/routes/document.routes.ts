import { Router } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/document.service';
import prisma from '@audit/database';
import { requireAuth } from '../middleware/auth.middleware';
import fs from 'fs';

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

router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Extract user info from JWT
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Extract optional relations from body
    const { missionId, findingId, recommendationId } = req.body;

    // 🔒 Validation métier (ajoutée)
    const links = [missionId, findingId, recommendationId].filter(Boolean);

    if (links.length === 0) {
      return res.status(400).json({ error: 'Le document doit être lié à au moins une entité' });
    }
    
    const metadata = await DocumentService.saveFileLocally(
      tenantId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    
    // Save metadata to Prisma
    const document = await prisma.document.create({
      data: {
        tenantId,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        sizeBytes: metadata.sizeBytes,
        storagePath: metadata.storagePath,
        fileHash: metadata.fileHash,
        uploadedById: userId,
        missionId: missionId ? parseInt(missionId) : null,
        findingId: findingId ? parseInt(findingId) : null,
        recommendationId: recommendationId ? parseInt(recommendationId) : null,
      }
    });
    
    res.json({ message: 'File uploaded securely', document });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});


// router.get('/download/:id', async (req, res) => {
//   try {
//     const tenantId = (req as any).user?.tenantId;
//     if (!tenantId) {
//       return res.status(401).json({ error: 'Non autorisé' });
//     }

//     const document = await prisma.document.findFirst({
//       where: {
//         id: parseInt(req.params.id),
//         tenantId,
//         deletedAt: null
//       }
//     });

//     if (!document) {
//       return res.status(404).json({ error: 'Document not found' });
//     }

//     // 🔥 DEBUG (à garder temporairement)
//     console.log('PATH:', document.storagePath);
//     console.log('EXISTS:', fs.existsSync(document.storagePath));

//     if (!fs.existsSync(document.storagePath)) {
//       return res.status(404).json({ error: 'File not found on disk' });
//     }

//     res.setHeader('Content-Type', document.mimeType);
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename="${document.originalName}"`
//     );

//     // const stream = fs.createReadStream(document.storagePath);

//     // // 🔥 CRITIQUE
//     // stream.on('error', (err) => {
//     //   console.error('STREAM ERROR:', err);
//     //   res.destroy(err);
//     // });

//     // stream.pipe(res);

//     const stream = fs.createReadStream(document.storagePath);

//     // gestion erreur
//     stream.on('error', (err) => {
//       console.error('STREAM ERROR:', err);
//       res.destroy(err);
//     });

//     // 🔥 IMPORTANT : fin propre
//     stream.on('end', () => {
//       res.end();
//     });

//     stream.pipe(res);

//   } catch (error) {
//     console.error('DOWNLOAD ERROR:', error);
//     res.status(500).json({ error: 'Download failed' });
//   }
// });

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

    if (!fs.existsSync(doc.storagePath)) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    // 🔥 IMPORTANT
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${doc.originalName}"`
    );

    const stream = fs.createReadStream(doc.storagePath);

    stream.on('error', (err) => {
      console.error('STREAM ERROR:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    // 🔥 CRUCIAL
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

router.delete('/:id', async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const id = parseInt(req.params.id);

    // Vérifier que le document existe et appartient au tenant
    const existing = await prisma.document.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document introuvable' });
    }

    // Soft delete sécurisé (tenant inclus)
    await prisma.document.updateMany({
      where: {
        id,
        tenantId
      },
      data: {
        deletedAt: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la suppression du document' });
  }
});

export default router;
