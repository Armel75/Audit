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

    const criticalLevel = maxRiskLevel._max.level;
    if (!criticalLevel) {
      throw new Error('No risk levels configured');
    }

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

    // 📦 Result
    const result: DGDashboardData = {
      criticalFindingsCount,
      criticalRecommendationsOpen,
      criticalRecommendationsClosed,
      resolutionRate,
      topRiskDepartments,
      trend,
    };

    // ⚡ Cache
    SimpleCache.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }
}