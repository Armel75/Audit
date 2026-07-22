import { Request, Response } from 'express';
import {
  finalizeMissionPreparation,
  getMissionPreparationOverview,
  transitionMissionPreparation,
} from '../services/missionPreparation.service';
import {
  MISSION_PREPARATION_PHASE,
  type MissionPreparationPhase,
} from '../services/workflow/missionPreparation.workflow';

const allowedPhases = new Set<MissionPreparationPhase>([
  MISSION_PREPARATION_PHASE.INTAKE,
  MISSION_PREPARATION_PHASE.ENRICHMENT,
  MISSION_PREPARATION_PHASE.REVIEW,
]);

export const getPreparation = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const overview = await getMissionPreparationOverview(tenantId, parseInt(id));

    if (!overview) {
      return res.status(404).json({ error: 'Mission introuvable' });
    }

    res.json(overview);
  } catch (error: any) {
    console.error('Error fetching mission preparation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la préparation' });
  }
};

export const updatePreparationPhase = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const user = req.user;
    if (!tenantId || !user) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { phase, reason } = req.body;

    if (!phase || !allowedPhases.has(phase)) {
      return res.status(400).json({ error: 'Phase de préparation invalide' });
    }

    const updated = await transitionMissionPreparation(
      parseInt(id),
      tenantId,
      user,
      phase,
      reason,
    );

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating mission preparation phase:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de la mise à jour de la préparation' });
  }
};

export const finalizePreparation = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const user = req.user;
    if (!tenantId || !user) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { reason } = req.body ?? {};

    const updated = await finalizeMissionPreparation(
      parseInt(id),
      tenantId,
      user,
      reason,
    );

    res.json(updated);
  } catch (error: any) {
    console.error('Error finalizing mission preparation:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de la publication de la mission' });
  }
};
