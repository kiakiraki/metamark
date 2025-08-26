'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useImageStore } from '@/stores/imageStore';
import { useExifStore } from '@/stores/exifStore';
import { ImageProcessor } from '@/services/imageProcessor';
import clsx from 'clsx';

export function FileList() {
  const { images, selectedImageId, selectImage, removeImage } = useImageStore();
  const getNormalizedData = useExifStore((state) => state.getNormalizedData);

  const handleRemove = (id: string, url: string) => {
    removeImage(id);
    ImageProcessor.cleanupImageUrl(url);
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Uploaded Images</h3>
      
      <AnimatePresence>
        {images.map((image) => {
          const exifData = getNormalizedData(image.id);
          const isSelected = selectedImageId === image.id;
          
          return (
            <motion.div
              key={image.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={clsx(
                'bg-white border rounded-lg p-3 cursor-pointer transition-colors',
                {
                  'border-blue-500 bg-blue-50': isSelected,
                  'border-gray-200 hover:bg-gray-50': !isSelected,
                }
              )}
              onClick={() => selectImage(image.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {image.name}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(image.id, image.url);
                      }}
                      className="text-gray-400 hover:text-red-500 text-sm"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-gray-500">
                      {image.width} × {image.height} • {formatFileSize(image.size)}
                    </p>
                    
                    {exifData?.camera && (
                      <p className="text-xs text-gray-600">
                        📷 {exifData.camera}
                      </p>
                    )}
                    
                    {exifData?.lens && (
                      <p className="text-xs text-gray-600">
                        🔍 {exifData.lens}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}