import type { ImageFile } from '@/types/image';

const MAX_IMAGE_PIXELS = 64_000_000;
const MAX_IMAGE_DIMENSION = 16_384;

interface ImageDimensions {
  width: number;
  height: number;
}

function readPngDimensions(view: DataView): ImageDimensions | null {
  if (view.byteLength < 24) return null;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (signature.some((byte, index) => view.getUint8(index) !== byte)) {
    return null;
  }
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function isJpegStartOfFrame(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function readJpegDimensions(view: DataView): ImageDimensions | null {
  if (
    view.byteLength < 4 ||
    view.getUint8(0) !== 0xff ||
    view.getUint8(1) !== 0xd8
  ) {
    return null;
  }

  let offset = 2;
  while (offset + 3 < view.byteLength) {
    while (offset < view.byteLength && view.getUint8(offset) !== 0xff) {
      offset += 1;
    }
    while (offset < view.byteLength && view.getUint8(offset) === 0xff) {
      offset += 1;
    }
    if (offset >= view.byteLength) return null;

    const marker = view.getUint8(offset);
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) continue;
    if (offset + 1 >= view.byteLength) return null;

    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2 || offset + segmentLength > view.byteLength) {
      return null;
    }
    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 7) return null;
      return {
        height: view.getUint16(offset + 3),
        width: view.getUint16(offset + 5),
      };
    }
    if (marker === 0xda) return null;
    offset += segmentLength;
  }
  return null;
}

function readHeifDimensions(view: DataView): ImageDimensions | null {
  // HEIF stores the primary image dimensions in an Image Spatial Extents
  // (`ispe`) full box: type, version/flags, width, height. It may be nested
  // several boxes deep, so scan the validated box signature rather than
  // assuming a fixed container path.
  let maxWidth = 0;
  let maxHeight = 0;
  for (
    let typeOffset = 4;
    typeOffset + 16 <= view.byteLength;
    typeOffset += 1
  ) {
    if (
      view.getUint8(typeOffset) !== 0x69 ||
      view.getUint8(typeOffset + 1) !== 0x73 ||
      view.getUint8(typeOffset + 2) !== 0x70 ||
      view.getUint8(typeOffset + 3) !== 0x65
    ) {
      continue;
    }
    const boxStart = typeOffset - 4;
    const boxSize = view.getUint32(boxStart);
    if (boxSize < 20 || boxStart + boxSize > view.byteLength) continue;
    maxWidth = Math.max(maxWidth, view.getUint32(typeOffset + 8));
    maxHeight = Math.max(maxHeight, view.getUint32(typeOffset + 12));
  }
  return maxWidth && maxHeight ? { width: maxWidth, height: maxHeight } : null;
}

export class ImageProcessor {
  static async loadImageFile(file: File): Promise<ImageFile> {
    const dimensionValidation = await this.validateImageDimensions(file);
    if (!dimensionValidation.valid) {
      throw new Error(
        dimensionValidation.error ?? 'Unable to read image dimensions.'
      );
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const imageFile: ImageFile = {
          id: crypto.randomUUID(),
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

  static async validateImageDimensions(
    file: File
  ): Promise<{ valid: boolean; error?: string }> {
    const view = new DataView(await file.arrayBuffer());
    let dimensions: ImageDimensions | null;
    if (file.type === 'image/png') {
      dimensions = readPngDimensions(view);
    } else if (file.type === 'image/jpeg') {
      dimensions = readJpegDimensions(view);
    } else if (file.type === 'image/heic' || file.type === 'image/heif') {
      dimensions = readHeifDimensions(view);
    } else {
      return { valid: false, error: 'Unsupported file type.' };
    }

    if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
      return { valid: false, error: 'Unable to read image dimensions.' };
    }
    if (
      dimensions.width > MAX_IMAGE_DIMENSION ||
      dimensions.height > MAX_IMAGE_DIMENSION ||
      dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
    ) {
      return {
        valid: false,
        error:
          'Image dimensions are too large. Maximum is 64 megapixels and 16384px per side.',
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
