import { Request, Response } from 'express';
import { getFindingsRecommendationsExportData } from '../services/export.service';
import { generatePDF, escapeHtml } from '../services/report.service';
import { buildFindingsRecommendationsFallbackDoc, renderFallbackPdf } from '../services/pdfFallback.service';

// GET /export/findings-recommendations/pdf
export async function exportFindingsRecommendationsPDF(req: Request, res: Response) {
  try {
    const user = req.user;
    // On récupère les filtres (attention: filters est stringifié côté front)
    let filters = req.query;
    if (filters.filters && typeof filters.filters === 'string') {
      try { filters.filters = JSON.parse(filters.filters as string); } catch {}
    }
    const data = await getFindingsRecommendationsExportData(user, filters);

    // Génération HTML premium (tableau missions, findings, recommendations)
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 0; margin: 0; }
    .header { background: linear-gradient(135deg, #2563eb, #6366f1); color: white; padding: 24px 30px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
    .content { padding: 20px 30px; }
    .mission-block { margin-bottom: 32px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px #0001; }
    .mission-title { background: #f1f5f9; color: #334155; font-weight: 600; font-size: 15px; padding: 12px 18px; border-bottom: 1px solid #e2e8f0; }
    .mission-meta { font-size: 11px; color: #64748b; margin: 0 0 8px 0; padding: 0 18px; }
    .section-title { font-size: 13px; color: #2563eb; margin: 18px 0 6px 0; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 7px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { text-align: center; color: #94a3b8; font-size: 9px; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Export constats & recommandations</h1>
    <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
  </div>
  <div class="content">
    ${(data && data.length > 0)
      ? data.map((item: any) => `
        <div class="mission-block">
          <div class="mission-title">Mission #${item.mission.id} — ${escapeHtml(item.mission.title) || ''}</div>
          <div class="mission-meta">
            Statut : <b>${escapeHtml(item.mission.status) || '-'}</b> | Chef de mission : <b>${item.mission.leader ? escapeHtml(`${item.mission.leader.firstName} ${item.mission.leader.lastName}`) : '-'}</b>
          </div>
          <div class="section-title">Constats</div>
          <table>
            <thead>
              <tr><th>Description</th><th>Impact</th><th>Niveau de risque</th></tr>
            </thead>
            <tbody>
              ${(item.findings && item.findings.length > 0)
                ? item.findings.map((f: any) => `<tr><td>${escapeHtml(f.description) || ''}</td><td>${escapeHtml(f.impact) || ''}</td><td>${escapeHtml(f.riskLevel?.name) || ''}</td></tr>`).join('')
                : '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">Aucun constat</td></tr>'}
            </tbody>
          </table>
          <div class="section-title">Recommandations</div>
          <table>
            <thead>
              <tr><th>Recommandation</th><th>Responsable</th><th>Date cible</th><th>Statut</th></tr>
            </thead>
            <tbody>
              ${(item.recommendations && item.recommendations.length > 0)
                ? item.recommendations.map((r: any) => `<tr><td>${escapeHtml(r.title) || ''}</td><td>${escapeHtml(r.assigneeName) || ''}</td><td>${r.targetDate ? new Date(r.targetDate).toLocaleDateString('fr-FR') : ''}</td><td>${escapeHtml(r.status) || ''}</td></tr>`).join('')
                : '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">Aucune recommandation</td></tr>'}
            </tbody>
          </table>
        </div>
      `).join('')
      : '<div style="color:#64748b;font-size:13px;">Aucune mission trouvée pour les filtres appliqués.</div>'}
  </div>
  <div class="footer">SISAR — Système d\'Information de Suivi des Audits et Recommandations</div>
</body>
</html>`;

    const pdfBuffer = await generatePDF(html, () => renderFallbackPdf(buildFindingsRecommendationsFallbackDoc(data)));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="constats_recommandations_export.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la génération du PDF.' });
  }
}

// GET /export/findings-recommendations/excel
export async function exportFindingsRecommendationsExcel(req: Request, res: Response) {
  try {
    const user = req.user;
    let filters = req.query;
    if (filters.filters && typeof filters.filters === 'string') {
      try { filters.filters = JSON.parse(filters.filters as string); } catch {}
    }
    const data = await getFindingsRecommendationsExportData(user, filters);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SISAR Audit';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Constats & Recommandations');

    // En-têtes premium
    sheet.columns = [
      { header: 'Mission', key: 'mission', width: 30 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Chef de mission', key: 'leader', width: 25 },
      { header: 'Constat', key: 'finding', width: 40 },
      { header: 'Impact', key: 'impact', width: 25 },
      { header: 'Niveau de risque', key: 'risk', width: 18 },
      { header: 'Recommandation', key: 'recommendation', width: 40 },
      { header: 'Responsable', key: 'assignee', width: 25 },
      { header: 'Date cible', key: 'targetDate', width: 15 },
      { header: 'Statut reco.', key: 'recoStatus', width: 15 },
    ];

    // Style en-tête
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6366F1' }, // indigo-500
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Données premium
    for (const item of data) {
      const mission = item.mission;
      const findings = item.findings || [];
      const recommendations = item.recommendations || [];

      // Pour chaque constat, lister les recos associées (si aucune, ligne vide)
      if (findings.length === 0 && recommendations.length === 0) {
        sheet.addRow({
          mission: `${mission.id} — ${mission.title || ''}`,
          status: mission.status || '-',
          leader: mission.leader ? `${mission.leader.firstName} ${mission.leader.lastName}` : '-',
        });
      }

      for (const f of findings) {
        // Trouver les recos liées à ce constat (si structure le permet)
        const recos = recommendations.filter((r: any) => r.findingId === f.id);
        if (recos.length === 0) {
          sheet.addRow({
            mission: `${mission.id} — ${mission.title || ''}`,
            status: mission.status || '-',
            leader: mission.leader ? `${mission.leader.firstName} ${mission.leader.lastName}` : '-',
            finding: f.description || '',
            impact: f.impact || '',
            risk: f.riskLevel?.name || '',
          });
        } else {
          for (const r of recos) {
            sheet.addRow({
              mission: `${mission.id} — ${mission.title || ''}`,
              status: mission.status || '-',
              leader: mission.leader ? `${mission.leader.firstName} ${mission.leader.lastName}` : '-',
              finding: f.description || '',
              impact: f.impact || '',
              risk: f.riskLevel?.name || '',
              recommendation: r.title || '',
              assignee: r.assigneeName || '',
              targetDate: r.targetDate ? new Date(r.targetDate).toLocaleDateString('fr-FR') : '',
              recoStatus: r.status || '',
            });
          }
        }
      }

      // Recos orphelines (non liées à un finding)
      for (const r of recommendations) {
        if (!r.findingId) {
          sheet.addRow({
            mission: `${mission.id} — ${mission.title || ''}`,
            status: mission.status || '-',
            leader: mission.leader ? `${mission.leader.firstName} ${mission.leader.lastName}` : '-',
            recommendation: r.title || '',
            assignee: r.assigneeName || '',
            targetDate: r.targetDate ? new Date(r.targetDate).toLocaleDateString('fr-FR') : '',
            recoStatus: r.status || '',
          });
        }
      }
    }

    // Bordures premium
    sheet.eachRow((row: any, rowNumber: number) => {
      row.eachCell((cell: any) => {
        if (!cell) return;
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
      to: `J${sheet.rowCount}`,
    };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="constats_recommandations_export.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la génération de l\'Excel.' });
  }
}
