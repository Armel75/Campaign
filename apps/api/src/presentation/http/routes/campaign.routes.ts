import { Router, NextFunction } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  searchArticlesInCatalog,
  testArticleCatalogConnection,
  browseArticlesInCatalog,
} from '../../../services/articleCatalog.service';
import { ArticleFamilySyncService } from '../../../services/articleFamilySync.service';
import {
  getSalesAmountByArticle,
  getUnitPriceByArticle,
  getDistinctClientCountByArticle,
  ArticleCodeRef,
} from '../../../services/x3Sales.service';
import { getCurrentUserWithRole } from '../../../services/user.service';
import {
  getCampaignRoiSummary,
  getCampaignRoiDashboardSummary,
} from '../../../services/campaignRoi.service';
import { getStrategicDashboardSummary } from '../../../services/campaignStrategic.service';
import {
  getProfitabilityReport,
} from '../../../services/campaignProfitability.service';
import { exportProfitabilityToExcel } from '../../../services/campaignProfitabilityExport.service';
import {
  CAMPAIGN_UPLOADS_DIR,
  ensureUploadsDirectories,
  resolveUploadFilePath,
} from '../../../infrastructure/files/uploads';

const router = Router();

type CurrentUserWithRole = {
  id: number;
  role?: {
    canViewAllCampaigns?: boolean;
    canEditAllCampaigns?: boolean;
    canDeleteAllCampaigns?: boolean;
    canCreateCampaign?: boolean;
    canManageTasks?: boolean;
    canAssignTasks?: boolean;
    canManageCampaignArticles?: boolean;
    canManageAttachments?: boolean;
    canManageUsers?: boolean;
    canManageRoles?: boolean;
    canExportCampaign?: boolean;
    canViewDashboard?: boolean;
    canViewStrategicDashboard?: boolean;
    canViewCampaigns?: boolean;
    canViewObjectives?: boolean;
    canViewTasks?: boolean;
    canViewLeads?: boolean;
    canViewExpenses?: boolean;
    canViewSettings?: boolean;
  } | null;
};

// Suppression de la création automatique du dossier uploads/campaigns au démarrage
const uploadDir = CAMPAIGN_UPLOADS_DIR;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    console.log('UPLOAD MULTER PATH:', uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

function toValidDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

function toValidNumber(value: string, fieldName: string) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return num;
}

const TASK_STATUS_LABEL_TO_CODE: Record<string, string> = {
  'À faire': 'A_FAIRE',
  'A faire': 'A_FAIRE',
  A_FAIRE: 'A_FAIRE',
  'En cours': 'EN_COURS',
  EN_COURS: 'EN_COURS',
  Terminé: 'TERMINE',
  Termine: 'TERMINE',
  TERMINE: 'TERMINE',
  Annulé: 'ANNULE',
  Annule: 'ANNULE',
  ANNULE: 'ANNULE',
};

const allowedTaskStatuses = ['A_FAIRE', 'EN_COURS', 'TERMINE', 'ANNULE'];

function normalizeTaskStatus(status?: string) {
  if (!status) return 'A_FAIRE';
  const normalized = TASK_STATUS_LABEL_TO_CODE[String(status).trim()];
  return normalized || String(status).trim();
}

const normalizeIdArray = (value: unknown): number[] => {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => !Number.isNaN(item));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => Number(item))
            .filter((item) => !Number.isNaN(item));
        }
      } catch {
        return [];
      }
    }

    const numericValue = Number(trimmed);
    return Number.isNaN(numericValue) ? [] : [numericValue];
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? [] : [numericValue];
};

function removePhysicalFiles(filePaths: string[]) {
  for (const filePath of filePaths) {
    const absolutePath = resolveUploadFilePath(filePath);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }
}

async function getAuthorizedUser(req: AuthRequest, res: any) {
  if (!req.user?.userId) {
    res.status(401).json({ message: 'Utilisateur non authentifié' });
    return null;
  }

  const currentUser = (await getCurrentUserWithRole(
    Number(req.user.userId)
  )) as CurrentUserWithRole | null;

  if (!currentUser) {
    res.status(401).json({ message: 'Utilisateur introuvable' });
    return null;
  }

  return currentUser;
}

async function getCampaignOr404(campaignId: number, res: any) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      createdById: true,
      status: true,
      name: true,
    },
  });

  if (!campaign) {
    res.status(404).json({ message: 'Campagne introuvable' });
    return null;
  }

  return campaign;
}

function canAccessOwnCampaign(
  currentUser: CurrentUserWithRole,
  campaignCreatedById: number
) {
  return currentUser.id === campaignCreatedById;
}

function canViewCampaign(
  currentUser: CurrentUserWithRole,
  campaignCreatedById: number
) {
  return (
    !!currentUser.role?.canViewAllCampaigns ||
    canAccessOwnCampaign(currentUser, campaignCreatedById)
  );
}

function canEditCampaign(
  currentUser: CurrentUserWithRole,
  campaignCreatedById: number
) {
  return (
    !!currentUser.role?.canEditAllCampaigns ||
    canAccessOwnCampaign(currentUser, campaignCreatedById)
  );
}

function canDeleteCampaign(
  currentUser: CurrentUserWithRole,
  campaignCreatedById: number
) {
  return (
    !!currentUser.role?.canDeleteAllCampaigns ||
    canAccessOwnCampaign(currentUser, campaignCreatedById)
  );
}

// List
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const status = req.query.status ? String(req.query.status).trim() : undefined;
    const objectiveId = req.query.objectiveId ? Number(req.query.objectiveId) : undefined;

    const rawPage = Number(req.query.page ?? 1);
    const rawLimit = Number(req.query.limit ?? 10);

    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 10;
    const skip = (page - 1) * limit;

    const where = {
      ...(currentUser.role?.canViewAllCampaigns
        ? {}
        : { createdById: currentUser.id }),
      ...(status ? { status } : {}),
      ...(objectiveId && !Number.isNaN(objectiveId) ? { objectiveId } : {}),
    };

    const total = await prisma.campaign.count({ where });

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        objective: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        channels: {
          include: {
            channel: true,
          },
        },
        targetAudiences: {
          include: {
            targetAudience: true,
          },
        },
        attachments: true,
        kpiTargets: true,
        articles: {
          select: {
            id: true,
            designation: true,
            plannedQuantity: true,
            quantityAtCreation: true,
            quantityAtStart: true,
            quantityAtClosure: true,
            soldQuantity: true,
            currentQuantity: true,
            codeSageX3: true,
            codeSage100: true,
          },
        },
        _count: {
          select: {
            leads: true,
            tasks: true,
            attachments: true,
            articles: true,
            conversions: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });

    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    res.json({
      data: campaigns,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create
router.post('/', requireAuth, upload.array('attachments'), async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canCreateCampaign) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : création de campagne non autorisée' });
    }

    const { name, description, strategy, objectiveId, startDate, endDate, status, totalBudget } = req.body;

    const channelIds = normalizeIdArray(req.body.channelIds);
    const targetAudienceIds = normalizeIdArray(req.body.targetAudienceIds);
    const files = (req.files as Express.Multer.File[]) || [];

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        strategy,
        objectiveId: toValidNumber(objectiveId, 'objectiveId'),
        startDate: toValidDate(startDate),
        endDate: toValidDate(endDate),
        status,
        totalBudget: totalBudget !== undefined && totalBudget !== '' ? Number(totalBudget) : null,
        createdById: Number(currentUser.id),
        channels: {
          create: channelIds.map((channelId) => ({
            channelId,
            budgetAllocated: '0',
          })),
        },
        targetAudiences: {
          create: targetAudienceIds.map((targetAudienceId) => ({
            targetAudienceId,
          })),
        },
      },
    });

    if (files.length > 0) {
      await prisma.attachment.createMany({
        data: files.map((file) => ({
          fileName: file.originalname,
          filePath: `/uploads/campaigns/${file.filename}`,
          entityType: 'campaign',
          entityId: String(campaign.id),
          campaignId: campaign.id,
          createdById: Number(currentUser.id),
        })),
      });
    }

    const fullCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: {
        objective: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        channels: {
          include: {
            channel: true,
          },
        },
        targetAudiences: {
          include: {
            targetAudience: true,
          },
        },
        attachments: {
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ data: fullCampaign });
  } catch (error) {
    next(error);
  }
});

router.get('/roi/dashboard-summary', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const roiDashboardSummary = await getCampaignRoiDashboardSummary({
      createdById: currentUser.role?.canViewAllCampaigns ? undefined : currentUser.id,
    });

    res.json({ data: roiDashboardSummary });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/roi', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (!canViewCampaign(currentUser, campaignOwnership.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    const roiSummary = await getCampaignRoiSummary(campaignId);

    res.json({ data: roiSummary });
  } catch (error) {
    next(error);
  }
});

// PATCH /campaigns/:id/status — annuler ou réactiver une campagne
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const { status } = req.body;
    if (!status || (status !== 'ANNULEE' && status !== 'ACTIVE')) {
      return res.status(400).json({ message: 'Statut invalide (doit être ANNULEE ou ACTIVE)' });
    }

    // Vérifier droits (mêmes que modification)
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return res.status(404).json({ message: 'Campagne introuvable' });
    if (!currentUser.role?.canEditAllCampaigns && campaign.createdById !== currentUser.id) {
      return res.status(403).json({ message: 'Accès refusé à la modification de cette campagne' });
    }

    // Mettre à jour le statut
    await prisma.campaign.update({ where: { id: campaignId }, data: { status } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


// Get One
// Export Excel (premium)
import { exportCampaignToExcel, exportMultipleCampaignsToExcel, getCampaignSalesLast3Months, CampaignMonthlySales } from '../../../services/campaignExport.service';

router.get('/:id/export-excel', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    // Contrôle d'accès premium : doit avoir le droit d'exporter OU être propriétaire
    if (!currentUser.role?.canExportCampaign && !canAccessOwnCampaign(currentUser, campaignOwnership.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à l\'export de cette campagne' });
    }

    // Génération du fichier Excel
    const { buffer, fileName } = await exportCampaignToExcel(campaignId);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// Route utilitaire : prix unitaire (CA) par article pour l'affichage dans la page détails
router.get('/:id/unit-prices', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        articles: {
          select: { id: true, codeSageX3: true, codeSage100: true },
        },
      },
    });

    if (!campaign) {
      return res.json({ data: {} });
    }

    const articleRefs: ArticleCodeRef[] = campaign.articles
      .filter(a => a.codeSage100 || a.codeSageX3)
      .map(a => ({
        articleId: a.id,
        codeSage100: a.codeSage100,
        codeSageX3: a.codeSageX3,
      }));

    if (articleRefs.length === 0) {
      return res.json({ data: {} });
    }

    const unitPrices = await getUnitPriceByArticle(articleRefs);
    res.json({ data: unitPrices });
  } catch (error) {
    next(error);
  }
});

// Route utilitaire : montants des ventes (CA) par article pour l'export liste
router.get('/:id/sales-amounts', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        articles: {
          select: { id: true, codeSageX3: true, codeSage100: true },
        },
      },
    });

    if (!campaign || !campaign.startDate || !campaign.endDate) {
      return res.json({ data: {} });
    }

    const effectiveEndDate = campaign.endDate > new Date() ? new Date() : campaign.endDate;

    const articleRefs: ArticleCodeRef[] = campaign.articles
      .filter(a => a.codeSage100 || a.codeSageX3)
      .map(a => ({
        articleId: a.id,
        codeSage100: a.codeSage100,
        codeSageX3: a.codeSageX3,
      }));

    if (articleRefs.length === 0) {
      return res.json({ data: {} });
    }

    const salesAmounts = await getSalesAmountByArticle(
      articleRefs,
      campaign.startDate,
      effectiveEndDate,
    );

    res.json({ data: salesAmounts });
  } catch (error) {
    next(error);
  }
});

// Ventes des 3 derniers mois précédant le début de campagne (page détail)
router.get('/:id/sales-last-3-months', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    const data = await getCampaignSalesLast3Months(campaignId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// Route batch : ventes des 3 derniers mois par campagne (tableau de bord)
router.post('/sales-last-3-months', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const campaignIds: number[] = Array.isArray(body.campaignIds)
      ? body.campaignIds.map(Number).filter((id: number) => !isNaN(id))
      : [];

    if (campaignIds.length === 0) {
      return res.json({ data: {} });
    }

    const results: Record<number, CampaignMonthlySales> = {};
    const errors: Record<number, boolean> = {};

    // Traitement séquentiel pour éviter la saturation du pool X3 (max 10 connexions)
    for (const campaignId of [...new Set(campaignIds)]) {
      try {
        results[campaignId] = await getCampaignSalesLast3Months(campaignId);
      } catch (error) {
        console.error(`Erreur ventes 3 mois campagne ${campaignId}:`, error);
        errors[campaignId] = true;
      }
    }

    res.json({ data: results, errors });
  } catch (error) {
    next(error);
  }
});

// Route batch : export Excel multi-campagnes pour la liste
router.post('/export-excel-batch', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const { campaignIds } = req.body || {};
    const ids: number[] = Array.isArray(campaignIds) ? campaignIds.map(Number).filter((id: number) => !isNaN(id)) : [];
    if (ids.length === 0) return res.status(400).json({ message: 'Aucun ID de campagne fourni' });

    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, name: true, status: true, description: true,
        startDate: true, endDate: true,
        objective: { select: { label: true } },
      },
    });

    const buffer = await exportMultipleCampaignsToExcel(campaigns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="campagnes.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
});

// Route batch : montant total des ventes par campagne pour la liste
router.post('/sales-summary', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const campaignIds: number[] = Array.isArray(body.campaignIds) ? body.campaignIds.map(Number).filter((id: number) => !isNaN(id)) : [];

    if (campaignIds.length === 0) {
      return res.json({ data: {} });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        articles: {
          select: { id: true, codeSageX3: true, codeSage100: true },
        },
      },
    });

    const results: Record<number, number> = {};
    const errors: Record<number, boolean> = {};

    // Traitement séquentiel pour éviter la saturation du pool X3 (max 10 connexions)
    for (const campaign of campaigns) {
      if (!campaign.startDate || !campaign.endDate) {
        results[campaign.id] = 0;
        continue;
      }

      const articleRefs: ArticleCodeRef[] = campaign.articles
        .filter(a => a.codeSage100 || a.codeSageX3)
        .map(a => ({
          articleId: a.id,
          codeSage100: a.codeSage100,
          codeSageX3: a.codeSageX3,
        }));

      if (articleRefs.length === 0) {
        results[campaign.id] = 0;
        continue;
      }

      try {
        const effectiveEndDate = campaign.endDate > new Date() ? new Date() : campaign.endDate;

        const salesAmounts = await getSalesAmountByArticle(
          articleRefs,
          campaign.startDate,
          effectiveEndDate,
        );

        results[campaign.id] = Object.values(salesAmounts).reduce((sum, val) => sum + val, 0);
      } catch (error) {
        console.error(`Erreur X3 pour la campagne ${campaign.id}:`, error);
        results[campaign.id] = 0;
        errors[campaign.id] = true; // Marque l'erreur
      }
    }

    res.json({ data: results, errors });

    res.json({ data: results });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (!canViewCampaign(currentUser, campaignOwnership.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        objective: true,
        createdBy: { select: { id: true, username: true, email: true } },
        channels: { include: { channel: true } },
        targetAudiences: { include: { targetAudience: true } },
        attachments: true,
        metrics: true,
        kpiTargets: true,
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                username: true,
                email: true,
                name: true,
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
            createdAt: 'desc',
          },
        },
        conversions: {
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                email: true,
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
            createdAt: 'desc',
          },
        },
        articles: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        leads: { take: 5, orderBy: { createdAt: 'desc' } },
        _count: {
          select: {
            leads: true,
            tasks: true,
            attachments: true,
            articles: true,
            conversions: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ data: campaign });
  } catch (error) {
    next(error);
  }
});

// Update
router.put('/:id', requireAuth, upload.array('attachments'), async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (!canEditCampaign(currentUser, campaignOwnership.createdById)) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : modification de campagne non autorisée' });
    }

    if (campaignOwnership.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible de modifier une campagne terminée',
      });
    }

    const { name, description, strategy, objectiveId, startDate, endDate, status, totalBudget } = req.body;

    const channelIds = normalizeIdArray(req.body.channelIds);
    const targetAudienceIds = normalizeIdArray(req.body.targetAudienceIds);
    const files = (req.files as Express.Multer.File[]) || [];

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        name,
        description,
        strategy,
        objectiveId: toValidNumber(objectiveId, 'objectiveId'),
        startDate: startDate ? toValidDate(startDate) : undefined,
        endDate: endDate ? toValidDate(endDate) : undefined,
        status,
        totalBudget: totalBudget !== undefined && totalBudget !== '' ? Number(totalBudget) : null,
        channels: {
          deleteMany: {},
          create: channelIds.map((channelId) => ({
            channelId,
            budgetAllocated: '0',
          })),
        },
        targetAudiences: {
          deleteMany: {},
          create: targetAudienceIds.map((targetAudienceId) => ({
            targetAudienceId,
          })),
        },
      },
    });

    if (files.length > 0) {
      await prisma.attachment.createMany({
        data: files.map((file) => ({
          fileName: file.originalname,
          filePath: `/uploads/campaigns/${file.filename}`,
          entityType: 'campaign',
          entityId: String(campaignId),
          campaignId,
          createdById: Number(currentUser.id),
        })),
      });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        objective: true,
        channels: { include: { channel: true } },
        targetAudiences: { include: { targetAudience: true } },
        attachments: true,
      },
    });

    res.json({ data: campaign });
  } catch (error) {
    next(error);
  }
});

// Delete
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (!canDeleteCampaign(currentUser, campaignOwnership.createdById)) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : suppression de campagne non autorisée' });
    }

    const attachments = await prisma.attachment.findMany({
      where: { campaignId },
      select: {
        id: true,
        filePath: true,
      },
    });

    if (attachments.length > 0) {
      removePhysicalFiles(attachments.map((attachment) => attachment.filePath));

      await prisma.attachment.deleteMany({
        where: { campaignId },
      });
    }

    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Add Task
router.post('/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canManageTasks) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : gestion des tâches non autorisée' });
    }

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (!canEditCampaign(currentUser, campaignOwnership.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    if (campaignOwnership.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible d’ajouter une tâche à une campagne terminée',
      });
    }

    const { title, description, assignedTo, dueDate, status, priority } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const assignedToId = assignedTo ? toValidNumber(assignedTo, 'assignedTo') : null;
    const currentUserId = Number(currentUser.id);

    if (assignedToId && assignedToId !== currentUserId && !currentUser.role?.canAssignTasks) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : assignation de tâche non autorisée' });
    }

    const normalizedStatus = normalizeTaskStatus(status);

    if (!allowedTaskStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message:
          "Statut invalide. Valeurs autorisées : 'À faire', 'En cours', 'Terminé', 'Annulé'.",
      });
    }

    const task = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        dueDate: dueDate ? toValidDate(dueDate) : null,
        status: normalizedStatus,
        priority: priority ? String(priority).trim() : 'MOYENNE',
        campaign: {
          connect: { id: campaignId },
        },
        createdBy: {
          connect: { id: currentUserId },
        },
        ...(assignedToId
          ? {
              assignedTo: {
                connect: { id: assignedToId },
              },
            }
          : {}),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
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

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// Update Task
router.put('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canManageTasks) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : gestion des tâches non autorisée' });
    }

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (!canEditCampaign(currentUser, campaignOwnership.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    if (campaignOwnership.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible de modifier une tâche d’une campagne terminée',
      });
    }

    const taskId = toValidNumber(req.params.taskId, 'taskId');
    const { title, description, assignedTo, dueDate, status, priority } = req.body;

    const data: any = {
      title: title ? String(title).trim() : undefined,
      description:
        description !== undefined
          ? description
            ? String(description).trim()
            : null
          : undefined,
      status: status ? normalizeTaskStatus(status) : undefined,
      priority: priority ? String(priority).trim() : undefined,
    };

    if (data.status && !allowedTaskStatuses.includes(data.status)) {
      return res.status(400).json({
        message:
          "Statut invalide. Valeurs autorisées : 'À faire', 'En cours', 'Terminé', 'Annulé'.",
      });
    }

    if (assignedTo !== undefined) {
      if (assignedTo !== null && assignedTo !== '') {
        const assignedToId = toValidNumber(assignedTo, 'assignedTo');

        if (assignedToId !== currentUser.id && !currentUser.role?.canAssignTasks) {
          return res
            .status(403)
            .json({ message: 'Accès refusé : assignation de tâche non autorisée' });
        }

        data.assignedTo = {
          connect: { id: assignedToId },
        };
      } else {
        data.assignedTo = {
          disconnect: true,
        };
      }
    }

    if (dueDate !== undefined) {
      data.dueDate = dueDate ? toValidDate(dueDate) : null;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignedTo: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
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

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Delete Task
router.delete('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canManageTasks) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : gestion des tâches non autorisée' });
    }

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (!canEditCampaign(currentUser, campaignOwnership.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    if (campaignOwnership.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible de supprimer une tâche d’une campagne terminée',
      });
    }

    const taskId = toValidNumber(req.params.taskId, 'taskId');

    await prisma.task.delete({
      where: { id: taskId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Add Attachment
router.post(
  '/:id/attachments',
  requireAuth,
  upload.single('attachment'),
  async (req, res, next) => {
    try {
      const r = req as AuthRequest;
      const currentUser = await getAuthorizedUser(r, res);
      if (!currentUser) return;

      if (!currentUser.role?.canManageAttachments) {
        return res
          .status(403)
          .json({ message: 'Accès refusé : gestion des pièces jointes non autorisée' });
      }

      const campaignId = toValidNumber(req.params.id, 'campaignId');
      const campaignOwnership = await getCampaignOr404(campaignId, res);
      if (!campaignOwnership) return;

      if (!canEditCampaign(currentUser, campaignOwnership.createdById)) {
        return res.status(403).json({ message: 'Accès refusé à cette campagne' });
      }

      if (campaignOwnership.status === 'TERMINEE') {
        return res.status(400).json({
          message: 'Impossible d’ajouter une pièce jointe à une campagne terminée',
        });
      }

      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'Aucun fichier reçu' });
      }

      const attachment = await prisma.attachment.create({
        data: {
          campaignId,
          fileName: file.originalname,
          filePath: `/uploads/campaigns/${file.filename}`,
          entityType: 'campaign',
          entityId: String(campaignId),
          createdById: Number(currentUser.id),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json(attachment);
    } catch (error) {
      next(error);
    }
  }
);

// Delete Attachment
router.delete('/:id/attachments/:attachmentId', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canManageAttachments) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : gestion des pièces jointes non autorisée' });
    }

    const campaignId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);

    if (Number.isNaN(campaignId) || Number.isNaN(attachmentId)) {
      return res.status(400).json({ message: 'Invalid campaignId or attachmentId' });
    }

    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (!canEditCampaign(currentUser, campaignOwnership.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    if (campaignOwnership.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible de supprimer une pièce jointe d’une campagne terminée',
      });
    }

    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        campaignId: campaignId,
      },
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const filePath = resolveUploadFilePath(attachment.filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Download Attachment
router.get('/:id/attachments/:attachmentId/download', requireAuth, async (req, res, next) => {
  try {
    const campaignId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);

    if (Number.isNaN(campaignId) || Number.isNaN(attachmentId)) {
      return res.status(400).json({ message: 'Invalid campaignId or attachmentId' });
    }

    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        campaignId: campaignId,
      },
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Pièce jointe introuvable' });
    }

    const filePath = resolveUploadFilePath(attachment.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier introuvable sur le serveur' });
    }

    const fileName = attachment.fileName || 'download';
    res.download(filePath, fileName);
  } catch (error) {
    next(error);
  }
});

router.get('/articles/test-catalog-connection', requireAuth, async (_req, res, next) => {
  try {
    const ok = await testArticleCatalogConnection();

    if (!ok) {
      return res.status(500).json({
        message: 'Connexion à la base catalogue impossible',
      });
    }

    res.json({
      message: 'Connexion à la base catalogue réussie',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/articles/search-catalog', requireAuth, async (req, res, next) => {
  try {
    const { codes, source } = req.body as {
      codes: string[];
      source: 'SAGE_X3' | 'SAGE_100';
    };

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ message: 'codes is required' });
    }

    if (!source || !['SAGE_X3', 'SAGE_100'].includes(source)) {
      return res.status(400).json({ message: 'source is invalid' });
    }

    const results = await searchArticlesInCatalog(codes, source);

    res.json({
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/articles/catalog-families/search', requireAuth, async (req, res, next) => {
  try {
    const source = (req.query.source as string) || 'SAGE_X3';
    const q = (req.query.q as string) || '';

    if (!['SAGE_X3', 'SAGE_100'].includes(source)) {
      return res.status(400).json({ message: 'source is invalid' });
    }

    const service = new ArticleFamilySyncService();
    const families = await service.searchFamilies(q);

    res.json({
      data: families,
    });
  } catch (error) {
    next(error);
  }
});

// Déclenchement manuel de la synchronisation des familles
router.post('/articles/families/sync', requireAuth, requirePermission('canViewSettings'), async (req, res, next) => {
  try {
    const service = new ArticleFamilySyncService();
    const result = await service.syncFamiliesToLocalDb();

    res.json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/articles/catalog-browse', requireAuth, async (req, res, next) => {
  try {
    const {
      famille,
      searchQuery,
      tauxRotationOperator,
      tauxRotationValue,
      source,
    } = req.body as {
      famille?: string;
      searchQuery?: string;
      tauxRotationOperator?: 'GT' | 'LT' | 'EQ';
      tauxRotationValue?: number;
      source?: 'SAGE_X3' | 'SAGE_100';
    };

    const effectiveSource = source || 'SAGE_X3';

    if (!['SAGE_X3', 'SAGE_100'].includes(effectiveSource)) {
      return res.status(400).json({ message: 'source is invalid' });
    }

    const results = await browseArticlesInCatalog({
      famille,
      searchQuery,
      tauxRotationOperator,
      tauxRotationValue,
      source: effectiveSource,
    });

    res.json({
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/articles/bulk', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canManageCampaignArticles) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : gestion des articles non autorisée' });
    }

    const rawCampaignId = req.params.id;
    const campaignId = toValidNumber(rawCampaignId, 'campaignId');

    const campaign = await getCampaignOr404(campaignId, res);
    if (!campaign) return;

    if (!canEditCampaign(currentUser, campaign.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    const currentUserId = Number(currentUser.id);

    if (campaign.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible d’ajouter un article à une campagne terminée',
      });
    }

    const shouldSetQuantityAtStart =
      campaign.status === 'ACTIVE' || campaign.status === 'EN_PAUSE';

    const payload = req.body?.articles;

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({
        message: 'Aucun article à enregistrer',
      });
    }

    const normalizedPayload = payload
      .map((item: any) => ({
        codeSageX3: item?.codeSageX3 ? String(item.codeSageX3).trim() : null,
        codeSage100: item?.codeSage100 ? String(item.codeSage100).trim() : null,
        designation: item?.designation ? String(item.designation).trim() : '',
        plannedQuantity:
          item?.plannedQuantity !== undefined && item?.plannedQuantity !== null
            ? Number(item.plannedQuantity)
            : null,
        quantityAtCreation:
          item?.quantityAtCreation !== undefined && item?.quantityAtCreation !== null
            ? Number(item.quantityAtCreation)
            : 0,
        quantityAtStart:
          item?.quantityAtStart !== undefined && item?.quantityAtStart !== null
            ? Number(item.quantityAtStart)
            : null,
        currentQuantity:
          item?.currentQuantity !== undefined && item?.currentQuantity !== null
            ? Number(item.currentQuantity)
            : 0,
        quantityAtClosure:
          item?.quantityAtClosure !== undefined && item?.quantityAtClosure !== null
            ? Number(item.quantityAtClosure)
            : null,
      }))
      .filter((item: any) => item.codeSageX3 || item.codeSage100);

    if (normalizedPayload.length === 0) {
      return res.status(400).json({
        message: 'Aucun article valide à enregistrer',
      });
    }

    const existingArticles = await prisma.article.findMany({
      where: { campaignId },
      select: {
        id: true,
        codeSageX3: true,
        codeSage100: true,
      },
    });

    const existingX3 = new Set(
      existingArticles
        .map((a) => (a.codeSageX3 ? String(a.codeSageX3).trim() : null))
        .filter(Boolean)
    );

    const existing100 = new Set(
      existingArticles
        .map((a) => (a.codeSage100 ? String(a.codeSage100).trim() : null))
        .filter(Boolean)
    );

    const seenX3 = new Set<string>();
    const seen100 = new Set<string>();

    const articlesToCreate = normalizedPayload.filter((item: any) => {
      const x3 = item.codeSageX3;
      const s100 = item.codeSage100;

      if (x3 && existingX3.has(x3)) return false;
      if (s100 && existing100.has(s100)) return false;
      if (x3 && seenX3.has(x3)) return false;
      if (s100 && seen100.has(s100)) return false;

      if (x3) seenX3.add(x3);
      if (s100) seen100.add(s100);

      return true;
    });

    if (articlesToCreate.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Tous les articles existent déjà dans cette campagne',
        createdCount: 0,
        skippedCount: normalizedPayload.length,
        createdArticles: [],
      });
    }

    const createdArticles = await prisma.$transaction(
      articlesToCreate.map((item: any) =>
        prisma.article.create({
          data: {
            codeSageX3: item.codeSageX3,
            codeSage100: item.codeSage100,
            designation: item.designation || '',
            plannedQuantity: item.plannedQuantity,
            quantityAtCreation: item.quantityAtCreation,
            quantityAtStart: shouldSetQuantityAtStart ? item.quantityAtCreation : null,
            currentQuantity: item.currentQuantity,
            quantityAtClosure: item.quantityAtClosure,
            soldQuantity: 0,
            lastSyncAt: null,
            campaign: {
              connect: { id: campaignId },
            },
            createdBy: {
              connect: { id: currentUserId },
            },
          },
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: 'Articles enregistrés avec succès',
      createdCount: createdArticles.length,
      skippedCount: normalizedPayload.length - createdArticles.length,
      createdArticles,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/articles/:articleId', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canManageCampaignArticles) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : gestion des articles non autorisée' });
    }

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (!canEditCampaign(currentUser, campaignOwnership.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    if (campaignOwnership.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible de supprimer un article d’une campagne terminée',
      });
    }

    await prisma.article.delete({
      where: {
        id: Number(req.params.articleId),
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /campaigns/:id/distinct-clients-count
 * Retourne le nombre de clients distincts ayant acheté des articles de la campagne
 * (source : VENTE_VENDEUR_CLIENT, colonne CLIENT).
 */
router.get('/campaigns/:id/distinct-clients-count', requireAuth, async (req, res, next) => {
  try {
    const campaignId = Number(req.params.id);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return res.status(400).json({ message: 'ID de campagne invalide.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        articles: {
          select: {
            id: true,
            codeSageX3: true,
            codeSage100: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campagne introuvable.' });
    }

    if (!campaign.startDate || !campaign.endDate) {
      return res.status(400).json({ message: 'La campagne doit avoir une date de début et de fin.' });
    }

    const articleRefs: ArticleCodeRef[] = campaign.articles
      .filter(a => a.codeSage100 || a.codeSageX3)
      .map(a => ({
        articleId: a.id,
        codeSage100: a.codeSage100,
        codeSageX3: a.codeSageX3,
      }));

    if (articleRefs.length === 0) {
      return res.json({ data: { distinctClientCount: 0 } });
    }

    const effectiveEnd = campaign.endDate > new Date() ? new Date() : campaign.endDate;
    const distinctClientCount = await getDistinctClientCountByArticle(
      articleRefs,
      campaign.startDate,
      effectiveEnd,
    );

    res.json({ data: { distinctClientCount } });
  } catch (error) {
    next(error);
  }
});

// ─── Dashboard stratégique ──────────────────────────────────────────────────
router.get(
  '/strategic/summary',
  requireAuth,
  requirePermission('canViewStrategicDashboard'),
  async (_req, res, next) => {
    try {
      const summary = await getStrategicDashboardSummary();
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Rapport de rentabilité (Profitabilité) ────────────────────────────────
router.get(
  '/profitability/report',
  requireAuth,
  requirePermission('canViewStrategicDashboard'),
  async (req, res, next) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const report = await getProfitabilityReport(month, year);
      res.json({ data: report });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/profitability/export/excel',
  requireAuth,
  requirePermission('canViewStrategicDashboard'),
  async (req, res, next) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const buffer = await exportProfitabilityToExcel(month, year);
      const fileName = `rapport-rentabilite-${new Date().toISOString().slice(0, 7)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },
);

// ─── KPI Targets ────────────────────────────────────────────────────────────

// Récupérer les objectifs KPI d'une campagne
router.get('/:id/kpi-targets', requireAuth, async (req, res, next) => {
  try {
    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const targets = await prisma.campaignKpiTarget.findMany({
      where: { campaignId },
    });
    res.json({ data: targets });
  } catch (error) {
    next(error);
  }
});

// Définir/Mettre à jour les objectifs KPI d'une campagne (bulk upsert)
router.put('/:id/kpi-targets', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const campaignOwnership = await getCampaignOr404(campaignId, res);
    if (!campaignOwnership) return;

    if (
      !currentUser.role?.canCreateCampaign ||
      !canEditCampaign(currentUser, campaignOwnership.createdById)
    ) {
      return res.status(403).json({
        message: 'Accès refusé : permission de création requise pour modifier les objectifs KPI',
      });
    }

    if (campaignOwnership.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible de modifier les objectifs KPI d\'une campagne terminée',
      });
    }

    const { targets } = req.body as {
      targets: { kpiName: string; targetValue: number; periodStart?: string; periodEnd?: string }[];
    };

    if (!Array.isArray(targets)) {
      return res.status(400).json({ message: 'Le champ targets doit être un tableau' });
    }

    // Récupérer les dates de la campagne pour les périodes par défaut
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { startDate: true, endDate: true },
    });

    const periodStart = targets[0]?.periodStart
      ? toValidDate(targets[0].periodStart)
      : campaign?.startDate
        ? new Date(campaign.startDate)
        : new Date();

    const periodEnd = targets[0]?.periodEnd
      ? toValidDate(targets[0].periodEnd)
      : campaign?.endDate
        ? new Date(campaign.endDate)
        : new Date();

    // Supprimer les anciens et recréer
    await prisma.campaignKpiTarget.deleteMany({
      where: { campaignId },
    });

    if (targets.length > 0) {
      await prisma.campaignKpiTarget.createMany({
        data: targets.map((t) => ({
          campaignId,
          createdById: Number(currentUser.id),
          kpiName: t.kpiName,
          targetValue: t.targetValue,
          periodStart,
          periodEnd,
        })),
      });
    }

    const updated = await prisma.campaignKpiTarget.findMany({
      where: { campaignId },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;