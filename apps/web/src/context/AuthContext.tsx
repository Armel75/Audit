import { apiFetch } from '@/lib/api';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  matricule: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const decodeTokenPermissions = (token: string | null): string[] => {
  if (!token) return [];

  try {
    const [, payload] = token.split('.');

    if (!payload) return [];

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(normalizedPayload);
    const parsedPayload = JSON.parse(decodedPayload);

    return Array.isArray(parsedPayload.permissions) ? parsedPayload.permissions : [];
  } catch {
    return [];
  }
};

const attachPermissionsToUser = (user: User | null, token: string | null): User | null => {
  if (!user) return null;

  const permissions = user.permissions?.length ? user.permissions : decodeTokenPermissions(token);

  return {
    ...user,
    permissions
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      const parsedUser = attachPermissionsToUser(JSON.parse(storedUser), token);
      setUser(parsedUser);
      localStorage.setItem('user', JSON.stringify(parsedUser));
    }
    setIsLoading(false);
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    const normalizedUser = attachPermissionsToUser(newUser, newToken);
    localStorage.setItem('accessToken', newToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(newToken);
    setUser(normalizedUser);
  };
  
const logout = async () => {
  try {
    await apiFetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include', // ✅ obligatoire ici
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }
};


  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading }}>
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
