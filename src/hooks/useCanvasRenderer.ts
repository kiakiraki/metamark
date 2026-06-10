import { useRef, useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { ImageProcessor } from '@/services/imageProcessor';
import { CanvasRenderer } from '@/services/canvasRenderer';
import type { NormalizedExifData } from '@/types/exif';
import type { ProcessedImage } from '@/types/image';
import type { PositionPreset, Template } from '@/types/template';
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
  exifData: NormalizedExifData,
  overlayPosition: PositionPreset
): { width: number; height: number } {
  const { width: fullW, height: fullH } = CanvasRenderer.calculateOptimalSize(
    imageWidth,
    imageHeight
  );
  const bpFull = CanvasRenderer.estimateBottomPaddingHeight(
    template,
    exifData,
    fullW,
    fullH,
    overlayPosition
  );
  const sidePad = CanvasRenderer.estimateGalleryPlacardSidePadding(
    template,
    fullW,
    overlayPosition
  );
  const totalFullW = fullW + sidePad.leftPad + sidePad.rightPad;
  const totalFullH = fullH + bpFull;
  const fullAspect = totalFullW / totalFullH;

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

  // settings.width/height represent the image area (without bottom/side
  // padding); render() re-adds the padding internally. Convert from full-canvas
  // display size back to image-area display size.
  const widthRatio = totalFullW > 0 ? fullW / totalFullW : 1;
  const heightRatio = totalFullH > 0 ? fullH / totalFullH : 1;
  const displayBaseW = displayCanvasW * widthRatio;
  const displayBaseH = displayCanvasH * heightRatio;

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
    // Re-runs of this effect must not let an older in-flight render finish
    // after a newer one: the slower run would draw a stale image/template
    // onto the canvas, and its `finally` would clear isRendering while the
    // newer render is still working.
    let cancelled = false;

    const renderCanvas = async () => {
      if (!currentImage || !selectedTemplate || !canvasRef.current) {
        setIsRendering(false);
        return;
      }

      setIsRendering(true);

      try {
        const image = await ImageProcessor.createImageElement(currentImage.url);
        if (cancelled) return;

        const exifData = currentExifData ?? PLACEHOLDER_EXIF_DATA;
        const { width: renderWidth, height: renderHeight } =
          computePreviewRenderSize(
            currentImage.width,
            currentImage.height,
            selectedTemplate,
            exifData,
            canvasSettings.overlayPosition
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
        if (cancelled) return;
        updateCanvasDisplaySize();
      } catch (error: unknown) {
        if (!cancelled) {
          console.error('Error rendering canvas:', error);
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    };

    const timer = setTimeout(renderCanvas, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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
