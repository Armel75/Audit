import { Router } from 'express';
import { exportFindingsRecommendationsPDF, exportFindingsRecommendationsExcel } from '../controllers/export.controller';
import {
  exportAuditableEntitiesExcel,
  exportAuditableEntitiesPDF,
  exportBusinessProcessesExcel,
  exportBusinessProcessesPDF,
  exportRisksExcel,
  exportRisksPDF,
  exportControlsExcel,
  exportControlsPDF,
  exportAuditTypesExcel,
  exportAuditTypesPDF,
} from '../controllers/referentialExport.controller';
import {
  exportAuditPlansExcel,
  exportAuditPlansPDF,
  exportAuditPlanExcel,
  exportAuditPlanPDF,
} from '../controllers/auditPlanExport.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Export PDF
router.get('/export/findings-recommendations/pdf', requireAuth, exportFindingsRecommendationsPDF);
// Export Excel
router.get('/export/findings-recommendations/excel', requireAuth, exportFindingsRecommendationsExcel);

// Export Référentiel — Entités auditables (PDF / Excel)
router.get('/export/auditable-entities/pdf', requireAuth, exportAuditableEntitiesPDF);
router.get('/export/auditable-entities/excel', requireAuth, exportAuditableEntitiesExcel);

// Export Référentiel — Processus métier (PDF / Excel)
router.get('/export/business-processes/pdf', requireAuth, exportBusinessProcessesPDF);
router.get('/export/business-processes/excel', requireAuth, exportBusinessProcessesExcel);

// Export Référentiel — Risques / Contrôles / Types d'audit (PDF / Excel)
router.get('/export/risks/pdf', requireAuth, exportRisksPDF);
router.get('/export/risks/excel', requireAuth, exportRisksExcel);
router.get('/export/controls/pdf', requireAuth, exportControlsPDF);
router.get('/export/controls/excel', requireAuth, exportControlsExcel);
router.get('/export/audit-types/pdf', requireAuth, exportAuditTypesPDF);
router.get('/export/audit-types/excel', requireAuth, exportAuditTypesExcel);

// Export Plans d'audit — GLOBAL (tous les plans)
router.get('/export/plans/pdf', requireAuth, exportAuditPlansPDF);
router.get('/export/plans/excel', requireAuth, exportAuditPlansExcel);
// Export Plans d'audit — INDIVIDUEL (un plan + ses missions)
router.get('/export/plans/:id/pdf', requireAuth, exportAuditPlanPDF);
router.get('/export/plans/:id/excel', requireAuth, exportAuditPlanExcel);

export default router;
