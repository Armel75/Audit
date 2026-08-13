import { defineConfig } from 'vitest/config';

// =============================================================================
// Vitest — configuration racine du monorepo Audit
// 3 projets isolés :
//   - api:unit        → tests unitaires API (logique pure, aucune BDD requise)
//   - api:integration → tests d'intégration Supertest (base dédiée AuditDB_Test)
//   - web             → tests unitaires frontend (utilitaires purs)
// =============================================================================
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'api:unit',
          environment: 'node',
          include: ['apps/api/test/**/*.test.ts'],
          // Les tests d'intégration (base réelle) sont exclus du projet unitaire
          exclude: ['apps/api/test/**/*.integration.test.ts'],
          setupFiles: ['apps/api/test/setup-unit.ts'],
        },
      },
      {
        test: {
          name: 'api:integration',
          environment: 'node',
          include: ['apps/api/test/**/*.integration.test.ts'],
          setupFiles: ['apps/api/test/setup-integration.ts'],
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
      {
        test: {
          name: 'web',
          environment: 'node',
          include: ['apps/web/src/**/*.test.ts'],
        },
      },
    ],
    // ── Couverture de code (gate CI) ──────────────────────────────────────
    // Appliquée par `npm run test:coverage` (= --project api:unit uniquement).
    // Seuils volontairement modestes au départ, à relever avec la suite
    // (objectif > 80 %). Les seuils RACINE sont bien appliqués (contrairement
    // aux seuils par projet dans ce setup).
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      thresholds: {
        statements: 40,
        functions: 65,
        branches: 25,
        lines: 40,
      },
    },
  },
});


