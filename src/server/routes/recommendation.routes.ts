import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { RecommendationService } from '../services/recommendation.service';

const router = Router();
router.use(requireAuth);

// GET /api/recommendations/finding/:findingId
router.get('/finding/:findingId', async (req, res) => {
  try {
    const recos = await RecommendationService.getByFindingId(req.params.findingId);
    res.json(recos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// POST /api/recommendations
router.post('/', requirePermission('can_manage_tasks'), async (req, res) => {
  try {
    const { title, actionPlan, targetDate, priorityId, departmentId, assigneeName, findingId } = req.body;
    
    if (!title || !actionPlan || !targetDate || !findingId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const reco = await RecommendationService.create({
      title,
      actionPlan,
      targetDate: new Date(targetDate),
      priorityId,
      departmentId,
      assigneeName,
      findingId
    });
    
    res.status(201).json(reco);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create recommendation' });
  }
});

// PATCH /api/recommendations/:id/status
router.patch('/:id/status', requirePermission('can_manage_tasks'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const reco = await RecommendationService.updateStatus(req.params.id, status);
    res.json(reco);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /api/recommendations/:id/comments
router.post('/:id/comments', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const comment = await RecommendationService.addComment(req.params.id, userId, content);
    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
