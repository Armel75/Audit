// =====================================================
// 🔥 SOURCE FRONTEND DES STATUTS (ALIGNÉ BACKEND)
// =====================================================

// ================= MISSION =================
export const MISSION_STATUSES = [
  'PLANNED',
  'READY',
  'IN_PROGRESS',
  'UNDER_REVIEW',
  'APPROVED',
  'CLOSED',
] as const;

export type MissionStatus = typeof MISSION_STATUSES[number];

export const missionStatusMap: Record<
  MissionStatus,
  { label: string; class: string }
> = {
  PLANNED: {
    label: 'Planifiée',
    class: 'bg-blue-100 text-blue-700',
  },
  READY: {
    label: 'Prête',
    class: 'bg-indigo-100 text-indigo-700',
  },
  IN_PROGRESS: {
    label: 'En cours',
    class: 'bg-yellow-100 text-yellow-700',
  },
  UNDER_REVIEW: {
    label: 'En revue',
    class: 'bg-purple-100 text-purple-700',
  },
  APPROVED: {
    label: 'Approuvée',
    class: 'bg-green-100 text-green-700',
  },
  CLOSED: {
    label: 'Clôturée',
    class: 'bg-slate-200 text-slate-700',
  },
};

// ================= RECOMMENDATION =================
export const RECOMMENDATION_STATUSES = [
  'DRAFT',
  'OPEN',
  'IN_PROGRESS',
  'IMPLEMENTED',
  'VALIDATED',
  'REJECTED',
  'CLOSED',
] as const;

export type RecommendationStatus = typeof RECOMMENDATION_STATUSES[number];

export const recommendationStatusMap: Record<
  RecommendationStatus,
  { label: string; class: string }
> = {
  DRAFT: {
    label: 'Brouillon',
    class: 'bg-slate-100 text-slate-600',
  },
  OPEN: {
    label: 'Ouverte',
    class: 'bg-blue-100 text-blue-700',
  },
  IN_PROGRESS: {
    label: 'En cours',
    class: 'bg-yellow-100 text-yellow-700',
  },
  IMPLEMENTED: {
    label: 'Implémentée',
    class: 'bg-indigo-100 text-indigo-700',
  },
  VALIDATED: {
    label: 'Validée',
    class: 'bg-green-100 text-green-700',
  },
  REJECTED: {
    label: 'Rejetée',
    class: 'bg-red-100 text-red-700',
  },
  CLOSED: {
    label: 'Clôturée',
    class: 'bg-slate-200 text-slate-700',
  },
};

// ================= FINDING =================
export const FINDING_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'CONFIRMED',
  'REJECTED',
] as const;

export type FindingStatus = typeof FINDING_STATUSES[number];

export const findingStatusMap: Record<
  FindingStatus,
  { label: string; class: string }
> = {
  DRAFT: {
    label: 'Brouillon',
    class: 'bg-slate-100 text-slate-600',
  },
  SUBMITTED: {
    label: 'Soumis',
    class: 'bg-blue-100 text-blue-700',
  },
  CONFIRMED: {
    label: 'Confirmé',
    class: 'bg-green-100 text-green-700',
  },
  REJECTED: {
    label: 'Rejeté',
    class: 'bg-red-100 text-red-700',
  },
};

// ================= AUDIT PLAN =================
export const AUDIT_PLAN_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'VALIDATED',
  'REJECTED',
] as const;

export type AuditPlanStatus = typeof AUDIT_PLAN_STATUSES[number];

export const auditPlanStatusMap: Record<
  AuditPlanStatus,
  { label: string; class: string }
> = {
  DRAFT: {
    label: 'Brouillon',
    class: 'bg-slate-100 text-slate-600',
  },
  PENDING_APPROVAL: {
    label: 'En attente',
    class: 'bg-yellow-100 text-yellow-700',
  },
  VALIDATED: {
    label: 'Validé',
    class: 'bg-green-100 text-green-700',
  },
  REJECTED: {
    label: 'Rejeté',
    class: 'bg-red-100 text-red-700',
  },
};

// =====================================================
// 🧠 HELPER UNIFIÉ (TOP 1%)
// =====================================================

export function getMissionStatusMeta(status: MissionStatus) {
  return missionStatusMap[status];
}

export function getRecommendationStatusMeta(status: RecommendationStatus) {
  return recommendationStatusMap[status];
}

export function getFindingStatusMeta(status: FindingStatus) {
  return findingStatusMap[status];
}

export function getAuditPlanStatusMeta(status: AuditPlanStatus) {
  return auditPlanStatusMap[status];
}