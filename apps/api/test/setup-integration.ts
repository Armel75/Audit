// =============================================================================
// Setup des tests d'intégration API (Supertest).
// Redirige DATABASE_URL vers la base de test DÉDIÉE "AuditDB_Test" afin de ne
// JAMAIS toucher aux données de production (AuditDB).
// Prérequis : avoir préparé la base via `npm run test:setup`.
// =============================================================================
import path from 'path';
import dotenv from 'dotenv';

// 1) Charger le .env racine (le setup s'exécute avant l'import de l'app)
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const original = process.env.DATABASE_URL;

if (!original) {
  throw new Error(
    '[TESTS] DATABASE_URL manquante. Vérifiez le fichier .env ou exécutez `npm run test:setup`.'
  );
}

// 2) Pointer vers la base de test dédiée (même serveur, base AuditDB_Test)
const testUrl = original.replace(/database=[^;]+/, 'database=AuditDB_Test');
process.env.DATABASE_URL = testUrl;

// 3) Valeurs minimales pour l'import des routes (auth.routes exige JWT_EXPIRES_IN)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

console.log('[TESTS] DATABASE_URL redirigée vers AuditDB_Test (base de test dédiée).');
