import { useState, useMemo } from 'react';
import { Search, TrendingUp, Activity } from 'lucide-react';
import { StockCard } from '../components/StockCard';
import { WatchlistItem } from '../components/WatchlistItem';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const mockStocks: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.45, change: 2.34, changePercent: 1.33 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.67, change: -1.23, changePercent: -0.86 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', price: 412.89, change: 5.67, changePercent: 1.39 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.23, change: 3.45, changePercent: 1.97 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.56, change: -4.23, changePercent: -1.67 },
  { symbol: 'META', name: 'Meta Platforms Inc.', price: 512.34, change: 8.90, changePercent: 1.77 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 872.45, change: 12.34, changePercent: 1.43 },
  { symbol: 'NFLX', name: 'Netflix Inc.', price: 645.78, change: -2.34, changePercent: -0.36 },
  { symbol: 'DIS', name: 'The Walt Disney Company', price: 98.23, change: 1.45, changePercent: 1.50 },
  { symbol: 'INTC', name: 'Intel Corporation', price: 42.89, change: -0.78, changePercent: -1.79 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 156.34, change: 3.21, changePercent: 2.09 },
  { symbol: 'CRM', name: 'Salesforce Inc.', price: 287.56, change: 4.67, changePercent: 1.65 },
];

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist'>('all');

  const filteredStocks = useMemo(() => {
    return mockStocks.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const watchlistStocks = useMemo(() => {
    return mockStocks.filter((stock) => watchlist.includes(stock.symbol));
  }, [watchlist]);

  const toggleWatchlist = (symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  // Calculate market stats
  const gainers = mockStocks.filter(s => s.change > 0).length;
  const losers = mockStocks.filter(s => s.change < 0).length;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header with Terminal Aesthetic */}
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
                </p>
              </div>
            </div>
            <div className="flex gap-4">
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

          {/* Search Bar */}
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
              activeTab === 'all'
                ? 'text-[#00d4ff]'
                : 'text-[#7d8aa3] hover:text-[#e4e8f0]'
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
              activeTab === 'watchlist'
                ? 'text-[#00d4ff]'
                : 'text-[#7d8aa3] hover:text-[#e4e8f0]'
            }`}
          >
            WATCHLIST ({watchlist.length})
            {activeTab === 'watchlist' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d4ff]"></div>
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'all' ? (
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
                <p className="text-[#7d8aa3] text-lg mb-2 font-mono">
                  WATCHLIST EMPTY
                </p>
                <p className="text-[#7d8aa3] text-sm">
                  Add stocks from the "ALL STOCKS" tab to track them
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}