import bcrypt from 'bcryptjs';
import prisma from '@audit/database';

export async function bootstrapAdmin() {
  if (process.env.BOOTSTRAP_ENABLED !== 'true') {
    return;
  }

  const roleName = process.env.BOOTSTRAP_ADMIN_ROLE;
  const matricule = process.env.BOOTSTRAP_ADMIN_MATRICULE;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const firstName = process.env.BOOTSTRAP_ADMIN_FIRST_NAME;
  const lastName = process.env.BOOTSTRAP_ADMIN_LAST_NAME;
  const status = process.env.BOOTSTRAP_ADMIN_STATUS;
  const tenantIdRaw = process.env.BOOTSTRAP_TENANT_ID;

  if (
    !roleName ||
    !matricule ||
    !password ||
    !email ||
    !firstName ||
    !lastName ||
    !status
  ) {
    throw new Error('[BOOTSTRAP] Missing required environment variables for admin bootstrap.');
  }

  try {
    let tenant = null;

    if (tenantIdRaw) {
      const tenantId = Number(tenantIdRaw);

      if (Number.isNaN(tenantId)) {
        throw new Error('[BOOTSTRAP] BOOTSTRAP_TENANT_ID must be a valid integer.');
      }

      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        console.warn(`[BOOTSTRAP] Tenant with id ${tenantId} not found. Falling back to automatic tenant resolution.`);
      }
    }

    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: { code: 'SOREPCO' }
      });
    }

    if (!tenant) {
      const now = new Date();

      tenant = await prisma.tenant.create({
        data: {
          name: 'SOREPCO',
          code: 'SOREPCO',
          isActive: true,
          createdAt: now,
          updatedAt: now
        }
      });

      console.log(`[BOOTSTRAP] Tenant created with id ${tenant.id}`);
    } else {
      console.log(`[BOOTSTRAP] Tenant found with id ${tenant.id}`);
    }

    let role = await prisma.role.findFirst({
      where: { name: roleName }
    });

    if (!role) {
      role = await prisma.role.create({
        data: { name: roleName }
      });
      console.log('[BOOTSTRAP] Role created');
    } else {
      console.log('[BOOTSTRAP] Role already exists');
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { matricule }
        ]
      }
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);

      user = await prisma.user.create({
        data: {
          email,
          matricule,
          firstName,
          lastName,
          passwordHash,
          roleId: role.id,
          tenantId: tenant.id,
          status
        }
      });

      console.log('[BOOTSTRAP] User created');
    } else {
      console.log('[BOOTSTRAP] User already exists');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          matricule,
          firstName,
          lastName,
          roleId: role.id,
          tenantId: tenant.id,
          status
        }
      });

      console.log('[BOOTSTRAP] User updated');
    }
  } catch (error) {
    console.error('[BOOTSTRAP] Error during bootstrap:', error);
    throw error;
  }
}