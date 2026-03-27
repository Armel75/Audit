import { seedPermissionsIfEmpty } from '../prisma/seedPermissions';
import { bootstrapAdmin } from './adminBootstrap';

export async function runBootstrap() {
  console.log('[BOOTSTRAP] Starting...');

  // 1. Permissions
  await seedPermissionsIfEmpty();

  // 2. Admin
  await bootstrapAdmin();

  console.log('[BOOTSTRAP] Done');
}