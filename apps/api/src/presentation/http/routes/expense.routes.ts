import { Router } from 'express';
import prisma from '../../../infrastructure/prisma/client';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { requirePermission } from '../middlewares/permissions';

const router = Router();

function toValidNumber(value: string | number, fieldName: string) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return num;
}

function toValidDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

// List
router.get(
  '/',
  requireAuth,
  requirePermission('canViewExpenses'),
  async (_req, res, next) => {
    try {
      const expenses = await prisma.expense.findMany({
        include: {
          budgetLine: {
            select: {
              id: true,
              label: true,
              plannedAmount: true,
              budgetPlanId: true,
              budgetPlan: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  status: true,
                },
              },
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

      res.json({ data: expenses });
    } catch (error) {
      next(error);
    }
  }
);

// Get one
router.get(
  '/:id',
  requireAuth,
  requirePermission('canViewExpenses'),
  async (req, res, next) => {
    try {
      const expenseId = toValidNumber(req.params.id, 'expenseId');

      const expense = await prisma.expense.findUnique({
        where: {
          id: expenseId,
        },
        include: {
          budgetLine: {
            select: {
              id: true,
              label: true,
              plannedAmount: true,
              budgetPlanId: true,
              budgetPlan: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  status: true,
                },
              },
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

      if (!expense) {
        return res.status(404).json({ message: 'Dépense introuvable' });
      }

      res.json({
        data: {
          ...expense,
          budgetLineId: String(expense.budgetLineId),
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
  requirePermission('canViewExpenses'),
  async (req: AuthRequest, res, next) => {
    try {
      const { budgetLineId, description, amount, expenseDate } = req.body;

      if (!budgetLineId) {
        return res.status(400).json({ message: 'La ligne budgétaire est obligatoire' });
      }

      if (!description || !String(description).trim()) {
        return res.status(400).json({ message: 'La description est obligatoire' });
      }

      if (amount === undefined || amount === null || String(amount).trim() === '') {
        return res.status(400).json({ message: 'Le montant est obligatoire' });
      }

      if (!expenseDate) {
        return res.status(400).json({ message: 'La date est obligatoire' });
      }

      const parsedBudgetLineId = toValidNumber(budgetLineId, 'budgetLineId');

      const budgetLine = await prisma.budgetLine.findUnique({
        where: { id: parsedBudgetLineId },
        select: { id: true },
      });

      if (!budgetLine) {
        return res.status(404).json({ message: 'Ligne budgétaire introuvable' });
      }

      const expense = await prisma.expense.create({
        data: {
          budgetLineId: parsedBudgetLineId,
          createdById: Number(req.user!.userId),
          description: String(description).trim(),
          amount,
          expenseDate: toValidDate(expenseDate),
        },
        include: {
          budgetLine: {
            select: {
              id: true,
              label: true,
              plannedAmount: true,
              budgetPlanId: true,
              budgetPlan: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  status: true,
                },
              },
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

      res.status(201).json({ data: expense });
    } catch (error) {
      next(error);
    }
  }
);

// Update
router.put(
  '/:id',
  requireAuth,
  requirePermission('canViewExpenses'),
  async (req, res, next) => {
    try {
      const expenseId = toValidNumber(req.params.id, 'expenseId');
      const { budgetLineId, description, amount, expenseDate } = req.body;

      const existingExpense = await prisma.expense.findUnique({
        where: { id: expenseId },
        select: { id: true },
      });

      if (!existingExpense) {
        return res.status(404).json({ message: 'Dépense introuvable' });
      }

      if (!budgetLineId) {
        return res.status(400).json({ message: 'La ligne budgétaire est obligatoire' });
      }

      if (!description || !String(description).trim()) {
        return res.status(400).json({ message: 'La description est obligatoire' });
      }

      if (amount === undefined || amount === null || String(amount).trim() === '') {
        return res.status(400).json({ message: 'Le montant est obligatoire' });
      }

      if (!expenseDate) {
        return res.status(400).json({ message: 'La date est obligatoire' });
      }

      const parsedBudgetLineId = toValidNumber(budgetLineId, 'budgetLineId');

      const budgetLine = await prisma.budgetLine.findUnique({
        where: { id: parsedBudgetLineId },
        select: { id: true },
      });

      if (!budgetLine) {
        return res.status(404).json({ message: 'Ligne budgétaire introuvable' });
      }

      const expense = await prisma.expense.update({
        where: { id: expenseId },
        data: {
          budgetLineId: parsedBudgetLineId,
          description: String(description).trim(),
          amount,
          expenseDate: toValidDate(expenseDate),
        },
        include: {
          budgetLine: {
            select: {
              id: true,
              label: true,
              plannedAmount: true,
              budgetPlanId: true,
              budgetPlan: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  status: true,
                },
              },
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

      res.json({ data: expense });
    } catch (error) {
      next(error);
    }
  }
);

// Delete
router.delete(
  '/:id',
  requireAuth,
  requirePermission('canViewExpenses'),
  async (req, res, next) => {
    try {
      const expenseId = toValidNumber(req.params.id, 'expenseId');

      const existingExpense = await prisma.expense.findUnique({
        where: { id: expenseId },
        select: { id: true },
      });

      if (!existingExpense) {
        return res.status(404).json({ message: 'Dépense introuvable' });
      }

      await prisma.expense.delete({
        where: { id: expenseId },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;