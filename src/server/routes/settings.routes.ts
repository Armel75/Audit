import { Router } from 'express';
import { SettingsService } from '../services/settings.service';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all settings routes
router.use(requireAuth);

// We assume 'manage_settings' is the required permission for these operations
// You can adjust this based on your actual permission model
const checkSettingsPermission = requirePermission('manage_settings');

// --- Departments ---
router.get('/departments', async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.json(await SettingsService.getDepartments(tenantId));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/departments', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.status(201).json(await SettingsService.createDepartment(tenantId, req.body));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/departments/:id', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.json(await SettingsService.updateDepartment(req.params.id, tenantId, req.body));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/departments/:id', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    await SettingsService.deleteDepartment(req.params.id, tenantId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Audit Types ---
router.get('/audit-types', async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.json(await SettingsService.getAuditTypes(tenantId));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/audit-types', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.status(201).json(await SettingsService.createAuditType(tenantId, req.body));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/audit-types/:id', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.json(await SettingsService.updateAuditType(req.params.id, tenantId, req.body));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/audit-types/:id', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    await SettingsService.deleteAuditType(req.params.id, tenantId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Risk Levels ---
router.get('/risk-levels', async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.json(await SettingsService.getRiskLevels(tenantId));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/risk-levels', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.status(201).json(await SettingsService.createRiskLevel(tenantId, req.body));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/risk-levels/:id', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.json(await SettingsService.updateRiskLevel(req.params.id, tenantId, req.body));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/risk-levels/:id', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    await SettingsService.deleteRiskLevel(req.params.id, tenantId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Priority Levels ---
router.get('/priority-levels', async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.json(await SettingsService.getPriorityLevels(tenantId));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/priority-levels', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.status(201).json(await SettingsService.createPriorityLevel(tenantId, req.body));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/priority-levels/:id', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    res.json(await SettingsService.updatePriorityLevel(req.params.id, tenantId, req.body));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/priority-levels/:id', checkSettingsPermission, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    await SettingsService.deletePriorityLevel(req.params.id, tenantId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
