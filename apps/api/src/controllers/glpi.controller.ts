import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GLPI Users
export const getGLPIUsers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const users = await prisma.gLPIUser.findMany({
      where: { tenantId },
      orderBy: { fullName: 'asc' }
    });

    res.json(users);
  } catch (error: any) {
    console.error('Error fetching GLPI users:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs GLPI' });
  }
};

export const getGLPIUser = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const user = await prisma.gLPIUser.findFirst({
      where: { id: parseInt(id), tenantId },
      include: {
        assignedRecommendations: true,
        requestedTickets: true,
        assignedTickets: true
      }
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur GLPI non trouvé' });

    res.json(user);
  } catch (error: any) {
    console.error('Error fetching GLPI user:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur GLPI' });
  }
};

// Tickets
export const getTickets = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const tickets = await prisma.ticket.findMany({
      where: { tenantId },
      include: {
        requesterGlpiUser: { select: { id: true, fullName: true, email: true } },
        assigneeGlpiUser: { select: { id: true, fullName: true, email: true } },
        _count: { select: { recommendationLinks: true } }
      },
      orderBy: { openedAt: 'desc' }
    });

    res.json(tickets);
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des tickets' });
  }
};

export const getTicket = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const ticket = await prisma.ticket.findFirst({
      where: { id: parseInt(id), tenantId },
      include: {
        requesterGlpiUser: true,
        assigneeGlpiUser: true,
        recommendationLinks: {
          include: {
            recommendation: {
              select: { id: true, title: true, status: true }
            },
            linkedByUser: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket non trouvé' });

    res.json(ticket);
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du ticket' });
  }
};

// Link Ticket to Recommendation
export const linkTicketToRecommendation = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const { recommendationId, ticketId, linkType, note } = req.body;

    const link = await prisma.recommendationTicket.create({
      data: {
        tenantId,
        recommendationId: parseInt(recommendationId),
        ticketId: parseInt(ticketId),
        linkType: linkType || 'RELATED',
        note,
        linkedByUserId: userId
      },
      include: {
        ticket: true
      }
    });

    res.status(201).json(link);
  } catch (error: any) {
    console.error('Error linking ticket to recommendation:', error);
    res.status(500).json({ error: 'Erreur lors de la liaison du ticket à la recommandation' });
  }
};

export const unlinkTicketFromRecommendation = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    await prisma.recommendationTicket.deleteMany({
      where: { id: parseInt(id), tenantId }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error unlinking ticket:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la liaison' });
  }
};
