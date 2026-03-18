import { Router } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/document.service';
import prisma from '@audit/database';
import { requireAuth } from '../middleware/auth.middleware';

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
    const tenantId = (req as any).user.tenantId;
    const userId = (req as any).user.id;
    
    // Extract optional relations from body
    const { missionId, findingId, recommendationId } = req.body;
    
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

router.get('/download/:id', async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Security check: ensure user has access to this document's tenant/mission
    // (Simplified for this example)

    const fileStream = DocumentService.getFileStream(document.storagePath);
    
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    
    fileStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
