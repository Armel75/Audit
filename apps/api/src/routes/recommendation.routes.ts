import { Router } from 'express';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/auth.middleware';
import * as recommendationController from '../controllers/recommendation.controller';
import { getMissionRecommendations } from '../controllers/recommendation.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('recommendation:read'), recommendationController.getRecommendations);

// ✅ IMPORTANT : avant /:id
router.get('/mission/:missionId', requirePermission('recommendation:read'), getMissionRecommendations);

router.get('/:id', requirePermission('recommendation:read'), recommendationController.getRecommendation);

router.post('/', requirePermission('recommendation:create'), recommendationController.createRecommendation);
router.put('/:id', requirePermission('recommendation:update'), recommendationController.updateRecommendation);
router.patch('/:id/status', requireAnyPermission(['recommendation:update', 'recommendation:validate']), recommendationController.updateRecommendationStatus);
router.post('/:id/comments', requireAnyPermission(['recommendation:comment', 'recommendation:update']), recommendationController.addRecommendationComment);
router.post('/:id/follow-ups', requireAnyPermission(['recommendation:follow_up', 'recommendation:update']), recommendationController.addRecommendationFollowUp);

export default router;
