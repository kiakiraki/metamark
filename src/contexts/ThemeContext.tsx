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

const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system';

const themeStore = (() => {
  let currentTheme: Theme = 'system';
  let initialized = false;
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const ensureInitialized = () => {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;
    const saved = window.localStorage.getItem('theme');
    if (isTheme(saved)) currentTheme = saved;
    window.addEventListener('storage', (event) => {
      if (event.key !== 'theme') return;
      if (isTheme(event.newValue) && event.newValue !== currentTheme) {
        currentTheme = event.newValue;
        notify();
      }
    });
  };

  const getSnapshot = (): Theme => {
    ensureInitialized();
    return currentTheme;
  };

  const getServerSnapshot = (): Theme => 'system';

  const subscribe = (listener: () => void) => {
    ensureInitialized();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const setTheme = (next: Theme) => {
    ensureInitialized();
    if (currentTheme === next) return;
    currentTheme = next;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', next);
    }
    notify();
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
