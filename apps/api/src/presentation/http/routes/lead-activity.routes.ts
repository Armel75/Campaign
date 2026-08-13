import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';

const router = Router();

function toValidNumber(value: string | number, fieldName: string) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return num;
}

// Liste des activités avec filtres facultatifs
router.get(
  '/',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req, res, next) => {
    try {
      const leadId =
        req.query.leadId !== undefined && req.query.leadId !== ''
          ? toValidNumber(String(req.query.leadId), 'leadId')
          : undefined;

      const campaignId =
        req.query.campaignId !== undefined && req.query.campaignId !== ''
          ? toValidNumber(String(req.query.campaignId), 'campaignId')
          : undefined;

      const type =
        req.query.type !== undefined && req.query.type !== ''
          ? String(req.query.type).trim().toUpperCase()
          : undefined;

      const activities = await prisma.leadActivity.findMany({
        where: {
          ...(leadId ? { leadId } : {}),
          ...(campaignId ? { campaignId } : {}),
          ...(type ? { type } : {}),
        },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: [
          { activityDate: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 300,
      });

      res.json({ data: activities });
    } catch (error) {
      next(error);
    }
  }
);

// Détail d’une activité
router.get(
  '/:id',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req, res, next) => {
    try {
      const activityId = toValidNumber(req.params.id, 'activityId');

      const activity = await prisma.leadActivity.findUnique({
        where: { id: activityId },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      if (!activity) {
        return res.status(404).json({ message: 'Activité introuvable' });
      }

      res.json({ data: activity });
    } catch (error) {
      next(error);
    }
  }
);

export default router;