import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

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
import evidenceRoutes from './routes/evidence.routes';
import approvalRoutes from './routes/approval.routes';
import notificationRoutes from './routes/notification.routes';
import auditLogRoutes from './routes/auditLog.routes';

// Bootstrap
import { bootstrapAdmin } from './bootstrap/adminBootstrap';

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === 'production' ? 3003 : parseInt(process.env.API_PORT || '3003', 10);

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Ensure local storage directory exists (Simulating /var/sorepco/sisar/storage)
  const storagePath = path.join(process.cwd(), '../../.storage');
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
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

  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', service: 'SISAR API', tenant: 'SOREPCO' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), '../../apps/web/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  try {
    await bootstrapAdmin();
  } catch (error) {
    console.error('[BOOTSTRAP] Failed to bootstrap admin:', error);
    // Optionally decide if server should crash or continue
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SISAR] Server running on http://localhost:${PORT}`);
  });
}

startServer();
