import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { StockCard } from '../components/StockCard';
import { WatchlistItem } from '../components/WatchlistItem';
import { fetchQuotes, type Quote } from '../lib/api';

// Tickers the terminal tracks by default. Edit freely.
const DEFAULT_TICKERS = [
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META',
  'NVDA', 'NFLX', 'DIS', 'INTC', 'AMD', 'CRM',
];

const WATCHLIST_STORAGE_KEY = 'watchlist';

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(list: string[]) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('watchlist-updated'));
}

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist());
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist'>('all');
  const [stocks, setStocks] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const tickers = useMemo(() => {
    const merged = new Set<string>([...DEFAULT_TICKERS, ...watchlist]);
    return Array.from(merged);
  }, [watchlist]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const quotes = await fetchQuotes(tickers);
      setStocks(quotes);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, [tickers]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return stocks.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [searchQuery, stocks]);

  const watchlistStocks = useMemo(
    () => stocks.filter((s) => watchlist.includes(s.symbol)),
    [watchlist, stocks]
  );

  const toggleWatchlist = (symbol: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      saveWatchlist(next);
      return next;
    });
  };

  const gainers = stocks.filter((s) => s.change > 0).length;
  const losers = stocks.filter((s) => s.change < 0).length;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6 border-b border-[#1e2538] pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
                <Activity size={28} className="text-[#00d4ff]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#e4e8f0] tracking-tight">
                  STOCK TERMINAL
                </h1>
                <p className="text-[#7d8aa3] text-sm mt-1 font-mono">
                  Live Market Data • Real-time Analytics
                  {lastUpdated && (
                    <span className="ml-2 text-[#00d4ff]/70">
                      · updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded border border-[#1e2538] bg-[#0f1420] text-[#7d8aa3] hover:text-[#00d4ff] hover:border-[#00d4ff]/50 transition-colors font-mono text-xs disabled:opacity-50"
                title="Refresh quotes"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                REFRESH
              </button>
              <div className="bg-[#0f1420] border border-[#1e2538] px-4 py-2 rounded">
                <div className="text-[#7d8aa3] text-xs font-mono mb-1">GAINERS</div>
                <div className="text-[#2ed573] text-xl font-bold">{gainers}</div>
              </div>
              <div className="bg-[#0f1420] border border-[#1e2538] px-4 py-2 rounded">
                <div className="text-[#7d8aa3] text-xs font-mono mb-1">LOSERS</div>
                <div className="text-[#ff4757] text-xl font-bold">{losers}</div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-2xl">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7d8aa3]"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by ticker or company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#0f1420] border border-[#1e2538] rounded text-[#e4e8f0] placeholder-[#7d8aa3] focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] transition-colors font-mono"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#1e2538]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-semibold transition-all relative font-mono ${
              activeTab === 'all' ? 'text-[#00d4ff]' : 'text-[#7d8aa3] hover:text-[#e4e8f0]'
            }`}
          >
            ALL STOCKS
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d4ff]"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-6 py-3 font-semibold transition-all relative font-mono ${
              activeTab === 'watchlist' ? 'text-[#00d4ff]' : 'text-[#7d8aa3] hover:text-[#e4e8f0]'
            }`}
          >
            WATCHLIST ({watchlist.length})
            {activeTab === 'watchlist' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d4ff]"></div>
            )}
          </button>
        </div>

        {/* Loading / error banners */}
        {error && (
          <div className="mb-6 p-4 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded text-[#ff4757] font-mono text-sm">
            ERROR: {error}
          </div>
        )}
        {loading && stocks.length === 0 && (
          <div className="text-center py-16 bg-[#0f1420] rounded border border-[#1e2538]">
            <p className="text-[#7d8aa3] text-lg font-mono animate-pulse">FETCHING MARKET DATA…</p>
          </div>
        )}

        {/* Content */}
        {!loading || stocks.length > 0 ? (
          activeTab === 'all' ? (
            <div>
              {filteredStocks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStocks.map((stock) => (
                    <StockCard
                      key={stock.symbol}
                      symbol={stock.symbol}
                      name={stock.name}
                      price={stock.price}
                      change={stock.change}
                      changePercent={stock.changePercent}
                      isInWatchlist={watchlist.includes(stock.symbol)}
                      onToggleWatchlist={() => toggleWatchlist(stock.symbol)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-[#0f1420] rounded border border-[#1e2538]">
                  <p className="text-[#7d8aa3] text-lg font-mono">
                    NO RESULTS FOR "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {watchlistStocks.length > 0 ? (
                <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6">
                  <h2 className="text-xl font-bold text-[#e4e8f0] mb-4 font-mono border-b border-[#1e2538] pb-3">
                    YOUR WATCHLIST
                  </h2>
                  <div className="space-y-3">
                    {watchlistStocks.map((stock) => (
                      <WatchlistItem
                        key={stock.symbol}
                        symbol={stock.symbol}
                        name={stock.name}
                        price={stock.price}
                        change={stock.change}
                        changePercent={stock.changePercent}
                        onRemove={() => toggleWatchlist(stock.symbol)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 bg-[#0f1420] rounded border border-[#1e2538]">
                  <TrendingUp size={48} className="text-[#1e2538] mx-auto mb-4" />
                  <p className="text-[#7d8aa3] text-lg mb-2 font-mono">WATCHLIST EMPTY</p>
                  <p className="text-[#7d8aa3] text-sm">
                    Add stocks from the "ALL STOCKS" tab to track them
                  </p>
                </div>
              )}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
