import { Router, Request, NextFunction } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { searchArticlesInCatalog, testArticleCatalogConnection } from '../../../services/articleCatalog.service';


const router = Router();

type AuthRequest = Request & { user: { userId: number } };

// dossier stable : apps/api/uploads/campaigns
const uploadDir = path.resolve(__dirname, '../../../../uploads/campaigns');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
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

function normalizeIdArray(value: unknown): number[] {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];

  return rawValues
    .map((item) => Number(item))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function getUploadsRootDir() {
  return path.resolve(__dirname, '../../../../uploads');
}

function removePhysicalFiles(filePaths: string[]) {
  for (const filePath of filePaths) {
    const relativePath = filePath.replace(/^\/uploads\//, '');
    const absolutePath = path.resolve(getUploadsRootDir(), relativePath);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }
}

// List
// router.get('/', requireAuth, async (_req, res, next) => {
//   try {
//     const campaigns = await prisma.campaign.findMany({
//       include: {
//         objective: true,
//         createdBy: { select: { username: true } },
//         channels: {
//           include: {
//             channel: true,
//           },
//         },
//         targetAudiences: {
//           include: {
//             targetAudience: true,
//           },
//         },
//         attachments: true,
//         _count: { select: { leads: true, tasks: true } },
//       },
//       orderBy: { updatedAt: 'desc' },
//     });

//     res.json({ data: campaigns });
//   } catch (error) {
//     next(error);
//   }
// });

// List
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
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
        _count: {
          select: {
            leads: true,
            tasks: true,
            attachments: true,
            articles: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ data: campaigns });
  } catch (error) {
    next(error);
  }
});

// Create
router.post('/', requireAuth, upload.array('attachments'), async (req, res, next) => {
  try {
    const r = req as AuthRequest;

    const { name, description, objectiveId, startDate, endDate, status } = req.body;

    const channelIds = normalizeIdArray(req.body.channelIds);
    const targetAudienceIds = normalizeIdArray(req.body.targetAudienceIds);
    const files = (req.files as Express.Multer.File[]) || [];

    console.log('[Campaign Create] uploadDir =', uploadDir);
    console.log('[Campaign Create] files count =', files.length);
    console.log(
      '[Campaign Create] files =',
      files.map((file) => ({
        originalname: file.originalname,
        filename: file.filename,
        destination: file.destination,
        path: file.path,
        size: file.size,
      }))
    );

    if (!r.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        objectiveId: toValidNumber(objectiveId, 'objectiveId'),
        startDate: toValidDate(startDate),
        endDate: toValidDate(endDate),
        status,
        createdById: Number(r.user.userId),

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
          createdById: Number(r.user.userId),
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

// Get One
// router.get('/:id', requireAuth, async (req, res, next) => {
//   try {
//     const campaignId = toValidNumber(req.params.id, 'campaignId');

//     const campaign = await prisma.campaign.findUnique({
//       where: { id: campaignId },
//       include: {
//         objective: true,
//         createdBy: { select: { username: true } },
//         channels: { include: { channel: true } },
//         targetAudiences: { include: { targetAudience: true } },
//         attachments: true,
//         metrics: true,
//         kpiTargets: true,
//         tasks: true,
//         leads: { take: 5, orderBy: { createdAt: 'desc' } },
//       },
//     });

//     if (!campaign) {
//       return res.status(404).json({ message: 'Not found' });
//     }

//     res.json({ data: campaign });
//   } catch (error) {
//     next(error);
//   }
// });

// Get One
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const campaignId = toValidNumber(req.params.id, 'campaignId');

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
            assignee: {
              select: {
                id: true,
                username: true,
                email: true,
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
    const campaignId = toValidNumber(req.params.id, 'campaignId');

    const { name, description, objectiveId, startDate, endDate, status } = req.body;

    const channelIds = normalizeIdArray(req.body.channelIds);
    const targetAudienceIds = normalizeIdArray(req.body.targetAudienceIds);
    const files = (req.files as Express.Multer.File[]) || [];

    console.log('[Campaign Update] uploadDir =', uploadDir);
    console.log('[Campaign Update] files count =', files.length);
    console.log(
      '[Campaign Update] files =',
      files.map((file) => ({
        originalname: file.originalname,
        filename: file.filename,
        destination: file.destination,
        path: file.path,
        size: file.size,
      }))
    );

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        name,
        description,
        objectiveId: toValidNumber(objectiveId, 'objectiveId'),
        startDate: startDate ? toValidDate(startDate) : undefined,
        endDate: endDate ? toValidDate(endDate) : undefined,
        status,

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
    const campaignId = toValidNumber(req.params.id, 'campaignId');

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


// --- Sub-resources ---

// Add Task
// router.post('/:id/tasks', requireAuth, async (req, res, next) => {
//   try {
//     const { title, description, assignedTo, dueDate, status } = req.body;
//     const task = await prisma.task.create({
//       data: {
//         campaignId: req.params.id,
//         title,
//         description,
//         assignedTo,
//         dueDate: new Date(dueDate),
//         status,
//       },
//     });
//     res.status(201).json(task);
//   } catch (error) {
//     next(error);
//   }
// });

// Add Task
// router.post('/:id/tasks', requireAuth, async (req, res, next) => {
//   try {
//     const r = req as AuthRequest;

//     const campaignId = toValidNumber(req.params.id, 'campaignId');
//     const { title, description, assignedTo, dueDate, status } = req.body;

//     if (!title || !String(title).trim()) {
//       return res.status(400).json({ message: 'Title is required' });
//     }

//     const assignedToId = toValidNumber(assignedTo, 'assignedTo');

//     const task = await prisma.task.create({
//       data: {
//         campaignId,
//         createdById: r.user.userId,
//         title: String(title).trim(),
//         description: description ? String(description).trim() : null,
//         assignedTo: assignedToId,
//         dueDate: toValidDate(dueDate),
//         status: status || 'TODO',
//       },
//       include: {
//         assignee: {
//           select: {
//             id: true,
//             username: true,
//             email: true,
//           },
//         },
//         createdBy: {
//           select: {
//             id: true,
//             username: true,
//             email: true,
//           },
//         },
//       },
//     });

//     res.status(201).json(task);
//   } catch (error) {
//     next(error);
//   }
// });

// Add Task
router.post('/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;

    if (!r.user?.userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const { title, description, assignedTo, dueDate, status } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const assignedToId = assignedTo ? toValidNumber(assignedTo, 'assignedTo') : null;
    const currentUserId = Number(r.user.userId);

    const task = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        dueDate: toValidDate(dueDate),
        status: status || 'TODO',
        campaign: {
          connect: { id: campaignId },
        },
        createdBy: {
          connect: { id: currentUserId },
        },
        ...(assignedToId
          ? {
              assignee: {
                connect: { id: assignedToId },
              },
            }
          : {}),
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
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
    const taskId = toValidNumber(req.params.taskId, 'taskId');
    const { title, description, assignedTo, dueDate, status } = req.body;

    const data: any = {
      title: title ? String(title).trim() : undefined,
      description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
      status: status || undefined,
    };

    if (assignedTo !== undefined && assignedTo !== null && assignedTo !== '') {
      data.assignedTo = toValidNumber(assignedTo, 'assignedTo');
    }

    if (dueDate) {
      data.dueDate = toValidDate(dueDate);
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
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
router.post('/:id/attachments', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const campaignId = toValidNumber(req.params.id, 'campaignId');
    const { fileName, filePath, entityType } = req.body;

    const attachment = await prisma.attachment.create({
      data: {
        campaignId,
        fileName,
        filePath,
        entityType: entityType || 'CAMPAIGN',
        entityId: String(campaignId),
        createdById: Number(r.user.userId),
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
});

// Delete Attachment
router.delete('/:id/attachments/:attachmentId', requireAuth, async (req, res, next) => {
  try {
    await prisma.attachment.delete({
      where: { id: req.params.attachmentId },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

////////////////////////////////

/**
 * Test connexion catalogue
 */
router.get('/articles/test-catalog-connection', requireAuth, async (req, res, next) => {
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

/**
 * Recherche d’articles dans le catalogue externe
 */
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

/**
 * Enregistrer plusieurs articles dans la campagne
 */
// router.post('/:id/articles/bulk', requireAuth, async (req, res, next) => {
//   try {
//     const campaignId = Number(req.params.id);

//     if (Number.isNaN(campaignId)) {
//       return res.status(400).json({ message: 'Invalid campaign id' });
//     }

//     const payload = req.body?.articles;

//     if (!Array.isArray(payload) || payload.length === 0) {
//       return res.status(400).json({ message: 'articles is required' });
//     }

//     const existingArticles = await prisma.article.findMany({
//       where: { campaignId },
//       select: {
//         codeSageX3: true,
//         codeSage100: true,
//       },
//     });

//     const existingX3 = new Set(
//       existingArticles.map((a) => a.codeSageX3).filter(Boolean)
//     );

//     const existing100 = new Set(
//       existingArticles.map((a) => a.codeSage100).filter(Boolean)
//     );

//     const articlesToCreate = payload.filter((item: any) => {
//       const x3 = item.codeSageX3 ? String(item.codeSageX3).trim() : null;
//       const s100 = item.codeSage100 ? String(item.codeSage100).trim() : null;

//       if (x3 && existingX3.has(x3)) return false;
//       if (s100 && existing100.has(s100)) return false;

//       if (x3) existingX3.add(x3);
//       if (s100) existing100.add(s100);

//       return true;
//     });

//     if (articlesToCreate.length === 0) {
//       return res.status(200).json({
//         message: 'Aucun nouvel article à enregistrer',
//         count: 0,
//       });
//     }

//     await prisma.article.createMany({
//       data: articlesToCreate.map((item: any) => ({
//         campaignId,
//         codeSageX3: item.codeSageX3 || null,
//         codeSage100: item.codeSage100 || null,
//         designation: item.designation || '',
//         plannedQuantity: item.plannedQuantity ?? null,
//         quantityAtCreation: item.quantityAtCreation ?? 0,
//         quantityAtStart: item.quantityAtStart ?? null,
//         currentQuantity: item.currentQuantity ?? 0,
//         quantityAtClosure: item.quantityAtClosure ?? null,
//       })),
//     });

//     res.status(201).json({
//       message: 'Articles enregistrés avec succès',
//       count: articlesToCreate.length,
//     });
//   } catch (error) {
//     next(error);
//   }
// });


/**
 * Enregistrer plusieurs articles dans la campagne
 */
// router.post('/:id/articles/bulk', requireAuth, async (req, res, next) => {
//   try {
//     const rawCampaignId = req.params.id;
//     const campaignId = Number(rawCampaignId);

//     console.log('=== BULK ARTICLES START ===');
//     console.log('rawCampaignId:', rawCampaignId);
//     console.log('campaignId:', campaignId);
//     console.log('req.body:', JSON.stringify(req.body, null, 2));

//     if (!rawCampaignId || Number.isNaN(campaignId)) {
//       return res.status(400).json({
//         message: 'Identifiant de campagne invalide',
//       });
//     }

//     const campaign = await prisma.campaign.findUnique({
//       where: { id: campaignId },
//       select: { id: true, name: true },
//     });

//     if (!campaign) {
//       return res.status(404).json({
//         message: 'Campagne introuvable',
//       });
//     }

//     const payload = req.body?.articles;

//     if (!Array.isArray(payload) || payload.length === 0) {
//       return res.status(400).json({
//         message: 'Aucun article à enregistrer',
//       });
//     }

//     const normalizedPayload = payload
//       .map((item: any) => ({
//         codeSageX3: item?.codeSageX3 ? String(item.codeSageX3).trim() : null,
//         codeSage100: item?.codeSage100 ? String(item.codeSage100).trim() : null,
//         designation: item?.designation ? String(item.designation).trim() : '',
//         plannedQuantity:
//           item?.plannedQuantity !== undefined && item?.plannedQuantity !== null
//             ? Number(item.plannedQuantity)
//             : null,
//         quantityAtCreation:
//           item?.quantityAtCreation !== undefined && item?.quantityAtCreation !== null
//             ? Number(item.quantityAtCreation)
//             : 0,
//         quantityAtStart:
//           item?.quantityAtStart !== undefined && item?.quantityAtStart !== null
//             ? Number(item.quantityAtStart)
//             : null,
//         currentQuantity:
//           item?.currentQuantity !== undefined && item?.currentQuantity !== null
//             ? Number(item.currentQuantity)
//             : 0,
//         quantityAtClosure:
//           item?.quantityAtClosure !== undefined && item?.quantityAtClosure !== null
//             ? Number(item.quantityAtClosure)
//             : null,
//       }))
//       .filter((item: any) => item.codeSageX3 || item.codeSage100);

//     if (normalizedPayload.length === 0) {
//       return res.status(400).json({
//         message: 'Aucun article valide à enregistrer',
//       });
//     }

//     const existingArticles = await prisma.article.findMany({
//       where: { campaignId },
//       select: {
//         id: true,
//         codeSageX3: true,
//         codeSage100: true,
//       },
//     });

//     const existingX3 = new Set(
//       existingArticles
//         .map((a) => (a.codeSageX3 ? String(a.codeSageX3).trim() : null))
//         .filter(Boolean)
//     );

//     const existing100 = new Set(
//       existingArticles
//         .map((a) => (a.codeSage100 ? String(a.codeSage100).trim() : null))
//         .filter(Boolean)
//     );

//     const seenX3 = new Set<string>();
//     const seen100 = new Set<string>();

//     const articlesToCreate = normalizedPayload.filter((item: any) => {
//       const x3 = item.codeSageX3;
//       const s100 = item.codeSage100;

//       if (x3 && existingX3.has(x3)) return false;
//       if (s100 && existing100.has(s100)) return false;

//       if (x3 && seenX3.has(x3)) return false;
//       if (s100 && seen100.has(s100)) return false;

//       if (x3) seenX3.add(x3);
//       if (s100) seen100.add(s100);

//       return true;
//     });

//     if (articlesToCreate.length === 0) {
//       return res.status(200).json({
//         success: true,
//         message: 'Tous les articles existent déjà dans cette campagne',
//         createdCount: 0,
//         skippedCount: normalizedPayload.length,
//         createdArticles: [],
//       });
//     }

//     const createdArticles = await prisma.$transaction(
//       articlesToCreate.map((item: any) =>
//         prisma.article.create({
//           data: {
//             campaignId,
//             codeSageX3: item.codeSageX3,
//             codeSage100: item.codeSage100,
//             designation: item.designation || '',
//             plannedQuantity: item.plannedQuantity,
//             quantityAtCreation: item.quantityAtCreation,
//             quantityAtStart: item.quantityAtStart,
//             currentQuantity: item.currentQuantity,
//             quantityAtClosure: item.quantityAtClosure,
//           },
//         })
//       )
//     );

//     console.log('createdArticles:', createdArticles);

//     return res.status(201).json({
//       success: true,
//       message: 'Articles enregistrés avec succès',
//       createdCount: createdArticles.length,
//       skippedCount: normalizedPayload.length - createdArticles.length,
//       createdArticles,
//     });
//   } catch (error) {
//     console.error('Bulk articles error:', error);
//     next(error);
//   }
// });


/**
 * Enregistrer plusieurs articles dans la campagne
 */
router.post('/:id/articles/bulk', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const rawCampaignId = req.params.id;
    const campaignId = toValidNumber(rawCampaignId, 'campaignId');

    if (!r.user?.userId) {
      return res.status(401).json({
        message: 'Utilisateur non authentifié',
      });
    }

    const currentUserId = Number(r.user.userId);

    console.log('=== BULK ARTICLES START ===');
    console.log('rawCampaignId:', rawCampaignId);
    console.log('campaignId:', campaignId);
    console.log('currentUserId:', currentUserId);
    console.log('req.body:', JSON.stringify(req.body, null, 2));

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true },
    });

    if (!campaign) {
      return res.status(404).json({
        message: 'Campagne introuvable',
      });
    }

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
            quantityAtStart: item.quantityAtStart,
            currentQuantity: item.currentQuantity,
            quantityAtClosure: item.quantityAtClosure,
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

    console.log('createdArticles:', createdArticles);

    return res.status(201).json({
      success: true,
      message: 'Articles enregistrés avec succès',
      createdCount: createdArticles.length,
      skippedCount: normalizedPayload.length - createdArticles.length,
      createdArticles,
    });
  } catch (error) {
    console.error('Bulk articles error:', error);
    next(error);
  }
});

/**
 * Supprimer un article
 */
router.delete('/:id/articles/:articleId', requireAuth, async (req, res, next) => {
  try {
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


export default router;