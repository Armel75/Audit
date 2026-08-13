// =============================================================================
// Tests d'intégration — API (Supertest)
// Exigent la base de test dédiée AuditDB_Test, préparée via `npm run test:setup`
// (voir scripts/setup-test-db.ts). La production (AuditDB) n'est jamais touchée.
// =============================================================================
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

// Identifiants seedés par le bootstrap dans AuditDB_Test (.env)
const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@audit.local';
const ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123';

describe('API — endpoints publics', () => {
  it('GET /api/v1/health → 200 { status: ok }', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('SISAR API');
  });

  it('route inconnue → 404', async () => {
    const res = await request(app).get('/api/v1/route-inexistante');

    expect(res.status).toBe(404);
  });

  it('POST /api/v1/auth/login sans identifiants → 400', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe('API — authentification (base de test AuditDB_Test)', () => {
  it('POST /api/v1/auth/login avec identifiants seedés → 200 + accessToken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe(ADMIN_EMAIL);
    // Set-Cookie httpOnly du refresh token
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/v1/auth/login avec un mauvais mot de passe → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: ADMIN_EMAIL, password: 'mauvais-mot-de-passe' });

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/login avec un identifiant inconnu → 401 (message générique)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'inconnu@audit.local', password: ADMIN_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Identifiant ou mot de passe invalide');
  });
});

describe('API — observabilité (Prometheus)', () => {
  it('GET /metrics → 200 au format Prometheus avec nos métriques', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('sisar_http_requests_total');
    expect(res.text).toContain('sisar_http_request_duration_seconds');
    // Métriques Node par défaut (préfixées sisar_)
    expect(res.text).toContain('sisar_process_resident_memory_bytes');
  });

  it('les requêtes sont comptées dans /metrics après un appel', async () => {
    await request(app).get('/api/v1/health');

    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/sisar_http_requests_total\{[^}]*route="\/api\/v1\/health"[^}]*\} [1-9]/);
  });
});
