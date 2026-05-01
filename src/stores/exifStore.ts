import { create } from 'zustand';
import type { ExifData, NormalizedExifData } from '@/types/exif';

interface ExifState {
  exifData: Record<string, ExifData>;
  normalizedData: Record<string, NormalizedExifData>;
  lensOverrides: Record<string, string | null>;
  locationOverrides: Record<string, string | null>;
  setExifData: (imageId: string, data: ExifData) => void;
  setNormalizedData: (imageId: string, data: NormalizedExifData) => void;
  getExifData: (imageId: string) => ExifData | null;
  getNormalizedData: (imageId: string) => NormalizedExifData | null;
  getEffectiveNormalizedData: (imageId: string) => NormalizedExifData | null;
  setLensOverride: (imageId: string, value: string | null) => void;
  clearLensOverride: (imageId: string) => void;
  setLocationOverride: (imageId: string, value: string | null) => void;
  clearLocationOverride: (imageId: string) => void;
  clearExifData: (imageId: string) => void;
}

function applyStringOverride(
  current: string | null,
  override: string | null | undefined
): string | null {
  if (override === undefined) return current;
  const trimmed = typeof override === 'string' ? override.trim() : '';
  return trimmed ? trimmed : null;
}

export const useExifStore = create<ExifState>((set, get) => ({
  exifData: {},
  normalizedData: {},
  lensOverrides: {},
  locationOverrides: {},

  setExifData: (imageId, data) =>
    set((state) => ({
      exifData: { ...state.exifData, [imageId]: data },
    })),

  setNormalizedData: (imageId, data) =>
    set((state) => ({
      normalizedData: { ...state.normalizedData, [imageId]: data },
    })),

  getExifData: (imageId) => get().exifData[imageId] || null,

  getNormalizedData: (imageId) => get().normalizedData[imageId] || null,

  getEffectiveNormalizedData: (imageId) => {
    const base = get().normalizedData[imageId];
    if (!base) return null;
    return {
      ...base,
      lens: applyStringOverride(base.lens, get().lensOverrides[imageId]),
      location: applyStringOverride(
        base.location,
        get().locationOverrides[imageId]
      ),
    };
  },

  setLensOverride: (imageId, value) =>
    set((state) => ({
      lensOverrides: { ...state.lensOverrides, [imageId]: value },
    })),

  clearLensOverride: (imageId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _removed, ...rest } = state.lensOverrides;
      return { lensOverrides: rest };
    }),

  setLocationOverride: (imageId, value) =>
    set((state) => ({
      locationOverrides: { ...state.locationOverrides, [imageId]: value },
    })),

  clearLocationOverride: (imageId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _removed, ...rest } = state.locationOverrides;
      return { locationOverrides: rest };
    }),

  clearExifData: (imageId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _exif, ...restExif } = state.exifData;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _norm, ...restNorm } = state.normalizedData;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _override, ...restOverrides } = state.lensOverrides;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _location, ...restLocationOverrides } =
        state.locationOverrides;
      return {
        exifData: restExif,
        normalizedData: restNorm,
        lensOverrides: restOverrides,
        locationOverrides: restLocationOverrides,
      };
    }),
}));
