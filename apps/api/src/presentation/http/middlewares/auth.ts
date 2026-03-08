import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '@campaign/shared';
import prisma from '../../../infrastructure/prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    roleId: number;
    role: string;

    canViewAllCampaigns: boolean;
    canEditAllCampaigns: boolean;
    canDeleteAllCampaigns: boolean;
    canCreateCampaign: boolean;

    canManageTasks: boolean;
    canAssignTasks: boolean;

    canManageCampaignArticles: boolean;
    canManageAttachments: boolean;

    canManageUsers: boolean;
    canManageRoles: boolean;
    canExportCampaign: boolean;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    ) as any;

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

            canViewAllCampaigns: true,
            canEditAllCampaigns: true,
            canDeleteAllCampaigns: true,
            canCreateCampaign: true,

            canManageTasks: true,
            canAssignTasks: true,

            canManageCampaignArticles: true,
            canManageAttachments: true,

            canManageUsers: true,
            canManageRoles: true,
            canExportCampaign: true,
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

      canViewAllCampaigns: currentUser.role.canViewAllCampaigns ?? false,
      canEditAllCampaigns: currentUser.role.canEditAllCampaigns ?? false,
      canDeleteAllCampaigns: currentUser.role.canDeleteAllCampaigns ?? false,
      canCreateCampaign: currentUser.role.canCreateCampaign ?? false,

      canManageTasks: currentUser.role.canManageTasks ?? false,
      canAssignTasks: currentUser.role.canAssignTasks ?? false,

      canManageCampaignArticles: currentUser.role.canManageCampaignArticles ?? false,
      canManageAttachments: currentUser.role.canManageAttachments ?? false,

      canManageUsers: currentUser.role.canManageUsers ?? false,
      canManageRoles: currentUser.role.canManageRoles ?? false,
      canExportCampaign: currentUser.role.canExportCampaign ?? false,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' } as ApiError);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' } as ApiError);
    }

    next();
  };
};