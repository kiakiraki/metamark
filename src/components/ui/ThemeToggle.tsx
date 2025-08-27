'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import clsx from 'clsx';

const themes = [
  { key: 'light' as const, label: 'Light', icon: '☀️' },
  { key: 'dark' as const, label: 'Dark', icon: '🌙' },
  { key: 'system' as const, label: 'System', icon: '💻' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      {themes.map((themeOption) => {
        const isSelected = theme === themeOption.key;

        return (
          <motion.button
            key={themeOption.key}
            onClick={() => setTheme(themeOption.key)}
            className={clsx(
              'relative px-3 py-2 rounded-md text-sm font-medium transition-colors',
              'flex items-center space-x-2',
              {
                'text-blue-600 dark:text-blue-400': isSelected,
                'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100':
                  !isSelected,
              }
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSelected && (
              <motion.div
                className="absolute inset-0 bg-white dark:bg-gray-600 rounded-md shadow-sm"
                layoutId="theme-toggle-bg"
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative flex items-center space-x-1">
              <span>{themeOption.icon}</span>
              <span className="hidden sm:inline">{themeOption.label}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}