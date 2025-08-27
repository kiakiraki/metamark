import type { ImageFile } from '@/types/image';

export class ImageProcessor {
  static async loadImageFile(file: File): Promise<ImageFile> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const imageFile: ImageFile = {
          id: crypto.randomUUID(),
          file,
          url,
          name: file.name,
          size: file.size,
          type: file.type,
          width: img.width,
          height: img.height,
        };

        resolve(imageFile);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/heic',
      'image/heif',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Unsupported file type. Please use JPEG, PNG, or HEIC files.',
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File too large. Maximum size is 20MB.',
      };
    }

    return { valid: true };
  }

  static async createImageElement(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));

      img.src = src;
    });
  }

  static cleanupImageUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
