import { useRef, useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { ImageProcessor } from '@/services/imageProcessor';
import { CanvasRenderer } from '@/services/canvasRenderer';
import type { NormalizedExifData } from '@/types/exif';
import type { ProcessedImage } from '@/types/image';
import type { Template } from '@/types/template';
import { getDisplayBounds, useResponsiveCanvas } from './useResponsiveCanvas';
import { useEffectiveExifData } from './useEffectiveExifData';
import { useEffectiveTemplate } from './useEffectiveTemplate';

// 2x oversample over the on-screen size: keeps a Retina-grade source
// for the browser's CSS scaler while letting step-down do the heavy
// lifting on the source-image side. Higher values reintroduce the
// big CSS scaling we're trying to avoid.
const PREVIEW_OVERSAMPLE = 2;

// Pick a render size for the preview canvas that matches the on-screen
// display, with a fixed oversample factor. We estimate the final canvas
// aspect ratio (image + bottom-padding overlay) at full resolution first
// — bottom-padding height is recomputed inside render at the new scale
// so the result is close-enough; useResponsiveCanvas re-fits CSS afterwards.
function computePreviewRenderSize(
  imageWidth: number,
  imageHeight: number,
  template: Template,
  exifData: NormalizedExifData
): { width: number; height: number } {
  const { width: fullW, height: fullH } = CanvasRenderer.calculateOptimalSize(
    imageWidth,
    imageHeight
  );
  const bpFull = CanvasRenderer.estimateBottomPaddingHeight(
    template,
    exifData,
    fullW,
    fullH
  );
  const totalFullH = fullH + bpFull;
  const fullAspect = fullW / totalFullH;

  const { maxDisplayWidth, maxDisplayHeight } = getDisplayBounds();
  let displayCanvasW: number;
  let displayCanvasH: number;
  if (fullAspect > maxDisplayWidth / maxDisplayHeight) {
    displayCanvasW = maxDisplayWidth;
    displayCanvasH = displayCanvasW / fullAspect;
  } else {
    displayCanvasH = maxDisplayHeight;
    displayCanvasW = displayCanvasH * fullAspect;
  }

  // settings.width/height represent the image area (without bottom padding);
  // render() re-adds the padding internally. Convert from full-canvas display
  // size back to image-area display size.
  const imageAreaRatio = totalFullH > 0 ? fullH / totalFullH : 1;
  const displayBaseW = displayCanvasW;
  const displayBaseH = displayCanvasH * imageAreaRatio;

  return {
    width: Math.max(1, Math.round(displayBaseW * PREVIEW_OVERSAMPLE)),
    height: Math.max(1, Math.round(displayBaseH * PREVIEW_OVERSAMPLE)),
  };
}

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
  location: 'Loading...',
};

export function useCanvasRenderer(currentImage: ProcessedImage | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  const currentExifData = useEffectiveExifData(currentImage?.id);
  const selectedTemplate = useEffectiveTemplate();
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

        const exifData = currentExifData ?? PLACEHOLDER_EXIF_DATA;
        const { width: renderWidth, height: renderHeight } =
          computePreviewRenderSize(
            currentImage.width,
            currentImage.height,
            selectedTemplate,
            exifData
          );

        await CanvasRenderer.render({
          canvas: canvasRef.current,
          image,
          template: selectedTemplate,
          exifData,
          settings: {
            ...canvasSettings,
            width: renderWidth,
            height: renderHeight,
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
