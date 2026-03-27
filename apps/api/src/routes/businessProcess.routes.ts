
import { Router } from 'express';
import { BusinessProcessController } from '../controllers/businessProcess.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all mission routes
router.use(requireAuth);

router.get('/', BusinessProcessController.findAll); // ✅ AJOUT
router.get('/:id', BusinessProcessController.findById);
router.put('/:id', BusinessProcessController.update);
router.delete('/:id', BusinessProcessController.delete);

export default router;