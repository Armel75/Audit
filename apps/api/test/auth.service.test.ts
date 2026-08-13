// =============================================================================
// Tests unitaires — AuthService (parties pures, sans accès BDD)
// Les flux qui utilisent Prisma (login, lockout, reset…) sont couverts par les
// tests d'intégration (apps/api/test/app.integration.test.ts) contre la base
// de test dédiée AuditDB_Test.
// =============================================================================
import { describe, it, expect } from 'vitest';
import { AuthService } from '../src/services/auth.service';

describe('AuthService.generateRefreshToken / hashRefreshToken', () => {
  it('génère un token aléatoire de 80 hex et son hash SHA-256', () => {
    const { plainToken, tokenHash } = AuthService.generateRefreshToken();

    expect(plainToken).toMatch(/^[0-9a-f]{80}$/);
    expect(tokenHash).toBe(AuthService.hashRefreshToken(plainToken));
    expect(tokenHash).not.toBe(plainToken);
  });

  it('produit un hash déterministe et unique', () => {
    const a = AuthService.hashRefreshToken('mon-token');
    const b = AuthService.hashRefreshToken('mon-token');
    const c = AuthService.hashRefreshToken('autre-token');

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('génère des refresh tokens uniques à chaque appel', () => {
    const t1 = AuthService.generateRefreshToken();
    const t2 = AuthService.generateRefreshToken();

    expect(t1.plainToken).not.toBe(t2.plainToken);
    expect(t1.tokenHash).not.toBe(t2.tokenHash);
  });
});
