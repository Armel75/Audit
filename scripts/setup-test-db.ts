// =============================================================================
// Préparation de la base de TEST dédiée : AuditDB_Test
// ---------------------------------------------------------------
// 1. Crée la base AuditDB_Test (sur le même serveur SQL Server que DATABASE_URL)
// 2. Applique les migrations Prisma (prisma migrate deploy)
// 3. Lance le bootstrap (permissions + admin) sur la base de test
//
// Aucun impact sur la base de production (AuditDB).
// Usage : npm run test:setup
// =============================================================================
import path from 'path';
import dotenv from 'dotenv';
import { spawnSync } from 'child_process';
import sql from 'mssql';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEST_DB = 'AuditDB_Test';

// ── Parser DATABASE_URL SQL Server ──────────────────────────────────────────
// Supporte les 2 formats :
//   sqlserver://host:port;database=X;user=Y;password=Z;encrypt=true;...
//   sqlserver://user:pass@host:port;database=X;encrypt=true;...
function parseSqlServerUrl(url: string) {
  const m = url.match(
    /^sqlserver:\/\/(?:([^:@;]+)(?::([^@;]*))?@)?([^:;]+)(?::(\d+))?(.*)$/i
  );
  if (!m) {
    throw new Error(`[TEST-DB] DATABASE_URL SQL Server invalide : ${url}`);
  }
  const [, urlUser, urlPass, host, urlPort, params] = m;
  const port = urlPort ? Number(urlPort) : 1433;
  const get = (name: string) => {
    const mm = (params || '').match(new RegExp(`(?:^|;)${name}=([^;]*)`, 'i'));
    return mm ? mm[1] : undefined;
  };
  return {
    host,
    port,
    user: get('user') || urlUser,
    password: get('password') || urlPass,
    database: get('database'),
  };
}

async function main() {
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) {
    console.error('[TEST-DB] ❌ DATABASE_URL manquante dans le .env');
    process.exit(1);
  }

  const parsed = parseSqlServerUrl(originalUrl);
  const testUrl = originalUrl.replace(/database=[^;]+/i, `database=${TEST_DB}`);

  console.log(`[TEST-DB] Serveur SQL : ${parsed.host}:${parsed.port}`);
  console.log(`[TEST-DB] Base de test cible : ${TEST_DB}`);

  // ── 1) Créer la base de test (connexion sur master) ──────────────────────
  const config: sql.config = {
    server: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: 'master',
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    connectionTimeout: 20_000,
    requestTimeout: 30_000,
  };

  let pool: sql.ConnectionPool;
  try {
    pool = await sql.connect(config);
  } catch (err: any) {
    console.error(
      `[TEST-DB] ❌ Impossible de joindre SQL Server ${parsed.host}:${parsed.port}. ` +
        `Vérifiez que la base est démarrée (make dev ou make up:ext).\n`,
      err.message
    );
    process.exit(1);
  }

  const dbResult = await pool.request().query(`
    IF DB_ID('${TEST_DB}') IS NULL
    BEGIN
      CREATE DATABASE [${TEST_DB}];
      PRINT 'CREATED';
    END
    ELSE
      PRINT 'EXISTS';
  `);
  await pool.close();
  console.log(`[TEST-DB] ✅ Base ${TEST_DB} prête.`);

  // ── 2) Appliquer les migrations Prisma sur la base de test ────────────────
  console.log('[TEST-DB] 🗄️  Application des migrations Prisma...');
  const migrate = spawnSync(
    'npx',
    ['prisma', 'migrate', 'deploy', '--schema=packages/database/schema.prisma'],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, DATABASE_URL: testUrl },
    }
  );
  if (migrate.status !== 0) {
    console.error('[TEST-DB] ❌ Échec des migrations Prisma.');
    process.exit(migrate.status ?? 1);
  }

  // ── 3) Seed : permissions + admin (bootstrap) sur la base de test ─────────
  console.log('[TEST-DB] 🌱 Seed (permissions + admin)...');
  process.env.DATABASE_URL = testUrl;
  process.env.BOOTSTRAP_ENABLED = 'true';

  const { runBootstrap } = await import('../apps/api/src/bootstrap');
  await runBootstrap();

  console.log(`[TEST-DB] 🎉 Base de test ${TEST_DB} initialisée avec succès.`);
}

main().catch((err) => {
  console.error('[TEST-DB] ❌ Erreur inattendue :', err);
  process.exit(1);
});
