import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: 'SOREPCO' },
    update: {},
    create: {
      id: 'DEFAULT_SOREPCO_TENANT',
      name: 'SOREPCO',
      code: 'SOREPCO',
    },
  });

  // 2. Create Permissions
  const permissions = ['can_manage_tasks', 'audit_view_missions', 'audit_manage_own_missions', 'manage_settings'];
  for (const code of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: `Permission: ${code}` }
    });
  }

  // 3. Create Role
  const role = await prisma.role.upsert({
    where: { id: 'role-auditeur' },
    update: {},
    create: {
      id: 'role-auditeur',
      name: 'Auditeur',
    },
  });

  // Link permissions to role
  for (const code of permissions) {
    const perm = await prisma.permission.findUnique({ where: { code } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id }
      });
    }
  }

  // 4. Create User (Leader)
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'jean.dupont@sorepco.com' },
    update: { passwordHash },
    create: {
      id: 'mock-user-id',
      tenantId: tenant.id,
      matricule: 'MAT-001',
      email: 'jean.dupont@sorepco.com',
      passwordHash,
      firstName: 'Jean',
      lastName: 'Dupont',
      status: 'ACTIVE',
      roleId: role.id,
    },
  });

  // 5. Create Audit Plan for 2026
  const plan = await prisma.auditPlan.upsert({
    where: {
      tenantId_year: {
        tenantId: tenant.id,
        year: 2026,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      year: 2026,
      status: 'VALIDATED',
    },
  });

  // 6. Create Audit Mission
  // We use findFirst to avoid unique constraint issues if we run seed multiple times
  let mission = await prisma.auditMission.findFirst({
    where: { title: 'Audit initial SOREPCO' }
  });
  
  if (!mission) {
    mission = await prisma.auditMission.create({
      data: {
        tenantId: tenant.id,
        title: 'Audit initial SOREPCO',
        description: 'First audit mission for SOREPCO.',
        planId: plan.id,
        leaderId: user.id,
        status: 'PLANNED',
      },
    });
    console.log('Created Mission:', mission);
  }

  // 7. Create Risk Level
  const riskLevel = await prisma.riskLevel.upsert({
    where: { id: 'risk-high' },
    update: {},
    create: {
      id: 'risk-high',
      tenantId: tenant.id,
      name: 'Élevé',
      color: '#ef4444',
      level: 3
    }
  });

  // 8. Create a Finding
  const finding = await prisma.finding.findFirst({
    where: { title: 'Absence de procédure de sauvegarde' }
  });

  if (!finding) {
    await prisma.finding.create({
      data: {
        title: 'Absence de procédure de sauvegarde',
        description: 'Il n\'y a pas de procédure formalisée pour la sauvegarde des données critiques du serveur principal.',
        status: 'CONFIRMED',
        riskLevelId: riskLevel.id,
        missionId: mission.id,
        authorId: user.id,
      }
    });
    console.log('Created Finding');
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
