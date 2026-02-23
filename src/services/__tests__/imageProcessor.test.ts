import { describe, it, expect } from 'vitest';
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
