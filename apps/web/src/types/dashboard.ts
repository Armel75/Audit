export interface DGDashboardData {
  criticalFindingsCount: number;
  criticalRecommendationsOpen: number;
  criticalRecommendationsClosed: number;
  resolutionRate: number;
  topRiskDepartments: {
    department: string;
    count: number;
  }[];
}