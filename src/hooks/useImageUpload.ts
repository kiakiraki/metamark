import { useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';
import { useImageStore } from '@/stores/imageStore';
import { useExifStore } from '@/stores/exifStore';
import {
  ImageProcessor,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_IMAGE_FILE_SIZE_MB,
} from '@/services/imageProcessor';
import { extractExifData, normalizeExifData } from '@/services/exifExtractor';
import { useToast } from '@/hooks/useToast';

function getRejectionMessage(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code;
  switch (code) {
    case 'file-too-large':
      return `File too large. Maximum size is ${MAX_IMAGE_FILE_SIZE_MB}MB.`;
    case 'file-invalid-type':
      return 'Unsupported file type. Please use JPEG, PNG, or HEIC files.';
    case 'too-many-files':
      return 'Only one image can be uploaded at a time.';
    default:
      return 'Invalid file.';
  }
}

export function useImageUpload() {
  const currentImage = useImageStore((state) => state.currentImage);
  const setImage = useImageStore((state) => state.setImage);
  const clearImage = useImageStore((state) => state.clearImage);
  const setExifData = useExifStore((state) => state.setExifData);
  const setNormalizedData = useExifStore((state) => state.setNormalizedData);
  const toast = useToast();

  const exifAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      exifAbortRef.current?.abort();
    };
  }, []);

  const clearCurrentImage = useCallback(() => {
    exifAbortRef.current?.abort();
    exifAbortRef.current = null;
    clearImage();
  }, [clearImage]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        for (const message of new Set(
          fileRejections.map(getRejectionMessage)
        )) {
          toast.error(message);
        }
        return;
      }

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
        // A later drop may have aborted this one while the file was decoding;
        // landing setImage here would replace the newer image with this stale
        // one (and its EXIF extraction below would be skipped as aborted).
        if (signal.aborted) {
          ImageProcessor.cleanupImageUrl(imageFile.url);
          return;
        }
        setImage(imageFile);

        extractExifData(file)
          .then((exifData) => {
            if (signal.aborted) return;
            if (useImageStore.getState().currentImage?.id !== imageFile.id) {
              return;
            }
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
        if (signal.aborted) return;
        console.error('Error loading image:', error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to load image.'
        );
      }
    },
    [setImage, setExifData, setNormalizedData, toast]
  );

  const dropzone = useDropzone({
    onDrop: (acceptedFiles, fileRejections) => {
      void onDrop(acceptedFiles, fileRejections);
    },
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic', '.heif'],
    },
    multiple: false,
    maxSize: MAX_IMAGE_FILE_SIZE_BYTES,
    noClick: !!currentImage,
  });

  return {
    currentImage,
    clearImage: clearCurrentImage,
    ...dropzone,
  };
}
