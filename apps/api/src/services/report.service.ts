import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { Buffer } from 'buffer';
import path from 'path';
import fs from 'fs';
import { Prisma } from '@prisma/client';

type MissionReport = Prisma.AuditMissionGetPayload<{
  include: {
    leader: true;
    findings: {
      include: {
        riskLevel: true;
        recos: true;
      };
    };
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

const prisma = new PrismaClient();

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
          recos: true,
        },
      },
      plan: true,
    },
  });
};


//export const buildReportHTML = (mission: any) => {
export const buildReportHTML = (mission: MissionReport) => {
    let logoSrc = '';
    try {
        const logoFullPath = path.resolve(process.cwd(), '../../template/logo.png');
        const logoBase64 = fs.readFileSync(logoFullPath).toString('base64');
        logoSrc = `data:image/png;base64,${logoBase64}`;
    } catch (e) {
        console.warn('Logo not found, skipping...');
    }

    const findings = mission?.findings || [];
    //const findings: Finding[] = mission?.findings ?? [];

  return `
  <html>
  <head>
    <style>
      body {
        font-family: Arial;
        font-size: 12px;
        line-height: 1.5;
        padding: 40px;
      }

      h1, h2, h3 {
        text-align: center;
      }

      .logo {
        text-align: center;
        margin-bottom: 20px;
      }

      .section {
        margin-top: 30px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }

      th, td {
        border: 1px solid #000;
        padding: 6px;
        text-align: left;
      }

      .small {
        font-size: 11px;
      }
    </style>
  </head>

  <body>

    <!-- LOGO -->
    <div class="logo">
      <img src="${logoSrc}" height="80"/>
    </div>

    <!-- TITRE -->
    <h1>RAPPORT D'AUDIT INTERNE</h1>

    <!-- INFOS -->
    <div class="section">
      <p><strong>Mission :</strong> ${mission.title}</p>
      <p><strong>Auditeur :</strong> ${mission.leader?.firstName} ${mission.leader?.lastName}</p>
      <p><strong>Date :</strong> ${new Date().toLocaleDateString()}</p>
    </div>

    <!-- CONTEXTE -->
    <div class="section">
      <h2>1. CONTEXTE DE LA MISSION</h2>
      <p>${mission.description || '-'}</p>
    </div>

    <!-- OBJECTIFS -->
    <div class="section">
      <h2>2. OBJECTIFS DE L'AUDIT</h2>
      <p>${mission.objective || '-'}</p>
    </div>

    <!-- PERIMETRE -->
    <div class="section">
      <h2>3. PERIMETRE DE L'AUDIT</h2>
      <p>${mission.scopeDescription || '-'}</p>
    </div>

    <!-- METHODO -->
    <div class="section">
      <h2>4. METHODOLOGIE</h2>
      <p>${mission.methodology || '-'}</p>
    </div>

    <!-- CONSTATS -->
    <div class="section">
      <h2>5. SYNTHESE DES CONSTATS</h2>

      <table>
        <tr>
          <th>#</th>
          <th>Constat</th>
          <th>Niveau de risque</th>
          <th>Impact</th>
        </tr>

        ${findings.flatMap(f => f.recos).map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${r.title}</td>
            <td>${r.assigneeName ?? '-'}</td>
            <td>${new Date(r.targetDate).toLocaleDateString()}</td>
        </tr>
        `).join('')}

      </table>
    </div>

    <!-- ANALYSE RISQUES -->
    <div class="section">
      <h2>6. ANALYSE DES RISQUES</h2>

      <p>
        Nombre de constats : ${findings.length}
      </p>

      <p>
        Risques critiques :
        ${findings.filter(f => f.riskLevel?.name === 'critique').length}
      </p>
    </div>

    <!-- RECOMMANDATIONS -->
    <div class="section">
      <h2>7. RECOMMANDATIONS</h2>

      <table>
        <tr>
          <th>#</th>
          <th>Recommandation</th>
          <th>Responsable</th>
          <th>Délai</th>
        </tr>

        ${findings.flatMap(f => f.recos || []).map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${r.title}</td>
            <td>${r.assigneeName || '-'}</td>
            <td>${r.targetDate ? new Date(r.targetDate).toLocaleDateString() : '-'}</td>
          </tr>
        `).join('')}

      </table>
    </div>

    <!-- PLAN ACTION -->
    <div class="section">
      <h2>8. PLAN D'ACTION</h2>

      <table>
        <tr>
          <th>Action</th>
          <th>Responsable</th>
          <th>Date prévue</th>
          <th>Statut</th>
        </tr>

        ${findings.flatMap(f => f.recos || []).map(r => `
          <tr>
            <td>${r.title}</td>
            <td>${r.assigneeName || '-'}</td>
            <td>${r.targetDate ? new Date(r.targetDate).toLocaleDateString() : '-'}</td>
            <td>${r.status}</td>
          </tr>
        `).join('')}

      </table>
    </div>

    <!-- CONCLUSION -->
    <div class="section">
      <h2>9. CONCLUSION</h2>
      <p>
        Les recommandations permettront de réduire les risques identifiés.
      </p>
    </div>

    <!-- VALIDATION -->
    <div class="section">
      <h2>10. VALIDATION</h2>
      <p>Auditeur : ________________________</p>
      <p>Chef Service Audit : ________________________</p>
    </div>

  </body>
  </html>
  `;
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
  try {
    const logoFullPath = path.resolve(process.cwd(), '../../template/logo.png');
    const logoBase64 = fs.readFileSync(logoFullPath).toString('base64');
    logoSrc = `data:image/png;base64,${logoBase64}`;
  } catch (e) {
    // pas de logo → on continue sans
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
        <td>${m.user.firstName} ${m.user.lastName}</td>
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
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
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