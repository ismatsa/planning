import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Credentials {
  username: string;
  password: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  credentials: Credentials;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateCredentials: (newCreds: Credentials) => void;
}

const DEFAULT_CREDENTIALS: Credentials = { username: 'admin', password: 'admin' };

function loadCredentials(): Credentials {
  try {
    const raw = localStorage.getItem('atelier_credentials');
    return raw ? JSON.parse(raw) : DEFAULT_CREDENTIALS;
  } catch {
    return DEFAULT_CREDENTIALS;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem('atelier_auth') === 'true'
  );
  const [username, setUsername] = useState<string | null>(
    () => localStorage.getItem('atelier_auth_user')
  );
  const [credentials, setCredentials] = useState<Credentials>(loadCredentials);

  useEffect(() => {
    localStorage.setItem('atelier_credentials', JSON.stringify(credentials));
  }, [credentials]);

  const login = useCallback((user: string, pass: string): boolean => {
    if (user === credentials.username && pass === credentials.password) {
      setIsAuthenticated(true);
      setUsername(user);
      localStorage.setItem('atelier_auth', 'true');
      localStorage.setItem('atelier_auth_user', user);
      return true;
    }
    return false;
  }, [credentials]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUsername(null);
    localStorage.removeItem('atelier_auth');
    localStorage.removeItem('atelier_auth_user');
  }, []);

  const updateCredentials = useCallback((newCreds: Credentials) => {
    setCredentials(newCreds);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, credentials, login, logout, updateCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
