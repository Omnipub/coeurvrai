'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AccountType, AuthUser } from '@/types';

interface SignupInput {
  email: string;
  password: string;
  accountType: AccountType;
  birthdate: string;
  displayName: string;
  acceptTerms: boolean;
  gdprConsent: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
  /** Recharge l'utilisateur courant (après vérification d'e-mail, par ex.). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Session lue côté serveur (cookie HttpOnly) : 401 = non connecté·e.
  useEffect(() => {
    api<{ user: AuthUser }>('/api/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const res = await api<{ user: AuthUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(res.user);
  }, []);

  const refresh = useCallback(async () => {
    const { user } = await api<{ user: AuthUser }>('/api/auth/me');
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    // Le cookie HttpOnly ne peut être effacé que par le serveur.
    api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
