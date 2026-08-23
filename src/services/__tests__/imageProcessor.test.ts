import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageProcessor } from '../imageProcessor';

function fileFromBytes(bytes: Uint8Array<ArrayBuffer>, type: string): File {
  return new File([bytes], 'image', { type });
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

function isoBox(type: string, content: Uint8Array): Uint8Array {
  const size = 8 + content.length;
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, size);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(content, 8);
  return bytes;
}

function fullBoxHeader(): Uint8Array {
  return new Uint8Array([0, 0, 0, 0]);
}

function ispeContent(width: number, height: number): Uint8Array {
  const content = new Uint8Array(12);
  const view = new DataView(content.buffer);
  content.set(fullBoxHeader(), 0);
  view.setUint32(4, width);
  view.setUint32(8, height);
  return content;
}

// Builds a minimal, but structurally real, HEIC file: ftyp -> meta ->
// iprp -> ipco -> ispe(...), with one ispe box per [width, height] pair.
function heicFileWithIspes(...pairs: [number, number][]): File {
  const ispeBoxes = pairs.map(([w, h]) => isoBox('ispe', ispeContent(w, h)));
  const ipco = isoBox('ipco', concatBytes(...ispeBoxes));
  const iprp = isoBox('iprp', ipco);
  const meta = isoBox('meta', concatBytes(fullBoxHeader(), iprp));
  const ftyp = isoBox('ftyp', new TextEncoder().encode('heic\0\0\0\0heic'));
  return fileFromBytes(
    concatBytes(ftyp, meta) as Uint8Array<ArrayBuffer>,
    'image/heic'
  );
}

function heicFile(width: number, height: number): File {
  return heicFileWithIspes([width, height]);
}

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

  it('rejects unsupported file types', () => {
    const file = createMockFile('image/gif', 1024);
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported file type');
  });

  it('rejects files exceeding 50MB', () => {
    const file = createMockFile('image/jpeg', 51 * 1024 * 1024);
    // Override the size property since Blob creation won't actually allocate that much
    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 });
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File too large');
  });

  it('accepts files at exactly 50MB', () => {
    const file = createMockFile('image/jpeg', 50 * 1024 * 1024);
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 });
    const result = ImageProcessor.validateImageFile(file);
    expect(result.valid).toBe(true);
  });
});

describe('ImageProcessor.validateImageDimensions', () => {
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

  it('rejects a HEIC file with no ispe box at all', async () => {
    const ftyp = isoBox('ftyp', new TextEncoder().encode('heic\0\0\0\0heic'));
    const ipco = isoBox('ipco', new Uint8Array(0));
    const iprp = isoBox('iprp', ipco);
    const meta = isoBox('meta', concatBytes(fullBoxHeader(), iprp));
    const file = fileFromBytes(
      concatBytes(ftyp, meta) as Uint8Array<ArrayBuffer>,
      'image/heic'
    );
    const result = await ImageProcessor.validateImageDimensions(file);
    expect(result).toEqual({
      valid: false,
      error: 'Unable to read image dimensions.',
    });
  });

  it('rejects a HEIC-typed file with no valid box structure', async () => {
    const result = await ImageProcessor.validateImageDimensions(
      fileFromBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), 'image/heic')
    );
    expect(result).toEqual({
      valid: false,
      error: 'Unable to read image dimensions.',
    });
  });

  it('picks the ispe pair with the largest area, not independent width/height maxima', async () => {
    // A portrait 3024x4032 primary image alongside a 4032x3024 thumbnail
    // ispe must resolve to one of those pairs (area 12,192,768), never the
    // Frankenstein 4032x4032 (area 16,257,024) that independent per-axis
    // maxima would produce.
    const file = heicFileWithIspes([3024, 4032], [4032, 3024]);
    const result = await ImageProcessor.validateImageDimensions(file);
    expect(result.valid).toBe(true);
  });

  it('selects the max-area pair among multiple ispe boxes', async () => {
    const file = heicFileWithIspes([100, 100], [8000, 8000], [50, 9000]);
    // The 8000x8000 pair (64,000,000px) is exactly at the boundary and
    // should be accepted; a naive per-axis max would produce 8000x9000
    // (72,000,000px), which exceeds the limit and would be rejected.
    const result = await ImageProcessor.validateImageDimensions(file);
    expect(result.valid).toBe(true);
  });

  it('rejects when the max-area ispe pair exceeds the pixel limit', async () => {
    const file = heicFileWithIspes([100, 100], [8001, 8000]);
    const result = await ImageProcessor.validateImageDimensions(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('64 megapixels');
  });
});

describe('HEIC decode support detection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reports supported when createImageBitmap can decode the probe, and caches the result', async () => {
    const createImageBitmapMock = vi.fn(() => ({ close: vi.fn() }));
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('atob', (b64: string) =>
      Buffer.from(b64, 'base64').toString('binary')
    );

    const mod = await import('../imageProcessor');

    const first = await mod.canDecodeHeic();
    const second = await mod.canDecodeHeic();

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(createImageBitmapMock).toHaveBeenCalledTimes(1);
  });

  it('reports unsupported when createImageBitmap rejects, without re-probing on a second call', async () => {
    const createImageBitmapMock = vi.fn(() => {
      throw new Error('unsupported image type');
    });
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.stubGlobal('atob', (b64: string) =>
      Buffer.from(b64, 'base64').toString('binary')
    );

    const mod = await import('../imageProcessor');

    expect(await mod.canDecodeHeic()).toBe(false);
    expect(await mod.canDecodeHeic()).toBe(false);
    expect(createImageBitmapMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to an Image probe when createImageBitmap is unavailable', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    vi.stubGlobal('atob', (b64: string) =>
      Buffer.from(b64, 'base64').toString('binary')
    );

    class SucceedingImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal('Image', SucceedingImage);

    const mod = await import('../imageProcessor');
    expect(await mod.canDecodeHeic()).toBe(true);
  });
});

describe('ImageProcessor.loadImageFile HEIC handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('rejects immediately when the browser cannot decode HEIC, without reading the file for dimensions', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    vi.stubGlobal('atob', (b64: string) =>
      Buffer.from(b64, 'base64').toString('binary')
    );

    class FailingImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onerror?.();
      }
    }
    vi.stubGlobal('Image', FailingImage);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:heic');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const mod = await import('../imageProcessor');
    const file = heicFile(100, 100);
    const sliceSpy = vi.spyOn(file, 'slice');

    await expect(mod.ImageProcessor.loadImageFile(file)).rejects.toThrow(
      'HEIC decoding is not supported by this browser'
    );
    expect(sliceSpy).not.toHaveBeenCalled();
  });

  it('explains a possibly-corrupted file when decode support exists but this specific file fails', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => ({ close: vi.fn() }))
    );
    vi.stubGlobal('atob', (b64: string) =>
      Buffer.from(b64, 'base64').toString('binary')
    );

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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:heic');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURL);

    const mod = await import('../imageProcessor');
    // Needs a valid ispe box so validateImageDimensions passes and the
    // failure happens at the Image decoding stage.
    const file = heicFile(100, 100);

    await expect(mod.ImageProcessor.loadImageFile(file)).rejects.toThrow(
      /corrupted|not be supported/
    );
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:heic');
  });
});
