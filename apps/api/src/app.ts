import './config/env'; // DOIT être le premier import : charge dotenv avant tout autre module
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { STORAGE_PATH, ROOT_PATH } from './config/storage';
import { logger } from './config/logger';
import { metricsMiddleware, metricsHandler } from './infrastructure/metrics';
import { checkPDFHealth } from './services/report.service';

// Routes
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import missionRoutes from './routes/mission.routes';
import recommendationRoutes from './routes/recommendation.routes';
import findingRoutes from './routes/finding.routes';
import settingsRoutes from './routes/settings.routes';
import referentialRoutes from './routes/referential.routes';
import usersRoutes from './routes/users.routes';
import auditPlanRoutes from './routes/audit-plan.routes';
import adminRoutes from './routes/admin.routes';
import auditProgramRoutes from './routes/auditProgram.routes';
import glpiRoutes from './routes/glpi.routes';
import exportRoutes from './routes/export.routes';
import evidenceRoutes from './routes/evidence.routes';
import approvalRoutes from './routes/approval.routes';
import notificationRoutes from './routes/notification.routes';
import auditLogRoutes from './routes/auditLog.routes';
import auditableEntityRoutes from './routes/auditableEntity.routes';
import businessProcessRoutes from './routes/businessProcess.routes';
import dashboardRoutes from './routes/dashboard.routes';
import hierarchyCommentRoutes from './routes/hierarchyComment.routes';

logger.debug('Application configurée (routes chargées)');

/**
 * Construit et retourne l'application Express (sans démarrer le serveur).
 * Le cycle de vie (bootstrap, listen, cron, arrêt) reste dans server.ts.
 * Cette séparation permet les tests d'intégration (Supertest).
 */
export function createApp() {
  const app = express();

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // ── Observabilité ────────────────────────────────────────────────────────
  // Logs HTTP structurés (JSON, niveau silencieux en test)
  app.use(pinoHttp({ logger }));
  // Métriques Prometheus (compteur + durée par route)
  app.use(metricsMiddleware);

  // Ensure local storage directory exists (Simulating /var/sorepco/sisar/storage)
  if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
  }

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/documents', documentRoutes);
  app.use('/api/v1/missions', missionRoutes);
  app.use('/api/v1/recommendations', recommendationRoutes);
  app.use('/api/v1/findings', findingRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1/referential', referentialRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/plans', auditPlanRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/programs', auditProgramRoutes);
  app.use('/api/v1/glpi', glpiRoutes);
  app.use('/api/v1/evidences', evidenceRoutes);
  app.use('/api/v1/approvals', approvalRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/audit-logs', auditLogRoutes);
  app.use('/api/v1/auditable-entities', auditableEntityRoutes);
  app.use('/api/v1/business-processes', businessProcessRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/hierarchy-comments', hierarchyCommentRoutes);
  app.use('/api/v1', exportRoutes);
  app.use('/storage', express.static(STORAGE_PATH));

  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', service: 'SISAR API', tenant: 'SOREPCO' });
  });

  // Santé du moteur PDF : Chromium opérationnel ou bascule en mode dégradé (pdfmake).
  app.get('/api/v1/health/pdf', async (req, res) => {
    try {
      const health = await checkPDFHealth();
      res.status(health.ok ? 200 : 503).json(health);
    } catch (err) {
      res.status(503).json({ ok: false, engine: 'degraded', detail: (err as Error).message });
    }
  });

  // Endpoint de métriques Prometheus (scrapé par le serveur de monitoring)
  app.get('/metrics', metricsHandler);

  if (process.env.NODE_ENV === 'production') {
    // const distPath = path.join(process.cwd(), '../../apps/web/dist');
    const distPath = path.join(ROOT_PATH, 'apps/web/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}
