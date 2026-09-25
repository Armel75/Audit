// ============================================================================
// EXPORT DES INDICATEURS DES TABLEAUX DE BORD (DG / Missions / Pilotage / Main)
// ============================================================================
// Principe : on NE capture pas l'écran. On normalise les payloads déjà calculés
// par DashboardService (même source de vérité que les pages) vers une structure
// neutre `IndicatorReport`, puis on produit :
//   - Excel : classeur multi-feuilles (Synthèse KPIs + 1 feuille par section) ;
//   - PDF   : rapport HTML paysage (KPIs + barres + tableaux) → generatePDF,
//             avec repli pdfmake générique (pdfFallback.service).
// Les filtres période/scope sont repris tels quels des endpoints dashboard.

import fs from 'fs';
import path from 'path';
import { ROOT_PATH } from '../config/storage';

export type IndicatorKpi = { label: string; value: string };
export type IndicatorMetric = { label: string; value: string };
export type IndicatorSection = { title: string; headers: string[]; rows: (string | number)[][] };

export type IndicatorReport = {
  title: string;
  subtitle: string;
  footer: string;
  kpis: IndicatorKpi[];
  metrics: IndicatorMetric[];
  sections: IndicatorSection[];
};

type DashboardData = any;

// ── Logo SOREPCO (même image que les rapports existants : template/logo.png) ──
let _exportLogo = '';
function logoDataUrl(): string {
  if (_exportLogo) return _exportLogo;
  try {
    const p = path.join(ROOT_PATH, 'template/logo.png');
    if (fs.existsSync(p)) {
      _exportLogo = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
    }
  } catch (err) {
    console.warn('[dashboardExport] Logo illisible :', (err as Error).message);
  }
  return _exportLogo;
}

// ── Helpers de formatage ────────────────────────────────────────────────────
const pct = (v?: number | null): string => (typeof v === 'number' ? `${Math.round(v)}%` : '-');
const count = (v?: number | null): string => (typeof v === 'number' ? String(v) : '-');
const days = (v?: number | null): string => (typeof v === 'number' ? `${Math.round(v)} j` : '-');
const emptySection = (title: string): IndicatorSection => ({ title, headers: [], rows: [] });

// ============================================================================
// Normalisation — DG (Tableau de bord stratégique)
// ============================================================================
export function normalizeDg(data: DashboardData): Pick<IndicatorReport, 'kpis' | 'metrics' | 'sections' | 'footer'> {
  const pe = data?.planExecution;
  const kpis: IndicatorKpi[] = [
    { label: 'Exécution du plan', value: pct(pe?.progress) },
    { label: 'Couverture entités', value: pct(data?.coverageRate) },
    { label: 'Constats critiques', value: count(data?.criticalFindingsCount) },
    { label: 'Implémentation recos', value: pct(data?.avgImplementation) },
    { label: 'Résolution critiques', value: pct(data?.resolutionRate) },
    { label: 'Conformité procédures', value: pct(data?.procedureConformityRate) },
    { label: 'Recos en retard', value: count(data?.recosOverdueCount) },
    { label: 'Score santé', value: `${count(data?.healthScore)} / 100` },
  ];

  const metrics: IndicatorMetric[] = [
    { label: 'Recommandations critiques ouvertes', value: count(data?.criticalRecommendationsOpen) },
    { label: 'Recommandations critiques clôturées', value: count(data?.criticalRecommendationsClosed) },
    { label: 'Entités totales', value: count(data?.totalAuditableEntities) },
    { label: 'Entités couvertes', value: count(data?.coveredEntitiesCount) },
    { label: 'Délai moyen clôture constat', value: days(data?.avgFindingCloseDays) },
    { label: 'Délai moyen clôture recommandation', value: days(data?.avgRecoCloseDays) },
    { label: 'Approbations en attente', value: count(data?.approvalsPending) },
    { label: 'Approbations approuvées', value: count(data?.approvalsApproved) },
    { label: 'Approbations rejetées', value: count(data?.approvalsRejected) },
    { label: 'Risques actifs', value: count(data?.risksActive) },
    { label: 'Risques sans contrôle', value: count(data?.risksWithoutControls) },
    { label: 'Contrôles', value: count(data?.totalControls) },
  ];

  const sections: IndicatorSection[] = [];
  if (pe) {
    sections.push({
      title: 'Exécution du plan d’audit',
      headers: ['Année', 'Plan', 'Missions totales', 'Terminées', 'En cours', 'En retard', 'Progression'],
      rows: [[String(pe.year ?? ''), String(pe.title ?? '-'), count(pe.totalMissions), count(pe.completedMissions), count(pe.missionsInProgress), count(pe.missionsLate), pct(pe.progress)]],
    });
  }
  sections.push({
    title: 'Services les plus à risque',
    headers: ['#', 'Département', 'Constats'],
    rows: (data?.topRiskDepartments ?? []).map((d: any, i: number) => [i + 1, d?.department ?? '-', count(d?.count)]),
  });
  sections.push({
    title: 'Évolution constats / recommandations (12 mois)',
    headers: ['#', 'Mois', 'Constats', 'Recommandations ouvertes'],
    rows: (data?.trend ?? []).map((t: any, i: number) => [i + 1, t?.month ?? '-', count(t?.findings), count(t?.recosOpen)]),
  });
  sections.push({
    title: 'Facteurs de santé',
    headers: ['#', 'Facteur', 'Score', 'Poids', 'Statut'],
    rows: (data?.healthFactors ?? []).map((f: any, i: number) => [i + 1, f?.label ?? '-', pct(f?.score), `${f?.weight ?? 0}%`, f?.status ?? '-']),
  });
  sections.push({
    title: 'Missions actives',
    headers: ['#', 'Titre', 'Statut', 'Progression', 'Chef', 'Début', 'Fin'],
    rows: (data?.activeMissions ?? []).map((m: any, i: number) => [
      i + 1,
      m?.title ?? '-',
      m?.status ?? '-',
      pct(m?.progress),
      m?.leader ?? '-',
      m?.startDate ? String(m.startDate).slice(0, 10) : '-',
      m?.endDate ? String(m.endDate).slice(0, 10) : '-',
    ]),
  });

  return {
    kpis,
    metrics,
    sections: sections.filter((s) => s.headers.length > 0),
    footer: 'SISAR Audit — Tableau de bord stratégique',
  };
}

// ============================================================================
// Normalisation — Missions
// ============================================================================
export function normalizeMissions(data: DashboardData): Pick<IndicatorReport, 'kpis' | 'metrics' | 'sections' | 'footer'> {
  const s = data?.summary ?? {};
  const prev = data?.previousSummary;

  const kpis: IndicatorKpi[] = [
    { label: 'Missions totales', value: count(s.totalMissions) },
    { label: 'Taux de complétion', value: pct(s.completionRate) },
    { label: 'Constats', value: count(s.findingsCount) },
    { label: 'Constats résolus', value: pct(s.findingsResolvedRate) },
    { label: 'Recommandations', value: count(s.recosCount) },
    { label: 'Recos clôturées', value: pct(s.recoClosureRate) },
    { label: 'Missions en retard', value: count(s.late) },
    { label: 'Score santé', value: `${count(data?.healthScore)} / 100` },
  ];

  const metrics: IndicatorMetric[] = [
    { label: 'Planifiées', value: count(s.planned) },
    { label: 'En cours', value: count(s.inProgress) },
    { label: 'Terminées', value: count(s.completed) },
    { label: 'Annulées', value: count(s.cancelled) },
    { label: 'Vue', value: data?.view === 'all' ? 'Toutes les missions' : 'Mes missions' },
  ];
  if (prev) {
    const deltas: IndicatorMetric[] = [
      { label: 'Missions (période précédente)', value: count(prev.totalMissions) },
      { label: 'Taux complétion (précédent)', value: pct(prev.completionRate) },
      { label: 'Constats (précédent)', value: count(prev.findingsCount) },
      { label: 'Recos clôturées (précédent)', value: pct(prev.recoClosureRate) },
    ];
    metrics.push(...deltas);
  }

  const sections: IndicatorSection[] = [
    {
      title: 'Répartition par statut',
      headers: ['#', 'Statut', 'Nombre'],
      rows: (data?.byStatus ?? []).map((b: any, i: number) => [i + 1, b?.label ?? b?.status ?? '-', count(b?.count)]),
    },
    {
      title: 'Par type d’audit',
      headers: ['#', "Type d'audit", 'Missions'],
      rows: (data?.byAuditType ?? []).map((b: any, i: number) => [i + 1, b?.name ?? '-', count(b?.count)]),
    },
    {
      title: 'Par chef de mission',
      headers: ['#', 'Responsable', 'Missions'],
      rows: (data?.byLeader ?? []).map((b: any, i: number) => [i + 1, b?.leader ?? '-', count(b?.count)]),
    },
    {
      title: 'Tendance créées / clôturées (12 mois)',
      headers: ['#', 'Mois', 'Créées', 'Clôturées'],
      rows: (data?.trend ?? []).map((t: any, i: number) => [i + 1, t?.label ?? t?.month ?? '-', count(t?.created), count(t?.closed)]),
    },
    {
      title: 'Classement des missions',
      headers: ['#', 'Mission', 'Statut', 'Chef', "Type d'audit", 'Constats', 'Résolus', 'Recos', 'Clôturées', 'Taux clôture', 'Score'],
      rows: (data?.ranking ?? []).map((r: any, i: number) => [
        i + 1,
        r?.title ?? '-',
        r?.status ?? '-',
        r?.leader ?? '-',
        r?.auditType ?? '-',
        count(r?.findingsCount),
        count(r?.findingsResolved),
        count(r?.recosCount),
        count(r?.recosClosed),
        pct(r?.recoClosureRate),
        pct(r?.score),
      ]),
    },
  ];

  return {
    kpis,
    metrics,
    sections: sections.filter((x) => x.headers.length > 0 && (x.rows?.length ?? 0) > 0),
    footer: 'SISAR Audit — Tableau de bord missions',
  };
}

// ============================================================================
// Normalisation — Pilotage
// ============================================================================
export function normalizePilotage(data: DashboardData): Pick<IndicatorReport, 'kpis' | 'metrics' | 'sections' | 'footer'> {
  const k = data?.kpis ?? {};
  const cov = data?.coverage ?? {};
  const sb = data?.statusBreakdown ?? {};
  const gaps = data?.gaps ?? {};

  const kpis: IndicatorKpi[] = [
    { label: 'Types d’audit', value: count(k.auditTypes) },
    { label: 'Entités auditées', value: count(k.auditedEntities) },
    { label: 'Processus métiers', value: count(k.businessProcesses) },
    { label: 'Contrôles', value: count(k.controls) },
    { label: 'Risques', value: count(k.risks) },
    { label: 'Risques sans contrôle', value: count(k.risksWithoutControls) },
    { label: 'Missions actives', value: count(k.activeMissions) },
    { label: 'Plan validé', value: k.validatedPlanYear ? String(k.validatedPlanYear) : '-' },
  ];

  const covRow = (label: string, c: any): IndicatorMetric => ({
    label,
    value: c ? `${count(c.covered)} / ${count(c.total)} (${pct(c.rate)})` : '-',
  });
  const metrics: IndicatorMetric[] = [
    covRow('Couverture entités', cov?.entities),
    covRow('Couverture processus', cov?.processes),
    covRow('Contrôles testés', cov?.controls),
    covRow('Couverture risques', cov?.risks),
  ];

  const sections: IndicatorSection[] = [
    {
      title: 'Processus sans dispositif de contrôle',
      headers: ['Indicateur', 'Valeur'],
      rows: [
        ['Processus sans contrôle', count(gaps?.processesWithoutControls)],
        ['Contrôles non testés', count(gaps?.untestedControls)],
      ],
    },
    {
      title: 'Entités à criticité élevée non couvertes',
      headers: ['#', 'Entité', 'Criticité'],
      rows: (gaps?.highCriticalityUncoveredEntities ?? []).map((e: any, i: number) => [i + 1, e?.name ?? '-', e?.criticality ?? '-']),
    },
    {
      title: 'Risques élevés non couverts',
      headers: ['#', 'Risque'],
      rows: (gaps?.highRiskUncoveredRisks ?? []).map((r: any, i: number) => [i + 1, r?.name ?? '-']),
    },
    {
      title: 'Constats & missions par type d’audit',
      headers: ['#', "Type d'audit", 'Constats', 'Missions'],
      rows: (data?.byAuditType ?? []).map((b: any, i: number) => [i + 1, b?.name ?? '-', count(b?.findings), count(b?.missions)]),
    },
    {
      title: 'Top processus exposés',
      headers: ['#', 'Processus', 'Constats'],
      rows: (data?.byProcess ?? []).map((b: any, i: number) => [i + 1, b?.name ?? '-', count(b?.findings)]),
    },
    {
      title: 'Top entités exposées',
      headers: ['#', 'Entité', 'Criticité', 'Constats'],
      rows: (data?.byEntity ?? []).map((b: any, i: number) => [i + 1, b?.name ?? '-', b?.criticality ?? '-', count(b?.findings)]),
    },
    {
      title: 'Constats par statut',
      headers: ['#', 'Statut', 'Nombre'],
      rows: (sb?.findings ?? []).map((b: any, i: number) => [i + 1, b?.status ?? '-', count(b?.count)]),
    },
    {
      title: 'Recommandations par statut',
      headers: ['#', 'Statut', 'Nombre'],
      rows: (sb?.recommendations ?? []).map((b: any, i: number) => [i + 1, b?.status ?? '-', count(b?.count)]),
    },
    {
      title: 'Contrôles par type',
      headers: ['#', 'Type', 'Nombre'],
      rows: (sb?.controlsByType ?? []).map((b: any, i: number) => [i + 1, b?.type ?? '-', count(b?.count)]),
    },
  ];

  return {
    kpis,
    metrics,
    sections: sections.filter((x) => x.headers.length > 0 && (x.rows?.length ?? 0) > 0),
    footer: 'SISAR Audit — Pilotage de l’audit',
  };
}

// ============================================================================
// Normalisation — MAIN (Tableau de bord principal)
// ============================================================================
const MISSION_STATUS: Record<string, string> = {
  PLANNED: 'Planifiée',
  READY: 'Prête',
  IN_PROGRESS: 'En cours',
  REVIEW: 'En revue',
  UNDER_REVIEW: 'En revue',
  APPROVED: 'Approuvée',
  COMPLETED: 'Terminée',
  CLOSED: 'Clôturée',
  CANCELLED: 'Annulée',
};

export function normalizeMain(data: DashboardData): Pick<IndicatorReport, 'kpis' | 'metrics' | 'sections' | 'footer'> {
  const k = data?.kpis ?? {};
  const pe = data?.planExecution;
  const fs = data?.findingsSummary ?? {};
  const rs = data?.recommendationSummary ?? {};
  const as = data?.approvalsSummary ?? {};
  const tk = data?.tickets ?? {};
  const docs = data?.documents ?? {};
  const rc = data?.riskControl ?? {};
  const perf = data?.performance ?? {};

  const kpis: IndicatorKpi[] = [
    { label: 'Missions actives', value: count(k.missionsActive) },
    { label: 'Missions totales', value: count(k.missionsTotal) },
    { label: 'Constats ouverts', value: count(k.findingsOpen) },
    { label: 'Constats critiques', value: count(k.findingsCriticalOpen) },
    { label: 'Recommandations ouvertes', value: count(k.recosOpen) },
    { label: 'Recommandations en retard', value: count(k.recosOverdue) },
    { label: 'Approbations en attente', value: count(k.approvalsPending) },
    { label: 'Implémentation moyenne', value: pct(k.avgImplementation) },
  ];

  const metrics: IndicatorMetric[] = [
    { label: 'Plans approuvés', value: `${count(k.plansApproved)} / ${count(k.plansTotal)}` },
    { label: 'Constats en attente de validation', value: count(fs.pendingValidation) },
    { label: 'Constats récents (7 jours)', value: count(fs.recent) },
    { label: 'Recos à échéance sous 7 jours', value: count(rs.dueNext7Days) },
    { label: 'Approbations approuvées', value: count(as.approved) },
    { label: 'Approbations rejetées', value: count(as.rejected) },
    { label: 'Tickets ouverts', value: count(tk.open) },
    { label: 'Tickets bloqués', value: count(tk.blocked) },
    { label: 'Tickets résolus', value: count(tk.resolved) },
    { label: 'Documents', value: count(docs.totalDocuments) },
    { label: 'Éléments de preuve', value: count(docs.totalEvidence) },
    { label: 'Preuves sensibles', value: count(docs.sensitiveEvidence) },
    { label: 'Risques actifs', value: count(rc.activeRisks) },
    { label: 'Risques sans contrôle', value: count(rc.risksWithoutControls) },
    { label: 'Contrôles', value: count(rc.totalControls) },
    { label: 'Couverture de l’univers', value: pct(perf.coverageRate) },
    { label: 'Entités couvertes', value: `${count(perf.coveredEntitiesCount)} / ${count(perf.totalAuditableEntities)}` },
    { label: 'Délai moyen clôture constat', value: days(perf.avgFindingCloseDays) },
    { label: 'Délai moyen clôture recommandation', value: days(perf.avgRecoCloseDays) },
    { label: 'Conformité procédures', value: `${count(perf.proceduresOk)} / ${count(perf.proceduresTotal)} (${pct(perf.procedureConformityRate)})` },
    { label: 'Missions à l’heure', value: `${count(perf.completedMissionsCount)} terminées · ${count(perf.missionsLate)} en retard (${pct(perf.missionsOnTimeRate)})` },
    { label: 'Notifications non lues', value: count(data?.unreadNotifications) },
  ];

  const sections: IndicatorSection[] = [];
  if (pe) {
    sections.push({
      title: 'Exécution du plan d’audit',
      headers: ['Année', 'Plan', 'Version', 'Missions', 'Terminées', 'Progression', 'Programmes approuvés', 'Programmes en attente', 'Sans programme validé'],
      rows: [[
        String(pe.year ?? ''),
        String(pe.title ?? '-'),
        String(pe.versionNumber ?? '-'),
        count(pe.totalMissions),
        count(pe.completedMissions),
        pct(pe.progress),
        count(pe.programsApproved),
        count(pe.programsPending),
        count(pe.missionsWithoutValidatedProgram),
      ]],
    });
  }
  sections.push({
    title: 'Répartition des missions par statut',
    headers: ['#', 'Statut', 'Nombre'],
    rows: (data?.missionStatusData ?? []).map((m: any, i: number) => [i + 1, MISSION_STATUS[m?.status] ?? m?.status ?? '-', count(m?.count)]),
  });
  sections.push({
    title: 'Constats par niveau de risque',
    headers: ['#', 'Niveau de risque', 'Nombre'],
    rows: (data?.findingsByRisk ?? []).map((r: any, i: number) => [i + 1, r?.name ?? '-', count(r?.value)]),
  });
  sections.push({
    title: 'Recommandations par département',
    headers: ['#', 'Département', 'Nombre'],
    rows: (data?.recommendationsByDepartment ?? []).map((d: any, i: number) => [i + 1, d?.name ?? '-', count(d?.value)]),
  });
  sections.push({
    title: 'Top missions',
    headers: ['#', 'Mission', 'Statut', 'Début', 'Fin', 'Chef', 'Plan', 'Programme validé'],
    rows: (data?.topMissions ?? []).map((m: any, i: number) => [
      i + 1,
      m?.title ?? '-',
      MISSION_STATUS[m?.status] ?? m?.status ?? '-',
      m?.startDate ? String(m.startDate).slice(0, 10) : '-',
      m?.endDate ? String(m.endDate).slice(0, 10) : '-',
      m?.leader ?? '-',
      m?.plan ?? '-',
      m?.programValidated ? 'Oui' : 'Non',
    ]),
  });
  sections.push({
    title: 'Derniers constats',
    headers: ['#', 'Constat', 'Statut', 'Risque', 'Mission', 'Processus'],
    rows: (data?.topFindings ?? []).map((f: any, i: number) => [i + 1, f?.title ?? '-', f?.status ?? '-', f?.riskLevel ?? '-', f?.mission ?? '-', f?.process ?? '-']),
  });
  sections.push({
    title: 'Recommandations prioritaires',
    headers: ['#', 'Recommandation', 'Statut', 'Priorité', 'Département', 'Responsable', 'Échéance', 'Progression'],
    rows: (data?.topRecommendations ?? []).map((r: any, i: number) => [
      i + 1,
      r?.title ?? '-',
      r?.status ?? '-',
      r?.priority ?? '-',
      r?.department ?? '-',
      r?.assignee ?? '-',
      r?.targetDate ? String(r.targetDate).slice(0, 10) : '-',
      pct(r?.progress),
    ]),
  });
  sections.push({
    title: 'Dernières approbations',
    headers: ['#', 'Objet', 'Type', 'Décision', 'Demandeur', 'Approbateur', 'Date'],
    rows: (data?.recentApprovals ?? []).map((a: any, i: number) => [
      i + 1,
      a?.item ?? '-',
      a?.type ?? '-',
      a?.decision ?? '-',
      a?.requestedBy ?? '-',
      a?.approver ?? '-',
      a?.createdAt ? String(a.createdAt).slice(0, 10) : '-',
    ]),
  });
  sections.push({
    title: 'Tickets récents',
    headers: ['#', 'N° ticket', 'Titre', 'Statut', 'Assigné', 'Recommandation'],
    rows: (data?.recentTickets ?? []).map((t: any, i: number) => [i + 1, t?.ticketNumber ?? '-', t?.title ?? '-', t?.status ?? '-', t?.assignee ?? '-', t?.recommendation ?? '-']),
  });
  sections.push({
    title: 'Activité récente',
    headers: ['#', 'Acteur', 'Action', 'Entité'],
    rows: (data?.recentActivity ?? []).map((a: any, i: number) => [i + 1, a?.actor ?? '-', a?.action ?? '-', a?.entity ?? '-']),
  });
  sections.push({
    title: 'Charge par auditeur',
    headers: ['#', 'Auditeur', 'Missions'],
    rows: (perf?.auditorWorkload ?? []).map((a: any, i: number) => [i + 1, a?.name ?? '-', count(a?.missions)]),
  });
  sections.push({
    title: 'Tendance des constats (6 mois)',
    headers: ['#', 'Mois', 'Créés', 'Clôturés'],
    rows: (perf?.findingsTrend ?? []).map((t: any, i: number) => [i + 1, t?.month ?? '-', count(t?.created), count(t?.closed)]),
  });

  return {
    kpis,
    metrics,
    sections: sections.filter((s) => s.headers.length > 0 && (s.rows?.length ?? 0) > 0),
    footer: 'SISAR Audit — Tableau de bord',
  };
}

// ============================================================================
// Rendu Excel (multi-feuilles)
// ============================================================================
const INDIGO = 'FF6366F1';
function styleHeaderRow(row: any): void {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
}
function borderEveryRow(sheet: any): void {
  sheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return;
    row.eachCell((cell: any) => {
      if (!cell) return;
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });
}

export async function buildIndicatorWorkbookBuffer(report: IndicatorReport): Promise<Buffer> {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SISAR Audit';
  workbook.created = new Date();

  // Feuille 1 : Synthèse (KPIs + indicateurs)
  const synth = workbook.addWorksheet('Synthèse', { views: [{ state: 'frozen', ySplit: 1 }] });
  synth.columns = [
    { header: 'Indicateur', key: 'label', width: 42 },
    { header: 'Valeur', key: 'value', width: 26 },
  ];
  for (const kpi of report.kpis) synth.addRow({ label: kpi.label, value: kpi.value });
  for (const m of report.metrics) synth.addRow({ label: m.label, value: m.value });
  styleHeaderRow(synth.getRow(1));
  borderEveryRow(synth);
  synth.autoFilter = { from: 'A1', to: `B${synth.rowCount}` };

  // Une feuille par section non vide
  for (const section of report.sections) {
    const sheetName = section.title.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Section';
    const sheet = workbook.addWorksheet(sheetName);
    sheet.addRow(section.headers);
    styleHeaderRow(sheet.getRow(1));
    sheet.columns = section.headers.map((h, i) => ({ header: h, key: String(i), width: i === 1 ? 50 : 24 }));
    for (const row of section.rows) sheet.addRow(row);
    borderEveryRow(sheet);
    const lastCol = String.fromCharCode(64 + section.headers.length);
    if (section.rows.length > 0) {
      sheet.autoFilter = { from: 'A1', to: `${lastCol}${sheet.rowCount}` };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================================
// Rendu HTML (PDF paysage) — le rendu final est assuré par generatePDF
// ============================================================================
export function buildIndicatorReportHtml(report: IndicatorReport): string {
  const logo = logoDataUrl();
  const kpiCells: string[] = [];
  for (const kpi of report.kpis) {
    kpiCells.push(
      `<td class="kpi-cell"><div class="kpi-label">${escapeHtml(kpi.label)}</div><div class="kpi-value">${escapeHtml(kpi.value)}</div></td>`
    );
  }
  // Rangées de 2 KPIs
  let kpiRows = '';
  for (let i = 0; i < kpiCells.length; i += 2) {
    kpiRows += `<tr>${kpiCells[i]}${kpiCells[i + 1] ?? '<td class="kpi-cell"></td>'}</tr>`;
  }

  const metricRows = report.metrics
    .map((m) => `<tr><td>${escapeHtml(m.label)}</td><td class="num">${escapeHtml(m.value)}</td></tr>`)
    .join('');

  const sectionsHtml = report.sections
    .map((s) => {
      const head = s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
      const body = s.rows
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`)
        .join('');
      return `<h2>${escapeHtml(s.title)}</h2><table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; }
  .header { background: linear-gradient(135deg, #0f172a, #1e3a5f); color: #fff; border-radius: 10px; padding: 14px 22px; }
  .header-logo-row { margin-bottom: 8px; }
  .header-logo { height: 42px; }
  .header h1 { margin: 0; font-size: 20px; letter-spacing: .5px; }
  .header p { margin: 4px 0 0; font-size: 11px; color: #cbd5e1; }
  h2 { font-size: 12px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #6366f1; padding-bottom: 4px; margin: 18px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  table.kpis { margin: 14px 0 4px; }
  td.kpi-cell { width: 50%; background: #f1f5f9; border-radius: 8px; padding: 8px 12px; }
  .kpi-label { font-size: 8px; text-transform: uppercase; letter-spacing: .4px; color: #64748b; }
  .kpi-value { font-size: 18px; font-weight: 700; color: #1e293b; }
  table.data th { background: #f1f5f9; color: #334155; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: .4px; padding: 6px 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
  table.data td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; }
  table.data tr:nth-child(even) td { background: #f8fafc; }
  td.num { font-weight: 600; }
  .footer { text-align: center; color: #94a3b8; font-size: 8px; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<div class="header-logo-row"><img class="header-logo" src="${logo}" alt="SOREPCO" /></div>` : ''}
    <h1>${escapeHtml(report.title)}</h1>
    <p>${escapeHtml(report.subtitle)}</p>
  </div>
  <table class="kpis"><tbody>${kpiRows}</tbody></table>
  ${metricRows ? `<h2>Indicateurs</h2><table class="data"><thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead><tbody>${metricRows}</tbody></table>` : ''}
  ${sectionsHtml}
  <div class="footer">${escapeHtml(report.footer)}</div>
</body>
</html>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
