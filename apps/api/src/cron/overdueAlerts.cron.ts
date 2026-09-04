import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendOverdueAlertEmail } from '../services/mail.service';

const prisma = new PrismaClient();

// ─── Config depuis variables d'environnement ───────────────────────────────────
const ALERT_CHEF_AUDIT_EMAIL = process.env.ALERT_CHEF_AUDIT_EMAIL?.trim();
const ALERT_CRON_DAY = Number(process.env.ALERT_CRON_DAY ?? 1); // 0=Dim, 1=Lun, … 6=Sam
const ALERT_CRON_HOUR = Number(process.env.ALERT_CRON_HOUR ?? 8); // 0-23
const ALERT_GRACE_DAYS = Number(process.env.ALERT_GRACE_DAYS ?? 5); // J+5
const WEB_APP_URL = process.env.WEB_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:5173';

// ─── Log léger ───────────────────────────────────────────────────────────────
const log = (msg: string, meta?: Record<string, unknown>) =>
  console.log(`[OVERDUE-ALERTS] ${msg}`, meta ? JSON.stringify(meta) : '');

// ─── Idempotence en mémoire : un seul mail par destinataire par semaine ───────
// Clef = `${tenantId}:${userId}:${YYYY}W${weekNumber}`
const sentThisWeek = new Set<string>();

function weekIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}W${week}`;
}

function sentKey(tenantId: number, userId: number): string {
  return `${tenantId}:${userId}:${weekIso()}`;
}

// ─── Calcul de la date limite (J - GraceDays) ─────────────────────────────────
function cutoffDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - ALERT_GRACE_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Expression cron (5 champs node-cron : minute heure jour mois jour-semaine) ──
// Format : "0 {HOUR} * * {DAY}" → exécution chaque semaine le jour DAY à HH:00.
// node-cron : 0=Dimanche, 1=Lundi … 6=Samedi (compatible ALERT_CRON_DAY).
function buildCronExpr(): string {
  return `0 ${ALERT_CRON_HOUR} * * ${ALERT_CRON_DAY}`;
}

// ─── Exécution principale ─────────────────────────────────────────────────────
let isRunning = false;

async function run() {
  if (isRunning) {
    log('Exécution déjà en cours, ignorée');
    return;
  }
  isRunning = true;
  log('Démarrage du cron alertes en retard');

  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      await processTenant(tenant.id);
    }
  } catch (err) {
    console.error('[OVERDUE-ALERTS] Erreur fatale:', err);
  } finally {
    isRunning = false;
    log('Fin du cron alertes en retard');
  }
}

// ─── Traitement par tenant ───────────────────────────────────────────────────
async function processTenant(tenantId: number) {
  const cutoff = cutoffDate();

  // ── 1. Missions en retard ────────────────────────────────────────────────
  const overdueMissions = await prisma.auditMission.findMany({
    where: {
      tenantId,
      endDate: { lt: cutoff },
      status: { notIn: ['COMPLETED', 'ARCHIVED'] },
    },
    include: {
      leader: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  // ── 2. Recommandations en retard ────────────────────────────────────────
  const overdueRecommendations = await prisma.recommendation.findMany({
    where: {
      tenantId,
      targetDate: { lt: cutoff },
      status: { notIn: ['CLOSED', 'CANCELLED'] },
    },
    include: {
      assigneeUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      finding: {
        select: {
          missionId: true,
          mission: {
            select: {
              title: true,
              leaderId: true,
              leader: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  if (overdueMissions.length === 0 && overdueRecommendations.length === 0) {
    return;
  }

  log(
    `Tenant ${tenantId}: ${overdueMissions.length} missions, ${overdueRecommendations.length} recommandations en retard`,
    { cutoff: cutoff.toISOString() }
  );

  // ── 3. Grouper par destinataire ─────────────────────────────────────────
  // Map<userId, { userId, email, firstName, lastName, missions[], recommendations[] }>
  const userMap = new Map<
    number,
    {
      userId: number;
      email: string;
      firstName: string | null;
      lastName: string | null;
      missions: Array<{ id: number; title: string; endDate: Date }>;
      recommendations: Array<{ id: number; title: string; targetDate: Date; missionTitle: string }>;
    }
  >();

  for (const m of overdueMissions) {
    if (!m.leader) continue;
    const { id, email, firstName, lastName } = m.leader;
    if (!email) continue;
    if (!userMap.has(id)) {
      userMap.set(id, { userId: id, email, firstName, lastName, missions: [], recommendations: [] });
    }
    userMap.get(id)!.missions.push({ id: m.id, title: m.title, endDate: m.endDate! });
  }

  for (const r of overdueRecommendations) {
    const assignee = r.assigneeUser;
    const leader = r.finding?.mission?.leader;

    // Destinataire : assigneeUser s'il existe, sinon le leader de la mission
    const recipients = assignee ? [assignee] : leader ? [leader] : [];

    for (const recipient of recipients) {
      if (!recipient?.email) continue;
      if (!userMap.has(recipient.id)) {
        userMap.set(recipient.id, {
          userId: recipient.id,
          email: recipient.email,
          firstName: recipient.firstName ?? null,
          lastName: recipient.lastName ?? null,
          missions: [],
          recommendations: [],
        });
      }
      userMap.get(recipient.id)!.recommendations.push({
        id: r.id,
        title: r.title,
        targetDate: r.targetDate,
        missionTitle: r.finding?.mission?.title ?? '—',
      });
    }
  }

  // ── 4. Envoyer les mails ─────────────────────────────────────────────────
  for (const entry of userMap.values()) {
    const key = sentKey(tenantId, entry.userId);
    if (sentThisWeek.has(key)) {
      log(`Mail déjà envoyé cette semaine pour ${entry.email}, ignoré`, { key });
      continue;
    }

    const pilotName =
      entry.firstName && entry.lastName
        ? `${entry.firstName} ${entry.lastName}`
        : entry.email.split('@')[0];

    try {
      // Mail au pilote / responsable
      await sendOverdueAlertEmail({
        to: entry.email,
        pilotName,
        missions: entry.missions,
        recommendations: entry.recommendations,
        appUrl: WEB_APP_URL,
      });

      // Copie au chef d'audit fixe si configuré
      if (ALERT_CHEF_AUDIT_EMAIL) {
        await sendOverdueAlertEmail({
          to: ALERT_CHEF_AUDIT_EMAIL,
          pilotName,
          missions: entry.missions,
          recommendations: entry.recommendations,
          appUrl: WEB_APP_URL,
        });
      }

      sentThisWeek.add(key);
      log(`Mail envoyé à ${entry.email}`, {
        missions: entry.missions.length,
        recommandations: entry.recommendations.length,
      });
    } catch (err) {
      console.error(`[OVERDUE-ALERTS] Échec envoi à ${entry.email}:`, err);
    }
  }
}

// ─── Démarrage ───────────────────────────────────────────────────────────────
export function startOverdueAlertsCron() {
  const cronExpr = buildCronExpr();
  console.log(
    `[OVERDUE-ALERTS] Cron programmé : "${cronExpr}" (jour=${ALERT_CRON_DAY}, heure=${ALERT_CRON_HOUR}h, grâce=${ALERT_GRACE_DAYS}j)`
  );

  cron.schedule(cronExpr, run, {
    timezone: 'Africa/Douala', // UTC+1 — heure SOREPCO
  });
}
