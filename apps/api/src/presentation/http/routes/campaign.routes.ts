import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth } from '../middlewares/auth';
import { Request } from "express";

const router = Router();

// List
router.get('/', requireAuth, async (req, res, next) => {
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
router.post('/', requireAuth, async (req, res, next) => {
  try {
    type AuthRequest = Request & { user: { userId: number } };
    const r = req as AuthRequest;
    const { name, description, objectiveId, startDate, endDate, status } = req.body;
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        objectiveId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status,
        createdById: r.user!.userId,
      },
    });
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

// Get One
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        objective: true,
        channels: { include: { channel: true } },
        metrics: true,
        kpiTargets: true,
        tasks: true,
        leads: { take: 5, orderBy: { createdAt: 'desc' } }, // Preview leads
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
      where: { id: Number(req.params.id) },
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
      where: { id: Number(req.params.id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
