import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, X, LineChart, Star, Activity } from 'lucide-react';
import {
  fetchStockHistory,
  fetchPrediction,
  getWatchlist,
  type Candle,
  type Prediction,
} from '../lib/api';

// ──────────────────────────────────────────────────────────────────────────
// Compare page: overlay normalized % return for 2–5 tickers on one chart,
// with each series' AI prediction projected as a dashed extension. Below
// the chart is a per-ticker card summarizing the prediction + signal.
// All historical series are rebased to 0% on day one so they share a Y
// axis regardless of absolute price.
// ──────────────────────────────────────────────────────────────────────────

interface TickerData {
  ticker: string;
  candles: Candle[];
  prediction: Prediction | null;
  loading: boolean;
  error: string | null;
}

const MAX_TICKERS = 5;

// One color per slot. Matches the theme palette.
const COLORS = ['#00d4ff', '#a29bfe', '#2ed573', '#ffa502', '#ff4757'];

const PERIOD_OPTIONS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
];

export function Compare() {
  const [tickers, setTickers] = useState<string[]>(['AAPL', 'MSFT']);
  const [data, setData] = useState<Record<string, TickerData>>({});
  const [days, setDays] = useState(90);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const loadTicker = useCallback(
    async (ticker: string) => {
      setData((prev) => ({
        ...prev,
        [ticker]: {
          ticker,
          candles: prev[ticker]?.candles ?? [],
          prediction: prev[ticker]?.prediction ?? null,
          loading: true,
          error: null,
        },
      }));
      try {
        const [candles, prediction] = await Promise.all([
          fetchStockHistory(ticker, days).catch(() => [] as Candle[]),
          fetchPrediction(ticker).catch(() => null),
        ]);
        setData((prev) => ({
          ...prev,
          [ticker]: {
            ticker,
            candles,
            prediction,
            loading: false,
            error: candles.length === 0 ? 'No history available' : null,
          },
        }));
      } catch (e: any) {
        setData((prev) => ({
          ...prev,
          [ticker]: {
            ticker,
            candles: [],
            prediction: null,
            loading: false,
            error: e?.message ?? 'Load failed',
          },
        }));
      }
    },
    [days]
  );

  // Reload everyone when the period changes; also picks up newly added tickers.
  useEffect(() => {
    tickers.forEach((t) => loadTicker(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers.join(','), days]);

  const addTicker = () => {
    const t = input.trim().toUpperCase();
    setInputError(null);
    if (!t) return;
    if (!/^[A-Z.\-]{1,8}$/.test(t)) {
      setInputError('Ticker looks invalid');
      return;
    }
    if (tickers.includes(t)) {
      setInputError('Already in comparison');
      return;
    }
    if (tickers.length >= MAX_TICKERS) {
      setInputError(`Max ${MAX_TICKERS} tickers`);
      return;
    }
    setTickers([...tickers, t]);
    setInput('');
  };

  const removeTicker = (t: string) => {
    setTickers(tickers.filter((x) => x !== t));
    setData((prev) => {
      const next = { ...prev };
      delete next[t];
      return next;
    });
  };

  const loadFromWatchlist = async () => {
    setInputError(null);
    try {
      const { watchlist } = await getWatchlist();
      const next = watchlist.slice(0, MAX_TICKERS).map((w) => w.ticker);
      if (next.length < 2) {
        setInputError('Need at least 2 tickers in your watchlist');
        return;
      }
      setTickers(next);
    } catch (e: any) {
      setInputError(e?.message ?? 'Failed to read watchlist');
    }
  };

  // ── Chart math ──────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const series = tickers
      .map((t, i) => {
        const d = data[t];
        if (!d || !d.candles.length) return null;
        const first = d.candles[0].close;
        const pts = d.candles.map((c, idx) => ({
          x: idx,
          pct: first > 0 ? (c.close / first - 1) * 100 : 0,
          date: c.date,
          close: c.close,
        }));
        return {
          ticker: t,
          color: COLORS[i % COLORS.length],
          points: pts,
          prediction: d.prediction,
        };
      })
      .filter(Boolean) as {
      ticker: string;
      color: string;
      points: { x: number; pct: number; date: string; close: number }[];
      prediction: Prediction | null;
    }[];

    if (series.length === 0) return null;

    const allPct: number[] = series.flatMap((s) => s.points.map((p) => p.pct));
    series.forEach((s) => {
      if (s.prediction && s.points.length > 0) {
        const first = s.points[0].close;
        if (first > 0) {
          allPct.push((s.prediction.predictedPrice / first - 1) * 100);
        }
      }
    });

    const rawMin = Math.min(...allPct);
    const rawMax = Math.max(...allPct);
    // Pad ±5% of range so lines don't touch edges, and always include zero.
    const span = Math.max(rawMax - rawMin, 1);
    const minY = Math.min(0, rawMin - span * 0.05);
    const maxY = Math.max(0, rawMax + span * 0.05);
    const maxX = Math.max(...series.map((s) => s.points.length - 1), 1);

    return { series, minY, maxY, maxX };
  }, [tickers, data]);

  // SVG layout
  const W = 900;
  const H = 420;
  const PAD = { t: 20, r: 110, b: 32, l: 60 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const scaleX = (x: number, maxX: number) =>
    PAD.l + (x / Math.max(maxX, 1)) * innerW;
  const scaleY = (pct: number, minY: number, maxY: number) =>
    PAD.t + (1 - (pct - minY) / Math.max(maxY - minY, 0.001)) * innerH;

  const anyLoading = tickers.some((t) => data[t]?.loading);

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6 border-b border-[#1e2538] pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
              <LineChart size={28} className="text-[#00d4ff]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#e4e8f0] tracking-tight">
                COMPARE STOCKS
              </h1>
              <p className="text-[#7d8aa3] text-sm mt-1 font-mono">
                Overlay normalized price history with AI prediction
              </p>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Ticker chips */}
            <div className="flex flex-wrap gap-2">
              {tickers.map((t, i) => (
                <div
                  key={t}
                  className="flex items-center gap-2 px-3 py-1.5 rounded border bg-[#0f1420]"
                  style={{ borderColor: COLORS[i % COLORS.length] + '66' }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="font-mono text-sm font-bold text-[#e4e8f0]">{t}</span>
                  <button
                    onClick={() => removeTicker(t)}
                    className="text-[#7d8aa3] hover:text-[#ff4757]"
                    aria-label={`Remove ${t}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add ticker */}
            {tickers.length < MAX_TICKERS && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTicker();
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value.toUpperCase())}
                  placeholder="Add ticker…"
                  className="px-3 py-1.5 bg-[#0f1420] border border-[#1e2538] rounded text-[#e4e8f0] font-mono text-sm w-32 focus:outline-none focus:border-[#00d4ff]"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1.5 rounded border border-[#1e2538] bg-[#0f1420] text-[#7d8aa3] hover:text-[#00d4ff] hover:border-[#00d4ff]/50 font-mono text-xs"
                >
                  <Plus size={14} /> ADD
                </button>
              </form>
            )}

            <button
              onClick={loadFromWatchlist}
              className="flex items-center gap-1 px-3 py-1.5 rounded border border-[#1e2538] bg-[#0f1420] text-[#7d8aa3] hover:text-[#a29bfe] hover:border-[#a29bfe]/50 font-mono text-xs"
              title="Compare everything on your watchlist"
            >
              <Star size={14} /> FROM WATCHLIST
            </button>

            {/* Period selector */}
            <div className="ml-auto flex items-center gap-1 p-1 bg-[#0f1420] border border-[#1e2538] rounded">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setDays(p.days)}
                  className={`px-3 py-1 rounded font-mono text-xs transition-colors ${
                    days === p.days
                      ? 'bg-[#00d4ff]/20 text-[#00d4ff]'
                      : 'text-[#7d8aa3] hover:text-[#e4e8f0]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {inputError && (
            <p className="mt-2 text-[#ff4757] font-mono text-xs">{inputError}</p>
          )}
        </div>

        {/* Chart */}
        <div className="bg-[#0f1420] border border-[#1e2538] rounded p-4 mb-6">
          <h2 className="text-[#e4e8f0] font-mono font-bold text-sm mb-3 flex items-center gap-2">
            <Activity size={16} className="text-[#00d4ff]" />
            NORMALIZED RETURN — last {days}d, every series rebased to 0% on day one
          </h2>
          {chartData && tickers.length >= 2 ? (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Y grid + labels */}
              {(() => {
                const ticks = 5;
                const step = (chartData.maxY - chartData.minY) / ticks;
                return Array.from({ length: ticks + 1 }, (_, i) => {
                  const val = chartData.minY + step * i;
                  const y = scaleY(val, chartData.minY, chartData.maxY);
                  return (
                    <g key={i}>
                      <line
                        x1={PAD.l}
                        x2={W - PAD.r}
                        y1={y}
                        y2={y}
                        stroke="#1e2538"
                        strokeWidth="0.5"
                      />
                      <text
                        x={PAD.l - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill="#7d8aa3"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {val >= 0 ? '+' : ''}
                        {val.toFixed(1)}%
                      </text>
                    </g>
                  );
                });
              })()}

              {/* Zero line (emphasized) */}
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={scaleY(0, chartData.minY, chartData.maxY)}
                y2={scaleY(0, chartData.minY, chartData.maxY)}
                stroke="#2a3147"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* X-axis first / last date */}
              {chartData.series[0] && chartData.series[0].points.length > 0 && (
                <>
                  <text
                    x={PAD.l}
                    y={H - 10}
                    fill="#7d8aa3"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {chartData.series[0].points[0].date}
                  </text>
                  <text
                    x={W - PAD.r}
                    y={H - 10}
                    textAnchor="end"
                    fill="#7d8aa3"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {
                      chartData.series[0].points[chartData.series[0].points.length - 1]
                        .date
                    }
                  </text>
                </>
              )}

              {/* Historical lines */}
              {chartData.series.map((s) => {
                const d = s.points
                  .map((p, i) => {
                    const x = scaleX(p.x, chartData.maxX);
                    const y = scaleY(p.pct, chartData.minY, chartData.maxY);
                    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
                  })
                  .join(' ');
                return (
                  <path
                    key={s.ticker}
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Prediction dashed extension + dot + label */}
              {chartData.series.map((s) => {
                if (!s.prediction || s.points.length === 0) return null;
                const first = s.points[0].close;
                if (first <= 0) return null;
                const predPct = (s.prediction.predictedPrice / first - 1) * 100;
                const last = s.points[s.points.length - 1];
                const lastX = scaleX(last.x, chartData.maxX);
                const lastY = scaleY(last.pct, chartData.minY, chartData.maxY);
                // Project the prediction ~5% of the chart width to the right.
                const projX = Math.min(
                  last.x + Math.max(1, chartData.maxX * 0.05),
                  chartData.maxX
                );
                const predX = scaleX(projX, chartData.maxX);
                const predY = scaleY(predPct, chartData.minY, chartData.maxY);
                return (
                  <g key={`${s.ticker}-pred`}>
                    <line
                      x1={lastX}
                      y1={lastY}
                      x2={predX}
                      y2={predY}
                      stroke={s.color}
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      opacity="0.75"
                    />
                    <circle
                      cx={predX}
                      cy={predY}
                      r="4"
                      fill={s.color}
                      stroke="#0f1420"
                      strokeWidth="1"
                    />
                    <text
                      x={predX + 6}
                      y={predY + 3}
                      fill="#e4e8f0"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {s.ticker} {predPct >= 0 ? '+' : ''}
                      {predPct.toFixed(1)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-[#7d8aa3] font-mono text-sm">
              {tickers.length < 2
                ? 'Add at least two tickers to compare.'
                : anyLoading
                  ? 'LOADING CHART DATA…'
                  : 'No data available for the selected tickers.'}
            </div>
          )}
        </div>

        {/* Per-ticker prediction cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickers.map((t, i) => {
            const d = data[t];
            const color = COLORS[i % COLORS.length];
            if (!d || d.loading) {
              return (
                <div
                  key={t}
                  className="bg-[#0f1420] border border-[#1e2538] rounded p-4 animate-pulse"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: color }}
                    />
                    <div className="h-5 w-20 bg-[#1e2538] rounded" />
                  </div>
                  <div className="h-8 w-32 bg-[#1e2538] rounded mb-2" />
                  <div className="h-4 w-full bg-[#1e2538] rounded" />
                </div>
              );
            }
            if (d.error || !d.prediction) {
              return (
                <div
                  key={t}
                  className="bg-[#0f1420] border border-[#ff4757]/40 rounded p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: color }}
                    />
                    <h3 className="text-[#e4e8f0] font-bold font-mono">{t}</h3>
                  </div>
                  <p className="text-[#ff4757] font-mono text-xs">
                    {d.error ?? 'Prediction unavailable'}
                  </p>
                </div>
              );
            }
            const p = d.prediction;
            const signal = (p.signal || '').toUpperCase();
            const signalClass =
              signal === 'BUY'
                ? 'bg-[#2ed573]/20 text-[#2ed573] border-[#2ed573]/40'
                : signal === 'SELL'
                  ? 'bg-[#ff4757]/20 text-[#ff4757] border-[#ff4757]/40'
                  : 'bg-[#ffa502]/20 text-[#ffa502] border-[#ffa502]/40';
            return (
              <div
                key={t}
                className="bg-[#0f1420] border rounded p-4"
                style={{ borderColor: color + '55' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: color }}
                    />
                    <h3 className="text-[#e4e8f0] font-bold font-mono text-lg">
                      {t}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${signalClass}`}
                  >
                    {signal || '—'}
                  </span>
                </div>
                <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 mb-2">
                  <span className="text-[#7d8aa3] font-mono text-xs">NOW</span>
                  <span className="text-[#e4e8f0] font-mono font-bold">
                    ${p.currentPrice.toFixed(2)}
                  </span>
                  <span className="text-[#7d8aa3]">→</span>
                  <span className="text-[#7d8aa3] font-mono text-xs">PRED</span>
                  <span className="text-[#e4e8f0] font-mono font-bold">
                    ${p.predictedPrice.toFixed(2)}
                  </span>
                </div>
                <div
                  className={`text-2xl font-mono font-bold ${
                    p.pctChange >= 0 ? 'text-[#2ed573]' : 'text-[#ff4757]'
                  }`}
                >
                  {p.pctChange >= 0 ? '+' : ''}
                  {p.pctChange.toFixed(2)}%
                </div>
                {p.metrics && (
                  <div className="mt-3 pt-3 border-t border-[#1e2538] text-[10px] font-mono text-[#7d8aa3] flex flex-wrap gap-3">
                    {p.metrics.mae !== undefined && (
                      <span>MAE {p.metrics.mae.toFixed(2)}</span>
                    )}
                    {p.metrics.rmse !== undefined && (
                      <span>RMSE {p.metrics.rmse.toFixed(2)}</span>
                    )}
                    {p.metrics.cached && (
                      <span className="text-[#00d4ff]">CACHED</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
