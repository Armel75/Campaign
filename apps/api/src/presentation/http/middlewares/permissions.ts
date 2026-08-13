import { Response, NextFunction } from 'express';
import { ApiError } from '@campaign/shared';
import { AuthRequest } from './auth';

export type PermissionKey =
  // Campaign permissions
  | 'canViewAllCampaigns'
  | 'canEditAllCampaigns'
  | 'canDeleteAllCampaigns'
  | 'canCreateCampaign'

  // Tasks
  | 'canManageTasks'
  | 'canAssignTasks'

  // Campaign content
  | 'canManageCampaignArticles'
  | 'canManageAttachments'
  | 'canViewCampaigns'

  // Administration
  | 'canManageUsers'
  | 'canManageRoles'
  | 'canExportCampaign'

  // UI visibility permissions
  | 'canViewDashboard'
  | 'canViewStrategicDashboard'
  | 'canViewCampaigns'
  | 'canViewObjectives'
  | 'canViewTasks'
  | 'canViewLeads'
  | 'canViewExpenses'
  | 'canViewSettings';

export const requirePermission = (permission: PermissionKey) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' } as ApiError);
    }

    if (!req.user[permission]) {
      return res.status(403).json({
        message: `Forbidden: missing permission ${permission}`,
      } as ApiError);
    }

    next();
  };
};

export const requireAnyPermission = (permissions: PermissionKey[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' } as ApiError);
    }

    const hasAtLeastOnePermission = permissions.some(
      (permission) => req.user?.[permission] === true
    );

    if (!hasAtLeastOnePermission) {
      return res.status(403).json({
        message: `Forbidden: requires one of [${permissions.join(', ')}]`,
      } as ApiError);
    }

    next();
  };
};

export const requireAllPermissions = (permissions: PermissionKey[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' } as ApiError);
    }

    const hasAllPermissions = permissions.every(
      (permission) => req.user?.[permission] === true
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        message: `Forbidden: requires all of [${permissions.join(', ')}]`,
      } as ApiError);
    }

    next();
  };
};