import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as recommendationController from '../controllers/recommendation.controller';
import { getMissionRecommendations } from '../controllers/recommendation.controller';

const router = Router();
router.use(requireAuth);

router.get('/', recommendationController.getRecommendations);

// ✅ IMPORTANT : avant /:id
router.get('/mission/:missionId', getMissionRecommendations);

router.get('/:id', recommendationController.getRecommendation);

router.post('/', recommendationController.createRecommendation);
router.put('/:id', recommendationController.updateRecommendation);
router.patch('/:id/status', recommendationController.updateRecommendationStatus);
router.post('/:id/comments', recommendationController.addRecommendationComment);
router.post('/:id/follow-ups', recommendationController.addRecommendationFollowUp);

// router.get('/', requirePermission('can_view_tasks'), recommendationController.getRecommendations);
// router.get('/:id', requirePermission('can_view_tasks'), recommendationController.getRecommendation);
// router.post('/', requirePermission('can_manage_tasks'), recommendationController.createRecommendation);
// router.put('/:id', requirePermission('can_manage_tasks'), recommendationController.updateRecommendation);
// router.patch('/:id/status', requirePermission('can_manage_tasks'), recommendationController.updateRecommendationStatus);
// router.post('/:id/comments', requirePermission('can_view_tasks'), recommendationController.addRecommendationComment);
// router.post('/:id/follow-ups', requirePermission('can_manage_tasks'), recommendationController.addRecommendationFollowUp);
// router.get('/mission/:missionId', getMissionRecommendations);

export default router;
