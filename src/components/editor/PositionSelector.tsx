'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useSettingsStore } from '@/stores/settingsStore';
import type { PositionPreset } from '@/types/template';

const POSITION_OPTIONS: { key: PositionPreset; label: string; icon: string }[] =
  [
    { key: 'top-left', label: 'Top Left', icon: '↖️' },
    { key: 'top-right', label: 'Top Right', icon: '↗️' },
    { key: 'bottom-left', label: 'Bottom Left', icon: '↙️' },
    { key: 'bottom-right', label: 'Bottom Right', icon: '↘️' },
  ];

export function PositionSelector() {
  const { canvasSettings, updateCanvasSettings } = useSettingsStore();
  const currentPosition = canvasSettings.overlayPosition;

  const handlePositionChange = (position: PositionPreset) => {
    updateCanvasSettings({ overlayPosition: position });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Overlay Position
      </h3>

      {/* Visual Grid Selector */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-2 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors">
          {POSITION_OPTIONS.map((option) => {
            const isSelected = currentPosition === option.key;

            return (
              <motion.button
                key={option.key}
                onClick={() => handlePositionChange(option.key)}
                className={clsx(
                  'relative p-3 rounded-lg border-2 transition-all duration-200',
                  'flex items-center justify-center min-h-[60px]',
                  {
                    'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300':
                      isSelected,
                    'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-700':
                      !isSelected,
                  }
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-xs font-medium">{option.label}</div>
                </div>

                {isSelected && (
                  <motion.div
                    className="absolute inset-0 border-2 border-blue-500 rounded-lg"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Preview Rectangle */}
        <div className="absolute inset-4 pointer-events-none">
          <div className="relative w-full h-full border border-gray-400 dark:border-gray-500 rounded bg-gray-200 dark:bg-gray-600 bg-opacity-50 transition-colors">
            {/* Preview Overlay */}
            <motion.div
              className={clsx(
                'absolute w-8 h-6 bg-blue-500 rounded-sm opacity-75',
                {
                  'top-1 left-1': currentPosition === 'top-left',
                  'top-1 right-1': currentPosition === 'top-right',
                  'bottom-1 left-1': currentPosition === 'bottom-left',
                  'bottom-1 right-1': currentPosition === 'bottom-right',
                }
              )}
              layout
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Text Description */}
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Choose where the EXIF overlay will appear on your image
      </p>
    </div>
  );
}
