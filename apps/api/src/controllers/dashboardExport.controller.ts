// ============================================================================
// EXPORT DES INDICATEURS DES TABLEAUX DE BORD (DG / Missions / Pilotage)
// ============================================================================
// Réutilise les MÊMES méthodes DashboardService que les pages (source de vérité
// unique) et les MÊMES filtres (période year/month + scope all/mine pour missions).
// Formats : pdf (rapport paysage) et excel (classeur multi-feuilles).

import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { getMissionAccessFilter } from './mission.controller';
import { generatePDF } from '../services/report.service';
import { buildIndicatorReportFallbackDoc, renderFallbackPdf } from '../services/pdfFallback.service';
import {
  IndicatorReport,
  normalizeDg,
  normalizeMissions,
  normalizePilotage,
  buildIndicatorWorkbookBuffer,
  buildIndicatorReportHtml,
} from '../services/dashboardExport.service';

type DashboardType = 'dg' | 'missions' | 'pilotage';

const TITLES: Record<DashboardType, { title: string; baseName: string }> = {
  dg: { title: 'Tableau de bord stratégique', baseName: 'tableau_bord_strategique' },
  missions: { title: 'Tableau de bord missions', baseName: 'tableau_bord_missions' },
  pilotage: { title: 'Pilotage audit', baseName: 'pilotage_audit' },
};

function periodFromQuery(q: Record<string, unknown>): { year?: number; month?: number } | undefined {
  const yr = q.year ? Number(q.year) : undefined;
  const mo = q.month ? Number(q.month) : undefined;
  return yr ? { year: yr, month: mo } : undefined;
}

function periodLabel(p?: { year?: number; month?: number }): string {
  if (!p?.year) return 'Période : toute';
  if (p.month) {
    const d = new Date(p.year, p.month - 1, 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return `Période : ${label}`;
  }
  return `Période : année ${p.year}`;
}

function subtitleFor(type: DashboardType, period?: { year?: number; month?: number }, scope?: 'all' | 'mine'): string {
  const parts = [periodLabel(period)];
  if (type === 'missions') parts.push(scope === 'mine' ? 'Vue : mes missions' : 'Vue : toutes les missions');
  parts.push(`Généré le ${new Date().toLocaleDateString('fr-FR')}`);
  return parts.join(' — ');
}

function hasPermission(user: any, code: string): boolean {
  return (user?.permissions || []).some((p: string) => p.toLowerCase() === code.toLowerCase());
}

async function buildReport(req: Request, res: Response, type: DashboardType): Promise<IndicatorReport | null> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Non autorisé' });
    return null;
  }
  const user = (req as any).user;
  const period = periodFromQuery(req.query as Record<string, unknown>);

  let data: any;
  let scope: 'all' | 'mine' | undefined;
  if (type === 'dg') {
    data = await DashboardService.getDGDashboard(tenantId, period);
  } else if (type === 'missions') {
    const hasReadAll = hasPermission(user, 'audit_mission:read_all');
    scope = hasReadAll && req.query.scope !== 'mine' ? 'all' : 'mine';
    const accessFilter = getMissionAccessFilter(user, scope === 'mine');
    data = await DashboardService.getMissionsDashboard(tenantId, period, accessFilter, scope);
  } else {
    data = await DashboardService.getPilotage(tenantId, period);
  }

  const core =
    type === 'dg' ? normalizeDg(data) : type === 'missions' ? normalizeMissions(data) : normalizePilotage(data);

  return {
    title: TITLES[type].title,
    subtitle: subtitleFor(type, period, scope),
    footer: core.footer,
    kpis: core.kpis,
    metrics: core.metrics,
    sections: core.sections,
  };
}

async function serveDashboardExport(req: Request, res: Response, type: DashboardType): Promise<void> {
  const format = String(req.params.format || '').toLowerCase();
  if (format !== 'pdf' && format !== 'excel') {
    res.status(400).json({ error: "Format invalide (pdf ou excel)" });
    return;
  }
  try {
    const report = await buildReport(req, res, type);
    if (!report) return;

    const { baseName } = TITLES[type];
    if (format === 'excel') {
      const buffer = await buildIndicatorWorkbookBuffer(report);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.xlsx"`);
      res.send(buffer);
    } else {
      const html = buildIndicatorReportHtml(report);
      const buffer = await generatePDF(html, () => renderFallbackPdf(buildIndicatorReportFallbackDoc(report)));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
      res.send(buffer);
    }
  } catch (err) {
    console.error(`Error exporting dashboard (${type}):`, err);
    res.status(500).json({ error: "Erreur lors de l'export des indicateurs" });
  }
}

export const exportDgDashboard = (req: Request, res: Response) => serveDashboardExport(req, res, 'dg');
export const exportMissionsDashboard = (req: Request, res: Response) => serveDashboardExport(req, res, 'missions');
export const exportPilotageDashboard = (req: Request, res: Response) => serveDashboardExport(req, res, 'pilotage');
