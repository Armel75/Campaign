import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '@campaign/shared';
import prisma from '../../../infrastructure/prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    roleId: number;
    role: string;

    // Campaign permissions
    canViewAllCampaigns: boolean;
    canEditAllCampaigns: boolean;
    canDeleteAllCampaigns: boolean;
    canCreateCampaign: boolean;

    // Tasks
    canManageTasks: boolean;
    canAssignTasks: boolean;

    // Campaign content
    canManageCampaignArticles: boolean;
    canManageAttachments: boolean;

    // Administration
    canManageUsers: boolean;
    canManageRoles: boolean;
    canExportCampaign: boolean;

    // UI visibility permissions
    canViewDashboard: boolean;
    canViewStrategicDashboard: boolean;
    canViewCampaigns: boolean;
    canViewObjectives: boolean;
    canViewTasks: boolean;
    canViewLeads: boolean;
    canViewExpenses: boolean;
    canViewSettings: boolean;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' } as ApiError);
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Invalid token' } as ApiError);
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super-secret-jwt-key-change-me'
    ) as { userId?: number | string };

    const userId = Number(decoded.userId);

    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' } as ApiError);
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        roleId: true,
        role: {
          select: {
            name: true,

            // Campaign permissions
            canViewAllCampaigns: true,
            canEditAllCampaigns: true,
            canDeleteAllCampaigns: true,
            canCreateCampaign: true,

            // Tasks
            canManageTasks: true,
            canAssignTasks: true,

            // Campaign content
            canManageCampaignArticles: true,
            canManageAttachments: true,

            // Administration
            canManageUsers: true,
            canManageRoles: true,
            canExportCampaign: true,

            // UI visibility permissions
            canViewDashboard: true,
            canViewStrategicDashboard: true,
            canViewCampaigns: true,
            canViewObjectives: true,
            canViewTasks: true,
            canViewLeads: true,
            canViewExpenses: true,
            canViewSettings: true,
          },
        },
      },
    });

    if (!currentUser || !currentUser.role) {
      return res.status(401).json({ message: 'User not found or role missing' } as ApiError);
    }

    req.user = {
      userId: currentUser.id,
      roleId: currentUser.roleId,
      role: currentUser.role.name,

      // Campaign permissions
      canViewAllCampaigns: currentUser.role.canViewAllCampaigns ?? false,
      canEditAllCampaigns: currentUser.role.canEditAllCampaigns ?? false,
      canDeleteAllCampaigns: currentUser.role.canDeleteAllCampaigns ?? false,
      canCreateCampaign: currentUser.role.canCreateCampaign ?? false,

      // Tasks
      canManageTasks: currentUser.role.canManageTasks ?? false,
      canAssignTasks: currentUser.role.canAssignTasks ?? false,

      // Campaign content
      canManageCampaignArticles:
        currentUser.role.canManageCampaignArticles ?? false,
      canManageAttachments: currentUser.role.canManageAttachments ?? false,

      // Administration
      canManageUsers: currentUser.role.canManageUsers ?? false,
      canManageRoles: currentUser.role.canManageRoles ?? false,
      canExportCampaign: currentUser.role.canExportCampaign ?? false,

      // UI visibility permissions
      canViewDashboard: currentUser.role.canViewDashboard ?? false,
      canViewStrategicDashboard: currentUser.role.canViewStrategicDashboard ?? false,
      canViewCampaigns: currentUser.role.canViewCampaigns ?? false,
      canViewObjectives: currentUser.role.canViewObjectives ?? false,
      canViewTasks: currentUser.role.canViewTasks ?? false,
      canViewLeads: currentUser.role.canViewLeads ?? false,
      canViewExpenses: currentUser.role.canViewExpenses ?? false,
      canViewSettings: currentUser.role.canViewSettings ?? false,
    };

    next();
  } catch (error) {
  console.error('[requireAuth ERROR]', error);
  return res.status(401).json({ message: 'Invalid token' } as ApiError);
}
};