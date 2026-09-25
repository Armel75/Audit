// ============================================================================
// EXPORT RÉFÉRENTIEL — Entités auditables & Processus métier (PDF / Excel)
// ============================================================================
// Suit le pattern d'export existant (export.controller.ts) :
//  - Excel : ExcelJS premium (en-tête coloré, bordures, auto-filter) ;
//  - PDF   : HTML → generatePDF (Chromium) avec repli pdfmake automatique.
// Jeu de données identique aux endpoints de consultation
// (/referential/auditable-entities/consult, /referential/business-processes/consult).

import { Request, Response } from 'express';
const prisma = require('@audit/database').default;
import { generatePDF, escapeHtml } from '../services/report.service';
import {
  buildAuditableEntitiesFallbackDoc,
  buildBusinessProcessesFallbackDoc,
  buildListTableFallbackDoc,
  renderFallbackPdf,
} from '../services/pdfFallback.service';

// ── Récupération des données (même périmètre tenant que la consultation) ─────
async function fetchAuditableEntities(tenantId: number): Promise<any[]> {
  return prisma.auditableEntity.findMany({
    where: { tenantId },
    include: {
      parent: { select: { name: true } },
      ownerDepartment: { select: { name: true } },
      managerUser: { select: { firstName: true, lastName: true } },
    },
    orderBy: { code: 'asc' },
  });
}

async function fetchBusinessProcesses(tenantId: number): Promise<any[]> {
  return prisma.businessProcess.findMany({
    where: { tenantId },
    include: {
      auditableEntity: { select: { name: true } },
      ownerDepartment: { select: { name: true } },
    },
    orderBy: { code: 'asc' },
  });
}

// ── Formatage commun ─────────────────────────────────────────────────────────
const managerName = (m?: any): string =>
  m ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || '-' : '-';

const statusLabel = (isActive?: boolean): string => (isActive ? 'Actif' : 'Inactif');

const AUDITABLE_HEADERS = ['Code', 'Nom', 'Type', 'Criticité', 'Département', 'Responsable', 'Statut'];
const PROCESS_HEADERS = ['Code', 'Nom', 'Description', 'Entité auditable', 'Département', 'Statut'];

function auditableRows(entities: any[]): string[][] {
  return entities.map((e) => [
    String(e?.code ?? '-'),
    String(e?.name ?? '-'),
    String(e?.entityType ?? '-'),
    String(e?.criticality ?? '-'),
    String(e?.ownerDepartment?.name ?? '-'),
    managerName(e?.managerUser),
    statusLabel(e?.isActive),
  ]);
}

function processRows(processes: any[]): string[][] {
  return processes.map((p) => [
    String(p?.code ?? '-'),
    String(p?.name ?? '-'),
    String(p?.description ?? '-'),
    String(p?.auditableEntity?.name ?? '-'),
    String(p?.ownerDepartment?.name ?? '-'),
    statusLabel(p?.isActive),
  ]);
}

// ── Excel : génération d'un classeur premium (pur, testable) ─────────────────
export async function buildWorkbookBuffer(opts: {
  sheetName: string;
  headers: string[];
  rows: (string | number)[][];
  widths: number[];
}): Promise<Buffer> {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SISAR Audit';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(opts.sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.columns = opts.headers.map((header, i) => ({ header, key: String(i), width: opts.widths[i] ?? 20 }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  for (const row of opts.rows) sheet.addRow(row);

  sheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return;
    row.eachCell((cell: any) => {
      if (!cell) return;
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  const lastCol = String.fromCharCode(64 + opts.headers.length);
  sheet.autoFilter = { from: 'A1', to: `${lastCol}${sheet.rowCount}` };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ── PDF : HTML premium (pur, testable) — le rendu final passe par generatePDF ─
export function buildListPdfHtml(opts: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
}): string {
  const thead = opts.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const tbody = opts.rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 0; margin: 0; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px 30px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
    .content { padding: 20px 30px; }
    table { width: 100%; border-collapse: collapse; table-layout: auto; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; word-break: break-word; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { text-align: center; color: #94a3b8; font-size: 9px; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(opts.title)}</h1>
    <p>${escapeHtml(opts.subtitle)}</p>
  </div>
  <div class="content">
    <table>
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  </div>
  <div class="footer">SISAR — Système d'Information de Suivi des Audits et Recommandations</div>
</body>
</html>`;
}

// ── Handlers Express ─────────────────────────────────────────────────────────
async function requireTenant(req: Request, res: Response): Promise<number | null> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Non autorisé' });
    return null;
  }
  return tenantId;
}

const today = () => new Date().toLocaleDateString('fr-FR');
const nowFull = () =>
  `${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;

function sendXlsx(res: Response, buffer: Buffer, filename: string): void {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

// — Entités auditables —
export async function exportAuditableEntitiesExcel(req: Request, res: Response) {
  try {
    const tenantId = await requireTenant(req, res);
    if (!tenantId) return;
    const entities = await fetchAuditableEntities(tenantId);
    const buffer = await buildWorkbookBuffer({
      sheetName: 'Entités auditables',
      headers: AUDITABLE_HEADERS,
      rows: auditableRows(entities),
      widths: [10, 36, 18, 16, 22, 24, 10],
    });
    sendXlsx(res, buffer, 'entites_auditables.xlsx');
  } catch (err) {
    console.error('Error exporting auditable entities Excel:', err);
    res.status(500).json({ error: "Erreur lors de l'export Excel des entités auditables" });
  }
}

export async function exportAuditableEntitiesPDF(req: Request, res: Response) {
  try {
    const tenantId = await requireTenant(req, res);
    if (!tenantId) return;
    const entities = await fetchAuditableEntities(tenantId);
    const html = buildListPdfHtml({
      title: 'Entités auditables',
      subtitle: `Généré le ${nowFull()} — ${entities.length} entité(s)`,
      headers: AUDITABLE_HEADERS,
      rows: auditableRows(entities),
    });
    const buffer = await generatePDF(html, () => renderFallbackPdf(buildAuditableEntitiesFallbackDoc(entities)));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="entites_auditables.pdf"');
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting auditable entities PDF:', err);
    res.status(500).json({ error: "Erreur lors de l'export PDF des entités auditables" });
  }
}

// — Processus métier —
export async function exportBusinessProcessesExcel(req: Request, res: Response) {
  try {
    const tenantId = await requireTenant(req, res);
    if (!tenantId) return;
    const processes = await fetchBusinessProcesses(tenantId);
    const buffer = await buildWorkbookBuffer({
      sheetName: 'Processus métier',
      headers: PROCESS_HEADERS,
      rows: processRows(processes),
      widths: [10, 40, 60, 30, 24, 10],
    });
    sendXlsx(res, buffer, 'processus_metier.xlsx');
  } catch (err) {
    console.error('Error exporting business processes Excel:', err);
    res.status(500).json({ error: "Erreur lors de l'export Excel des processus métier" });
  }
}

export async function exportBusinessProcessesPDF(req: Request, res: Response) {
  try {
    const tenantId = await requireTenant(req, res);
    if (!tenantId) return;
    const processes = await fetchBusinessProcesses(tenantId);
    const html = buildListPdfHtml({
      title: 'Processus métier',
      subtitle: `Généré le ${nowFull()} — ${processes.length} processus`,
      headers: PROCESS_HEADERS,
      rows: processRows(processes),
    });
    const buffer = await generatePDF(html, () => renderFallbackPdf(buildBusinessProcessesFallbackDoc(processes)));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="processus_metier.pdf"');
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting business processes PDF:', err);
    res.status(500).json({ error: "Erreur lors de l'export PDF des processus métier" });
  }
}

// ============================================================================
// Exports génériques des listes référentielles (Risques / Contrôles / Types d'audit)
// ============================================================================
type ListExportCfg = {
  title: string;
  sheetName: string;
  baseName: string;
  headers: string[];
  widths: number[];
  fetch: (tenantId: number) => Promise<any[]>;
  rows: (items: any[]) => string[][];
};

async function runListExport(req: Request, res: Response, cfg: ListExportCfg, format: 'pdf' | 'excel'): Promise<void> {
  try {
    const tenantId = await requireTenant(req, res);
    if (!tenantId) return;
    const items = await cfg.fetch(tenantId);
    const rows = cfg.rows(items);
    const subtitle = `Généré le ${nowFull()} — ${items.length} élément(s)`;

    if (format === 'excel') {
      const buffer = await buildWorkbookBuffer({ sheetName: cfg.sheetName, headers: cfg.headers, rows, widths: cfg.widths });
      sendXlsx(res, buffer, `${cfg.baseName}.xlsx`);
    } else {
      const html = buildListPdfHtml({ title: cfg.title, subtitle, headers: cfg.headers, rows });
      const buffer = await generatePDF(html, () =>
        renderFallbackPdf(buildListTableFallbackDoc({ title: cfg.title, subtitle, headers: cfg.headers, rows }))
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${cfg.baseName}.pdf"`);
      res.send(buffer);
    }
  } catch (err) {
    console.error(`Error exporting ${cfg.title}:`, err);
    res.status(500).json({ error: "Erreur lors de l'export" });
  }
}

const statusOf = (isActive?: boolean): string => (isActive ? 'Actif' : 'Inactif');

const risksCfg: ListExportCfg = {
  title: 'Risques',
  sheetName: 'Risques',
  baseName: 'risques',
  headers: ['Code', 'Nom', 'Catégorie', 'Processus', 'Entité auditable', 'Département', 'Statut'],
  widths: [10, 36, 20, 26, 26, 22, 10],
  fetch: (tenantId) =>
    prisma.risk.findMany({
      where: { tenantId },
      include: {
        businessProcess: { select: { name: true } },
        auditableEntity: { select: { name: true } },
        ownerDepartment: { select: { name: true } },
      },
      orderBy: { code: 'asc' },
    }),
  rows: (items) =>
    items.map((r) => [
      String(r?.code ?? '-'),
      String(r?.name ?? '-'),
      String(r?.category ?? '-'),
      String(r?.businessProcess?.name ?? '-'),
      String(r?.auditableEntity?.name ?? '-'),
      String(r?.ownerDepartment?.name ?? '-'),
      statusOf(r?.isActive),
    ]),
};

const controlsCfg: ListExportCfg = {
  title: 'Contrôles',
  sheetName: 'Contrôles',
  baseName: 'controles',
  headers: ['Code', 'Nom', 'Type', 'Fréquence', 'Processus', 'Département', 'Statut'],
  widths: [10, 36, 20, 16, 26, 22, 10],
  fetch: (tenantId) =>
    prisma.control.findMany({
      where: { tenantId },
      include: {
        businessProcess: { select: { name: true } },
        ownerDepartment: { select: { name: true } },
      },
      orderBy: { code: 'asc' },
    }),
  rows: (items) =>
    items.map((c) => [
      String(c?.code ?? '-'),
      String(c?.name ?? '-'),
      String(c?.controlType ?? '-'),
      String(c?.frequency ?? '-'),
      String(c?.businessProcess?.name ?? '-'),
      String(c?.ownerDepartment?.name ?? '-'),
      statusOf(c?.isActive),
    ]),
};

const auditTypesCfg: ListExportCfg = {
  title: "Types d'audit",
  sheetName: "Types d'audit",
  baseName: 'types_audit',
  headers: ['Nom', 'Statut'],
  widths: [60, 14],
  fetch: (tenantId) => prisma.auditType.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
  rows: (items) => items.map((t) => [String(t?.name ?? '-'), statusOf(t?.isActive)]),
};

export const exportRisksExcel = (req: Request, res: Response) => runListExport(req, res, risksCfg, 'excel');
export const exportRisksPDF = (req: Request, res: Response) => runListExport(req, res, risksCfg, 'pdf');
export const exportControlsExcel = (req: Request, res: Response) => runListExport(req, res, controlsCfg, 'excel');
export const exportControlsPDF = (req: Request, res: Response) => runListExport(req, res, controlsCfg, 'pdf');
export const exportAuditTypesExcel = (req: Request, res: Response) => runListExport(req, res, auditTypesCfg, 'excel');
export const exportAuditTypesPDF = (req: Request, res: Response) => runListExport(req, res, auditTypesCfg, 'pdf');

// Référence date courte exportée (usage éventuel côté tests)
export const _exportDate = today;
