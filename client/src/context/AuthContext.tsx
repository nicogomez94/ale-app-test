import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface User {
  id: string;
  email: string;
  nombre: string;
  plan: string;
  estado: string;
  avatar?: string;
  telefono?: string;
  direccion?: string;
  matriculaPas?: string;
  referralCode: string;
  referidosMes: number;
  referidosTotales: number;
  planVencimiento?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('pas_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch {
      localStorage.removeItem('pas_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const { token, user: userData } = await api.auth.login(email, password);
    localStorage.setItem('pas_token', token);
    setUser(userData);
  };

  const register = async (nombre: string, email: string, password: string) => {
    const { token, user: userData } = await api.auth.register(nombre, email, password);
    localStorage.setItem('pas_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('pas_token');
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
