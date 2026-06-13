import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

import { useImageUpload } from '@/hooks/useImageUpload';
import { useCanvasRenderer } from '@/hooks/useCanvasRenderer';
import { usePanZoom } from '@/hooks/usePanZoom';

export function ImageWorkspace() {
  // Refs for pan/zoom — must be created unconditionally (Rules of Hooks).
  // viewportRef → the canvas-area div (the overflow-hidden scroll viewport).
  // contentRef  → the wrapper div around the canvas that receives the transform.
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    currentImage,
    clearImage,
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useImageUpload();

  const { canvasRef, isRendering, containerHeight } =
    useCanvasRenderer(currentImage);

  // Called unconditionally — before the early return — so hook call order is
  // stable. enabled=false and resetKey=null are safe no-ops inside the hook.
  const { scale, offset, isPanning, isZoomed, reset, bind } = usePanZoom({
    viewportRef,
    contentRef,
    enabled: !!currentImage,
    resetKey: currentImage?.id ?? null,
  });

  const handleClearImage = () => {
    clearImage();
  };

  const rootProps = getRootProps();

  // react-dropzone injects a 'ref' key at runtime (via refKey, default 'ref')
  // that is NOT declared in DropzoneRootProps types. Extract it so we can merge
  // it with viewportRef through a single callback ref, keeping drag-and-drop
  // working while also giving usePanZoom a handle to the viewport element.
  const dzRef = (
    rootProps as unknown as { ref?: React.MutableRefObject<HTMLElement | null> }
  ).ref;

  // Callback ref forwarded to both react-dropzone's internal containerRef and
  // our viewportRef. Stable as long as dzRef is stable (useRef in the library).
  const setViewportEl = useCallback(
    (el: HTMLDivElement | null) => {
      viewportRef.current = el;
      if (dzRef) dzRef.current = el;
    },
    [dzRef]
  );

  if (!currentImage) {
    return (
      <div
        {...rootProps}
        ref={setViewportEl}
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
    <div className="relative w-full h-full">
      {/* Main Canvas Area — the pan/zoom viewport */}
      <div
        {...rootProps}
        ref={setViewportEl}
        className={clsx(
          'relative w-full rounded-xl overflow-hidden transition-all duration-300',
          'flex justify-center bg-gray-100 dark:bg-gray-700',
          {
            'ring-2 ring-blue-400/50 dark:ring-blue-500/50':
              isDragActive && !isDragReject,
            'ring-2 ring-red-400/50 dark:ring-red-500/50': isDragReject,
            'cursor-grab': isZoomed && !isPanning,
            'cursor-grabbing': isZoomed && isPanning,
          }
        )}
        style={{
          height: containerHeight ? `${containerHeight}px` : '60vh',
          alignItems: currentImage ? 'flex-start' : 'center',
          touchAction: isZoomed ? 'none' : undefined,
        }}
        {...bind}
        onClickCapture={(e) => {
          // Suppress click events while zoomed so a pan gesture that ends in
          // a pointer-up (which fires a synthetic click) cannot trigger the
          // dropzone's onClick. Lives on the viewport (not the content
          // wrapper) so pans started from the gray margin around the canvas
          // are covered too. Clicks inside the zoom UI must pass through,
          // otherwise the capture-phase stop would swallow the Reset button.
          if (!isZoomed) return;
          if ((e.target as HTMLElement).closest('[data-zoom-ui]')) return;
          e.stopPropagation();
        }}
      >
        <input {...getInputProps()} />

        {/* Content wrapper — receives the pan/zoom CSS transform.
            marginTop lives here (not on the canvas) so that the wrapper's
            vertical center equals the viewport center:
              wrapper center = 20 + canvasHeight/2
              viewport center = containerHeight/2 = (canvasHeight+40)/2 = 20 + canvasHeight/2
            With transformOrigin:'center', scale/translate anchors at the
            viewport center, matching usePanZoom's coordinate assumption. */}
        <div
          ref={contentRef}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center',
            marginTop: '20px',
          }}
        >
          <motion.canvas
            ref={canvasRef}
            role="img"
            aria-label={`Preview of ${currentImage.name} with EXIF overlay`}
            className="rounded-lg shadow-lg"
            style={{
              imageRendering: 'auto',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Processing Overlay */}
        {(isRendering || currentImage.isProcessing) && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
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
          <div className="absolute inset-0 bg-blue-600/90 rounded-xl flex items-center justify-center">
            <div className="text-center text-white space-y-4">
              <div className="text-6xl">📥</div>
              <p className="text-xl font-bold">
                {isDragReject ? 'Invalid file type' : 'Drop to replace image'}
              </p>
            </div>
          </div>
        )}

        {/* Zoom indicator — visible only when zoomed in */}
        {isZoomed && (
          <div
            data-zoom-ui
            className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/75 text-white px-3 py-1.5 rounded-lg text-sm select-none"
            onClick={(e) => e.stopPropagation()}
            // Without this, the viewport's onPointerDown starts a pan and
            // captures the pointer, which retargets the ensuing click to the
            // viewport — the Reset button would never receive it.
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span>{Math.round(scale * 100)}%</span>
            <button
              aria-label="Reset zoom"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="hover:text-gray-300 transition-colors font-medium"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Floating Controls — always visible: a hover-gated button is
          unreachable for keyboard and touch users (WCAG 2.1; prior review
          M-15), and the info bar below is permanent anyway. */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <button
          onClick={handleClearImage}
          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          Remove
        </button>
      </div>

      {/* Image Info Bar */}
      <div className="absolute bottom-4 left-4 bg-black/75 dark:bg-gray-900/90 text-white px-4 py-2 rounded-lg text-sm">
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
