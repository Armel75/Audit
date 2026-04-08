const prisma = require('@audit/database').default;
import { glpiPool } from '../infrastructure/database/glpiMysql';

type GlpiUserRow = {
  id: number;
  name: string | null;
  realname: string | null;
  firstname: string | null;
  phone: string | null;
  is_active: number | null;
  is_deleted: number | null;
  date_mod: Date | string | null;
};

type GlpiTicketRow = {
  id: number;
  name: string | null;
  content: string | null;
  status: string | null;
  priority: number | null;
  urgency: number | null;
  impact: number | null;
  itilcategories_id: number | null;
  entities_id: number | null;
  locations_id: number | null;
  date: Date | string | null;
  solvedate: Date | string | null;
  closedate: Date | string | null;
  date_mod: Date | string | null;
};

type LocalGlpiUserInput = {
  glpiId: number;
  login: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  phone: string | null;
  status: string;
  isDeletedInSource: boolean;
  sourceUpdatedAt: Date | null;
  lastSyncedAt: Date;
  syncStatus: string;
  rawPayload: string;
};

type LocalTicketInput = {
  glpiId: number;
  ticketNumber: string | null;
  title: string;
  description: string | null;
  ticketType: string | null;
  status: string;
  priority: string | null;
  urgency: string | null;
  impact: string | null;
  categoryName: string | null;
  entityName: string | null;
  locationName: string | null;
  openedAt: Date | null;
  dueAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  sourceUpdatedAt: Date | null;
  lastSyncedAt: Date;
  syncStatus: string;
  rawPayload: string;
};

function buildFullName(user: GlpiUserRow): string {
  const firstName = String(user.firstname || '').trim();
  const lastName = String(user.realname || '').trim();
  const login = String(user.name || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return fullName || login || `GLPI User ${user.id}`;
}

function mapGlpiUser(user: GlpiUserRow): LocalGlpiUserInput {
  return {
    glpiId: user.id,
    login: user.name || null,
    firstName: user.firstname || null,
    lastName: user.realname || null,
    fullName: buildFullName(user),
    phone: user.phone || null,
    status: user.is_active === 0 ? 'INACTIVE' : 'ACTIVE',
    isDeletedInSource: user.is_deleted === 1,
    sourceUpdatedAt: user.date_mod ? new Date(user.date_mod) : null,
    lastSyncedAt: new Date(),
    syncStatus: 'SYNCED',
    rawPayload: JSON.stringify(user),
  };
}

function mapGlpiTicket(ticket: GlpiTicketRow): LocalTicketInput {
  return {
    glpiId: ticket.id,
    ticketNumber: ticket.name || null,
    title: ticket.name || `Ticket ${ticket.id}`,
    description: ticket.content || null,
    ticketType: null, // GLPI ne semble pas avoir de type direct
    status: mapGlpiStatus(ticket.status),
    priority: mapGlpiPriority(ticket.priority),
    urgency: mapGlpiUrgency(ticket.urgency),
    impact: mapGlpiImpact(ticket.impact),
    categoryName: null, // À récupérer depuis itilcategories si nécessaire
    entityName: null, // À récupérer depuis entities si nécessaire
    locationName: null, // À récupérer depuis locations si nécessaire
    openedAt: ticket.date ? new Date(ticket.date) : null,
    dueAt: null,
    resolvedAt: ticket.solvedate ? new Date(ticket.solvedate) : null,
    closedAt: ticket.closedate ? new Date(ticket.closedate) : null,
    sourceUpdatedAt: ticket.date_mod ? new Date(ticket.date_mod) : null,
    lastSyncedAt: new Date(),
    syncStatus: 'SYNCED',
    rawPayload: JSON.stringify(ticket),
  };
}

function mapGlpiStatus(glpiStatus: string | null): string {
  if (!glpiStatus) return 'OPEN';

  const statusMap: Record<string, string> = {
    '1': 'NEW',
    '2': 'ASSIGNED',
    '3': 'PLANNED',
    '4': 'WAITING',
    '5': 'SOLVED',
    '6': 'CLOSED',
    '7': 'ACCEPTED',
    '8': 'OBSERVED',
    '9': 'EVALUATION',
    '10': 'APPROVAL',
    '11': 'TEST',
    '12': 'QUALIFICATION'
  };

  return statusMap[glpiStatus] || 'OPEN';
}

function mapGlpiPriority(priority: number | null): string | null {
  if (!priority) return null;

  const priorityMap: Record<number, string> = {
    1: 'VERY_LOW',
    2: 'LOW',
    3: 'MEDIUM',
    4: 'HIGH',
    5: 'VERY_HIGH',
    6: 'MAJOR'
  };

  return priorityMap[priority] || null;
}

function mapGlpiUrgency(urgency: number | null): string | null {
  if (!urgency) return null;

  const urgencyMap: Record<number, string> = {
    1: 'VERY_LOW',
    2: 'LOW',
    3: 'MEDIUM',
    4: 'HIGH',
    5: 'VERY_HIGH'
  };

  return urgencyMap[urgency] || null;
}

function mapGlpiImpact(impact: number | null): string | null {
  if (!impact) return null;

  const impactMap: Record<number, string> = {
    1: 'VERY_LOW',
    2: 'LOW',
    3: 'MEDIUM',
    4: 'HIGH',
    5: 'VERY_HIGH'
  };

  return impactMap[impact] || null;
}

function isConnectivityError(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  const code = String(e?.code || '').toUpperCase();
  const message = String(e?.message || '').toLowerCase();

  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    message.includes('timeout') ||
    message.includes('connect') ||
    message.includes('connection lost')
  );
}

async function resolveTenantId(): Promise<number> {
  const configuredTenantId = Number(process.env.BOOTSTRAP_TENANT_ID);

  if (Number.isFinite(configuredTenantId) && configuredTenantId > 0) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: configuredTenantId },
      select: { id: true },
    });

    if (tenant) {
      return tenant.id;
    }
  }

  const sorepcoTenant = await prisma.tenant.findFirst({
    where: { code: 'SOREPCO' },
    select: { id: true },
  });

  if (sorepcoTenant) {
    return sorepcoTenant.id;
  }

  const firstTenant = await prisma.tenant.findFirst({
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  if (!firstTenant) {
    throw new Error('Aucun tenant local disponible pour la synchronisation GLPI');
  }

  return firstTenant.id;
}

export class GlpiSyncService {
  async getUsers(limit = 1000): Promise<LocalGlpiUserInput[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 1000, 1), 5000);

    try {
      const [rows] = await glpiPool.query(
        `SELECT id, name, realname, firstname, phone, is_active, is_deleted, date_mod
         FROM glpi_users
         WHERE is_deleted = 0
         ORDER BY id DESC
         LIMIT ?`,
        [safeLimit]
      );

      return (rows as GlpiUserRow[]).map(mapGlpiUser);
    } catch (error) {
      if (isConnectivityError(error)) {
        console.warn('[GLPI] getUsers unreachable:', (error as any)?.code || (error as any)?.message);
        return [];
      }

      throw error;
    }
  }

  async getTickets(limit = 1000): Promise<LocalTicketInput[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 1000, 1), 5000);

    try {
      const [rows] = await glpiPool.query(
        `SELECT id, name, content, status, priority, urgency, impact, itilcategories_id, entities_id, locations_id, date, solvedate, closedate, date_mod
         FROM glpi_tickets
         WHERE is_deleted = 0 AND status NOT IN ('5', '6')
         ORDER BY id DESC
         LIMIT ?`,
        [safeLimit]
      );

      return (rows as GlpiTicketRow[]).map(mapGlpiTicket);
    } catch (error) {
      if (isConnectivityError(error)) {
        console.warn('[GLPI] getTickets unreachable:', (error as any)?.code || (error as any)?.message);
        return [];
      }

      throw error;
    }
  }

  async syncUsersToLocalDb(limit = 1000) {
    try {
      const tenantId = await resolveTenantId();
      const users = await this.getUsers(limit);

      if (!users.length) {
        return {
          success: true,
          synced: 0,
          message: 'GLPI inaccessible ou aucun utilisateur disponible',
        };
      }

      const existingUsers = await prisma.gLPIUser.findMany({
        where: {
          tenantId,
          glpiId: {
            in: users.map((user: LocalGlpiUserInput) => user.glpiId),
          },
        },
        select: {
          glpiId: true,
        },
      });

      const existingIds = new Set(existingUsers.map((user: { glpiId: number }) => user.glpiId));
      const usersToCreate = users.filter((user: LocalGlpiUserInput) => !existingIds.has(user.glpiId));

      if (!usersToCreate.length) {
        return {
          success: true,
          synced: 0,
          message: 'Aucun nouvel utilisateur GLPI a synchroniser',
        };
      }

      const created = await prisma.gLPIUser.createMany({
        data: usersToCreate.map((user: LocalGlpiUserInput) => ({
          tenantId,
          glpiId: user.glpiId,
          login: user.login,
          email: null,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          phone: user.phone,
          departmentName: null,
          entityName: null,
          status: user.status,
          isDeletedInSource: user.isDeletedInSource,
          sourceUpdatedAt: user.sourceUpdatedAt,
          lastSyncedAt: user.lastSyncedAt,
          syncStatus: user.syncStatus,
          rawPayload: user.rawPayload,
        })),
      });

      return {
        success: true,
        synced: created.count,
        message: `${created.count} utilisateur(s) GLPI synchronise(s)`,
      };
    } catch (error: any) {
      return {
        success: false,
        synced: 0,
        message: error?.message || 'Erreur inconnue pendant la synchro GLPI',
        code: error?.code || null,
      };
    }
  }

  async syncTicketsToLocalDb(limit = 1000) {
    try {
      const tenantId = await resolveTenantId();
      const tickets = await this.getTickets(limit);

      if (!tickets.length) {
        return {
          success: true,
          synced: 0,
          message: 'GLPI inaccessible ou aucun ticket disponible',
        };
      }

      const existingTickets = await prisma.ticket.findMany({
        where: {
          tenantId,
          glpiId: {
            in: tickets.map((ticket: LocalTicketInput) => ticket.glpiId),
          },
        },
        select: {
          glpiId: true,
        },
      });

      const existingIds = new Set(existingTickets.map((ticket: { glpiId: number }) => ticket.glpiId));
      const ticketsToCreate = tickets.filter((ticket: LocalTicketInput) => !existingIds.has(ticket.glpiId));

      if (!ticketsToCreate.length) {
        return {
          success: true,
          synced: 0,
          message: 'Aucun nouveau ticket GLPI a synchroniser',
        };
      }

      const created = await prisma.ticket.createMany({
        data: ticketsToCreate.map((ticket: LocalTicketInput) => ({
          tenantId,
          glpiId: ticket.glpiId,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          description: ticket.description,
          ticketType: ticket.ticketType,
          status: ticket.status,
          priority: ticket.priority,
          urgency: ticket.urgency,
          impact: ticket.impact,
          categoryName: ticket.categoryName,
          entityName: ticket.entityName,
          locationName: ticket.locationName,
          openedAt: ticket.openedAt,
          dueAt: ticket.dueAt,
          resolvedAt: ticket.resolvedAt,
          closedAt: ticket.closedAt,
          sourceUpdatedAt: ticket.sourceUpdatedAt,
          lastSyncedAt: ticket.lastSyncedAt,
          syncStatus: ticket.syncStatus,
          rawPayload: ticket.rawPayload,
        })),
      });

      return {
        success: true,
        synced: created.count,
        message: `${created.count} ticket(s) GLPI synchronise(s)`,
      };
    } catch (error: any) {
      return {
        success: false,
        synced: 0,
        message: error?.message || 'Erreur inconnue pendant la synchro GLPI',
        code: error?.code || null,
      };
    }
  }
}
