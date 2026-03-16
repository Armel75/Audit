import { Router } from 'express';
import { MissionService, MissionStatus } from '../services/mission.service';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all mission routes
router.use(requireAuth);

// GET /api/missions
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const missions = await MissionService.getMissions(tenantId);
    res.json(missions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/missions/:id/report
router.get('/:id/report', async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const report = await MissionService.getMissionReport(req.params.id, tenantId);
    res.json(report);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// GET /api/missions/:id
router.get('/:id', async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const mission = await MissionService.getMissionById(req.params.id, tenantId);
    res.json(mission);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// POST /api/missions (Requires 'can_manage_tasks' permission)
router.post('/', requirePermission('can_manage_tasks'), async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const mission = await MissionService.createMission({
      ...req.body,
      tenantId
    });
    res.status(201).json(mission);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH /api/missions/:id/status (Requires 'can_manage_tasks' permission)
router.patch('/:id/status', requirePermission('can_manage_tasks'), async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const { status } = req.body;
    const updatedMission = await MissionService.updateStatus(req.params.id, tenantId, status as MissionStatus);
    res.json(updatedMission);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
