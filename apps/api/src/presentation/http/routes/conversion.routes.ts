import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';

const router = Router();

const allowedConversionTypes = [
  'SALE',
  'APPOINTMENT',
  'REGISTRATION',
  'SUBSCRIPTION',
  'QUOTE_REQUEST',
];

const allowedConversionStatuses = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'REJECTED',
];

function toValidNumber(value: string | number, fieldName: string) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return num;
}

function toOptionalDate(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

function toOptionalDecimal(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  return num;
}

function toOptionalInteger(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }

  return num;
}

function normalizeConversionType(type?: string) {
  return String(type || '')
    .trim()
    .toUpperCase();
}

function normalizeConversionStatus(status?: string) {
  if (!status) return 'CONFIRMED';
  return String(status).trim().toUpperCase();
}

function conversionTypeLabel(type?: string) {
  switch (type) {
    case 'SALE':
      return 'Vente';
    case 'APPOINTMENT':
      return 'Rendez-vous';
    case 'REGISTRATION':
      return 'Inscription';
    case 'SUBSCRIPTION':
      return 'Souscription';
    case 'QUOTE_REQUEST':
      return 'Demande de devis';
    default:
      return type || '—';
  }
}

function conversionStatusLabel(status?: string) {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'CONFIRMED':
      return 'Confirmée';
    case 'CANCELLED':
      return 'Annulée';
    case 'REJECTED':
      return 'Rejetée';
    default:
      return status || '—';
  }
}

// Liste
router.get(
  '/',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req, res, next) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
      const type = typeof req.query.type === 'string' ? req.query.type.trim().toUpperCase() : '';
      const leadId =
        req.query.leadId !== undefined && req.query.leadId !== ''
          ? toValidNumber(String(req.query.leadId), 'leadId')
          : undefined;
      const campaignId =
        req.query.campaignId !== undefined && req.query.campaignId !== ''
          ? toValidNumber(String(req.query.campaignId), 'campaignId')
          : undefined;

      const pageRaw = typeof req.query.page === 'string' ? req.query.page : undefined;
      const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : undefined;

      const hasServerQuery =
        !!search || !!status || !!type || !!leadId || !!campaignId || !!pageRaw || !!limitRaw;

      if (status && !allowedConversionStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Statut invalide pour le filtre.',
        });
      }

      if (type && !allowedConversionTypes.includes(type)) {
        return res.status(400).json({
          message: 'Type invalide pour le filtre.',
        });
      }

      const page = pageRaw ? Number(pageRaw) : 1;
      const limit = limitRaw ? Number(limitRaw) : 10;

      if (
        (pageRaw && (!Number.isInteger(page) || page <= 0)) ||
        (limitRaw && (!Number.isInteger(limit) || limit <= 0))
      ) {
        return res.status(400).json({
          message: 'Paramètres de pagination invalides.',
        });
      }

      const filters: any[] = [];

      if (leadId) {
        filters.push({ leadId });
      }

      if (campaignId) {
        filters.push({ campaignId });
      }

      if (status) {
        filters.push({ status });
      }

      if (type) {
        filters.push({ type });
      }

      if (search) {
        filters.push({
          OR: [
            {
              reference: {
                contains: search,
              },
            },
            {
              notes: {
                contains: search,
              },
            },
            {
              lead: {
                name: {
                  contains: search,
                },
              },
            },
            {
              lead: {
                email: {
                  contains: search,
                },
              },
            },
            {
              campaign: {
                name: {
                  contains: search,
                },
              },
            },
            {
              createdBy: {
                username: {
                  contains: search,
                },
              },
            },
            {
              createdBy: {
                email: {
                  contains: search,
                },
              },
            },
          ],
        });
      }

      const whereClause = filters.length > 0 ? { AND: filters } : undefined;

      if (!hasServerQuery) {
        const conversions = await prisma.conversion.findMany({
          where: whereClause,
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
          orderBy: {
            updatedAt: 'desc',
          },
          take: 100,
        });

        return res.json({ data: conversions });
      }

      const [conversions, total] = await Promise.all([
        prisma.conversion.findMany({
          where: whereClause,
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
          orderBy: {
            updatedAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.conversion.count({
          where: whereClause,
        }),
      ]);

      return res.json({
        data: conversions,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Détail
router.get(
  '/:id',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req, res, next) => {
    try {
      const conversionId = toValidNumber(req.params.id, 'conversionId');

      const conversion = await prisma.conversion.findUnique({
        where: { id: conversionId },
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

      if (!conversion) {
        return res.status(404).json({ message: 'Conversion introuvable' });
      }

      return res.json({
        data: {
          ...conversion,
          leadId: String(conversion.leadId),
          campaignId: String(conversion.campaignId),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Création
router.post(
  '/',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req: AuthRequest, res, next) => {
    try {
      const { leadId, type, status, amount, quantity, reference, notes, conversionDate } = req.body;

      if (!leadId) {
        return res.status(400).json({ message: 'Le lead est obligatoire' });
      }

      if (!type || !String(type).trim()) {
        return res.status(400).json({ message: 'Le type de conversion est obligatoire' });
      }

      const parsedLeadId = toValidNumber(leadId, 'leadId');
      const normalizedType = normalizeConversionType(type);
      const normalizedStatus = normalizeConversionStatus(status);
      const parsedAmount = toOptionalDecimal(amount);
      const parsedQuantity = toOptionalInteger(quantity, 'quantity');
      const parsedConversionDate = toOptionalDate(conversionDate) || new Date();
      const currentUserId = Number(req.user!.userId);

      if (!allowedConversionTypes.includes(normalizedType)) {
        return res.status(400).json({
          message:
            "Type invalide. Valeurs autorisées : 'SALE', 'APPOINTMENT', 'REGISTRATION', 'SUBSCRIPTION', 'QUOTE_REQUEST'.",
        });
      }

      if (!allowedConversionStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          message:
            "Statut invalide. Valeurs autorisées : 'PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED'.",
        });
      }

      const lead = await prisma.lead.findUnique({
        where: { id: parsedLeadId },
        select: {
          id: true,
          name: true,
          status: true,
          campaignId: true,
          convertedAt: true,
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });

      if (!lead) {
        return res.status(404).json({ message: 'Lead introuvable' });
      }

      const createdConversion = await prisma.$transaction(async (tx) => {
        const conversion = await tx.conversion.create({
          data: {
            campaignId: lead.campaignId,
            leadId: lead.id,
            createdById: currentUserId,
            type: normalizedType,
            status: normalizedStatus,
            amount: parsedAmount,
            quantity: parsedQuantity,
            reference: reference ? String(reference).trim() : null,
            notes: notes ? String(notes).trim() : null,
            conversionDate: parsedConversionDate,
          },
        });

        await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: 'CONVERTI',
            convertedAt: parsedConversionDate,
          },
        });

        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            campaignId: lead.campaignId,
            createdById: currentUserId,
            type: 'CONVERSION',
            title: 'Conversion enregistrée',
            description: `Une conversion de type "${conversionTypeLabel(normalizedType)}" a été enregistrée pour le lead "${lead.name}"`,
            oldValue: lead.status,
            newValue: `CONVERTI | ${conversionStatusLabel(normalizedStatus)}`,
          },
        });

        return tx.conversion.findUniqueOrThrow({
          where: { id: conversion.id },
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
      });

      return res.status(201).json({ data: createdConversion });
    } catch (error) {
      next(error);
    }
  }
);

// Mise à jour
router.put(
  '/:id',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req: AuthRequest, res, next) => {
    try {
      const conversionId = toValidNumber(req.params.id, 'conversionId');

      const existingConversion = await prisma.conversion.findUnique({
        where: { id: conversionId },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              campaignId: true,
            },
          },
        },
      });

      if (!existingConversion) {
        return res.status(404).json({ message: 'Conversion introuvable' });
      }

      const { type, status, amount, quantity, reference, notes, conversionDate } = req.body;

      if (!type || !String(type).trim()) {
        return res.status(400).json({ message: 'Le type de conversion est obligatoire' });
      }

      const normalizedType = normalizeConversionType(type);
      const normalizedStatus = normalizeConversionStatus(status);
      const parsedAmount = toOptionalDecimal(amount);
      const parsedQuantity = toOptionalInteger(quantity, 'quantity');
      const parsedConversionDate = toOptionalDate(conversionDate) || existingConversion.conversionDate;
      const currentUserId = Number(req.user!.userId);

      if (!allowedConversionTypes.includes(normalizedType)) {
        return res.status(400).json({
          message:
            "Type invalide. Valeurs autorisées : 'SALE', 'APPOINTMENT', 'REGISTRATION', 'SUBSCRIPTION', 'QUOTE_REQUEST'.",
        });
      }

      if (!allowedConversionStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          message:
            "Statut invalide. Valeurs autorisées : 'PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED'.",
        });
      }

      const updatedConversion = await prisma.$transaction(async (tx) => {
        const conversion = await tx.conversion.update({
          where: { id: conversionId },
          data: {
            type: normalizedType,
            status: normalizedStatus,
            amount: parsedAmount,
            quantity: parsedQuantity,
            reference: reference ? String(reference).trim() : null,
            notes: notes ? String(notes).trim() : null,
            conversionDate: parsedConversionDate,
          },
        });

        await tx.leadActivity.create({
          data: {
            leadId: existingConversion.leadId,
            campaignId: existingConversion.campaignId,
            createdById: currentUserId,
            type: 'CONVERSION',
            title:
              existingConversion.status !== normalizedStatus
                ? 'Conversion mise à jour'
                : 'Détails de conversion mis à jour',
            description: `La conversion du lead "${existingConversion.lead.name}" a été mise à jour`,
            oldValue:
              existingConversion.status !== normalizedStatus
                ? conversionStatusLabel(existingConversion.status)
                : null,
            newValue:
              existingConversion.status !== normalizedStatus
                ? conversionStatusLabel(normalizedStatus)
                : null,
          },
        });

        return tx.conversion.findUniqueOrThrow({
          where: { id: conversion.id },
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
      });

      return res.json({ data: updatedConversion });
    } catch (error) {
      next(error);
    }
  }
);

// Annulation
router.patch(
  '/:id/cancel',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req: AuthRequest, res, next) => {
    try {
      const conversionId = toValidNumber(req.params.id, 'conversionId');
      const currentUserId = Number(req.user!.userId);

      const existingConversion = await prisma.conversion.findUnique({
        where: { id: conversionId },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!existingConversion) {
        return res.status(404).json({ message: 'Conversion introuvable' });
      }

      if (existingConversion.status === 'CANCELLED') {
        return res.status(400).json({ message: 'Cette conversion est déjà annulée' });
      }

      const cancelledConversion = await prisma.$transaction(async (tx) => {
        const conversion = await tx.conversion.update({
          where: { id: conversionId },
          data: {
            status: 'CANCELLED',
          },
        });

        await tx.leadActivity.create({
          data: {
            leadId: existingConversion.leadId,
            campaignId: existingConversion.campaignId,
            createdById: currentUserId,
            type: 'CONVERSION',
            title: 'Conversion annulée',
            description: `La conversion du lead "${existingConversion.lead.name}" a été annulée`,
            oldValue: conversionStatusLabel(existingConversion.status),
            newValue: conversionStatusLabel('CANCELLED'),
          },
        });

        return tx.conversion.findUniqueOrThrow({
          where: { id: conversion.id },
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
      });

      return res.json({ data: cancelledConversion });
    } catch (error) {
      next(error);
    }
  }
);

// Suppression interdite
router.delete(
  '/:id',
  requireAuth,
  requirePermission('canViewLeads'),
  async (_req, res) => {
    return res.status(405).json({
      message: 'La suppression physique des conversions est interdite. Utilisez l’annulation.',
    });
  }
);

export default router;