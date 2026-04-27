import { useRef, useState, useEffect } from 'react';
import { useExifStore } from '@/stores/exifStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ImageProcessor } from '@/services/imageProcessor';
import { CanvasRenderer } from '@/services/canvasRenderer';
import type { NormalizedExifData } from '@/types/exif';
import type { ProcessedImage } from '@/types/image';
import { useResponsiveCanvas } from './useResponsiveCanvas';

const PLACEHOLDER_EXIF_DATA: NormalizedExifData = {
  camera: 'Loading...',
  cameraMake: 'Loading...',
  cameraModel: 'Loading...',
  lens: 'Loading...',
  focalLength: 'Loading...',
  aperture: 'Loading...',
  shutterSpeed: 'Loading...',
  iso: 'Loading...',
  dateTime: 'Loading...',
};

export function useCanvasRenderer(currentImage: ProcessedImage | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  const currentExifData = useExifStore((state) =>
    currentImage?.id ? state.normalizedData[currentImage.id] : undefined
  );
  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const canvasSettings = useSettingsStore((state) => state.canvasSettings);

  const { containerHeight, updateCanvasDisplaySize } = useResponsiveCanvas(
    canvasRef,
    currentImage
  );

  useEffect(() => {
    const renderCanvas = async () => {
      if (!currentImage || !selectedTemplate || !canvasRef.current) return;

      setIsRendering(true);

      try {
        const image = await ImageProcessor.createImageElement(currentImage.url);

        const { width, height } = CanvasRenderer.calculateOptimalSize(
          currentImage.width,
          currentImage.height
        );

        await CanvasRenderer.render({
          canvas: canvasRef.current,
          image,
          template: selectedTemplate,
          exifData: currentExifData ?? PLACEHOLDER_EXIF_DATA,
          settings: {
            ...canvasSettings,
            width,
            height,
          },
        });
        updateCanvasDisplaySize();
      } catch (error: unknown) {
        console.error('Error rendering canvas:', error);
      } finally {
        setIsRendering(false);
      }
    };

    const timer = setTimeout(renderCanvas, 50);
    return () => clearTimeout(timer);
  }, [
    currentImage,
    selectedTemplate,
    canvasSettings,
    currentExifData,
    updateCanvasDisplaySize,
  ]);

  return {
    canvasRef,
    isRendering,
    containerHeight,
  };
}
