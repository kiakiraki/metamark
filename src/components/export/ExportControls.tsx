import { motion } from 'framer-motion';
import { useSelectedImage } from '@/stores/imageStore';
import { useSettingsStore } from '@/stores/settingsStore';
import clsx from 'clsx';
import { useEffectiveTemplate } from '@/hooks/useEffectiveTemplate';
import { useEffectiveExifData } from '@/hooks/useEffectiveExifData';
import { useImageExport } from '@/hooks/useImageExport';

export function ExportControls() {
  const { exportImage, isExporting, canExport } = useImageExport();

  const selectedImage = useSelectedImage();
  const exifData = useEffectiveExifData(selectedImage?.id);
  const selectedTemplate = useEffectiveTemplate();
  const canvasSettings = useSettingsStore((state) => state.canvasSettings);
  const updateCanvasSettings = useSettingsStore(
    (state) => state.updateCanvasSettings
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Export
      </h3>

      {/* Format Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Format
        </h4>
        <div className="flex space-x-2">
          {(['png', 'jpeg'] as const).map((format) => (
            <button
              key={format}
              onClick={() => updateCanvasSettings({ format })}
              className={clsx('px-3 py-1 text-sm rounded border', {
                'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300':
                  canvasSettings.format === format,
                'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600':
                  canvasSettings.format !== format,
              })}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Quality Settings */}
      {canvasSettings.format === 'jpeg' && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Quality
          </h4>
          <div className="space-y-2">
            <label htmlFor="quality-slider" className="sr-only">
              JPEG Quality
            </label>
            <input
              id="quality-slider"
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={canvasSettings.quality}
              onChange={(e) =>
                updateCanvasSettings({ quality: parseFloat(e.target.value) })
              }
              className="w-full"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {Math.round(canvasSettings.quality * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Export Button */}
      <motion.button
        onClick={() => exportImage()}
        disabled={!canExport || isExporting}
        aria-busy={isExporting}
        title={
          !selectedImage
            ? 'Select an image first'
            : !selectedTemplate
              ? 'Choose a template first'
              : !exifData
                ? 'Reading image metadata...'
                : isExporting
                  ? 'Exporting...'
                  : 'Download image with overlay'
        }
        className={clsx(
          'w-full py-3 px-4 rounded-lg font-medium text-center transition-colors',
          {
            'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600':
              canExport && !isExporting,
            'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400':
              !canExport || isExporting,
          }
        )}
        whileHover={canExport && !isExporting ? { scale: 1.02 } : {}}
        whileTap={canExport && !isExporting ? { scale: 0.98 } : {}}
      >
        {isExporting ? 'Exporting...' : 'Download Image'}
      </motion.button>

      {/* Status */}
      <div className="text-xs text-gray-500 space-y-1">
        {!selectedImage && <p>• Select an image to export</p>}
        {selectedImage && !selectedTemplate && <p>• Choose a template</p>}
        {selectedImage && selectedTemplate && !exifData && (
          <p>• Reading image metadata...</p>
        )}
        {canExport && <p className="text-green-600">✓ Ready to export</p>}
      </div>
    </div>
  );
}
