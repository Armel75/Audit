import { Request, Response } from 'express';
const prisma = require('@audit/database').default;

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { entityType, entityId, action, userId, limit = 100, offset = 0 } = req.query;

    const where: any = { tenantId };

    if (entityType) where.entityName = entityType as string;
    if (entityId) where.entityId = String(entityId); // ✅ FIX ICI
    if (action) where.action = action as string;
    if (userId) where.userId = parseInt(userId as string);

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.auditLog.count({ where });

    res.json({ logs, total });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des journaux d\'audit' });
  }
};
