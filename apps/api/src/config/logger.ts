// =============================================================================
// Logger structuré (JSON) — pino
// Niveau : LOG_LEVEL (défaut info). Silencieux en test pour des sorties propres.
// Les logs JSON sont directement collectables par Loki/ELK (évolution prévue).
// =============================================================================
import pino from 'pino';

const level =
  process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info');

export const logger = pino({
  level,
  base: { service: 'sisar-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
