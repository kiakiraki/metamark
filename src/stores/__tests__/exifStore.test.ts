import { describe, it, expect, beforeEach } from 'vitest';
import { useExifStore } from '../exifStore';
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
};

function reset() {
  useExifStore.setState({
    exifData: {},
    normalizedData: {},
    lensOverrides: {},
  });
}

describe('exifStore lens overrides', () => {
  beforeEach(reset);

  it('returns base data when no override is set', () => {
    const store = useExifStore.getState();
    store.setNormalizedData('img-1', baseNormalized);

    const effective = useExifStore
      .getState()
      .getEffectiveNormalizedData('img-1');
    expect(effective).toEqual(baseNormalized);
  });

  it('replaces lens with a non-empty override string', () => {
    const store = useExifStore.getState();
    store.setNormalizedData('img-1', baseNormalized);
    store.setLensOverride('img-1', 'Helios 44-2 58mm f/2');

    const effective = useExifStore
      .getState()
      .getEffectiveNormalizedData('img-1');
    expect(effective?.lens).toBe('Helios 44-2 58mm f/2');
    expect(effective?.camera).toBe(baseNormalized.camera);
    expect(effective?.focalLength).toBe(baseNormalized.focalLength);
  });

  it('treats null override as hidden (lens becomes null)', () => {
    const store = useExifStore.getState();
    store.setNormalizedData('img-1', baseNormalized);
    store.setLensOverride('img-1', null);

    const effective = useExifStore
      .getState()
      .getEffectiveNormalizedData('img-1');
    expect(effective?.lens).toBeNull();
  });

  it('treats whitespace-only override as hidden', () => {
    const store = useExifStore.getState();
    store.setNormalizedData('img-1', baseNormalized);
    store.setLensOverride('img-1', '   ');

    const effective = useExifStore
      .getState()
      .getEffectiveNormalizedData('img-1');
    expect(effective?.lens).toBeNull();
  });

  it('does not leak overrides between images', () => {
    const store = useExifStore.getState();
    store.setNormalizedData('img-1', baseNormalized);
    store.setNormalizedData('img-2', baseNormalized);
    store.setLensOverride('img-1', 'Helios 44-2');

    const effective1 = useExifStore
      .getState()
      .getEffectiveNormalizedData('img-1');
    const effective2 = useExifStore
      .getState()
      .getEffectiveNormalizedData('img-2');
    expect(effective1?.lens).toBe('Helios 44-2');
    expect(effective2?.lens).toBe(baseNormalized.lens);
  });

  it('clearLensOverride reverts to EXIF', () => {
    const store = useExifStore.getState();
    store.setNormalizedData('img-1', baseNormalized);
    store.setLensOverride('img-1', 'Helios 44-2');
    store.clearLensOverride('img-1');

    const effective = useExifStore
      .getState()
      .getEffectiveNormalizedData('img-1');
    expect(effective?.lens).toBe(baseNormalized.lens);
  });

  it('clearExifData removes the override for that image', () => {
    const store = useExifStore.getState();
    store.setNormalizedData('img-1', baseNormalized);
    store.setLensOverride('img-1', 'Helios 44-2');
    store.clearExifData('img-1');

    expect(useExifStore.getState().lensOverrides['img-1']).toBeUndefined();
    expect(
      useExifStore.getState().getEffectiveNormalizedData('img-1')
    ).toBeNull();
  });

  it('returns null when image has no normalized data', () => {
    expect(
      useExifStore.getState().getEffectiveNormalizedData('missing')
    ).toBeNull();
  });
});
