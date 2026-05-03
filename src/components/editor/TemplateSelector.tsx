'use client';

import { motion } from 'framer-motion';
import { useTemplateStore } from '@/stores/templateStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { templates } from '@/templates';
import type { TemplatePreset } from '@/types/template';
import { PositionSelector } from './PositionSelector';
import clsx from 'clsx';

export function TemplateSelector() {
  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const selectTemplate = useTemplateStore((state) => state.selectTemplate);
  const captionInvert = useSettingsStore((state) => state.captionInvert);
  const setCaptionInvert = useSettingsStore((state) => state.setCaptionInvert);
  const imprintColor = useSettingsStore((state) => state.imprintColor);
  const setImprintColor = useSettingsStore((state) => state.setImprintColor);

  const templatePresets: {
    key: TemplatePreset;
    name: string;
    description: string;
  }[] = [
    { key: 'caption', name: 'Caption', description: 'Black footer bar' },
    { key: 'compact', name: 'Compact', description: '2×2 frosted info card' },
    { key: 'technical', name: 'Glass', description: 'Frosted glass card' },
    { key: 'imprint', name: 'Imprint', description: 'Frameless text on photo' },
    { key: 'film', name: 'Film', description: 'Vintage style' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Template
      </h3>

      <div className="grid grid-cols-1 gap-3">
        {templatePresets.map((preset) => {
          const template = templates[preset.key];
          const isSelected = selectedTemplate?.id === preset.key;
          const isAvailable = template?.id === preset.key; // Check if template is fully implemented

          return (
            <motion.button
              key={preset.key}
              onClick={() => isAvailable && selectTemplate(preset.key)}
              disabled={!isAvailable}
              className={clsx(
                'p-4 rounded-lg border text-left transition-colors',
                {
                  'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20':
                    isSelected && isAvailable,
                  'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600':
                    !isSelected && isAvailable,
                  'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800':
                    !isAvailable,
                }
              )}
              whileHover={isAvailable ? { scale: 1.02 } : {}}
              whileTap={isAvailable ? { scale: 0.98 } : {}}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {preset.name}
                    {!isAvailable && (
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                        (Coming Soon)
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {preset.description}
                  </p>
                </div>

                {isSelected && isAvailable && (
                  <div className="text-blue-600 dark:text-blue-400">✓</div>
                )}
              </div>

              {isAvailable && (
                <div className="mt-3 flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: template.style.backgroundColor }}
                  />
                  <span>{template.style.fontFamily.split(',')[0]}</span>
                  <span>•</span>
                  <span>{template.style.fontSize}px</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {selectedTemplate && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Template Details
          </h4>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <p>Font: {selectedTemplate.style.fontFamily}</p>
            <p>Size: {selectedTemplate.style.fontSize}px</p>
            <p>
              Position: {selectedTemplate.position.x},{' '}
              {selectedTemplate.position.y}
            </p>
            <p>
              Fields: {selectedTemplate.fields.filter((f) => f.visible).length}{' '}
              visible
            </p>
          </div>
        </div>
      )}

      {selectedTemplate?.customDraw === 'imprint' && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="space-y-0.5">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Invert text color
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Black text instead of white
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={imprintColor === 'black'}
              onClick={() =>
                setImprintColor(imprintColor === 'black' ? 'white' : 'black')
              }
              className={clsx(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'dark:focus:ring-offset-gray-700',
                imprintColor === 'black'
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  imprintColor === 'black' ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </label>
        </div>
      )}

      {selectedTemplate?.customDraw === 'caption' && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="space-y-0.5">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Invert colors
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                White background with black text
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={captionInvert}
              onClick={() => setCaptionInvert(!captionInvert)}
              className={clsx(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'dark:focus:ring-offset-gray-700',
                captionInvert
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  captionInvert ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </label>
        </div>
      )}

      {/* Position Selector */}
      <div className="border-t pt-6">
        <PositionSelector />
      </div>
    </div>
  );
}
