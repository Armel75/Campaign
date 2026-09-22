import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import { parseDateRange, toPrismaDateFilter } from '../../../infrastructure/utils/dateRange';
import { parseIncludeList } from '../../../infrastructure/utils/queryParams';
import { buildMonthlyBuckets, parseTzOffsetMinutes } from '../../../infrastructure/utils/monthlyBuckets';
import {
  parseSheet,
  detectColumnMap,
  type ColumnCandidate,
  type ColumnDetectionResult,
} from '../../../services/leadImportMapper.service';

const router = Router();
const prismaAny = prisma as any;

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

const allowedLeadStatuses = [
  'NOUVEAU',
  'CONTACTE',
  'QUALIFIE',
  'CONVERTI',
  'PERDU',
  'INVALIDE',
];

function normalizeLeadStatus(status?: string) {
  if (!status) return 'NOUVEAU';
  return String(status).trim().toUpperCase();
}

function leadStatusLabel(status?: string) {
  switch (status) {
    case 'NOUVEAU':
      return 'Nouveau';
    case 'CONTACTE':
      return 'Contacté';
    case 'QUALIFIE':
      return 'Qualifié';
    case 'CONVERTI':
      return 'Converti';
    case 'PERDU':
      return 'Perdu';
    case 'INVALIDE':
      return 'Invalide';
    default:
      return status || '—';
  }
}

/**
 * Parse un mapping fourni par l'UI ({ champ: en-tête }) en ne gardant que les
 * valeurs correspondant à de vraies colonnes du fichier. Retourne null si absent.
 */
function parseMappingOverride(
  raw: unknown,
  headers: string[],
): Record<string, string> | null {
  if (raw === undefined || raw === null || raw === '') return null;
  let parsed: Record<string, unknown>;
  try {
    parsed =
      typeof raw === 'string'
        ? (JSON.parse(raw) as Record<string, unknown>)
        : (raw as Record<string, unknown>);
  } catch {
    return null;
  }
  const headerSet = new Set(headers);
  const out: Record<string, string> = {};
  for (const [field, header] of Object.entries(parsed)) {
    if (typeof header === 'string' && header && headerSet.has(header)) {
      out[field] = header;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

// ─── Import en masse des leads (Excel/CSV) ───
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
});

const LEAD_STATUS_LABEL_TO_CODE: Record<string, string> = {
  NOUVEAU: 'NOUVEAU',
  CONTACTE: 'CONTACTE',
  QUALIFIE: 'QUALIFIE',
  CONVERTI: 'CONVERTI',
  PERDU: 'PERDU',
  INVALIDE: 'INVALIDE',
  Nouveau: 'NOUVEAU',
  Contacté: 'CONTACTE',
  Contacte: 'CONTACTE',
  Qualifié: 'QUALIFIE',
  Qualifie: 'QUALIFIE',
  Converti: 'CONVERTI',
  Perdu: 'PERDU',
  Invalide: 'INVALIDE',
};

// La détection intelligente des colonnes (en-têtes + contenu + validation BDD)
// est déléguée au service leadImportMapper.service.ts.

// List
router.get(
  '/',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req, res, next) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      const pageRaw = typeof req.query.page === 'string' ? req.query.page : undefined;
      const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : undefined;
      const withoutCampaign =
        String(req.query.withoutCampaign) === '1' ||
        String(req.query.withoutCampaign) === 'true';

      // Bornes de période (facultatives) appliquées à la date de création du lead
      const createdRange = parseDateRange(req.query as Record<string, unknown>);
      if (createdRange.error) {
        return res.status(400).json({ message: createdRange.error });
      }
      const createdAtFilter = toPrismaDateFilter(createdRange);

      // Agrégations facultatives (`?include=monthly`)
      const includeList = parseIncludeList(req.query.include);

      const hasServerQuery =
        !!search || !!status || !!pageRaw || !!limitRaw || withoutCampaign || !!createdAtFilter ||
        includeList.length > 0;

      if (status && !allowedLeadStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Statut invalide pour le filtre.',
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

      if (status) {
        filters.push({ status });
      }

      if (withoutCampaign) {
        filters.push({ campaignId: null });
      }

      if (createdAtFilter) {
        filters.push({ createdAt: createdAtFilter });
      }

      if (search) {
        filters.push({
          OR: [
            {
              name: {
                contains: search,
              },
            },
            {
              email: {
                contains: search,
              },
            },
            {
              phone: {
                contains: search,
              },
            },
            {
              notes: {
                contains: search,
              },
            },
            {
              lostReason: {
                contains: search,
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
              assignedTo: {
                username: {
                  contains: search,
                },
              },
            },
            {
              assignedTo: {
                name: {
                  contains: search,
                },
              },
            },
            {
              assignedTo: {
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
        const leads = await prisma.lead.findMany({
          where: whereClause,
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                glpiUserId: true,
                username: true,
                name: true,
                email: true,
                isActive: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            _count: {
              select: {
                tasks: true,
                conversions: true,
                activities: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 100,
        } as any);

        return res.json({ data: leads });
      }

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: whereClause,
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                glpiUserId: true,
                username: true,
                name: true,
                email: true,
                isActive: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            _count: {
              select: {
                tasks: true,
                conversions: true,
                activities: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        } as any),
        prisma.lead.count({
          where: whereClause,
        }),
      ]);

      // Tendance mensuelle exacte : une seule colonne lue, aucun plafond de lignes
      const monthly = includeList.includes('monthly')
        ? buildMonthlyBuckets(
            (
              await prisma.lead.findMany({
                where: whereClause,
                select: { createdAt: true },
              })
            ).map((row) => row.createdAt),
            parseTzOffsetMinutes(req.query.tzOffset),
          )
        : undefined;

      return res.json({
        data: leads,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        ...(monthly ? { monthly } : {}),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get one
router.get(
  '/:id',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req, res, next) => {
    try {
      const leadId = toValidNumber(req.params.id, 'leadId');

      const lead: any = await prisma.lead.findUnique({
        where: {
          id: leadId,
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              glpiUserId: true,
              username: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          conversions: {
            select: {
              id: true,
              type: true,
              status: true,
              amount: true,
              quantity: true,
              conversionDate: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          activities: {
            select: {
              id: true,
              type: true,
              title: true,
              description: true,
              oldValue: true,
              newValue: true,
              activityDate: true,
              createdBy: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      } as any);

      if (!lead) {
        return res.status(404).json({ message: 'Lead introuvable' });
      }

      res.json({
        data: {
          ...lead,
          campaignId: lead.campaignId ? String(lead.campaignId) : '',
          assignedToId: lead.assignedToId ? String(lead.assignedToId) : '',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create
router.post(
  '/',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req: AuthRequest, res, next) => {
    try {
      const {
        campaignId,
        name,
        email,
        phone,
        status,
        assignedToId,
        notes,
        nextFollowUpAt,
        lastContactAt,
        convertedAt,
        lostReason,
      } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ message: 'Le nom est obligatoire' });
      }

      const normalizedStatus = normalizeLeadStatus(status);
      const currentUserId = Number(req.user!.userId);

      if (!allowedLeadStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          message:
            "Statut invalide. Valeurs autorisées : 'NOUVEAU', 'CONTACTE', 'QUALIFIE', 'CONVERTI', 'PERDU', 'INVALIDE'.",
        });
      }

      // Campagne facultative : si fournie, elle doit exister en base.
      let parsedCampaignId: number | null = null;
      if (campaignId !== undefined && campaignId !== null && campaignId !== '') {
        parsedCampaignId = toValidNumber(campaignId, 'campaignId');
        const campaign = await prisma.campaign.findUnique({
          where: { id: parsedCampaignId },
          select: { id: true, name: true },
        });
        if (!campaign) {
          return res.status(404).json({ message: 'Campagne introuvable' });
        }
      }

      const parsedAssignedToId =
        assignedToId !== undefined && assignedToId !== null && assignedToId !== ''
          ? toValidNumber(assignedToId, 'assignedToId')
          : null;

      if (parsedAssignedToId) {
        const glpiUser = await prisma.glpiUser.findUnique({
          where: { id: parsedAssignedToId },
          select: { id: true, isActive: true },
        });

        if (!glpiUser) {
          return res.status(404).json({ message: 'Utilisateur GLPI introuvable' });
        }
      }

      const lead = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;

        const createdLead: any = await tx.lead.create({
          data: {
            campaignId: parsedCampaignId,
            createdById: currentUserId,
            name: String(name).trim(),
            email: email ? String(email).trim() : null,
            phone: phone ? String(phone).trim() : null,
            status: normalizedStatus,
            assignedToId: parsedAssignedToId,
            notes: notes ? String(notes).trim() : null,
            nextFollowUpAt: toOptionalDate(nextFollowUpAt),
            lastContactAt: toOptionalDate(lastContactAt),
            convertedAt: toOptionalDate(convertedAt),
            lostReason: lostReason ? String(lostReason).trim() : null,
          },
        } as any);

        await txAny.leadActivity.create({
          data: {
            leadId: createdLead.id,
            campaignId: createdLead.campaignId,
            createdById: currentUserId,
            type: 'CREATION',
            title: 'Lead créé',
            description: `Création du lead "${createdLead.name}"`,
            newValue: leadStatusLabel(createdLead.status),
          },
        });

        return tx.lead.findUniqueOrThrow({
          where: { id: createdLead.id },
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                glpiUserId: true,
                username: true,
                name: true,
                email: true,
                isActive: true,
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
        } as any);
      });

      res.status(201).json({ data: lead });
    } catch (error) {
      next(error);
    }
  }
);

// Update
router.put(
  '/:id',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req: AuthRequest, res, next) => {
    try {
      const leadId = toValidNumber(req.params.id, 'leadId');

      const existingLead: any = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          assignedTo: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
            },
          },
        },
      } as any);

      if (!existingLead) {
        return res.status(404).json({ message: 'Lead introuvable' });
      }

      const {
        campaignId,
        name,
        email,
        phone,
        status,
        assignedToId,
        notes,
        nextFollowUpAt,
        lastContactAt,
        convertedAt,
        lostReason,
      } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ message: 'Le nom est obligatoire' });
      }

      const normalizedStatus = normalizeLeadStatus(status);
      const currentUserId = Number(req.user!.userId);

      if (!allowedLeadStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          message:
            "Statut invalide. Valeurs autorisées : 'NOUVEAU', 'CONTACTE', 'QUALIFIE', 'CONVERTI', 'PERDU', 'INVALIDE'.",
        });
      }

      // Campagne facultative : si fournie, elle doit exister en base.
      let parsedCampaignId: number | null = null;
      if (campaignId !== undefined && campaignId !== null && campaignId !== '') {
        parsedCampaignId = toValidNumber(campaignId, 'campaignId');
        const campaign = await prisma.campaign.findUnique({
          where: { id: parsedCampaignId },
          select: { id: true, name: true },
        });
        if (!campaign) {
          return res.status(404).json({ message: 'Campagne introuvable' });
        }
      }

      const parsedAssignedToId =
        assignedToId !== undefined && assignedToId !== null && assignedToId !== ''
          ? toValidNumber(assignedToId, 'assignedToId')
          : null;

      if (parsedAssignedToId) {
        const glpiUser = await prisma.glpiUser.findUnique({
          where: { id: parsedAssignedToId },
          select: { id: true, isActive: true },
        });

        if (!glpiUser) {
          return res.status(404).json({ message: 'Utilisateur GLPI introuvable' });
        }
      }

      const updatedLead = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;

        const lead: any = await tx.lead.update({
          where: { id: leadId },
          data: {
            campaignId: parsedCampaignId,
            name: String(name).trim(),
            email: email ? String(email).trim() : null,
            phone: phone ? String(phone).trim() : null,
            status: normalizedStatus,
            assignedToId: parsedAssignedToId,
            notes: notes ? String(notes).trim() : null,
            nextFollowUpAt: toOptionalDate(nextFollowUpAt),
            lastContactAt: toOptionalDate(lastContactAt),
            convertedAt: toOptionalDate(convertedAt),
            lostReason: lostReason ? String(lostReason).trim() : null,
          },
        } as any);

        if (existingLead.status !== normalizedStatus) {
          await txAny.leadActivity.create({
            data: {
              leadId: lead.id,
              campaignId: lead.campaignId,
              createdById: currentUserId,
              type:
                normalizedStatus === 'CONVERTI'
                  ? 'CONVERSION'
                  : normalizedStatus === 'PERDU'
                    ? 'PERDU'
                    : 'CHANGEMENT_STATUT',
              title:
                normalizedStatus === 'CONVERTI'
                  ? 'Lead converti'
                  : normalizedStatus === 'PERDU'
                    ? 'Lead perdu'
                    : 'Changement de statut',
              description: `Le statut du lead "${lead.name}" a été modifié`,
              oldValue: leadStatusLabel(existingLead.status),
              newValue: leadStatusLabel(normalizedStatus),
            },
          });
        }

        if (existingLead.status !== 'CONVERTI' && normalizedStatus === 'CONVERTI') {
          const conversionDate = toOptionalDate(convertedAt) || lead.convertedAt || new Date();

          const existingConversion = await tx.conversion.findFirst({
            where: {
              leadId: lead.id,
              campaignId: lead.campaignId,
              type: 'SALE',
            },
            select: {
              id: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          } as any);

          if (!existingConversion) {
            await tx.conversion.create({
              data: {
                campaignId: lead.campaignId,
                leadId: lead.id,
                createdById: currentUserId,
                type: 'SALE',
                status: 'CONFIRMED',
                conversionDate,
                notes: `Conversion créée automatiquement suite au passage du lead "${lead.name}" au statut CONVERTI.`,
              },
            } as any);
          }

          if (!lead.convertedAt) {
            await tx.lead.update({
              where: { id: lead.id },
              data: {
                convertedAt: conversionDate,
              },
            } as any);
          }
        }

        if ((existingLead.assignedToId || null) !== (parsedAssignedToId || null)) {
          const previousAssignee =
            existingLead.assignedTo?.username ||
            existingLead.assignedTo?.name ||
            existingLead.assignedTo?.email ||
            'Non assigné';

          const newAssignee = parsedAssignedToId
            ? await tx.glpiUser.findUnique({
                where: { id: parsedAssignedToId },
                select: {
                  username: true,
                  name: true,
                  email: true,
                },
              })
            : null;

          const newAssigneeLabel =
            newAssignee?.username ||
            newAssignee?.name ||
            newAssignee?.email ||
            'Non assigné';

          await txAny.leadActivity.create({
            data: {
              leadId: lead.id,
              campaignId: lead.campaignId,
              createdById: currentUserId,
              type: 'REASSIGNATION',
              title: 'Réassignation du lead',
              description: `L’assignation du lead "${lead.name}" a été modifiée`,
              oldValue: previousAssignee,
              newValue: newAssigneeLabel,
            },
          });
        }

        if ((existingLead.notes || '') !== (notes ? String(notes).trim() : '')) {
          await txAny.leadActivity.create({
            data: {
              leadId: lead.id,
              campaignId: lead.campaignId,
              createdById: currentUserId,
              type: 'NOTE',
              title: 'Mise à jour des notes',
              description: `Les notes du lead "${lead.name}" ont été modifiées`,
              oldValue: existingLead.notes || undefined,
              newValue: notes ? String(notes).trim() : undefined,
            },
          });
        }

        return tx.lead.findUniqueOrThrow({
          where: { id: lead.id },
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                glpiUserId: true,
                username: true,
                name: true,
                email: true,
                isActive: true,
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
        } as any);
      });

      res.json({ data: updatedLead });
    } catch (error) {
      next(error);
    }
  }
);

// Delete
router.delete(
  '/:id',
  requireAuth,
  requirePermission('canViewLeads'),
  async (req, res, next) => {
    try {
      const leadId = toValidNumber(req.params.id, 'leadId');

      const existingLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true },
      });

      if (!existingLead) {
        return res.status(404).json({ message: 'Lead introuvable' });
      }

      await prisma.lead.delete({
        where: { id: leadId },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Import en masse des leads depuis un fichier Excel/CSV
// `?dryRun=true` = aperçu (validation) sans création
router.post(
  '/import',
  requireAuth,
  requirePermission('canViewLeads'),
  importUpload.single('file'),
  async (req: AuthRequest, res, next) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ message: 'Aucun fichier fourni (champ "file").' });
      }

      const dryRun = String(req.query.dryRun) === 'true';
      const currentUserId = Number(req.user!.userId);
      const campaignCache = new Map<string, { id: number; name: string }>();
      const glpiCache = new Map<string, { id: number }>();

      let headers: string[];
      let rows: Record<string, any>[];
      let headerRowNumber = 1;
      try {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('Fichier vide');
        const parsed = parseSheet(workbook.Sheets[sheetName]);
        headers = parsed.headers;
        rows = parsed.rows;
        headerRowNumber = parsed.headerRowNumber;
      } catch {
        return res
          .status(400)
          .json({ message: 'Fichier illisible : formats acceptés .xlsx et .csv' });
      }

      if (!rows || rows.length === 0) {
        return res
          .status(400)
          .json({ message: 'Le fichier ne contient aucune ligne de données.' });
      }

      if (rows.length > 5000) {
        return res
          .status(400)
          .json({ message: 'Trop de lignes (maximum 5000 par import).' });
      }

      // ── Résolveurs BDD pour la validation croisée (détection campagne / GLPI) ──
      const resolveCampaignIds = async (
        values: string[],
      ): Promise<Record<string, number>> => {
        const result: Record<string, number> = {};
        const numericIds: number[] = [];
        const names: string[] = [];
        for (const v of values) {
          if (/^\d+$/.test(v)) numericIds.push(Number(v));
          else names.push(v);
        }
        if (names.length > 0) {
          const found = await prisma.campaign.findMany({
            where: { name: { in: names } },
            select: { id: true, name: true },
          });
          for (const c of found) result[c.name] = c.id;
        }
        if (numericIds.length > 0) {
          const found = await prisma.campaign.findMany({
            where: { id: { in: numericIds } },
            select: { id: true },
          });
          for (const c of found) result[String(c.id)] = c.id;
        }
        return result;
      };

      const resolveGlpiUserIds = async (
        values: string[],
      ): Promise<Record<string, number>> => {
        const result: Record<string, number> = {};
        const numericIds: number[] = [];
        const usernames: string[] = [];
        for (const v of values) {
          if (/^\d+$/.test(v)) numericIds.push(Number(v));
          else usernames.push(v);
        }
        if (usernames.length > 0) {
          const found = await prisma.glpiUser.findMany({
            where: { username: { in: usernames } },
            select: { id: true, username: true },
          });
          for (const u of found) {
            if (u.username) result[u.username] = u.id;
          }
        }
        if (numericIds.length > 0) {
          const found = await prisma.glpiUser.findMany({
            where: { id: { in: numericIds } },
            select: { id: true },
          });
          for (const u of found) result[String(u.id)] = u.id;
        }
        return result;
      };

      // ── Détection intelligente des colonnes ──
      // L'UI peut fournir un mapping explicite (colonnes source → champs).
      // Sinon, le moteur combine en-têtes + contenu + validation BDD.
      const providedMapping = parseMappingOverride(req.body?.mapping, headers);

      let colMap: Record<string, string | undefined> = {};
      let confidence: Record<string, number> = {};
      let candidates: Record<string, ColumnCandidate[]> = {};

      if (providedMapping) {
        colMap = providedMapping;
      } else {
        const detection: ColumnDetectionResult = await detectColumnMap(headers, rows, {
          resolveCampaignIds,
          resolveGlpiUserIds,
        });
        colMap = detection.colMap as Record<string, string | undefined>;
        confidence = detection.confidence as Record<string, number>;
        candidates = detection.candidates as Record<string, ColumnCandidate[]>;
      }

      // ── Campagne par défaut (fallback si la colonne Campagne est absente) ──
      const defaultCampaignIdRaw = String(req.body?.defaultCampaignId ?? '').trim();
      let defaultCampaign: { id: number; name: string } | null = null;
      if (defaultCampaignIdRaw) {
        const id = toValidNumber(defaultCampaignIdRaw, 'defaultCampaignId');
        defaultCampaign = await prisma.campaign.findUnique({
          where: { id },
          select: { id: true, name: true },
        });
        if (!defaultCampaign) {
          return res.status(400).json({ message: 'Campagne par défaut introuvable.' });
        }
      }

      if (!colMap.name) {
        return res.status(400).json({
          message:
            'Colonne "Nom" introuvable. Impossible d\'importer des leads sans nom.',
        });
      }

      const resolveCampaign = async (ref: string) => {
        const key = String(ref).trim();
        if (!key) return defaultCampaign;
        if (campaignCache.has(key)) return campaignCache.get(key)!;
        let campaign: { id: number; name: string } | null = null;
        if (/^\d+$/.test(key)) {
          campaign = await prisma.campaign.findUnique({
            where: { id: Number(key) },
            select: { id: true, name: true },
          });
        }
        if (!campaign) {
          campaign = await prisma.campaign.findFirst({
            where: { name: key },
            select: { id: true, name: true },
          });
        }
        if (campaign) campaignCache.set(key, campaign);
        return campaign;
      };

      const resolveGlpiUser = async (ref: string) => {
        const key = String(ref).trim();
        if (!key) return null;
        if (glpiCache.has(key)) return glpiCache.get(key)!;
        let user: { id: number } | null = null;
        if (/^\d+$/.test(key)) {
          user = await prisma.glpiUser.findUnique({
            where: { id: Number(key) },
            select: { id: true },
          });
        }
        if (!user) {
          user = await prisma.glpiUser.findFirst({
            where: { username: key },
            select: { id: true },
          });
        }
        if (user) glpiCache.set(key, user);
        return user;
      };

      const fieldLabels: Array<[string, string]> = [
        ['campaign', 'Campagne'],
        ['name', 'Nom'],
        ['email', 'Email'],
        ['phone', 'Téléphone'],
        ['status', 'Statut'],
        ['assignedTo', 'Utilisateur GLPI'],
        ['notes', 'Notes'],
      ];

      // Valide une ligne : résout campagne/statut/GLPI, vérifie les doublons.
      // `db` = client prisma (dry-run) ou transaction (import réel).
      const validateRow = async (
        row: Record<string, any>,
        rowNumber: number,
        db: any,
      ): Promise<
        | {
            ok: true;
            duplicate: boolean;
            data: {
              name: string;
              campaignId: number | null;
              email: string | null;
              phone: string | null;
              status: string;
              assignedToId: number | null;
              notes: string | null;
            };
          }
        | { ok: false; message: string }
      > => {
        const cell = (field: string) => {
          const header = colMap[field];
          if (!header) return '';
          const v = row[header];
          return v === undefined || v === null ? '' : String(v).trim();
        };

        const name = cell('name');
        if (!name) return { ok: false, message: 'Nom manquant' };

        // Campagne facultative : cellule vide → sans campagne (ou campagne par
        // défaut). Valeur fournie mais inconnue → erreur (pas d'import silencieux).
        const campaignRef = cell('campaign');
        let campaignId: number | null = null;
        if (campaignRef) {
          const campaign = await resolveCampaign(campaignRef);
          if (!campaign) {
            return { ok: false, message: `Campagne introuvable : "${campaignRef}"` };
          }
          campaignId = campaign.id;
        } else if (defaultCampaign) {
          campaignId = defaultCampaign.id;
        }

        const statusRaw = cell('status') || 'NOUVEAU';
        const normalizedStatus =
          LEAD_STATUS_LABEL_TO_CODE[statusRaw] ??
          LEAD_STATUS_LABEL_TO_CODE[String(statusRaw).toUpperCase()];
        if (!normalizedStatus || !allowedLeadStatuses.includes(normalizedStatus)) {
          return { ok: false, message: `Statut invalide : "${statusRaw}"` };
        }

        const assignedToRef = cell('assignedTo');
        let assignedToId: number | null = null;
        if (assignedToRef) {
          const glpiUser = await resolveGlpiUser(assignedToRef);
          if (!glpiUser) {
            return {
              ok: false,
              message: `Utilisateur GLPI introuvable : "${assignedToRef}"`,
            };
          }
          assignedToId = glpiUser.id;
        }

        const email = cell('email');
        const phone = cell('phone');
        const notes = cell('notes');

        const data = {
          name,
          campaignId,
          email: email || null,
          phone: phone || null,
          status: normalizedStatus,
          assignedToId,
          notes: notes || null,
        };

        // Anti-doublon : même email OU même téléphone dans la même campagne
        const dupFilters: any[] = [];
        if (email) dupFilters.push({ email });
        if (phone) dupFilters.push({ phone });
        if (dupFilters.length > 0) {
          const existing = await db.lead.findFirst({
            where: { campaignId, OR: dupFilters },
            select: { id: true },
          });
          if (existing) return { ok: true, duplicate: true, data };
        }

        return { ok: true, duplicate: false, data };
      };

      // Aperçu : 8 premières lignes telles que détectées
      const preview = rows.slice(0, 8).map((row, i) => ({
        row: headerRowNumber + 1 + i,
        values: Object.fromEntries(
          fieldLabels.map(([field, label]) => {
            if (field === 'campaign' && !colMap.campaign) {
              return [label, defaultCampaign?.name ?? ''];
            }
            const header = colMap[field];
            const v = header ? row[header] : '';
            return [label, v === undefined || v === null ? '' : String(v).trim()];
          }),
        ),
      }));

      // ─── MODE APERÇU (dry-run) : validation uniquement, aucune création ───
      if (dryRun) {
        let valid = 0;
        let skipped = 0;
        const errors: Array<{ row: number; message: string }> = [];
        for (let i = 0; i < rows.length; i++) {
          const result = await validateRow(rows[i], headerRowNumber + 1 + i, prisma);
          if (!result.ok) {
            errors.push({ row: headerRowNumber + 1 + i, message: result.message });
          } else if (result.duplicate) skipped += 1;
          else valid += 1;
        }

        return res.status(200).json({
          data: {
            dryRun: true,
            total: rows.length,
            valid,
            skipped,
            errors,
            columns: {
              detected: Object.entries(colMap).map(([field, header]) => ({
                field,
                header,
              })),
              missingRequired: ['name', 'campaign'].filter((f) => !colMap[f]),
              confidence,
              candidates,
              headers,
              headerRowNumber,
              campaignRequired: !colMap.campaign && !defaultCampaign,
            },
            preview,
          },
        });
      }

      // ─── IMPORT RÉEL ───
      const result = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;
        let created = 0;
        let skipped = 0;
        const errors: Array<{ row: number; message: string }> = [];

        for (let i = 0; i < rows.length; i++) {
          const rowNumber = headerRowNumber + 1 + i;
          const validated = await validateRow(rows[i], rowNumber, txAny);

          if (!validated.ok) {
            errors.push({ row: rowNumber, message: validated.message });
            continue;
          }

          if (validated.duplicate) {
            skipped += 1;
            continue;
          }

          const createdLead: any = await txAny.lead.create({
            data: {
              ...validated.data,
              createdById: currentUserId,
            },
          });

          await txAny.leadActivity.create({
            data: {
              leadId: createdLead.id,
              campaignId: createdLead.campaignId,
              createdById: currentUserId,
              type: 'CREATION',
              title: 'Lead créé (import)',
              description: `Création du lead "${createdLead.name}" (import en masse)`,
              newValue: leadStatusLabel(createdLead.status),
            },
          });

          created += 1;
        }

        return { created, skipped, errors };
      });

      res.status(200).json({
        data: {
          dryRun: false,
          total: rows.length,
          created: result.created,
          skipped: result.skipped,
          errors: result.errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;