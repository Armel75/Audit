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

  // ✅ AJOUT ICI (BON ENDROIT)
  trend: {
    month: string;
    findings: number;
    recosOpen: number;
  }[];
};
