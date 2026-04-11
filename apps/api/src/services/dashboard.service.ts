const prisma = require('@audit/database').default;
import { DashboardPeriod, DGDashboardData } from '../types/dashboard.types';
import { SimpleCache } from '../shared/cache/simple.cache';
import { DashboardSnapshotService } from './dashboard.snapshot.service';

export class DashboardService {
  static async getDGDashboard(
    tenantId: number,
    period?: DashboardPeriod
  ): Promise<DGDashboardData> {
    // 🔑 1. Cache key
    const cacheKey = `dg:${tenantId}:${period?.year || 'all'}:${period?.month || 'all'}`;

    // ⚡ 2. Cache
    const cached = SimpleCache.get<DGDashboardData>(cacheKey);
    if (cached) return cached;

    // 🧠 3. Snapshot
    const snapshot = await DashboardSnapshotService.getLatest(
      tenantId,
      period?.year,
      period?.month
    );

    if (snapshot) {
      SimpleCache.set(cacheKey, snapshot, 5 * 60 * 1000);
      return snapshot;
    }

    // 🔥 4. Risk max
    const maxRiskLevel = await prisma.riskLevel.aggregate({
      where: { tenantId },
      _max: { level: true },
    });

    const criticalLevel = maxRiskLevel._max.level ?? 0;

    // 📅 5. Date filter
    const dateFilter: any = {};

    if (period?.year) {
      dateFilter.gte = new Date(period.year, 0, 1);
      dateFilter.lte = new Date(period.year, 11, 31);
    }

    if (period?.month !== undefined && period?.year) {
      dateFilter.gte = new Date(period.year, period.month - 1, 1);
      dateFilter.lte = new Date(period.year, period.month, 0);
    }

    const createdAtFilter =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // 📊 6. Findings
    const criticalFindingsCount = await prisma.finding.count({
      where: {
        tenantId,
        status: 'CONFIRMED',
        riskLevel: { level: criticalLevel },
        ...createdAtFilter,
      },
    });

    // 📊 7. Recos open
    const criticalRecommendationsOpen = await prisma.recommendation.count({
      where: {
        tenantId,
        status: { not: 'CLOSED' },
        finding: {
          status: 'CONFIRMED',
          riskLevel: { level: criticalLevel },
        },
        ...createdAtFilter,
      },
    });

    // 📊 8. Recos closed
    const criticalRecommendationsClosed = await prisma.recommendation.count({
      where: {
        tenantId,
        status: 'CLOSED',
        finding: {
          status: 'CONFIRMED',
          riskLevel: { level: criticalLevel },
        },
        ...createdAtFilter,
      },
    });

    // 📈 9. Resolution
    const totalCriticalRecos =
      criticalRecommendationsOpen + criticalRecommendationsClosed;

    const resolutionRate =
      totalCriticalRecos === 0
        ? 0
        : Math.round(
            (criticalRecommendationsClosed / totalCriticalRecos) * 100
          );

    // 🏢 10. Top departments
    const recosByDept: Array<{
      departmentId: number | null;
      _count: { id: number };
    }> = await prisma.recommendation.groupBy({
      by: ['departmentId'],
      where: {
        tenantId,
        finding: {
          status: 'CONFIRMED',
          riskLevel: { level: criticalLevel },
        },
        ...createdAtFilter,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const departments = await prisma.department.findMany({
      where: {
        id: {
          in: recosByDept
            .map((r) => r.departmentId)
            .filter((id) => id !== null) as number[],
        },
      },
      select: { id: true, name: true },
    });

    const deptMap = new Map(
      departments.map((d: { id: number; name: string }) => [d.id, d.name])
    );

    const topRiskDepartments: Array<{ department: string; count: number }> = recosByDept.map((r) => {
      let departmentName: string;
      if (r.departmentId === null) {
        departmentName = 'Non assigné';
      } else {
        departmentName = (deptMap.get(r.departmentId) || 'Inconnu') as string;
      }
      return {
        department: departmentName,
        count: r._count.id,
      };
    });

    // 📊 Trend (optimisé)
    const findingsByMonth = await prisma.finding.groupBy({
      by: ['createdAt'],
      where: {
        tenantId,
        status: 'CONFIRMED',
        riskLevel: { level: criticalLevel },
      },
      _count: { id: true },
    });

    const recosByMonth = await prisma.recommendation.groupBy({
      by: ['createdAt'],
      where: {
        tenantId,
        status: { not: 'CLOSED' },
        finding: {
          status: 'CONFIRMED',
          riskLevel: { level: criticalLevel },
        },
      },
      _count: { id: true },
    });

    // 🧠 Build trend
    const trendMap = new Map<
      string,
      { findings: number; recosOpen: number }
    >();

    const now = new Date();

    // init 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;

      trendMap.set(key, { findings: 0, recosOpen: 0 });
    }

    // fill findings
    for (const f of findingsByMonth) {
      const date = new Date(f.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (trendMap.has(key)) {
        trendMap.get(key)!.findings += f._count.id;
      }
    }

    // fill recos
    for (const r of recosByMonth) {
      const date = new Date(r.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (trendMap.has(key)) {
        trendMap.get(key)!.recosOpen += r._count.id;
      }
    }

    // format final
    const trend = Array.from(trendMap.entries()).map(([key, value]) => {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(year, month, 1);

      return {
        month: date.toLocaleString('default', { month: 'short' }),
        findings: value.findings,
        recosOpen: value.recosOpen,
      };
    });

    // ── Top 1% DG: Plan execution ────────────────────
    const currentPlan = await prisma.auditPlan.findFirst({
      where: { tenantId, status: 'APPROVED' },
      orderBy: { year: 'desc' },
      select: {
        id: true, year: true, title: true,
        _count: { select: { missions: true } },
      },
    });

    let planExecution = null;
    if (currentPlan) {
      const [completedMissions, missionsInProgress, missionsLate] = await Promise.all([
        prisma.auditMission.count({ where: { tenantId, planId: currentPlan.id, status: 'COMPLETED' } }),
        prisma.auditMission.count({ where: { tenantId, planId: currentPlan.id, status: { in: ['IN_PROGRESS', 'REVIEW'] } } }),
        prisma.auditMission.count({ where: { tenantId, planId: currentPlan.id, status: { in: ['IN_PROGRESS', 'REVIEW'] }, endDate: { lt: now } } }),
      ]);
      const totalMissions = currentPlan._count.missions;
      planExecution = {
        year: currentPlan.year,
        title: currentPlan.title,
        totalMissions,
        completedMissions,
        progress: totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0,
        missionsInProgress,
        missionsLate,
      };
    }

    // ── Top 1% DG: Coverage rate ─────────────────────
    const [totalAuditableEntities, coveredEntitiesRaw] = await Promise.all([
      prisma.auditableEntity.count({ where: { tenantId, isActive: true } }),
      prisma.auditMissionScope.findMany({
        where: {
          tenantId, status: 'IN_SCOPE',
          ...(currentPlan ? { mission: { planId: currentPlan.id } } : {}),
        },
        select: { auditableEntityId: true },
        distinct: ['auditableEntityId'],
      }),
    ]);
    const coveredEntitiesCount = coveredEntitiesRaw.length;
    const coverageRate = totalAuditableEntities > 0 ? Math.round((coveredEntitiesCount / totalAuditableEntities) * 100) : 0;

    // ── Top 1% DG: Implementation rate ───────────────
    const recoImplementedAgg = await prisma.recommendation.aggregate({
      where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED'] } },
      _avg: { implementedPercent: true },
    });
    const avgImplementation = Math.round(recoImplementedAgg._avg.implementedPercent ?? 0);

    // ── Top 1% DG: Overdue recos ─────────────────────
    const overdueRecos = await prisma.recommendation.findMany({
      where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED', 'VALIDATED'] }, targetDate: { lt: now } },
      select: { targetDate: true },
    });
    const recosOverdueCount = overdueRecos.length;
    const recosOverdueAvgDays = recosOverdueCount > 0
      ? Math.round(overdueRecos.reduce((sum: number, r: any) => sum + (now.getTime() - r.targetDate.getTime()) / 86400000, 0) / recosOverdueCount)
      : 0;

    // ── Top 1% DG: Approvals ─────────────────────────
    const [approvalsPending, approvalsApproved, approvalsRejected] = await Promise.all([
      prisma.approval.count({ where: { tenantId, decision: 'PENDING' } }),
      prisma.approval.count({ where: { tenantId, decision: 'APPROVED' } }),
      prisma.approval.count({ where: { tenantId, decision: 'REJECTED' } }),
    ]);

    // ── Top 1% DG: Risks & controls ─────────────────
    const [risksActive, risksWithoutControls, totalControls] = await Promise.all([
      prisma.risk.count({ where: { tenantId, isActive: true } }),
      prisma.risk.count({ where: { tenantId, isActive: true, controlLinks: { none: {} } } }),
      prisma.control.count({ where: { tenantId } }),
    ]);

    // ── Top 1% DG: Procedure conformity ──────────────
    const [proceduresOk, proceduresTotal] = await Promise.all([
      prisma.auditProcedure.count({ where: { tenantId, result: 'OK' } }),
      prisma.auditProcedure.count({ where: { tenantId, result: { not: null } } }),
    ]);
    const procedureConformityRate = proceduresTotal > 0 ? Math.round((proceduresOk / proceduresTotal) * 100) : 0;

    // ── Top 1% DG: Avg close times ──────────────────
    const closedFindings = await prisma.finding.findMany({
      where: { tenantId, status: 'CLOSED' },
      select: { createdAt: true, updatedAt: true },
    });
    const avgFindingCloseDays = closedFindings.length > 0
      ? Math.round(closedFindings.reduce((sum: number, f: any) => sum + (f.updatedAt.getTime() - f.createdAt.getTime()) / 86400000, 0) / closedFindings.length)
      : 0;

    const closedRecommendations = await prisma.recommendation.findMany({
      where: { tenantId, status: 'CLOSED', closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    });
    const avgRecoCloseDays = closedRecommendations.length > 0
      ? Math.round(closedRecommendations.reduce((sum: number, r: any) => sum + (r.closedAt.getTime() - r.createdAt.getTime()) / 86400000, 0) / closedRecommendations.length)
      : 0;

    // ── Top 1% DG: Active missions ───────────────────
    const activeMissionsRaw = await prisma.auditMission.findMany({
      where: { tenantId, status: { in: ['IN_PROGRESS', 'REVIEW'] } },
      orderBy: { endDate: 'asc' },
      take: 6,
      select: {
        id: true, title: true, status: true, endDate: true,
        leader: { select: { firstName: true, lastName: true } },
        programs: { select: { progressPercent: true }, take: 1 },
      },
    });
    const activeMissions = activeMissionsRaw.map((m: any) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      progress: m.programs?.[0]?.progressPercent ?? 0,
      leader: m.leader ? `${m.leader.firstName} ${m.leader.lastName}` : null,
      endDate: m.endDate,
    }));

    // ── Top 1% DG: Health score (pondéré) ────────────
    const factors: Array<{ label: string; score: number; weight: number; status: 'good' | 'warning' | 'critical' }> = [];

    // Factor 1: Plan execution (weight 20)
    const planScore = planExecution ? planExecution.progress : 0;
    factors.push({ label: 'Exécution du plan', score: planScore, weight: 20, status: planScore >= 70 ? 'good' : planScore >= 40 ? 'warning' : 'critical' });

    // Factor 2: Résolution findings critiques (weight 25)
    factors.push({ label: 'Résolution critiques', score: resolutionRate, weight: 25, status: resolutionRate >= 80 ? 'good' : resolutionRate >= 50 ? 'warning' : 'critical' });

    // Factor 3: Implémentation recos (weight 20)
    factors.push({ label: 'Implémentation recos', score: avgImplementation, weight: 20, status: avgImplementation >= 70 ? 'good' : avgImplementation >= 40 ? 'warning' : 'critical' });

    // Factor 4: Couverture univers (weight 15)
    factors.push({ label: 'Couverture univers', score: coverageRate, weight: 15, status: coverageRate >= 60 ? 'good' : coverageRate >= 30 ? 'warning' : 'critical' });

    // Factor 5: Conformité procédures (weight 10)
    factors.push({ label: 'Conformité procédures', score: procedureConformityRate, weight: 10, status: procedureConformityRate >= 80 ? 'good' : procedureConformityRate >= 50 ? 'warning' : 'critical' });

    // Factor 6: Maîtrise des risques (weight 10)
    const riskCoverageScore = risksActive > 0 ? Math.round(((risksActive - risksWithoutControls) / risksActive) * 100) : 100;
    factors.push({ label: 'Maîtrise des risques', score: riskCoverageScore, weight: 10, status: riskCoverageScore >= 80 ? 'good' : riskCoverageScore >= 50 ? 'warning' : 'critical' });

    const healthScore = Math.round(factors.reduce((sum, f) => sum + (f.score * f.weight), 0) / factors.reduce((sum, f) => sum + f.weight, 0));

    // 📦 Result
    const result: DGDashboardData = {
      criticalFindingsCount,
      criticalRecommendationsOpen,
      criticalRecommendationsClosed,
      resolutionRate,
      topRiskDepartments,
      trend,
      planExecution,
      coverageRate,
      totalAuditableEntities,
      coveredEntitiesCount,
      avgImplementation,
      recosOverdueCount,
      recosOverdueAvgDays,
      approvalsPending,
      approvalsApproved,
      approvalsRejected,
      risksActive,
      risksWithoutControls,
      totalControls,
      procedureConformityRate,
      proceduresOk,
      proceduresTotal,
      avgFindingCloseDays,
      avgRecoCloseDays,
      activeMissions,
      healthScore,
      healthFactors: factors,
    };

    // ⚡ Cache
    SimpleCache.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }
}