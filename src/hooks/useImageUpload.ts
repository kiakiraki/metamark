import { useCallback, useEffect, useRef } from 'react';
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

  const exifAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      exifAbortRef.current?.abort();
    };
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const validation = ImageProcessor.validateImageFile(file);

      if (!validation.valid) {
        toast.error(validation.error ?? 'Invalid file.');
        return;
      }

      // Cancel any in-flight EXIF extraction from a previous drop so its
      // result cannot land in the store after the image has been replaced.
      exifAbortRef.current?.abort();
      const controller = new AbortController();
      exifAbortRef.current = controller;
      const { signal } = controller;

      try {
        const imageFile = await ImageProcessor.loadImageFile(file);
        setImage(imageFile);

        extractExifData(file)
          .then((exifData) => {
            if (signal.aborted) return;
            setExifData(imageFile.id, exifData);
            const normalized = normalizeExifData(exifData);
            setNormalizedData(imageFile.id, normalized);
          })
          .catch((error: unknown) => {
            if (signal.aborted) return;
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
