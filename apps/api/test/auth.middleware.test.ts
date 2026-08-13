// =============================================================================
// Tests unitaires — Middleware d'authentification (JWT)
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import {
  authenticateToken,
  requirePermission,
  requireAnyPermission,
} from '../src/middleware/auth.middleware';

// Le middleware lit process.env.JWT_SECRET, absent en tests unitaires →
// il utilise son fallback "fallback_secret_for_development_only".
const FALLBACK_SECRET = 'fallback_secret_for_development_only';

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res) as any;
  res.json = vi.fn().mockReturnValue(res) as any;
  return res;
};

const mockNext = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authenticateToken', () => {
  it('refuse une requête sans header Authorization (401)', () => {
    const req = { headers: {} } as Request;
    const res = mockRes() as Response;

    authenticateToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('refuse un token invalide (401)', () => {
    const req = { headers: { authorization: 'Bearer token-invalide' } } as Request;
    const res = mockRes() as Response;

    authenticateToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('refuse un token au payload incomplet (401)', () => {
    const token = jwt.sign({ foo: 'bar' }, FALLBACK_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes() as Response;

    authenticateToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('accepte un token valide et normalise id/tenantId en entiers', () => {
    const token = jwt.sign(
      { id: '5', tenantId: '3', permissions: ['admin:access'] },
      FALLBACK_SECRET
    );
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes() as Response;

    authenticateToken(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(req.user?.id).toBe(5);
    expect(req.user?.tenantId).toBe(3);
    expect(req.user?.permissions).toEqual(['admin:access']);
  });
});

describe('requirePermission', () => {
  it('refuse sans utilisateur authentifié (403)', () => {
    const req = {} as Request;
    const res = mockRes() as Response;

    requirePermission('admin:access')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('refuse un utilisateur sans la permission requise (403)', () => {
    const req = { user: { id: 1, tenantId: 1, permissions: ['user:read'] } } as Request;
    const res = mockRes() as Response;

    requirePermission('admin:access')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('autorise un utilisateur avec la permission (insensible à la casse)', () => {
    const req = { user: { id: 1, tenantId: 1, permissions: ['ADMIN:Access'] } } as Request;
    const res = mockRes() as Response;

    requirePermission('admin:access')(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireAnyPermission', () => {
  it('autorise si au moins une permission est présente', () => {
    const req = { user: { id: 1, tenantId: 1, permissions: ['user:read'] } } as Request;
    const res = mockRes() as Response;

    requireAnyPermission(['admin:access', 'user:read'])(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('refuse si aucune permission ne correspond (403)', () => {
    const req = { user: { id: 1, tenantId: 1, permissions: ['user:read'] } } as Request;
    const res = mockRes() as Response;

    requireAnyPermission(['admin:access', 'role:create'])(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
