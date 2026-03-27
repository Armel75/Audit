import prisma from '@audit/database';
import { canTransition } from './workflow/workflow.engine';
import { missionWorkflow } from './workflow/mission.workflow';

export async function updateMissionStatus(
  missionId: number,
  newStatus: string,
  user: any
) {
  const mission = await prisma.auditMission.findUnique({
    where: { id: missionId },
    include: {
      findings: true
    }
  });

  if (!mission) throw new Error('Mission introuvable');

  // 🔒 1. Vérifier transition
  if (!canTransition(mission.status, newStatus, missionWorkflow)) {
    throw new Error(`Transition interdite: ${mission.status} → ${newStatus}`);
  }

  // 🔒 2. Règles métier

  // ❗ Pas de review sans findings
  if (newStatus === 'UNDER_REVIEW') {
    if (mission.findings.length === 0) {
      throw new Error('Aucun constat pour cette mission');
    }
  }

  // ❗ Clôture seulement si toutes les reco sont validées
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

  // 🔒 3. Rôle (sans hardcode strict)
  if (newStatus === 'APPROVED') {
    if (user.role.name !== 'CONTROLEUR') {
      throw new Error('Seul le contrôleur peut approuver');
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