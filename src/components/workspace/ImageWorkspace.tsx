'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

import { useImageStore } from '@/stores/imageStore';
import { useExifStore } from '@/stores/exifStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ImageProcessor } from '@/services/imageProcessor';
import { ExifExtractor } from '@/services/exifExtractor';
import { CanvasRenderer } from '@/services/canvasRenderer';

export function ImageWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  const { currentImage, setImage, clearImage } = useImageStore();
  const setExifData = useExifStore((state) => state.setExifData);
  const setNormalizedData = useExifStore((state) => state.setNormalizedData);
  const getNormalizedData = useExifStore((state) => state.getNormalizedData);
  // Subscribe to normalized data changes directly
  const normalizedData = useExifStore((state) => state.normalizedData);
  const { selectedTemplate } = useTemplateStore();
  const { canvasSettings } = useSettingsStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const validation = ImageProcessor.validateImageFile(file);

      if (!validation.valid) {
        console.error('Invalid file:', validation.error);
        return;
      }

      try {
        const imageFile = await ImageProcessor.loadImageFile(file);
        setImage(imageFile);

        // Extract EXIF data in background
        Promise.all([ExifExtractor.extractExifData(file)])
          .then(([exifData]) => {
            setExifData(imageFile.id, exifData);

            const normalizedData = ExifExtractor.normalizeExifData(exifData);
            setNormalizedData(imageFile.id, normalizedData);
          })
          .catch((error) => {
            console.error('Error processing EXIF data:', error);
          });
      } catch (error) {
        console.error('Error loading image:', error);
      }
    },
    [setImage, setExifData, setNormalizedData]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/heic': ['.heic', '.heif'],
      },
      multiple: false,
      maxSize: 20 * 1024 * 1024, // 20MB
      noClick: !!currentImage, // Disable click when image is loaded
    });

  useEffect(() => {
    renderCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImage, selectedTemplate, canvasSettings]);

  // Also trigger render when EXIF data becomes available
  useEffect(() => {
    if (currentImage) {
      const exifData = currentImage.id ? normalizedData[currentImage.id] : null;
      if (exifData) {
        renderCanvas();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImage?.id, normalizedData]);

  // Calculate optimal container height based on image aspect ratio
  const calculateContainerHeight = useCallback(() => {
    if (!currentImage) {
      setContainerHeight(null);
      return;
    }

    // Responsive breakpoints
    const windowWidth =
      typeof window !== 'undefined' ? window.innerWidth : 1024;
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth < 1024;

    // Dynamic max dimensions based on screen size
    const maxWidth = isMobile ? 300 : isTablet ? 500 : 700;
    const maxHeight = isMobile ? 400 : isTablet ? 500 : 600;
    const minHeight = isMobile ? 250 : 300;

    const imageAspectRatio = currentImage.width / currentImage.height;

    let optimalWidth = Math.min(maxWidth, currentImage.width);
    let optimalHeight = optimalWidth / imageAspectRatio;

    // If height exceeds max, scale down
    if (optimalHeight > maxHeight) {
      optimalHeight = maxHeight;
      optimalWidth = optimalHeight * imageAspectRatio;
    }

    // Ensure minimum height
    optimalHeight = Math.max(minHeight, optimalHeight);

    // Add padding for controls and info
    const paddingHeight = 60;
    setContainerHeight(optimalHeight + paddingHeight);
  }, [currentImage]);

  useEffect(() => {
    calculateContainerHeight();
  }, [calculateContainerHeight]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      calculateContainerHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateContainerHeight]);

  const renderCanvas = async () => {
    if (!currentImage || !selectedTemplate || !canvasRef.current) return;

    setIsRendering(true);

    try {
      const image = await ImageProcessor.createImageElement(currentImage.url);
      let exifData = getNormalizedData(currentImage.id);

      const { width, height } = CanvasRenderer.calculateOptimalSize(
        currentImage.width,
        currentImage.height
      );

      // If no EXIF data is available yet, use placeholder data to show template immediately
      if (!exifData) {
        exifData = {
          camera: 'Loading...',
          lens: 'Loading...',
          focalLength: 'Loading...',
          aperture: 'Loading...',
          shutterSpeed: 'Loading...',
          iso: 'Loading...',
          dateTime: 'Loading...',
        };
      }

      // Always render with template overlay
      await CanvasRenderer.render({
        canvas: canvasRef.current,
        image,
        template: selectedTemplate,
        exifData,
        settings: {
          ...canvasSettings,
          width,
          height,
        },
      });
    } catch (error) {
      console.error('Error rendering canvas:', error);
    } finally {
      setIsRendering(false);
    }
  };

  const handleClearImage = () => {
    clearImage();
    setShowControls(false);
  };

  const rootProps = getRootProps();

  if (!currentImage) {
    return (
      <div
        {...rootProps}
        className={clsx(
          'relative w-full h-full min-h-[60vh] border-2 border-dashed rounded-xl transition-all duration-300',
          'flex flex-col items-center justify-center cursor-pointer',
          {
            'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20':
              isDragActive && !isDragReject,
            'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20':
              isDragReject,
            'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:hover:border-gray-500':
              !isDragActive && !isDragReject,
          }
        )}
      >
        <input {...getInputProps()} />

        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-8xl">
            {isDragReject ? '❌' : isDragActive ? '📥' : '🖼️'}
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isDragActive
                ? 'Drop your image here'
                : 'Start creating your overlay'}
            </h2>

            <p className="text-gray-600 dark:text-gray-400">
              {isDragReject
                ? 'File type not supported'
                : 'Drag & drop an image or click to browse'}
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Supports JPEG, PNG, and HEIC files up to 20MB
            </p>
          </div>

          {!isDragActive && (
            <motion.button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Choose Image
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Main Canvas Area */}
      <div
        {...rootProps}
        className={clsx(
          'relative w-full rounded-xl overflow-hidden transition-all duration-300',
          'flex justify-center bg-gray-100 dark:bg-gray-700',
          {
            'ring-2 ring-blue-400 ring-opacity-50 dark:ring-blue-500':
              isDragActive && !isDragReject,
            'ring-2 ring-red-400 ring-opacity-50 dark:ring-red-500':
              isDragReject,
          }
        )}
        style={{
          height: containerHeight ? `${containerHeight}px` : '60vh',
          alignItems: currentImage ? 'flex-start' : 'center',
        }}
      >
        <input {...getInputProps()} />

        <motion.canvas
          ref={canvasRef}
          className="max-w-full rounded-lg shadow-lg"
          style={{
            imageRendering: 'auto',
            marginTop: currentImage ? '20px' : '0px',
            maxHeight: containerHeight ? `${containerHeight - 60}px` : '60vh',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Processing Overlay */}
        {(isRendering || currentImage.isProcessing) && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
            <div className="text-white text-center space-y-3">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
              <p className="font-medium">
                {isRendering ? 'Rendering overlay...' : 'Processing image...'}
              </p>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        {isDragActive && (
          <div className="absolute inset-0 bg-blue-600 bg-opacity-90 rounded-xl flex items-center justify-center">
            <div className="text-center text-white space-y-4">
              <div className="text-6xl">📥</div>
              <p className="text-xl font-bold">
                {isDragReject ? 'Invalid file type' : 'Drop to replace image'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute top-4 right-4 flex space-x-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={handleClearImage}
              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-lg"
            >
              Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Info Bar */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm">
        <div className="flex items-center space-x-4">
          <span className="font-medium">{currentImage.name}</span>
          <span>
            {Math.round((currentImage.size / 1024 / 1024) * 10) / 10} MB
          </span>
          <span>
            {currentImage.width} × {currentImage.height}px
          </span>
        </div>
      </div>
    </div>
  );
}
