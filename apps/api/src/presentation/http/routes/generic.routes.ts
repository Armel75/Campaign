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
        where: { id: req.params.id },
      });
      if (!item) return res.status(404).json({ message: 'Not found' });
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requireAuth, async (req, res, next) => {
    try {
      // Basic audit fields if they exist in schema but not in body
      const data = { ...req.body };
      // If model has createdById and it's missing, add it
      // Note: This is a simplification. Real generic CRUD needs metadata about fields.
      
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
        where: { id: req.params.id },
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
        where: { id: req.params.id },
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
