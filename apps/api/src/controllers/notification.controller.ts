import { Request, Response } from 'express';
const prisma = require('@audit/database').default;

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where = { tenantId, recipientUserId: userId };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({
      data: notifications,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const count = await prisma.notification.count({
      where: { tenantId, recipientUserId: userId, readAt: null },
    });

    res.json({ count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Erreur lors du comptage des notifications' });
  }
};

export const getRecentNotifications = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { tenantId, recipientUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.notification.count({
        where: { tenantId, recipientUserId: userId, readAt: null },
      }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('Error fetching recent notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    await prisma.notification.updateMany({
      where: { id: parseInt(id), tenantId, recipientUserId: userId },
      data: { readAt: new Date() }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la notification' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    await prisma.notification.updateMany({
      where: { tenantId, recipientUserId: userId, readAt: null },
      data: { readAt: new Date() }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications' });
  }
};
