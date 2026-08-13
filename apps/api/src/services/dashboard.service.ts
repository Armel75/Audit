const prisma = require('@audit/database').default;
import { DashboardPeriod, DGDashboardData, MissionsDashboardData, MissionsDashboardSummary } from '../types/dashboard.types';
import { SimpleCache } from '../shared/cache/simple.cache';
import { DashboardSnapshotService } from './dashboard.snapshot.service';

// ═══════════════════════════════════════════════════════════
// Helpers — Tableau de bord missions
// ═══════════════════════════════════════════════════════════

/** Filtre createdAt pour une période (année / mois). Retourne {} si aucune période. */
function buildDashboardDateFilter(period?: DashboardPeriod): any {
  const dateFilter: any = {};
  if (period?.year) {
    dateFilter.gte = new Date(period.year, 0, 1);
    dateFilter.lt = new Date(period.year + 1, 0, 1);
  }
  if (period?.month !== undefined && period?.year) {
    dateFilter.gte = new Date(period.year, period.month - 1, 1);
    dateFilter.lt = new Date(period.year, period.month, 1);
  }
  return Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
}

/** Période précédente de même longueur (mois précédent / année précédente). */
function getPreviousDashboardPeriod(period?: DashboardPeriod): DashboardPeriod | undefined {
  if (!period?.year) return undefined;
  if (period.month === undefined) {
    return { year: period.year - 1 };
  }
  const prevMonth = period.month === 1 ? 12 : period.month - 1;
  const prevYear = period.month === 1 ? period.year - 1 : period.year;
  return { year: prevYear, month: prevMonth };
}

/** Résumé agrégé d'une liste de missions (avec findings + recos imbriqués). */
function computeMissionsSummary(missions: any[], now: Date): MissionsDashboardSummary {
  let planned = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let late = 0;
  let findingsCount = 0;
  let findingsResolved = 0;
  let recosCount = 0;
  let recosClosed = 0;

  for (const m of missions) {
    const isCompleted = ['CLOSED', 'COMPLETED'].includes(m.status);
    const isCancelled = m.status === 'CANCELLED';

    if (m.status === 'PLANNED' || m.status === 'READY') planned += 1;
    else if (['IN_PROGRESS', 'UNDER_REVIEW', 'REVIEW', 'APPROVED'].includes(m.status)) inProgress += 1;
    if (isCompleted) completed += 1;
    if (isCancelled) cancelled += 1;
    if (!isCompleted && !isCancelled && m.endDate && new Date(m.endDate) < now) late += 1;

    const mFindings = m.findings || [];
    const mResolved = mFindings.filter((f: any) => ['CLOSED', 'RESOLVED'].includes(f.status)).length;
    const mRecos = mFindings.flatMap((f: any) => f.recos || []);
    const mRecosClosed = mRecos.filter((r: any) => r.status === 'CLOSED').length;

    findingsCount += mFindings.length;
    findingsResolved += mResolved;
    recosCount += mRecos.length;
    recosClosed += mRecosClosed;
  }

  const totalMissions = missions.length;
  const completionRate = totalMissions > 0 ? Math.round((completed / totalMissions) * 100) : 0;
  const findingsResolvedRate = findingsCount > 0 ? Math.round((findingsResolved / findingsCount) * 100) : 0;
  const recoClosureRate = recosCount > 0 ? Math.round((recosClosed / recosCount) * 100) : 0;

  return {
    totalMissions,
    planned,
    inProgress,
    completed,
    cancelled,
    late,
    completionRate,
    findingsCount,
    findingsResolved,
    findingsResolvedRate,
    recosCount,
    recosClosed,
    recoClosureRate,
  };
}

/**
 * Score de santé 0-100 : 40% complétion + 30% clôture reco + 30% résolution,
 * pénalisé par le ratio de missions en retard (jusqu'à -50 pts).
 */
function computeMissionsHealthScore(s: MissionsDashboardSummary): number {
  if (s.totalMissions === 0) return 0;
  const base = Math.round(0.4 * s.completionRate + 0.3 * s.recoClosureRate + 0.3 * s.findingsResolvedRate);
  const lateRatio = s.late / s.totalMissions;
  return Math.max(0, Math.min(100, Math.round(base - lateRatio * 50)));
}

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

    // 🧠 3. Snapshot — désactivé quand un filtre période est actif
    // (les snapshots existants ont été générés sans le filtre createdAt)
    if (!period) {
      const snapshot = await DashboardSnapshotService.getLatest(
        tenantId
      );
      if (snapshot) {
        SimpleCache.set(cacheKey, snapshot, 5 * 60 * 1000);
        return snapshot;
      }
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
      dateFilter.lt = new Date(period.year + 1, 0, 1);
    }

    if (period?.month !== undefined && period?.year) {
      dateFilter.gte = new Date(period.year, period.month - 1, 1);
      dateFilter.lt = new Date(period.year, period.month, 1);
    }

    const createdAtFilter =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // 📊 6. Findings
    const criticalFindingsCount = await prisma.finding.count({
      where: {
        tenantId,
        status: { notIn: ['CLOSED', 'REJECTED'] },
        riskLevel: { level: { gte: 4 } },
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
        ...createdAtFilter,
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
        ...createdAtFilter,
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
      where: { tenantId, status: 'VALIDATED', ...(period?.year ? { year: period.year } : {}) },
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
      ...(currentPlan ? [prisma.auditMissionScope.findMany({
        where: {
          tenantId, status: 'IN_SCOPE',
          mission: { planId: currentPlan.id },
        },
        select: { auditableEntityId: true },
        distinct: ['auditableEntityId'],
      })] : [Promise.resolve([])]),
    ]);
    const coveredEntitiesCount = currentPlan ? coveredEntitiesRaw.length : 0;
    const coverageRate = totalAuditableEntities > 0 ? Math.round((coveredEntitiesCount / totalAuditableEntities) * 100) : 0;

    // ── Top 1% DG: Implementation rate ───────────────
    const recoImplementedAgg = await prisma.recommendation.aggregate({
      where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED'] }, ...createdAtFilter },
      _avg: { implementedPercent: true },
    });
    const avgImplementation = Math.round(recoImplementedAgg._avg.implementedPercent ?? 0);

    // ── Top 1% DG: Overdue recos ─────────────────────
    const overdueRecos = await prisma.recommendation.findMany({
      where: { tenantId, status: { notIn: ['CLOSED', 'REJECTED', 'VALIDATED'] }, targetDate: { lt: now }, ...createdAtFilter },
      select: { targetDate: true },
    });
    const recosOverdueCount = overdueRecos.length;
    const recosOverdueAvgDays = recosOverdueCount > 0
      ? Math.round(overdueRecos.reduce((sum: number, r: any) => sum + (now.getTime() - r.targetDate.getTime()) / 86400000, 0) / recosOverdueCount)
      : 0;

    // ── Top 1% DG: Approvals ─────────────────────────
    const [approvalsPending, approvalsApproved, approvalsRejected] = await Promise.all([
      prisma.approval.count({ where: { tenantId, decision: 'PENDING', ...createdAtFilter } }),
      prisma.approval.count({ where: { tenantId, decision: 'APPROVED', ...createdAtFilter } }),
      prisma.approval.count({ where: { tenantId, decision: 'REJECTED', ...createdAtFilter } }),
    ]);

    // ── Top 1% DG: Risks & controls ─────────────────
    const [risksActive, risksWithoutControls, totalControls] = await Promise.all([
      prisma.risk.count({ where: { tenantId, isActive: true, ...createdAtFilter } }),
      prisma.risk.count({ where: { tenantId, isActive: true, controlLinks: { none: {} }, ...createdAtFilter } }),
      prisma.control.count({ where: { tenantId, ...createdAtFilter } }),
    ]);

    // ── Top 1% DG: Procedure conformity ──────────────
    const [proceduresOk, proceduresTotal] = await Promise.all([
      prisma.auditProcedure.count({ where: { tenantId, result: 'OK', ...createdAtFilter } }),
      prisma.auditProcedure.count({ where: { tenantId, result: { not: null }, ...createdAtFilter } }),
    ]);
    const procedureConformityRate = proceduresTotal > 0 ? Math.round((proceduresOk / proceduresTotal) * 100) : 0;

    // ── Top 1% DG: Avg close times ──────────────────
    const closedFindings = await prisma.finding.findMany({
      where: { tenantId, status: 'CLOSED', ...createdAtFilter },
      select: { createdAt: true, updatedAt: true },
    });
    const avgFindingCloseDays = closedFindings.length > 0
      ? Math.round(closedFindings.reduce((sum: number, f: any) => sum + (f.updatedAt.getTime() - f.createdAt.getTime()) / 86400000, 0) / closedFindings.length)
      : 0;

    const closedRecommendations = await prisma.recommendation.findMany({
      where: { tenantId, status: 'CLOSED', closedAt: { not: null }, ...createdAtFilter },
      select: { createdAt: true, closedAt: true },
    });
    const avgRecoCloseDays = closedRecommendations.length > 0
      ? Math.round(closedRecommendations.reduce((sum: number, r: any) => sum + (r.closedAt.getTime() - r.createdAt.getTime()) / 86400000, 0) / closedRecommendations.length)
      : 0;

    // ── Top 1% DG: Active missions ───────────────────
    const activeMissionsRaw = await prisma.auditMission.findMany({
      where: { tenantId, status: { in: ['IN_PROGRESS', 'REVIEW'] }, ...createdAtFilter },
      orderBy: { endDate: 'asc' },
      take: 6,
      select: {
        id: true, title: true, status: true, startDate: true, endDate: true,
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
      startDate: m.startDate,
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
    factors.push({ label: 'Implémentation recommandations', score: avgImplementation, weight: 20, status: avgImplementation >= 70 ? 'good' : avgImplementation >= 40 ? 'warning' : 'critical' });

    // Factor 4: Couverture univers (weight 15)
    factors.push({ label: 'Couverture entités auditées', score: coverageRate, weight: 15, status: coverageRate >= 60 ? 'good' : coverageRate >= 30 ? 'warning' : 'critical' });

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

  // ═══════════════════════════════════════════════════════════
  // 🎯 TABLEAU DE BORD MISSIONS
  // KPIs + classement des missions par taux de clôture des
  // recommandations et résolution des findings.
  // ═══════════════════════════════════════════════════════════
  static async getMissionsDashboard(
    tenantId: number,
    period?: DashboardPeriod,
    accessFilter: any = null,
    scope: 'all' | 'mine' = 'all'
  ): Promise<MissionsDashboardData> {
    // 🔑 1. Cache key (inclut le scope)
    const cacheKey = `missions:${tenantId}:${period?.year || 'all'}:${period?.month || 'all'}:${scope}`;

    // ⚡ 2. Cache
    const cached = SimpleCache.get<MissionsDashboardData>(cacheKey);
    if (cached) return cached;

    const now = new Date();

    // 📅 3. Date filter (période de création des missions)
    const createdAtFilter = buildDashboardDateFilter(period);

    // 🔐 4. Base where (tenant + période + accès)
    const baseWhere: any = { tenantId, ...createdAtFilter };
    if (accessFilter) {
      baseWhere.AND = [accessFilter];
    }

    // 📥 5. Missions + findings + recommandations (pour classement)
    const missions = await prisma.auditMission.findMany({
      where: baseWhere,
      include: {
        leader: { select: { id: true, firstName: true, lastName: true } },
        auditType: { select: { id: true, name: true } },
        findings: {
          select: {
            id: true,
            status: true,
            recos: { select: { id: true, status: true } },
          },
        },
      },
    });

    // 📊 6. Classement (par mission)
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const leaderCounts: Record<string, number> = {};

    const ranking = missions.map((m: any) => {
      statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;

      const typeName = m.auditType?.name || 'Sans type';
      typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;

      let leaderName = 'Non assigné';
      if (m.leader) {
        const full = `${m.leader.firstName || ''} ${m.leader.lastName || ''}`.trim();
        leaderName = full || `#${m.leader.id}`;
      }
      leaderCounts[leaderName] = (leaderCounts[leaderName] || 0) + 1;

      const mFindings = m.findings || [];
      const mResolved = mFindings.filter((f: any) => ['CLOSED', 'RESOLVED'].includes(f.status)).length;
      const mRecos = mFindings.flatMap((f: any) => f.recos || []);
      const mRecosClosed = mRecos.filter((r: any) => r.status === 'CLOSED').length;
      const recoClosureRate = mRecos.length > 0 ? Math.round((mRecosClosed / mRecos.length) * 100) : 0;
      const findingsResolvedRate = mFindings.length > 0 ? Math.round((mResolved / mFindings.length) * 100) : 0;

      // 🏆 Score = 60% clôture des recommandations + 40% findings résolus
      const score = Math.round(recoClosureRate * 0.6 + findingsResolvedRate * 0.4);

      return {
        id: m.id,
        title: m.title,
        status: m.status,
        startDate: m.startDate ? m.startDate.toISOString() : null,
        endDate: m.endDate ? m.endDate.toISOString() : null,
        leader: leaderName === 'Non assigné' ? null : leaderName,
        auditType: m.auditType?.name || null,
        findingsCount: mFindings.length,
        findingsResolved: mResolved,
        recosCount: mRecos.length,
        recosClosed: mRecosClosed,
        recoClosureRate,
        score,
      };
    });

    // 🏆 7. Tri : meilleures missions en premier
    ranking.sort((a: any, b: any) => b.score - a.score);

    // 📈 8. Tendance 12 derniers mois (créées / clôturées)
    const trend: Array<{ month: string; created: number; closed: number }> = [];
    const trendMap = new Map<string, { month: string; created: number; closed: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = { month: key, created: 0, closed: 0 };
      trend.push(entry);
      trendMap.set(key, entry);
    }
    for (const m of missions) {
      if (m.createdAt) {
        const key = `${m.createdAt.getFullYear()}-${String(m.createdAt.getMonth() + 1).padStart(2, '0')}`;
        const e = trendMap.get(key);
        if (e) e.created += 1;
      }
      if (['CLOSED', 'COMPLETED'].includes(m.status) && m.updatedAt) {
        const key = `${m.updatedAt.getFullYear()}-${String(m.updatedAt.getMonth() + 1).padStart(2, '0')}`;
        const e = trendMap.get(key);
        if (e) e.closed += 1;
      }
    }
    const trendLabels: Record<string, string> = {
      '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
      '07': 'Juil', '08': 'Août', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
    };
    const trendData = trend.map((t) => ({
      ...t,
      label: `${trendLabels[t.month.slice(5)] || t.month.slice(5)} ${t.month.slice(0, 4)}`,
    }));

    // 🧩 9. Répartition par statut (MISSION_STATUS officiel + legacy)
    const statusOrder = ['PLANNED', 'READY', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'CLOSED', 'CANCELLED'];
    const statusLabels: Record<string, string> = {
      PLANNED: 'Planifiées', READY: 'Prêtes', IN_PROGRESS: 'En cours',
      UNDER_REVIEW: 'En revue', APPROVED: 'Approuvées', CLOSED: 'Clôturées',
      CANCELLED: 'Annulées', REVIEW: 'Revue', COMPLETED: 'Terminées', VALIDATED: 'Validées',
    };
    const byStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, label: statusLabels[status] || status, count }))
      .sort((a, b) => {
        const ia = statusOrder.indexOf(a.status);
        const ib = statusOrder.indexOf(b.status);
        if (ia === -1 && ib === -1) return b.count - a.count;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

    const byAuditType = Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const byLeader = Object.entries(leaderCounts)
      .map(([leader, count]) => ({ leader, count }))
      .sort((a, b) => b.count - a.count);

    // ✅ 10. Résumé + score santé
    const summary = computeMissionsSummary(missions, now);
    const healthScore = computeMissionsHealthScore(summary);

    // 📉 11. Comparaison période précédente (même scope)
    let previousSummary: MissionsDashboardSummary | null = null;
    const prevPeriod = getPreviousDashboardPeriod(period);
    if (prevPeriod) {
      const prevWhere: any = {
        tenantId,
        ...buildDashboardDateFilter(prevPeriod),
      };
      if (accessFilter) prevWhere.AND = [accessFilter];
      const prevMissions = await prisma.auditMission.findMany({
        where: prevWhere,
        include: {
          findings: {
            select: {
              id: true,
              status: true,
              recos: { select: { id: true, status: true } },
            },
          },
        },
      });
      previousSummary = computeMissionsSummary(prevMissions, now);
    }

    const result: MissionsDashboardData = {
      summary,
      previousSummary,
      healthScore,
      view: scope,
      byStatus,
      byAuditType,
      byLeader,
      trend: trendData,
      ranking,
    };

    // ⚡ Cache
    SimpleCache.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }
}