import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

import { useImageUpload } from '@/hooks/useImageUpload';
import { useCanvasRenderer } from '@/hooks/useCanvasRenderer';
import { usePanZoom } from '@/hooks/usePanZoom';
import {
  ImageIcon,
  DownloadIcon,
  AlertTriangleIcon,
  XIcon,
} from '@/components/ui/icons';

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
          'relative h-full min-h-[60vh] w-full rounded-xl border border-dashed transition-all duration-300',
          'flex cursor-pointer flex-col items-center justify-center',
          {
            'border-accent/60 bg-accent/[0.04]': isDragActive && !isDragReject,
            'border-red-500/60 bg-red-500/[0.04]': isDragReject,
            'border-white/15 bg-surface/60 hover:border-white/25 hover:bg-surface':
              !isDragActive && !isDragReject,
          }
        )}
      >
        <input {...getInputProps()} />

        <motion.div
          className="space-y-6 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className={clsx(
              'mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border transition-colors',
              isDragReject
                ? 'border-red-500/30 bg-red-500/10 text-red-400'
                : isDragActive
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-white/10 bg-surface-2 text-zinc-500'
            )}
          >
            {isDragReject ? (
              <AlertTriangleIcon size={36} strokeWidth={1.5} />
            ) : isDragActive ? (
              <DownloadIcon size={36} strokeWidth={1.5} />
            ) : (
              <ImageIcon size={36} strokeWidth={1.5} />
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
              {isDragActive
                ? 'Drop your image here'
                : 'Start creating your overlay'}
            </h2>

            <p className="text-zinc-400">
              {isDragReject
                ? 'File type not supported'
                : 'Drag & drop an image or click to browse'}
            </p>

            <p className="font-mono text-xs uppercase tracking-wider text-zinc-600">
              JPEG · PNG · HEIC — up to 20 MB
            </p>
          </div>

          {!isDragActive && (
            <button className="rounded-lg bg-accent px-6 py-3 font-medium text-black transition hover:brightness-110">
              Choose Image
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Main Canvas Area — the pan/zoom viewport */}
      <div
        {...rootProps}
        ref={setViewportEl}
        className={clsx(
          'relative w-full overflow-hidden rounded-xl border border-white/[0.07] transition-all duration-300',
          'flex justify-center bg-black/40',
          {
            'ring-2 ring-accent/50': isDragActive && !isDragReject,
            'ring-2 ring-red-500/50': isDragReject,
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
            className="rounded-lg shadow-2xl shadow-black/60"
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
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-[2px]">
            <div className="space-y-3 text-center text-zinc-100">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
              <p className="font-mono text-sm uppercase tracking-wider">
                {isRendering ? 'Rendering overlay…' : 'Processing image…'}
              </p>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink/90 backdrop-blur-sm">
            <div className="space-y-4 text-center">
              <div
                className={clsx(
                  'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border',
                  isDragReject
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-accent/40 bg-accent/10 text-accent'
                )}
              >
                {isDragReject ? (
                  <AlertTriangleIcon size={30} strokeWidth={1.5} />
                ) : (
                  <DownloadIcon size={30} strokeWidth={1.5} />
                )}
              </div>
              <p className="text-lg font-semibold text-zinc-100">
                {isDragReject ? 'Invalid file type' : 'Drop to replace image'}
              </p>
            </div>
          </div>
        )}

        {/* Zoom indicator — visible only when zoomed in */}
        {isZoomed && (
          <div
            data-zoom-ui
            className="absolute bottom-4 right-4 flex select-none items-center gap-3 rounded-lg border border-white/10 bg-black/75 px-3 py-1.5 font-mono text-xs text-zinc-200 backdrop-blur-sm"
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
              className="font-medium uppercase tracking-wider text-accent transition-colors hover:text-accent/80"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Floating Controls — always visible: a hover-gated button is
          unreachable for keyboard and touch users (WCAG 2.1; prior review
          M-15), and the info bar below is permanent anyway. */}
      <div className="absolute right-4 top-4 flex space-x-2">
        <button
          onClick={handleClearImage}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-red-500/40 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70"
        >
          <XIcon size={15} />
          Remove
        </button>
      </div>

      {/* Image Info Bar */}
      <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/75 px-4 py-2 font-mono text-xs text-zinc-300 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="max-w-[14rem] truncate font-medium text-zinc-100">
            {currentImage.name}
          </span>
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
