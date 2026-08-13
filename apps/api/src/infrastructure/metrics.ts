// =============================================================================
// Métriques Prometheus — endpoint /metrics
// -----------------------------------------------------------------------------
// - Métriques Node par défaut (process, mémoire, event loop lag) avec préfixe
//   "sisar_"
// - Métriques HTTP : compteur + histogramme de durée (labels method/route/status)
// - /metrics est volontairement non authentifié (scrapé par Prometheus sur le
//   réseau interne uniquement).
// =============================================================================
import client from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

const registry = new client.Registry();

// Métriques Node.js (CPU, mémoire, event loop, handles…)
client.collectDefaultMetrics({ register: registry, prefix: 'sisar_' });

// Compteur de requêtes HTTP
const httpRequestsTotal = new client.Counter({
  name: 'sisar_http_requests_total',
  help: 'Nombre total de requêtes HTTP reçues',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

// Histogramme de durée des requêtes HTTP
const httpRequestDuration = new client.Histogram({
  name: 'sisar_http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Libellé de route : pattern Express (ex: /api/v1/auth/login) quand disponible,
// sinon le chemin réel (évite une cardinalité par id).
const routeLabel = (req: Request) => {
  const base = (req.baseUrl || '') + (req.route?.path || '');
  return base || req.path;
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Exclut le scraping lui-même pour éviter une boucle
  if (req.path === '/metrics') return next();

  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
};

export const metricsHandler = async (_req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
};
