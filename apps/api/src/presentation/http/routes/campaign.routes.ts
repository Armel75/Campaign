import { Router, Request } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        objective: true,
        createdBy: { select: { username: true } },
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
        _count: { select: { leads: true, tasks: true } },
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

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        objectiveId: toValidNumber(objectiveId, 'objectiveId'),
        startDate: toValidDate(startDate),
        endDate: toValidDate(endDate),
        status,
        createdById: r.user.userId,

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
        })),
      });
    }

    const fullCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: {
        objective: true,
        createdBy: { select: { username: true } },
        channels: { include: { channel: true } },
        targetAudiences: { include: { targetAudience: true } },
        attachments: true,
      },
    });

    res.status(201).json({ data: fullCampaign });
  } catch (error) {
    next(error);
  }
});

// Get One
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const campaignId = toValidNumber(req.params.id, 'campaignId');

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        objective: true,
        createdBy: { select: { username: true } },
        channels: { include: { channel: true } },
        targetAudiences: { include: { targetAudience: true } },
        attachments: true,
        metrics: true,
        kpiTargets: true,
        tasks: true,
        leads: { take: 5, orderBy: { createdAt: 'desc' } },
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

export default router;