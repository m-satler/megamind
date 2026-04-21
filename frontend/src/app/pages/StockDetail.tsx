import { useParams, useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Brain,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  fetchStockDetail,
  fetchStockHistory,
  fetchPrediction,
  buyStock,
  sellStock,
  getPortfolio,
  type StockDetailData,
  type Candle,
  type Prediction,
} from '../lib/api';
import { CandlestickChart } from '../components/CandlestickChart';
import { useAuth } from '../lib/auth';

export function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const ticker = (symbol || '').toUpperCase();
  const { user, refresh } = useAuth();

  const [stock, setStock] = useState<StockDetailData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // How many shares of this ticker the user already owns (for the sell form)
  const [sharesOwned, setSharesOwned] = useState(0);

  // Prediction has its own state — can take 1-2 min on first call per ticker
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPrediction(null);
    setPredictionError(null);

    Promise.all([fetchStockDetail(ticker), fetchStockHistory(ticker, 90)])
      .then(([detail, hist]) => {
        if (cancelled) return;
        setStock(detail);
        setCandles(hist);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message ?? 'Failed to load stock data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Fetch portfolio to know how many shares of this ticker we already own
    getPortfolio()
      .then((p) => {
        if (cancelled) return;
        const pos = p.portfolio.find((x) => x.ticker === ticker);
        setSharesOwned(pos ? pos.shares_held : 0);
      })
      .catch(() => {
        /* ignore — sell form will just show 0 */
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  // Called by TradePanel after a successful buy/sell so the panel stays in sync.
  const onTradeComplete = async () => {
    await refresh(); // new cash balance for the sidebar
    try {
      const p = await getPortfolio();
      const pos = p.portfolio.find((x) => x.ticker === ticker);
      setSharesOwned(pos ? pos.shares_held : 0);
    } catch {
      /* non-fatal */
    }
  };

  const runPrediction = async () => {
    if (!ticker) return;
    setPredicting(true);
    setPredictionError(null);
    try {
      const result = await fetchPrediction(ticker);
      setPrediction(result);
    } catch (e: any) {
      setPredictionError(e?.message ?? 'Prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  // Derived chart data (memoized)
  const priceHistory = useMemo(
    () =>
      candles.map((c) => ({
        date: c.date.slice(5), // MM-DD for compactness
        price: c.close,
      })),
    [candles]
  );

  const volumeData = useMemo(
    () =>
      candles.slice(-30).map((c) => ({
        date: c.date.slice(5),
        volume: c.volume,
      })),
    [candles]
  );

  const candlestickData = useMemo(() => candles.slice(-60), [candles]);

  // P/E comparison is synthetic — we don't have historical PE from yfinance.
  const peRatioData = useMemo(() => {
    if (!stock?.peRatio) return [];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return months.map((m, i) => {
      const variance = Math.sin(i) * 2;
      return {
        month: m,
        peRatio: Number((stock.peRatio! + variance).toFixed(2)),
        industry: Number((stock.peRatio! * 0.9 + variance * 0.8).toFixed(2)),
      };
    });
  }, [stock?.peRatio]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-6 py-6">
        <p className="text-[#7d8aa3] text-lg font-mono animate-pulse">
          LOADING {ticker}…
        </p>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-6 py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#e4e8f0] mb-4 font-mono">
            {error ? 'FETCH ERROR' : 'STOCK NOT FOUND'}
          </h2>
          {error && <p className="text-[#ff4757] text-sm font-mono mb-4">{error}</p>}
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-[#00d4ff] text-[#0a0e1a] rounded hover:bg-[#00b8e6] transition-colors font-semibold"
          >
            BACK TO TERMINAL
          </button>
        </div>
      </div>
    );
  }

  const isPositive = stock.change >= 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1420] border border-[#00d4ff]/50 p-3 rounded shadow-lg">
          <p className="text-[#7d8aa3] text-xs font-mono mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-[#e4e8f0] text-sm font-mono font-bold"
              style={{ color: entry.color }}
            >
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#00d4ff] hover:text-[#00b8e6] mb-6 font-semibold transition-colors font-mono"
        >
          <ArrowLeft size={20} />
          BACK TO TERMINAL
        </button>

        {/* Stock Info Header */}
        <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-[#e4e8f0] font-mono tracking-wider">
                    {stock.symbol}
                  </h1>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isPositive ? 'bg-[#2ed573]' : 'bg-[#ff4757]'
                    } animate-pulse`}
                  ></div>
                  <span className="text-xs text-[#7d8aa3] font-mono px-2 py-1 bg-[#1a1f2e] rounded border border-[#1e2538]">
                    LIVE
                  </span>
                </div>
                <p className="text-lg text-[#7d8aa3]">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-[#e4e8f0] mb-2 font-mono">
                  ${stock.price.toFixed(2)}
                </p>
                <div
                  className={`flex items-center gap-2 justify-end px-3 py-1.5 rounded border ${
                    isPositive
                      ? 'bg-[#2ed573]/10 text-[#2ed573] border-[#2ed573]/30'
                      : 'bg-[#ff4757]/10 text-[#ff4757] border-[#ff4757]/30'
                  }`}
                >
                  {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  <span className="text-lg font-bold font-mono">
                    {isPositive ? '+' : ''}
                    {stock.change.toFixed(2)} ({isPositive ? '+' : ''}
                    {stock.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-[#1e2538]">
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#1e2538]">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">MARKET CAP</p>
                <p className="text-xl font-bold text-[#e4e8f0] font-mono">${stock.marketCap}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#1e2538]">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">P/E RATIO</p>
                <p className="text-xl font-bold text-[#00d4ff] font-mono">
                  {stock.peRatio ?? 'N/A'}
                </p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#1e2538]">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">VOLUME</p>
                <p className="text-xl font-bold text-[#e4e8f0] font-mono">{stock.volume}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#1e2538]">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">52W RANGE</p>
                <p className="text-xl font-bold text-[#e4e8f0] font-mono">
                  ${stock.low52Week} - ${stock.high52Week}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trade panel (mock money) */}
        <TradePanel
          ticker={stock.symbol}
          companyName={stock.name}
          price={stock.price}
          cashBalance={user?.balance ?? 0}
          sharesOwned={sharesOwned}
          onTradeComplete={onTradeComplete}
          onViewPortfolio={() => navigate('/portfolio')}
        />

        {/* AI Prediction panel */}
        <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6 mb-6">
          <div className="flex items-center justify-between mb-4 border-b border-[#1e2538] pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#a29bfe]/10 p-2 rounded border border-[#a29bfe]/30">
                <Brain size={20} className="text-[#a29bfe]" />
              </div>
              <h2 className="text-xl font-bold text-[#e4e8f0] font-mono">
                LSTM PREDICTION (NEXT CLOSE)
              </h2>
            </div>
            <button
              onClick={runPrediction}
              disabled={predicting}
              className="px-4 py-2 rounded border border-[#a29bfe]/50 bg-[#a29bfe]/10 text-[#a29bfe] hover:bg-[#a29bfe]/20 disabled:opacity-50 font-mono text-sm"
            >
              {predicting ? 'TRAINING/PREDICTING…' : prediction ? 'RE-RUN' : 'RUN PREDICTION'}
            </button>
          </div>

          {predicting && (
            <p className="text-[#7d8aa3] font-mono text-sm">
              First run for a ticker trains a fresh LSTM — this can take 1–2 minutes on CPU.
              Subsequent runs load the cached model and return in seconds.
            </p>
          )}
          {predictionError && (
            <p className="text-[#ff4757] font-mono text-sm">ERROR: {predictionError}</p>
          )}
          {prediction && !predicting && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#1e2538]">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">CURRENT</p>
                <p className="text-xl font-bold text-[#e4e8f0] font-mono">
                  ${prediction.currentPrice.toFixed(2)}
                </p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#a29bfe]/30">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">PREDICTED</p>
                <p className="text-xl font-bold text-[#a29bfe] font-mono">
                  ${prediction.predictedPrice.toFixed(2)}
                </p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#1e2538]">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">DELTA</p>
                <p
                  className={`text-xl font-bold font-mono ${
                    prediction.pctChange >= 0 ? 'text-[#2ed573]' : 'text-[#ff4757]'
                  }`}
                >
                  {prediction.pctChange >= 0 ? '+' : ''}
                  {prediction.pctChange.toFixed(2)}%
                </p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#1e2538]">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">SIGNAL</p>
                <p
                  className={`text-xl font-bold font-mono ${
                    prediction.signal === 'BUY' ? 'text-[#2ed573]' : 'text-[#00d4ff]'
                  }`}
                >
                  {prediction.signal}
                </p>
              </div>
            </div>
          )}
          {!prediction && !predicting && !predictionError && (
            <p className="text-[#7d8aa3] font-mono text-sm">
              Click <span className="text-[#a29bfe]">RUN PREDICTION</span> to train/load the LSTM
              model and forecast the next close.
            </p>
          )}
        </div>

        {/* Charts */}
        <div className="space-y-6">
          {/* Candlestick (K-line) */}
          <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1e2538] pb-4">
              <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
                <BarChart3 size={20} className="text-[#00d4ff]" />
              </div>
              <h2 className="text-xl font-bold text-[#e4e8f0] font-mono">
                CANDLESTICK (LAST {candlestickData.length}D)
              </h2>
            </div>
            <CandlestickChart data={candlestickData} height={420} />
            <div className="mt-4 flex gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2ed573]/10 border border-[#2ed573]/30 rounded">
                <div className="w-2 h-2 bg-[#2ed573] rounded-full"></div>
                <span className="text-[#2ed573]">BULLISH (close ≥ open)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded">
                <div className="w-2 h-2 bg-[#ff4757] rounded-full"></div>
                <span className="text-[#ff4757]">BEARISH (close &lt; open)</span>
              </div>
            </div>
          </div>

          {/* Price History */}
          <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1e2538] pb-4">
              <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
                <Activity size={20} className="text-[#00d4ff]" />
              </div>
              <h2 className="text-xl font-bold text-[#e4e8f0] font-mono">
                PRICE HISTORY ({priceHistory.length}D)
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={priceHistory}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2538" />
                <XAxis
                  dataKey="date"
                  stroke="#7d8aa3"
                  tick={{ fill: '#7d8aa3', fontFamily: 'monospace', fontSize: 10 }}
                  interval={Math.max(1, Math.floor(priceHistory.length / 10))}
                />
                <YAxis
                  stroke="#7d8aa3"
                  domain={['auto', 'auto']}
                  tick={{ fill: '#7d8aa3', fontFamily: 'monospace', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#00d4ff"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                  name="PRICE"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* P/E comparison (synthetic — yfinance doesn't expose historical PE) */}
          {peRatioData.length > 0 && (
            <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-[#1e2538] pb-4">
                <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
                  <TrendingUp size={20} className="text-[#00d4ff]" />
                </div>
                <h2 className="text-xl font-bold text-[#e4e8f0] font-mono">P/E RATIO COMPARISON</h2>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={peRatioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2538" />
                  <XAxis
                    dataKey="month"
                    stroke="#7d8aa3"
                    tick={{ fill: '#7d8aa3', fontFamily: 'monospace', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#7d8aa3"
                    tick={{ fill: '#7d8aa3', fontFamily: 'monospace', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="peRatio"
                    stroke="#00d4ff"
                    strokeWidth={3}
                    name={`${stock.symbol} P/E`}
                    dot={{ fill: '#00d4ff', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="industry"
                    stroke="#2ed573"
                    strokeWidth={3}
                    name="INDUSTRY AVG (approx)"
                    dot={{ fill: '#2ed573', r: 4 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-[#00d4ff]/5 rounded border border-[#00d4ff]/20">
                <p className="text-sm text-[#7d8aa3] font-mono leading-relaxed">
                  <strong className="text-[#00d4ff]">P/E RATIO:</strong> Current P/E{' '}
                  <strong className="text-[#e4e8f0]">{stock.peRatio}</strong>. Historical P/E curve
                  is approximated (yfinance does not expose historical P/E).
                </p>
              </div>
            </div>
          )}

          {/* Volume */}
          <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1e2538] pb-4">
              <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
                <BarChart3 size={20} className="text-[#00d4ff]" />
              </div>
              <h2 className="text-xl font-bold text-[#e4e8f0] font-mono">TRADING VOLUME (30D)</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2538" />
                <XAxis
                  dataKey="date"
                  stroke="#7d8aa3"
                  tick={{ fill: '#7d8aa3', fontFamily: 'monospace', fontSize: 10 }}
                />
                <YAxis
                  stroke="#7d8aa3"
                  tick={{ fill: '#7d8aa3', fontFamily: 'monospace', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="volume" fill="#a29bfe" radius={[4, 4, 0, 0]} name="VOLUME" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Trade panel ─────────────────────────────────────────────────────────────
// Mock-money buy/sell form. Uses the logged-in user's cash balance from the
// auth context and the current ticker's live price. POSTs to /api/trades/buy
// or /api/trades/sell, then calls `onTradeComplete()` so the parent can
// refresh balance & share count.
interface TradePanelProps {
  ticker: string;
  companyName: string;
  price: number;
  cashBalance: number;
  sharesOwned: number;
  onTradeComplete: () => Promise<void> | void;
  onViewPortfolio: () => void;
}

function TradePanel({
  ticker,
  companyName,
  price,
  cashBalance,
  sharesOwned,
  onTradeComplete,
  onViewPortfolio,
}: TradePanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [sharesInput, setSharesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const shares = Number(sharesInput) || 0;
  const total = shares * price;

  const maxBuyable = price > 0 ? Math.floor((cashBalance / price) * 10000) / 10000 : 0;
  const canBuy = mode === 'buy' && shares > 0 && total <= cashBalance;
  const canSell = mode === 'sell' && shares > 0 && shares <= sharesOwned;
  const canSubmit = mode === 'buy' ? canBuy : canSell;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'buy') {
        await buyStock(ticker, companyName, shares, price);
        setSuccess(`Bought ${shares} share${shares === 1 ? '' : 's'} of ${ticker} at $${price.toFixed(2)}`);
      } else {
        await sellStock(ticker, shares, price);
        setSuccess(`Sold ${shares} share${shares === 1 ? '' : 's'} of ${ticker} at $${price.toFixed(2)}`);
      }
      setSharesInput('');
      await onTradeComplete();
    } catch (err: any) {
      setError(err?.message ?? 'Trade failed');
    } finally {
      setSubmitting(false);
    }
  };

  const quickShares = (fraction: number) => {
    const cap = mode === 'buy' ? maxBuyable : sharesOwned;
    const amount = Math.floor(cap * fraction * 10000) / 10000;
    setSharesInput(amount > 0 ? String(amount) : '');
  };

  return (
    <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6 mb-6">
      <div className="flex items-center justify-between mb-4 border-b border-[#1e2538] pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#2ed573]/10 p-2 rounded border border-[#2ed573]/30">
            <ShoppingCart size={20} className="text-[#2ed573]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e4e8f0] font-mono">TRADE {ticker}</h2>
            <p className="text-[#7d8aa3] text-xs font-mono">Paper trading · simulated balance</p>
          </div>
        </div>
        <button
          onClick={onViewPortfolio}
          className="text-[#7d8aa3] hover:text-[#00d4ff] font-mono text-xs transition-colors"
        >
          VIEW PORTFOLIO →
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#1a1f2e] p-3 rounded border border-[#1e2538]">
          <p className="text-[10px] text-[#7d8aa3] font-mono">CASH BALANCE</p>
          <p className="text-sm font-bold text-[#00d4ff] font-mono">
            ${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#1a1f2e] p-3 rounded border border-[#1e2538]">
          <p className="text-[10px] text-[#7d8aa3] font-mono">SHARES OWNED</p>
          <p className="text-sm font-bold text-[#e4e8f0] font-mono">{sharesOwned.toFixed(4)}</p>
        </div>
        <div className="bg-[#1a1f2e] p-3 rounded border border-[#1e2538]">
          <p className="text-[10px] text-[#7d8aa3] font-mono">MARKET PRICE</p>
          <p className="text-sm font-bold text-[#e4e8f0] font-mono">${price.toFixed(2)}</p>
        </div>
        <div className="bg-[#1a1f2e] p-3 rounded border border-[#1e2538]">
          <p className="text-[10px] text-[#7d8aa3] font-mono">
            {mode === 'buy' ? 'MAX BUYABLE' : 'MAX SELLABLE'}
          </p>
          <p className="text-sm font-bold text-[#a29bfe] font-mono">
            {(mode === 'buy' ? maxBuyable : sharesOwned).toFixed(4)}
          </p>
        </div>
      </div>

      {/* Buy / Sell tabs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => {
            setMode('buy');
            setError(null);
            setSuccess(null);
          }}
          className={`py-2 rounded font-mono font-bold text-sm border transition-all ${
            mode === 'buy'
              ? 'bg-[#2ed573]/10 text-[#2ed573] border-[#2ed573]/50'
              : 'bg-transparent text-[#7d8aa3] border-[#1e2538] hover:border-[#7d8aa3]'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => {
            setMode('sell');
            setError(null);
            setSuccess(null);
          }}
          className={`py-2 rounded font-mono font-bold text-sm border transition-all ${
            mode === 'sell'
              ? 'bg-[#ff4757]/10 text-[#ff4757] border-[#ff4757]/50'
              : 'bg-transparent text-[#7d8aa3] border-[#1e2538] hover:border-[#7d8aa3]'
          }`}
        >
          SELL
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded flex items-center gap-2">
          <AlertCircle size={14} className="text-[#ff4757] flex-shrink-0" />
          <span className="text-[#ff4757] font-mono text-xs">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-3 p-2 bg-[#2ed573]/10 border border-[#2ed573]/30 rounded flex items-center gap-2">
          <CheckCircle2 size={14} className="text-[#2ed573] flex-shrink-0" />
          <span className="text-[#2ed573] font-mono text-xs">{success}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-[#7d8aa3] text-xs font-mono mb-1">
            SHARES
            {mode === 'sell' && sharesOwned === 0 && (
              <span className="ml-2 text-[#ff4757]">(you don't own any)</span>
            )}
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            max={mode === 'buy' ? maxBuyable : sharesOwned}
            value={sharesInput}
            onChange={(e) => setSharesInput(e.target.value)}
            placeholder="0.0000"
            className="w-full px-3 py-2 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono text-sm focus:outline-none focus:border-[#00d4ff]"
          />
          <div className="flex gap-2 mt-2">
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => quickShares(f)}
                className="flex-1 py-1 bg-transparent border border-[#1e2538] text-[#7d8aa3] rounded font-mono text-[10px] hover:border-[#7d8aa3] transition-colors"
              >
                {f === 1 ? 'MAX' : `${f * 100}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1f2e] p-3 rounded border border-[#1e2538] flex items-center justify-between">
          <span className="text-[#7d8aa3] text-xs font-mono">
            {mode === 'buy' ? 'TOTAL COST' : 'PROCEEDS'}
          </span>
          <span className="text-lg font-bold text-[#e4e8f0] font-mono flex items-center gap-1">
            <DollarSign size={16} className="text-[#7d8aa3]" />
            {total.toFixed(2)}
          </span>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className={`w-full py-3 rounded font-bold font-mono text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            mode === 'buy'
              ? 'bg-[#2ed573] text-[#0a0e1a] hover:bg-[#26b361]'
              : 'bg-[#ff4757] text-white hover:bg-[#e63946]'
          }`}
        >
          {submitting
            ? 'SUBMITTING…'
            : mode === 'buy'
              ? `BUY ${shares > 0 ? shares.toFixed(4) : ''} ${ticker}`
              : `SELL ${shares > 0 ? shares.toFixed(4) : ''} ${ticker}`}
        </button>
        {mode === 'buy' && shares > 0 && total > cashBalance && (
          <p className="text-[#ff4757] text-xs font-mono text-center">
            Not enough cash. Max buyable: {maxBuyable.toFixed(4)} shares.
          </p>
        )}
        {mode === 'sell' && shares > 0 && shares > sharesOwned && (
          <p className="text-[#ff4757] text-xs font-mono text-center">
            You only own {sharesOwned.toFixed(4)} shares.
          </p>
        )}
      </form>
    </div>
  );
}
