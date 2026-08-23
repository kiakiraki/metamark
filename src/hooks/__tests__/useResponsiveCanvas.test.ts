import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getDisplayBounds, useResponsiveCanvas } from '../useResponsiveCanvas';
import type { ProcessedImage } from '@/types/image';

const originalInnerWidth = window.innerWidth;

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    value: originalInnerWidth,
    configurable: true,
  });
});

describe('getDisplayBounds', () => {
  it('caps the desktop canvas to the actual workspace width', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      configurable: true,
    });

    expect(getDisplayBounds(612)).toEqual({
      maxDisplayWidth: 612,
      maxDisplayHeight: 600,
    });
  });

  it('keeps the normal desktop cap when the workspace is wider', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1440,
      configurable: true,
    });

    expect(getDisplayBounds(900).maxDisplayWidth).toBe(700);
  });
});

describe('useResponsiveCanvas viewport lookup', () => {
  const image: ProcessedImage = {
    id: 'img-1',
    file: new File([], 'a.jpg'),
    url: 'blob:a',
    name: 'a.jpg',
    size: 100,
    width: 800,
    height: 600,
  } as unknown as ProcessedImage;

  it('finds the viewport via closest([data-canvas-viewport]) regardless of DOM nesting depth', () => {
    // Deliberately nest the canvas deeper than the historical
    // parentElement.parentElement assumption to prove the lookup no longer
    // depends on a fixed DOM depth.
    const viewport = document.createElement('div');
    viewport.setAttribute('data-canvas-viewport', '');
    Object.defineProperty(viewport, 'clientWidth', {
      value: 640,
      configurable: true,
    });

    const middle = document.createElement('div');
    const inner = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    viewport.appendChild(middle);
    middle.appendChild(inner);
    inner.appendChild(canvas);
    document.body.appendChild(viewport);

    const canvasRef = { current: canvas };
    const { result } = renderHook(() => useResponsiveCanvas(canvasRef, image));

    act(() => {
      result.current.updateCanvasDisplaySize();
    });

    expect(result.current.containerHeight).not.toBeNull();
    expect(canvas.style.width).not.toBe('');

    document.body.removeChild(viewport);
  });

  it('falls back gracefully when no data-canvas-viewport ancestor exists', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    const canvasRef = { current: canvas };
    const { result } = renderHook(() => useResponsiveCanvas(canvasRef, image));

    act(() => {
      result.current.updateCanvasDisplaySize();
    });

    expect(result.current.containerHeight).not.toBeNull();

    document.body.removeChild(canvas);
  });
});
