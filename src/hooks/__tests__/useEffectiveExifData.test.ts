import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useEffectiveExifData } from '../useEffectiveExifData';
import { useExifStore } from '@/stores/exifStore';
import type { NormalizedExifData } from '@/types/exif';

const baseNormalized: NormalizedExifData = {
  camera: 'Sony α7 IV',
  cameraMake: 'Sony',
  cameraModel: 'α7 IV',
  lens: 'Sony FE 24-70mm F2.8 GM',
  focalLength: '50mm',
  iso: 'ISO 100',
  aperture: 'f/2.8',
  shutterSpeed: '1/250s',
  dateTime: '2024/06/15 14:30',
  location: 'Kyoto, Japan',
};

function reset() {
  useExifStore.setState({
    exifData: {},
    normalizedData: {},
    lensOverrides: {},
    locationOverrides: {},
  });
}

describe('useEffectiveExifData', () => {
  beforeEach(reset);

  it('returns undefined when there is no imageId', () => {
    const { result } = renderHook(() => useEffectiveExifData(undefined));
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the image has no normalized data yet', () => {
    const { result } = renderHook(() => useEffectiveExifData('missing'));
    expect(result.current).toBeUndefined();
  });

  it('returns base data when no override is set', () => {
    useExifStore.getState().setNormalizedData('img-1', baseNormalized);

    const { result } = renderHook(() => useEffectiveExifData('img-1'));
    expect(result.current).toEqual(baseNormalized);
  });

  it('replaces lens with a non-empty override string', () => {
    useExifStore.getState().setNormalizedData('img-1', baseNormalized);
    useExifStore.getState().setLensOverride('img-1', 'Helios 44-2 58mm f/2');

    const { result } = renderHook(() => useEffectiveExifData('img-1'));
    expect(result.current?.lens).toBe('Helios 44-2 58mm f/2');
    expect(result.current?.camera).toBe(baseNormalized.camera);
    expect(result.current?.focalLength).toBe(baseNormalized.focalLength);
  });

  it('replaces location with a non-empty override string', () => {
    useExifStore.getState().setNormalizedData('img-1', baseNormalized);
    useExifStore.getState().setLocationOverride('img-1', 'Tokyo, Asakusa');

    const { result } = renderHook(() => useEffectiveExifData('img-1'));
    expect(result.current?.location).toBe('Tokyo, Asakusa');
    expect(result.current?.lens).toBe(baseNormalized.lens);
  });

  it('treats a null override as hidden (field becomes null)', () => {
    useExifStore.getState().setNormalizedData('img-1', baseNormalized);
    useExifStore.getState().setLensOverride('img-1', null);
    useExifStore.getState().setLocationOverride('img-1', null);

    const { result } = renderHook(() => useEffectiveExifData('img-1'));
    expect(result.current?.lens).toBeNull();
    expect(result.current?.location).toBeNull();
  });

  it('treats a whitespace-only override as hidden', () => {
    useExifStore.getState().setNormalizedData('img-1', baseNormalized);
    useExifStore.getState().setLensOverride('img-1', '   ');
    useExifStore.getState().setLocationOverride('img-1', '\t\n');

    const { result } = renderHook(() => useEffectiveExifData('img-1'));
    expect(result.current?.lens).toBeNull();
    expect(result.current?.location).toBeNull();
  });

  it('trims whitespace surrounding a non-empty override', () => {
    useExifStore.getState().setNormalizedData('img-1', baseNormalized);
    useExifStore.getState().setLensOverride('img-1', '  Helios 44-2  ');

    const { result } = renderHook(() => useEffectiveExifData('img-1'));
    expect(result.current?.lens).toBe('Helios 44-2');
  });

  it('applies lens and location overrides independently', () => {
    useExifStore.getState().setNormalizedData('img-1', baseNormalized);
    useExifStore.getState().setLensOverride('img-1', 'Helios 44-2');
    useExifStore.getState().setLocationOverride('img-1', 'Moscow');

    const { result } = renderHook(() => useEffectiveExifData('img-1'));
    expect(result.current?.lens).toBe('Helios 44-2');
    expect(result.current?.location).toBe('Moscow');
  });

  it('does not leak overrides between images', () => {
    useExifStore.getState().setNormalizedData('img-1', baseNormalized);
    useExifStore.getState().setNormalizedData('img-2', baseNormalized);
    useExifStore.getState().setLensOverride('img-1', 'Helios 44-2');

    const { result: result1 } = renderHook(() => useEffectiveExifData('img-1'));
    const { result: result2 } = renderHook(() => useEffectiveExifData('img-2'));
    expect(result1.current?.lens).toBe('Helios 44-2');
    expect(result2.current?.lens).toBe(baseNormalized.lens);
  });

  it('reacts to overrides applied after the hook is mounted', () => {
    useExifStore.getState().setNormalizedData('img-1', baseNormalized);
    const { result, rerender } = renderHook(() =>
      useEffectiveExifData('img-1')
    );
    expect(result.current?.lens).toBe(baseNormalized.lens);

    useExifStore.getState().setLensOverride('img-1', 'Helios 44-2');
    rerender();
    expect(result.current?.lens).toBe('Helios 44-2');

    useExifStore.getState().clearLensOverride('img-1');
    rerender();
    expect(result.current?.lens).toBe(baseNormalized.lens);
  });
});
