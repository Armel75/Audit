const prisma = require('@audit/database').default;
import puppeteer from 'puppeteer';
import { Buffer } from 'buffer';
import path from 'path';
import fs from 'fs';
import { ROOT_PATH } from '../config/storage';
import { Prisma } from '@prisma/client';

type MissionReport = Prisma.AuditMissionGetPayload<{
  include: {
    leader: true;
    findings: {
      include: {
        riskLevel: true;
        recos: {
          include: {
            department: true;
            priority: true;
            assigneeUser: true;
            assigneeGlpiUser: true;
            ticketLinks: {
              include: {
                ticket: {
                  include: {
                    requesterGlpiUser: true;
                    assigneeGlpiUser: true;
                  };
                };
              };
            };
          };
        };
      };
    };
    plan: true;
  };
}>;
// type RiskLevel = {
//   name?: string;
// };

// type Recommendation = {
//   title: string;
//   assigneeName?: string;
//   targetDate?: Date | string;
//   status?: string;
// };

// type Finding = {
//   description: string;
//   impact?: string;
//   riskLevel?: RiskLevel;
//   recos?: Recommendation[];
// };

// type MissionReport = {
//   title: string;
//   description?: string;
//   objective?: string;
//   scopeDescription?: string;
//   methodology?: string;
//   leader?: {
//     firstName?: string;
//     lastName?: string;
//   };
//   findings?: Finding[];
// };

export const getMissionReportData = async (missionId: number, tenantId: number) => {
  return prisma.auditMission.findFirst({
    where: { 
      id: missionId,
      tenantId
    },
    include: {
      leader: true,
      findings: {
        include: {
          riskLevel: true,
          recos: {
            include: {
              department: true,
              priority: true,
              assigneeUser: true,
              assigneeGlpiUser: true,
              ticketLinks: {
                include: {
                  ticket: {
                    include: {
                      requesterGlpiUser: true,
                      assigneeGlpiUser: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      plan: true,
    },
  });
};


//export const buildReportHTML = (mission: any) => {

export const buildReportHTML = (mission: MissionReport) => {
  let logoSrc = '';
  // try {
  //   const logoFullPath = path.resolve(process.cwd(), '../../template/logo.png');
  //   const logoBase64 = fs.readFileSync(logoFullPath).toString('base64');
  //   logoSrc = `data:image/png;base64,${logoBase64}`;
  // } catch (e) {
  //   // pas de logo → on continue sans
  // }

  const logoFullPath = path.join(ROOT_PATH, 'template/logo.png');

  if (!fs.existsSync(logoFullPath)) {
    console.warn('Logo not found:', logoFullPath);
  } else {
    try {
      const logoBase64 = fs.readFileSync(logoFullPath).toString('base64');
      logoSrc = `data:image/png;base64,${logoBase64}`;
    } catch (err) {
      console.warn('Error reading logo:', err);
    }
  }

  const findings = mission?.findings || [];
  const recos = findings.flatMap(f => f.recos || []);
  const missionTicketLinks = findings.flatMap(f =>
    (f.recos || []).flatMap((r) =>
      (r.ticketLinks || []).map((link) => ({
        link,
        recommendationTitle: r.title || '-',
        findingTitle: f.title || '-',
      }))
    )
  );
  const nbCritique = findings.filter(f => f.riskLevel?.name?.toLowerCase() === 'critique').length;
  const nbMajeur = findings.filter(f => f.riskLevel?.name?.toLowerCase() === 'majeur').length;
  const nbMineur = findings.filter(f => f.riskLevel?.name?.toLowerCase() === 'mineur').length;
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #1e293b; font-size: 11.5px; line-height: 1.55; }

  /* Bandeau haut */
  .top-band { background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); color: white; padding: 28px 40px 22px; position: relative; overflow: hidden; }
  .top-band .logo-row { display: flex; align-items: center; justify-content: space-between; }
  .top-band .logo-row img { height: 60px; }
  .top-band .info { text-align: right; }
  .top-band .title { font-size: 24px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-top: 18px; }
  .top-band .desc { font-size: 13px; margin-top: 8px; color: #e0e7ff; }
  .top-band .meta { display: flex; gap: 24px; margin-top: 18px; font-size: 12px; }
  .top-band .meta-item { background: rgba(255,255,255,0.13); border-radius: 16px; padding: 7px 18px; font-weight: 600; }

  /* Synthèse */
  .synthese { display: flex; gap: 32px; justify-content: center; margin: 32px 0 18px; }
  .synthese-card { background: #f1f5f9; border-radius: 12px; padding: 18px 28px; text-align: center; box-shadow: 0 2px 8px #0001; }
  .synthese-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
  .synthese-card .value { font-size: 22px; font-weight: 700; color: #3b82f6; }

  /* Sections */
  .section { margin-bottom: 28px; }
  .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #0f172a; padding-bottom: 6px; border-bottom: 2px solid #6366f1; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .section-title .dot { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; }
  .section-desc { font-size: 12px; color: #475569; line-height: 1.6; }

  /* Tableaux */
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
  th { background: #f1f5f9; color: #334155; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 9px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; }
  tr:nth-child(even) td { background: #f8fafc; }

  /* Reco badge */
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; background: #e0e7ff; color: #3730a3; margin-left: 8px; }

  /* Zone signatures */
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
  .sig-block { text-align: center; }
  .sig-block .sig-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; margin-bottom: 6px; }
  .sig-block .sig-name { font-size: 12px; font-weight: 600; color: #1e293b; }
  .sig-block .sig-line { margin-top: 50px; border-top: 1px solid #94a3b8; width: 200px; margin-left: auto; margin-right: auto; }
  .sig-block .sig-label { font-size: 9px; color: #94a3b8; margin-top: 4px; }

  /* Pied de page */
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 40px; text-align: center; font-size: 8.5px; color: #94a3b8; margin-top: 40px; }
</style>
</head>
<body>

  <!-- Bandeau supérieur -->
  <div class="top-band">
    <div class="logo-row">
      ${logoSrc ? `<img src="${logoSrc}" alt="Logo" />` : `<div style="height:60px"></div>`}
      <div class="info">
        <div style="font-size:13px; font-weight:600;">Rapport généré le ${today}</div>
      </div>
    </div>
    <div class="title">RAPPORT D&#39;AUDIT</div>
    <div class="desc">${mission.title || ''}</div>
    <div class="meta">
      <div class="meta-item"><b>Chef de mission :</b> ${mission.leader?.firstName || ''} ${mission.leader?.lastName || ''}</div>
      <div class="meta-item"><b>Plan :</b> ${mission.plan?.title || '-'} (${mission.plan?.year || '-'})</div>
      <div class="meta-item"><b>Période :</b> ${mission.startDate ? new Date(mission.startDate).toLocaleDateString('fr-FR') : '-'} - ${mission.endDate ? new Date(mission.endDate).toLocaleDateString('fr-FR') : '-'}</div>
      <div class="meta-item"><b>Nb. constats :</b> ${findings.length}</div>
    </div>
  </div>

  <!-- Synthèse visuelle -->
  <div class="synthese">
    <div class="synthese-card">
      <div class="label">Constats</div>
      <div class="value">${findings.length}</div>
    </div>
    <div class="synthese-card">
      <div class="label">Recommandations</div>
      <div class="value">${recos.length}</div>
    </div>
    <div class="synthese-card">
      <div class="label">Tickets GLPI</div>
      <div class="value">${missionTicketLinks.length}</div>
    </div>
    <div class="synthese-card">
      <div class="label">Critiques</div>
      <div class="value">${nbCritique}</div>
    </div>
    <div class="synthese-card">
      <div class="label">Majeurs</div>
      <div class="value">${nbMajeur}</div>
    </div>
    <div class="synthese-card">
      <div class="label">Mineurs</div>
      <div class="value">${nbMineur}</div>
    </div>
  </div>

  <!-- Sections -->
  <div class="content" style="padding: 24px 40px 30px;">

    <div class="section">
      <div class="section-title"><span class="dot"></span> Contexte de la mission</div>
      <p class="section-desc">${mission.description || '-'}</p>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span> Objectifs de l'audit</div>
      <p class="section-desc">${mission.objective || '-'}</p>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span> Périmètre de l'audit</div>
      <p class="section-desc">${mission.scopeDescription || '-'}</p>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span> Méthodologie</div>
      <p class="section-desc">${mission.methodology || '-'}</p>
    </div>

    <!-- Tableau des constats détaillés -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Synthèse des constats</div>
      <table>
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:25%">Constat</th>
            <th style="width:15%">Niveau de risque</th>
            <th style="width:20%">Cause</th>
            <th style="width:25%">Impact</th>
            <th style="width:10%">Score</th>
          </tr>
        </thead>
        <tbody>
          ${findings.map((f, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${f.title || '-'}</strong></td>
              <td>${f.riskLevel?.name || '-'}</td>
              <td>${f.cause || '-'}</td>
              <td>${f.impact || '-'}</td>
              <td>${f.severityScore ? f.severityScore : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Tableau des recommandations détaillées -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Recommandations</div>
      <table>
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:20%">Titre</th>
            <th style="width:25%">Plan d'action</th>
            <th style="width:12%">Date cible</th>
            <th style="width:15%">Département</th>
            <th style="width:15%">Affectation</th>
            <th style="width:8%">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${recos.map((r, i) => {
            const affectation = [
              r.assigneeName,
              r.assigneeUser ? r.assigneeUser.firstName + ' ' + r.assigneeUser.lastName : null,
              r.assigneeGlpiUser ? r.assigneeGlpiUser.email : null
            ].filter(Boolean).join(' / ') || '-';
            return `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${r.title || '-'}</strong></td>
              <td>${r.actionPlan || '-'}</td>
              <td>${r.targetDate ? new Date(r.targetDate).toLocaleDateString('fr-FR') : '-'}</td>
              <td>${r.department?.name || '-'}</td>
              <td>${affectation}</td>
              <td><span class="badge">${r.status || '-'}</span></td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Plan d'action détaillé -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Plan d'action</div>
      <table>
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:20%">Action (Recommandation)</th>
            <th style="width:25%">Plan d'action détaillé</th>
            <th style="width:12%">Date prévue</th>
            <th style="width:15%">Département responsable</th>
            <th style="width:15%">Responsable(s)</th>
            <th style="width:8%">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${recos.map((r, i) => {
            const affectation = [
              r.assigneeName,
              r.assigneeUser ? r.assigneeUser.firstName + ' ' + r.assigneeUser.lastName : null,
              r.assigneeGlpiUser ? r.assigneeGlpiUser.email : null
            ].filter(Boolean).join(' / ') || '-';
            return `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${r.title || '-'}</strong></td>
              <td>${r.actionPlan || '-'}</td>
              <td>${r.targetDate ? new Date(r.targetDate).toLocaleDateString('fr-FR') : '-'}</td>
              <td>${r.department?.name || '-'}</td>
              <td>${affectation}</td>
              <td><span class="badge">${r.status || '-'}</span></td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Tableau des tickets GLPI liés -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Tickets GLPI liés à la mission</div>
      ${missionTicketLinks.length === 0
        ? `<p class="section-desc">Aucun ticket GLPI lié à cette mission.</p>`
        : `<table>
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:10%">N° Ticket</th>
            <th style="width:17%">Titre</th>
            <th style="width:10%">Statut</th>
            <th style="width:10%">Priorité</th>
            <th style="width:12%">Demandeur</th>
            <th style="width:12%">Assigné à</th>
            <th style="width:12%">Constat</th>
            <th style="width:12%">Recommandation</th>
          </tr>
        </thead>
        <tbody>
          ${missionTicketLinks.map((item, i) => {
            const ticket = item.link.ticket;
            return `
            <tr>
              <td>${i + 1}</td>
              <td>${ticket?.ticketNumber || ticket?.glpiId || '-'}</td>
              <td><strong>${ticket?.title || '-'}</strong></td>
              <td>${ticket?.status || '-'}</td>
              <td>${ticket?.priority || '-'}</td>
              <td>${ticket?.requesterGlpiUser?.fullName || '-'}</td>
              <td>${ticket?.assigneeGlpiUser?.fullName || '-'}</td>
              <td>${item.findingTitle || '-'}</td>
              <td>${item.recommendationTitle || '-'}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>`}
    </div>

    <!-- Conclusion -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Conclusion</div>
      <p class="section-desc">${mission.conclusion || '-'}</p>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-title">Auditeur</div>
        <div class="sig-name">${mission.leader?.firstName || ''} ${mission.leader?.lastName || ''}</div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature</div>
      </div>
      <div class="sig-block">
        <div class="sig-title">Chef Service Audit</div>
        <div class="sig-name">________________________</div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature</div>
      </div>
    </div>

  </div>

  <!-- Pied de page -->
  <div class="footer">
    Rapport généré automatiquement le ${today} — Ce document est confidentiel et destiné exclusivement aux parties mentionnées.
  </div>

</body>
</html>`;
};


// =====================================================
// ORDRE DE MISSION — Document formel
// =====================================================

export const getMissionOrderData = async (missionId: number, tenantId: number) => {
  return prisma.auditMission.findFirst({
    where: { id: missionId, tenantId },
    include: {
      tenant: { select: { name: true, code: true } },
      leader: { select: { id: true, firstName: true, lastName: true, email: true } },
      plan: { select: { id: true, year: true, title: true } },
      auditType: { select: { id: true, name: true } },
      members: {
        where: { assignmentStatus: 'ACTIVE' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          glpiUser: { select: { id: true, fullName: true, email: true } },
          externalParticipant: { select: { id: true, fullName: true, email: true, organization: true, title: true } },
        },
        orderBy: { isLead: 'desc' },
      },
      scopes: {
        where: { status: 'IN_SCOPE' },
        include: {
          auditableEntity: { select: { id: true, name: true, code: true, entityType: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};

export const buildMissionOrderHTML = (mission: any): string => {
  let logoSrc = '';

  const logoFullPath = path.join(ROOT_PATH, 'template/logo.png');

  if (!fs.existsSync(logoFullPath)) {
    console.warn('Logo not found:', logoFullPath);
  } else {
    try {
      const logoBase64 = fs.readFileSync(logoFullPath).toString('base64');
      logoSrc = `data:image/png;base64,${logoBase64}`;
    } catch (err) {
      console.warn('Error reading logo:', err);
    }
  }


  const orgName = mission.tenant?.name ?? 'Organisation';
  const orgCode = mission.tenant?.code ?? '';
  const refNumber = `OM-${mission.plan?.year ?? new Date().getFullYear()}-${String(mission.id).padStart(4, '0')}`;
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const leader = mission.leader;
  const members = mission.members ?? [];
  const scopes = mission.scopes ?? [];

  const startDate = mission.startDate
    ? new Date(mission.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'À définir';
  const endDate = mission.endDate
    ? new Date(mission.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'À définir';

  const memberRows = members
    .map((m: any, i: number) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${m.user ? `${m.user.firstName} ${m.user.lastName}` : m.glpiUser ? (m.glpiUser.fullName || m.glpiUser.email || '-') : (m.externalParticipant?.fullName || '-')}</td>
        <td>${m.roleInMission || '-'}</td>
        <td style="text-align:center">${m.isLead ? 'Oui' : 'Non'}</td>
      </tr>
    `).join('');

  const scopeRows = scopes
    .map((s: any, i: number) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${s.auditableEntity.name}</td>
        <td>${s.auditableEntity.code || '-'}</td>
        <td>${s.auditableEntity.entityType || '-'}</td>
        <td>${s.scopeRole || '-'}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #1e293b; font-size: 11.5px; line-height: 1.55; }

  /* ─── Bandeau haut ─── */
  .top-band { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%); color: white; padding: 28px 40px 22px; position: relative; overflow: hidden; }
  .top-band::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #10b981, #3b82f6, #10b981); }
  .top-band .logo-row { display: flex; align-items: center; justify-content: space-between; }
  .top-band .logo-row img { height: 60px; }
  .top-band .org-info { text-align: right; }
  .top-band .org-name { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
  .top-band .org-code { font-size: 10px; opacity: 0.7; margin-top: 2px; }

  /* ─── Titre document ─── */
  .doc-title-bar { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; }
  .doc-title-bar h1 { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 1px; text-transform: uppercase; }
  .doc-title-bar .ref { font-size: 11px; color: #64748b; font-weight: 600; background: #e2e8f0; padding: 4px 12px; border-radius: 20px; }

  /* ─── Contenu principal ─── */
  .content { padding: 24px 40px 30px; }

  /* ─── Info cards ─── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
  .info-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; background: #ffffff; }
  .info-card .label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; font-weight: 700; margin-bottom: 5px; }
  .info-card .value { font-size: 12.5px; font-weight: 600; color: #1e293b; }
  .info-card .value.highlight { color: #0f172a; font-size: 13px; }

  .info-card-full { grid-column: 1 / -1; }

  /* ─── Sections ─── */
  .section { margin-bottom: 22px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #0f172a; padding-bottom: 6px; border-bottom: 2px solid #10b981; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .section-title .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
  .section-desc { font-size: 11.5px; color: #475569; line-height: 1.6; }

  /* ─── Tableaux ─── */
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; color: #334155; font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; padding: 9px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; }
  tr:nth-child(even) td { background: #f8fafc; }

  /* ─── Zone signatures ─── */
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
  .sig-block { text-align: center; }
  .sig-block .sig-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; margin-bottom: 6px; }
  .sig-block .sig-name { font-size: 12px; font-weight: 600; color: #1e293b; }
  .sig-block .sig-line { margin-top: 50px; border-top: 1px solid #94a3b8; width: 200px; margin-left: auto; margin-right: auto; }
  .sig-block .sig-label { font-size: 9px; color: #94a3b8; margin-top: 4px; }

  /* ─── Pied de page ─── */
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 40px; text-align: center; font-size: 8.5px; color: #94a3b8; }

  /* ─── Mentions ─── */
  .mention-box { border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-top: 18px; background: #fffbeb; }
  .mention-box p { font-size: 10.5px; color: #92400e; line-height: 1.5; }
  .mention-box strong { color: #78350f; }
</style>
</head>
<body>

  <!-- ═══ BANDEAU SUPÉRIEUR ═══ -->
  <div class="top-band">
    <div class="logo-row">
      ${logoSrc ? `<img src="${logoSrc}" alt="Logo" />` : `<div style="height:60px"></div>`}
      <div class="org-info">
        <div class="org-name">${orgName}</div>
        ${orgCode ? `<div class="org-code">${orgCode}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- ═══ TITRE DOCUMENT ═══ -->
  <div class="doc-title-bar">
    <h1>Ordre de Mission</h1>
    <span class="ref">${refNumber}</span>
  </div>

  <!-- ═══ CONTENU ═══ -->
  <div class="content">

    <!-- Informations clés -->
    <div class="info-grid">
      <div class="info-card">
        <div class="label">Mission d'audit</div>
        <div class="value highlight">${mission.title}</div>
      </div>
      <div class="info-card">
        <div class="label">Référence du plan</div>
        <div class="value">${mission.plan?.title || `Plan d'audit ${mission.plan?.year}`} — ${mission.plan?.year ?? ''}</div>
      </div>
      <div class="info-card">
        <div class="label">Type d'audit</div>
        <div class="value">${mission.auditType?.name ?? 'Non spécifié'}</div>
      </div>
      <div class="info-card">
        <div class="label">Chef de mission</div>
        <div class="value">${leader ? `${leader.firstName} ${leader.lastName}` : '-'}</div>
      </div>
      <div class="info-card">
        <div class="label">Date de début</div>
        <div class="value">${startDate}</div>
      </div>
      <div class="info-card">
        <div class="label">Date de fin</div>
        <div class="value">${endDate}</div>
      </div>
      <div class="info-card info-card-full">
        <div class="label">Date d'émission du document</div>
        <div class="value">${today}</div>
      </div>
    </div>

    <!-- Objectif -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Objectif de la mission</div>
      <p class="section-desc">${mission.objective || mission.description || '-'}</p>
    </div>

    <!-- Périmètre -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Périmètre d'intervention</div>
      ${mission.scopeDescription ? `<p class="section-desc" style="margin-bottom:10px">${mission.scopeDescription}</p>` : ''}
      ${scopes.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width:40px;text-align:center">#</th>
            <th>Entité / Site</th>
            <th>Code</th>
            <th>Type</th>
            <th>Rôle dans le périmètre</th>
          </tr>
        </thead>
        <tbody>${scopeRows}</tbody>
      </table>` : '<p class="section-desc" style="font-style:italic">Aucune entité définie dans le périmètre.</p>'}
    </div>

    <!-- Équipe -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Équipe d'audit</div>
      ${members.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width:40px;text-align:center">#</th>
            <th>Nom complet</th>
            <th>Rôle</th>
            <th style="text-align:center">Responsable</th>
          </tr>
        </thead>
        <tbody>${memberRows}</tbody>
      </table>` : '<p class="section-desc" style="font-style:italic">Aucun membre assigné.</p>'}
    </div>

    <!-- Méthodologie -->
    ${mission.methodology ? `
    <div class="section">
      <div class="section-title"><span class="dot"></span> Méthodologie</div>
      <p class="section-desc">${mission.methodology}</p>
    </div>` : ''}

    <!-- Mention légale -->
    <div class="mention-box">
      <p><strong>Important :</strong> Le présent ordre de mission autorise l'équipe d'audit désignée ci-dessus à accéder aux locaux, documents et systèmes d'information des entités figurant dans le périmètre d'intervention, dans le cadre exclusif de cette mission. Toute personne sollicitée est tenue de coopérer pleinement avec l'équipe d'audit conformément à la charte d'audit interne.</p>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-title">Chef de mission</div>
        <div class="sig-name">${leader ? `${leader.firstName} ${leader.lastName}` : '-'}</div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature</div>
      </div>
      <div class="sig-block">
        <div class="sig-title">Directeur de l'Audit Interne</div>
        <div class="sig-name">________________________</div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature et cachet</div>
      </div>
    </div>

  </div>

  <!-- ═══ PIED DE PAGE ═══ -->
  <div class="footer">
    ${orgName} — Document généré automatiquement le ${today} — Réf. ${refNumber} — Ce document est confidentiel et destiné exclusivement aux parties mentionnées.
  </div>

</body>
</html>`;
};

export const generatePDF = async (html: string): Promise<Buffer> => {
  // const browser = await puppeteer.launch({
  //   headless: true,
  //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
  // });
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();

  console.log('Using Chrome at:', executablePath);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
};

// =====================================================
// FICHE D'INFORMATIONS MISSION — Export complet
// =====================================================

export const getMissionInfoData = async (missionId: number, tenantId: number) => {
  return prisma.auditMission.findFirst({
    where: { id: missionId, tenantId },
    include: {
      tenant: { select: { name: true, code: true } },
      leader: { select: { id: true, firstName: true, lastName: true, email: true } },
      plan: { select: { id: true, year: true, title: true } },
      auditType: { select: { id: true, name: true } },
      members: {
        where: { assignmentStatus: 'ACTIVE' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          glpiUser: { select: { id: true, fullName: true, email: true } },
          externalParticipant: { select: { id: true, fullName: true, email: true, organization: true, title: true } },
        },
        orderBy: { isLead: 'desc' },
      },
      scopes: {
        where: { status: 'IN_SCOPE' },
        include: {
          auditableEntity: { select: { id: true, name: true, code: true, entityType: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      findings: {
        include: {
          riskLevel: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};

export const buildMissionInfoHTML = (mission: any): string => {
  let logoSrc = '';
  const logoFullPath = path.join(ROOT_PATH, 'template/logo.png');
  if (!fs.existsSync(logoFullPath)) {
    console.warn('Logo not found:', logoFullPath);
  } else {
    try {
      const logoBase64 = fs.readFileSync(logoFullPath).toString('base64');
      logoSrc = `data:image/png;base64,${logoBase64}`;
    } catch (err) {
      console.warn('Error reading logo:', err);
    }
  }

  const orgName = mission.tenant?.name ?? 'Organisation';
  const orgCode = mission.tenant?.code ?? '';
  const refNumber = `MISSION-${mission.plan?.year ?? new Date().getFullYear()}-${String(mission.id).padStart(4, '0')}`;
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const leader = mission.leader;
  const members = mission.members ?? [];
  const scopes = mission.scopes ?? [];
  const findings = mission.findings ?? [];

  const startDate = mission.startDate
    ? new Date(mission.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'À définir';
  const endDate = mission.endDate
    ? new Date(mission.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'À définir';

  const statusLabels: Record<string, string> = {
    PLANNED: 'Planifiée',
    IN_PROGRESS: 'En cours',
    REVIEW: 'En relecture',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
  };
  const statusLabel = statusLabels[mission.status] || mission.status || '-';

  const memberRows = members
    .map((m: any, i: number) => {
      const memberName = m.user
        ? `${m.user.firstName} ${m.user.lastName}`
        : m.glpiUser
          ? (m.glpiUser.fullName || m.glpiUser.email || '-')
          : (m.externalParticipant?.fullName || '-');
      const memberEmail = m.user?.email || m.glpiUser?.email || m.externalParticipant?.email || '-';
      return `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td>${memberName}</td>
        <td>${memberEmail}</td>
        <td>${m.roleInMission || '-'}</td>
        <td style="text-align:center">${m.isLead ? 'Oui' : 'Non'}</td>
      </tr>`;
    }).join('');

  const scopeRows = scopes
    .map((s: any, i: number) => `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td>${s.auditableEntity.name}</td>
        <td>${s.auditableEntity.code || '-'}</td>
        <td>${s.auditableEntity.entityType || '-'}</td>
        <td>${s.scopeRole || '-'}</td>
      </tr>
    `).join('');

  const findingRows = findings
    .map((f: any, i: number) => `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td><strong>${f.title || '-'}</strong></td>
        <td>${f.description || '-'}</td>
        <td>${f.riskLevel?.name || '-'}</td>
        <td>${f.cause || '-'}</td>
        <td>${f.impact || '-'}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #1e293b; font-size: 11.5px; line-height: 1.55; }

  /* ─── Bandeau haut ─── */
  .top-band { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%); color: white; padding: 28px 40px 22px; position: relative; overflow: hidden; }
  .top-band::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #10b981, #3b82f6, #10b981); }
  .top-band .logo-row { display: flex; align-items: center; justify-content: space-between; }
  .top-band .logo-row img { height: 60px; }
  .top-band .org-info { text-align: right; }
  .top-band .org-name { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
  .top-band .org-code { font-size: 10px; opacity: 0.7; margin-top: 2px; }

  /* ─── Titre document ─── */
  .doc-title-bar { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; }
  .doc-title-bar h1 { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 1px; text-transform: uppercase; }
  .doc-title-bar .ref { font-size: 11px; color: #64748b; font-weight: 600; background: #e2e8f0; padding: 4px 12px; border-radius: 20px; }

  /* ─── Contenu principal ─── */
  .content { padding: 24px 40px 30px; }

  /* ─── Info cards ─── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
  .info-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; background: #ffffff; }
  .info-card .label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; font-weight: 700; margin-bottom: 5px; }
  .info-card .value { font-size: 12.5px; font-weight: 600; color: #1e293b; }
  .info-card .value.highlight { color: #0f172a; font-size: 13px; }
  .info-card-full { grid-column: 1 / -1; }

  /* ─── Badge statut ─── */
  .status-badge { display: inline-block; padding: 3px 14px; border-radius: 20px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-planned { background: #dbeafe; color: #1e40af; }
  .status-progress { background: #d1fae5; color: #065f46; }
  .status-review { background: #fef3c7; color: #92400e; }
  .status-completed { background: #e2e8f0; color: #334155; }
  .status-cancelled { background: #fee2e2; color: #991b1b; }

  /* ─── Sections ─── */
  .section { margin-bottom: 22px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #0f172a; padding-bottom: 6px; border-bottom: 2px solid #10b981; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .section-title .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
  .section-desc { font-size: 11.5px; color: #475569; line-height: 1.6; }

  /* ─── Tableaux ─── */
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 8px; }
  th { background: #f1f5f9; color: #334155; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; color: #475569; }
  tr:nth-child(even) td { background: #f8fafc; }

  /* ─── Pied de page ─── */
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 40px; text-align: center; font-size: 8.5px; color: #94a3b8; margin-top: 30px; }
</style>
</head>
<body>

  <!-- ═══ BANDEAU SUPÉRIEUR ═══ -->
  <div class="top-band">
    <div class="logo-row">
      ${logoSrc ? `<img src="${logoSrc}" alt="Logo" />` : `<div style="height:60px"></div>`}
      <div class="org-info">
        <div class="org-name">${orgName}</div>
        ${orgCode ? `<div class="org-code">${orgCode}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- ═══ TITRE DOCUMENT ═══ -->
  <div class="doc-title-bar">
    <h1>Fiche d&#39;Informations Mission</h1>
    <span class="ref">${refNumber}</span>
  </div>

  <!-- ═══ CONTENU ═══ -->
  <div class="content">

    <!-- Informations clés -->
    <div class="info-grid">
      <div class="info-card info-card-full">
        <div class="label">Mission d'audit</div>
        <div class="value highlight">${mission.title}</div>
      </div>
      <div class="info-card">
        <div class="label">Statut</div>
        <div class="value"><span class="status-badge status-${mission.status?.toLowerCase()?.replace('_', '-') || 'planned'}">${statusLabel}</span></div>
      </div>
      <div class="info-card">
        <div class="label">Référence du plan</div>
        <div class="value">${mission.plan?.title || `Plan d'audit ${mission.plan?.year}`} — ${mission.plan?.year ?? ''}</div>
      </div>
      <div class="info-card">
        <div class="label">Type d'audit</div>
        <div class="value">${mission.auditType?.name ?? 'Non spécifié'}</div>
      </div>
      <div class="info-card">
        <div class="label">Chef de mission</div>
        <div class="value">${leader ? `${leader.firstName} ${leader.lastName}` : '-'}</div>
      </div>
      <div class="info-card">
        <div class="label">Date de début</div>
        <div class="value">${startDate}</div>
      </div>
      <div class="info-card">
        <div class="label">Date de fin</div>
        <div class="value">${endDate}</div>
      </div>
      <div class="info-card info-card-full">
        <div class="label">Date d'émission du document</div>
        <div class="value">${today}</div>
      </div>
    </div>

    <!-- Contexte / Description -->
    ${mission.description ? `
    <div class="section">
      <div class="section-title"><span class="dot"></span> Contexte</div>
      <p class="section-desc">${mission.description}</p>
    </div>` : ''}

    <!-- Objectif -->
    ${mission.objective ? `
    <div class="section">
      <div class="section-title"><span class="dot"></span> Objectif de la mission</div>
      <p class="section-desc">${mission.objective}</p>
    </div>` : ''}

    <!-- Périmètre -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Périmètre d'intervention</div>
      ${mission.scopeDescription ? `<p class="section-desc" style="margin-bottom:10px">${mission.scopeDescription}</p>` : ''}
      ${scopes.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width:30px;text-align:center">#</th>
            <th>Entité / Site</th>
            <th>Code</th>
            <th>Type</th>
            <th>Rôle</th>
          </tr>
        </thead>
        <tbody>${scopeRows}</tbody>
      </table>` : '<p class="section-desc" style="font-style:italic">Aucune entité définie dans le périmètre.</p>'}
    </div>

    <!-- Équipe -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Équipe d'audit</div>
      ${members.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width:30px;text-align:center">#</th>
            <th>Nom complet</th>
            <th>Email</th>
            <th>Rôle dans la mission</th>
            <th style="text-align:center">Responsable</th>
          </tr>
        </thead>
        <tbody>${memberRows}</tbody>
      </table>` : '<p class="section-desc" style="font-style:italic">Aucun membre assigné.</p>'}
    </div>

    <!-- Méthodologie -->
    ${mission.methodology ? `
    <div class="section">
      <div class="section-title"><span class="dot"></span> Méthodologie</div>
      <p class="section-desc">${mission.methodology}</p>
    </div>` : ''}

    <!-- Constats (Findings) -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Constats (${findings.length})</div>
      ${findings.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width:30px;text-align:center">#</th>
            <th>Titre</th>
            <th>Description</th>
            <th>Risque</th>
            <th>Cause</th>
            <th>Impact</th>
          </tr>
        </thead>
        <tbody>${findingRows}</tbody>
      </table>` : '<p class="section-desc" style="font-style:italic">Aucun constat enregistré pour cette mission.</p>'}
    </div>

  </div>

  <!-- ═══ PIED DE PAGE ═══ -->
  <div class="footer">
    ${orgName} — Document généré automatiquement le ${today} — Réf. ${refNumber} — Ce document est confidentiel.
  </div>

</body>
</html>`;
};
