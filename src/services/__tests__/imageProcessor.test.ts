import { describe, it, expect, vi } from 'vitest';
import { ImageProcessor } from '../imageProcessor';

describe('ImageProcessor.validateImageFile', () => {
  function createMockFile(type: string, size: number): File {
    const blob = new Blob(['x'.repeat(Math.min(size, 100))], { type });
    return new File([blob], 'test.jpg', { type });
  }

  it('accepts a valid JPEG file', () => {
    const file = createMockFile('image/jpeg', 1024);
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts a valid PNG file', () => {
    const file = createMockFile('image/png', 1024);
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it('accepts HEIC files', () => {
    const file = createMockFile('image/heic', 1024);
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it('accepts HEIF files', () => {
    const file = createMockFile('image/heif', 1024);
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it('explains the native browser requirement when HEIC decoding fails', async () => {
    const file = createMockFile('image/heic', 1024);
    const revokeObjectURL = vi.fn();

    class FailingImage {
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        this.onerror?.();
      }
    }

    vi.stubGlobal('Image', FailingImage);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:heic'),
      revokeObjectURL,
    });

    try {
      await expect(ImageProcessor.loadImageFile(file)).rejects.toThrow(
        'HEIC decoding is not supported by this browser'
      );
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:heic');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects unsupported file types', () => {
    const file = createMockFile('image/gif', 1024);
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported file type');
  });

  it('rejects files exceeding 20MB', () => {
    const file = createMockFile('image/jpeg', 21 * 1024 * 1024);
    // Override the size property since Blob creation won't actually allocate that much
    Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 });
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File too large');
  });

  it('accepts files at exactly 20MB', () => {
    const file = createMockFile('image/jpeg', 20 * 1024 * 1024);
    Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 });
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(true);
  });
});

describe('ImageProcessor.validateImageDimensions', () => {
  function fileFromBytes(bytes: Uint8Array<ArrayBuffer>, type: string): File {
    return new File([bytes], 'image', { type });
  }

  function pngFile(width: number, height: number): File {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, width);
    view.setUint32(20, height);
    return fileFromBytes(bytes, 'image/png');
  }

  function jpegFile(width: number, height: number): File {
    const bytes = new Uint8Array(21);
    const view = new DataView(bytes.buffer);
    bytes.set([0xff, 0xd8, 0xff, 0xc0]);
    view.setUint16(4, 17);
    view.setUint8(6, 8);
    view.setUint16(7, height);
    view.setUint16(9, width);
    bytes.set([0xff, 0xd9], 19);
    return fileFromBytes(bytes, 'image/jpeg');
  }

  function heicFile(width: number, height: number): File {
    const bytes = new Uint8Array(24);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 24);
    bytes.set([0x69, 0x73, 0x70, 0x65], 4);
    view.setUint32(12, width);
    view.setUint32(16, height);
    return fileFromBytes(bytes, 'image/heic');
  }

  it.each([
    ['PNG', pngFile(8000, 8000)],
    ['JPEG', jpegFile(8000, 8000)],
    ['HEIC', heicFile(8000, 8000)],
  ])('accepts a %s at the 64 megapixel boundary', async (_name, file) => {
    await expect(ImageProcessor.validateImageDimensions(file)).resolves.toEqual(
      { valid: true }
    );
  });

  it('rejects an image above the total pixel limit', async () => {
    const result = await ImageProcessor.validateImageDimensions(
      pngFile(8001, 8000)
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('64 megapixels');
  });

  it('rejects an image above the per-side dimension limit', async () => {
    const result = await ImageProcessor.validateImageDimensions(
      jpegFile(16_385, 1)
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('16384px per side');
  });

  it('rejects malformed image headers before decoding', async () => {
    const result = await ImageProcessor.validateImageDimensions(
      fileFromBytes(new Uint8Array([1, 2, 3]), 'image/png')
    );
    expect(result).toEqual({
      valid: false,
      error: 'Unable to read image dimensions.',
    });
  });
});
