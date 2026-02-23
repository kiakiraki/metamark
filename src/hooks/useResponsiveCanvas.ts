import { useState, useCallback, useEffect, type RefObject } from 'react';
import type { ProcessedImage } from '@/types/image';

export function useResponsiveCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  currentImage: ProcessedImage | null
) {
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  const updateCanvasDisplaySize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) {
      setContainerHeight(null);
      return;
    }

    const devicePixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const logicalWidth = canvas.width / devicePixelRatio;
    const logicalHeight = canvas.height / devicePixelRatio;
    const canvasAspectRatio = logicalWidth / logicalHeight;

    const windowWidth =
      typeof window !== 'undefined' ? window.innerWidth : 1024;
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth < 1024;

    const horizontalMargin = 40;

    const maxDisplayWidth = isMobile
      ? Math.min(300, windowWidth - horizontalMargin)
      : isTablet
        ? Math.min(500, windowWidth - horizontalMargin)
        : Math.min(700, windowWidth - horizontalMargin);

    const maxDisplayHeight = isMobile ? 400 : isTablet ? 500 : 600;

    let displayWidth, displayHeight;

    if (canvasAspectRatio > maxDisplayWidth / maxDisplayHeight) {
      displayWidth = Math.min(maxDisplayWidth, logicalWidth);
      displayHeight = displayWidth / canvasAspectRatio;
    } else {
      displayHeight = Math.min(maxDisplayHeight, logicalHeight);
      displayWidth = displayHeight * canvasAspectRatio;
    }

    if (displayWidth > maxDisplayWidth) {
      displayWidth = maxDisplayWidth;
      displayHeight = displayWidth / canvasAspectRatio;
    }

    if (displayHeight > maxDisplayHeight) {
      displayHeight = maxDisplayHeight;
      displayWidth = displayHeight * canvasAspectRatio;
    }

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const topMargin = 20;
    const bottomMargin = 20;
    const infoBarHeight = 40;
    const paddingHeight = topMargin + bottomMargin + infoBarHeight;
    setContainerHeight(displayHeight + paddingHeight);
  }, [canvasRef, currentImage]);

  useEffect(() => {
    const handleResize = () => {
      updateCanvasDisplaySize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasDisplaySize]);

  return {
    containerHeight,
    updateCanvasDisplaySize,
  };
}
