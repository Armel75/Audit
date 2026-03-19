import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        permissions: string[];
        [key: string]: any;
      };
    }
  }
}

interface AuthUser {
  id: string;
  tenantId: string;
  permissions: string[];
  [key: string]: any;
}

const isAuthUser = (user: any): user is AuthUser => {
  return (
    user &&
    typeof user === 'object' &&
    (typeof user.id === 'string' || typeof user.id === 'number') &&
    (typeof user.tenantId === 'string' || typeof user.tenantId === 'number') &&
    Array.isArray(user.permissions)
  );
};

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    //  console.log("TOKEN:", token);
    // console.log("DECODED:", decoded);
    // console.log("ERROR:", err);
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!isAuthUser(decoded)) {
       console.log("INVALID PAYLOAD");
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.user = decoded; // ✅ maintenant safe
    next();
  });
};

// Alias for existing routes that use requireAuth
export const requireAuth = authenticateToken;

export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !user.permissions || !user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ error: `Forbidden: Requires ${requiredPermission} permission` });
    }
    next();
  };
};
