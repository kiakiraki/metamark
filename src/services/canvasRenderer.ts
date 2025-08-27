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

    // Set canvas dimensions
    canvas.width = settings.width;
    canvas.height = settings.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Calculate scale factor based on canvas size
    const scaleFactor = Math.min(canvas.width, canvas.height) / 1000; // Base scale for 1000px

    // Calculate dynamic position based on overlay position setting and exif data
    const dynamicTemplate = this.calculateDynamicPosition(
      template,
      settings,
      canvas.width,
      canvas.height,
      exifData
    );

    // Draw template overlay with scaling
    this.drawTemplate(ctx, dynamicTemplate, exifData, scaleFactor);

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
    exifData: NormalizedExifData
  ): Template {
    const { overlayPosition } = settings;
    const margin = 20; // Margin from edges
    
    // Calculate scaled template dimensions
    const scaleFactor = Math.min(canvasWidth, canvasHeight) / 1000;
    const scaledWidth = template.position.width * scaleFactor;
    const scaledHeight = this.calculateDynamicTemplateHeight(template, exifData, scaleFactor);

    let x: number, y: number;

    switch (overlayPosition) {
      case 'top-left':
        x = margin;
        y = margin;
        break;
      case 'top-right':
        x = canvasWidth - scaledWidth - margin;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = canvasHeight - scaledHeight - margin;
        break;
      case 'bottom-right':
        x = canvasWidth - scaledWidth - margin;
        y = canvasHeight - scaledHeight - margin;
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

    // Count visible fields that will be displayed
    const visibleFields = template.fields.filter((field) => field.visible);
    const linesToDisplay = visibleFields.length; // Show all visible fields regardless of data

    // Calculate dynamic height
    return (
      scaledPadding + // top padding
      scaledFontSize + // first line baseline
      (linesToDisplay - 1) * lineHeight + // additional lines
      scaledPadding // bottom padding
    );
  }

  private static drawTemplate(
    ctx: CanvasRenderingContext2D,
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number = 1
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

    // Filter visible fields and count actual lines to be displayed
    const visibleFields = fields.filter((field) => field.visible);
    const linesToDisplay = visibleFields.filter((field) => {
      const value = exifData[field.key];
      return value || field.key; // Include all visible fields, even if value is null
    });

    // Calculate dynamic height based on actual content
    const dynamicHeight = 
      scaledPadding + // top padding
      scaledFontSize + // first line baseline
      (linesToDisplay.length - 1) * lineHeight + // additional lines
      scaledPadding; // bottom padding

    // Use dynamic height instead of template's fixed height
    const scaledHeight = dynamicHeight;

    // Set up text rendering
    ctx.font = `${scaledFontSize}px ${style.fontFamily}`;
    ctx.textAlign = position.alignment as CanvasTextAlign;

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

    let currentY = scaledY + scaledPadding + scaledFontSize;
    const textX =
      position.alignment === 'center'
        ? scaledX + scaledWidth / 2
        : scaledX + scaledPadding;

    // Render visible fields
    for (const field of visibleFields) {
      const value = exifData[field.key];
      
      // Always render visible fields, even if value is null/undefined
      if (value) {
        const text = field.format
          ? field.format(value)
          : `${field.label}: ${value}`;
        ctx.fillText(text, textX, currentY);
      } else {
        // Show "N/A" for missing data
        const text = `${field.label}: N/A`;
        ctx.fillText(text, textX, currentY);
      }
      
      currentY += lineHeight;
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
      // Landscape
      return {
        width: maxSize,
        height: Math.round(maxSize / aspectRatio),
      };
    } else {
      // Portrait or square
      return {
        width: Math.round(maxSize * aspectRatio),
        height: maxSize,
      };
    }
  }
}
