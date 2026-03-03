import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          setUser(data);
        } catch (error) {
          localStorage.removeItem('accessToken');
          delete api.defaults.headers.common.Authorization;
          setUser(null);
        }
      }else{
        setUser(null);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('accessToken', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`; // ✅
    setUser(user);
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
