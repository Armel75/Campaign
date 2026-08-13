import { Router, Request } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();

const createUserSchema = z.object({
  matricule: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6),
  roleId: z.coerce.number().int().positive(),
});

const updateUserSchema = z.object({
  matricule: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.preprocess(
    (value) => {
      if (typeof value === 'string' && value.trim() === '') return undefined;
      return value;
    },
    z.string().min(6).optional()
  ),
  roleId: z.coerce.number().int().positive().optional(),
});

const parseId = (id: string): number | null => {
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  return numericId;
};

const roleSelect = {
  id: true,
  name: true,

  // Campaign permissions
  canViewAllCampaigns: true,
  canEditAllCampaigns: true,
  canDeleteAllCampaigns: true,
  canCreateCampaign: true,

  // Tasks
  canManageTasks: true,
  canAssignTasks: true,

  // Campaign content
  canManageCampaignArticles: true,
  canManageAttachments: true,

  // Administration
  canManageUsers: true,
  canManageRoles: true,
  canExportCampaign: true,

  // UI visibility permissions
  canViewDashboard: true,
  canViewCampaigns: true,
  canViewObjectives: true,
  canViewTasks: true,
  canViewLeads: true,
  canViewExpenses: true,
  canViewSettings: true,
} as const;

// List Users
router.get(
  '/',
  requireAuth,
  requirePermission('canManageUsers'),
  async (_req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          roleId: true,
          role: {
            select: roleSelect,
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ data: users });
    } catch (error) {
      next(error);
    }
  }
);

// Get User
router.get(
  '/:id',
  requireAuth,
  requirePermission('canManageUsers'),
  async (req, res, next) => {
    try {
      const userId = parseId(req.params.id);

      if (!userId) {
        return res.status(400).json({ message: 'Invalid user id' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          matricule: true,
          username: true,
          email: true,
          isActive: true,
          firstName: true,
          lastName: true,
          roleId: true,
          role: {
            select: roleSelect,
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// Create User
router.post(
  '/',
  requireAuth,
  requirePermission('canManageUsers'),
  async (req, res, next) => {
    try {
      const data = createUserSchema.parse(req.body);


      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { username: data.username },
            { email: data.email },
            { matricule: data.matricule }
          ],
        },
      });

      if (existing) {
        return res.status(400).json({ message: 'Matricule, username or email already exists' });
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
          roleId: data.roleId,
        },
        select: {
          id: true,
          matricule: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          roleId: true,
          role: {
            select: roleSelect,
          },
          createdAt: true,
        },
      });

      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);

// Update User
router.put(
  '/:id',
  requireAuth,
  async (req: AuthRequest, res, next) => {
    try {
      const userId = parseId(req.params.id);
      const currentUserId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({ message: 'Invalid user id' });
      }

      // Si l'utilisateur modifie un autre compte, il doit avoir la permission canManageUsers
      if (userId !== currentUserId && !req.user?.canManageUsers) {
        return res.status(403).json({ message: 'Forbidden: missing permission canManageUsers' });
      }

      const data = updateUserSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, email: true },
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (data.username !== undefined || data.email !== undefined) {
        const duplicateUser = await prisma.user.findFirst({
          where: {
            id: { not: userId },
            OR: [
              ...(data.username !== undefined ? [{ username: data.username }] : []),
              ...(data.email !== undefined ? [{ email: data.email }] : []),
            ],
          },
          select: { id: true },
        });

        if (duplicateUser) {
          return res.status(400).json({ message: 'Username or email already exists' });
        }
      }


      const updateData: Record<string, unknown> = {};
      if (data.matricule !== undefined) updateData.matricule = data.matricule;
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.username !== undefined) updateData.username = data.username;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.roleId !== undefined) updateData.roleId = data.roleId;
      if (data.password) {
        updateData.passwordHash = await bcrypt.hash(data.password, 10);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          roleId: true,
          role: {
            select: roleSelect,
          },
          updatedAt: true,
        },
      });

      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// Désactiver / réactiver un utilisateur (au lieu de le supprimer)
router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('canManageUsers'),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = parseId(req.params.id);

      if (!userId) {
        return res.status(400).json({ message: 'Invalid user id' });
      }

      // Empêcher de se désactiver soi-même (évite un verrouillage)
      if (userId === Number(req.user?.userId)) {
        return res
          .status(400)
          .json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' });
      }

      const isActive = (req.body ?? {}).isActive;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'Le champ isActive (booléen) est obligatoire.' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
        },
      });

      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);

export default router;