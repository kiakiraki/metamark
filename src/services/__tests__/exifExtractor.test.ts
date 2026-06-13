import { describe, it, expect } from 'vitest';
import {
  normalizeExifData,
  calculateShutterSpeed,
  formatDateTime,
} from '../exifExtractor';
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

    expect(result.camera).toBe('Sony α7 IV');
    expect(result.cameraMake).toBe('Sony');
    expect(result.cameraModel).toBe('α7 IV');
    expect(result.lens).toBe('Sony FE 24-70mm F2.8 GM');
    expect(result.focalLength).toBe('50mm');
    expect(result.iso).toBe('ISO 100');
    expect(result.aperture).toBe('f/2.8');
    expect(result.shutterSpeed).toBe('1/250s');
  });

  it('passes through non-Sony model names', () => {
    const exifData: ExifData = {
      camera: { make: 'Canon', model: 'EOS R5' },
    };

    const result = normalizeExifData(exifData);
    expect(result.camera).toBe('Canon EOS R5');
    expect(result.cameraModel).toBe('EOS R5');
  });

  it('leaves unsupported Sony families untouched', () => {
    const exifData: ExifData = {
      camera: { make: 'SONY', model: 'NEX-7' },
    };

    const result = normalizeExifData(exifData);
    expect(result.cameraModel).toBe('NEX-7');
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
    expect(result.location).toBeNull();
  });

  it('joins all IPTC location parts with commas', () => {
    const result = normalizeExifData({
      iptc: {
        sublocation: 'Asakusa',
        city: 'Taito',
        provinceState: 'Tokyo',
        country: 'Japan',
      },
    });

    expect(result.location).toBe('Asakusa, Taito, Tokyo, Japan');
  });

  it('omits missing IPTC parts and trims whitespace', () => {
    const result = normalizeExifData({
      iptc: {
        sublocation: '  ',
        city: ' Kyoto ',
        country: 'Japan',
      },
    });

    expect(result.location).toBe('Kyoto, Japan');
  });

  it('returns null location when IPTC is empty', () => {
    expect(normalizeExifData({ iptc: {} }).location).toBeNull();
    expect(
      normalizeExifData({
        iptc: { city: '', country: '   ' },
      }).location
    ).toBeNull();
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

describe('calculateShutterSpeed', () => {
  it('returns undefined for undefined input', () => {
    expect(calculateShutterSpeed(undefined)).toBeUndefined();
  });

  it('formats long exposures as plain seconds (>= 1s)', () => {
    expect(calculateShutterSpeed(2)).toBe('2s');
  });

  it('returns 1/2s for exactly 0.5s', () => {
    expect(calculateShutterSpeed(0.5)).toBe('1/2s');
  });

  it('returns 1/3s for 1/3 (≈0.3333)', () => {
    expect(calculateShutterSpeed(1 / 3)).toBe('1/3s');
  });

  it('returns 1/250s for 0.004', () => {
    expect(calculateShutterSpeed(0.004)).toBe('1/250s');
  });

  it('returns decimal 0.6s for 0.6 (not 1/2s)', () => {
    expect(calculateShutterSpeed(0.6)).toBe('0.6s');
  });

  it('returns decimal 0.8s for 0.8 (not 1/1s)', () => {
    expect(calculateShutterSpeed(0.8)).toBe('0.8s');
  });
});

describe('formatDateTime', () => {
  it('parses EXIF-format string "2024:06:15 14:30:00"', () => {
    const result = formatDateTime('2024:06:15 14:30:00');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
    // Should contain the year and not be a raw Date object
    expect(result).toContain('2024');
  });

  it('formats a Date instance to a locale string', () => {
    const d = new Date(2024, 5, 15, 14, 30, 0); // June 15, 2024
    const result = formatDateTime(d);
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
    expect(result).toContain('2024');
  });

  it('returns null for an invalid Date instance', () => {
    expect(formatDateTime(new Date('not-a-date'))).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatDateTime(undefined)).toBeNull();
  });

  it('does not throw for an invalid string value', () => {
    expect(() => formatDateTime('garbage')).not.toThrow();
    const result = formatDateTime('garbage');
    expect(typeof result === 'string' || result === null).toBe(true);
  });
});
