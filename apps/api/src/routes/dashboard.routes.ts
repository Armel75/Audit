import { Router } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { requireAnyPermission, requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/dg', requireAuth, requireAnyPermission(['dashboard:read', 'admin:access']), async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;

    const data = await DashboardService.getDGDashboard(tenantId);

    res.json(data);
  } catch (error) {
    console.error('🔥 DG DASHBOARD ERROR:', error);
    res.status(500).json({ message: 'Internal error' });
  }
});

export default router;
