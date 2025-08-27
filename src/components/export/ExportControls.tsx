'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSelectedImage } from '@/stores/imageStore';
import { useExifStore } from '@/stores/exifStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { CanvasRenderer } from '@/services/canvasRenderer';
import { ImageProcessor } from '@/services/imageProcessor';
import clsx from 'clsx';

export function ExportControls() {
  const [isExporting, setIsExporting] = useState(false);

  const selectedImage = useSelectedImage();
  const getNormalizedData = useExifStore((state) => state.getNormalizedData);
  const { selectedTemplate } = useTemplateStore();
  const { canvasSettings, updateCanvasSettings } = useSettingsStore();

  const handleExport = async () => {
    if (!selectedImage || !selectedTemplate) return;

    setIsExporting(true);

    try {
      const image = await ImageProcessor.createImageElement(selectedImage.url);
      const exifData = getNormalizedData(selectedImage.id);

      if (!exifData) {
        throw new Error('No EXIF data available');
      }

      // Create temporary canvas for export
      const canvas = document.createElement('canvas');

      // Use original image dimensions for high quality export
      const { width, height } = CanvasRenderer.calculateOptimalSize(
        selectedImage.width,
        selectedImage.height
      );

      const blob = await CanvasRenderer.renderToBlob({
        canvas,
        image,
        template: selectedTemplate,
        exifData,
        settings: {
          ...canvasSettings,
          width,
          height,
        },
      });

      // Download the blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metamark_${selectedImage.name.replace(/\.[^/.]+$/, '')}.${canvasSettings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = selectedImage && selectedTemplate;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Export</h3>

      {/* Format Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Format</h4>
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
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quality</h4>
          <div className="space-y-2">
            <input
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
        onClick={handleExport}
        disabled={!canExport || isExporting}
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
        {selectedImage && selectedTemplate && (
          <p className="text-green-600">✓ Ready to export</p>
        )}
      </div>
    </div>
  );
}
