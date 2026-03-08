import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth } from '../middlewares/auth';

// A generic CRUD generator for simple resources
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

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const items = await model.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 100, // Safety limit
      });
      res.json({ data: items });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requireAuth, async (req, res, next) => {
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

  router.post('/', requireAuth, async (req: any, res, next) => {
    try {
      const data = { ...req.body };

      // Ajout automatique de createdById pour les modèles qui en ont besoin
      if (
        ['objective', 'channel', 'targetAudience', 'task', 'lead', 'expense'].includes(modelName) &&
        !data.createdById
      ) {
        data.createdById = req.user.userId;
      }

      const item = await model.create({
        data,
      });

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', requireAuth, async (req, res, next) => {
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

  router.delete('/:id', requireAuth, async (req, res, next) => {
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