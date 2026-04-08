const prisma = require('@audit/database').default;

import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const RESET_TOKEN_EXPIRATION_MINUTES = 15;

export class AuthService {
  static async login(identifier: string, passwordPlain: string, ipAddress?: string, userAgent?: string) {
    // 1. Find user by email or matricule
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { matricule: identifier }
        ]
      },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } }
        }
      }
    });

    // 2. Anti-timing attack: always hash something if user not found
    if (!user) {
      await bcrypt.hash(passwordPlain, 12);
      //await this.logAudit('LOGIN_FAILED', null, ipAddress, userAgent, 'User not found');
      throw new Error('Identifiant ou mot de passe invalide');
    }

    // 3. Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      //await this.logAudit('LOGIN_FAILED_LOCKED', user.id, ipAddress, userAgent, 'Account locked');
      throw new Error('Identifiant ou mot de passe invalide');
    }

    // 4. Verify password
    const isPasswordValid = await bcrypt.compare(passwordPlain, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed logins
      const failedLogins = user.failedLogins + 1;
      let lockedUntil = null;
      let status = user.status;

      if (failedLogins >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000);
        status = 'LOCKED';
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins, lockedUntil, status }
      });

      //await this.logAudit('LOGIN_FAILED', user.id, ipAddress, userAgent, 'Invalid password');
      throw new Error('Identifiant ou mot de passe invalide');
    }

    // 5. Check status
    if (user.status !== 'ACTIVE' && user.status !== 'LOCKED') {
      //await this.logAudit('LOGIN_FAILED_INACTIVE', user.id, ipAddress, userAgent, `Status: ${user.status}`);
      throw new Error('Identifiant ou mot de passe invalide');
    }

    // 6. Success: Reset failed logins and update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        failedLogins: 0, 
        lockedUntil: null, 
        status: 'ACTIVE',
        lastLoginAt: new Date() 
      }
    });

    //await this.logAudit('LOGIN_SUCCESS', user.id, ipAddress, userAgent);

    return user;
  }

  // ✅ AJOUT ICI
  static async forgotPassword(email: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Toujours répondre pareil côté controller → ici on log seulement
    if (!user) {
      //await this.logAudit('PASSWORD_RESET_REQUEST_FAILED', null, ipAddress, userAgent, 'User not found');
      return null;
    }

    // 🔁 Invalider anciens tokens
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false
      },
      data: {
        used: true,
        usedAt: new Date()
      }
    });

    // 🔐 Génération token
    const rawToken = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // 💾 Sauvegarde
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRATION_MINUTES * 60000)
      }
    });

    //await this.logAudit('PASSWORD_RESET_REQUESTED', user.id, ipAddress, userAgent);

    // 👉 retourner les infos pour le mail (controller/service mail)
    return {
      email: user.email,
      token: rawToken
    };
  }

  // static async logAudit(action: string, userId: number | null, ipAddress?: string, userAgent?: string, details?: string) {
  //   try {
  //     await prisma.auditLog.create({
  //       data: {
  //         action,
  //         userId,
  //         ipAddress,
  //         userAgent,
  //         newValues: details ? JSON.stringify({ details }) : null
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Failed to write audit log', error);
  //   }
  // }

  // static async logAudit(
  //   action: string,
  //   userId: number | null,
  //   ipAddress?: string,
  //   userAgent?: string,
  //   details?: string,
  //   entityId?: number | string | null,
  //   entityName?: string
  // ) {
  //   try {
  //     await prisma.auditLog.create({
  //       data: {
  //         action,
  //         userId,
  //         ipAddress,
  //         userAgent,
  //         entityName: entityName || null,
  //         entityId: entityId !== undefined && entityId !== null ? String(entityId) : null,
  //         newValues: details ? JSON.stringify({ details }) : null
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Failed to write audit log', error);
  //   }
  // }

  static generateRefreshToken() {
    const plainToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
    return { plainToken, tokenHash };
  }

  static hashRefreshToken(plainToken: string) {
    return crypto.createHash('sha256').update(plainToken).digest('hex');
  }

  static async resetPassword(token: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error("WEAK_PASSWORD");
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const resetTokenRecord = await tx.passwordResetToken.findFirst({
        where: {
          tokenHash,
          expiresAt: { gte: new Date() }
        },
        include: { user: true }
      });

      if (!resetTokenRecord) {
        throw new Error("INVALID_TOKEN");
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await tx.user.update({
        where: { id: resetTokenRecord.user.id },
        data: {
          passwordHash: hashedPassword,
          failedLogins: 0,
          lockedUntil: null
        }
      });

      await tx.passwordResetToken.delete({
        where: { id: resetTokenRecord.id }
      });
    });
  }  

}