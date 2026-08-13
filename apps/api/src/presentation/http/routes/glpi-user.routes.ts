import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';

const router = Router();

const parseId = (id: string): number => {
  const numericId = Number(id);
  return numericId;
};

// Liste des utilisateurs GLPI actifs
router.get(
  '/',
  requireAuth,
  requirePermission('canViewTasks'),
  async (_req, res, next) => {
    try {
      const glpiUsers = await prisma.glpiUser.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          glpiUserId: true,
          name: true,
          username: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { username: 'asc' },
          { name: 'asc' },
        ],
      });

      res.json({ data: glpiUsers });
    } catch (error) {
      next(error);
    }
  }
);

// Détail d’un utilisateur GLPI
router.get(
  '/:id',
  requireAuth,
  requirePermission('canViewTasks'),
  async (req, res, next) => {
    try {
      const glpiUser = await prisma.glpiUser.findUnique({
        where: {
          id: parseId(req.params.id),
        },
        select: {
          id: true,
          glpiUserId: true,
          name: true,
          username: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!glpiUser) {
        return res.status(404).json({ message: 'Utilisateur GLPI introuvable' });
      }

      res.json({ data: glpiUser });
    } catch (error) {
      next(error);
    }
  }
);

export default router;