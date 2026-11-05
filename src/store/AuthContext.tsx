import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setCsrfToken, type ApiUser } from '@/lib/api';

export type AppRole = 'administrateur' | 'contributeur';

/** Forme compatible avec l'ancien objet User de Supabase (id string, email). */
export interface AppUser {
  id: string;
  email: string;
  name: string;
  company: string | null;
  apiRole: 'admin' | 'contributor';
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AppUser | null;
  loading: boolean;
  role: AppRole | null;
  isAdmin: boolean;
  permissions: string[];
  login: (email: string, password: string) => Promise<string | null>;
  signup: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateEmail: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function toAppUser(u: ApiUser): AppUser {
  return { id: String(u.id), email: u.login, name: u.name, company: u.company, apiRole: u.role };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const { user: u, csrf } = await api.get<{ user: ApiUser | null; csrf: string | null }>('/auth/me');
      setCsrfToken(csrf);
      setUser(u ? toAppUser(u) : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const refreshAuth = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const { user: u, csrf } = await api.post<{ user: ApiUser; csrf: string }>('/auth/login', { login: email, password });
      setCsrfToken(csrf);
      setUser(toAppUser(u));
      return null;
    } catch (e: any) {
      return e?.message || 'Erreur de connexion.';
    }
  }, []);

  const signup = useCallback(async (): Promise<string | null> => {
    return 'La création de compte est réservée à l\'administrateur.';
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setCsrfToken(null);
      setUser(null);
    }
  }, []);

  const updateEmail = useCallback(async (): Promise<string | null> => {
    return 'Contactez l\'administrateur pour changer votre identifiant.';
  }, []);

  const updatePassword = useCallback(async (): Promise<string | null> => {
    return 'Contactez l\'administrateur pour changer votre mot de passe.';
  }, []);

  const role: AppRole | null = user ? (user.apiRole === 'admin' ? 'administrateur' : 'contributeur') : null;

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      user,
      loading,
      role,
      isAdmin: role === 'administrateur',
      permissions: [],
      login,
      signup,
      logout,
      updateEmail,
      updatePassword,
      refreshAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
