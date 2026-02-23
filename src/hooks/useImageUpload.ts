import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useImageStore } from '@/stores/imageStore';
import { useExifStore } from '@/stores/exifStore';
import { ImageProcessor } from '@/services/imageProcessor';
import { extractExifData, normalizeExifData } from '@/services/exifExtractor';
import { useToast } from '@/hooks/useToast';

export function useImageUpload() {
  const { currentImage, setImage, clearImage } = useImageStore();
  const setExifData = useExifStore((state) => state.setExifData);
  const setNormalizedData = useExifStore((state) => state.setNormalizedData);
  const toast = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const validation = ImageProcessor.validateImageFile(file);

      if (!validation.valid) {
        toast.error(validation.error ?? 'Invalid file.');
        return;
      }

      try {
        const imageFile = await ImageProcessor.loadImageFile(file);
        setImage(imageFile);

        // Extract EXIF data in background
        extractExifData(file)
          .then((exifData) => {
            setExifData(imageFile.id, exifData);
            const normalized = normalizeExifData(exifData);
            setNormalizedData(imageFile.id, normalized);
          })
          .catch((error: unknown) => {
            console.error('Error processing EXIF data:', error);
            toast.error('Failed to extract EXIF data.');
          });
      } catch (error: unknown) {
        console.error('Error loading image:', error);
        toast.error('Failed to load image.');
      }
    },
    [setImage, setExifData, setNormalizedData, toast]
  );

  const dropzone = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic', '.heif'],
    },
    multiple: false,
    maxSize: 20 * 1024 * 1024,
    noClick: !!currentImage,
  });

  return {
    currentImage,
    clearImage,
    ...dropzone,
  };
}
