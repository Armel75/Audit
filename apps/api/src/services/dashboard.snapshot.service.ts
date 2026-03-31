
import prismaRaw from '@audit/database';
import type { PrismaClient } from '@prisma/client';
import { DashboardService } from './dashboard.service';

const prisma = prismaRaw as unknown as PrismaClient;

export class DashboardSnapshotService {
  static async generate(tenantId: number, year?: number, month?: number) {
    const data = await DashboardService.getDGDashboard(tenantId, {
      year,
      month,
    });

    await (prisma as any).dashboardSnapshot.create({
      data: {
        tenantId,
        year,
        month,
        data: JSON.stringify(data),
      },
    });
  }

  static async getLatest(tenantId: number, year?: number, month?: number) {
    const snapshot = await (prisma as any).dashboardSnapshot.findFirst({
      where: { tenantId, year, month },
      orderBy: { createdAt: 'desc' },
    });

    return snapshot ? JSON.parse(snapshot.data) : null;
  }
}