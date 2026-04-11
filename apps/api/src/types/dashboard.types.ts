export type DashboardPeriod = {
  year?: number;
  month?: number;
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
