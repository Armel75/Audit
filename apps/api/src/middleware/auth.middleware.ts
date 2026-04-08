import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        tenantId: number;
        permissions: string[];
        [key: string]: any;
      };
    }
  }
}

interface AuthUserRaw {
  id: string | number;
  tenantId: string | number;
  permissions: string[];
  [key: string]: any;
}

const isAuthUser = (user: any): user is AuthUserRaw => {
  return (
    user &&
    typeof user === 'object' &&
    (typeof user.id === 'string' || typeof user.id === 'number') &&
    (typeof user.tenantId === 'string' || typeof user.tenantId === 'number') &&
    Array.isArray(user.permissions)
  );
};

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

// 🔥 utilitaire sécurisé
const toInt = (value: any): number => {
  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new Error('Invalid numeric value in token');
  }
  return parsed;
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    console.log("AUTH HEADER:", req.headers.authorization);
    console.log("TOKEN:", token);
    console.log("DECODED:", decoded);
    console.log("ERROR:", err);

    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!isAuthUser(decoded)) {
      console.log("INVALID PAYLOAD");
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    try {
      // ✅ NORMALISATION CRITIQUE (solution définitive)
      req.user = {
        ...decoded,
        id: toInt(decoded.id),
        tenantId: toInt(decoded.tenantId),
      };

      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token data types' });
    }
  });
};

// Alias for existing routes
export const requireAuth = authenticateToken;

export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !Array.isArray(user.permissions)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 🔒 normalisation
    const hasPermission = user.permissions
      .map(p => p.toLowerCase())
      .includes(requiredPermission.toLowerCase());

    if (!hasPermission) {
      return res.status(403).json({
        error: `Forbidden: Requires ${requiredPermission}`
      });
    }

    next();
  };
};

export const requireAnyPermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !Array.isArray(user.permissions)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const normalizedPermissions = user.permissions.map((permission) => permission.toLowerCase());
    const hasPermission = requiredPermissions.some((permission) =>
      normalizedPermissions.includes(permission.toLowerCase())
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: `Forbidden: Requires one of ${requiredPermissions.join(', ')}`
      });
    }

    next();
  };
};
