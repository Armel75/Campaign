import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { getCurrentUserWithRole } from '../../../services/user.service';
import { parseDateRange, toPrismaDateFilter } from '../../../infrastructure/utils/dateRange';
import { parseCsvList } from '../../../infrastructure/utils/queryParams';
import { canDeleteTask } from '../../../services/taskPermissions';

const router = Router();

type CurrentUserWithRole = {
  id: number;
  role?: {
    canViewAllCampaigns?: boolean;
    canEditAllCampaigns?: boolean;
    canDeleteAllCampaigns?: boolean;
    canManageTasks?: boolean;
    canAssignTasks?: boolean;
    canViewTasks?: boolean;
  } | null;
};

function toValidDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

function toValidNumber(value: string | number, fieldName: string) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return num;
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

function canAccessOwnTask(
  currentUser: CurrentUserWithRole,
  taskCreatedById: number
) {
  return currentUser.id === taskCreatedById;
}

function canViewTask(
  currentUser: CurrentUserWithRole,
  taskCreatedById: number
) {
  return (
    !!currentUser.role?.canViewAllCampaigns ||
    canAccessOwnTask(currentUser, taskCreatedById)
  );
}

function canEditTask(
  currentUser: CurrentUserWithRole,
  taskCreatedById: number
) {
  return (
    !!currentUser.role?.canEditAllCampaigns ||
    canAccessOwnTask(currentUser, taskCreatedById)
  );
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

const allowedStatuses = ['A_FAIRE', 'EN_COURS', 'TERMINE', 'ANNULE'];
const allowedPriorities = ['FAIBLE', 'MOYENNE', 'ELEVEE', 'URGENTE'];

/** Champs de tri autorisés pour la liste des tâches. */
const SORTABLE_FIELDS = ['updatedAt', 'createdAt', 'dueDate'] as const;
type TaskSortField = (typeof SORTABLE_FIELDS)[number];

/**
 * Forme structurelle compatible avec l'`orderBy` Prisma (aucun cast nécessaire).
 * Par défaut : `updatedAt desc` — comportement historique inchangé.
 */
type TaskOrderBy =
  | { updatedAt: 'asc' | 'desc' }
  | { createdAt: 'asc' | 'desc' }
  | { dueDate: 'asc' | 'desc' };

function normalizeTaskStatus(status?: string) {
  if (!status) return 'A_FAIRE';
  const normalized = TASK_STATUS_LABEL_TO_CODE[String(status).trim()];
  return normalized || String(status).trim();
}

// List
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canViewTasks) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : consultation des tâches non autorisée' });
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const priority = typeof req.query.priority === 'string' ? req.query.priority.trim() : '';
    const pageRaw = typeof req.query.page === 'string' ? req.query.page : undefined;
    const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : undefined;

    // Bornes facultatives : `from`/`to` filtrent la date de CRÉATION,
    // `dueFrom`/`dueTo` filtrent l'ÉCHÉANCE (`dueDate`).
    const createdRange = parseDateRange(req.query as Record<string, unknown>, 'from', 'to');
    const dueRange = parseDateRange(req.query as Record<string, unknown>, 'dueFrom', 'dueTo');
    const rangeError = createdRange.error || dueRange.error;
    if (rangeError) {
      return res.status(400).json({ message: rangeError });
    }
    const createdAtFilter = toPrismaDateFilter(createdRange);
    const dueDateFilter = toPrismaDateFilter(dueRange);

    // `?excludeStatus=TERMINE,ANNULE` — une valeur unique reste acceptée
    const excludeStatuses = parseCsvList(req.query.excludeStatus, allowedStatuses);
    if (excludeStatuses.invalid.length > 0) {
      return res.status(400).json({
        message: `Statut à exclure invalide : ${excludeStatuses.invalid.join(', ')}.`,
      });
    }

    // Tri facultatif (`?sortBy=dueDate&sortDir=asc`) — par défaut : updatedAt desc
    const rawSortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : '';
    const rawSortDir = typeof req.query.sortDir === 'string' ? req.query.sortDir.trim() : '';

    if (rawSortBy && !SORTABLE_FIELDS.includes(rawSortBy as TaskSortField)) {
      return res.status(400).json({ message: 'Champ de tri invalide.' });
    }

    if (rawSortDir && rawSortDir !== 'asc' && rawSortDir !== 'desc') {
      return res.status(400).json({ message: 'Direction de tri invalide (asc ou desc).' });
    }

    const sortDirection: 'asc' | 'desc' = rawSortDir === 'asc' ? 'asc' : 'desc';
    const taskOrderBy: TaskOrderBy =
      rawSortBy === 'dueDate'
        ? { dueDate: sortDirection }
        : rawSortBy === 'createdAt'
          ? { createdAt: sortDirection }
          : { updatedAt: rawSortBy ? sortDirection : 'desc' };

    // `?hasDueDate=1` : ne retenir que les tâches ayant une échéance
    // (indispensable pour trier par `dueDate` : en T-SQL les NULL remontent en premier)
    const hasDueDateOnly =
      String(req.query.hasDueDate) === '1' || String(req.query.hasDueDate) === 'true';

    const hasServerQuery =
      !!search || !!status || !!priority || !!pageRaw || !!limitRaw ||
      !!createdAtFilter || !!dueDateFilter || excludeStatuses.values.length > 0 ||
      !!rawSortBy || !!rawSortDir || hasDueDateOnly;

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Statut invalide pour le filtre.',
      });
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        message: 'Priorité invalide pour le filtre.',
      });
    }

    const page = pageRaw ? Math.max(1, Number(pageRaw)) : 1;
    const limit = limitRaw ? Math.max(1, Number(limitRaw)) : 10;

    if ((pageRaw && !Number.isInteger(page)) || (limitRaw && !Number.isInteger(limit))) {
      return res.status(400).json({
        message: 'Paramètres de pagination invalides.',
      });
    }

    const accessFilter = currentUser.role?.canViewAllCampaigns
      ? {}
      : {
        OR: [
          { createdById: currentUser.id },
          { assignedToId: currentUser.id },
        ],
      };

    const searchFilter = search
      ? {
        OR: [
          {
            title: {
              contains: search,
            },
          },
          {
            description: {
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
            createdBy: {
              username: {
                contains: search,
              },
            },
          },
        ],
      }
      : {};

    const filters: any[] = [accessFilter];

    if (status) {
      filters.push({ status });
    }

    if (priority) {
      filters.push({ priority });
    }

    if (createdAtFilter) {
      filters.push({ createdAt: createdAtFilter });
    }

    if (dueDateFilter) {
      filters.push({ dueDate: dueDateFilter });
    }

    if (hasDueDateOnly) {
      filters.push({ dueDate: { not: null } });
    }

    if (excludeStatuses.values.length > 0) {
      filters.push({ status: { notIn: excludeStatuses.values } });
    }

    if (search) {
      filters.push(searchFilter);
    }

    const whereClause = {
      AND: filters,
    };

    if (!hasServerQuery) {
      const tasks = await prisma.task.findMany({
        where: whereClause,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
            },
          },
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
        orderBy: { updatedAt: 'desc' },
      });

      return res.json({ data: tasks });
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
            },
          },
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
        orderBy: taskOrderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({
        where: whereClause,
      }),
    ]);

    return res.json({
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
});

// Get One
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canViewTasks) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : consultation des tâches non autorisée' });
    }

    const taskId = toValidNumber(req.params.id, 'taskId');

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        },
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

    if (!task) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    if (!canViewTask(currentUser, task.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette tâche' });
    }

    res.json({
      data: {
        ...task,
        campaignId: task.campaignId ? String(task.campaignId) : '',
        assignedTo: task.assignedToId ? String(task.assignedToId) : '',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canManageTasks) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : gestion des tâches non autorisée' });
    }

    const {
      title,
      description,
      assignedTo,
      dueDate,
      status,
      campaignId,
      priority,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!campaignId) {
      return res.status(400).json({ message: 'La campagne est obligatoire' });
    }

    const parsedCampaignId = toValidNumber(campaignId, 'campaignId');
    const campaign = await prisma.campaign.findUnique({
      where: { id: parsedCampaignId },
      select: {
        id: true,
        createdById: true,
        name: true,
        status: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campagne introuvable' });
    }

    if (campaign.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible d’ajouter une tâche à une campagne terminée',
      });
    }

    if (!canEditTask(currentUser, campaign.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    const assignedToId = assignedTo ? toValidNumber(assignedTo, 'assignedTo') : null;
    const currentUserId = Number(currentUser.id);

    if (
      assignedToId &&
      assignedToId !== currentUserId &&
      !currentUser.role?.canAssignTasks
    ) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : assignation de tâche non autorisée' });
    }

    const normalizedStatus = normalizeTaskStatus(status);

    if (!allowedStatuses.includes(normalizedStatus)) {
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
          connect: { id: parsedCampaignId },
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
        campaign: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        },
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

    res.status(201).json({ data: task });
  } catch (error) {
    next(error);
  }
});

// Update
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const r = req as AuthRequest;
    const currentUser = await getAuthorizedUser(r, res);
    if (!currentUser) return;

    if (!currentUser.role?.canManageTasks) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : gestion des tâches non autorisée' });
    }

    const taskId = toValidNumber(req.params.id, 'taskId');

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        createdById: true,
        campaignId: true,
      },
    });

    if (!existingTask) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    if (!canEditTask(currentUser, existingTask.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette tâche' });
    }

    const {
      title,
      description,
      assignedTo,
      dueDate,
      status,
      campaignId,
      priority,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!campaignId) {
      return res.status(400).json({ message: 'La campagne est obligatoire' });
    }

    const parsedCampaignId = toValidNumber(campaignId, 'campaignId');
    const campaign = await prisma.campaign.findUnique({
      where: { id: parsedCampaignId },
      select: {
        id: true,
        createdById: true,
        name: true,
        status: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campagne introuvable' });
    }

    if (campaign.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible de modifier une tâche liée à une campagne terminée',
      });
    }

    if (!canEditTask(currentUser, campaign.createdById)) {
      return res.status(403).json({ message: 'Accès refusé à cette campagne' });
    }

    const assignedToId = assignedTo ? toValidNumber(assignedTo, 'assignedTo') : null;
    const currentUserId = Number(currentUser.id);

    if (
      assignedToId &&
      assignedToId !== currentUserId &&
      !currentUser.role?.canAssignTasks
    ) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : assignation de tâche non autorisée' });
    }

    const normalizedStatus = normalizeTaskStatus(status);

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message:
          "Statut invalide. Valeurs autorisées : 'À faire', 'En cours', 'Terminé', 'Annulé'.",
      });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        dueDate: dueDate ? toValidDate(dueDate) : null,
        status: normalizedStatus,
        priority: priority ? String(priority).trim() : undefined,
        campaign: {
          connect: { id: parsedCampaignId },
        },
        assignedTo: assignedToId
          ? {
            connect: { id: assignedToId },
          }
          : {
            disconnect: true,
          },
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
          },
        },
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

    res.json({ data: task });
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

    if (!currentUser.role?.canManageTasks) {
      return res
        .status(403)
        .json({ message: 'Accès refusé : gestion des tâches non autorisée' });
    }

    const taskId = toValidNumber(req.params.id, 'taskId');

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        createdById: true,
        campaignId: true,
      },
    });

    if (!existingTask) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    // Règle métier : seul le créateur de la tâche peut la supprimer
    // (exception : profil disposant de `canDeleteAllCampaigns`).
    if (!canDeleteTask(currentUser.id, currentUser.role, existingTask.createdById)) {
      return res.status(403).json({
        message: 'Accès refusé : seul le créateur de la tâche peut la supprimer',
      });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: existingTask.campaignId },
      select: {
        status: true,
      },
    });

    if (campaign?.status === 'TERMINEE') {
      return res.status(400).json({
        message: 'Impossible de supprimer une tâche liée à une campagne terminée',
      });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    res.json({ message: 'Tâche supprimée avec succès' });
  } catch (error) {
    next(error);
  }
});

export default router;