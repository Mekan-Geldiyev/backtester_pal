'use client';

import { THEME_OPTIONS, useTheme } from '@/components/ThemeProvider';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <label className="theme-select-wrap" aria-label="Color theme">
      <span>Theme</span>
      <select
        className="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as (typeof THEME_OPTIONS)[number]['value'])}
      >
        {THEME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
