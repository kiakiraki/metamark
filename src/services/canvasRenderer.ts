import type { RenderOptions } from '@/types/canvas';
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

    // Draw template overlay with scaling
    this.drawTemplate(ctx, template, exifData, scaleFactor);

    // Return as data URL
    return canvas.toDataURL(
      settings.format === 'png' ? 'image/png' : 'image/jpeg',
      settings.quality
    );
  }

  private static drawTemplate(
    ctx: CanvasRenderingContext2D,
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number = 1
  ): void {
    const { style, position, fields } = template;

    // Scale all dimensions based on canvas size
    const scaledFontSize = Math.max(12, style.fontSize * scaleFactor);
    const scaledPadding = style.padding * scaleFactor;
    const scaledBorderRadius = style.borderRadius * scaleFactor;
    const scaledX = position.x * scaleFactor;
    const scaledY = position.y * scaleFactor;
    const scaledWidth = position.width * scaleFactor;
    const scaledHeight = position.height * scaleFactor;

    // Set up text rendering
    ctx.font = `${scaledFontSize}px ${style.fontFamily}`;
    ctx.textAlign = position.alignment as CanvasTextAlign;

    // Draw background
    ctx.globalAlpha = style.opacity;
    ctx.fillStyle = style.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(scaledX, scaledY, scaledWidth, scaledHeight, scaledBorderRadius);
    ctx.fill();

    // Draw text
    ctx.globalAlpha = 1;
    ctx.fillStyle = style.textColor;

    let currentY = scaledY + scaledPadding + scaledFontSize;
    const lineHeight = scaledFontSize * 1.4;
    const textX = position.alignment === 'center' 
      ? scaledX + scaledWidth / 2
      : scaledX + scaledPadding;

    // Render visible fields
    const visibleFields = fields.filter(field => field.visible);
    
    for (const field of visibleFields) {
      const value = exifData[field.key];
      if (value) {
        const text = field.format ? field.format(value) : `${field.label}: ${value}`;
        ctx.fillText(text, textX, currentY);
        currentY += lineHeight;
        
        // Stop if we exceed the container height
        if (currentY > scaledY + scaledHeight - scaledPadding) {
          break;
        }
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

  static calculateOptimalSize(imageWidth: number, imageHeight: number): { width: number; height: number } {
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