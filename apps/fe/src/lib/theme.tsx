import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** Resolved theme actually being applied (system → light or dark). */
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  return 'system';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(getInitialTheme()),
  );
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useLayoutEffect runs synchronously BEFORE the browser paints — applying
  // the .dark class here avoids the brief flash that useEffect causes
  // (state-update → paint → effect → re-paint with new class).
  useLayoutEffect(() => {
    applyTheme(theme);
    setResolvedTheme(resolveTheme(theme));
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Respond to OS-level scheme changes when on 'system'.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onChange() {
      applyTheme('system');
      setResolvedTheme(resolveTheme('system'));
    }
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  /**
   * Brief opt-in transition window. Setting `.theme-switching` on <html> lets
   * the bg/border/color CSS rules animate for 200ms; then the class is
   * removed so subsequent interactions (hover, focus, etc.) repaint instantly
   * — no all-elements-transitioning-at-once flicker.
   */
  const setTheme = useCallback((next: Theme) => {
    document.documentElement.classList.add('theme-switching');
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      document.documentElement.classList.remove('theme-switching');
    }, 220);
    setThemeState(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
