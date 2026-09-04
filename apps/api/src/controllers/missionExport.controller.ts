import { Request, Response } from 'express';
const prisma = require('@audit/database').default;
import ExcelJS from 'exceljs';
import { generatePDF } from '../services/report.service';
import { buildMissionsListFallbackDoc, renderFallbackPdf } from '../services/pdfFallback.service';

// =====================================================
// Types du payload filtre
// =====================================================
type FilterItem = {
  field: string;
  op: string;
  value: any;
};

type QueryBody = {
  logic: 'AND' | 'OR';
  filters: FilterItem[];
  mode?: 'active' | 'archive';
};

// =====================================================
// Labels statut (pour l'export)
// =====================================================
const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifiée',
  READY: 'Prête',
  IN_PROGRESS: 'En cours',
  UNDER_REVIEW: 'En revue',
  APPROVED: 'Approuvée',
  CLOSED: 'Clôturée',
  CANCELLED: 'Annulée',
};

// =====================================================
// Convertit un filtre en condition Prisma
// =====================================================
function toPrismaCondition(f: FilterItem): any {
  const { field, op, value } = f;

  // ------- title (string) -------
  if (field === 'title') {
    if (op === 'contains') return { title: { contains: value } };
    if (op === 'eq') return { title: value };
    if (op === 'startsWith') return { title: { startsWith: value } };
    if (op === 'endsWith') return { title: { endsWith: value } };
    if (op === 'isNull') return { title: null };
    if (op === 'isNotNull') return { NOT: { title: null } };
  }

  // ------- status (enum) -------
  if (field === 'status') {
    if (op === 'eq') return { status: value };
    if (op === 'neq') return { NOT: { status: value } };
    if (op === 'in' && Array.isArray(value)) return { status: { in: value } };
  }

  // ------- leader (userSelect) -------
  if (field === 'leader') {
    if (op === 'eq') return { leaderId: Number(value) };
    if (op === 'neq') return { NOT: { leaderId: Number(value) } };
    if (op === 'isNull') return { leaderId: null };
    if (op === 'isNotNull') return { NOT: { leaderId: null } };
  }

  // ------- planYear (number via relation) -------
  if (field === 'planYear') {
    const num = Number(value);
    if (op === 'eq') return { plan: { year: num } };
    if (op === 'neq') return { NOT: { plan: { year: num } } };
    if (op === 'gt') return { plan: { year: { gt: num } } };
    if (op === 'gte') return { plan: { year: { gte: num } } };
    if (op === 'lt') return { plan: { year: { lt: num } } };
    if (op === 'lte') return { plan: { year: { lte: num } } };
    if (op === 'between' && Array.isArray(value) && value.length >= 2) {
      return { plan: { year: { gte: Number(value[0]), lte: Number(value[1]) } } };
    }
  }

  // ------- auditType (string via relation) -------
  if (field === 'auditType') {
    if (op === 'contains') return { auditType: { name: { contains: value } } };
    if (op === 'eq') return { auditType: { name: value } };
    if (op === 'startsWith') return { auditType: { name: { startsWith: value } } };
    if (op === 'endsWith') return { auditType: { name: { endsWith: value } } };
    if (op === 'isNull') return { auditTypeId: null };
    if (op === 'isNotNull') return { NOT: { auditTypeId: null } };
  }

  // ------- startDate / endDate (date) -------
  if (field === 'startDate' || field === 'endDate') {
    const col = field;
    if (op === 'eq') return { [col]: new Date(value) };
    if (op === 'gt') return { [col]: { gt: new Date(value) } };
    if (op === 'lt') return { [col]: { lt: new Date(value) } };
    if (op === 'between' && Array.isArray(value) && value.length >= 2) {
      return { [col]: { gte: new Date(value[0]), lte: new Date(value[1]) } };
    }
    if (op === 'isNull') return { [col]: null };
    if (op === 'isNotNull') return { NOT: { [col]: null } };
  }

  return {};
}

// =====================================================
// Construit le where Prisma complet
// =====================================================
export function buildWhere(body: QueryBody, tenantId: number, accessFilter?: any): any {
  const base: any = { tenantId };

  if (body.mode === 'active') base.status = { not: 'CLOSED' };
  if (body.mode === 'archive') base.status = 'CLOSED';

  const conditions = body.filters.map(toPrismaCondition).filter((c) => Object.keys(c).length > 0);

  // Merge access filter (permission-based restriction)
  const allConditions = accessFilter ? [accessFilter, ...conditions] : conditions;

  if (allConditions.length === 0) return base;

  if (body.logic === 'OR' && conditions.length > 0) {
    const parts: any[] = [base];
    if (accessFilter) parts.push(accessFilter);
    parts.push({ OR: conditions });
    return { AND: parts };
  }

  return { AND: [base, ...allConditions] };
}

/**
 * Returns a Prisma WHERE filter for mission access based on user permissions.
 * Returns null if user has read_all (no restriction).
 */
export function getMissionAccessFilter(user: Express.Request['user']): any | null {
  if (!user) return null;
  const perms = user.permissions.map((p: string) => p.toLowerCase());
  if (perms.includes('audit_mission:read_all')) return null;
  return {
    OR: [
      { leaderId: user.id },
      { members: { some: { userId: user.id, assignmentStatus: 'ACTIVE' } } }
    ]
  };
}

const INCLUDE_MISSIONS = {
  leader: { select: { id: true, firstName: true, lastName: true, email: true } },
  plan: { select: { id: true, year: true, title: true } },
  auditType: { select: { id: true, name: true } },
  _count: { select: { findings: true, documents: true, members: true, scopes: true } },
};

// =====================================================
// POST /missions/query — Filtrage multi-critères
// =====================================================
export const queryMissions = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const body: QueryBody = req.body;
    if (!body || !Array.isArray(body.filters)) {
      return res.status(400).json({ error: 'Payload invalide' });
    }

    const accessFilter = getMissionAccessFilter(req.user);
    const where = buildWhere(body, tenantId, accessFilter ?? undefined);

    const missions = await prisma.auditMission.findMany({
      where,
      include: INCLUDE_MISSIONS,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: missions });
  } catch (error: any) {
    console.error('Error querying missions:', error);
    res.status(500).json({ error: 'Erreur lors du filtrage des missions' });
  }
};

// =====================================================
// POST /missions/export/excel
// =====================================================
export const exportMissionsExcel = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const body: QueryBody = req.body;
    if (!body || !Array.isArray(body.filters)) {
      return res.status(400).json({ error: 'Payload invalide' });
    }

    const accessFilter = getMissionAccessFilter(req.user);
    const where = buildWhere(body, tenantId, accessFilter ?? undefined);

    const missions = await prisma.auditMission.findMany({
      where,
      include: INCLUDE_MISSIONS,
      orderBy: { createdAt: 'desc' },
    });

    // Création du classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SISAR Audit';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Missions');

    // En-têtes
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Titre', key: 'title', width: 40 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Chef de mission', key: 'leader', width: 25 },
      { header: 'Plan (Année)', key: 'plan', width: 15 },
      { header: "Type d'audit", key: 'auditType', width: 20 },
      { header: 'Date début', key: 'startDate', width: 15 },
      { header: 'Date fin', key: 'endDate', width: 15 },
      { header: 'Constats', key: 'findings', width: 10 },
      { header: 'Documents', key: 'documents', width: 10 },
      { header: 'Membres', key: 'members', width: 10 },
    ];

    // Style en-tête
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }, // emerald-500
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Données
    for (const m of missions) {
      sheet.addRow({
        id: m.id,
        title: m.title,
        status: STATUS_LABELS[m.status] ?? m.status,
        leader: m.leader ? `${m.leader.firstName} ${m.leader.lastName}` : '-',
        plan: m.plan ? `${m.plan.year}` : '-',
        auditType: m.auditType?.name ?? '-',
        startDate: m.startDate ? new Date(m.startDate).toLocaleDateString('fr-FR') : '-',
        endDate: m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : '-',
        findings: m._count?.findings ?? 0,
        documents: m._count?.documents ?? 0,
        members: m._count?.members ?? 0,
      });
    }

    // Bordures
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Auto-filter
    sheet.autoFilter = {
      from: 'A1',
      to: `K${missions.length + 1}`,
    };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=missions_export.xlsx');
    res.send(Buffer.from(buffer as ArrayBuffer));
  } catch (error: any) {
    console.error('Error exporting missions Excel:', error);
    res.status(500).json({ error: "Erreur lors de l'export Excel" });
  }
};

// =====================================================
// POST /missions/export/pdf
// =====================================================
export const exportMissionsPdf = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const body: QueryBody = req.body;
    if (!body || !Array.isArray(body.filters)) {
      return res.status(400).json({ error: 'Payload invalide' });
    }

    const accessFilter = getMissionAccessFilter(req.user);
    const where = buildWhere(body, tenantId, accessFilter ?? undefined);

    const missions = await prisma.auditMission.findMany({
      where,
      include: INCLUDE_MISSIONS,
      orderBy: { createdAt: 'desc' },
    });

    // Construire le HTML du tableau
    const rows = missions
      .map(
        (m: any) => `
      <tr>
        <td>${m.id}</td>
        <td>${m.title}</td>
        <td>${STATUS_LABELS[m.status] ?? m.status}</td>
        <td>${m.leader ? `${m.leader.firstName} ${m.leader.lastName}` : '-'}</td>
        <td>${m.plan ? m.plan.year : '-'}</td>
        <td>${m.auditType?.name ?? '-'}</td>
        <td>${m.startDate ? new Date(m.startDate).toLocaleDateString('fr-FR') : '-'}</td>
        <td>${m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : '-'}</td>
        <td style="text-align:center">${m._count?.findings ?? 0}</td>
        <td style="text-align:center">${m._count?.members ?? 0}</td>
      </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 0; margin: 0; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px 30px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
    .content { padding: 20px 30px; }
    .summary { font-size: 12px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { text-align: center; color: #94a3b8; font-size: 9px; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Export des Missions d'Audit</h1>
    <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} — ${missions.length} mission(s)</p>
  </div>
  <div class="content">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Titre</th>
          <th>Statut</th>
          <th>Chef de mission</th>
          <th>Plan</th>
          <th>Type d'audit</th>
          <th>Début</th>
          <th>Fin</th>
          <th>Constats</th>
          <th>Membres</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="footer">SISAR — Système d'Information de Suivi des Audits et Recommandations</div>
</body>
</html>`;

    const pdfBuffer = await generatePDF(html, () => renderFallbackPdf(buildMissionsListFallbackDoc(missions)));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=missions_export.pdf');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error exporting missions PDF:', error);
    res.status(500).json({ error: "Erreur lors de l'export PDF" });
  }
};
