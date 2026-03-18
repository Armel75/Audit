import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import * as recommendationController from '../controllers/recommendation.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('can_view_tasks'), recommendationController.getRecommendations);
router.get('/:id', requirePermission('can_view_tasks'), recommendationController.getRecommendation);
router.post('/', requirePermission('can_manage_tasks'), recommendationController.createRecommendation);
router.put('/:id', requirePermission('can_manage_tasks'), recommendationController.updateRecommendation);
router.patch('/:id/status', requirePermission('can_manage_tasks'), recommendationController.updateRecommendationStatus);
router.post('/:id/comments', requirePermission('can_view_tasks'), recommendationController.addRecommendationComment);
router.post('/:id/follow-ups', requirePermission('can_manage_tasks'), recommendationController.addRecommendationFollowUp);

export default router;
