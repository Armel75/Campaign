import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { newRefreshToken, hashToken, signAccessToken, getJwtSecret } from '../auth/tokens';

const router = Router();

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const REFRESH_COOKIE = 'refresh_token';

// 30 jours refresh (tu peux ajuster)
const REFRESH_TTL_DAYS = 30;

// function refreshCookieOptions() {
//   const isProd = process.env.NODE_ENV === 'production';
//   return {
//     httpOnly: true,
//     secure: isProd,            // true en prod (HTTPS)
//     sameSite: isProd ? 'none' : 'lax', // si front/api domaines différents en prod => none
//     path: '/api/v1/auth/refresh',
//   } as const;
// }

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth', // ✅ permet cookie sur refresh + logout
  } as const;
}

router.post('/login', async (req, res, next) => {
  try {
    // Force une erreur si JWT_SECRET absent
    getJwtSecret();

    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });

    // anti timing attack
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0123456789';
    const targetHash = user?.passwordHash || dummyHash;
    const isValid = await bcrypt.compare(password, targetHash);

    if (!user || !isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
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

    // Rotation: revoke ancienne session
    await prisma.refreshSession.update({
      where: { tokenHash: refreshHashed },
      data: { revokedAt: new Date() },
    });

    // Crée une nouvelle session refresh
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

    // Nouveau cookie refresh
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
    });
  } catch (error) {
    next(error);
  }
});

export default router;