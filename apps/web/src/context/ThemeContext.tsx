import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'app-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored ?? 'light';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initialTheme = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (!initialTheme || initialTheme === 'system') {
      return getSystemTheme();
    }
    return initialTheme;
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (nextTheme: ThemeMode) => {
      const nextResolved = nextTheme === 'system' ? getSystemTheme() : nextTheme;
      setResolvedTheme(nextResolved);

      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(nextResolved);
      document.documentElement.setAttribute('data-theme', nextResolved);
      document.documentElement.style.colorScheme = nextResolved;
    };

    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (nextTheme: ThemeMode) => setThemeState(nextTheme),
      toggleTheme: () => {
        setThemeState((prev) => {
          const currentResolved = prev === 'system' ? getSystemTheme() : prev;
          return currentResolved === 'dark' ? 'light' : 'dark';
        });
      },
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};