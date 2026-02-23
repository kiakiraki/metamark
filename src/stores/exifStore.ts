import { create } from 'zustand';
import type { ExifData, NormalizedExifData } from '@/types/exif';

interface ExifState {
  exifData: Record<string, ExifData>;
  normalizedData: Record<string, NormalizedExifData>;
  setExifData: (imageId: string, data: ExifData) => void;
  setNormalizedData: (imageId: string, data: NormalizedExifData) => void;
  getExifData: (imageId: string) => ExifData | null;
  getNormalizedData: (imageId: string) => NormalizedExifData | null;
  clearExifData: (imageId: string) => void;
}

export const useExifStore = create<ExifState>((set, get) => ({
  exifData: {},
  normalizedData: {},

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

  clearExifData: (imageId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _exif, ...restExif } = state.exifData;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [imageId]: _norm, ...restNorm } = state.normalizedData;
      return { exifData: restExif, normalizedData: restNorm };
    }),
}));
