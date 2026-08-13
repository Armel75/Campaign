
import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import {
  newRefreshToken,
  hashToken,
  signAccessToken,
  getJwtSecret,
} from '../auth/tokens';
// --- INSCRIPTION UTILISATEUR ---
import validator from 'validator';

const router = Router();

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const REFRESH_COOKIE = 'refresh_token';

// 30 jours refresh (tu peux ajuster)
const REFRESH_TTL_DAYS = 30;

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
  } as const;
}

function extractPermissions(role: any) {
  return {
    canViewAllCampaigns: role?.canViewAllCampaigns ?? false,
    canEditAllCampaigns: role?.canEditAllCampaigns ?? false,
    canDeleteAllCampaigns: role?.canDeleteAllCampaigns ?? false,
    canCreateCampaign: role?.canCreateCampaign ?? false,

    canManageTasks: role?.canManageTasks ?? false,
    canAssignTasks: role?.canAssignTasks ?? false,

    canManageCampaignArticles: role?.canManageCampaignArticles ?? false,
    canManageAttachments: role?.canManageAttachments ?? false,

    canManageUsers: role?.canManageUsers ?? false,
    canManageRoles: role?.canManageRoles ?? false,
    canExportCampaign: role?.canExportCampaign ?? false,

    canViewDashboard: role?.canViewDashboard ?? false,
    canViewStrategicDashboard: role?.canViewStrategicDashboard ?? false,
    canViewCampaigns: role?.canViewCampaigns ?? false,
    canViewObjectives: role?.canViewObjectives ?? false,
    canViewTasks: role?.canViewTasks ?? false,
    canViewLeads: role?.canViewLeads ?? false,
    canViewExpenses: role?.canViewExpenses ?? false,
    canViewSettings: role?.canViewSettings ?? false,
  };
}

const registerSchema = z.object({
  matricule: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    if (data.password !== data.confirmPassword) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
    }
    if (!validator.isEmail(data.email)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }
    // Vérification unicité
    const exists = await prisma.user.findFirst({
      where: {
        OR: [
          { matricule: data.matricule },
          { username: data.username },
          { email: data.email },
        ],
      },
    });
    if (exists) {
      return res.status(400).json({ message: 'Matricule, nom d\'utilisateur ou email déjà utilisé.' });
    }
    // Récupère le rôle viewer (USER)
    const viewerRole = await prisma.role.findFirst({ where: { name: 'USER' } });
    if (!viewerRole) {
      return res.status(500).json({ message: 'Rôle viewer introuvable.' });
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        matricule: data.matricule,
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        roleId: viewerRole.id,
      },
    });
    res.status(201).json({ message: 'Compte créé avec succès.' });
  } catch (error) {
    next(error);
  }
});


router.post('/login', async (req, res, next) => {
  try {
    getJwtSecret();

    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });

    const dummyHash = '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0123456789';
    const targetHash = user?.passwordHash || dummyHash;
    const isValid = await bcrypt.compare(password, targetHash);

    if (!user || !isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Refuser la connexion si le compte est désactivé
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Compte désactivé. Contactez un administrateur.' });
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role.name });

    const refreshRaw = newRefreshToken();
    const refreshHashed = hashToken(refreshRaw);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: refreshHashed,
        expiresAt,
        userAgent: req.get('user-agent') || null,
        ip: req.ip || null,
      },
    });

    res.cookie(REFRESH_COOKIE, refreshRaw, {
      ...refreshCookieOptions(),
      expires: expiresAt,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        permissions: extractPermissions(user.role),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Renouvelle l'access token + rotate refresh
router.post('/refresh', async (req, res, next) => {
  try {
    getJwtSecret();

    const refreshRaw = req.cookies?.[REFRESH_COOKIE];
    if (!refreshRaw) return res.status(401).json({ message: 'No refresh token' });

    const refreshHashed = hashToken(refreshRaw);

    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash: refreshHashed },
      include: { user: { include: { role: true } } },
    });

    if (!session || session.revokedAt) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    await prisma.refreshSession.update({
      where: { tokenHash: refreshHashed },
      data: { revokedAt: new Date() },
    });

    const newRefreshRaw = newRefreshToken();
    const newRefreshHashed = hashToken(newRefreshRaw);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

    await prisma.refreshSession.create({
      data: {
        userId: session.userId,
        tokenHash: newRefreshHashed,
        expiresAt,
        userAgent: req.get('user-agent') || null,
        ip: req.ip || null,
      },
    });

    res.cookie(REFRESH_COOKIE, newRefreshRaw, {
      ...refreshCookieOptions(),
      expires: expiresAt,
    });

    const accessToken = signAccessToken({
      userId: session.userId,
      role: session.user.role.name,
    });

    res.json({
      accessToken,
      user: {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role.name,
        permissions: extractPermissions(session.user.role),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const refreshRaw = req.cookies?.[REFRESH_COOKIE];
    if (refreshRaw) {
      const refreshHashed = hashToken(refreshRaw);
      await prisma.refreshSession.updateMany({
        where: { tokenHash: refreshHashed, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = Number(req.user!.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
      permissions: extractPermissions(user.role),
    });
  } catch (error) {
    next(error);
  }
});

export default router;