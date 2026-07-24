const prisma = require('@audit/database').default;

// ================= TYPES DE NOTIFICATIONS =================

export const NOTIFICATION_TYPES = {
  MISSION_AWAITING_ENRICHMENT: 'MISSION_AWAITING_ENRICHMENT',
  MISSION_AWAITING_REVIEW: 'MISSION_AWAITING_REVIEW',
  MISSION_READY: 'MISSION_READY',
  MISSION_STARTED: 'MISSION_STARTED',
  MISSION_CLOSED: 'MISSION_CLOSED',
  MISSION_CANCELLED: 'MISSION_CANCELLED',
  MEMBER_ASSIGNED: 'MEMBER_ASSIGNED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  FINDING_CREATED: 'FINDING_CREATED',
  FINDING_STATUS_CHANGED: 'FINDING_STATUS_CHANGED',
  RECOMMENDATION_CREATED: 'RECOMMENDATION_CREATED',
  RECOMMENDATION_STATUS_CHANGED: 'RECOMMENDATION_STATUS_CHANGED',
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  APPROVAL_DECISION: 'APPROVAL_DECISION',
  HIERARCHY_COMMENT_ADDED: 'HIERARCHY_COMMENT_ADDED',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

interface NotificationPayload {
  tenantId: number;
  type: NotificationType;
  title: string;
  message: string;
  missionId?: number;
  findingId?: number;
  recommendationId?: number;
  planId?: number;
  auditProgramId?: number;
  recipientIds: number[];
}

export class NotificationService {

  /**
   * Crée une notification pour une liste de destinataires (bulk insert).
   */
  static async notify(payload: NotificationPayload): Promise<void> {
    const { tenantId, type, title, message, missionId, findingId, recommendationId, planId, auditProgramId, recipientIds } = payload;

    if (!recipientIds.length) return;

    const now = new Date();

    await prisma.notification.createMany({
      data: recipientIds.map(recipientUserId => ({
        tenantId,
        recipientUserId,
        title,
        message,
        notificationType: type,
        channel: 'IN_APP',
        status: 'PENDING',
        sentAt: now,
        missionId: missionId ?? null,
        findingId: findingId ?? null,
        recommendationId: recommendationId ?? null,
        planId: planId ?? null,
        auditProgramId: auditProgramId ?? null,
      })),
    });
  }

  // ================= RÉSOLUTION DE DESTINATAIRES =================

  /**
   * Retourne les IDs des utilisateurs ayant une permission donnée dans un tenant.
   */
  static async getUserIdsByPermission(tenantId: number, permissionCode: string): Promise<number[]> {
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        role: {
          permissions: {
            some: {
              permission: { code: permissionCode },
            },
          },
        },
      },
      select: { id: true },
    });
    return users.map((u: { id: number }) => u.id);
  }

  /**
   * Retourne les IDs des membres internes (INTERNAL_USER) d'une mission.
   */
  static getMissionMemberUserIds(mission: { members: Array<{ user?: { id: number } | null }> }): number[] {
    return mission.members
      .filter(m => m.user?.id)
      .map(m => m.user!.id);
  }

  /**
   * Notifie tous les membres internes d'une mission + le leader.
   */
  static async notifyMissionMembers(
    tenantId: number,
    mission: { id: number; leaderId?: number | null; members: Array<{ user?: { id: number } | null }> },
    type: NotificationType,
    title: string,
    message: string,
    excludeUserId?: number,
  ): Promise<void> {
    const memberIds = this.getMissionMemberUserIds(mission);
    const recipientIds = new Set<number>([...memberIds]);

    if (mission.leaderId) recipientIds.add(mission.leaderId);
    if (excludeUserId) recipientIds.delete(excludeUserId);

    await this.notify({
      tenantId,
      type,
      title,
      message,
      missionId: mission.id,
      recipientIds: Array.from(recipientIds),
    });
  }

  /**
   * Notifie les utilisateurs ayant une permission spécifique (ex: audit_mission:enrich).
   */
  static async notifyPermissionHolders(
    tenantId: number,
    permissionCode: string,
    type: NotificationType,
    title: string,
    message: string,
    missionId?: number,
    excludeUserId?: number,
  ): Promise<void> {
    const userIds = await this.getUserIdsByPermission(tenantId, permissionCode);
    const filtered = excludeUserId ? userIds.filter(id => id !== excludeUserId) : userIds;

    await this.notify({
      tenantId,
      type,
      title,
      message,
      missionId,
      recipientIds: filtered,
    });
  }
}
