import bcrypt from 'bcryptjs';
import prisma from '../db';

export async function bootstrapAdmin() {
  if (process.env.BOOTSTRAP_ENABLED !== 'true') {
    return;
  }

  const roleName = process.env.BOOTSTRAP_ADMIN_ROLE;
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;

  if (!roleName || !username || !password || !email) {
    throw new Error('[BOOTSTRAP] Missing required environment variables for admin bootstrap.');
  }

  try {
    // Ensure a default tenant exists since User requires tenantId
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'SOREPCO',
          code: 'DEFAULT',
        }
      });
      console.log('[BOOTSTRAP] Default tenant created');
    }

    // Check if role exists
    let role = await prisma.role.findFirst({
      where: { name: roleName }
    });

    if (!role) {
      role = await prisma.role.create({
        data: { name: roleName }
      });
      console.log('[BOOTSTRAP] Role created');
    }

    // Check if user exists by email or matricule
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { matricule: username }
        ]
      }
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email: email,
          matricule: username,
          firstName: 'Admin',
          lastName: username,
          passwordHash: passwordHash,
          roleId: role.id,
          tenantId: tenant.id,
          status: 'ACTIVE'
        }
      });
      console.log('[BOOTSTRAP] User created');
    } else {
      console.log('[BOOTSTRAP] User already exists');
      
      // Optionally, ensure the user has the admin role if they already exist
      if (user.roleId !== role.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: role.id }
        });
        console.log('[BOOTSTRAP] User role updated to admin');
      }
    }
  } catch (error) {
    console.error('[BOOTSTRAP] Error during bootstrap:', error);
    throw error;
  }
}
