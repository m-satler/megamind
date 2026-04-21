import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  me as fetchMe,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getToken,
  type Me,
} from './api';

interface AuthState {
  user: Me | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, starting_balance?: number) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const m = await fetchMe();
      setUser(m);
    } catch (e: any) {
      setUser(null);
      setError(e?.message ?? 'Session expired');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    setError(null);
    await apiLogin(email, password);
    await refresh();
  };

  const register = async (email: string, password: string, starting_balance = 10000) => {
    setError(null);
    await apiRegister(email, password, starting_balance);
    await refresh();
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, error, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
