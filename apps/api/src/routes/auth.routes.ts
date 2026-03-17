import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@audit/database';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';

const router = Router();

const ACCESS_TOKEN_EXPIRES_IN = '15m'; // Short-lived JWT
const REFRESH_TOKEN_EXPIRES_DAYS = 7; // Long-lived refresh token
const RESET_TOKEN_EXPIRES_HOURS = 1; // Limited-lifetime reset token

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

// Helper to generate tokens
const generateAccessToken = (user: any) => {
  return jwt.sign(
    { 
      id: user.id, 
      tenantId: user.tenantId, 
      permissions: user.role?.permissions?.map((p: any) => p.permission.code) || [] 
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const user = await AuthService.login(identifier, password, ipAddress, userAgent);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const { plainToken, tokenHash } = AuthService.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    // Save refresh token securely in DB
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        ipAddress,
        userAgent
      }
    });

    // Set HTTP-only cookie for refresh token
    res.cookie('refreshToken', plainToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt
    });

    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        matricule: user.matricule,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'User'
      }
    });
  } catch (error: any) {
    // We only send the generic error message
    res.status(401).json({ error: error.message || 'Identifiant ou mot de passe invalide' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const tokenHash = AuthService.hashRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } }
            }
          }
        }
      }
    });

    if (!storedToken) {
      // Possible token reuse detected, clear cookie
      res.clearCookie('refreshToken');
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Delete the used token (Rotation)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    if (storedToken.expiresAt < new Date()) {
      res.clearCookie('refreshToken');
      return res.status(403).json({ error: 'Refresh token expired' });
    }

    if (storedToken.user.status !== 'ACTIVE') {
      res.clearCookie('refreshToken');
      return res.status(403).json({ error: 'Account inactive' });
    }

    // Issue new tokens
    const accessToken = generateAccessToken(storedToken.user);
    const newRefreshTokenData = AuthService.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await prisma.refreshToken.create({
      data: {
        tokenHash: newRefreshTokenData.tokenHash,
        userId: storedToken.user.id,
        expiresAt,
        ipAddress,
        userAgent
      }
    });

    res.cookie('refreshToken', newRefreshTokenData.plainToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt
    });

    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      const tokenHash = AuthService.hashRefreshToken(refreshToken);
      const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
      
      if (storedToken) {
        await prisma.refreshToken.delete({
          where: { id: storedToken.id }
        });
        
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        await AuthService.logAudit('LOGOUT', storedToken.userId, ipAddress, userAgent);
      }
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRES_HOURS);

      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          expiresAt
        }
      });

      // Simulate sending email
      console.log(`[Email Simulation] Password reset token for ${email}: ${resetToken}`);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetToken || resetToken.used) {
      return res.status(400).json({ error: 'Invalid or already used token' });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      })
    ]);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { matricule, email, password, firstName, lastName } = req.body;
    
    if (!matricule || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { matricule }
        ]
      }
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
      if (existingUser.matricule === matricule) {
        return res.status(400).json({ error: 'Ce matricule est déjà utilisé' });
      }
    }

    const tenant = await prisma.tenant.findFirst({ where: { code: 'SOREPCO' } });
    if (!tenant) {
      return res.status(500).json({ error: 'Tenant SOREPCO introuvable' });
    }

    const passwordHash = await bcrypt.hash(password, 12); // Use cost 12 for better security
    const role = await prisma.role.findFirst({ where: { name: 'Auditeur' } });

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        matricule,
        email,
        passwordHash,
        firstName,
        lastName,
        status: 'PENDING',
        roleId: role?.id || null,
      }
    });

    res.status(201).json({ message: 'Inscription réussie. Votre compte est en attente de validation.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
