import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

interface UserPermissions {
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

  canViewDashboard: boolean;
  canViewStrategicDashboard: boolean;
  canViewCampaigns: boolean;
  canViewObjectives: boolean;
  canViewTasks: boolean;
  canViewLeads: boolean;
  canViewExpenses: boolean;
  canViewSettings: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: UserPermissions;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const defaultPermissions: UserPermissions = {
  canViewAllCampaigns: false,
  canEditAllCampaigns: false,
  canDeleteAllCampaigns: false,
  canCreateCampaign: false,

  canManageTasks: false,
  canAssignTasks: false,

  canManageCampaignArticles: false,
  canManageAttachments: false,

  canManageUsers: false,
  canManageRoles: false,
  canExportCampaign: false,

  canViewDashboard: false,
  canViewStrategicDashboard: false,
  canViewCampaigns: false,
  canViewObjectives: false,
  canViewTasks: false,
  canViewLeads: false,
  canViewExpenses: false,
  canViewSettings: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(rawUser: any): User {
  return {
    id: String(rawUser?.id ?? ''),
    username: rawUser?.username ?? '',
    email: rawUser?.email ?? '',
    role: rawUser?.role ?? '',
    permissions: {
      ...defaultPermissions,
      ...(rawUser?.permissions ?? {}),
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          const { data } = await api.get('/auth/me');
          setUser(normalizeUser(data));
        } catch (error) {
          localStorage.removeItem('accessToken');
          delete api.defaults.headers.common.Authorization;
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('accessToken', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(normalizeUser(user));
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};