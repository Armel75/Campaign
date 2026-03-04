import { Router } from 'express';
import authRoutes from './auth.routes';
import campaignRoutes from './campaign.routes';
import genericRoutes from './generic.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);

// Generic routes for other resources
router.use('/objectives', genericRoutes('objective'));
router.use('/channels', genericRoutes('channel'));
router.use('/target-audiences', genericRoutes('targetAudience'));
router.use('/tasks', genericRoutes('task'));
router.use('/leads', genericRoutes('lead'));
router.use('/expenses', genericRoutes('expense'));
router.use('/users', userRoutes); // Dedicated user routes
router.use('/roles', genericRoutes('role'));

export default router;
