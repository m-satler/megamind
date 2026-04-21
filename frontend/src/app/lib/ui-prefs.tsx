/**
 * UI preferences (font, theme, density) persisted to localStorage.
 *
 * Applied globally by setting CSS variables on document.documentElement,
 * plus a `data-theme` attribute on <html> so pages can also key off the
 * attribute if they want theme-specific CSS selectors.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type FontChoice = 'mono' | 'sans' | 'serif';
export type ThemeChoice = 'midnight' | 'slate' | 'ember' | 'solar';
export type DensityChoice = 'comfortable' | 'compact';

export interface UIPrefs {
  font: FontChoice;
  theme: ThemeChoice;
  density: DensityChoice;
}

const DEFAULTS: UIPrefs = {
  font: 'mono',
  theme: 'midnight',
  density: 'comfortable',
};

const STORAGE_KEY = 'megamind.ui-prefs';

export const FONT_STACKS: Record<FontChoice, string> = {
  mono: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
};

export const THEME_COLORS: Record<
  ThemeChoice,
  { bg: string; surface: string; border: string; accent: string; text: string; muted: string }
> = {
  midnight: {
    bg: '#0a0e1a',
    surface: '#0f1420',
    border: '#1e2538',
    accent: '#00d4ff',
    text: '#e4e8f0',
    muted: '#7d8aa3',
  },
  slate: {
    bg: '#1a1f2e',
    surface: '#242b3d',
    border: '#30384a',
    accent: '#64b5f6',
    text: '#ecf0f5',
    muted: '#8a97b0',
  },
  ember: {
    bg: '#14100d',
    surface: '#1d1814',
    border: '#2d2520',
    accent: '#ff8c42',
    text: '#f0e6da',
    muted: '#a89484',
  },
  solar: {
    bg: '#fdf6e3',
    surface: '#eee8d5',
    border: '#d6cfae',
    accent: '#268bd2',
    text: '#073642',
    muted: '#586e75',
  },
};

interface UIPrefsCtx extends UIPrefs {
  setFont: (f: FontChoice) => void;
  setTheme: (t: ThemeChoice) => void;
  setDensity: (d: DensityChoice) => void;
  reset: () => void;
}

const Ctx = createContext<UIPrefsCtx | null>(null);

function load(): UIPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      font: parsed.font ?? DEFAULTS.font,
      theme: parsed.theme ?? DEFAULTS.theme,
      density: parsed.density ?? DEFAULTS.density,
    };
  } catch {
    return DEFAULTS;
  }
}

function applyToDocument(prefs: UIPrefs) {
  const root = document.documentElement;
  root.style.setProperty('--ui-font', FONT_STACKS[prefs.font]);
  const c = THEME_COLORS[prefs.theme];
  root.style.setProperty('--ui-bg', c.bg);
  root.style.setProperty('--ui-surface', c.surface);
  root.style.setProperty('--ui-border', c.border);
  root.style.setProperty('--ui-accent', c.accent);
  root.style.setProperty('--ui-text', c.text);
  root.style.setProperty('--ui-muted', c.muted);
  root.style.setProperty('--ui-density', prefs.density === 'compact' ? '0.75rem' : '1rem');
  root.setAttribute('data-theme', prefs.theme);
  root.setAttribute('data-density', prefs.density);
  // Also drive <body> font globally so every existing class that uses the
  // default sans stack picks up the user's choice.
  document.body.style.fontFamily = FONT_STACKS[prefs.font];
}

export function UIPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UIPrefs>(() => load());

  useEffect(() => {
    applyToDocument(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const value = useMemo<UIPrefsCtx>(
    () => ({
      ...prefs,
      setFont: (font) => setPrefs((p) => ({ ...p, font })),
      setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
      setDensity: (density) => setPrefs((p) => ({ ...p, density })),
      reset: () => setPrefs(DEFAULTS),
    }),
    [prefs],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUIPrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUIPrefs must be used within UIPrefsProvider');
  return ctx;
}
