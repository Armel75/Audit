// =============================================================================
// Tests unitaires — Utilitaires frontend (mappings de statuts)
// Garantit la cohérence entre les listes de statuts et leurs libellés/CSS.
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  MISSION_STATUSES,
  missionStatusMap,
  RECOMMENDATION_STATUSES,
  recommendationStatusMap,
  getMissionStatusMeta,
  getRecommendationStatusMeta,
  getFindingStatusMeta,
  getAuditPlanStatusMeta,
  type MissionStatus,
} from './status';

describe('missionStatusMap', () => {
  it('contient une entrée pour chaque statut de mission', () => {
    for (const status of MISSION_STATUSES) {
      expect(missionStatusMap[status]).toBeDefined();
    }
  });

  it('chaque entrée possède un libellé et une classe CSS non vides', () => {
    for (const status of MISSION_STATUSES) {
      expect(missionStatusMap[status].label.trim().length).toBeGreaterThan(0);
      expect(missionStatusMap[status].class.trim().length).toBeGreaterThan(0);
    }
  });

  it('le map ne contient aucune clé inconnue', () => {
    expect(Object.keys(missionStatusMap).sort()).toEqual([...MISSION_STATUSES].sort());
  });
});

describe('recommendationStatusMap', () => {
  it('contient une entrée pour chaque statut de recommandation', () => {
    for (const status of RECOMMENDATION_STATUSES) {
      expect(recommendationStatusMap[status]).toBeDefined();
    }
  });

  it('chaque entrée possède un libellé et une classe CSS non vides', () => {
    for (const status of RECOMMENDATION_STATUSES) {
      expect(recommendationStatusMap[status].label.trim().length).toBeGreaterThan(0);
      expect(recommendationStatusMap[status].class.trim().length).toBeGreaterThan(0);
    }
  });

  it('le map ne contient aucune clé inconnue', () => {
    expect(Object.keys(recommendationStatusMap).sort()).toEqual(
      [...RECOMMENDATION_STATUSES].sort()
    );
  });
});

describe('getMissionStatusMeta', () => {
  it('retourne le libellé et la classe pour un statut connu', () => {
    expect(getMissionStatusMeta('IN_PROGRESS')).toEqual(missionStatusMap.IN_PROGRESS);
    expect(getMissionStatusMeta('APPROVED').label).toBe('Approuvée');
  });

  it('retourne un fallback sûr pour un statut inconnu', () => {
    const unknown = 'STATUT_INCONNU' as MissionStatus;
    expect(getMissionStatusMeta(unknown)).toEqual({
      label: unknown,
      class: 'bg-gray-100 text-gray-700',
    });
  });
});

describe('getRecommendationStatusMeta / getFindingStatusMeta / getAuditPlanStatusMeta', () => {
  it('retourne le libellé pour un statut connu', () => {
    expect(getRecommendationStatusMeta('OPEN').label).toBe('Ouverte');
    expect(getFindingStatusMeta('CONFIRMED').label).toBe('Confirmé');
    expect(getAuditPlanStatusMeta('PENDING_APPROVAL').label).toBe('En attente');
  });
});
