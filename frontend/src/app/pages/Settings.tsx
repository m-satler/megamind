import {
  Settings as SettingsIcon,
  Type,
  Palette,
  Layout as LayoutIcon,
  RotateCcw,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  useUIPrefs,
  FONT_STACKS,
  THEME_COLORS,
  type FontChoice,
  type ThemeChoice,
  type DensityChoice,
} from '../lib/ui-prefs';
import { useAuth } from '../lib/auth';

const FONT_OPTIONS: { value: FontChoice; label: string; sample: string }[] = [
  { value: 'mono', label: 'Mono (terminal)', sample: 'AAPL  +$1.24  (0.87%)' },
  { value: 'sans', label: 'Sans-serif', sample: 'AAPL  +$1.24  (0.87%)' },
  { value: 'serif', label: 'Serif', sample: 'AAPL  +$1.24  (0.87%)' },
];

const THEME_OPTIONS: { value: ThemeChoice; label: string; desc: string }[] = [
  { value: 'midnight', label: 'Midnight', desc: 'Dark navy — default' },
  { value: 'slate', label: 'Slate', desc: 'Cool grey-blue' },
  { value: 'ember', label: 'Ember', desc: 'Warm dark / amber' },
  { value: 'solar', label: 'Solar', desc: 'Light solarised' },
];

const DENSITY_OPTIONS: { value: DensityChoice; label: string; desc: string }[] = [
  { value: 'comfortable', label: 'Comfortable', desc: 'More breathing room' },
  { value: 'compact', label: 'Compact', desc: 'More data per screen' },
];

export function Settings() {
  const prefs = useUIPrefs();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0e1a] px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-[#00d4ff]/10 p-2 rounded border border-[#00d4ff]/30">
            <SettingsIcon size={24} className="text-[#00d4ff]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#e4e8f0] font-mono tracking-tight">
              SETTINGS
            </h1>
            <p className="text-[#7d8aa3] text-xs font-mono">
              Personalise the terminal look and feel.
            </p>
          </div>
        </div>

        {/* Font */}
        <Section icon={<Type size={18} />} title="FONT">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => prefs.setFont(f.value)}
                className={`p-3 border rounded text-left transition-all ${
                  prefs.font === f.value
                    ? 'bg-[#00d4ff]/10 border-[#00d4ff]/50'
                    : 'bg-[#0a0e1a] border-[#1e2538] hover:border-[#7d8aa3]'
                }`}
              >
                <div
                  className={`text-xs font-bold mb-1 ${
                    prefs.font === f.value ? 'text-[#00d4ff]' : 'text-[#7d8aa3]'
                  }`}
                >
                  {f.label}
                </div>
                <div
                  className="text-[#e4e8f0] text-sm"
                  style={{ fontFamily: FONT_STACKS[f.value] }}
                >
                  {f.sample}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Theme */}
        <Section icon={<Palette size={18} />} title="THEME">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {THEME_OPTIONS.map((t) => {
              const c = THEME_COLORS[t.value];
              const selected = prefs.theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => prefs.setTheme(t.value)}
                  className={`p-3 border rounded text-left transition-all ${
                    selected
                      ? 'bg-[#00d4ff]/10 border-[#00d4ff]/50'
                      : 'bg-[#0a0e1a] border-[#1e2538] hover:border-[#7d8aa3]'
                  }`}
                >
                  <div className="flex gap-1 mb-2">
                    <div
                      className="w-4 h-4 rounded-sm border border-white/10"
                      style={{ background: c.bg }}
                    />
                    <div
                      className="w-4 h-4 rounded-sm border border-white/10"
                      style={{ background: c.surface }}
                    />
                    <div
                      className="w-4 h-4 rounded-sm border border-white/10"
                      style={{ background: c.accent }}
                    />
                  </div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      selected ? 'text-[#00d4ff]' : 'text-[#e4e8f0]'
                    }`}
                  >
                    {t.label.toUpperCase()}
                  </div>
                  <div className="text-[#7d8aa3] text-[10px] font-mono">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Density */}
        <Section icon={<LayoutIcon size={18} />} title="DENSITY">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DENSITY_OPTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => prefs.setDensity(d.value)}
                className={`p-3 border rounded text-left transition-all ${
                  prefs.density === d.value
                    ? 'bg-[#00d4ff]/10 border-[#00d4ff]/50'
                    : 'bg-[#0a0e1a] border-[#1e2538] hover:border-[#7d8aa3]'
                }`}
              >
                <div
                  className={`text-xs font-mono font-bold ${
                    prefs.density === d.value ? 'text-[#00d4ff]' : 'text-[#e4e8f0]'
                  }`}
                >
                  {d.label.toUpperCase()}
                </div>
                <div className="text-[#7d8aa3] text-[10px] font-mono">{d.desc}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#1e2538]">
            <button
              onClick={prefs.reset}
              className="flex items-center gap-2 text-[#7d8aa3] hover:text-[#ff4757] font-mono text-xs transition-colors"
            >
              <RotateCcw size={14} />
              RESET TO DEFAULTS
            </button>
          </div>
        </Section>

        {/* Mock-money notice */}
        <Section icon={<Info size={18} />} title="FUNDS">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-[#e4e8f0] font-mono text-sm mb-1">
                Simulated balance:{' '}
                <span className="text-[#00d4ff] font-bold">
                  $
                  {(user?.balance ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </p>
              <p className="text-[#7d8aa3] text-xs font-mono leading-relaxed">
                This is a paper-trading prototype. Buys and sells on the Portfolio page
                debit and credit the balance above — no real money is ever moved and no
                external payment method is linked. Your starting balance was set when you
                registered.
              </p>
            </div>
            <button
              onClick={() => navigate('/portfolio')}
              className="px-3 py-2 bg-[#00d4ff] text-[#0a0e1a] rounded font-mono font-bold text-xs hover:bg-[#00b8e6] transition-colors whitespace-nowrap"
            >
              GO TO PORTFOLIO
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0f1420] border border-[#1e2538] rounded p-5">
      <div className="flex items-center gap-2 pb-3 border-b border-[#1e2538] mb-4">
        <span className="text-[#00d4ff]">{icon}</span>
        <h2 className="text-sm text-[#e4e8f0] font-mono font-bold tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}
