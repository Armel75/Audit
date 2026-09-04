const prisma = require('@audit/database').default;
import puppeteer from 'puppeteer';
import { Buffer } from 'buffer';
import path from 'path';
import fs from 'fs';
import { ROOT_PATH, STORAGE_PATH } from '../config/storage';
import { Prisma } from '@prisma/client';

/**
 * Échappe les caractères HTML réservés d'une valeur destinée au HTML.
 * Empêche la casse de mise en page et l'injection de balises dans les PDF générés.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

/** Commentaire hiérarchique (direction / encadrement) embarqué dans le rapport. */
type ReportHierarchyComment = {
  id: number;
  type?: string | null;
  title?: string | null;
  content?: string | null;
  createdAt?: Date | string | null;
  deletedAt?: Date | string | null;
  createdBy?: { id?: number; firstName?: string | null; lastName?: string | null } | null;
  parentComment?: { id?: number; title?: string | null } | null;
  documents?: Array<{ id?: number; originalName?: string | null }>;
};

/** Rapport de mission enrichi des commentaires hiérarchiques de la mission. */
type MissionReportData = MissionReport & { hierarchyComments: ReportHierarchyComment[] };
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

export const getMissionReportData = async (missionId: number, tenantId: number): Promise<MissionReportData | null> => {
  const mission = await prisma.auditMission.findFirst({
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
  if (!mission) return null;

  // Les commentaires hiérarchiques (direction / encadrement) sont rattachés à la
  // mission de façon contextuelle (contextType='MISSION' + contextId), sans FK Prisma.
  const hierarchyComments = await prisma.hierarchyComment.findMany({
    where: { tenantId, contextType: 'MISSION', contextId: missionId, deletedAt: null },
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      createdAt: true,
      deletedAt: true,
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      parentComment: { select: { id: true, title: true } },
      documents: { select: { id: true, originalName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return { ...mission, hierarchyComments };
};


//export const buildReportHTML = (mission: any) => {

export const buildReportHTML = (mission: MissionReportData) => {
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

  // ── Commentaires hiérarchiques (direction / encadrement) ────────────────
  const hcTypeLabels: Record<string, string> = {
    DIRECTOR_CONCLUSION: 'Conclusions direction',
    MANAGER_OBSERVATION: 'Observations managers',
    INTERNAL_DISCUSSION: 'Discussions internes',
  };
  const hcBadgeColors: Record<string, string> = {
    DIRECTOR_CONCLUSION: '#4f46e5',
    MANAGER_OBSERVATION: '#b45309',
    INTERNAL_DISCUSSION: '#0e7490',
  };
  const hierarchyComments: ReportHierarchyComment[] = mission?.hierarchyComments ?? [];
  const hcRows = hierarchyComments
    .map((c) => {
      const type = String(c?.type ?? '');
      const typeLabel = hcTypeLabels[type] || type || 'Commentaire';
      const badgeColor = hcBadgeColors[type] || '#64748b';
      const author = c?.createdBy
        ? [c.createdBy.firstName, c.createdBy.lastName].filter(Boolean).join(' ')
        : '';
      const date = c?.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR') : '';
      const attachments = (c?.documents ?? [])
        .map((d) => escapeHtml(d?.originalName || ''))
        .filter(Boolean);
      return `
      <div class="hc-card">
        <div class="hc-head">
          <span class="hc-badge" style="background:${badgeColor}">${escapeHtml(typeLabel)}</span>
          <span class="hc-meta">${escapeHtml(author || '—')}${date ? ` · ${escapeHtml(date)}` : ''}</span>
        </div>
        <div class="hc-title">${escapeHtml(c?.title) || '—'}</div>
        ${c?.parentComment?.title ? `<div class="hc-parent">En réponse à : ${escapeHtml(c.parentComment.title)}</div>` : ''}
        <p class="hc-content">${escapeHtml(c?.content) || '—'}</p>
        <div class="hc-attach">Pièces jointes : ${attachments.length ? attachments.join(', ') : 'aucune'}</div>
      </div>`;
    })
    .join('');

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

  /* Commentaires hiérarchiques */
  .hc-card { border: 1px solid #e2e8f0; border-left: 3px solid #6366f1; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; background: #ffffff; }
  .hc-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
  .hc-badge { border-radius: 12px; padding: 2px 10px; font-size: 8.5px; font-weight: 700; color: #ffffff; letter-spacing: 0.3px; white-space: nowrap; }
  .hc-meta { font-size: 9px; color: #94a3b8; text-align: right; }
  .hc-title { font-size: 11.5px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .hc-parent { font-size: 9px; color: #94a3b8; font-style: italic; margin-bottom: 4px; }
  .hc-content { font-size: 10.5px; color: #475569; line-height: 1.6; white-space: pre-wrap; margin: 0; }
  .hc-attach { font-size: 9px; color: #64748b; margin-top: 6px; padding-top: 5px; border-top: 1px dashed #e2e8f0; }
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
    <div class="desc">${escapeHtml(mission.title) || ''}</div>
    <div class="meta">
      <div class="meta-item"><b>Chef de mission :</b> ${escapeHtml(mission.leader?.firstName) || ''} ${escapeHtml(mission.leader?.lastName) || ''}</div>
      <div class="meta-item"><b>Plan :</b> ${escapeHtml(mission.plan?.title) || '-'} (${mission.plan?.year || '-'})</div>
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
      <p class="section-desc">${escapeHtml(mission.description) || '-'}</p>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span> Objectifs de l'audit</div>
      <p class="section-desc">${escapeHtml(mission.objective) || '-'}</p>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span> Périmètre de l'audit</div>
      <p class="section-desc">${escapeHtml(mission.scopeDescription) || '-'}</p>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span> Méthodologie</div>
      <p class="section-desc">${escapeHtml(mission.methodology) || '-'}</p>
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
              <td><strong>${escapeHtml(f.title) || '-'}</strong></td>
              <td>${escapeHtml(f.riskLevel?.name) || '-'}</td>
              <td>${escapeHtml(f.cause) || '-'}</td>
              <td>${escapeHtml(f.impact) || '-'}</td>
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
              r.assigneeName ? escapeHtml(r.assigneeName) : null,
              r.assigneeUser ? escapeHtml(r.assigneeUser.firstName + ' ' + r.assigneeUser.lastName) : null,
              r.assigneeGlpiUser ? escapeHtml(r.assigneeGlpiUser.email) : null
            ].filter(Boolean).join(' / ') || '-';
            return `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${escapeHtml(r.title) || '-'}</strong></td>
              <td>${escapeHtml(r.actionPlan) || '-'}</td>
              <td>${r.targetDate ? new Date(r.targetDate).toLocaleDateString('fr-FR') : '-'}</td>
              <td>${escapeHtml(r.department?.name) || '-'}</td>
              <td>${affectation}</td>
              <td><span class="badge">${escapeHtml(r.status) || '-'}</span></td>
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
              r.assigneeName ? escapeHtml(r.assigneeName) : null,
              r.assigneeUser ? escapeHtml(r.assigneeUser.firstName + ' ' + r.assigneeUser.lastName) : null,
              r.assigneeGlpiUser ? escapeHtml(r.assigneeGlpiUser.email) : null
            ].filter(Boolean).join(' / ') || '-';
            return `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${escapeHtml(r.title) || '-'}</strong></td>
              <td>${escapeHtml(r.actionPlan) || '-'}</td>
              <td>${r.targetDate ? new Date(r.targetDate).toLocaleDateString('fr-FR') : '-'}</td>
              <td>${escapeHtml(r.department?.name) || '-'}</td>
              <td>${affectation}</td>
              <td><span class="badge">${escapeHtml(r.status) || '-'}</span></td>
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
              <td>${escapeHtml(ticket?.ticketNumber || ticket?.glpiId) || '-'}</td>
              <td><strong>${escapeHtml(ticket?.title) || '-'}</strong></td>
              <td>${escapeHtml(ticket?.status) || '-'}</td>
              <td>${escapeHtml(ticket?.priority) || '-'}</td>
              <td>${escapeHtml(ticket?.requesterGlpiUser?.fullName) || '-'}</td>
              <td>${escapeHtml(ticket?.assigneeGlpiUser?.fullName) || '-'}</td>
              <td>${escapeHtml(item.findingTitle) || '-'}</td>
              <td>${escapeHtml(item.recommendationTitle) || '-'}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>`}
    </div>

    <!-- Conclusion -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Conclusion</div>
      <p class="section-desc">${escapeHtml(mission.conclusion) || '-'}</p>
    </div>

    <!-- Commentaires hiérarchiques -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Commentaires hiérarchiques</div>
      ${hierarchyComments.length
        ? `<div class="hc-list">${hcRows}</div>`
        : '<p class="section-desc" style="font-style:italic">Aucun commentaire hiérarchique pour cette mission.</p>'}
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-title">Auditeur</div>
        <div class="sig-name">${escapeHtml(mission.leader?.firstName) || ''} ${escapeHtml(mission.leader?.lastName) || ''}</div>
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


  const orgName = escapeHtml(mission.tenant?.name) ?? 'Organisation';
  const orgCode = escapeHtml(mission.tenant?.code) ?? '';
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
        <td>${escapeHtml(m.user ? `${m.user.firstName} ${m.user.lastName}` : m.glpiUser ? (m.glpiUser.fullName || m.glpiUser.email || '-') : (m.externalParticipant?.fullName || '-'))}</td>
        <td>${escapeHtml(m.roleInMission) || '-'}</td>
        <td style="text-align:center">${m.isLead ? 'Oui' : 'Non'}</td>
      </tr>
    `).join('');

  const scopeRows = scopes
    .map((s: any, i: number) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${escapeHtml(s.auditableEntity.name)}</td>
        <td>${escapeHtml(s.auditableEntity.code) || '-'}</td>
        <td>${escapeHtml(s.auditableEntity.entityType) || '-'}</td>
        <td>${escapeHtml(s.scopeRole) || '-'}</td>
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
        <div class="value highlight">${escapeHtml(mission.title)}</div>
      </div>
      <div class="info-card">
        <div class="label">Référence du plan</div>
        <div class="value">${escapeHtml(mission.plan?.title) || `Plan d'audit ${mission.plan?.year}`} — ${mission.plan?.year ?? ''}</div>
      </div>
      <div class="info-card">
        <div class="label">Type d'audit</div>
        <div class="value">${escapeHtml(mission.auditType?.name) ?? 'Non spécifié'}</div>
      </div>
      <div class="info-card">
        <div class="label">Chef de mission</div>
        <div class="value">${leader ? escapeHtml(`${leader.firstName} ${leader.lastName}`) : '-'}</div>
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
      <p class="section-desc">${escapeHtml(mission.objective || mission.description) || '-'}</p>
    </div>

    <!-- Périmètre -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Périmètre d'intervention</div>
      ${mission.scopeDescription ? `<p class="section-desc" style="margin-bottom:10px">${escapeHtml(mission.scopeDescription)}</p>` : ''}
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
      <p class="section-desc">${escapeHtml(mission.methodology)}</p>
    </div>` : ''}

    <!-- Mention légale -->
    <div class="mention-box">
      <p><strong>Important :</strong> Le présent ordre de mission autorise l'équipe d'audit désignée ci-dessus à accéder aux locaux, documents et systèmes d'information des entités figurant dans le périmètre d'intervention, dans le cadre exclusif de cette mission. Toute personne sollicitée est tenue de coopérer pleinement avec l'équipe d'audit conformément à la charte d'audit interne.</p>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-title">Chef de mission</div>
        <div class="sig-name">${leader ? escapeHtml(`${leader.firstName} ${leader.lastName}`) : '-'}</div>
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

// =====================================================
// GÉNÉRATION PDF — browser partagé + concurrence limitée
// =====================================================

const MAX_CONCURRENT_PDFS = 2;        // rendus simultanés max
const PDF_RENDER_TIMEOUT_MS = 45_000; // timeout d'un rendu
const PDF_LAUNCH_TIMEOUT_MS = 60_000; // protocolTimeout navigateur

type PDFBrowser = Awaited<ReturnType<typeof puppeteer.launch>>;
type PDFLaunchOptions = Parameters<typeof puppeteer.launch>[0];
type PDFPage = Awaited<ReturnType<PDFBrowser['newPage']>>;

let pdfBrowserPromise: Promise<PDFBrowser> | null = null;
let activePdfRenders = 0;
const pdfRenderQueue: Array<() => void> = [];

/** Réserve un slot de rendu PDF (sémaphore simple). */
async function acquirePdfSlot(): Promise<void> {
  if (activePdfRenders < MAX_CONCURRENT_PDFS) {
    activePdfRenders += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    pdfRenderQueue.push(resolve);
  });
}

/** Libère un slot et réveille le prochain en attente. */
function releasePdfSlot(): void {
  activePdfRenders -= 1;
  const next = pdfRenderQueue.shift();
  if (next) {
    activePdfRenders += 1;
    next();
  }
}

/**
 * Chemins de binaires Chromium/Chrome candidats (redondance multi-binaires).
 * Si le binaire principal (PUPPETEER_EXECUTABLE_PATH) est cassé/absent, on tente
 * les autres emplacements connus avant de déclarer Chromium indisponible.
 */
function browserCandidates(): string[] {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH;
  const list: string[] = [];
  if (env) list.push(env);
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || '';
    const prog = process.env.ProgramFiles || 'C:\\Program Files';
    const prog86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    if (local) list.push(path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    list.push(
      path.join(prog, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(prog86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(prog, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    );
  } else {
    list.push(
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium.chromium'
    );
  }
  try {
    list.push(puppeteer.executablePath());
  } catch {
    /* ignore */
  }
  return [...new Set(list.filter(Boolean))];
}

/**
 * Lance (ou réutilise) l'instance Chrome partagée.
 * Stratégie : shell (si dispo) → puis chaque binaire candidat (redondance) →
 * puis résolution par défaut de Puppeteer. Premier lancement réussi gagnant.
 * Chaque tentative utilise un `userDataDir` NEUF (évite les conflits de verrou
 * de profil Chrome entre tentatives) ; les tentatives échouées sont nettoyées.
 */
async function launchPDFBrowser(): Promise<PDFBrowser> {
  const profilesDir = path.join(STORAGE_PATH, 'chrome-profiles');
  fs.mkdirSync(profilesDir, { recursive: true });

  const errors: string[] = [];

  const launchAttempt = async (label: string, makeOpts: (dir: string) => PDFLaunchOptions): Promise<PDFBrowser | null> => {
    const userDataDir = fs.mkdtempSync(path.join(profilesDir, 'profile-'));
    try {
      const browser = await puppeteer.launch(makeOpts(userDataDir));
      // Si le navigateur meurt (crash, OOM...), la prochaine requête en relancera un neuf.
      browser.on('disconnected', () => {
        const proc = browser.process();
        console.error(
          `[generatePDF] Navigateur Chrome arrêté de façon inattendue (exit code: ${proc?.exitCode ?? 'n/a'}, signal: ${proc?.signalCode ?? 'n/a'})`
        );
        pdfBrowserPromise = null;
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      });
      return browser;
    } catch (err) {
      errors.push(`${label}: ${(err as Error).message}`);
      // Nettoyage de la tentative échouée (aucun verrou de profil laissé derrière).
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      return null;
    }
  };

  const baseOptions = (dir: string): PDFLaunchOptions => ({
    userDataDir: dir,
    protocolTimeout: PDF_LAUNCH_TIMEOUT_MS,
    dumpio: process.env.PUPPETEER_DUMPIO === 'true',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  // 1) Mode shell (ancien headless) : le plus stable pour page.pdf() —
  //    réservé au Chrome géré par Puppeteer (chrome-headless-shell).
  const shellBrowser = await launchAttempt('shell', (dir) => ({ headless: 'shell', ...baseOptions(dir) }));
  if (shellBrowser) return shellBrowser;

  // 2) Redondance multi-binaires : chaque candidat en mode headless.
  for (const exe of browserCandidates()) {
    const candidate = await launchAttempt(exe, (dir) => ({ headless: true, executablePath: exe, ...baseOptions(dir) }));
    if (candidate) return candidate;
  }

  // 3) Dernière chance : résolution par défaut de Puppeteer (Chrome for Testing).
  const fallback = await launchAttempt('default', (dir) => ({ headless: true, ...baseOptions(dir) }));
  if (fallback) return fallback;

  throw new Error(`Aucun navigateur Chromium disponible (${errors.join(' | ')})`);
}

async function getPDFBrowser(): Promise<PDFBrowser> {
  if (!pdfBrowserPromise) {
    pdfBrowserPromise = launchPDFBrowser().catch((err) => {
      pdfBrowserPromise = null;
      throw err;
    });
  }
  return pdfBrowserPromise;
}

/** Ferme proprement l'instance partagée (appelé au shutdown du serveur). */
export async function closePDFBrowser(): Promise<void> {
  const pending = pdfBrowserPromise;
  pdfBrowserPromise = null;
  if (pending) {
    try {
      const browser = await pending;
      await browser.close();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Repli : récupère le PDF directement en base64 via le protocole CDP,
 * en contournant le flux `IO.read` de page.pdf() qui échoue sur certains
 * environnements (PM2/Windows) avec "Protocol error (IO.read): Read failed".
 */
async function renderPdfViaCdpData(page: PDFPage): Promise<Buffer> {
  const cdp = await page.createCDPSession();
  const result = await cdp.send('Page.printToPDF', {
    paperWidth: 8.27, // A4 (pouces)
    paperHeight: 11.69,
    printBackground: true,
    transferMode: 'ReturnAsBase64',
    marginTop: 0.79, // ~20mm
    marginBottom: 0.79,
    marginLeft: 0.59, // ~15mm
    marginRight: 0.59,
  });
  return Buffer.from(result.data, 'base64');
}

/** Rend le HTML en PDF sur une page neuve (sans relancer le navigateur). */
async function renderPdfOnce(html: string): Promise<Buffer> {
  const browser = await getPDFBrowser();
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'load', timeout: PDF_RENDER_TIMEOUT_MS });
    try {
      await page.evaluate(() => (document as any).fonts?.ready?.then(() => true));
    } catch {
      /* ignore */
    }
    try {
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdfBuffer);
    } catch (pdfError) {
      console.warn(
        '[generatePDF] page.pdf() a échoué, repli sur Page.printToPDF (ReturnAsBase64) :',
        (pdfError as Error).message
      );
      return await renderPdfViaCdpData(page);
    }
  } finally {
    await page.close().catch(() => {});
  }
}

/** Rendu de secours (pdfmake, sans navigateur) fourni par l'appelant. */
export type PDFFallbackRenderer = () => Promise<Buffer>;

/**
 * Génère un PDF à partir de HTML.
 *
 * Pipeline :
 *  1. rendu Puppeteer/Chromium (qualité maximale) ;
 *  2. en cas d'échec → relance du navigateur puis nouvelle tentative ;
 *  3. si Chromium est TOUJOURS indisponible → bascule automatique sur le moteur
 *     de secours fourni (`fallback`, pdfmake pur JS) pour garantir qu'un PDF est
 *     bien produit même si le navigateur est mort (binaire cassé, OOM, sandbox...).
 */
export const generatePDF = async (html: string, fallback?: PDFFallbackRenderer): Promise<Buffer> => {
  await acquirePdfSlot();
  const startedAt = Date.now();
  try {
    try {
      return await renderPdfOnce(html);
    } catch (firstError) {
      console.warn(
        '[generatePDF] Échec du rendu, relance du navigateur puis nouvelle tentative :',
        (firstError as Error).message
      );
      await closePDFBrowser();
      const buffer = await renderPdfOnce(html);
      console.log(`[generatePDF] Succès après relance (durée totale ${Date.now() - startedAt}ms)`);
      return buffer;
    }
  } catch (secondError) {
    if (!fallback) throw secondError;
    console.error(
      `[generatePDF] Chromium indisponible — bascule en MODE DÉGRADÉ (pdfmake) : ${(secondError as Error).message}`
    );
    const buffer = await fallback();
    console.log(`[generatePDF] PDF généré par le moteur de secours en ${Date.now() - startedAt}ms`);
    return buffer;
  } finally {
    releasePdfSlot();
    console.log(`[generatePDF] Rendu terminé en ${Date.now() - startedAt}ms`);
  }
};

/** Résultat du contrôle de santé du moteur PDF. */
export interface PDFHealth {
  ok: boolean;
  engine: 'chromium' | 'degraded';
  latencyMs: number;
  detail?: string;
}

/**
 * Contrôle de santé : tente un mini-rendu Chromium pour savoir si le moteur
 * principal fonctionne (et si la génération basculera en mode dégradé).
 * Aucun navigateur n'est lancé si `getPDFBrowser` a déjà échoué.
 */
export async function checkPDFHealth(): Promise<PDFHealth> {
  const startedAt = Date.now();
  const probeHtml =
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>body{font-family:sans-serif}</style></head><body><h1>health</h1></body></html>';
  try {
    await renderPdfOnce(probeHtml);
    return { ok: true, engine: 'chromium', latencyMs: Date.now() - startedAt };
  } catch (err) {
    return {
      ok: false,
      engine: 'degraded',
      latencyMs: Date.now() - startedAt,
      detail: (err as Error).message,
    };
  }
}

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

  const orgName = escapeHtml(mission.tenant?.name) ?? 'Organisation';
  const orgCode = escapeHtml(mission.tenant?.code) ?? '';
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
      const memberName = escapeHtml(m.user
        ? `${m.user.firstName} ${m.user.lastName}`
        : m.glpiUser
          ? (m.glpiUser.fullName || m.glpiUser.email || '-')
          : (m.externalParticipant?.fullName || '-'));
      const memberEmail = escapeHtml(m.user?.email || m.glpiUser?.email || m.externalParticipant?.email) || '-';
      return `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td>${memberName}</td>
        <td>${memberEmail}</td>
        <td>${escapeHtml(m.roleInMission) || '-'}</td>
        <td style="text-align:center">${m.isLead ? 'Oui' : 'Non'}</td>
      </tr>`;
    }).join('');

  const scopeRows = scopes
    .map((s: any, i: number) => `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td>${escapeHtml(s.auditableEntity.name)}</td>
        <td>${escapeHtml(s.auditableEntity.code) || '-'}</td>
        <td>${escapeHtml(s.auditableEntity.entityType) || '-'}</td>
        <td>${escapeHtml(s.scopeRole) || '-'}</td>
      </tr>
    `).join('');

  const findingRows = findings
    .map((f: any, i: number) => `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td><strong>${escapeHtml(f.title) || '-'}</strong></td>
        <td>${escapeHtml(f.description) || '-'}</td>
        <td>${escapeHtml(f.riskLevel?.name) || '-'}</td>
        <td>${escapeHtml(f.cause) || '-'}</td>
        <td>${escapeHtml(f.impact) || '-'}</td>
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
        <div class="value highlight">${escapeHtml(mission.title)}</div>
      </div>
      <div class="info-card">
        <div class="label">Statut</div>
        <div class="value"><span class="status-badge status-${mission.status?.toLowerCase()?.replace('_', '-') || 'planned'}">${statusLabel}</span></div>
      </div>
      <div class="info-card">
        <div class="label">Référence du plan</div>
        <div class="value">${escapeHtml(mission.plan?.title) || `Plan d'audit ${mission.plan?.year}`} — ${mission.plan?.year ?? ''}</div>
      </div>
      <div class="info-card">
        <div class="label">Type d'audit</div>
        <div class="value">${escapeHtml(mission.auditType?.name) ?? 'Non spécifié'}</div>
      </div>
      <div class="info-card">
        <div class="label">Chef de mission</div>
        <div class="value">${leader ? escapeHtml(`${leader.firstName} ${leader.lastName}`) : '-'}</div>
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
      <p class="section-desc">${escapeHtml(mission.description)}</p>
    </div>` : ''}

    <!-- Objectif -->
    ${mission.objective ? `
    <div class="section">
      <div class="section-title"><span class="dot"></span> Objectif de la mission</div>
      <p class="section-desc">${escapeHtml(mission.objective)}</p>
    </div>` : ''}

    <!-- Périmètre -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Périmètre d'intervention</div>
      ${mission.scopeDescription ? `<p class="section-desc" style="margin-bottom:10px">${escapeHtml(mission.scopeDescription)}</p>` : ''}
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
      <p class="section-desc">${escapeHtml(mission.methodology)}</p>
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
// ================= PROTOCOLE DE MISSION D'AUDIT =================

export const getMissionProtocolData = async (missionId: number, tenantId: number) => {
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
      programs: {
        select: {
          id: true,
          title: true,
          status: true,
          programType: true,
          objective: true,
          scopeDescription: true,
          plannedStartDate: true,
          plannedEndDate: true,
          _count: { select: { procedures: true } },
          procedures: {
            select: { id: true, code: true, title: true, sequenceNo: true },
            orderBy: { sequenceNo: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      documents: {
        select: { id: true, originalName: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
      approvals: {
        select: {
          id: true,
          decision: true,
          comments: true,
          createdAt: true,
          approver: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};

export const buildMissionProtocolHTML = (mission: any): string => {
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

  const orgName = escapeHtml(mission.tenant?.name) ?? 'Organisation';
  const orgCode = escapeHtml(mission.tenant?.code) ?? '';
  const refNumber = `PROTO-${mission.plan?.year ?? new Date().getFullYear()}-${String(mission.id).padStart(4, '0')}`;
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const leader = mission.leader;
  const members = mission.members ?? [];
  const scopes = mission.scopes ?? [];
  const programs = mission.programs ?? [];
  const documents = mission.documents ?? [];
  const approvals = mission.approvals ?? [];

  const startDate = mission.startDate
    ? new Date(mission.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'À définir';
  const endDate = mission.endDate
    ? new Date(mission.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'À définir';

  const durationDays = mission.startDate && mission.endDate
    ? Math.max(1, Math.ceil((new Date(mission.endDate).getTime() - new Date(mission.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) + ' jour(s)'
    : 'Non définie';

  const statusLabels: Record<string, string> = {
    PLANNED: 'Planifiée',
    READY: 'Prête',
    IN_PROGRESS: 'En cours',
    UNDER_REVIEW: 'En relecture',
    APPROVED: 'Approuvée',
    CLOSED: 'Clôturée',
    CANCELLED: 'Annulée',
  };
  const statusLabel = statusLabels[mission.status] || mission.status || '-';

  const memberRows = members
    .map((m: any, i: number) => {
      const memberName = escapeHtml(m.user
        ? `${m.user.firstName} ${m.user.lastName}`
        : m.glpiUser
          ? (m.glpiUser.fullName || m.glpiUser.email || '-')
          : (m.externalParticipant?.fullName || '-'));
      const memberEmail = escapeHtml(m.user?.email || m.glpiUser?.email || m.externalParticipant?.email) || '-';
      return `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td>${memberName}</td>
        <td>${memberEmail}</td>
        <td>${escapeHtml(m.roleInMission) || '-'}</td>
        <td style="text-align:center">${m.isLead ? 'Oui' : 'Non'}</td>
      </tr>`;
    }).join('');

  const scopeRows = scopes
    .map((s: any, i: number) => `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td>${escapeHtml(s.auditableEntity.name)}</td>
        <td>${escapeHtml(s.auditableEntity.code) || '-'}</td>
        <td>${escapeHtml(s.auditableEntity.entityType) || '-'}</td>
      </tr>
    `).join('');

  const programRows = programs
    .map((p: any, i: number) => {
      const procedures = p.procedures ?? [];
      const maxVisible = 10;
      const visibleProcs = procedures.slice(0, maxVisible);
      const extraCount = procedures.length - maxVisible;
      const procList = visibleProcs.length > 0 ? `
        <div style="margin-top:6px;padding:8px 10px;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:6px">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#059669;margin-bottom:4px">Procédures (${procedures.length})</div>
          ${visibleProcs.map((pr: any) => `
            <div style="font-size:9.5px;color:#334155;padding:1px 0;line-height:1.5">
              <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#10b981;margin-right:6px;"></span>
              ${pr.code ? `<span style="font-weight:600;color:#065f46">${escapeHtml(pr.code)}</span><span style="color:#10b981"> — </span>` : ''}${escapeHtml(pr.title) || '-'}
            </div>
          `).join('')}
          ${extraCount > 0 ? `<div style="font-size:9px;color:#94a3b8;font-style:italic;padding:1px 0;margin-top:2px">… et ${extraCount} autre(s) procédure(s)</div>` : ''}
        </div>` : '';
      const objectiveHtml = p.objective ? `
        <div style="margin-top:${procList ? '8' : '4'}px">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:2px">Objectif</div>
          <div style="font-size:10px;color:#475569;line-height:1.5">${escapeHtml(p.objective)}</div>
        </div>` : '';
      return `
      <tr>
        <td style="text-align:center;width:30px;vertical-align:top">${i + 1}</td>
        <td>
          <strong>${escapeHtml(p.title) || '-'}</strong>
          ${procList}
          ${objectiveHtml}
        </td>
        <td style="vertical-align:top">${escapeHtml(p.programType) || '-'}</td>
        <td style="text-align:center;vertical-align:top">${p._count?.procedures ?? 0}</td>
        <td style="vertical-align:top">${escapeHtml(p.status) || '-'}</td>
      </tr>`;
    }).join('');

  const docRows = documents
    .map((d: any, i: number) => `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td>${escapeHtml(d.originalName)}</td>
        <td>${new Date(d.createdAt).toLocaleDateString('fr-FR')}</td>
      </tr>
    `).join('');

  const approvalRows = approvals
    .map((a: any, i: number) => `
      <tr>
        <td style="text-align:center;width:30px">${i + 1}</td>
        <td>${escapeHtml(a.approver?.firstName) ?? ''} ${escapeHtml(a.approver?.lastName) ?? ''}</td>
        <td>${escapeHtml(a.decision) || '-'}</td>
        <td>${escapeHtml(a.comments) || '-'}</td>
        <td>${new Date(a.createdAt).toLocaleDateString('fr-FR')}</td>
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

  /* ─── Bandeau supérieur ─── */
  .top-band { background: #f0fdf4; border-bottom: 4px solid #10b981; padding: 18px 40px; }
  .logo-row { display: flex; align-items: center; gap: 20px; }
  .logo-row img { max-height: 60px; }
  .org-info { flex: 1; }
  .org-name { font-size: 16px; font-weight: 800; color: #065f46; }
  .org-code { font-size: 11px; color: #10b981; font-weight: 600; }

  /* ─── Titre document ─── */
  .doc-title-bar { background: linear-gradient(135deg, #059669, #10b981); color: #fff; padding: 22px 40px; text-align: center; }
  .doc-title-bar h1 { font-size: 22px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
  .doc-title-bar .ref { font-size: 11px; opacity: 0.8; margin-top: 4px; }

  /* ─── Contenu ─── */
  .content { padding: 30px 40px; }

  /* ─── Grille infos ─── */
  .info-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
  .info-card { flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
  .info-card-full { flex-basis: 100%; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 700; margin-bottom: 2px; }
  .value { font-size: 12px; font-weight: 600; color: #1e293b; }
  .highlight { font-size: 14px; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; color: #fff; }
  .status-planned { background: #94a3b8; }
  .status-ready { background: #3b82f6; }
  .status-in_progress, .status-in-progress { background: #10b981; }
  .status-under_review, .status-under-review { background: #f59e0b; }
  .status-approved { background: #059669; }
  .status-closed { background: #1e293b; }
  .status-cancelled { background: #ef4444; }

  /* ─── Sections ─── */
  .section { margin-top: 22px; }
  .section-title { font-size: 13.5px; font-weight: 700; color: #065f46; border-bottom: 2px solid #10b981; padding-bottom: 5px; margin-bottom: 10px; }
  .section-desc { font-size: 11px; color: #475569; line-height: 1.6; white-space: pre-wrap; }

  /* ─── Tableaux ─── */
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 8px; }
  th { background: #f0fdf4; color: #065f46; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; border-bottom: 2px solid #a7f3d0; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; color: #475569; }
  tr:nth-child(even) td { background: #f8fafc; }

  /* ─── Durée ─── */
  .duration-card { display: inline-block; background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 16px; margin-top: 8px; }
  .duration-card .label { color: #059669; }
  .duration-card .value { color: #065f46; font-size: 14px; }

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
    <h1>Protocole de Mission d'Audit</h1>
    <div class="ref">${refNumber}</div>
  </div>

  <!-- ═══ CONTENU ═══ -->
  <div class="content">

    <!-- Informations clés -->
    <div class="info-grid">
      <div class="info-card info-card-full">
        <div class="label">Mission d'audit</div>
        <div class="value highlight">${escapeHtml(mission.title)}</div>
      </div>
      <div class="info-card">
        <div class="label">Statut</div>
        <div class="value"><span class="status-badge status-${mission.status?.toLowerCase()?.replace('_', '-') || 'planned'}">${statusLabel}</span></div>
      </div>
      <div class="info-card">
        <div class="label">Chef de mission</div>
        <div class="value">${leader ? escapeHtml(`${leader.firstName} ${leader.lastName}`) : 'Non assigné'}</div>
      </div>
      <div class="info-card">
        <div class="label">Plan d'audit</div>
        <div class="value">${mission.plan ? `${escapeHtml(mission.plan.title) ?? ''} (${mission.plan.year})` : 'N/A'}</div>
      </div>
      <div class="info-card">
        <div class="label">Type d'audit</div>
        <div class="value">${escapeHtml(mission.auditType?.name) || 'N/A'}</div>
      </div>
      <div class="info-card">
        <div class="label">Période</div>
        <div class="value">${startDate} — ${endDate}</div>
      </div>
      <div class="info-card">
        <div class="label">Durée</div>
        <div class="value">${durationDays}</div>
      </div>
    </div>

    <!-- Description -->
    ${mission.description ? `
    <div class="section">
      <div class="section-title">Description</div>
      <p class="section-desc">${escapeHtml(mission.description)}</p>
    </div>` : ''}

    <!-- Objectif -->
    ${mission.objective ? `
    <div class="section">
      <div class="section-title">Objet & Objectifs de la mission</div>
      <p class="section-desc">${escapeHtml(mission.objective)}</p>
    </div>` : ''}

    <!-- Périmètre -->
    <div class="section">
      <div class="section-title">Périmètre de la mission</div>
      ${mission.scopeDescription ? `<p class="section-desc">${escapeHtml(mission.scopeDescription)}</p>` : ''}
      ${scopes.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width:30px;text-align:center">#</th>
            <th>Entité</th>
            <th>Code</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>${scopeRows}</tbody>
      </table>` : '<p class="section-desc" style="font-style:italic">Aucune entité dans le périmètre.</p>'}
    </div>

    <!-- Méthodologie -->
    ${mission.methodology ? `
    <div class="section">
      <div class="section-title">Méthodologie d'audit</div>
      <p class="section-desc">${escapeHtml(mission.methodology)}</p>
    </div>` : ''}

    <!-- Programmes de travail -->
    <div class="section">
      <div class="section-title">Programme(s) de travail</div>
      ${programs.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width:30px;text-align:center">#</th>
            <th>Titre</th>
            <th>Type</th>
            <th>Procédures</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>${programRows}</tbody>
      </table>` : '<p class="section-desc" style="font-style:italic">Aucun programme défini.</p>'}
    </div>

    <!-- Planning -->
    <div class="section">
      <div class="section-title">Planning & Durée prévisionnelle</div>
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Début</div>
          <div class="value">${startDate}</div>
        </div>
        <div class="info-card">
          <div class="label">Fin</div>
          <div class="value">${endDate}</div>
        </div>
        <div class="info-card" style="background:#f0fdf4;border-color:#a7f3d0">
          <div class="label" style="color:#059669">Durée</div>
          <div class="value" style="color:#065f46">${durationDays}</div>
        </div>
      </div>
    </div>

    <!-- Équipe -->
    <div class="section">
      <div class="section-title">Membres de la mission</div>
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

    <!-- Documents -->
    ${documents.length > 0 ? `
    <div class="section">
      <div class="section-title">Documents</div>
      <table>
        <thead>
          <tr>
            <th style="width:30px;text-align:center">#</th>
            <th>Nom du fichier</th>
            <th>Date d'ajout</th>
          </tr>
        </thead>
        <tbody>${docRows}</tbody>
      </table>
    </div>` : ''}

    <!-- Approbations -->
    ${approvals.length > 0 ? `
    <div class="section">
      <div class="section-title">Approbations</div>
      <table>
        <thead>
          <tr>
            <th style="width:30px;text-align:center">#</th>
            <th>Approbateur</th>
            <th>Décision</th>
            <th>Commentaires</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>${approvalRows}</tbody>
      </table>
    </div>` : ''}

  </div>

  <!-- ═══ PIED DE PAGE ═══ -->
  <div class="footer">
    ${orgName} — Document généré automatiquement le ${today} — Réf. ${refNumber} — Ce document est confidentiel.
  </div>

</body>
</html>`;
};