import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

export const MIN_SCALE = 1;
export const MAX_SCALE = 8;
const WHEEL_SENSITIVITY = 0.0015;
// At least this fraction of the scaled content must remain inside the
// viewport on each axis, so the user cannot drag the image entirely
// off-screen.
const MIN_VISIBLE_FRACTION = 0.2;

export interface PanZoomState {
  scale: number;
  offset: { x: number; y: number };
}

export const IDENTITY_STATE: PanZoomState = {
  scale: 1,
  offset: { x: 0, y: 0 },
};

export interface ContentSize {
  width: number;
  height: number;
}

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

// Constrain pan offset (origin = viewport center, content centered at
// offset 0) so MIN_VISIBLE_FRACTION of the content always overlaps the
// viewport on each axis.
export function clampOffset(
  offset: { x: number; y: number },
  scale: number,
  viewport: ContentSize,
  content: ContentSize
): { x: number; y: number } {
  const scaledW = content.width * scale;
  const scaledH = content.height * scale;

  const visibleW = Math.min(scaledW, viewport.width);
  const visibleH = Math.min(scaledH, viewport.height);
  const minVisibleW = visibleW * MIN_VISIBLE_FRACTION;
  const minVisibleH = visibleH * MIN_VISIBLE_FRACTION;

  const maxOffsetX = Math.max(
    0,
    scaledW / 2 + viewport.width / 2 - minVisibleW
  );
  const maxOffsetY = Math.max(
    0,
    scaledH / 2 + viewport.height / 2 - minVisibleH
  );

  return {
    x: Math.min(maxOffsetX, Math.max(-maxOffsetX, offset.x)),
    y: Math.min(maxOffsetY, Math.max(-maxOffsetY, offset.y)),
  };
}

// Anchor the point under the cursor while the scale changes. Cursor is in
// viewport-local coordinates with origin at the viewport center; the
// layer is assumed to be visually centered when offset is (0,0).
//
// Derivation: with transform-origin at the layer center, a content-space
// point p (relative to the layer center) lands on screen at offset +
// p*scale (relative to viewport center). Holding p under cursor c gives
// offset' = c - (c - offset) * (scale'/scale).
export function zoomAt(
  prev: PanZoomState,
  cursor: { x: number; y: number },
  nextScaleRaw: number,
  viewport: ContentSize,
  content: ContentSize
): PanZoomState {
  const nextScale = clampScale(nextScaleRaw);
  if (nextScale === prev.scale) return prev;

  const ratio = nextScale / prev.scale;
  const nextOffset = {
    x: cursor.x - (cursor.x - prev.offset.x) * ratio,
    y: cursor.y - (cursor.y - prev.offset.y) * ratio,
  };

  return {
    scale: nextScale,
    offset: clampOffset(nextOffset, nextScale, viewport, content),
  };
}

export interface UsePanZoomOptions<
  V extends HTMLElement = HTMLElement,
  C extends HTMLElement = HTMLElement,
> {
  viewportRef: RefObject<V | null>;
  contentRef: RefObject<C | null>;
  enabled: boolean;
  // Changing this resets pan/zoom state — pass e.g. the current image id
  // so a new image starts unzoomed.
  resetKey?: string | number | null;
}

interface Measured {
  viewportRect: DOMRect;
  contentRect: DOMRect;
  viewport: ContentSize;
}

export function usePanZoom<
  V extends HTMLElement = HTMLElement,
  C extends HTMLElement = HTMLElement,
>({
  viewportRef,
  contentRef,
  enabled,
  resetKey = null,
}: UsePanZoomOptions<V, C>) {
  const [state, setState] = useState<PanZoomState>(IDENTITY_STATE);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originOffset: { x: number; y: number };
  } | null>(null);

  // React docs pattern: adjust state in render when a tracked input
  // changes. Resets pan/zoom when the consumer passes a new resetKey
  // (e.g. image change) or disables interaction.
  const [prevTrigger, setPrevTrigger] = useState<{
    enabled: boolean;
    resetKey: typeof resetKey;
  }>({ enabled, resetKey });
  if (prevTrigger.enabled !== enabled || prevTrigger.resetKey !== resetKey) {
    setPrevTrigger({ enabled, resetKey });
    setState(IDENTITY_STATE);
    // M-11: if resetKey changes mid-pan (e.g. image replaced while dragging),
    // clear the pan baseline so the stale start offset cannot apply to the new
    // image. Resetting a ref to null during the "adjust state in render" block
    // is safe — it's an idempotent reset to inert state, not a computed value.
    // eslint-disable-next-line react-hooks/refs
    panStartRef.current = null;
    setIsPanning(false);
  }

  const reset = useCallback(() => {
    setState(IDENTITY_STATE);
  }, []);

  const measure = useCallback((): Measured | null => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return null;

    const viewportRect = viewport.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      viewportRect,
      contentRect,
      viewport: { width: viewportRect.width, height: viewportRect.height },
    };
  }, [viewportRef, contentRef]);

  const contentSizeFor = useCallback(
    (m: Measured, scale: number): ContentSize => ({
      width: m.contentRect.width / Math.max(scale, 0.0001),
      height: m.contentRect.height / Math.max(scale, 0.0001),
    }),
    []
  );

  // Wheel listener — attached natively because React's onWheel is passive
  // in modern browsers, so preventDefault() there would not block page
  // scroll.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !enabled) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const m = measure();
      if (!m) return;

      const cursor = {
        x: e.clientX - m.viewportRect.left - m.viewportRect.width / 2,
        y: e.clientY - m.viewportRect.top - m.viewportRect.height / 2,
      };
      const factor = Math.exp(-e.deltaY * WHEEL_SENSITIVITY);
      setState((prev) => {
        const content = contentSizeFor(m, prev.scale);
        return zoomAt(prev, cursor, prev.scale * factor, m.viewport, content);
      });
    };

    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [viewportRef, enabled, measure, contentSizeFor]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (e.button !== 0) return;
      if (state.scale <= MIN_SCALE) return;

      panStartRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originOffset: state.offset,
      };
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [enabled, state.scale, state.offset]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return; // belt-and-braces: ref is cleared on disable but guard anyway
      const start = panStartRef.current;
      if (!start || start.pointerId !== e.pointerId) return;

      const m = measure();
      if (!m) return;

      const dx = e.clientX - start.startX;
      const dy = e.clientY - start.startY;
      const nextOffset = {
        x: start.originOffset.x + dx,
        y: start.originOffset.y + dy,
      };
      setState((prev) => ({
        ...prev,
        offset: clampOffset(
          nextOffset,
          prev.scale,
          m.viewport,
          contentSizeFor(m, prev.scale)
        ),
      }));
    },
    [enabled, measure, contentSizeFor]
  );

  const endPan = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const start = panStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    panStartRef.current = null;
    setIsPanning(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onDoubleClick = useCallback(() => {
    if (!enabled) return;
    reset();
  }, [enabled, reset]);

  const isZoomed = state.scale > MIN_SCALE + 1e-6;

  return {
    scale: state.scale,
    offset: state.offset,
    isPanning,
    isZoomed,
    reset,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
      onDoubleClick,
    },
  };
}
