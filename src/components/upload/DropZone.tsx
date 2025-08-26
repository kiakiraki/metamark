'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { ImageProcessor } from '@/services/imageProcessor';
import { ExifExtractor } from '@/services/exifExtractor';
import { useImageStore } from '@/stores/imageStore';
import { useExifStore } from '@/stores/exifStore';
import clsx from 'clsx';

export function DropZone() {
  const addImage = useImageStore((state) => state.addImage);
  const setExifData = useExifStore((state) => state.setExifData);
  const setNormalizedData = useExifStore((state) => state.setNormalizedData);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const validation = ImageProcessor.validateImageFile(file);
      
      if (!validation.valid) {
        console.error('Invalid file:', validation.error);
        continue;
      }

      try {
        // Load image
        const imageFile = await ImageProcessor.loadImageFile(file);
        addImage(imageFile);

        // Extract EXIF data in background
        Promise.all([
          ExifExtractor.extractExifData(file),
        ]).then(([exifData]) => {
          setExifData(imageFile.id, exifData);
          
          const normalizedData = ExifExtractor.normalizeExifData(exifData);
          setNormalizedData(imageFile.id, normalizedData);
        }).catch((error) => {
          console.error('Error processing EXIF data:', error);
        });

      } catch (error) {
        console.error('Error loading image:', error);
      }
    }
  }, [addImage, setExifData, setNormalizedData]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic', '.heif'],
    },
    multiple: true,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const rootProps = getRootProps();

  return (
    <motion.div
      className={clsx(
        'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        'min-h-[200px] flex flex-col items-center justify-center',
        {
          'border-blue-400 bg-blue-50': isDragActive && !isDragReject,
          'border-red-400 bg-red-50': isDragReject,
          'border-gray-300 bg-gray-50 hover:bg-gray-100': !isDragActive && !isDragReject,
        }
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={rootProps.onClick}
      onKeyDown={rootProps.onKeyDown}
      tabIndex={rootProps.tabIndex}
      role={rootProps.role}
      aria-disabled={rootProps['aria-disabled']}
      style={rootProps.style}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-4">
        <div className="text-4xl">
          {isDragActive ? '📤' : '📷'}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">
            {isDragActive
              ? 'Drop your images here'
              : 'Drag & drop your images'
            }
          </h3>
          
          <p className="text-sm text-gray-500">
            or click to select files
          </p>
          
          <p className="text-xs text-gray-400">
            Supports JPEG, PNG, HEIC (max 20MB each)
          </p>
        </div>
      </div>

      {isDragReject && (
        <div className="absolute inset-0 bg-red-100 bg-opacity-75 rounded-lg flex items-center justify-center">
          <div className="text-red-600 font-medium">
            Invalid file type
          </div>
        </div>
      )}
    </motion.div>
  );
}