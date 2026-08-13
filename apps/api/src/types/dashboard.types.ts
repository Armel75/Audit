export type DashboardPeriod = {
  year?: number;
  month?: number;
};

// ═══ TABLEAU DE BORD MISSIONS ═══
export type MissionsDashboardSummary = {
  totalMissions: number;
  planned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  late: number;
  completionRate: number;
  findingsCount: number;
  findingsResolved: number;
  findingsResolvedRate: number;
  recosCount: number;
  recosClosed: number;
  recoClosureRate: number;
};

export type MissionsDashboardData = {
  summary: MissionsDashboardSummary;
  previousSummary: MissionsDashboardSummary | null;
  healthScore: number;
  view: 'all' | 'mine';
  byStatus: Array<{ status: string; label: string; count: number }>;
  byAuditType: Array<{ name: string; count: number }>;
  byLeader: Array<{ leader: string; count: number }>;
  trend: Array<{ month: string; created: number; closed: number }>;
  ranking: Array<{
    id: number;
    title: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    leader: string | null;
    auditType: string | null;
    findingsCount: number;
    findingsResolved: number;
    recosCount: number;
    recosClosed: number;
    recoClosureRate: number;
    score: number;
  }>;
};

export type DGDashboardData = {
  criticalFindingsCount: number;
  criticalRecommendationsOpen: number;
  criticalRecommendationsClosed: number;
  resolutionRate: number;

  topRiskDepartments: Array<{
    department: string;
    count: number;
  }>;

  trend: {
    month: string;
    findings: number;
    recosOpen: number;
  }[];

  // ── Top 1% DG indicators ──
  planExecution: {
    year: number;
    title: string | null;
    totalMissions: number;
    completedMissions: number;
    progress: number;
    missionsInProgress: number;
    missionsLate: number;
  } | null;

  coverageRate: number;
  totalAuditableEntities: number;
  coveredEntitiesCount: number;

  avgImplementation: number;
  recosOverdueCount: number;
  recosOverdueAvgDays: number;

  approvalsPending: number;
  approvalsApproved: number;
  approvalsRejected: number;

  risksActive: number;
  risksWithoutControls: number;
  totalControls: number;

  procedureConformityRate: number;
  proceduresOk: number;
  proceduresTotal: number;

  avgFindingCloseDays: number;
  avgRecoCloseDays: number;

  activeMissions: Array<{
    id: number;
    title: string;
    status: string;
    progress: number;
    leader: string | null;
    endDate: string | null;
  }>;

  healthScore: number;
  healthFactors: Array<{
    label: string;
    score: number;
    weight: number;
    status: 'good' | 'warning' | 'critical';
  }>;
};
