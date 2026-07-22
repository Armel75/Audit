const prisma = require('@audit/database').default;
import { canTransition } from './workflow/workflow.engine';
import { missionWorkflow } from './workflow/mission.workflow';
import { MISSION_STATUS, MissionStatus } from '../constants/missionStatus';
import { MISSION_ACTION_TYPE } from '../constants/missionActionType';

// 🔵 NOUVEAU — Vérifie si mission prête (cadrage OK)
export function isMissionReady(mission: any) {
  return (
    !!mission?.planId &&
    !!mission?.leaderId &&
    mission?.scopes?.length > 0 &&
    mission?.members?.length > 0 &&
    mission?.programs?.some((p: any) => p.status === 'APPROVED')
  );
}

// 🔵 NOUVEAU — Vérification complète démarrage
export function validateMissionStart(mission: any) {
  if (!mission.scopes?.length) {
    throw new Error('Scope requis');
  }

  if (!mission.members?.length) {
    throw new Error('Membres requis');
  }

  if (!mission.planId) {
    throw new Error("Plan d'audit requis");
  }

  if (!mission.leaderId) {
    throw new Error('Chef de mission requis');
  }

  const approvedProgram = mission.programs?.some(
    (p: any) => p.status === 'APPROVED'
  );

  if (!approvedProgram) {
    throw new Error('Programme non validé');
  }

  if (!mission.startDate || !mission.endDate) {
    throw new Error('Dates obligatoires');
  }
}


export async function updateMissionStatus(
  missionId: number,
  newStatus: MissionStatus,
  user: any,
  reason?: string
) {
  const mission = await prisma.auditMission.findUnique({
    where: { id: missionId },
    include: {
      findings: true,
      scopes: true,
      members: true,
      programs: {
        include: { procedures: true }
      }
    }
  });

  if (!mission) throw new Error('Mission introuvable');

  // 🔒 1. HARD RULES (prioritaires)

  // ❌ interdit d'annuler après validation finale
  if (
  newStatus === MISSION_STATUS.CANCELLED &&
  (
    mission.status === MISSION_STATUS.APPROVED ||
    mission.status === MISSION_STATUS.CLOSED
  )
  ) {
    throw new Error('Impossible d’annuler une mission déjà validée ou clôturée');
  }

  // ❌ aucun retour après APPROVED
  if (
    mission.status === MISSION_STATUS.APPROVED &&
    newStatus !== MISSION_STATUS.CLOSED
  ) {
    throw new Error('Aucune modification autorisée après approbation');
  }

  // ❌ aucun changement après CLOSED
  if (mission.status === MISSION_STATUS.CLOSED) {
    throw new Error('Mission clôturée, aucune modification possible');
  }

  // 🔒 2. WORKFLOW (transition autorisée)
  if (!canTransition(mission.status, newStatus, missionWorkflow)) {
    throw new Error(`Transition interdite: ${mission.status} → ${newStatus}`);
  }

  // 🔴 3. RÈGLE CANCELLED (option sécurité)
  if (newStatus === MISSION_STATUS.CANCELLED) {
    if (!user) {
      throw new Error('Utilisateur requis pour annulation');
    }
  }

  // 🔒 RAISON OBLIGATOIRE (CANCEL / REWORK)
  const isRework =
    mission.status === MISSION_STATUS.UNDER_REVIEW &&
    newStatus === MISSION_STATUS.IN_PROGRESS;

  if (
    (newStatus === MISSION_STATUS.CANCELLED || isRework) &&
    (!reason || reason.trim().length < 5)
  ) {
    throw new Error(
      'Une raison est obligatoire (minimum 5 caractères) pour cette action'
    );
  }

  // 🔴 READY / IN_PROGRESS
  if (
    newStatus === MISSION_STATUS.READY ||
    newStatus === MISSION_STATUS.IN_PROGRESS
  ) {
    if (!isMissionReady(mission)) {
      throw new Error('Mission non prête : cadrage incomplet');
    }
  }

  if (newStatus === MISSION_STATUS.IN_PROGRESS) {
    validateMissionStart(mission);
  }

  // 🔒 4. RÈGLES MÉTIER EXISTANTES

  if (newStatus === MISSION_STATUS.UNDER_REVIEW) {
    if (mission.findings.length === 0) {
      throw new Error('Aucun constat pour cette mission');
    }
  }

  if (newStatus === MISSION_STATUS.CLOSED) {
    const pendingRecos = await prisma.recommendation.count({
      where: {
        finding: { missionId },
        status: { not: 'VALIDATED' }
      }
    });

    if (pendingRecos > 0) {
      throw new Error('Recommandations non validées');
    }
  }

  // 🔒 5. RÔLES
    if (newStatus === MISSION_STATUS.APPROVED) {
    if (!user.permissions?.includes('audit_mission:approve')) {
      throw new Error("Permission refusée");
    }
  }

  // 🔒 6. UPDATE + HISTORIQUE
  const updated = await prisma.auditMission.update({
    where: { id: missionId },
    data: { status: newStatus }
  });

  const actionType = getActionType(mission.status as MissionStatus, newStatus);

  await prisma.missionStatusHistory.create({
    data: {
      tenantId: mission.tenantId,
      missionId,
      previousStatus: mission.status,
      newStatus,
      changedById: user.id,
      // 🔥 OPTION SAFE (si colonnes existent)
      actionType,
      reason: reason || null
    }
  });

  return updated;
}


function getActionType(
  from: MissionStatus,
  to: MissionStatus
): string {
  if (to === MISSION_STATUS.CANCELLED) return MISSION_ACTION_TYPE.CANCEL;

  if (from === MISSION_STATUS.UNDER_REVIEW && to === MISSION_STATUS.IN_PROGRESS) {
    return MISSION_ACTION_TYPE.REWORK;
  }

  if (to === MISSION_STATUS.IN_PROGRESS) return MISSION_ACTION_TYPE.START;

  if (to === MISSION_STATUS.UNDER_REVIEW) return MISSION_ACTION_TYPE.SUBMIT;

  if (to === MISSION_STATUS.APPROVED) return MISSION_ACTION_TYPE.APPROVE;

  if (to === MISSION_STATUS.CLOSED) return MISSION_ACTION_TYPE.CLOSE;

  return MISSION_ACTION_TYPE.START;
}

// Retourne les missions accessibles à l'utilisateur selon son rôle et les filtres
export async function getAccessibleMissions(user: any, filters: any) {
  // Si auditeur : missions où il est membre
  if (user.role === 'AUDITOR') {
    return prisma.auditMission.findMany({
      where: {
        members: {
          some: { userId: user.id }
        },
        // Filtres premium (à compléter selon les besoins)
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: { gte: filters.startDate } }),
        ...(filters.endDate && { endDate: { lte: filters.endDate } }),
        ...(filters.missionId && { id: Number(filters.missionId) })
      },
      orderBy: { createdAt: 'desc' }
    });
  }
  // Si manager/admin/autre : missions selon permissions (exemple : toutes)
  return prisma.auditMission.findMany({
    where: {
      ...(filters.status && { status: filters.status }),
      ...(filters.startDate && { startDate: { gte: filters.startDate } }),
      ...(filters.endDate && { endDate: { lte: filters.endDate } }),
      ...(filters.missionId && { id: Number(filters.missionId) })
    },
    orderBy: { createdAt: 'desc' }
  });
}
