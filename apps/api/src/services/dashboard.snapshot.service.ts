
import { DashboardService } from './dashboard.service';

const prisma = require('@audit/database').default;

export class DashboardSnapshotService {
  static async generate(tenantId: number, year?: number, month?: number) {
    const data = await DashboardService.getDGDashboard(tenantId, {
      year,
      month,
    });

    await prisma.dashboardSnapshot.create({
      data: {
        tenantId,
        year,
        month,
        data: JSON.stringify(data),
      },
    });
  }

  static async getLatest(tenantId: number, year?: number, month?: number) {
    const snapshot = await prisma.dashboardSnapshot.findFirst({
      where: { tenantId, year, month },
      orderBy: { createdAt: 'desc' },
    });

    return snapshot ? JSON.parse(snapshot.data) : null;
  }
}