import './config/env'; // DOIT être le premier import : charge dotenv avant tout autre module
import { createApp } from './app';
import { runBootstrap } from './bootstrap';
import { startGlpiUserSyncCron } from './cron/glpiUserSync.cron';
import { startGlpiTicketSyncCron } from './cron/glpiTicketSync.cron';
import { closePDFBrowser } from './services/report.service';

async function startServer() {
  const app = createApp();
  const PORT = process.env.NODE_ENV === 'production' ? 3007 : parseInt(process.env.API_PORT || '3007', 10);

  try {
    await runBootstrap();
  } catch (error) {
    console.error('[BOOTSTRAP] Failed to bootstrap admin:', error);
    // Optionally decide if server should crash or continue
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SISAR] Server running on http://localhost:${PORT}`);
    startGlpiUserSyncCron();
    startGlpiTicketSyncCron();
  });

  // Arrêt propre : ferme le navigateur Puppeteer partagé et le serveur HTTP
  const shutdown = async (signal: string) => {
    console.log(`[SISAR] Signal ${signal} reçu, arrêt propre en cours...`);
    try {
      await closePDFBrowser();
    } catch (err) {
      console.error('[SISAR] Erreur lors de la fermeture du navigateur PDF:', err);
    }
    server.close(() => process.exit(0));
    // Filet de sécurité si la fermeture HTTP traîne
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
