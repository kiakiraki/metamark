import { create } from 'zustand';
import type { ImageFile, ProcessedImage } from '@/types/image';

interface ImageState {
  images: ProcessedImage[];
  selectedImageId: string | null;
  addImage: (image: ImageFile) => void;
  removeImage: (id: string) => void;
  selectImage: (id: string | null) => void;
  updateProcessingStatus: (id: string, isProcessing: boolean) => void;
  setProcessedUrl: (id: string, url: string) => void;
  selectedImage: ProcessedImage | null;
}

export const useImageStore = create<ImageState>((set, get) => ({
  images: [],
  selectedImageId: null,

  addImage: (image) =>
    set((state) => ({
      images: [...state.images, { ...image, isProcessing: false }],
    })),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      selectedImageId: state.selectedImageId === id ? null : state.selectedImageId,
    })),

  selectImage: (id) => set({ selectedImageId: id }),

  updateProcessingStatus: (id, isProcessing) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, isProcessing } : img
      ),
    })),

  setProcessedUrl: (id, processedUrl) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, processedUrl, isProcessing: false } : img
      ),
    })),

  selectedImage: null,
}));

// Add a selector for selectedImage
export const useSelectedImage = () => {
  const { images, selectedImageId } = useImageStore();
  return images.find((img) => img.id === selectedImageId) || null;
};;