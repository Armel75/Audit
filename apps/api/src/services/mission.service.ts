import prisma from '@audit/database';
import { canTransition } from './workflow/workflow.engine';
import { missionWorkflow } from './workflow/mission.workflow';

// 🔵 NOUVEAU — Vérifie si mission prête (cadrage OK)
export function isMissionReady(mission: any) {
  return (
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

  const approvedProgram = mission.programs?.some(
    (p: any) => p.status === 'APPROVED'
  );

  if (!approvedProgram) {
    throw new Error('Programme non validé');
  }

  const hasProcedures = mission.programs?.some(
    (p: any) => p.procedures?.length > 0
  );

  if (!hasProcedures) {
    throw new Error('Aucune procédure définie');
  }

  if (!mission.startDate || !mission.endDate) {
    throw new Error('Dates obligatoires');
  }
}

// 🔵 EXISTANT AMÉLIORÉ SANS CASSER
export async function updateMissionStatus(
  missionId: number,
  newStatus: string,
  user: any
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

  // 🔒 1. Vérifier transition
  if (!canTransition(mission.status, newStatus, missionWorkflow)) {
    throw new Error(`Transition interdite: ${mission.status} → ${newStatus}`);
  }

  // 🔴 NOUVEAU — READY / IN_PROGRESS
  if (newStatus === 'READY' || newStatus === 'IN_PROGRESS') {
    if (!isMissionReady(mission)) {
      throw new Error('Mission non prête : cadrage incomplet');
    }
  }

  if (newStatus === 'IN_PROGRESS') {
    validateMissionStart(mission);
  }

  // 🔒 2. Règles métier EXISTANTES

  if (newStatus === 'UNDER_REVIEW') {
    if (mission.findings.length === 0) {
      throw new Error('Aucun constat pour cette mission');
    }
  }

  if (newStatus === 'CLOSED') {
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

  // 🔒 3. Rôle
  // if (newStatus === 'APPROVED') {
  //   if (user.role.name !== 'CONTROLEUR') {
  //     throw new Error('Seul le contrôleur peut approuver');
  //   }
  // }
  if (newStatus === 'APPROVED') {
    if (!user.permissions?.includes('MISSION_APPROVE')) {
      throw new Error("Permission refusée");
    }
  }
  // 🔒 4. Update + historique
  const updated = await prisma.auditMission.update({
    where: { id: missionId },
    data: { status: newStatus }
  });

  await prisma.missionStatusHistory.create({
    data: {
      tenantId: mission.tenantId,
      missionId,
      previousStatus: mission.status,
      newStatus,
      changedById: user.id
    }
  });

  return updated;
}