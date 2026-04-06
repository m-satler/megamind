import { TrendingUp, TrendingDown, X } from 'lucide-react';

interface WatchlistItemProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  onRemove: () => void;
}

export function WatchlistItem({
  symbol,
  name,
  price,
  change,
  changePercent,
  onRemove,
}: WatchlistItemProps) {
  const isPositive = change >= 0;

  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1f2e] rounded border border-[#1e2538] hover:border-[#00d4ff]/30 transition-all group">
      <div className="flex-1 flex items-center gap-4">
        <div className={`w-1 h-12 rounded-full ${isPositive ? 'bg-[#2ed573]' : 'bg-[#ff4757]'}`}></div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-[#e4e8f0] font-mono">{symbol}</p>
            <div className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-[#2ed573]' : 'bg-[#ff4757]'} animate-pulse`}></div>
          </div>
          <p className="text-xs text-[#7d8aa3] mt-0.5">{name}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="font-bold text-[#e4e8f0] font-mono">${price.toFixed(2)}</p>
          <div
            className={`flex items-center gap-1 justify-end mt-1 ${
              isPositive ? 'text-[#2ed573]' : 'text-[#ff4757]'
            }`}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span className="text-xs font-bold font-mono">
              {isPositive ? '+' : ''}
              {change.toFixed(2)} ({isPositive ? '+' : ''}
              {changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <button
          onClick={onRemove}
          className="p-1.5 text-[#7d8aa3] hover:text-[#ff4757] hover:bg-[#ff4757]/10 rounded border border-transparent hover:border-[#ff4757]/30 transition-all"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
