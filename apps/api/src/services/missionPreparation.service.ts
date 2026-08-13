const prisma = require('@audit/database').default;
import { canTransition } from './workflow/workflow.engine';
import {
  MISSION_PREPARATION_PHASE,
  missionPreparationWorkflow,
  type MissionPreparationPhase,
} from './workflow/missionPreparation.workflow';
import { MISSION_STATUS } from '../constants/missionStatus';
import { isMissionReady } from './mission.service';
import { NotificationService, NOTIFICATION_TYPES } from './notification.service';

const preparationPhaseOrder: MissionPreparationPhase[] = [
  MISSION_PREPARATION_PHASE.INTAKE,
  MISSION_PREPARATION_PHASE.ENRICHMENT,
  MISSION_PREPARATION_PHASE.REVIEW,
];

// ================= PERMISSION RBAC (PREMIUM) =================

const TRANSITION_PERMISSIONS: Record<string, Record<string, string>> = {
  [MISSION_PREPARATION_PHASE.INTAKE]: {
    [MISSION_PREPARATION_PHASE.ENRICHMENT]: 'audit_mission:transmit_preparation',
  },
  [MISSION_PREPARATION_PHASE.ENRICHMENT]: {
    [MISSION_PREPARATION_PHASE.REVIEW]: 'audit_mission:enrich',
    [MISSION_PREPARATION_PHASE.INTAKE]: 'audit_mission:enrich',
  },
  [MISSION_PREPARATION_PHASE.REVIEW]: {
    [MISSION_PREPARATION_PHASE.ENRICHMENT]: 'audit_mission:review_preparation',
  },
};

function checkPreparationPermission(user: any, requiredPermission: string): void {
  if (!user) {
    throw new Error('Utilisateur non authentifié');
  }

  const userPerms = (user.permissions ?? []).map((p: string) => p.toLowerCase());
  if (!userPerms.includes(requiredPermission.toLowerCase())) {
    throw new Error(`Permission requise: ${requiredPermission}`);
  }
}

export function getPreparationChecklist(mission: any) {
  const hasObjective = !!mission?.objective?.trim();
  const hasIntakeDates = !!mission?.startDate && !!mission?.endDate;
  const hasPlan = !!mission?.plan?.id;
  const hasLeader = !!mission?.leader;
  const hasScope = !!mission?.scopeDescription?.trim();
  const hasMethodology = !!mission?.methodology?.trim();
  const hasAuditType = !!mission?.auditType;

  return {
    intake: {
      complete: !!mission?.title?.trim() && !!mission?.description?.trim() && hasObjective && hasIntakeDates,
      fields: {
        title: !!mission?.title?.trim(),
        description: !!mission?.description?.trim(),
        objective: hasObjective,
        startDate: !!mission?.startDate,
        endDate: !!mission?.endDate,
      },
    },
    enrichment: {
      complete: hasScope && hasPlan && hasAuditType && hasMethodology && hasLeader,
      fields: {
        scopeDescription: hasScope,
        plan: hasPlan,
        auditType: hasAuditType,
        methodology: hasMethodology,
        leader: hasLeader,
      },
    },
    ready: {
      complete: isMissionReady(mission),
      fields: {
        plan: hasPlan,
        leader: hasLeader,
        auditType: hasAuditType,
        scopeDescription: hasScope,
        methodology: hasMethodology,
      },
    },
  };
}

export async function getMissionPreparationByMission(tenantId: number, missionId: number) {
  return prisma.auditMissionPreparation.findFirst({
    where: { tenantId, missionId },
    include: {
      history: {
        include: {
          changedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { changedAt: 'desc' },
      },
    },
  });
}

export async function getMissionPreparationOverview(tenantId: number, missionId: number) {
  const mission = await prisma.auditMission.findFirst({
    where: { id: missionId, tenantId },
    include: {
      leader: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      plan: {
        select: { id: true, year: true, title: true },
      },
      auditType: {
        select: { id: true, name: true },
      },
      members: {
        select: { id: true, assignmentStatus: true, roleInMission: true, isLead: true },
      },
      scopes: {
        select: { id: true, status: true, auditableEntityId: true },
      },
      programs: {
        select: { id: true, status: true, title: true },
      },
      preparation: {
        include: {
          history: {
            include: {
              changedBy: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { changedAt: 'desc' },
          },
        },
      },
    },
  });

  if (!mission) {
    return null;
  }

  return {
    mission,
    preparation: mission.preparation,
    checklist: getPreparationChecklist(mission),
    phaseIndex: getPreparationPhaseIndex(mission.preparation?.phase),
  };
}

export async function ensureMissionPreparation(tenantId: number, missionId: number, changedById?: number) {
  const existing = await prisma.auditMissionPreparation.findUnique({
    where: { missionId },
  });

  if (existing) {
    return existing;
  }

  const preparation = await prisma.auditMissionPreparation.create({
    data: {
      tenantId,
      missionId,
      phase: MISSION_PREPARATION_PHASE.INTAKE,
    },
  });

  await prisma.auditMissionPreparationHistory.create({
    data: {
      tenantId,
      missionId,
      preparationId: preparation.id,
      fromPhase: null,
      toPhase: MISSION_PREPARATION_PHASE.INTAKE,
      reason: 'Initialisation de la préparation',
      actionType: 'INIT',
      changedById: changedById ?? null,
    },
  });

  return preparation;
}

export async function transitionMissionPreparation(
  missionId: number,
  tenantId: number,
  user: any,
  nextPhase: MissionPreparationPhase,
  reason?: string,
) {
  // 🔍 1. Vérifications (lecture simple, pas de transaction longue)
  const mission = await prisma.auditMission.findFirst({
    where: { id: missionId, tenantId },
    include: { members: true, scopes: true, programs: true },
  });

  if (!mission) throw new Error('Mission introuvable');
  if (mission.status !== MISSION_STATUS.PLANNED) throw new Error('Préparation verrouillée : mission déjà lancée');

  const preparation = await ensureMissionPreparation(tenantId, missionId, user?.id);
  const currentVersion = preparation.version;
  const currentPhase = preparation.phase as MissionPreparationPhase;

  if (!canTransition(currentPhase, nextPhase, missionPreparationWorkflow)) {
    throw new Error(`Transition de préparation interdite: ${currentPhase} → ${nextPhase}`);
  }

  const requiredPermission = TRANSITION_PERMISSIONS[currentPhase]?.[nextPhase];
  if (requiredPermission) checkPreparationPermission(user, requiredPermission);

  // 🔒 2. Mise à jour atomique avec version (optimistic locking)
  const now = new Date();
  const updateData: any = { phase: nextPhase };

  if (currentPhase === MISSION_PREPARATION_PHASE.INTAKE && nextPhase === MISSION_PREPARATION_PHASE.ENRICHMENT) {
    updateData.intakeCompletedAt = now;
    updateData.intakeCompletedById = user?.id ?? null;
  }
  if (currentPhase === MISSION_PREPARATION_PHASE.ENRICHMENT && nextPhase === MISSION_PREPARATION_PHASE.REVIEW) {
    updateData.enrichmentCompletedAt = now;
    updateData.enrichmentCompletedById = user?.id ?? null;
  }

  const updated = await prisma.auditMissionPreparation.updateMany({
    where: { missionId, version: currentVersion },
    data: { ...updateData, version: { increment: 1 } },
  });

  if (updated.count === 0) {
    throw new Error('Conflit : la préparation a été modifiée par un autre utilisateur. Veuillez recharger la page.');
  }

  // 📝 3. Historique
  await prisma.auditMissionPreparationHistory.create({
    data: {
      tenantId,
      missionId,
      preparationId: preparation.id,
      fromPhase: currentPhase,
      toPhase: nextPhase,
      reason: reason || null,
      actionType: 'TRANSITION',
      changedById: user?.id ?? null,
    },
  });

  // 🔔 Notifications
  if (currentPhase === MISSION_PREPARATION_PHASE.INTAKE && nextPhase === MISSION_PREPARATION_PHASE.ENRICHMENT) {
    await NotificationService.notifyPermissionHolders(
      tenantId,
      'audit_mission:enrich',
      NOTIFICATION_TYPES.MISSION_AWAITING_ENRICHMENT,
      'Mission en attente d\'enrichissement',
      `La mission "${mission.title}" vous a été transmise pour enrichissement.`,
      missionId,
      user?.id,
    );
  }

  if (currentPhase === MISSION_PREPARATION_PHASE.ENRICHMENT && nextPhase === MISSION_PREPARATION_PHASE.REVIEW) {
    await NotificationService.notifyPermissionHolders(
      tenantId,
      'audit_mission:review_preparation',
      NOTIFICATION_TYPES.MISSION_AWAITING_REVIEW,
      'Mission en attente de revue',
      `La mission "${mission.title}" est prête pour la revue.`,
      missionId,
      user?.id,
    );
  }

  return getMissionPreparationByMission(tenantId, missionId);
}

export async function finalizeMissionPreparation(
  missionId: number,
  tenantId: number,
  user: any,
  reason?: string,
) {
  // 🔍 1. Vérifications
  const mission = await prisma.auditMission.findFirst({
    where: { id: missionId, tenantId },
    include: { members: true, scopes: true, programs: true },
  });

  if (!mission) throw new Error('Mission introuvable');
  if (mission.status !== MISSION_STATUS.PLANNED) throw new Error('Mission déjà sortie de la phase de préparation');

  checkPreparationPermission(user, 'audit_mission:finalize_preparation');

  const preparation = await ensureMissionPreparation(tenantId, missionId, user?.id);
  const currentVersion = preparation.version;
  const currentPhase = preparation.phase as MissionPreparationPhase;

  if (currentPhase !== MISSION_PREPARATION_PHASE.REVIEW) {
    throw new Error('La mission doit être en phase de revue pour être publiée');
  }

  if (!isMissionReady(mission)) {
    throw new Error('Mission non prête : cadrage incomplet');
  }

  // ⚡ 2. Optimistic locking sur la préparation
  const prepUpdated = await prisma.auditMissionPreparation.updateMany({
    where: { missionId, version: currentVersion },
    data: {
      reviewCompletedAt: new Date(),
      reviewCompletedById: user?.id ?? null,
      readyAt: new Date(),
      version: { increment: 1 },
    },
  });

  if (prepUpdated.count === 0) {
    throw new Error('Conflit : la préparation a été modifiée par un autre utilisateur. Veuillez recharger la page.');
  }

  // � 3. Passage du statut de la mission de PLANNED → READY
  await prisma.auditMission.update({
    where: { id: missionId },
    data: { status: MISSION_STATUS.READY },
  });

  // �📝 5. Historique de la préparation
  await prisma.auditMissionPreparationHistory.create({
    data: {
      tenantId,
      missionId,
      preparationId: preparation.id,
      fromPhase: currentPhase,
      toPhase: currentPhase,
      reason: reason || 'Mission publiée et prête',
      actionType: 'PUBLISH_READY',
      changedById: user?.id ?? null,
    },
  });

  // 🔔 Notifier tous les membres + le leader
  await NotificationService.notifyMissionMembers(
    tenantId,
    { id: mission.id, leaderId: mission.leaderId, members: mission.members },
    NOTIFICATION_TYPES.MISSION_READY,
    'Mission prête',
    `La mission "${mission.title}" est maintenant prête à être lancée.`,
    user?.id,
  );

  return prisma.auditMission.findUnique({
    where: { id: missionId },
  });
}

export function getPreparationPhaseIndex(phase?: string | null) {
  const index = preparationPhaseOrder.indexOf(phase as MissionPreparationPhase);
  return index >= 0 ? index : 0;
}
