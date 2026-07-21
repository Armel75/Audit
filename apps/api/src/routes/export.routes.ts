import { Router } from 'express';
import { exportFindingsRecommendationsPDF, exportFindingsRecommendationsExcel } from '../controllers/export.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Export PDF
router.get('/export/findings-recommendations/pdf', requireAuth, exportFindingsRecommendationsPDF);
// Export Excel
router.get('/export/findings-recommendations/excel', requireAuth, exportFindingsRecommendationsExcel);

export default router;
