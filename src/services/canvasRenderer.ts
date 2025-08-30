import type { RenderOptions, CanvasSettings } from '@/types/canvas';
import type { Template } from '@/types/template';
import type { NormalizedExifData } from '@/types/exif';

export class CanvasRenderer {
  static async render(options: RenderOptions): Promise<string> {
    const { canvas, image, template, exifData, settings } = options;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Unable to get canvas context');
    }

    // Get device pixel ratio for high-DPI displays
    const devicePixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Set actual size in memory (scaled for device pixel ratio)
    canvas.width = settings.width * devicePixelRatio;
    canvas.height = settings.height * devicePixelRatio;

    // Scale the context to ensure correct drawing operations
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, settings.width, settings.height);

    // Use the original image aspect ratio for accurate drawing
    const originalImageAspectRatio = image.width / image.height;
    const canvasAspectRatio = settings.width / settings.height;

    let drawWidth, drawHeight, drawX, drawY;

    if (originalImageAspectRatio > canvasAspectRatio) {
      // Image is wider than canvas - fit width, calculate height from original aspect ratio
      drawWidth = settings.width;
      drawHeight = settings.width / originalImageAspectRatio;
      drawX = 0;
      drawY = (settings.height - drawHeight) / 2;
    } else {
      // Image is taller than canvas - fit height, calculate width from original aspect ratio
      drawHeight = settings.height;
      drawWidth = settings.height * originalImageAspectRatio;
      drawX = (settings.width - drawWidth) / 2;
      drawY = 0;
    }

    // Draw image with preserved aspect ratio
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    // Calculate scale factor based on canvas size
    const scaleFactor = Math.min(settings.width, settings.height) / 1000; // Base scale for 1000px

    // Ensure Film font is loaded before drawing overlay
    if (template.id === 'film') {
      try {
        const fontSize = Math.max(12, template.style.fontSize * scaleFactor);
        // Attempt to load DotGothic16; ignore if not supported
        // @ts-expect-error: document.fonts may not exist in all environments
        if (document && document.fonts && document.fonts.load) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (document as any).fonts.load(`${fontSize}px DotGothic16`);
        }
      } catch {
        // noop
      }
    }

    // Calculate dynamic position based on overlay position setting and exif data
    // For Film style, fix overlay position: landscape -> bottom-right, portrait -> top-right
    const isPortraitImage = image.height > image.width;
    const effectiveSettings: CanvasSettings =
      template.id === 'film'
        ? {
            ...settings,
            overlayPosition: isPortraitImage ? 'top-right' : 'bottom-right',
          }
        : settings;

    const dynamicTemplate = this.calculateDynamicPosition(
      template,
      effectiveSettings,
      settings.width,
      settings.height,
      exifData,
      { drawX, drawY, drawWidth, drawHeight }
    );

    // Draw template overlay with scaling
    this.drawTemplate(ctx, dynamicTemplate, exifData, scaleFactor, {
      imageIsPortrait: isPortraitImage,
      overlayPosition: effectiveSettings.overlayPosition,
    });

    // Return as data URL
    return canvas.toDataURL(
      settings.format === 'png' ? 'image/png' : 'image/jpeg',
      settings.quality
    );
  }

  private static calculateDynamicPosition(
    template: Template,
    settings: CanvasSettings,
    canvasWidth: number,
    canvasHeight: number,
    exifData: NormalizedExifData,
    drawRect?: {
      drawX: number;
      drawY: number;
      drawWidth: number;
      drawHeight: number;
    }
  ): Template {
    const { overlayPosition } = settings;

    // Calculate responsive margin based on canvas size
    const scaleFactor = Math.min(canvasWidth, canvasHeight) / 1000;
    const baseMargin = 20;
    const margin = Math.max(10, Math.min(40, baseMargin * scaleFactor)); // Clamp between 10-40px

    // Calculate scaled template dimensions
    const scaledWidth = template.position.width * scaleFactor;
    const scaledHeight = this.calculateDynamicTemplateHeight(
      template,
      exifData,
      scaleFactor
    );

    let x: number, y: number;

    // If we know where the image was drawn, align overlay to the image bounds
    const hasDrawRect = !!drawRect;
    const imageLeft = hasDrawRect ? drawRect!.drawX : 0;
    const imageTop = hasDrawRect ? drawRect!.drawY : 0;
    const imageRight = hasDrawRect
      ? drawRect!.drawX + drawRect!.drawWidth
      : canvasWidth;
    const imageBottom = hasDrawRect
      ? drawRect!.drawY + drawRect!.drawHeight
      : canvasHeight;

    const isFilm = template.id === 'film';
    const extraInset = isFilm ? margin : 0; // nudge inward for Film

    switch (overlayPosition) {
      case 'top-left':
        x = (hasDrawRect ? imageLeft : 0) + margin;
        y = (hasDrawRect ? imageTop : 0) + margin;
        break;
      case 'top-right':
        x =
          (hasDrawRect ? imageRight : canvasWidth) -
          scaledWidth -
          (margin + extraInset);
        y = (hasDrawRect ? imageTop : 0) + (margin + extraInset);
        break;
      case 'bottom-left':
        x = (hasDrawRect ? imageLeft : 0) + margin;
        y = (hasDrawRect ? imageBottom : canvasHeight) - scaledHeight - margin;
        break;
      case 'bottom-right':
        x =
          (hasDrawRect ? imageRight : canvasWidth) -
          scaledWidth -
          (margin + extraInset);
        y =
          (hasDrawRect ? imageBottom : canvasHeight) -
          scaledHeight -
          (margin + extraInset);
        break;
      default:
        x = template.position.x;
        y = template.position.y;
    }

    return {
      ...template,
      position: {
        ...template.position,
        x,
        y,
        height: scaledHeight / scaleFactor, // Store the calculated height back to template
      },
    };
  }

  private static calculateDynamicTemplateHeight(
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number
  ): number {
    const scaledFontSize = Math.max(12, template.style.fontSize * scaleFactor);
    const scaledPadding = template.style.padding * scaleFactor;
    const lineHeight = scaledFontSize * 1.4;

    // Create a temporary canvas to measure text and calculate wrapping
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      // Fallback: count visible fields without wrapping
      const visibleFields = template.fields.filter((field) => field.visible);
      const linesToDisplay = visibleFields.length;
      return (
        scaledPadding + // top padding
        scaledFontSize + // first line baseline
        (linesToDisplay - 1) * lineHeight + // additional lines
        scaledPadding // bottom padding
      );
    }

    tempCtx.font = `${scaledFontSize}px ${template.style.fontFamily}`;

    // Calculate available width for text
    const templateWidth = template.position.width * scaleFactor;
    const maxTextWidth = templateWidth - scaledPadding * 2;

    // Count total lines including wrapped text
    const visibleFields = template.fields.filter((field) => field.visible);
    let totalLines = 0;

    for (const field of visibleFields) {
      const value = exifData[field.key];
      const text = value
        ? field.format
          ? field.format(value)
          : `${field.label}: ${value}`
        : `${field.label}: N/A`;

      // Calculate wrapped lines for this text
      const wrappedLines = this.wrapText(tempCtx, text, maxTextWidth);
      totalLines += wrappedLines.length;
    }

    // Calculate dynamic height based on total wrapped lines
    return (
      scaledPadding + // top padding
      scaledFontSize + // first line baseline
      (totalLines - 1) * lineHeight + // additional lines
      scaledPadding // bottom padding
    );
  }

  private static wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private static drawTemplate(
    ctx: CanvasRenderingContext2D,
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number = 1,
    options?: {
      imageIsPortrait?: boolean;
      overlayPosition?:
        | 'top-left'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-right';
    }
  ): void {
    const { style, position, fields } = template;

    // Scale dimensions (positions are already calculated as absolute values in calculateDynamicPosition)
    const scaledFontSize = Math.max(12, style.fontSize * scaleFactor);
    const scaledPadding = style.padding * scaleFactor;
    const scaledBorderRadius = style.borderRadius * scaleFactor;
    const scaledX = position.x;
    const scaledY = position.y;
    const scaledWidth = position.width * scaleFactor;

    // Calculate line height
    const lineHeight = scaledFontSize * 1.4;

    // Set up text rendering first to measure text
    ctx.font = `${scaledFontSize}px ${style.fontFamily}`;
    ctx.textAlign = position.alignment as CanvasTextAlign;

    // Calculate available width for text wrapping
    const maxTextWidth = scaledWidth - scaledPadding * 2;

    // Filter visible fields and prepare text content with wrapping
    const visibleFields = fields.filter((field) => field.visible);
    const allTextLines: string[] = [];

    for (const field of visibleFields) {
      const value = exifData[field.key];
      const text = value
        ? field.format
          ? field.format(value)
          : `${field.label}: ${value}`
        : `${field.label}: N/A`;

      // Wrap text if it's too long
      const wrappedLines = this.wrapText(ctx, text, maxTextWidth);
      allTextLines.push(...wrappedLines);
    }

    // Calculate dynamic height based on total wrapped lines
    const dynamicHeight =
      scaledPadding + // top padding
      scaledFontSize + // first line baseline
      (allTextLines.length - 1) * lineHeight + // additional lines
      scaledPadding; // bottom padding

    // Use dynamic height
    const scaledHeight = dynamicHeight;

    // Draw background with dynamic height
    ctx.globalAlpha = style.opacity;
    ctx.fillStyle = style.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      scaledX,
      scaledY,
      scaledWidth,
      scaledHeight,
      scaledBorderRadius
    );
    ctx.fill();

    // Draw text
    ctx.globalAlpha = 1;
    ctx.fillStyle = style.textColor;

    // Improve readability for film-style (no background) with a soft glow
    if (template.id === 'film') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 6 * Math.max(1, scaleFactor);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    const shouldRotate =
      template.id === 'film' && options?.imageIsPortrait === true;

    if (shouldRotate && options?.overlayPosition?.includes('right')) {
      // Rotate 90 degrees at the right edge for portrait images
      const isTop = options.overlayPosition === 'top-right';
      const anchorX = scaledX + scaledWidth - scaledPadding;
      const anchorY = isTop
        ? scaledY + scaledPadding
        : scaledY + (scaledHeight - scaledPadding);

      ctx.save();
      ctx.translate(anchorX, anchorY);
      // Reverse rotation direction per feedback
      ctx.rotate(isTop ? -Math.PI / 2 : Math.PI / 2);
      const prevAlign = ctx.textAlign;
      const prevBaseline = ctx.textBaseline;
      // Anchor to the edge and draw inward to avoid clipping
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';

      // Render lines along the long edge
      let offset = 0;
      for (const line of allTextLines) {
        // With right alignment, x is the right edge of the text in rotated coordinates
        ctx.fillText(line, isTop ? -offset : offset, 0);
        offset += lineHeight;
      }

      // Restore context
      ctx.textAlign = prevAlign;
      ctx.textBaseline = prevBaseline as CanvasTextBaseline;
      ctx.restore();
    } else {
      let currentY = scaledY + scaledPadding + scaledFontSize;
      const textX =
        position.alignment === 'center'
          ? scaledX + scaledWidth / 2
          : position.alignment === 'right'
            ? scaledX + scaledWidth - scaledPadding
            : scaledX + scaledPadding;

      // Render all wrapped text lines
      for (const line of allTextLines) {
        ctx.fillText(line, textX, currentY);
        currentY += lineHeight;
      }
    }
  }

  static async renderToBlob(options: RenderOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const { canvas, settings } = options;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        settings.format === 'png' ? 'image/png' : 'image/jpeg',
        settings.quality
      );
    });
  }

  static calculateOptimalSize(
    imageWidth: number,
    imageHeight: number
  ): { width: number; height: number } {
    const maxSize = 4096; // 4K max
    const aspectRatio = imageWidth / imageHeight;

    if (imageWidth <= maxSize && imageHeight <= maxSize) {
      return { width: imageWidth, height: imageHeight };
    }

    if (aspectRatio > 1) {
      // Landscape - use exact aspect ratio to calculate height
      const width = maxSize;
      const height = Math.round(maxSize / aspectRatio);
      return {
        width,
        height,
      };
    } else {
      // Portrait or square - use exact aspect ratio to calculate width
      const height = maxSize;
      const width = Math.round(maxSize * aspectRatio);
      return {
        width,
        height,
      };
    }
  }
}
