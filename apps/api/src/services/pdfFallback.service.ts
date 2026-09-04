// ============================================================================
// PDF FALLBACK — Moteur de secours 100 % JavaScript (aucun navigateur requis)
// ============================================================================
//
// Pourquoi ce fichier ?
//   Toute la génération PDF de l'app passe normalement par Puppeteer/Chromium
//   (report.service.generatePDF). Si Chromium est indisponible (binaire absent
//   ou corrompu, dépendances système manquantes, OOM, crash au lancement...),
//   AUCUN repli interne à Puppeteer ne fonctionne => erreur 500 pour l'utilisateur.
//
// Ce module garantit qu'un PDF est TOUJOURS généré, même si Chromium est mort :
//   - moteur : pdfmake (pur JS, sans dépendance native, polices embarquées) ;
//   - rendu : « mode dégradé » — données complètes, mise en page structurée et
//     fidèle à l'identité visuelle des documents HTML (couleurs, bandeaux,
//     tableaux, signatures). Certains effets CSS (dégradés, grilles flex/grid,
//     ombres, arrondis) ne sont pas reproductibles en PDF vectoriel.
//
// Les constructeurs prennent exactement les MÊMES objets que les builders HTML
// (mission, missions, items d'export) => pas de nouvelle requête DB.

/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import fs from 'fs';
import { ROOT_PATH } from '../config/storage';

// pdfmake 0.3 : module CommonJS. Polices Roboto embarquées via le virtualfs.
const pdfMake: any = require('pdfmake/build/pdfmake');
const vfsFonts: any = require('pdfmake/build/vfs_fonts');

let fontsReady = false;
/** Charge les polices Roboto dans le virtualfs pdfmake (idempotent). */
function ensureFonts(): void {
  if (fontsReady) return;
  try {
    for (const [file, data] of Object.entries(vfsFonts)) {
      if (typeof data === 'string') {
        pdfMake.virtualfs.writeFileSync(file, Buffer.from(data, 'base64'));
      }
    }
    fontsReady = true;
  } catch (err) {
    console.error('[pdfFallback] Échec chargement des polices :', (err as Error).message);
  }
}

/** Largeur utile A4 = 595.28pt - marges gauche/droite. */
const CONTENT_W = 595.28 - 42 - 42;

// ── Palette partagée (miroir des templates HTML) ───────────────────────────
const C = {
  ink: '#1e293b',
  muted: '#475569',
  faint: '#94a3b8',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  thBg: '#f1f5f9',
  thText: '#334155',
  rowBg: '#f8fafc',
  cardBg: '#f8fafc',

  // Rapport (indigo/bleu)
  reportBand: '#4f46e5',
  reportAccent: '#6366f1',

  // Ordre / Fiche infos (navy + vert)
  navy: '#0f172a',
  navy2: '#1e3a5f',
  green: '#10b981',
  greenDark: '#065f46',
  greenBorder: '#a7f3d0',
  greenBg: '#f0fdf4',

  // Protocole (vert émeraude)
  protoBand: '#059669',
  protoTitle: '#065f46',

  // Exports
  exportGreen: '#059669',
  exportBlue: '#2563eb',
};

// ── Formatters ──────────────────────────────────────────────────────────────
function fmtDate(v?: any, long = true): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', long
    ? { day: '2-digit', month: 'long', year: 'numeric' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function todayStr(): string {
  return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function nowStr(): string {
  return `${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;
}

// ── Helpers données (miroir des builders HTML) ─────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifiée',
  READY: 'Prête',
  IN_PROGRESS: 'En cours',
  REVIEW: 'En relecture',
  UNDER_REVIEW: 'En relecture',
  COMPLETED: 'Terminée',
  APPROVED: 'Approuvée',
  CLOSED: 'Clôturée',
  CANCELLED: 'Annulée',
};

function statusLabel(code?: string): string {
  if (!code) return '-';
  return STATUS_LABELS[code] ?? code;
}

/** Couleur texte d'un statut (approximation des pastilles HTML). */
function statusColor(code?: string): string {
  const s = (code ?? '').toLowerCase();
  if (s.includes('planned')) return '#1e40af';
  if (s.includes('progress')) return '#065f46';
  if (s.includes('review')) return '#92400e';
  if (s.includes('approved')) return '#047857';
  if (s.includes('closed') || s.includes('completed')) return '#334155';
  if (s.includes('cancel')) return '#991b1b';
  if (s.includes('ready')) return '#1d4ed8';
  return '#475569';
}

function riskColor(name?: string | null): string {
  switch ((name ?? '').toLowerCase().trim()) {
    case 'critique': return '#b91c1c';
    case 'majeur': return '#b45309';
    case 'mineur': return '#047857';
    case 'faible': return '#0369a1';
    default: return '#475569';
  }
}

function memberName(m: any): string {
  if (!m) return '-';
  if (m.user) return `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || '-';
  if (m.glpiUser) return m.glpiUser.fullName || m.glpiUser.email || '-';
  return m.externalParticipant?.fullName || '-';
}

function memberEmail(m: any): string {
  return m?.user?.email || m?.glpiUser?.email || m?.externalParticipant?.email || '-';
}

function recoAffectation(r: any): string {
  const parts = [
    r?.assigneeName,
    r?.assigneeUser ? `${r.assigneeUser.firstName ?? ''} ${r.assigneeUser.lastName ?? ''}`.trim() : null,
    r?.assigneeGlpiUser?.email,
  ].filter(Boolean);
  return parts.join(' / ') || '-';
}

let _logoDataUrl = '';
function logoDataUrl(): string {
  if (_logoDataUrl) return _logoDataUrl;
  try {
    const p = path.join(ROOT_PATH, 'template/logo.png');
    if (fs.existsSync(p)) {
      _logoDataUrl = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
    }
  } catch (err) {
    console.warn('[pdfFallback] Logo illisible :', (err as Error).message);
  }
  return _logoDataUrl;
}

// ── Helpers de mise en page ─────────────────────────────────────────────────
/** Bandeau coloré pleine largeur (remplace les dégradés CSS par une couleur unie proche). */
function band(content: any, bg: string, opts: { padX?: number; padY?: number; margin?: number[] } = {}): any {
  return {
    table: { widths: ['*'], body: [[{ stack: Array.isArray(content) ? content : [content] }]] },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => bg,
      paddingLeft: () => opts.padX ?? 20,
      paddingRight: () => opts.padX ?? 20,
      paddingTop: () => opts.padY ?? 14,
      paddingBottom: () => opts.padY ?? 14,
    },
    margin: opts.margin ?? [0, 0, 0, 0],
  };
}

/** Bandeau haut logo + organisation (utilisé par Ordre / Fiche / Protocole). */
function orgBanner(mission: any, opts: { bandBg: string; light?: boolean }): any {
  const logo = logoDataUrl();
  const light = opts.light ?? false;
  const nameColor = light ? C.greenDark : '#ffffff';
  const codeColor = light ? C.green : '#cbd5e1';
  const orgName = mission?.tenant?.name ?? 'Organisation';
  const orgCode = mission?.tenant?.code ?? '';
  const left = logo
    ? { image: logo, fit: [110, 46], alignment: 'left' as const }
    : { text: ' ', fontSize: 4 };
  return band(
    {
      columns: [
        { width: 'auto', ...left, margin: [0, 2, 0, 0] },
        {
          width: '*',
          stack: [
            { text: orgName, fontSize: 15, bold: true, color: nameColor },
            ...(orgCode ? [{ text: orgCode, fontSize: 9, bold: true, color: codeColor, margin: [0, 2, 0, 0] }] : []),
          ],
          alignment: 'right',
        },
      ],
    },
    opts.bandBg,
    { padX: 24, padY: 14 }
  );
}

/** Barre de titre document : titre + référence. */
function titleBar(title: string, ref: string, opts: { bg?: string; text?: string; refChip?: string; align?: 'left' | 'center' } = {}): any {
  const bg = opts.bg ?? '#f8fafc';
  const textColor = opts.text ?? '#0f172a';
  const align = opts.align ?? 'left';
  const stack = [
    {
      text: title.toUpperCase(),
      fontSize: align === 'center' ? 17 : 15,
      bold: true,
      color: textColor,
      alignment: align,
      characterSpacing: 0.6,
    },
    { text: ref, fontSize: 9, color: align === 'center' ? '#d9fbe8' : '#64748b', bold: true, alignment: align, margin: [0, 3, 0, 0] },
  ];
  // Ligne de titre + référence (le "chip" arrondi HTML n'est pas reproductible ici)
  const content = align === 'center'
    ? stack
    : { columns: [{ width: '*', text: title.toUpperCase(), fontSize: 15, bold: true, color: textColor, characterSpacing: 0.6 }, { width: 'auto', text: ref, fontSize: 9, bold: true, color: '#475569', margin: [0, 4, 0, 0], alignment: 'center' }] };
  return band(content, bg, { padX: 24, padY: 12, margin: [0, 0, 0, 14] });
}

/** Titre de section avec soulignement coloré (remplace .section-title + .dot). */
function sectionTitle(label: string, accent = C.reportAccent, color = '#0f172a'): any {
  return [
    { text: label, style: 'sectionTitle', color, margin: [0, 12, 0, 2] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 1.6, lineColor: accent }], margin: [0, 0, 0, 6] },
  ];
}

function paragraph(text?: string | null, opts: any = {}): any {
  return { text: text || '-', style: 'paragraph', ...opts };
}

/** Ligne de cartes d'infos (label + valeur), façon .info-card / .info-grid. */
function infoCards(entries: Array<{ label: string; value: string; highlight?: boolean; full?: boolean; color?: string }>, cols = 2): any {
  const body: any[] = [];
  let row: any[] = [];
  const flush = () => {
    if (row.length) {
      while (row.length < cols) row.push({ text: '' });
      body.push(row);
      row = [];
    }
  };
  for (const e of entries) {
    const cell = {
      stack: [
        { text: e.label.toUpperCase(), style: 'cardLabel' },
        { text: e.value || '-', style: e.highlight ? 'cardValueHl' : 'cardValue', color: e.color },
      ],
    };
    if (e.full) {
      flush();
      body.push([cell]);
    } else {
      row.push(cell);
      if (row.length === cols) flush();
    }
  }
  flush();
  return {
    table: { widths: Array(cols).fill('*'), body },
    layout: {
      hLineColor: () => '#ffffff',
      vLineColor: () => '#ffffff',
      hLineWidth: () => 2,
      vLineWidth: () => 2,
      fillColor: () => C.cardBg,
      paddingLeft: () => 12,
      paddingRight: () => 12,
      paddingTop: () => 8,
      paddingBottom: () => 8,
    },
    margin: [0, 4, 0, 10],
  };
}

/** Grille de statistiques (façon .synthese-card du rapport). */
function statGrid(items: Array<{ label: string; value: string | number }>, cols = 3): any {
  const rows: any[] = [];
  for (let i = 0; i < items.length; i += cols) {
    const slice = items.slice(i, i + cols);
    while (slice.length < cols) slice.push({ label: ' ', value: '' });
    rows.push(
      slice.map((s) => ({
        stack: [
          { text: s.label.toUpperCase(), style: 'statLabel' },
          { text: String(s.value), style: 'statValue' },
        ],
        alignment: 'center',
      }))
    );
  }
  return {
    table: { widths: Array(cols).fill('*'), body: rows },
    layout: {
      hLineColor: () => '#ffffff',
      vLineColor: () => '#ffffff',
      hLineWidth: () => 2.5,
      vLineWidth: () => 2.5,
      fillColor: () => '#f1f5f9',
      paddingTop: () => 10,
      paddingBottom: () => 10,
    },
    margin: [0, 14, 0, 14],
  };
}

interface TableOpts {
  headers: string[];
  rows: any[][];
  widths?: Array<string | number>;
  headerBg?: string;
  thColor?: string;
  thSize?: number;
}

/** Tableau de données (en-tête répété, zébrures, bordures façon templates HTML). */
function dataTable(o: TableOpts): any {
  const thColor = o.thColor ?? C.thText;
  const headerBg = o.headerBg ?? C.thBg;
  const body: any[] = [
    o.headers.map((h) => ({ text: h.toUpperCase(), style: 'th', color: thColor, fontSize: o.thSize ?? 7.5 })),
    ...o.rows.map((r) => r.map((c) => (c !== null && typeof c === 'object' ? c : { text: c == null || c === '' ? '-' : String(c) }))),
  ];
  return {
    table: { headerRows: 1, widths: o.widths ?? o.headers.map(() => '*'), body },
    layout: {
      hLineColor: (i: number) => (i === 0 ? C.borderStrong : C.border),
      vLineColor: () => C.border,
      hLineWidth: (i: number) => (i === 0 ? 1.1 : 0.4),
      vLineWidth: () => 0.4,
      fillColor: (ri: number) => (ri === 0 ? headerBg : ri % 2 === 0 ? C.rowBg : null),
      paddingLeft: () => 7,
      paddingRight: () => 7,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
    margin: [0, 2, 0, 12],
  };
}

/** Zone de signatures (2 blocs centrés avec ligne). */
function signatureBlocks(blocks: Array<{ title: string; name: string; label?: string }>): any {
  const cells = blocks.map((b) => ({
    stack: [
      { text: b.title.toUpperCase(), style: 'sigTitle' },
      { text: b.name || ' ', style: 'sigName', margin: [0, 12, 0, 0] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 0.7, lineColor: '#94a3b8' }], margin: [0, 26, 0, 0], alignment: 'center' },
      { text: (b.label ?? 'Signature').toUpperCase(), style: 'sigLabel', margin: [0, 3, 0, 0] },
    ],
    alignment: 'center',
  }));
  return {
    table: { widths: ['*', '*'], body: [cells] },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
    margin: [0, 14, 0, 0],
  };
}

/** Encadré de mention (façon .mention-box, fond ambré). */
function mentionBox(text: string): any {
  return {
    table: {
      widths: ['*'],
      body: [[
        {
          stack: [
            { text: 'Important : ', bold: true, color: '#78350f', fontSize: 9 },
            { text, fontSize: 9, color: '#92400e', lineHeight: 1.45 },
          ],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => '#fffbeb',
      paddingLeft: () => 12,
      paddingRight: () => 12,
      paddingTop: () => 8,
      paddingBottom: () => 8,
    },
    margin: [0, 14, 0, 14],
  };
}

/** Membre de l'équipe : ligne réutilisable. */
function memberRow(m: any): any[] {
  return [
    { text: memberName(m), bold: true },
    { text: memberEmail(m) },
    { text: m?.roleInMission || '-' },
    { text: m?.isLead ? 'Oui' : 'Non', alignment: 'center' },
  ];
}

function scopeRowsData(scopes: any[], withRole: boolean): any[][] {
  return (scopes ?? []).map((s: any, i: number) => {
    const cells: any[] = [
      { text: i + 1, alignment: 'center' },
      { text: s.auditableEntity?.name || '-' },
      { text: s.auditableEntity?.code || '-', color: C.muted },
      { text: s.auditableEntity?.entityType || '-', color: C.muted },
    ];
    if (withRole) cells.push({ text: s.scopeRole || '-', color: C.muted });
    return cells;
  });
}

// ============================================================================
// 1) RAPPORT DE MISSION
// ============================================================================
export function buildReportFallbackDoc(mission: any): any {
  const findings = mission?.findings ?? [];
  const recos = findings.flatMap((f: any) => f?.recos ?? []);
  const ticketLinks = findings.flatMap((f: any) =>
    (f?.recos ?? []).flatMap((r: any) =>
      (r?.ticketLinks ?? []).map((link: any) => ({
        link,
        recoTitle: r.title || '-',
        findingTitle: f.title || '-',
      }))
    )
  );
  const nbCritique = findings.filter((f: any) => f?.riskLevel?.name?.toLowerCase() === 'critique').length;
  const nbMajeur = findings.filter((f: any) => f?.riskLevel?.name?.toLowerCase() === 'majeur').length;
  const nbMineur = findings.filter((f: any) => f?.riskLevel?.name?.toLowerCase() === 'mineur').length;
  const today = todayStr();
  const leaderName = mission?.leader ? `${mission.leader.firstName ?? ''} ${mission.leader.lastName ?? ''}`.trim() : '-'

  const logo = logoDataUrl();
  const content: any[] = [
    // Bandeau supérieur
    band(
      [
        {
          columns: [
            { width: 'auto', ...(logo ? { image: logo, fit: [110, 46], margin: [0, 2, 0, 0] } : { text: ' ' }) },
            { width: '*', stack: [{ text: `Rapport généré le ${today}`, fontSize: 9.5, color: '#e0e7ff', alignment: 'right' }] },
          ],
        },
        { text: "RAPPORT D'AUDIT", fontSize: 19, bold: true, color: '#ffffff', margin: [0, 14, 0, 0], characterSpacing: 1 },
        { text: mission?.title || '', fontSize: 10.5, color: '#e0e7ff', margin: [0, 5, 0, 0] },
        {
          columns: [
            { width: '*', text: `Chef de mission : ${leaderName}`, fontSize: 8, bold: true, color: '#e0e7ff' },
            { width: '*', text: `Plan : ${mission?.plan?.title ?? '-'} (${mission?.plan?.year ?? '-'})`, fontSize: 8, bold: true, color: '#e0e7ff' },
            { width: '*', text: `Période : ${mission?.startDate ? fmtDate(mission.startDate, false) : '-'} — ${mission?.endDate ? fmtDate(mission.endDate, false) : '-'}`, fontSize: 8, bold: true, color: '#e0e7ff' },
            { width: 'auto', text: `Nb. constats : ${findings.length}`, fontSize: 8, bold: true, color: '#e0e7ff' },
          ],
          margin: [0, 12, 0, 0],
        },
      ],
      C.reportBand,
      { padX: 24, padY: 16, margin: [0, 0, 0, 6] }
    ),
    // Synthèse
    statGrid([
      { label: 'Constats', value: findings.length },
      { label: 'Recommandations', value: recos.length },
      { label: 'Tickets GLPI', value: ticketLinks.length },
      { label: 'Critiques', value: nbCritique },
      { label: 'Majeurs', value: nbMajeur },
      { label: 'Mineurs', value: nbMineur },
    ]),
  ];

  const section = (title: string, bodyText?: string | null) => {
    if (!bodyText) return [];
    return [...sectionTitle(title), paragraph(bodyText)];
  };
  content.push(...section('Contexte de la mission', mission?.description));
  content.push(...section("Objectifs de l'audit", mission?.objective));
  content.push(...section("Périmètre de l'audit", mission?.scopeDescription));
  content.push(...section('Méthodologie', mission?.methodology));

  // Synthèse des constats
  content.push(...sectionTitle('Synthèse des constats'));
  content.push(
    dataTable({
      headers: ['#', 'Constat', 'Niveau de risque', 'Cause', 'Impact', 'Score'],
      widths: [24, '*', 80, '*', '*', 40],
      rows: findings.map((f: any, i: number) => [
        { text: i + 1, alignment: 'center' },
        { text: f?.title || '-', bold: true },
        { text: f?.riskLevel?.name || '-', color: riskColor(f?.riskLevel?.name), bold: true },
        { text: f?.cause || '-', color: C.muted },
        { text: f?.impact || '-', color: C.muted },
        { text: f?.severityScore ? String(f.severityScore) : '-', alignment: 'center' },
      ]),
    })
  );

  // Recommandations
  content.push(...sectionTitle('Recommandations'));
  content.push(
    dataTable({
      headers: ['#', 'Titre', "Plan d'action", 'Date cible', 'Département', 'Affectation', 'Statut'],
      widths: [24, '*', '*', 70, 70, '*', 50],
      rows: recos.map((r: any, i: number) => [
        { text: i + 1, alignment: 'center' },
        { text: r?.title || '-', bold: true },
        { text: r?.actionPlan || '-', color: C.muted },
        { text: r?.targetDate ? fmtDate(r.targetDate, false) : '-', alignment: 'center' },
        { text: r?.department?.name || '-', color: C.muted },
        { text: recoAffectation(r), color: C.muted },
        { text: r?.status || '-', color: statusColor(r?.status), bold: true },
      ]),
    })
  );

  // Plan d'action détaillé
  content.push(...sectionTitle("Plan d'action"));
  content.push(
    dataTable({
      headers: ['#', 'Action (Recommandation)', "Plan d'action détaillé", 'Date prévue', 'Département responsable', 'Responsable(s)', 'Statut'],
      widths: [24, '*', '*', 68, '*', '*', 50],
      rows: recos.map((r: any, i: number) => [
        { text: i + 1, alignment: 'center' },
        { text: r?.title || '-', bold: true },
        { text: r?.actionPlan || '-', color: C.muted },
        { text: r?.targetDate ? fmtDate(r.targetDate, false) : '-', alignment: 'center' },
        { text: r?.department?.name || '-', color: C.muted },
        { text: recoAffectation(r), color: C.muted },
        { text: r?.status || '-', color: statusColor(r?.status), bold: true },
      ]),
    })
  );

  // Tickets GLPI
  content.push(...sectionTitle('Tickets GLPI liés à la mission'));
  if (ticketLinks.length === 0) {
    content.push(paragraph('Aucun ticket GLPI lié à cette mission.', { italics: true }));
  } else {
    content.push(
      dataTable({
        headers: ['#', 'N° Ticket', 'Titre', 'Statut', 'Priorité', 'Demandeur', 'Assigné à', 'Constat', 'Recommandation'],
        widths: [20, 46, '*', 42, 40, '*', '*', '*', '*'],
        thSize: 6.5,
        rows: ticketLinks.map((item: any, i: number) => {
          const t = item.link?.ticket;
          return [
            { text: i + 1, alignment: 'center' },
            { text: t?.ticketNumber ?? t?.glpiId ?? '-', bold: true },
            { text: t?.title || '-', bold: true },
            { text: t?.status || '-', color: C.muted },
            { text: t?.priority || '-', color: C.muted },
            { text: t?.requesterGlpiUser?.fullName || '-', color: C.muted },
            { text: t?.assigneeGlpiUser?.fullName || '-', color: C.muted },
            { text: item.findingTitle, color: C.muted },
            { text: item.recoTitle, color: C.muted },
          ];
        }),
      })
    );
  }

  // Conclusion
  content.push(...section('Conclusion', mission?.conclusion));

  // Commentaires hiérarchiques (direction / encadrement)
  content.push(...sectionTitle('Commentaires hiérarchiques'));
  const hc: any[] = mission?.hierarchyComments ?? [];
  if (hc.length === 0) {
    content.push(paragraph('Aucun commentaire hiérarchique pour cette mission.', { italics: true }));
  } else {
    const hcTypeLabels: Record<string, string> = {
      DIRECTOR_CONCLUSION: 'Conclusions direction',
      MANAGER_OBSERVATION: 'Observations managers',
      INTERNAL_DISCUSSION: 'Discussions internes',
    };
    const hcColors: Record<string, string> = {
      DIRECTOR_CONCLUSION: '#4f46e5',
      MANAGER_OBSERVATION: '#b45309',
      INTERNAL_DISCUSSION: '#0e7490',
    };
    for (const c of hc) {
      const type = String(c?.type ?? '');
      const author = c?.createdBy ? `${c.createdBy.firstName ?? ''} ${c.createdBy.lastName ?? ''}`.trim() : '';
      const date = c?.createdAt ? fmtDate(c.createdAt, false) : '';
      const attachments = (c?.documents ?? []).map((d: any) => d?.originalName).filter(Boolean);
      const box: any[] = [
        {
          columns: [
            {
              width: 'auto',
              text: (hcTypeLabels[type] || type || 'Commentaire').toUpperCase(),
              fontSize: 6.8,
              bold: true,
              color: hcColors[type] || '#64748b',
              characterSpacing: 0.4,
            },
            {
              width: '*',
              text: [author, date].filter(Boolean).join(' · ') || '—',
              fontSize: 7.5,
              color: '#94a3b8',
              alignment: 'right',
            },
          ],
        },
        { text: c?.title || '—', fontSize: 10.5, bold: true, color: '#1e293b', margin: [0, 5, 0, 0] },
      ];
      if (c?.parentComment?.title) {
        box.push({ text: `En réponse à : ${c.parentComment.title}`, fontSize: 8, italics: true, color: '#94a3b8', margin: [0, 2, 0, 0] });
      }
      box.push({ text: c?.content || '—', fontSize: 9.5, color: '#475569', lineHeight: 1.4, margin: [0, 3, 0, 0] });
      box.push({ text: `Pièces jointes : ${attachments.length ? attachments.join(', ') : 'aucune'}`, fontSize: 7.5, color: '#64748b', margin: [0, 6, 0, 0] });
      content.push({
        table: { widths: ['*'], body: [[{ stack: box }]] },
        layout: {
          hLineColor: () => C.border,
          vLineColor: () => C.border,
          hLineWidth: () => 0.4,
          vLineWidth: () => 0.4,
          fillColor: () => '#ffffff',
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
        margin: [0, 0, 0, 8],
      });
    }
  }

  // Signatures
  content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 1, lineColor: C.border }], margin: [0, 22, 0, 0] });
  content.push(
    signatureBlocks([
      { title: 'Auditeur', name: leaderName, label: 'Signature' },
      { title: 'Chef Service Audit', name: '________________________', label: 'Signature' },
    ])
  );

  const footerText = `Rapport généré automatiquement le ${today} — Ce document est confidentiel et destiné exclusivement aux parties mentionnées.`;
  return withFooter(footerText, content);
}

// ============================================================================
// 2) ORDRE DE MISSION
// ============================================================================
export function buildMissionOrderFallbackDoc(mission: any): any {
  const orgName = mission?.tenant?.name ?? 'Organisation';
  const ref = `OM-${mission?.plan?.year ?? new Date().getFullYear()}-${String(mission?.id ?? 0).padStart(4, '0')}`;
  const leaderName = mission?.leader ? `${mission.leader.firstName ?? ''} ${mission.leader.lastName ?? ''}`.trim() : '-';
  const today = todayStr();
  const members = mission?.members ?? [];
  const scopes = mission?.scopes ?? [];

  const content: any[] = [
    orgBanner(mission, { bandBg: C.navy }),
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 3, lineColor: C.green }], margin: [0, -1, 0, 0] },
    titleBar('Ordre de Mission', ref, { bg: '#f8fafc', text: '#0f172a' }),
    infoCards([
      { label: "Mission d'audit", value: mission?.title || '-', highlight: true, full: true },
      { label: "Référence du plan", value: mission?.plan?.title ? `${mission.plan.title} — ${mission.plan.year ?? ''}` : `Plan d'audit ${mission.plan?.year ?? ''} — ${mission.plan?.year ?? ''}` },
      { label: "Type d'audit", value: mission?.auditType?.name ?? 'Non spécifié' },
      { label: 'Chef de mission', value: leaderName },
      { label: 'Date de début', value: mission?.startDate ? fmtDate(mission.startDate) : 'À définir' },
      { label: 'Date de fin', value: mission?.endDate ? fmtDate(mission.endDate) : 'À définir' },
      { label: "Date d'émission du document", value: today, full: true },
    ]),
  ];

  content.push(...sectionTitle('Objectif de la mission', C.green));
  content.push(paragraph(mission?.objective || mission?.description));

  content.push(...sectionTitle("Périmètre d'intervention", C.green));
  if (mission?.scopeDescription) content.push(paragraph(mission.scopeDescription, { margin: [0, 0, 0, 6] }));
  if (scopes.length > 0) {
    content.push(dataTable({
      headers: ['#', 'Entité / Site', 'Code', 'Type', 'Rôle dans le périmètre'],
      widths: [28, '*', 70, 70, '*'],
      rows: scopeRowsData(scopes, true),
    }));
  } else {
    content.push(paragraph('Aucune entité définie dans le périmètre.', { italics: true }));
  }

  content.push(...sectionTitle("Équipe d'audit", C.green));
  if (members.length > 0) {
    content.push(dataTable({
      headers: ['#', 'Nom complet', 'Rôle', 'Responsable'],
      widths: [28, '*', '*', 80],
      rows: members.map((m: any, i: number) => [
        { text: i + 1, alignment: 'center' },
        { text: memberName(m), bold: true },
        { text: m?.roleInMission || '-' },
        { text: m?.isLead ? 'Oui' : 'Non', alignment: 'center' },
      ]),
    }));
  } else {
    content.push(paragraph('Aucun membre assigné.', { italics: true }));
  }

  if (mission?.methodology) {
    content.push(...sectionTitle('Méthodologie', C.green));
    content.push(paragraph(mission.methodology));
  }

  content.push(mentionBox(
    "Le présent ordre de mission autorise l'équipe d'audit désignée ci-dessus à accéder aux locaux, documents et systèmes d'information des entités figurant dans le périmètre d'intervention, dans le cadre exclusif de cette mission. Toute personne sollicitée est tenue de coopérer pleinement avec l'équipe d'audit conformément à la charte d'audit interne."
  ));

  content.push(signatureBlocks([
    { title: 'Chef de mission', name: leaderName, label: 'Signature' },
    { title: "Directeur de l'Audit Interne", name: '________________________', label: 'Signature et cachet' },
  ]));

  const footerText = `${orgName} — Document généré automatiquement le ${today} — Réf. ${ref} — Ce document est confidentiel et destiné exclusivement aux parties mentionnées.`;
  return withFooter(footerText, content);
}

// ============================================================================
// 3) FICHE D'INFORMATIONS MISSION
// ============================================================================
export function buildMissionInfoFallbackDoc(mission: any): any {
  const orgName = mission?.tenant?.name ?? 'Organisation';
  const ref = `MISSION-${mission?.plan?.year ?? new Date().getFullYear()}-${String(mission?.id ?? 0).padStart(4, '0')}`;
  const leaderName = mission?.leader ? `${mission.leader.firstName ?? ''} ${mission.leader.lastName ?? ''}`.trim() : '-';
  const today = todayStr();
  const members = mission?.members ?? [];
  const scopes = mission?.scopes ?? [];
  const findings = mission?.findings ?? [];
  const status = statusLabel(mission?.status);

  const content: any[] = [
    orgBanner(mission, { bandBg: C.navy }),
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 3, lineColor: C.green }], margin: [0, -1, 0, 0] },
    titleBar("Fiche d'Informations Mission", ref, { bg: '#f8fafc', text: '#0f172a' }),
    infoCards([
      { label: "Mission d'audit", value: mission?.title || '-', highlight: true, full: true },
      { label: 'Statut', value: status, color: statusColor(mission?.status) },
      { label: "Référence du plan", value: mission?.plan?.title ? `${mission.plan.title} — ${mission.plan.year ?? ''}` : `Plan d'audit ${mission.plan?.year ?? ''}` },
      { label: "Type d'audit", value: mission?.auditType?.name ?? 'Non spécifié' },
      { label: 'Chef de mission', value: leaderName },
      { label: 'Date de début', value: mission?.startDate ? fmtDate(mission.startDate) : 'À définir' },
      { label: 'Date de fin', value: mission?.endDate ? fmtDate(mission.endDate) : 'À définir' },
      { label: "Date d'émission du document", value: today, full: true },
    ]),
  ];

  if (mission?.description) {
    content.push(...sectionTitle('Contexte', C.green));
    content.push(paragraph(mission.description));
  }
  if (mission?.objective) {
    content.push(...sectionTitle('Objectif de la mission', C.green));
    content.push(paragraph(mission.objective));
  }

  content.push(...sectionTitle("Périmètre d'intervention", C.green));
  if (mission?.scopeDescription) content.push(paragraph(mission.scopeDescription, { margin: [0, 0, 0, 6] }));
  content.push(scopes.length > 0
    ? dataTable({ headers: ['#', 'Entité / Site', 'Code', 'Type', 'Rôle'], widths: [28, '*', 70, 70, '*'], rows: scopeRowsData(scopes, true) })
    : paragraph('Aucune entité définie dans le périmètre.', { italics: true }));

  content.push(...sectionTitle("Équipe d'audit", C.green));
  content.push(members.length > 0
    ? dataTable({
        headers: ['#', 'Nom complet', 'Email', 'Rôle dans la mission', 'Responsable'],
        widths: [28, '*', '*', '*', 80],
        rows: members.map((m: any, i: number) => [{ text: i + 1, alignment: 'center' }, ...memberRow(m)]),
      })
    : paragraph('Aucun membre assigné.', { italics: true }));

  if (mission?.methodology) {
    content.push(...sectionTitle('Méthodologie', C.green));
    content.push(paragraph(mission.methodology));
  }

  content.push(...sectionTitle(`Constats (${findings.length})`, C.green));
  content.push(findings.length > 0
    ? dataTable({
        headers: ['#', 'Titre', 'Description', 'Risque', 'Cause', 'Impact'],
        widths: [24, '*', '*', 60, '*', '*'],
        rows: findings.map((f: any, i: number) => [
          { text: i + 1, alignment: 'center' },
          { text: f?.title || '-', bold: true },
          { text: f?.description || '-', color: C.muted },
          { text: f?.riskLevel?.name || '-', color: riskColor(f?.riskLevel?.name), bold: true },
          { text: f?.cause || '-', color: C.muted },
          { text: f?.impact || '-', color: C.muted },
        ]),
      })
    : paragraph('Aucun constat enregistré pour cette mission.', { italics: true }));

  const footerText = `${orgName} — Document généré automatiquement le ${today} — Réf. ${ref} — Ce document est confidentiel.`;
  return withFooter(footerText, content);
}

// ============================================================================
// 4) PROTOCOLE DE MISSION D'AUDIT
// ============================================================================
export function buildMissionProtocolFallbackDoc(mission: any): any {
  const orgName = mission?.tenant?.name ?? 'Organisation';
  const ref = `PROTO-${mission?.plan?.year ?? new Date().getFullYear()}-${String(mission?.id ?? 0).padStart(4, '0')}`;
  const leaderName = mission?.leader ? `${mission.leader.firstName ?? ''} ${mission.leader.lastName ?? ''}`.trim() : 'Non assigné';
  const today = todayStr();
  const members = mission?.members ?? [];
  const scopes = mission?.scopes ?? [];
  const programs = mission?.programs ?? [];
  const documents = mission?.documents ?? [];
  const approvals = mission?.approvals ?? [];

  const startDate = mission?.startDate ? fmtDate(mission.startDate) : 'À définir';
  const endDate = mission?.endDate ? fmtDate(mission.endDate) : 'À définir';
  const durationDays = mission?.startDate && mission?.endDate
    ? `${Math.max(1, Math.ceil((new Date(mission.endDate).getTime() - new Date(mission.startDate).getTime()) / 86_400_000) + 1)} jour(s)`
    : 'Non définie';

  const content: any[] = [
    orgBanner(mission, { bandBg: C.greenBg, light: true }),
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 4, lineColor: C.green }], margin: [0, -1, 0, 0] },
    titleBar('Protocole de Mission d\u2019Audit', ref, { bg: C.protoBand, text: '#ffffff', align: 'center' }),
    infoCards([
      { label: "Mission d'audit", value: mission?.title || '-', highlight: true, full: true },
      { label: 'Statut', value: statusLabel(mission?.status), color: statusColor(mission?.status) },
      { label: 'Chef de mission', value: leaderName },
      { label: "Plan d'audit", value: mission?.plan ? `${mission.plan.title ?? ''} (${mission.plan.year ?? ''})` : 'N/A' },
      { label: "Type d'audit", value: mission?.auditType?.name || 'N/A' },
      { label: 'Période', value: `${startDate} — ${endDate}` },
      { label: 'Durée', value: durationDays },
    ]),
  ];

  if (mission?.description) {
    content.push(...sectionTitle('Description', C.green, C.protoTitle));
    content.push(paragraph(mission.description));
  }
  if (mission?.objective) {
    content.push(...sectionTitle('Objet & Objectifs de la mission', C.green, C.protoTitle));
    content.push(paragraph(mission.objective));
  }

  content.push(...sectionTitle('Périmètre de la mission', C.green, C.protoTitle));
  if (mission?.scopeDescription) content.push(paragraph(mission.scopeDescription, { margin: [0, 0, 0, 6] }));
  content.push(scopes.length > 0
    ? dataTable({
        headers: ['#', 'Entité', 'Code', 'Type'],
        widths: [28, '*', 80, 80],
        headerBg: C.greenBg,
        thColor: C.greenDark,
        rows: scopeRowsData(scopes, false),
      })
    : paragraph('Aucune entité dans le périmètre.', { italics: true }));

  if (mission?.methodology) {
    content.push(...sectionTitle("Méthodologie d'audit", C.green, C.protoTitle));
    content.push(paragraph(mission.methodology));
  }

  // Programmes de travail
  content.push(...sectionTitle('Programme(s) de travail', C.green, C.protoTitle));
  if (programs.length === 0) {
    content.push(paragraph('Aucun programme défini.', { italics: true }));
  } else {
    content.push(dataTable({
      headers: ['#', 'Titre', 'Type', 'Procédures', 'Statut'],
      widths: [24, '*', 90, 50, 70],
      headerBg: C.greenBg,
      thColor: C.greenDark,
      rows: programs.map((p: any, i: number) => {
        const procs = p?.procedures ?? [];
        const visible = procs.slice(0, 10);
        const extra = procs.length - visible.length;
        const procLines = visible.map((pr: any) => ({
          text: `${pr?.code ? `${pr.code} — ` : ''}${pr?.title || '-'}`,
          fontSize: 7.8,
          color: '#334155',
          margin: [0, 0.5, 0, 0.5],
        }));
        const titleCell: any = [{ text: p?.title || '-', bold: true }];
        if (procLines.length) {
          titleCell.push({ text: `Procédures (${procs.length})`, fontSize: 6.5, bold: true, color: '#059669', margin: [0, 4, 0, 1] });
          titleCell.push(...procLines);
          if (extra > 0) titleCell.push({ text: `… et ${extra} autre(s) procédure(s)`, fontSize: 6.8, italics: true, color: '#94a3b8', margin: [0, 1, 0, 0] });
        }
        if (p?.objective) {
          titleCell.push({ text: 'Objectif', fontSize: 6.5, bold: true, color: '#64748b', margin: [0, 3, 0, 1] });
          titleCell.push({ text: p.objective, fontSize: 7.5, color: '#475569' });
        }
        return [
          { text: i + 1, alignment: 'center' },
          titleCell,
          { text: p?.programType || '-', color: C.muted },
          { text: String(p?._count?.procedures ?? procs.length), alignment: 'center' },
          { text: p?.status || '-', color: statusColor(p?.status) },
        ];
      }),
    }));
  }

  // Planning
  content.push(...sectionTitle('Planning & Durée prévisionnelle', C.green, C.protoTitle));
  content.push(infoCards([
    { label: 'Début', value: startDate },
    { label: 'Fin', value: endDate },
    { label: 'Durée', value: durationDays },
  ], 3));

  // Membres
  content.push(...sectionTitle('Membres de la mission', C.green, C.protoTitle));
  content.push(members.length > 0
    ? dataTable({
        headers: ['#', 'Nom complet', 'Email', 'Rôle dans la mission', 'Responsable'],
        widths: [28, '*', '*', '*', 80],
        headerBg: C.greenBg,
        thColor: C.greenDark,
        rows: members.map((m: any, i: number) => [{ text: i + 1, alignment: 'center' }, ...memberRow(m)]),
      })
    : paragraph('Aucun membre assigné.', { italics: true }));

  // Documents
  if (documents.length > 0) {
    content.push(...sectionTitle('Documents', C.green, C.protoTitle));
    content.push(dataTable({
      headers: ['#', 'Nom du fichier', "Date d'ajout"],
      widths: [28, '*', 90],
      headerBg: C.greenBg,
      thColor: C.greenDark,
      rows: documents.map((d: any, i: number) => [
        { text: i + 1, alignment: 'center' },
        { text: d?.originalName || '-', bold: true },
        { text: fmtDate(d?.createdAt, false) },
      ]),
    }));
  }

  // Approbations
  if (approvals.length > 0) {
    content.push(...sectionTitle('Approbations', C.green, C.protoTitle));
    content.push(dataTable({
      headers: ['#', 'Approbateur', 'Décision', 'Commentaires', 'Date'],
      widths: [24, '*', 90, '*', 80],
      headerBg: C.greenBg,
      thColor: C.greenDark,
      rows: approvals.map((a: any, i: number) => [
        { text: i + 1, alignment: 'center' },
        { text: `${a?.approver?.firstName ?? ''} ${a?.approver?.lastName ?? ''}`.trim() || '-', bold: true },
        { text: a?.decision || '-', color: statusColor(a?.decision) },
        { text: a?.comments || '-', color: C.muted },
        { text: fmtDate(a?.createdAt, false) },
      ]),
    }));
  }

  const footerText = `${orgName} — Document généré automatiquement le ${today} — Réf. ${ref} — Ce document est confidentiel.`;
  return withFooter(footerText, content);
}

// ============================================================================
// 5) EXPORT — LISTE DES MISSIONS
// ============================================================================
export function buildMissionsListFallbackDoc(missions: any[]): any {
  const now = nowStr();
  const rows = (missions ?? []).map((m: any) => [
    { text: m?.id ?? '-', alignment: 'center' },
    { text: m?.title || '-', bold: true },
    { text: statusLabel(m?.status), color: statusColor(m?.status) },
    { text: m?.leader ? `${m.leader.firstName ?? ''} ${m.leader.lastName ?? ''}`.trim() : '-' },
    { text: m?.plan?.year ? String(m.plan.year) : '-', alignment: 'center' },
    { text: m?.auditType?.name ?? '-', color: C.muted },
    { text: m?.startDate ? fmtDate(m.startDate, false) : '-' },
    { text: m?.endDate ? fmtDate(m.endDate, false) : '-' },
    { text: String(m?._count?.findings ?? 0), alignment: 'center' },
    { text: String(m?._count?.members ?? 0), alignment: 'center' },
  ]);

  const content: any[] = [
    band(
      { stack: [{ text: "Export des Missions d'Audit", fontSize: 16, bold: true, color: '#ffffff' }, { text: `Généré le ${now} — ${(missions ?? []).length} mission(s)`, fontSize: 9.5, color: '#d1fae5', margin: [0, 3, 0, 0] }] },
      C.exportGreen,
      { padX: 20, padY: 12, margin: [0, 0, 0, 12] }
    ),
    dataTable({
      headers: ['ID', 'Titre', 'Statut', 'Chef de mission', 'Plan', "Type d'audit", 'Début', 'Fin', 'Constats', 'Membres'],
      widths: [26, '*', 60, '*', 28, '*', 54, 54, 34, 34],
      thSize: 6.5,
      rows,
    }),
  ];
  return withFooter('SISAR — Système d\u2019Information de Suivi des Audits et Recommandations', content);
}

// ============================================================================
// 6) EXPORT — CONSTATS & RECOMMANDATIONS
// ============================================================================
export function buildFindingsRecommendationsFallbackDoc(items: any[]): any {
  const now = nowStr();
  const content: any[] = [
    band(
      { stack: [{ text: 'Export constats & recommandations', fontSize: 16, bold: true, color: '#ffffff' }, { text: `Généré le ${now}`, fontSize: 9.5, color: '#dbeafe', margin: [0, 3, 0, 0] }] },
      C.exportBlue,
      { padX: 20, padY: 12, margin: [0, 0, 0, 12] }
    ),
  ];

  if (!items || items.length === 0) {
    content.push({ text: 'Aucune mission trouvée pour les filtres appliqués.', fontSize: 11, color: '#64748b' });
    return withFooter('SISAR — Système d\u2019Information de Suivi des Audits et Recommandations', content);
  }

  items.forEach((item: any) => {
    const mission = item?.mission;
    const leaderName = mission?.leader ? `${mission.leader.firstName ?? ''} ${mission.leader.lastName ?? ''}`.trim() : '-';
    // Bloc mission (façon .mission-block)
    content.push({
      table: { widths: ['*'], body: [[{ stack: [{ text: mission ? `Mission #${mission.id} — ${mission.title || ''}` : 'Mission', bold: true, fontSize: 12, color: '#334155' }, { text: `Statut : ${statusLabel(mission?.status)}  |  Chef de mission : ${leaderName}`, fontSize: 8.5, color: '#64748b', margin: [0, 3, 0, 0] }] }]] },
      layout: { hLineColor: () => C.border, vLineColor: () => C.border, hLineWidth: (i: number) => (i === 1 ? 1 : 0.5), vLineWidth: () => 0, fillColor: () => '#f1f5f9', paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 7, paddingBottom: () => 7 },
      margin: [0, 0, 0, 10],
    });

    const findings = item?.findings ?? [];
    const recos = item?.recommendations ?? [];

    content.push({ text: 'CONSTATS', style: 'subSection', color: C.exportBlue, margin: [0, 4, 0, 4] });
    content.push(findings.length > 0
      ? dataTable({
          headers: ['Description', 'Impact', 'Niveau de risque'],
          rows: findings.map((f: any) => [
            { text: f?.description || '', color: C.muted },
            { text: f?.impact || '', color: C.muted },
            { text: f?.riskLevel?.name || '-', color: riskColor(f?.riskLevel?.name), bold: true },
          ]),
        })
      : paragraph('Aucun constat', { italics: true, color: '#94a3b8' }));

    content.push({ text: 'RECOMMANDATIONS', style: 'subSection', color: C.exportBlue, margin: [0, 2, 0, 4] });
    content.push(recos.length > 0
      ? dataTable({
          headers: ['Recommandation', 'Responsable', 'Date cible', 'Statut'],
          widths: ['*', '*', 70, 70],
          rows: recos.map((r: any) => [
            { text: r?.title || '', bold: true },
            { text: r?.assigneeName || '-', color: C.muted },
            { text: r?.targetDate ? fmtDate(r.targetDate, false) : '' },
            { text: statusLabel(r?.status) ?? (r?.status || '-'), color: statusColor(r?.status) },
          ]),
        })
      : paragraph('Aucune recommandation', { italics: true, color: '#94a3b8' }));
  });

  return withFooter('SISAR — Système d\u2019Information de Suivi des Audits et Recommandations', content);
}

// ============================================================================
// EXPORT RÉFÉRENTIEL — LISTES (Entités auditables & Processus métier)
// ============================================================================
export function buildAuditableEntitiesFallbackDoc(items: any[]): any {
  const now = nowStr();
  const content: any[] = [
    band(
      {
        stack: [
          { text: 'Référentiel — Entités auditables', fontSize: 16, bold: true, color: '#ffffff' },
          { text: `Généré le ${now} — ${(items ?? []).length} entité(s)`, fontSize: 9.5, color: '#d1fae5', margin: [0, 3, 0, 0] },
        ],
      },
      C.exportGreen,
      { padX: 20, padY: 12, margin: [0, 0, 0, 12] }
    ),
    dataTable({
      headers: ['Code', 'Nom', 'Type', 'Criticité', 'Département', 'Responsable', 'Statut'],
      widths: [46, '*', '*', '*', '*', '*', 44],
      rows: (items ?? []).map((e: any) => [
        { text: e?.code || '-', bold: true },
        { text: e?.name || '-' },
        { text: e?.entityType || '-' },
        { text: e?.criticality || '-' },
        { text: e?.ownerDepartment?.name || '-' },
        { text: e?.managerUser ? `${e.managerUser.firstName ?? ''} ${e.managerUser.lastName ?? ''}`.trim() : '-' },
        { text: e?.isActive ? 'Actif' : 'Inactif', color: e?.isActive ? '#047857' : '#64748b' },
      ]),
    }),
  ];
  return withFooter('SISAR — Système d\u2019Information de Suivi des Audits et Recommandations', content);
}

export function buildBusinessProcessesFallbackDoc(items: any[]): any {
  const now = nowStr();
  const content: any[] = [
    band(
      {
        stack: [
          { text: 'Référentiel — Processus métier', fontSize: 16, bold: true, color: '#ffffff' },
          { text: `Généré le ${now} — ${(items ?? []).length} processus`, fontSize: 9.5, color: '#d1fae5', margin: [0, 3, 0, 0] },
        ],
      },
      C.exportGreen,
      { padX: 20, padY: 12, margin: [0, 0, 0, 12] }
    ),
    dataTable({
      headers: ['Code', 'Nom', 'Description', 'Entité auditable', 'Département', 'Statut'],
      widths: [46, '*', '*', '*', '*', 44],
      rows: (items ?? []).map((p: any) => [
        { text: p?.code || '-', bold: true },
        { text: p?.name || '-' },
        { text: p?.description || '-' },
        { text: p?.auditableEntity?.name || '-' },
        { text: p?.ownerDepartment?.name || '-' },
        { text: p?.isActive ? 'Actif' : 'Inactif', color: p?.isActive ? '#047857' : '#64748b' },
      ]),
    }),
  ];
  return withFooter('SISAR — Système d\u2019Information de Suivi des Audits et Recommandations', content);
}

// ============================================================================
// RAPPORT D'INDICATEURS (export tableaux de bord) — rendu générique pdfmake
// ============================================================================
export function buildIndicatorReportFallbackDoc(report: any): any {
  const now = nowStr();
  const logo = logoDataUrl();
  const logoCol = logo
    ? [{ width: 'auto', image: logo, fit: [104, 40], margin: [0, 4, 14, 0] }]
    : [];
  const content: any[] = [
    band(
      {
        columns: [
          ...logoCol,
          {
            width: '*',
            stack: [
              { text: report?.title ?? 'Rapport d’indicateurs', fontSize: 16, bold: true, color: '#ffffff' },
              { text: report?.subtitle || `Généré le ${now}`, fontSize: 9.5, color: '#cbd5e1', margin: [0, 3, 0, 0] },
            ],
          },
        ],
      },
      C.navy,
      { padX: 20, padY: 12, margin: [0, 0, 0, 10] }
    ),
  ];

  const kpis: any[] = report?.kpis ?? [];
  if (kpis.length > 0) {
    const body: any[][] = [];
    for (let i = 0; i < kpis.length; i += 2) {
      const cell = (kpi: any) => ({
        stack: [
          { text: String(kpi?.label ?? '').toUpperCase(), fontSize: 6.8, bold: true, color: '#94a3b8', characterSpacing: 0.4 },
          { text: String(kpi?.value ?? '-'), fontSize: 14, bold: true, color: '#1e293b', margin: [0, 2, 0, 0] },
        ],
      });
      body.push([
        kpis[i] ? cell(kpis[i]) : { text: '' },
        kpis[i + 1] ? cell(kpis[i + 1]) : { text: '' },
      ]);
    }
    content.push({
      table: { widths: ['*', '*'], body },
      layout: {
        hLineColor: () => '#ffffff',
        vLineColor: () => '#ffffff',
        hLineWidth: () => 3,
        vLineWidth: () => 3,
        fillColor: () => '#f1f5f9',
        paddingLeft: () => 10,
        paddingRight: () => 10,
        paddingTop: () => 8,
        paddingBottom: () => 8,
      },
      margin: [0, 2, 0, 10],
    });
  }

  const metrics: any[] = report?.metrics ?? [];
  if (metrics.length > 0) {
    content.push({ text: 'INDICATEURS', style: 'sectionTitle', margin: [0, 8, 0, 2] });
    content.push(
      dataTable({
        headers: ['Indicateur', 'Valeur'],
        rows: metrics.map((m) => [{ text: m?.label || '-', bold: true }, { text: m?.value ?? '-', color: C.muted }]),
      })
    );
  }

  for (const section of report?.sections ?? []) {
    if (!section?.headers?.length || !(section?.rows?.length > 0)) continue;
    content.push({ text: String(section.title || '').toUpperCase(), style: 'sectionTitle', margin: [0, 8, 0, 2] });
    content.push(
      dataTable({
        headers: section.headers.map((h: string) => String(h)),
        rows: section.rows.map((r: any[]) => r.map((c) => String(c ?? '-'))),
      })
    );
  }

  const footer = report?.footer || 'SISAR Audit — Rapport d’indicateurs';
  return withFooter(footer, content);
}

// ============================================================================
// LISTE SIMPLE GÉNÉRIQUE (export référentiel : risques, contrôles, types d'audit)
// ============================================================================
export function buildListTableFallbackDoc(opts: { title: string; subtitle?: string; headers: string[]; rows: (string | number)[][] }): any {
  const now = nowStr();
  const content: any[] = [
    band(
      {
        stack: [
          { text: opts.title, fontSize: 16, bold: true, color: '#ffffff' },
          { text: opts.subtitle || `Généré le ${now}`, fontSize: 9.5, color: '#d1fae5', margin: [0, 3, 0, 0] },
        ],
      },
      C.exportGreen,
      { padX: 20, padY: 12, margin: [0, 0, 0, 12] }
    ),
    dataTable({
      headers: opts.headers.map((h) => String(h)),
      rows: opts.rows.map((r) => r.map((c) => String(c ?? '-'))),
    }),
  ];
  return withFooter('SISAR — Système d\u2019Information de Suivi des Audits et Recommandations', content);
}

// ============================================================================
// Enveloppe commune : pied de page + styles + rendu
// ============================================================================
function withFooter(footerText: string, content: any[]): any {
  return {
    content,
    styles: {
      sectionTitle: { fontSize: 11.5, bold: true, characterSpacing: 0.4 },
      cardLabel: { fontSize: 6.8, bold: true, color: '#94a3b8', characterSpacing: 0.6 },
      cardValue: { fontSize: 10.5, bold: false, color: '#1e293b', margin: [0, 2, 0, 0] },
      cardValueHl: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
      statLabel: { fontSize: 6.8, bold: true, color: '#64748b', characterSpacing: 0.5 },
      statValue: { fontSize: 15, bold: true, color: '#3b82f6', margin: [0, 2, 0, 0] },
      paragraph: { fontSize: 9.5, color: '#475569', lineHeight: 1.45, margin: [0, 0, 0, 6] },
      th: { bold: true, characterSpacing: 0.3 },
      sigTitle: { fontSize: 7.5, bold: true, color: '#64748b', characterSpacing: 0.8 },
      sigName: { fontSize: 11, bold: true, color: '#1e293b' },
      sigLabel: { fontSize: 6.5, color: '#94a3b8', characterSpacing: 0.5 },
      subSection: { fontSize: 10.5, bold: true },
      footerText: { fontSize: 7, color: '#94a3b8', alignment: 'center' },
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { width: '*', text: footerText, style: 'footerText' },
        { width: 'auto', text: `${currentPage} / ${pageCount}`, style: 'footerText', alignment: 'right' },
      ],
      margin: [42, 14, 42, 0],
    }),
    info: { title: 'SISAR Audit', author: 'SISAR Audit' },
  };
}

/** Rend un document pdfmake en Buffer PDF (mode dégradé, sans navigateur). */
export async function renderFallbackPdf(doc: any): Promise<Buffer> {
  ensureFonts();
  const fullDoc = {
    pageSize: 'A4',
    pageMargins: [42, 50, 42, 48],
    defaultStyle: { font: 'Roboto', fontSize: 9.5, color: C.ink, lineHeight: 1.3 },
    ...doc,
  };
  const handle = pdfMake.createPdf(fullDoc);
  const buf = await handle.getBuffer();
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}
