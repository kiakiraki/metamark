import { create } from 'zustand';
import type { ImageFile, ProcessedImage } from '@/types/image';
import { ImageProcessor } from '@/services/imageProcessor';
import { useExifStore } from '@/stores/exifStore';

interface ImageState {
  currentImage: ProcessedImage | null;
  setImage: (image: ImageFile) => void;
  clearImage: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  currentImage: null,

  setImage: (image) => {
    const previous = get().currentImage;
    if (previous) {
      if (previous.url) {
        ImageProcessor.cleanupImageUrl(previous.url);
      }
      useExifStore.getState().clearExifData(previous.id);
    }

    set({
      currentImage: { ...image, isProcessing: false },
    });
  },

  clearImage: () => {
    const currentImage = get().currentImage;
    if (currentImage) {
      if (currentImage.url) {
        ImageProcessor.cleanupImageUrl(currentImage.url);
      }
      useExifStore.getState().clearExifData(currentImage.id);
    }
    set({ currentImage: null });
  },
}));

// Add a selector for selectedImage
export const useSelectedImage = () =>
  useImageStore((state) => state.currentImage);
