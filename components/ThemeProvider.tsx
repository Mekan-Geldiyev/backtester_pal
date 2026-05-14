'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeName =
  | 'ember-dusk'
  | 'ocean-graphite'
  | 'forest-ledger'
  | 'sunset-paper';

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

export const THEME_OPTIONS: Array<{ value: ThemeName; label: string }> = [
  { value: 'ember-dusk', label: 'Ember Dusk' },
  { value: 'ocean-graphite', label: 'Ocean Graphite' },
  { value: 'forest-ledger', label: 'Forest Ledger' },
  { value: 'sunset-paper', label: 'Sunset Paper' },
];

const DEFAULT_THEME: ThemeName = 'ember-dusk';
const STORAGE_KEY = 'backtpal-theme';

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

function isThemeName(value: string | null): value is ThemeName {
  return !!value && THEME_OPTIONS.some((theme) => theme.value === value);
}

function setDocumentTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemeName(stored)) {
      setThemeState(stored);
      setDocumentTheme(stored);
    } else {
      setDocumentTheme(DEFAULT_THEME);
    }
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    setDocumentTheme(next);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setDocumentTheme(theme);
  }, [theme, mounted]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
