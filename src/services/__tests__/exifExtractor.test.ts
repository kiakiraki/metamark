import { describe, it, expect } from 'vitest';
import { normalizeExifData } from '../exifExtractor';
import type { ExifData } from '@/types/exif';

describe('normalizeExifData', () => {
  it('formats a complete ExifData object', () => {
    const exifData: ExifData = {
      camera: { make: 'Sony', model: 'ILCE-7M4' },
      lens: { make: 'Sony', model: 'FE 24-70mm F2.8 GM', focalLength: 50 },
      settings: { iso: 100, fNumber: 2.8, exposureTime: 0.004 },
      metadata: { dateTime: '2024:06:15 14:30:00' },
    };

    const result = normalizeExifData(exifData);

    expect(result.camera).toBe('Sony ILCE-7M4');
    expect(result.cameraMake).toBe('Sony');
    expect(result.cameraModel).toBe('ILCE-7M4');
    expect(result.lens).toBe('Sony FE 24-70mm F2.8 GM');
    expect(result.focalLength).toBe('50mm');
    expect(result.iso).toBe('ISO 100');
    expect(result.aperture).toBe('f/2.8');
    expect(result.shutterSpeed).toBe('1/250s');
  });

  it('returns null for missing fields', () => {
    const result = normalizeExifData({});

    expect(result.camera).toBeNull();
    expect(result.cameraMake).toBeNull();
    expect(result.cameraModel).toBeNull();
    expect(result.lens).toBeNull();
    expect(result.focalLength).toBeNull();
    expect(result.iso).toBeNull();
    expect(result.aperture).toBeNull();
    expect(result.shutterSpeed).toBeNull();
    expect(result.dateTime).toBeNull();
  });

  it('formats long exposure shutter speed', () => {
    const exifData: ExifData = {
      settings: { exposureTime: 2 },
    };

    const result = normalizeExifData(exifData);
    expect(result.shutterSpeed).toBe('2s');
  });

  it('uses pre-calculated shutter speed string when available', () => {
    const exifData: ExifData = {
      settings: { shutterSpeed: '1/8000s', exposureTime: 0.000125 },
    };

    const result = normalizeExifData(exifData);
    expect(result.shutterSpeed).toBe('1/8000s');
  });

  it('formats camera make only', () => {
    const exifData: ExifData = {
      camera: { make: 'Canon' },
    };

    const result = normalizeExifData(exifData);
    expect(result.camera).toBe('Canon');
    expect(result.cameraMake).toBe('Canon');
    expect(result.cameraModel).toBeNull();
  });

  it('trims whitespace from camera fields', () => {
    const exifData: ExifData = {
      camera: { make: '  Sony  ', model: '  A7IV  ' },
    };

    const result = normalizeExifData(exifData);
    expect(result.cameraMake).toBe('Sony');
    expect(result.cameraModel).toBe('A7IV');
  });
});
