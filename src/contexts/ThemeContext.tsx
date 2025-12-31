'use client';

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeStore = (() => {
  let currentTheme: Theme = 'system';
  const listeners = new Set<() => void>();

  const getSnapshot = (): Theme => {
    if (typeof window === 'undefined') return currentTheme;
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    return savedTheme ?? currentTheme;
  };

  const getServerSnapshot = (): Theme => 'system';

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (typeof window === 'undefined') {
      return () => listeners.delete(listener);
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'theme') {
        listener();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', handleStorage);
    };
  };

  const setTheme = (next: Theme) => {
    currentTheme = next;
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', next);
    }
    listeners.forEach((listener) => listener());
  };

  return { getSnapshot, getServerSnapshot, subscribe, setTheme };
})();

const subscribeSystemTheme = (listener: () => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => listener();
  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
};

const getSystemSnapshot = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const getServerSystemSnapshot = (): 'light' | 'dark' => 'light';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot
  );
  const systemTheme = useSyncExternalStore<'light' | 'dark'>(
    subscribeSystemTheme,
    getSystemSnapshot,
    getServerSystemSnapshot
  );

  // Derived value: actualTheme is calculated from theme and systemTheme
  const actualTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;

    if (actualTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [actualTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme: themeStore.setTheme, actualTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
