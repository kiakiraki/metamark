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

  const getNormalizedData = useExifStore((state) => state.getNormalizedData);
  const normalizedData = useExifStore((state) => state.normalizedData);
  const { selectedTemplate } = useTemplateStore();
  const { canvasSettings } = useSettingsStore();

  const { containerHeight, updateCanvasDisplaySize } = useResponsiveCanvas(
    canvasRef,
    currentImage
  );

  const currentExifData = currentImage?.id
    ? normalizedData[currentImage.id]
    : undefined;

  useEffect(() => {
    const renderCanvas = async () => {
      if (!currentImage || !selectedTemplate || !canvasRef.current) return;

      setIsRendering(true);

      try {
        const image = await ImageProcessor.createImageElement(currentImage.url);
        let exifData = getNormalizedData(currentImage.id);

        const { width, height } = CanvasRenderer.calculateOptimalSize(
          currentImage.width,
          currentImage.height
        );

        if (!exifData) {
          exifData = PLACEHOLDER_EXIF_DATA;
        }

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
        updateCanvasDisplaySize();
      } catch (error: unknown) {
        console.error('Error rendering canvas:', error);
      } finally {
        setIsRendering(false);
      }
    };

    const timer = setTimeout(renderCanvas, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImage, selectedTemplate, canvasSettings, currentExifData]);

  return {
    canvasRef,
    isRendering,
    containerHeight,
  };
}
