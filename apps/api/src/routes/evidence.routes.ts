import { Router } from 'express';
import multer from 'multer';
import * as evidenceController from '../controllers/evidence.controller';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';

const router = Router();

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  }
});

router.use(requireAuth);

router.get('/', requirePermission('evidence:read'), evidenceController.getEvidences);
router.post('/', requirePermission('evidence:create'), evidenceController.createEvidence);

// Upload file to evidence (specific route before generic /:id routes)
router.post(
  '/:id/upload',
  requirePermission('evidence:create'),
  (req, res, next) => {
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'files', maxCount: 20 }
    ])(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  evidenceController.uploadEvidenceFile
);

router.put('/:id', requireAnyPermission(['evidence:update', 'evidence:create']), evidenceController.updateEvidence);
router.delete('/:id', requireAnyPermission(['evidence:delete', 'evidence:create']), evidenceController.deleteEvidence);

export default router;
