import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roleName = process.env.BOOTSTRAP_ADMIN_ROLE || 'SUPER_ADMIN';

  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName }
  });

  const permissions = await prisma.permission.findMany();

  // 🔥 reset propre
  await prisma.rolePermission.deleteMany({
    where: { roleId: role.id }
  });

  // 🔥 FULL ACCESS
  await prisma.rolePermission.createMany({
    data: permissions.map(p => ({
      roleId: role.id,
      permissionId: p.id
    }))
  });

  console.log(`✅ ${roleName} a toutes les permissions`);
}

main().finally(() => prisma.$disconnect());