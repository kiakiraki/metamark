import { create } from 'zustand';
import type { ImageFile, ProcessedImage } from '@/types/image';
import { ImageProcessor } from '@/services/imageProcessor';

interface ImageState {
  currentImage: ProcessedImage | null;
  setImage: (image: ImageFile) => void;
  clearImage: () => void;
  updateProcessingStatus: (isProcessing: boolean) => void;
  setProcessedUrl: (url: string) => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  currentImage: null,

  setImage: (image) => {
    // Clean up previous image URL if exists
    const currentImage = get().currentImage;
    if (currentImage?.url) {
      ImageProcessor.cleanupImageUrl(currentImage.url);
    }

    set({
      currentImage: { ...image, isProcessing: false },
    });
  },

  clearImage: () => {
    const currentImage = get().currentImage;
    if (currentImage?.url) {
      ImageProcessor.cleanupImageUrl(currentImage.url);
    }
    if (currentImage?.processedUrl) {
      ImageProcessor.cleanupImageUrl(currentImage.processedUrl);
    }
    set({ currentImage: null });
  },

  updateProcessingStatus: (isProcessing) =>
    set((state) =>
      state.currentImage
        ? { currentImage: { ...state.currentImage, isProcessing } }
        : state
    ),

  setProcessedUrl: (processedUrl) =>
    set((state) =>
      state.currentImage
        ? {
            currentImage: {
              ...state.currentImage,
              processedUrl,
              isProcessing: false,
            },
          }
        : state
    ),
}));

// Add a selector for selectedImage
export const useSelectedImage = () =>
  useImageStore((state) => state.currentImage);
