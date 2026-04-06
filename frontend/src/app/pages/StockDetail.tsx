import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  peRatio: number;
  marketCap: string;
  volume: string;
  high52Week: number;
  low52Week: number;
}

const mockStocks: { [key: string]: Stock } = {
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', price: 178.45, change: 2.34, changePercent: 1.33, peRatio: 29.5, marketCap: '2.8T', volume: '52.3M', high52Week: 199.62, low52Week: 164.08 },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.67, change: -1.23, changePercent: -0.86, peRatio: 26.8, marketCap: '1.8T', volume: '28.7M', high52Week: 156.45, low52Week: 120.34 },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corporation', price: 412.89, change: 5.67, changePercent: 1.39, peRatio: 35.2, marketCap: '3.1T', volume: '23.4M', high52Week: 430.82, low52Week: 362.90 },
  AMZN: { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.23, change: 3.45, changePercent: 1.97, peRatio: 48.3, marketCap: '1.8T', volume: '45.2M', high52Week: 188.65, low52Week: 144.05 },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.56, change: -4.23, changePercent: -1.67, peRatio: 68.5, marketCap: '788B', volume: '98.5M', high52Week: 299.29, low52Week: 138.80 },
  META: { symbol: 'META', name: 'Meta Platforms Inc.', price: 512.34, change: 8.90, changePercent: 1.77, peRatio: 27.9, marketCap: '1.3T', volume: '15.8M', high52Week: 542.81, low52Week: 362.54 },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 872.45, change: 12.34, changePercent: 1.43, peRatio: 72.4, marketCap: '2.2T', volume: '42.1M', high52Week: 974.00, low52Week: 456.12 },
  NFLX: { symbol: 'NFLX', name: 'Netflix Inc.', price: 645.78, change: -2.34, changePercent: -0.36, peRatio: 42.1, marketCap: '278B', volume: '3.4M', high52Week: 698.56, low52Week: 445.73 },
  DIS: { symbol: 'DIS', name: 'The Walt Disney Company', price: 98.23, change: 1.45, changePercent: 1.50, peRatio: 65.7, marketCap: '179B', volume: '10.2M', high52Week: 118.18, low52Week: 78.73 },
  INTC: { symbol: 'INTC', name: 'Intel Corporation', price: 42.89, change: -0.78, changePercent: -1.79, peRatio: 18.3, marketCap: '175B', volume: '56.7M', high52Week: 51.28, low52Week: 38.47 },
  AMD: { symbol: 'AMD', name: 'Advanced Micro Devices', price: 156.34, change: 3.21, changePercent: 2.09, peRatio: 54.2, marketCap: '253B', volume: '68.3M', high52Week: 184.92, low52Week: 93.12 },
  CRM: { symbol: 'CRM', name: 'Salesforce Inc.', price: 287.56, change: 4.67, changePercent: 1.65, peRatio: 38.6, marketCap: '275B', volume: '5.9M', high52Week: 318.71, low52Week: 211.76 },
};

// Generate candlestick data for K-line chart
const generateCandlestickData = (basePrice: number) => {
  const data = [];
  let price = basePrice * 0.9;
  
  for (let i = 0; i < 30; i++) {
    const open = price;
    const volatility = price * 0.03;
    const high = open + Math.random() * volatility;
    const low = open - Math.random() * volatility;
    const close = low + Math.random() * (high - low);
    
    data.push({
      date: `Day ${i + 1}`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 50000000 + 10000000),
    });
    
    price = close;
  }
  
  return data;
};

// Generate P/E ratio historical data
const generatePERatioData = (currentPE: number) => {
  const data = [];
  for (let i = 0; i < 12; i++) {
    const variance = (Math.random() - 0.5) * 10;
    data.push({
      month: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][i],
      peRatio: Number((currentPE + variance).toFixed(2)),
      industry: Number((currentPE * 0.9 + variance * 0.8).toFixed(2)),
    });
  }
  return data;
};

// Generate price history data
const generatePriceHistory = (currentPrice: number) => {
  const data = [];
  let price = currentPrice * 0.85;
  
  for (let i = 0; i < 90; i++) {
    const change = (Math.random() - 0.48) * price * 0.02;
    price += change;
    data.push({
      date: `${i + 1}d`,
      price: Number(price.toFixed(2)),
    });
  }
  
  return data;
};

// Generate volume data
const generateVolumeData = () => {
  const data = [];
  for (let i = 0; i < 30; i++) {
    data.push({
      date: `D${i + 1}`,
      volume: Math.floor(Math.random() * 80000000 + 20000000),
    });
  }
  return data;
};

export function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const stock = symbol ? mockStocks[symbol.toUpperCase()] : null;

  if (!stock) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-6 py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#e4e8f0] mb-4 font-mono">STOCK NOT FOUND</h2>
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
  const candlestickData = generateCandlestickData(stock.price);
  const peRatioData = generatePERatioData(stock.peRatio);
  const priceHistory = generatePriceHistory(stock.price);
  const volumeData = generateVolumeData();

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1420] border border-[#00d4ff]/50 p-3 rounded shadow-lg">
          <p className="text-[#7d8aa3] text-xs font-mono mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-[#e4e8f0] text-sm font-mono font-bold" style={{ color: entry.color }}>
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
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#00d4ff] hover:text-[#00b8e6] mb-6 font-semibold transition-colors font-mono"
        >
          <ArrowLeft size={20} />
          BACK TO TERMINAL
        </button>

        {/* Stock Info Header */}
        <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6 mb-6 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/5 rounded-full blur-3xl"></div>
          
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-[#e4e8f0] font-mono tracking-wider">{stock.symbol}</h1>
                  <div className={`w-3 h-3 rounded-full ${isPositive ? 'bg-[#2ed573]' : 'bg-[#ff4757]'} animate-pulse`}></div>
                  <span className="text-xs text-[#7d8aa3] font-mono px-2 py-1 bg-[#1a1f2e] rounded border border-[#1e2538]">
                    LIVE
                  </span>
                </div>
                <p className="text-lg text-[#7d8aa3]">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-[#e4e8f0] mb-2 font-mono">${stock.price.toFixed(2)}</p>
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

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-[#1e2538]">
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#1e2538]">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">MARKET CAP</p>
                <p className="text-xl font-bold text-[#e4e8f0] font-mono">${stock.marketCap}</p>
              </div>
              <div className="bg-[#1a1f2e] p-4 rounded border border-[#1e2538]">
                <p className="text-xs text-[#7d8aa3] mb-2 font-mono">P/E RATIO</p>
                <p className="text-xl font-bold text-[#00d4ff] font-mono">{stock.peRatio}</p>
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

        {/* Charts Grid */}
        <div className="space-y-6">
          {/* K-Line (Candlestick) Chart */}
          <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1e2538] pb-4">
              <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
                <BarChart3 size={20} className="text-[#00d4ff]" />
              </div>
              <h2 className="text-xl font-bold text-[#e4e8f0] font-mono">K-LINE CHART (CANDLESTICK)</h2>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={candlestickData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2538" />
                <XAxis 
                  dataKey="date" 
                  stroke="#7d8aa3" 
                  tick={{ fill: '#7d8aa3', fontFamily: 'monospace', fontSize: 11 }}
                />
                <YAxis 
                  stroke="#7d8aa3" 
                  domain={['auto', 'auto']}
                  tick={{ fill: '#7d8aa3', fontFamily: 'monospace', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                <Bar dataKey="high" fill="#2ed573" opacity={0} />
                <Bar dataKey="low" fill="#ff4757" opacity={0} />
                <Line 
                  type="monotone" 
                  dataKey="close" 
                  stroke="#00d4ff" 
                  strokeWidth={2} 
                  dot={{ fill: '#00d4ff', r: 2 }}
                  name="CLOSE"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 flex gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2ed573]/10 border border-[#2ed573]/30 rounded">
                <div className="w-2 h-2 bg-[#2ed573] rounded-full"></div>
                <span className="text-[#2ed573]">BULLISH</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded">
                <div className="w-2 h-2 bg-[#ff4757] rounded-full"></div>
                <span className="text-[#ff4757]">BEARISH</span>
              </div>
            </div>
          </div>

          {/* Price History Chart */}
          <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1e2538] pb-4">
              <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
                <Activity size={20} className="text-[#00d4ff]" />
              </div>
              <h2 className="text-xl font-bold text-[#e4e8f0] font-mono">PRICE HISTORY (90 DAYS)</h2>
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
                  interval={14}
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

          {/* P/E Ratio Chart */}
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
                  name="INDUSTRY AVG"
                  dot={{ fill: '#2ed573', r: 4 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-[#00d4ff]/5 rounded border border-[#00d4ff]/20">
              <p className="text-sm text-[#7d8aa3] font-mono leading-relaxed">
                <strong className="text-[#00d4ff]">P/E RATIO ANALYSIS:</strong> The Price-to-Earnings ratio compares the stock's
                price to its earnings per share. A higher P/E suggests investors expect higher growth.
                Current P/E: <strong className="text-[#e4e8f0]">{stock.peRatio}</strong>
              </p>
            </div>
          </div>

          {/* Trading Volume Chart */}
          <div className="bg-[#0f1420] rounded border border-[#1e2538] p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1e2538] pb-4">
              <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
                <BarChart3 size={20} className="text-[#00d4ff]" />
              </div>
              <h2 className="text-xl font-bold text-[#e4e8f0] font-mono">TRADING VOLUME</h2>
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
                <Bar 
                  dataKey="volume" 
                  fill="#a29bfe" 
                  radius={[4, 4, 0, 0]}
                  name="VOLUME"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}