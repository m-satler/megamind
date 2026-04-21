import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Sunrise,
  Sunset,
  AlertCircle,
} from 'lucide-react';
import { fetchAlerts, type Alert } from '../lib/api';

type Filter = 'all' | 'pre-open' | 'post-close';

export function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [threshold, setThreshold] = useState(2);
  const [watchedCount, setWatchedCount] = useState(0);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (t = threshold) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAlerts(t);
      setAlerts(res.alerts);
      setWatchedCount(res.watched_count);
      setGeneratedAt(res.generated_at);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? alerts : alerts.filter((a) => a.session === filter)),
    [alerts, filter],
  );

  const counts = useMemo(
    () => ({
      all: alerts.length,
      'pre-open': alerts.filter((a) => a.session === 'pre-open').length,
      'post-close': alerts.filter((a) => a.session === 'post-close').length,
    }),
    [alerts],
  );

  return (
    <div className="min-h-screen bg-[#0a0e1a] px-6 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
              <Bell size={24} className="text-[#00d4ff]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#e4e8f0] font-mono tracking-tight">ALERTS</h1>
              <p className="text-[#7d8aa3] text-xs font-mono">
                Watchlist price moves at pre-open and post-close.{' '}
                {generatedAt && (
                  <span>Last checked {new Date(generatedAt).toLocaleTimeString()}</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#00d4ff] text-[#0a0e1a] rounded font-bold font-mono hover:bg-[#00b8e6] disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'LOADING' : 'REFRESH'}
          </button>
        </div>

        {/* Threshold + filter bar */}
        <div className="bg-[#0f1420] border border-[#1e2538] rounded p-4 mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[#7d8aa3] text-xs font-mono">THRESHOLD</label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              onBlur={() => load(threshold)}
              className="w-20 px-2 py-1 bg-[#0a0e1a] border border-[#1e2538] rounded text-[#e4e8f0] font-mono text-sm focus:outline-none focus:border-[#00d4ff]"
            />
            <span className="text-[#7d8aa3] font-mono text-xs">%</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {(['all', 'pre-open', 'post-close'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded font-mono text-xs font-bold transition-colors ${
                  filter === f
                    ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/50'
                    : 'bg-transparent text-[#7d8aa3] border border-[#1e2538] hover:border-[#7d8aa3]'
                }`}
              >
                {f.toUpperCase()} ({counts[f]})
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded flex items-center gap-2">
            <AlertCircle size={16} className="text-[#ff4757]" />
            <span className="text-[#ff4757] font-mono text-xs">{error}</span>
          </div>
        )}

        {/* Empty states */}
        {!loading && !error && watchedCount === 0 && (
          <div className="bg-[#0f1420] border border-[#1e2538] rounded p-8 text-center">
            <Bell size={32} className="text-[#7d8aa3] mx-auto mb-3" />
            <p className="text-[#e4e8f0] font-mono mb-1">Your watchlist is empty.</p>
            <p className="text-[#7d8aa3] text-xs font-mono mb-4">
              Add tickers from the dashboard to start receiving price-change alerts.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-[#00d4ff] text-[#0a0e1a] rounded font-bold font-mono hover:bg-[#00b8e6] transition-colors"
            >
              GO TO DASHBOARD
            </button>
          </div>
        )}

        {!loading && !error && watchedCount > 0 && filtered.length === 0 && (
          <div className="bg-[#0f1420] border border-[#1e2538] rounded p-8 text-center">
            <p className="text-[#e4e8f0] font-mono mb-1">No alerts.</p>
            <p className="text-[#7d8aa3] text-xs font-mono">
              No watchlist tickers moved more than {threshold}% during this session.
            </p>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {filtered.map((a) => (
            <AlertCard key={a.id} alert={a} onClick={() => navigate(`/stock/${a.ticker}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert, onClick }: { alert: Alert; onClick: () => void }) {
  const up = alert.pct_change > 0;
  const SessionIcon = alert.session === 'pre-open' ? Sunrise : Sunset;
  const DirIcon = up ? TrendingUp : TrendingDown;

  const severityColor =
    alert.severity === 'high'
      ? 'border-[#ff4757]/50 bg-[#ff4757]/5'
      : alert.severity === 'medium'
        ? 'border-[#ffa502]/40 bg-[#ffa502]/5'
        : 'border-[#1e2538] bg-[#0f1420]';

  const moveColor = up ? 'text-[#2ed573]' : 'text-[#ff4757]';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border rounded flex items-center gap-4 hover:border-[#00d4ff]/50 transition-colors ${severityColor}`}
    >
      <div
        className={`p-2 rounded border ${
          alert.session === 'pre-open'
            ? 'bg-[#ffa502]/10 border-[#ffa502]/30 text-[#ffa502]'
            : 'bg-[#a29bfe]/10 border-[#a29bfe]/30 text-[#a29bfe]'
        }`}
      >
        <SessionIcon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[#e4e8f0] font-mono font-bold">{alert.ticker}</span>
          {alert.company_name && (
            <span className="text-[#7d8aa3] text-xs font-mono truncate">
              {alert.company_name}
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              alert.session === 'pre-open'
                ? 'bg-[#ffa502]/10 text-[#ffa502]'
                : 'bg-[#a29bfe]/10 text-[#a29bfe]'
            }`}
          >
            {alert.session === 'pre-open' ? 'PRE-OPEN' : 'POST-CLOSE'}
          </span>
        </div>
        <p className="text-[#7d8aa3] text-xs font-mono truncate">{alert.message}</p>
      </div>
      <div className={`flex items-center gap-1 font-mono font-bold ${moveColor}`}>
        <DirIcon size={16} />
        <span>
          {up ? '+' : ''}
          {alert.pct_change.toFixed(2)}%
        </span>
      </div>
    </button>
  );
}
