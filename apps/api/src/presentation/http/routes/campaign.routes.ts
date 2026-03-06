import { Router, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth, AuthRequest } from '../middlewares/auth';

const router = Router();

// List
router.get('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        objective: true,
        createdBy: { select: { username: true } },
        _count: { select: { leads: true, tasks: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ data: campaigns });
  } catch (error) {
    next(error);
  }
});

// Create
router.post('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, objectiveId, startDate, endDate, status } = req.body;
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        objectiveId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status,
        createdById: req.user!.userId,
      },
    });
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

// Get One
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        objective: true,
        channels: { include: { channel: true } },
        metrics: true,
        kpiTargets: true,
        tasks: { include: { assignee: { select: { username: true, email: true } } } },
        leads: { take: 5, orderBy: { createdAt: 'desc' } },
        articles: true,
        attachments: true,
        createdBy: { select: { username: true, email: true } },
      },
    });
    if (!campaign) return res.status(404).json({ message: 'Not found' });
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

// Update
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, description, objectiveId, startDate, endDate, status } = req.body;
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        objectiveId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
      },
    });
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

// Delete
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.campaign.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// --- Sub-resources ---

// Add Article
router.post('/:id/articles', requireAuth, async (req, res, next) => {
  try {
    const { articleCode, designation, quantity, source } = req.body;
    const article = await prisma.campaignArticle.create({
      data: {
        campaignId: req.params.id,
        articleCode,
        designation,
        quantity: Number(quantity),
        source,
      },
    });
    res.status(201).json(article);
  } catch (error) {
    next(error);
  }
});

// Delete Article
router.delete('/:id/articles/:articleId', requireAuth, async (req, res, next) => {
  try {
    await prisma.campaignArticle.delete({
      where: { id: req.params.articleId },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Add Task
router.post('/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const { title, description, assignedTo, dueDate, status } = req.body;
    const task = await prisma.task.create({
      data: {
        campaignId: req.params.id,
        title,
        description,
        assignedTo,
        dueDate: new Date(dueDate),
        status,
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
    const { title, description, assignedTo, dueDate, status } = req.body;
    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data: {
        title,
        description,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
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
    await prisma.task.delete({
      where: { id: req.params.taskId },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Add Attachment
router.post('/:id/attachments', requireAuth, async (req, res, next) => {
  try {
    const { fileName, filePath, entityType } = req.body;
    const attachment = await prisma.attachment.create({
      data: {
        campaignId: req.params.id,
        fileName,
        filePath,
        entityType: entityType || 'CAMPAIGN',
        entityId: req.params.id,
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

export default router;
