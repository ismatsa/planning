import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppRole = 'administrateur' | 'contributeur';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const fetchRoleAndPermissions = useCallback(async (userId: string) => {
    const [rolesRes, permsRes, profileRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('user_permissions').select('poste_id').eq('user_id', userId),
      supabase.from('profiles').select('active').eq('id', userId).single(),
    ]);

    // If user is deactivated, sign them out
    if (profileRes.data && !profileRes.data.active) {
      await supabase.auth.signOut();
      return;
    }

    const userRole = (rolesRes.data?.[0]?.role as AppRole) || null;
    setRole(userRole);
    setPermissions(permsRes.data?.map((p: any) => p.poste_id) || []);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(() => fetchRoleAndPermissions(u.id), 0);
      } else {
        setRole(null);
        setPermissions([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchRoleAndPermissions(u.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchRoleAndPermissions]);

  const refreshAuth = useCallback(async () => {
    if (user) await fetchRoleAndPermissions(user.id);
  }, [user, fetchRoleAndPermissions]);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signup = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? error.message : null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateEmail = useCallback(async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ email });
    return error ? error.message : null;
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? error.message : null;
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      user,
      loading,
      role,
      isAdmin: role === 'administrateur',
      permissions,
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
