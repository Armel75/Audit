import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include our mock user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Mock RBAC Middleware for V1.
 * In production, this extracts the JWT, finds the user, and checks their RolePermissions in DB.
 */
export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Mocking the authenticated user context for SOREPCO
    req.user = {
      id: 'mock-user-id',
      tenantId: 'DEFAULT_SOREPCO_TENANT',
      // Injecting the legacy permissions requested for the Audit Plan module
      permissions: ['can_create_campaign', 'can_view_all_campaigns'] 
    };

    // 2. Enforce RBAC
    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        error: 'Accès refusé', 
        details: `La permission '${requiredPermission}' est requise.` 
      });
    }

    next();
  };
};
