import { create } from 'zustand';
import type { ExifData, NormalizedExifData } from '@/types/exif';

interface ExifState {
  exifData: Record<string, ExifData>;
  normalizedData: Record<string, NormalizedExifData>;
  lensOverrides: Record<string, string | null>;
  setExifData: (imageId: string, data: ExifData) => void;
  setNormalizedData: (imageId: string, data: NormalizedExifData) => void;
  getExifData: (imageId: string) => ExifData | null;
  getNormalizedData: (imageId: string) => NormalizedExifData | null;
  getEffectiveNormalizedData: (imageId: string) => NormalizedExifData | null;
  setLensOverride: (imageId: string, value: string | null) => void;
  clearLensOverride: (imageId: string) => void;
  clearExifData: (imageId: string) => void;
}

function applyLensOverride(
  base: NormalizedExifData,
  override: string | null | undefined
): NormalizedExifData {
  if (override === undefined) return base;
  const trimmed = typeof override === 'string' ? override.trim() : '';
  return { ...base, lens: trimmed ? trimmed : null };
}

export const useExifStore = create<ExifState>((set, get) => ({
  exifData: {},
  normalizedData: {},
  lensOverrides: {},

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
    return applyLensOverride(base, get().lensOverrides[imageId]);
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

  clearExifData: (imageId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _exif, ...restExif } = state.exifData;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _norm, ...restNorm } = state.normalizedData;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _override, ...restOverrides } = state.lensOverrides;
      return {
        exifData: restExif,
        normalizedData: restNorm,
        lensOverrides: restOverrides,
      };
    }),
}));
