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

  // Purge the legacy browser-wide 'watchlist' localStorage key. Earlier
  // versions of the app stored the watchlist client-side without any user
  // scoping, which leaked between accounts sharing the same browser. The
  // watchlist now lives on the server, keyed by the JWT.
  const clearLegacyState = () => {
    try {
      localStorage.removeItem('watchlist');
    } catch {
      /* ignore */
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    clearLegacyState();
    await apiLogin(email, password);
    await refresh();
  };

  const register = async (email: string, password: string, starting_balance = 10000) => {
    setError(null);
    clearLegacyState();
    await apiRegister(email, password, starting_balance);
    await refresh();
  };

  const logout = () => {
    clearLegacyState();
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
