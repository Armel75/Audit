import { Request, Response } from 'express';
const prisma = require('@audit/database').default;
import { generatePDF } from '../services/report.service';
import { buildListTableFallbackDoc, renderFallbackPdf } from '../services/pdfFallback.service';
import { buildWorkbookBuffer, buildListPdfHtml } from './referentialExport.controller';

// ============================================================================
// EXPORT PLANS D'AUDIT — PDF / Excel
// ============================================================================
// Suit le pattern d'export référentiel (referentialExport.controller.ts) :
//  - Excel : ExcelJS premium (buildWorkbookBuffer) ;
//  - PDF   : HTML → generatePDF (Chromium) avec repli pdfmake automatique.
// Deux granularités :
//  - GLOBAL  : liste de tous les plans d'audit du tenant ;
//  - INDIVIDUEL : un plan précis + les missions qui lui sont rattachées.

const PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_APPROVAL: 'En attente DG',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
};

const MISSION_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifiée',
  READY: 'Prête',
  IN_PROGRESS: 'En cours',
  UNDER_REVIEW: 'En revue',
  REVIEW: 'En revue',
  APPROVED: 'Approuvée',
  COMPLETED: 'Terminée',
  CLOSED: 'Clôturée',
  CANCELLED: 'Annulée',
};

const planStatusLabel = (code?: string | null): string =>
  PLAN_STATUS_LABELS[code ?? ''] ?? code ?? '-';

const missionStatusLabel = (code?: string | null): string =>
  MISSION_STATUS_LABELS[code ?? ''] ?? code ?? '-';

const personName = (u?: { firstName?: string | null; lastName?: string | null } | null): string =>
  u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '-' : '-';

const fmtDate = (v?: string | Date | null): string => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR');
};

const nowFull = () =>
  `${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;

function sendXlsx(res: Response, buffer: Buffer, filename: string): void {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

async function requireTenant(req: Request, res: Response): Promise<number | null> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Non autorisé' });
    return null;
  }
  return tenantId;
}

// ── Données ──────────────────────────────────────────────────────────────────

// Liste globale des plans (avec compteurs missions / versions + approbateur).
async function fetchPlans(tenantId: number): Promise<any[]> {
  return prisma.auditPlan.findMany({
    where: { tenantId },
    include: {
      approvedBy: { select: { firstName: true, lastName: true } },
      _count: { select: { missions: true, versions: true } },
    },
    orderBy: [{ year: 'desc' }, { versionNumber: 'desc' }],
  });
}

// Un plan + ses missions rattachées (détail pour l'export individuel).
async function fetchPlanWithMissions(tenantId: number, planId: number): Promise<any | null> {
  return prisma.auditPlan.findFirst({
    where: { id: planId, tenantId },
    include: {
      approvedBy: { select: { firstName: true, lastName: true } },
      missions: {
        orderBy: { id: 'asc' },
        include: {
          leader: { select: { firstName: true, lastName: true } },
          auditType: { select: { name: true } },
          _count: { select: { findings: true } },
        },
      },
      _count: { select: { missions: true, versions: true } },
    },
  });
}

// ── Colonnes & lignes ────────────────────────────────────────────────────────

const PLANS_GLOBAL_HEADERS = ['Année', 'Version', 'Statut', 'Titre', 'Description', 'Nb missions', 'Nb versions', 'Approuvé par'];
const PLANS_GLOBAL_WIDTHS = [10, 10, 18, 34, 40, 12, 12, 20];

function plansGlobalRows(plans: any[]): string[][] {
  return plans.map((p) => [
    String(p?.year ?? '-'),
    String(p?.versionNumber ?? 1),
    planStatusLabel(p?.status),
    String(p?.title ?? `Plan d'audit ${p?.year ?? ''}`),
    String(p?.description ?? '-'),
    String(p?._count?.missions ?? 0),
    String(p?._count?.versions ?? 0),
    personName(p?.approvedBy),
  ]);
}

const PLAN_MISSIONS_HEADERS = ['#', 'Mission', 'Statut', 'Chef de mission', "Type d'audit", 'Début', 'Fin', 'Constats'];
const PLAN_MISSIONS_WIDTHS = [6, 44, 14, 22, 16, 12, 12, 10];

function planMissionsRows(plan: any): string[][] {
  const missions = plan?.missions ?? [];
  if (missions.length === 0) {
    return [['-', 'Aucune mission rattachée à ce plan', '-', '-', '-', '-', '-', '-']];
  }
  return missions.map((m: any, i: number) => [
    String(i + 1),
    String(m?.title ?? '-'),
    missionStatusLabel(m?.status),
    personName(m?.leader),
    String(m?.auditType?.name ?? '-'),
    fmtDate(m?.startDate),
    fmtDate(m?.endDate),
    String(m?._count?.findings ?? 0),
  ]);
}

function planSubtitle(plan: any): string {
  const parts = [
    planStatusLabel(plan?.status),
    `v${plan?.versionNumber ?? 1}`,
    `${plan?._count?.missions ?? 0} mission(s)`,
    `Généré le ${nowFull()}`,
  ];
  return parts.join(' — ');
}

// ============================================================================
// EXPORT GLOBAL (liste de tous les plans)
// ============================================================================

export async function exportAuditPlansExcel(req: Request, res: Response) {
  try {
    const tenantId = await requireTenant(req, res);
    if (!tenantId) return;
    const plans = await fetchPlans(tenantId);
    const buffer = await buildWorkbookBuffer({
      sheetName: "Plans d'audit",
      headers: PLANS_GLOBAL_HEADERS,
      rows: plansGlobalRows(plans),
      widths: PLANS_GLOBAL_WIDTHS,
    });
    sendXlsx(res, buffer, 'plans_audit_annuels.xlsx');
  } catch (err) {
    console.error('Error exporting audit plans Excel:', err);
    res.status(500).json({ error: "Erreur lors de l'export Excel des plans d'audit" });
  }
}

export async function exportAuditPlansPDF(req: Request, res: Response) {
  try {
    const tenantId = await requireTenant(req, res);
    if (!tenantId) return;
    const plans = await fetchPlans(tenantId);
    const subtitle = `Généré le ${nowFull()} — ${plans.length} plan(s)`;
    const html = buildListPdfHtml({
      title: "Plans d'Audit Annuels",
      subtitle,
      headers: PLANS_GLOBAL_HEADERS,
      rows: plansGlobalRows(plans),
    });
    const buffer = await generatePDF(html, () =>
      renderFallbackPdf(
        buildListTableFallbackDoc({
          title: "Plans d'Audit Annuels",
          subtitle,
          headers: PLANS_GLOBAL_HEADERS,
          rows: plansGlobalRows(plans),
        })
      )
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="plans_audit_annuels.pdf"');
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting audit plans PDF:', err);
    res.status(500).json({ error: "Erreur lors de l'export PDF des plans d'audit" });
  }
}

// ============================================================================
// EXPORT INDIVIDUEL (un plan + ses missions)
// ============================================================================

export async function exportAuditPlanExcel(req: Request, res: Response) {
  try {
    const tenantId = await requireTenant(req, res);
    if (!tenantId) return;
    const planId = Number(req.params.id);
    if (!planId) return res.status(400).json({ error: 'Identifiant de plan invalide' });
    const plan = await fetchPlanWithMissions(tenantId, planId);
    if (!plan) return res.status(404).json({ error: "Plan d'audit non trouvé" });

    const buffer = await buildWorkbookBuffer({
      sheetName: "Missions du plan",
      headers: PLAN_MISSIONS_HEADERS,
      rows: planMissionsRows(plan),
      widths: PLAN_MISSIONS_WIDTHS,
    });
    const base = `plan_audit_${plan.year}_v${plan.versionNumber ?? 1}`;
    sendXlsx(res, buffer, `${base}.xlsx`);
  } catch (err) {
    console.error('Error exporting audit plan Excel:', err);
    res.status(500).json({ error: "Erreur lors de l'export Excel du plan d'audit" });
  }
}

export async function exportAuditPlanPDF(req: Request, res: Response) {
  try {
    const tenantId = await requireTenant(req, res);
    if (!tenantId) return;
    const planId = Number(req.params.id);
    if (!planId) return res.status(400).json({ error: 'Identifiant de plan invalide' });
    const plan = await fetchPlanWithMissions(tenantId, planId);
    if (!plan) return res.status(404).json({ error: "Plan d'audit non trouvé" });

    const title = `Plan d'Audit ${plan.year} — ${plan.title || `Plan d'audit ${plan.year}`}`;
    const subtitle = planSubtitle(plan);
    const rows = planMissionsRows(plan);

    const html = buildListPdfHtml({
      title,
      subtitle,
      headers: PLAN_MISSIONS_HEADERS,
      rows,
    });
    const buffer = await generatePDF(html, () =>
      renderFallbackPdf(
        buildListTableFallbackDoc({
          title,
          subtitle,
          headers: PLAN_MISSIONS_HEADERS,
          rows,
        })
      )
    );
    const base = `plan_audit_${plan.year}_v${plan.versionNumber ?? 1}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting audit plan PDF:', err);
    res.status(500).json({ error: "Erreur lors de l'export PDF du plan d'audit" });
  }
}
