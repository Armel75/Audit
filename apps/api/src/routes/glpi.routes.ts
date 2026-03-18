import { Router } from 'express';
import * as glpiController from '../controllers/glpi.controller';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// GLPI Users
router.get('/users', requirePermission('can_view_tasks'), glpiController.getGLPIUsers);
router.get('/users/:id', requirePermission('can_view_tasks'), glpiController.getGLPIUser);

// Tickets
router.get('/tickets', requirePermission('can_view_tasks'), glpiController.getTickets);
router.get('/tickets/:id', requirePermission('can_view_tasks'), glpiController.getTicket);

// Ticket Links
router.post('/tickets/link', requirePermission('can_manage_tasks'), glpiController.linkTicketToRecommendation);
router.delete('/tickets/link/:id', requirePermission('can_manage_tasks'), glpiController.unlinkTicketFromRecommendation);

export default router;
