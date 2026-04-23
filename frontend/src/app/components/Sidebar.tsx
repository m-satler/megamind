import {
  Home,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  ClipboardList,
  LineChart,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../lib/auth';

interface SidebarProps {
  // Kept for backwards compatibility with the Home page, which still passes
  // it. Markets / Watchlist were removed from the sidebar because they're
  // already surfaced on the dashboard.
  watchlistCount?: number;
}

export function Sidebar(_props: SidebarProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/', badge: null as number | null, exact: true },
    { icon: BarChart3, label: 'Portfolio', path: '/portfolio', badge: null, exact: false },
    { icon: LineChart, label: 'Compare', path: '/compare', badge: null, exact: false },
    { icon: ClipboardList, label: 'Account Setup', path: '/survey', badge: null, exact: false },
    { icon: Bell, label: 'Alerts', path: '/alerts', badge: null, exact: false },
    { icon: Settings, label: 'Settings', path: '/settings', badge: null, exact: false },
  ];

  const isActive = (path: string, exact: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    if (confirm('Log out of STOCK TERMINAL?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  // Derive initials & display handle from email
  const email = user?.email ?? '';
  const initials = email
    ? email
        .split('@')[0]
        .split(/[._-]/)
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || email[0].toUpperCase()
    : '?';
  const handle = email.split('@')[0] || 'guest';
  const balance = user?.balance ?? 0;
  const riskBadge = user?.profile?.risk_tolerance
    ? user.profile.risk_tolerance.toUpperCase() + ' RISK'
    : 'SETUP PENDING';

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-[#0f1420] border-r border-[#1e2538] flex flex-col z-50">
      {/* Account Section */}
      <div className="p-6 border-b border-[#1e2538]">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#a29bfe] p-0.5">
              <div className="w-full h-full rounded-full bg-[#0f1420] flex items-center justify-center">
                <span className="text-[#00d4ff] font-bold text-lg font-mono">{initials}</span>
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#2ed573] rounded-full border-2 border-[#0f1420]"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[#e4e8f0] font-semibold text-sm truncate" title={email}>
              {handle}
            </h3>
            <p className="text-[#7d8aa3] text-xs font-mono">{riskBadge}</p>
          </div>
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#1a1f2e] rounded p-2 border border-[#1e2538]">
            <p className="text-[#7d8aa3] text-xs font-mono mb-0.5">BALANCE</p>
            <p className="text-[#e4e8f0] font-bold text-sm font-mono">
              ${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-[#1a1f2e] rounded p-2 border border-[#1e2538]">
            <p className="text-[#7d8aa3] text-xs font-mono mb-0.5">EXP</p>
            <p className="text-[#00d4ff] font-bold text-sm font-mono uppercase">
              {user?.profile?.experience_level ?? 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <button
                key={idx}
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
                {active && <ChevronRight size={16} className="text-[#00d4ff]" />}
              </button>
            );
          })}
        </div>

        {/* Market Status (static) */}
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

      {/* Footer: logout */}
      <div className="p-4 border-t border-[#1e2538]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[#7d8aa3] hover:text-[#ff4757] hover:bg-[#ff4757]/10 rounded transition-all border border-transparent hover:border-[#ff4757]/30"
        >
          <LogOut size={20} />
          <span className="font-semibold text-sm font-mono">LOGOUT</span>
        </button>
      </div>
    </div>
  );
}
