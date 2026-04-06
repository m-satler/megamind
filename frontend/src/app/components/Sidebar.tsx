import { 
  Home, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Bell, 
  Star,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useState } from 'react';

interface SidebarProps {
  watchlistCount?: number;
}

export function Sidebar({ watchlistCount = 0 }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications] = useState(3);

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/', badge: null },
    { icon: TrendingUp, label: 'Markets', path: '/markets', badge: null },
    { icon: Star, label: 'Watchlist', path: '/', badge: watchlistCount > 0 ? watchlistCount : null },
    { icon: BarChart3, label: 'Portfolio', path: '/portfolio', badge: null },
    { icon: Bell, label: 'Alerts', path: '/alerts', badge: notifications },
    { icon: Settings, label: 'Settings', path: '/settings', badge: null },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-[#0f1420] border-r border-[#1e2538] flex flex-col z-50">
      {/* Account Section */}
      <div className="p-6 border-b border-[#1e2538]">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#a29bfe] p-0.5">
              <div className="w-full h-full rounded-full bg-[#0f1420] flex items-center justify-center">
                <span className="text-[#00d4ff] font-bold text-lg font-mono">JD</span>
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#2ed573] rounded-full border-2 border-[#0f1420]"></div>
          </div>
          <div className="flex-1">
            <h3 className="text-[#e4e8f0] font-semibold text-sm">John Doe</h3>
            <p className="text-[#7d8aa3] text-xs font-mono">PRO TRADER</p>
          </div>
        </div>
        
        {/* Account Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#1a1f2e] rounded p-2 border border-[#1e2538]">
            <p className="text-[#7d8aa3] text-xs font-mono mb-0.5">BALANCE</p>
            <p className="text-[#e4e8f0] font-bold text-sm font-mono">$24,580</p>
          </div>
          <div className="bg-[#1a1f2e] rounded p-2 border border-[#1e2538]">
            <p className="text-[#7d8aa3] text-xs font-mono mb-0.5">P&L</p>
            <p className="text-[#2ed573] font-bold text-sm font-mono">+12.4%</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded transition-all group ${
                  active
                    ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30'
                    : 'text-[#7d8aa3] hover:bg-[#1a1f2e] hover:text-[#e4e8f0] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <span className="font-semibold text-sm font-mono">{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className="bg-[#ff4757] text-white text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <ChevronRight size={16} className="text-[#00d4ff]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Market Status */}
        <div className="mt-6 mx-3 p-3 bg-[#1a1f2e] rounded border border-[#1e2538]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#7d8aa3] text-xs font-mono">MARKET STATUS</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[#2ed573] rounded-full animate-pulse"></div>
              <span className="text-[#2ed573] text-xs font-bold font-mono">OPEN</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#7d8aa3] font-mono">S&P 500</span>
              <span className="text-[#2ed573] font-mono font-bold">+0.8%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#7d8aa3] font-mono">NASDAQ</span>
              <span className="text-[#2ed573] font-mono font-bold">+1.2%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#7d8aa3] font-mono">DOW</span>
              <span className="text-[#ff4757] font-mono font-bold">-0.3%</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[#1e2538]">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#7d8aa3] hover:text-[#ff4757] hover:bg-[#ff4757]/10 rounded transition-all border border-transparent hover:border-[#ff4757]/30">
          <LogOut size={20} />
          <span className="font-semibold text-sm font-mono">LOGOUT</span>
        </button>
      </div>
    </div>
  );
}
