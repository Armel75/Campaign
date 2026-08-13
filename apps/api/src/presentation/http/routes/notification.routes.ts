import { Router, Response } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth, AuthRequest } from '../middlewares/auth';

const router = Router();

// Liste des notifications de l'utilisateur connecté
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.userId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    res.json({
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] Erreur de liste:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des notifications' });
  }
});

// Nombre de notifications non lues
router.get('/unread-count', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.userId);
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    res.json({ count });
  } catch (error) {
    console.error('[NOTIFICATIONS] Erreur de comptage:', error);
    res.status(500).json({ message: 'Erreur lors du comptage' });
  }
});

// Marquer une notification comme lue
router.patch('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.userId);
    const notificationId = Number(req.params.id);

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification introuvable' });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[NOTIFICATIONS] Erreur de lecture:', error);
    res.status(500).json({ message: 'Erreur lors du marquage' });
  }
});

// Marquer toutes les notifications comme lues
router.post('/mark-all-read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.userId);
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[NOTIFICATIONS] Erreur de lecture totale:', error);
    res.status(500).json({ message: 'Erreur lors du marquage' });
  }
});

export default router;
