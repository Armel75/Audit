import { Router } from 'express';
import { AuditPlanService } from '../services/audit-plan.service';
import { requirePermission } from '../middleware/auth.middleware';

const router = Router();

// GET /api/audit-plans
// Requires 'can_view_all_campaigns' permission
router.get('/', requirePermission('can_view_all_campaigns'), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const plans = await AuditPlanService.getPlans(tenantId);
    res.json(plans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/audit-plans
// Requires 'can_create_campaign' permission
router.post('/', requirePermission('can_create_campaign'), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { year } = req.body;

    if (!year) {
      return res.status(400).json({ error: "L'année est obligatoire." });
    }

    const plan = await AuditPlanService.createPlan(tenantId, parseInt(year));
    res.status(201).json(plan);
  } catch (error: any) {
    // Handle unique constraint violation gracefully
    if (error.message.includes('existe déjà')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/audit-plans/:id/status
// In a real app, this might require a specific 'can_validate_campaign' permission
router.patch('/:id/status', requirePermission('can_create_campaign'), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status } = req.body;
    const planId = req.params.id;

    const updatedPlan = await AuditPlanService.updateStatus(tenantId, planId, status);
    res.json(updatedPlan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/audit-plans/:id
router.put('/:id', requirePermission('can_create_campaign'), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { year } = req.body;
    const planId = req.params.id;

    if (!year) {
      return res.status(400).json({ error: "L'année est obligatoire." });
    }

    const updatedPlan = await AuditPlanService.updatePlan(tenantId, planId, parseInt(year));
    res.json(updatedPlan);
  } catch (error: any) {
    if (error.message.includes('existe déjà')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/audit-plans/:id
router.delete('/:id', requirePermission('can_create_campaign'), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const planId = req.params.id;

    await AuditPlanService.deletePlan(tenantId, planId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
