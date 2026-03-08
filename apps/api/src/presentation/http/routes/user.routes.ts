import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth, requireRole } from '../middlewares/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.coerce.number().int().positive(),
});

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roleId: z.coerce.number().int().positive().optional(),
});

const parseId = (id: string) => {
  const numericId = Number(id);
  return Number.isNaN(numericId) ? id : numericId;
};

// List Users
router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            canViewAllCampaigns: true,
            canEditAllCampaigns: true,
            canDeleteAllCampaigns: true,
            canCreateCampaign: true,
            canManageTasks: true,
            canAssignTasks: true,
            canManageCampaignArticles: true,
            canManageAttachments: true,
            canManageUsers: true,
            canManageRoles: true,
            canExportCampaign: true,
          },
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
});

// Get User
router.get('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseId(req.params.id) },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            canViewAllCampaigns: true,
            canEditAllCampaigns: true,
            canDeleteAllCampaigns: true,
            canCreateCampaign: true,
            canManageTasks: true,
            canAssignTasks: true,
            canManageCampaignArticles: true,
            canManageAttachments: true,
            canManageUsers: true,
            canManageRoles: true,
            canExportCampaign: true,
          },
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
});

// Create User
router.post('/', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: data.username }, { email: data.email }],
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        roleId: data.roleId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            canViewAllCampaigns: true,
            canEditAllCampaigns: true,
            canDeleteAllCampaigns: true,
            canCreateCampaign: true,
            canManageTasks: true,
            canAssignTasks: true,
            canManageCampaignArticles: true,
            canManageAttachments: true,
            canManageUsers: true,
            canManageRoles: true,
            canExportCampaign: true,
          },
        },
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Update User
router.put('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const updateData: any = {
      username: data.username,
      email: data.email,
      roleId: data.roleId,
    };

    if (data.password && data.password.trim()) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseId(req.params.id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            canViewAllCampaigns: true,
            canEditAllCampaigns: true,
            canDeleteAllCampaigns: true,
            canCreateCampaign: true,
            canManageTasks: true,
            canAssignTasks: true,
            canManageCampaignArticles: true,
            canManageAttachments: true,
            canManageUsers: true,
            canManageRoles: true,
            canExportCampaign: true,
          },
        },
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Delete User
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), async (req, res, next) => {
  try {
    await prisma.user.delete({
      where: { id: parseId(req.params.id) },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;