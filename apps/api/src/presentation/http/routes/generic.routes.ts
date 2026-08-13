import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import {
  requirePermission,
  requireAnyPermission,
  type PermissionKey,
} from '../middlewares/permissions';

const modelPermissions: Partial<Record<string, PermissionKey>> = {
  task: 'canViewTasks',
  lead: 'canViewLeads',
  expense: 'canViewExpenses',
  user: 'canManageUsers',
  role: 'canManageRoles',
};

const modelAnyPermissions: Partial<Record<string, PermissionKey[]>> = {
  objective: ['canCreateCampaign', 'canViewObjectives'],
  channel: ['canCreateCampaign', 'canViewSettings'],
  targetAudience: ['canCreateCampaign', 'canViewSettings'],
};

export default (modelName: string) => {
  const router = Router();
  const model = (prisma as any)[modelName];

  if (!model) {
    throw new Error(`Model ${modelName} not found in Prisma client`);
  }

  const parseId = (id: string) => {
    const numericId = Number(id);
    return Number.isNaN(numericId) ? id : numericId;
  };

  const permission = modelPermissions[modelName];
  const anyPermissions = modelAnyPermissions[modelName];

  const withModelPermission = anyPermissions
    ? [requireAuth, requireAnyPermission(anyPermissions)]
    : permission
      ? [requireAuth, requirePermission(permission)]
      : [requireAuth];

  router.get('/', ...withModelPermission, async (_req, res, next) => {
    try {
      const items = await model.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });

      res.json({ data: items });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', ...withModelPermission, async (req, res, next) => {
    try {
      const item = await model.findUnique({
        where: { id: parseId(req.params.id) },
      });

      if (!item) {
        return res.status(404).json({ message: 'Not found' });
      }

      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', ...withModelPermission, async (req: AuthRequest, res, next) => {
    try {
      const data = { ...req.body };

      if (
        ['objective', 'channel', 'targetAudience', 'task', 'lead', 'expense'].includes(
          modelName
        ) &&
        !data.createdById
      ) {
        data.createdById = Number(req.user!.userId);
      }

      const item = await model.create({
        data,
      });

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', ...withModelPermission, async (req, res, next) => {
    try {
      const item = await model.update({
        where: { id: parseId(req.params.id) },
        data: req.body,
      });

      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', ...withModelPermission, async (req, res, next) => {
    try {
      await model.delete({
        where: { id: parseId(req.params.id) },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};