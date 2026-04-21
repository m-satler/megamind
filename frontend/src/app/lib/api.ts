/**
 * Thin client for the MegaMind Flask backend.
 *
 * Uses a relative base URL by default (`/api`) so the Vite dev proxy in
 * vite.config.ts forwards requests to Flask on :5000. Override with
 * VITE_API_BASE_URL in frontend/.env for alternate deployments.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface StockDetailData extends Quote {
  peRatio: number | null;
  marketCap: string;
  volume: string;
  high52Week: number;
  low52Week: number;
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Prediction {
  ticker: string;
  currentPrice: number;
  predictedPrice: number;
  pctChange: number;
  signal: 'BUY' | 'HOLD' | string;
  metrics?: { cached?: boolean; mae?: number; rmse?: number; val_loss?: number };
}

export interface UserProfile {
  annual_income: number | null;
  credit_score: number | null;
  experience_level: string | null;
  risk_tolerance: string | null;
  investment_horizon: string | null;
  existing_holdings: any;
}

export interface Me {
  user_id: string;
  email: string;
  created_at: string | null;
  last_login: string | null;
  balance: number;
  profile: UserProfile | null;
  profile_complete: boolean;
}

export interface PortfolioItem {
  ticker: string;
  company_name: string | null;
  shares_held: number;
  purchase_price: number;
  purchased_at: string;
}

// ── Token storage ─────────────────────────────────────────────────────────
const TOKEN_KEY = 'megamind.token';
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

function authHeader(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    // Headers MUST be spread last — otherwise `...init` clobbers the merged
    // object and we lose Content-Type, which makes Flask's get_json() return
    // None and silently drops the request body.
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      // Show BOTH error (the label, e.g. "Database error") AND detail (the
      // underlying psycopg2/driver message) so real causes surface in the UI.
      const parts = [body.error, body.detail].filter(Boolean);
      detail = parts.join(' — ');
    } catch {
      /* ignore */
    }
    // 401 → token is bad; clear it so the UI redirects to login.
    if (res.status === 401) setToken(null);
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`);
  }
  return res.json() as Promise<T>;
}

// ── Public market data ────────────────────────────────────────────────────
export async function fetchQuotes(tickers: string[]): Promise<Quote[]> {
  if (!tickers.length) return [];
  const qs = encodeURIComponent(tickers.join(','));
  const data = await request<{ quotes: Quote[] }>(`/api/stocks/quote?tickers=${qs}`);
  return data.quotes;
}

export async function fetchStockDetail(ticker: string): Promise<StockDetailData> {
  return request<StockDetailData>(`/api/stocks/${encodeURIComponent(ticker)}`);
}

export async function fetchStockHistory(ticker: string, days = 90): Promise<Candle[]> {
  const data = await request<{ candles: Candle[] }>(
    `/api/stocks/${encodeURIComponent(ticker)}/history?days=${days}`
  );
  return data.candles;
}

export async function fetchPrediction(ticker: string): Promise<Prediction> {
  return request<Prediction>(`/api/predict/${encodeURIComponent(ticker)}`);
}

// ── Auth ──────────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const res = await request<{ token: string; user_id: string; email: string; balance: number }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) }
  );
  setToken(res.token);
  return res;
}

export async function register(email: string, password: string, starting_balance = 10000) {
  const res = await request<{ token: string; user_id: string; email: string; balance: number }>(
    '/api/auth/register',
    { method: 'POST', body: JSON.stringify({ email, password, starting_balance }) }
  );
  setToken(res.token);
  return res;
}

export async function me(): Promise<Me> {
  return request<Me>('/api/auth/me', { headers: authHeader() });
}

export async function updateProfile(profile: Partial<UserProfile>) {
  return request<{ message: string }>('/api/auth/profile', {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify(profile),
  });
}

export function logout() {
  setToken(null);
}

// ── Watchlist / portfolio ─────────────────────────────────────────────────
export async function getWatchlist() {
  return request<{ watchlist: { ticker: string; company_name: string; added_at: string }[] }>(
    '/api/watchlist',
    { headers: authHeader() }
  );
}

export async function addWatchlist(ticker: string, company_name?: string) {
  return request('/api/watchlist', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ ticker, company_name }),
  });
}

export async function removeWatchlist(ticker: string) {
  return request(`/api/watchlist/${encodeURIComponent(ticker)}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
}

export async function getPortfolio() {
  return request<{ portfolio: PortfolioItem[]; balance: number }>(
    '/api/portfolio',
    { headers: authHeader() }
  );
}

export async function getTradeHistory() {
  return request<{
    history: {
      ticker: string;
      type: 'BUY' | 'SELL';
      shares: number;
      price_per_share: number;
      total_amount: number;
      executed_at: string;
    }[];
  }>('/api/trades/history', { headers: authHeader() });
}

export async function buyStock(ticker: string, company_name: string, shares: number, price_per_share: number) {
  return request<{ new_balance: number }>('/api/trades/buy', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ ticker, company_name, shares, price_per_share }),
  });
}

export async function sellStock(ticker: string, shares: number, price_per_share: number) {
  return request<{ new_balance: number }>('/api/trades/sell', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ ticker, shares, price_per_share }),
  });
}

// ── Alerts ────────────────────────────────────────────────────────────────
export interface Alert {
  id: string;
  ticker: string;
  company_name: string | null;
  session: 'pre-open' | 'post-close';
  date: string;
  from_price: number;
  to_price: number;
  pct_change: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
}

export async function fetchAlerts(threshold?: number) {
  const qs = threshold !== undefined ? `?threshold=${threshold}` : '';
  return request<{
    alerts: Alert[];
    threshold: number;
    generated_at: string;
    watched_count: number;
  }>(`/api/alerts${qs}`, { headers: authHeader() });
}

