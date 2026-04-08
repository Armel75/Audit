const prisma = require('@audit/database').default;
import { DashboardSnapshotService } from '../services/dashboard.snapshot.service';

export async function runDashboardJob() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true },
  });

  for (const t of tenants) {
    await DashboardSnapshotService.generate(t.id);
  }
}