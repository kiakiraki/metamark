import type { ImageFile } from '@/types/image';
import { generateId } from '@/utils/id';

const MAX_IMAGE_PIXELS = 64_000_000;
const MAX_IMAGE_DIMENSION = 16_384;

export const MAX_IMAGE_FILE_SIZE_MB = 50;
export const MAX_IMAGE_FILE_SIZE_BYTES = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;

// Header region scanned for dimension metadata, instead of reading the whole
// (up to 50MB) file. PNG/JPEG/HEIF all place their dimension boxes/segments
// well within the first couple of megabytes for any realistic photo.
const DIMENSION_SCAN_BYTES = 2 * 1024 * 1024;

interface ImageDimensions {
  width: number;
  height: number;
}

function isHeicType(type: string): boolean {
  return type === 'image/heic' || type === 'image/heif';
}

// A real, minimal (1x1px) HEIC file used purely as a decode capability probe.
// Sourced from immich's browser HEIC-support detection
// (https://github.com/immich-app/immich/pull/26122), which itself generated
// it as the smallest valid HEIC fixture. It is never displayed.
const HEIC_PROBE_BASE64 =
  'AAAAGGZ0eXBoZWljAAAAAG1pZjFoZWljAAABrW1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAADnBpdG0AAAAAAAIAAAAQaWRhdAAAAAAAAQABAAAAOGlsb2MBAAAAREAAAgABAAAAAAAAAc0AAQAAAAAAAAAsAAIAAQAAAAAAAAABAAAAAAAAAAgAAAA4aWluZgAAAAAAAgAAABVpbmZlAgAAAQABAABodmMxAAAAABVpbmZlAgAAAAACAABncmlkAAAAANhpcHJwAAAAtmlwY28AAAB2aHZjQwEDcAAAAAAAAAAAAB7wAPz9+PgAAA8DIAABABhAAQwB//8DcAAAAwCQAAADAAADAB66AkAhAAEAKkIBAQNwAAADAJAAAAMAAAMAHqAggQWW6q6a5uBAQMCAAAADAIAAAAMAhCIAAQAGRAHBc8GJAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAUaXNwZQAAAAAAAABAAAAAQAAAABBwaXhpAAAAAAMICAgAAAAaaXBtYQAAAAAAAAACAAECgQMAAgIChAAAABppcmVmAAAAAAAAAA5kaW1nAAIAAQABAAAANG1kYXQAAAAoKAGvCchMZYA50NoPIfzz81Qfsm577GJt3lf8kLAr+NbNIoeRR7JeYA==';

function decodeBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function probeHeicDecodeSupport(): Promise<boolean> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(
        new Blob([decodeBase64(HEIC_PROBE_BASE64)], { type: 'image/heic' })
      );
      bitmap.close?.();
      return true;
    } catch {
      return false;
    }
  }

  // Fallback for environments without createImageBitmap: probe via a
  // throwaway <img> decode instead.
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = `data:image/heic;base64,${HEIC_PROBE_BASE64}`;
  });
}

let heicDecodeSupportPromise: Promise<boolean> | null = null;

/**
 * Detects whether the current browser can decode HEIC/HEIF images at all, by
 * attempting to decode a minimal real HEIC fixture. The result is cached at
 * module scope so the (cheap, but non-zero) probe only ever runs once.
 */
export function canDecodeHeic(): Promise<boolean> {
  if (!heicDecodeSupportPromise) {
    heicDecodeSupportPromise = probeHeicDecodeSupport();
  }
  return heicDecodeSupportPromise;
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

interface IsoBmffBox {
  type: string;
  start: number;
  size: number;
  headerSize: number;
}

// Reads one ISOBMFF box header at `offset`, bounded by `end`. Supports the
// 64-bit "largesize" extension and the "extends to end of file" size of 0,
// both of which are legal per the ISO/IEC 14496-12 box layout HEIF reuses.
function readBoxHeader(
  view: DataView,
  offset: number,
  end: number
): IsoBmffBox | null {
  if (offset + 8 > end) return null;
  let size = view.getUint32(offset);
  const type = String.fromCharCode(
    view.getUint8(offset + 4),
    view.getUint8(offset + 5),
    view.getUint8(offset + 6),
    view.getUint8(offset + 7)
  );
  let headerSize = 8;
  if (size === 1) {
    if (offset + 16 > end) return null;
    const sizeHigh = view.getUint32(offset + 8);
    const sizeLow = view.getUint32(offset + 12);
    if (sizeHigh !== 0) return null; // beyond our scan window, unreachable
    size = sizeLow;
    headerSize = 16;
  } else if (size === 0) {
    size = end - offset;
  }
  if (size < headerSize || offset + size > end) return null;
  return { type, start: offset, size, headerSize };
}

// Scans siblings in [start, end) for the first box of `type`, following box
// sizes to jump between siblings rather than scanning byte-by-byte.
function findBox(
  view: DataView,
  start: number,
  end: number,
  type: string
): IsoBmffBox | null {
  let offset = start;
  while (offset + 8 <= end) {
    const box = readBoxHeader(view, offset, end);
    if (!box) return null;
    if (box.type === type) return box;
    offset += box.size;
  }
  return null;
}

function readHeifDimensions(view: DataView): ImageDimensions | null {
  // HEIF stores image dimensions in Image Spatial Extents (`ispe`) full
  // boxes nested at ftyp -> meta -> iprp -> ipco -> ispe. Follow that
  // structure explicitly (instead of scanning every byte for the `ispe`
  // signature) so a large file's irrelevant bytes are never touched.
  const end = view.byteLength;
  const ftyp = findBox(view, 0, end, 'ftyp');
  if (!ftyp) return null;

  const meta = findBox(view, ftyp.start + ftyp.size, end, 'meta');
  if (!meta) return null;
  // `meta` is a FullBox: 4 bytes of version/flags precede its children.
  const metaContentStart = meta.start + meta.headerSize + 4;
  const metaEnd = meta.start + meta.size;
  if (metaContentStart > metaEnd) return null;

  const iprp = findBox(view, metaContentStart, metaEnd, 'iprp');
  if (!iprp) return null;
  const ipco = findBox(
    view,
    iprp.start + iprp.headerSize,
    iprp.start + iprp.size,
    'ipco'
  );
  if (!ipco) return null;

  // Multiple ispe boxes can coexist (thumbnails, grid tiles, the primary
  // image, ...). Keep width/height as a pair per box and pick the pair with
  // the largest area, rather than maxing width and height independently
  // (which can Frankenstein a portrait width with a landscape height).
  let best: ImageDimensions | null = null;
  let bestArea = 0;
  let offset = ipco.start + ipco.headerSize;
  const ipcoEnd = ipco.start + ipco.size;
  while (offset + 8 <= ipcoEnd) {
    const box = readBoxHeader(view, offset, ipcoEnd);
    if (!box) break;
    if (box.type === 'ispe') {
      // ispe is a FullBox: header(8) + version/flags(4) + width(4) + height(4).
      const contentStart = box.start + box.headerSize + 4;
      if (contentStart + 8 <= box.start + box.size) {
        const width = view.getUint32(contentStart);
        const height = view.getUint32(contentStart + 4);
        const area = width * height;
        if (area > bestArea) {
          bestArea = area;
          best = { width, height };
        }
      }
    }
    offset += box.size;
  }
  return best;
}

export class ImageProcessor {
  static async loadImageFile(file: File): Promise<ImageFile> {
    // Detect HEIC decode support up front. On browsers that can't decode
    // HEIC at all (most non-Safari browsers today), this fails fast instead
    // of first reading the whole (up to 50MB) file for dimension validation
    // only to hit the same wall in the Image onerror handler below.
    if (isHeicType(file.type) && !(await canDecodeHeic())) {
      throw new Error(
        'HEIC decoding is not supported by this browser. Convert the image to JPEG or PNG and try again.'
      );
    }

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
          id: generateId(),
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
        reject(
          new Error(
            isHeicType(file.type)
              ? 'Failed to decode HEIC image. The file may be corrupted, or this variant may not be supported by the browser.'
              : 'Failed to load image.'
          )
        );
      };

      img.src = url;
    });
  }

  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = MAX_IMAGE_FILE_SIZE_BYTES;
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
        error: `File too large. Maximum size is ${MAX_IMAGE_FILE_SIZE_MB}MB.`,
      };
    }

    return { valid: true };
  }

  static async validateImageDimensions(
    file: File
  ): Promise<{ valid: boolean; error?: string }> {
    // Dimension metadata always lives near the start of the file, so read
    // only a bounded header slice rather than the whole (up to 50MB) file.
    const headerSlice = file.slice(
      0,
      Math.min(file.size, DIMENSION_SCAN_BYTES)
    );
    const view = new DataView(await headerSlice.arrayBuffer());
    let dimensions: ImageDimensions | null;
    if (file.type === 'image/png') {
      dimensions = readPngDimensions(view);
    } else if (file.type === 'image/jpeg') {
      dimensions = readJpegDimensions(view);
    } else if (isHeicType(file.type)) {
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
