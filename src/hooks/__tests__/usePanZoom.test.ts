import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clampScale,
  clampOffset,
  zoomAt,
  usePanZoom,
  IDENTITY_STATE,
  MIN_SCALE,
  MAX_SCALE,
} from '../usePanZoom';

const VIEWPORT = { width: 700, height: 600 };
const CONTENT = { width: 600, height: 450 };

describe('clampScale', () => {
  it('clamps to MIN_SCALE..MAX_SCALE', () => {
    expect(clampScale(0)).toBe(MIN_SCALE);
    expect(clampScale(0.1)).toBe(MIN_SCALE);
    expect(clampScale(MIN_SCALE)).toBe(MIN_SCALE);
    expect(clampScale(2.5)).toBe(2.5);
    expect(clampScale(MAX_SCALE)).toBe(MAX_SCALE);
    expect(clampScale(MAX_SCALE + 100)).toBe(MAX_SCALE);
  });

  it('falls back to MIN_SCALE for non-finite input', () => {
    expect(clampScale(Number.NaN)).toBe(MIN_SCALE);
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(MIN_SCALE);
  });
});

describe('clampOffset', () => {
  it('passes small offsets through unchanged', () => {
    const result = clampOffset({ x: 10, y: 20 }, 1.5, VIEWPORT, CONTENT);
    expect(result).toEqual({ x: 10, y: 20 });
  });

  it('clamps large offsets to keep at least 20% of content visible', () => {
    const huge = clampOffset({ x: 9999, y: 9999 }, 2, VIEWPORT, CONTENT);
    // At scale 2, scaledW=1200, viewport.width=700, visibleW=700,
    // minVisible=140 -> maxOffsetX = 1200/2 + 700/2 - 140 = 810
    expect(huge.x).toBeCloseTo(810);
    // scaledH=900, viewport.height=600, visibleH=600, minVisible=120
    // -> maxOffsetY = 900/2 + 600/2 - 120 = 630
    expect(huge.y).toBeCloseTo(630);
  });

  it('clamps symmetrically for negative offsets', () => {
    const huge = clampOffset({ x: -9999, y: -9999 }, 2, VIEWPORT, CONTENT);
    expect(huge.x).toBeCloseTo(-810);
    expect(huge.y).toBeCloseTo(-630);
  });
});

describe('zoomAt', () => {
  it('returns the previous state when scale is unchanged', () => {
    const prev = { ...IDENTITY_STATE };
    const next = zoomAt(prev, { x: 100, y: 50 }, 1, VIEWPORT, CONTENT);
    expect(next).toBe(prev);
  });

  it('keeps the cursor anchored over the same content point when zooming in', () => {
    // Cursor at viewport center -> any zoom keeps content under cursor.
    const next = zoomAt(IDENTITY_STATE, { x: 0, y: 0 }, 2, VIEWPORT, CONTENT);
    expect(next.scale).toBe(2);
    expect(next.offset).toEqual({ x: 0, y: 0 });
  });

  it('shifts content to keep an off-center cursor anchored', () => {
    // Cursor 100px right of viewport center, zoom from 1 -> 2.
    // offset' = c - (c - 0) * (2/1) = 100 - 200 = -100
    const next = zoomAt(IDENTITY_STATE, { x: 100, y: 0 }, 2, VIEWPORT, CONTENT);
    expect(next.scale).toBe(2);
    expect(next.offset.x).toBeCloseTo(-100);
    expect(next.offset.y).toBeCloseTo(0);
  });

  it('preserves the anchor across consecutive zooms', () => {
    const cursor = { x: 50, y: 30 };
    const a = zoomAt(IDENTITY_STATE, cursor, 1.5, VIEWPORT, CONTENT);
    const b = zoomAt(a, cursor, 3, VIEWPORT, CONTENT);
    // The point in content space under the cursor should be the same:
    // p = (cursor - offset) / scale
    const pA = {
      x: (cursor.x - a.offset.x) / a.scale,
      y: (cursor.y - a.offset.y) / a.scale,
    };
    const pB = {
      x: (cursor.x - b.offset.x) / b.scale,
      y: (cursor.y - b.offset.y) / b.scale,
    };
    expect(pA.x).toBeCloseTo(pB.x);
    expect(pA.y).toBeCloseTo(pB.y);
  });

  it('clamps to MIN_SCALE when zooming below 1', () => {
    const next = zoomAt(
      { scale: 1, offset: { x: 0, y: 0 } },
      { x: 0, y: 0 },
      0.1,
      VIEWPORT,
      CONTENT
    );
    expect(next).toEqual(IDENTITY_STATE);
  });

  it('snaps the offset back to center when zooming out to MIN_SCALE off-center', () => {
    // Zoom in anchored at an off-center cursor, pan would leave an offset;
    // zooming back out to 1x at the same off-center cursor must not strand
    // the image off-center (at 1x panning is disabled and Reset is hidden).
    const zoomed = zoomAt(
      IDENTITY_STATE,
      { x: 100, y: 60 },
      2,
      VIEWPORT,
      CONTENT
    );
    expect(zoomed.offset).not.toEqual({ x: 0, y: 0 });

    const backTo1x = zoomAt(zoomed, { x: 100, y: 60 }, 1, VIEWPORT, CONTENT);
    expect(backTo1x).toEqual(IDENTITY_STATE);
  });

  it('self-heals an off-center 1x state on the next zoom-out tick', () => {
    // Defensive: should this state ever exist, a further wheel-out must not
    // hit the same-scale early return and freeze it in place.
    const corrupt = { scale: 1, offset: { x: 40, y: -20 } };
    const next = zoomAt(corrupt, { x: 0, y: 0 }, 0.9, VIEWPORT, CONTENT);
    expect(next).toEqual(IDENTITY_STATE);
  });

  it('returns the same identity reference when already centered at 1x', () => {
    const prev = { ...IDENTITY_STATE };
    const next = zoomAt(prev, { x: 100, y: 50 }, 0.5, VIEWPORT, CONTENT);
    expect(next).toBe(prev);
  });

  it('clamps to MAX_SCALE when zooming far in', () => {
    const next = zoomAt(
      IDENTITY_STATE,
      { x: 0, y: 0 },
      9999,
      VIEWPORT,
      CONTENT
    );
    expect(next.scale).toBe(MAX_SCALE);
  });
});

// ---------------------------------------------------------------------------
// Hook-level integration tests
// ---------------------------------------------------------------------------
// jsdom's getBoundingClientRect() returns all-zero rects. This is fine:
// clampOffset with zero viewport/content sizes clamps offset to {0,0}, and
// zoomAt still changes scale because scale math is rect-independent.
// ---------------------------------------------------------------------------

describe('usePanZoom hook', () => {
  let viewportEl: HTMLDivElement;
  let contentEl: HTMLDivElement;
  let viewportRef: { current: HTMLDivElement };
  let contentRef: { current: HTMLDivElement };

  beforeEach(() => {
    viewportEl = document.createElement('div');
    contentEl = document.createElement('div');
    viewportRef = { current: viewportEl };
    contentRef = { current: contentEl };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches a non-passive wheel listener on mount and removes it on unmount', () => {
    const addSpy = vi.spyOn(viewportEl, 'addEventListener');
    const removeSpy = vi.spyOn(viewportEl, 'removeEventListener');

    const { unmount } = renderHook(() =>
      usePanZoom({ viewportRef, contentRef, enabled: true, resetKey: null })
    );

    // Listener should have been attached with { passive: false }
    expect(addSpy).toHaveBeenCalledWith('wheel', expect.any(Function), {
      passive: false,
    });

    const [, attachedHandler] = addSpy.mock.calls.find(
      ([evt]) => evt === 'wheel'
    )!;

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('wheel', attachedHandler);
  });

  it('does NOT attach a wheel listener when enabled is false', () => {
    const addSpy = vi.spyOn(viewportEl, 'addEventListener');

    renderHook(() =>
      usePanZoom({ viewportRef, contentRef, enabled: false, resetKey: null })
    );

    const wheelCalls = addSpy.mock.calls.filter(([evt]) => evt === 'wheel');
    expect(wheelCalls).toHaveLength(0);
  });

  it('allows page scrolling when the wheel points beyond the 1x boundary', () => {
    renderHook(() =>
      usePanZoom({ viewportRef, contentRef, enabled: true, resetKey: null })
    );
    const event = new WheelEvent('wheel', {
      deltaY: 100,
      cancelable: true,
      bubbles: true,
    });

    viewportEl.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('captures the wheel only when it can change the zoom', () => {
    const { result } = renderHook(() =>
      usePanZoom({ viewportRef, contentRef, enabled: true, resetKey: null })
    );
    const event = new WheelEvent('wheel', {
      deltaY: -100,
      cancelable: true,
      bubbles: true,
    });

    act(() => {
      viewportEl.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.scale).toBeGreaterThan(MIN_SCALE);
  });

  it('provides button-driven zoom for touch-only devices', () => {
    const { result } = renderHook(() =>
      usePanZoom({ viewportRef, contentRef, enabled: true, resetKey: null })
    );

    act(() => result.current.zoomIn());
    expect(result.current.scale).toBe(1.5);

    act(() => result.current.zoomOut());
    expect(result.current.scale).toBe(MIN_SCALE);
  });

  it('M-11 regression: mid-pan resetKey change resets isPanning and scale to 1', async () => {
    const { result, rerender } = renderHook(
      ({ enabled, resetKey }: { enabled: boolean; resetKey: string | null }) =>
        usePanZoom({ viewportRef, contentRef, enabled, resetKey }),
      { initialProps: { enabled: true, resetKey: 'img-1' } }
    );

    // Step 1: zoom in via a native wheel event so scale > MIN_SCALE.
    // jsdom rects are zeroed but zoomAt still changes scale (math is rect-independent).
    await act(async () => {
      viewportEl.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -300,
          cancelable: true,
          bubbles: true,
        })
      );
    });

    expect(result.current.scale).toBeGreaterThan(MIN_SCALE);

    // Step 2: simulate a pan start — onPointerDown guards scale > MIN_SCALE,
    // which is now satisfied.
    const fakeTarget = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: () => false,
      releasePointerCapture: vi.fn(),
    };
    act(() => {
      result.current.bind.onPointerDown({
        button: 0,
        pointerId: 42,
        clientX: 0,
        clientY: 0,
        currentTarget: fakeTarget,
      } as unknown as React.PointerEvent<HTMLElement>);
    });

    expect(result.current.isPanning).toBe(true);

    // Step 3: change resetKey while panning — the render-time reset (M-11 fix)
    // must clear isPanning and restore scale to 1.
    act(() => {
      rerender({ enabled: true, resetKey: 'img-2' });
    });

    expect(result.current.isPanning).toBe(false);
    expect(result.current.scale).toBe(1);
  });
});
