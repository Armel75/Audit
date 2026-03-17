import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';

// Routes
import authRoutes from './src/server/routes/auth.routes';
import documentRoutes from './src/server/routes/document.routes';
import missionRoutes from './src/server/routes/mission.routes';
import recommendationRoutes from './src/server/routes/recommendation.routes';
import findingRoutes from './src/server/routes/finding.routes';
import settingsRoutes from './src/server/routes/settings.routes';
import usersRoutes from './src/server/routes/users.routes';
import auditPlanRoutes from './src/server/routes/audit-plan.routes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Ensure local storage directory exists (Simulating /var/sorepco/sisar/storage)
  const storagePath = path.join(process.cwd(), '.storage');
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/missions', missionRoutes);
  app.use('/api/recommendations', recommendationRoutes);
  app.use('/api/findings', findingRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/plans', auditPlanRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'SISAR API', tenant: 'SOREPCO' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SISAR] Server running on http://localhost:${PORT}`);
  });
}

startServer();
