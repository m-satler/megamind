import { TrendingUp, TrendingDown, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router';

interface StockCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
}

export function StockCard({
  symbol,
  name,
  price,
  change,
  changePercent,
  isInWatchlist,
  onToggleWatchlist,
}: StockCardProps) {
  const isPositive = change >= 0;
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/stock/${symbol}`);
  };

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWatchlist();
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-[#0f1420] rounded border border-[#1e2538] p-5 hover:border-[#00d4ff]/50 transition-all cursor-pointer group relative overflow-hidden"
    >
      {/* Hover gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/0 to-[#00d4ff]/0 group-hover:from-[#00d4ff]/5 group-hover:to-transparent transition-all duration-300"></div>
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-[#e4e8f0] font-mono tracking-wide">{symbol}</h3>
              <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-[#2ed573]' : 'bg-[#ff4757]'} animate-pulse`}></div>
            </div>
            <p className="text-xs text-[#7d8aa3] truncate max-w-[180px]">{name}</p>
          </div>
          <button
            onClick={handleWatchlistClick}
            className={`p-2 rounded transition-all ${
              isInWatchlist
                ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/50'
                : 'bg-[#1a1f2e] text-[#7d8aa3] hover:bg-[#1e2538] border border-[#1e2538]'
            }`}
          >
            {isInWatchlist ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-[#e4e8f0] font-mono">${price.toFixed(2)}</p>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
              isPositive 
                ? 'bg-[#2ed573]/10 text-[#2ed573] border-[#2ed573]/30' 
                : 'bg-[#ff4757]/10 text-[#ff4757] border-[#ff4757]/30'
            }`}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="text-xs font-bold font-mono">
              {isPositive ? '+' : ''}
              {change.toFixed(2)} ({isPositive ? '+' : ''}
              {changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
          isPositive ? 'bg-[#2ed573]' : 'bg-[#ff4757]'
        } opacity-50`}></div>
      </div>
    </div>
  );
}
