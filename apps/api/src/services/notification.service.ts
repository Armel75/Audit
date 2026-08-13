import { sendNotificationEmail } from './mail.service';

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

// ================= EMAIL (actions majeures) =================

const EMAIL_NOTIFICATIONS_ENABLED =
  process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false';
const WEB_APP_URL = process.env.WEB_APP_URL?.replace(/\/$/, '');

// Types d'actions majeures qui déclenchent aussi un email (anti-bruit).
const EMAIL_ENABLED_TYPES: ReadonlySet<string> = new Set([
  NOTIFICATION_TYPES.MISSION_STARTED,
  NOTIFICATION_TYPES.MISSION_CLOSED,
  NOTIFICATION_TYPES.MISSION_CANCELLED,
  NOTIFICATION_TYPES.MISSION_READY,
  NOTIFICATION_TYPES.MISSION_AWAITING_ENRICHMENT,
  NOTIFICATION_TYPES.MISSION_AWAITING_REVIEW,
  NOTIFICATION_TYPES.MEMBER_ASSIGNED,
  NOTIFICATION_TYPES.MEMBER_REMOVED,
  NOTIFICATION_TYPES.FINDING_CREATED,
  NOTIFICATION_TYPES.FINDING_STATUS_CHANGED,
  NOTIFICATION_TYPES.RECOMMENDATION_CREATED,
  NOTIFICATION_TYPES.RECOMMENDATION_STATUS_CHANGED,
  NOTIFICATION_TYPES.APPROVAL_REQUESTED,
  NOTIFICATION_TYPES.APPROVAL_DECISION,
]);

// 🏢 Copie DG (Directeur Général) : 1 seul email par événement stratégique.
const DG_CC_EMAIL = process.env.NOTIFICATION_CC_EMAIL?.trim();

const DG_CC_TYPES: ReadonlySet<string> = new Set([
  NOTIFICATION_TYPES.MISSION_CLOSED,
  NOTIFICATION_TYPES.MISSION_CANCELLED,
  NOTIFICATION_TYPES.MISSION_READY,
  NOTIFICATION_TYPES.FINDING_CREATED,
  NOTIFICATION_TYPES.FINDING_STATUS_CHANGED,
  NOTIFICATION_TYPES.APPROVAL_REQUESTED,
  NOTIFICATION_TYPES.APPROVAL_DECISION,
]);

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
    const emailEnabled =
      EMAIL_NOTIFICATIONS_ENABLED && EMAIL_ENABLED_TYPES.has(type);

    await prisma.notification.createMany({
      data: recipientIds.map(recipientUserId => ({
        tenantId,
        recipientUserId,
        title,
        message,
        notificationType: type,
        channel: emailEnabled ? 'BOTH' : 'IN_APP',
        status: 'PENDING',
        sentAt: now,
        missionId: missionId ?? null,
        findingId: findingId ?? null,
        recommendationId: recommendationId ?? null,
        planId: planId ?? null,
        auditProgramId: auditProgramId ?? null,
      })),
    });

    // 📧 Email (fire-and-forget) : ne doit JAMAIS bloquer l'action principale.
    if (emailEnabled) {
      this.dispatchEmails(payload).catch((err) => {
        console.error('[NOTIF][EMAIL] Erreur lors de l\'envoi des emails:', err);
      });
    }
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

  // ================= ENVOI EMAIL (fire-and-forget) =================

  /**
   * Envoie un email à chaque destinataire (asynchrone, non bloquant).
   * Un échec SMTP n'empêche jamais l'action principale.
   */
  private static async dispatchEmails(payload: NotificationPayload): Promise<void> {
    const {
      tenantId,
      recipientIds,
      title,
      message,
      type,
      missionId,
      findingId,
      recommendationId,
      planId,
      auditProgramId,
    } = payload;

    const users: Array<{ id: number; email: string | null }> = await prisma.user.findMany({
      where: { tenantId, id: { in: recipientIds } },
      select: { id: true, email: true },
    });

    const ctaUrl = this.buildCtaUrl({
      missionId,
      findingId,
      recommendationId,
      planId,
      auditProgramId,
    });
    const ctaLabel = this.buildCtaLabel({
      missionId,
      findingId,
      recommendationId,
      planId,
      auditProgramId,
    });

    const realRecipients = users.filter(u => u.email).map(u => u.email!);
    const dgCopy = DG_CC_EMAIL && DG_CC_TYPES.has(type) ? DG_CC_EMAIL : null;

    await Promise.allSettled([
      ...realRecipients.map(to =>
        sendNotificationEmail({
          to,
          title,
          message,
          ctaLabel,
          ctaUrl,
        })
      ),
      // 🏢 Copie DG : 1 seul email par événement stratégique (anti-bruit).
      ...(dgCopy
        ? [
            sendNotificationEmail({
              to: dgCopy,
              title,
              message,
              ctaLabel,
              ctaUrl,
            }),
          ]
        : []),
    ]);
  }

  /** Construit l'URL de redirection vers l'entité concernée. */
  private static buildCtaUrl(p: {
    missionId?: number;
    findingId?: number;
    recommendationId?: number;
    planId?: number;
    auditProgramId?: number;
  }): string | undefined {
    // Garde : pas de lien CTA si WEB_APP_URL absent (aucun défaut en dur).
    if (!WEB_APP_URL) return undefined;
    if (p.missionId) return `${WEB_APP_URL}/missions/${p.missionId}`;
    if (p.findingId) return `${WEB_APP_URL}/findings/${p.findingId}`;
    if (p.recommendationId) return `${WEB_APP_URL}/recommendations/${p.recommendationId}`;
    if (p.planId) return `${WEB_APP_URL}/plans/${p.planId}`;
    if (p.auditProgramId) return `${WEB_APP_URL}/programs/${p.auditProgramId}`;
    return undefined;
  }

  /** Libellé du bouton CTA de l'email. */
  private static buildCtaLabel(p: {
    missionId?: number;
    findingId?: number;
    recommendationId?: number;
    planId?: number;
    auditProgramId?: number;
  }): string | undefined {
    if (p.missionId) return 'Voir la mission';
    if (p.findingId) return 'Voir le constat';
    if (p.recommendationId) return 'Voir la recommandation';
    if (p.planId) return 'Voir le plan';
    if (p.auditProgramId) return 'Voir le programme';
    return undefined;
  }
}
