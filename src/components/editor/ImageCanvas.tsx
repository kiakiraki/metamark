'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSelectedImage } from '@/stores/imageStore';
import { useExifStore } from '@/stores/exifStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { CanvasRenderer } from '@/services/canvasRenderer';
import { ImageProcessor } from '@/services/imageProcessor';

export function ImageCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  
  const selectedImage = useSelectedImage();
  const getNormalizedData = useExifStore((state) => state.getNormalizedData);
  const { selectedTemplate } = useTemplateStore();
  const { canvasSettings } = useSettingsStore();

  useEffect(() => {
    renderCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImage, selectedTemplate, canvasSettings]);

  const renderCanvas = async () => {
    if (!selectedImage || !selectedTemplate || !canvasRef.current) return;

    setIsRendering(true);
    
    try {
      const image = await ImageProcessor.createImageElement(selectedImage.url);
      const exifData = getNormalizedData(selectedImage.id);
      
      if (!exifData) {
        console.warn('No EXIF data available for rendering');
        return;
      }

      // Calculate optimal canvas size based on image dimensions
      const { width, height } = CanvasRenderer.calculateOptimalSize(
        selectedImage.width,
        selectedImage.height
      );

      await CanvasRenderer.render({
        canvas: canvasRef.current,
        image,
        template: selectedTemplate,
        exifData,
        settings: {
          ...canvasSettings,
          width,
          height,
        },
      });
      
    } catch (error) {
      console.error('Error rendering canvas:', error);
    } finally {
      setIsRendering(false);
    }
  };

  if (!selectedImage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center space-y-2">
          <div className="text-4xl">🖼️</div>
          <p className="text-gray-500">Select an image to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Preview</h3>
        {isRendering && (
          <div className="text-sm text-gray-500">Rendering...</div>
        )}
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          className="relative max-w-full max-h-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full border border-gray-200 rounded shadow-lg"
            style={{ 
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
            }}
          />
          
          {isRendering && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}