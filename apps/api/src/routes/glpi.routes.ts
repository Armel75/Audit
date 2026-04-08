import { Router } from 'express';
import * as glpiController from '../controllers/glpi.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// GLPI Users
router.get('/users', requirePermission('glpi:read'), glpiController.getGLPIUsers);
router.get('/users/:id', requirePermission('glpi:read'), glpiController.getGLPIUser);

// Tickets
router.get('/tickets', requirePermission('glpi:read'), glpiController.getTickets);
router.get('/tickets/:id', requirePermission('glpi:read'), glpiController.getTicket);

// Ticket Links
router.post('/tickets/link', requirePermission('glpi:manage'), glpiController.linkTicketToRecommendation);
router.delete('/tickets/link/:id', requirePermission('glpi:manage'), glpiController.unlinkTicketFromRecommendation);

export default router;
