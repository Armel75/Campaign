import { Router } from 'express';
import authRoutes from './auth.routes';
import campaignRoutes from './campaign.routes';
import genericRoutes from './generic.routes';

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
router.use('/users', genericRoutes('user')); // Should be protected admin only
router.use('/roles', genericRoutes('role'));

export default router;
