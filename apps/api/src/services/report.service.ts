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

    return pdfBuffer as Buffer;
  } finally {
    await browser.close();
  }
};