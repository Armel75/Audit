import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { FindingService } from '../services/finding.service';

const router = Router();
router.use(requireAuth);

// GET /api/findings/mission/:missionId
router.get('/mission/:missionId', async (req, res) => {
  try {
    const findings = await FindingService.getByMissionId(req.params.missionId);
    res.json(findings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch findings' });
  }
});

// GET /api/findings/:id
router.get('/:id', async (req, res) => {
  try {
    const finding = await FindingService.getById(req.params.id);
    res.json(finding);
  } catch (error: any) {
    console.error(error);
    res.status(404).json({ error: error.message || 'Finding not found' });
  }
});

// POST /api/findings
router.post('/', requirePermission('can_manage_tasks'), async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, riskLevelId, process, cause, impact, missionId } = req.body;
    
    if (!title || !description || !missionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const finding = await FindingService.create({
      title,
      description,
      riskLevelId,
      process,
      cause,
      impact,
      missionId,
      authorId: userId
    });
    
    res.status(201).json(finding);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create finding' });
  }
});

// PATCH /api/findings/:id
router.patch('/:id', requirePermission('can_manage_tasks'), async (req, res) => {
  try {
    const { title, description, riskLevelId, process, cause, impact } = req.body;
    const finding = await FindingService.update(req.params.id, {
      title,
      description,
      riskLevelId,
      process,
      cause,
      impact
    });
    res.json(finding);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update finding' });
  }
});

// PATCH /api/findings/:id/status
router.patch('/:id/status', requirePermission('can_manage_tasks'), async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const finding = await FindingService.updateStatus(req.params.id, status, userId);
    res.json(finding);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/findings/:id
router.delete('/:id', requirePermission('can_manage_tasks'), async (req, res) => {
  try {
    await FindingService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete finding' });
  }
});

// POST /api/findings/:id/comments
router.post('/:id/comments', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const comment = await FindingService.addComment(req.params.id, userId, content);
    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
