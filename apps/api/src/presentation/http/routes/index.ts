import { Router } from 'express';
import authRoutes from './auth.routes';
import campaignRoutes from './campaign.routes';
import genericRoutes from './generic.routes';
import userRoutes from './user.routes';
import taskRoutes from './task.routes';
import glpiUserRoutes from './glpi-user.routes';
import leadRoutes from './lead.routes';
import expenseRoutes from './expense.routes';
import leadActivityRoutes from './lead-activity.routes';
import conversionRoutes from './conversion.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);

// Generic routes for other resources
router.use('/objectives', genericRoutes('objective'));
router.use('/channels', genericRoutes('channel'));
router.use('/target-audiences', genericRoutes('targetAudience'));
router.use('/budget-plans', genericRoutes('budgetPlan'));
router.use('/budget-lines', genericRoutes('budgetLine'));
router.use('/tasks', taskRoutes);

// Dedicated routes
router.use('/leads', leadRoutes);
router.use('/lead-activities', leadActivityRoutes);
router.use('/conversions', conversionRoutes);
router.use('/expenses', expenseRoutes);
router.use('/users', userRoutes);
router.use('/glpi-users', glpiUserRoutes);
router.use('/roles', genericRoutes('role'));
router.use('/notifications', notificationRoutes);

export default router;