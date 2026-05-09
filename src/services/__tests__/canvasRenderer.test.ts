import { describe, it, expect } from 'vitest';
import { CanvasRenderer } from '../canvasRenderer';

interface FillCall {
  text: string;
  x: number;
  y: number;
  fillStyle: string;
}

function createMockCtx(charWidth = 10) {
  const calls: FillCall[] = [];
  const state = { fillStyle: '#ffffff', textAlign: 'left' as CanvasTextAlign };
  const ctx = {
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(value: string) {
      state.fillStyle = value;
    },
    get textAlign() {
      return state.textAlign;
    },
    set textAlign(value: CanvasTextAlign) {
      state.textAlign = value;
    },
    measureText(text: string) {
      return { width: text.length * charWidth };
    },
    fillText(text: string, x: number, y: number) {
      calls.push({ text, x, y, fillStyle: state.fillStyle });
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls, state };
}

describe('CanvasRenderer.fillTextWithTStarHighlight', () => {
  const fillTextWithTStarHighlight = (
    CanvasRenderer as unknown as {
      fillTextWithTStarHighlight: (
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number
      ) => void;
    }
  ).fillTextWithTStarHighlight.bind(CanvasRenderer);

  it('falls through to a single fillText when no T* is present', () => {
    const { ctx, calls } = createMockCtx();
    fillTextWithTStarHighlight(ctx, 'FE 35mm F1.4 GM', 0, 10);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      text: 'FE 35mm F1.4 GM',
      x: 0,
      y: 10,
      fillStyle: '#ffffff',
    });
  });

  it('splits a left-aligned string at T* and paints only T* in red', () => {
    const { ctx, calls } = createMockCtx();
    fillTextWithTStarHighlight(ctx, 'FE 55mm F1.8 ZA T*', 0, 10);
    expect(calls).toEqual([
      { text: 'FE 55mm F1.8 ZA ', x: 0, y: 10, fillStyle: '#ffffff' },
      { text: 'T*', x: 160, y: 10, fillStyle: '#CC0000' },
    ]);
  });

  it('matches the full-width T＊ form (Sony/Zeiss EXIF strings)', () => {
    const { ctx, calls } = createMockCtx();
    fillTextWithTStarHighlight(
      ctx,
      'Vario-Sonnar T＊ DT 16-80mm F3.5-4.5 ZA',
      0,
      10
    );
    expect(calls).toEqual([
      { text: 'Vario-Sonnar ', x: 0, y: 10, fillStyle: '#ffffff' },
      { text: 'T＊', x: 130, y: 10, fillStyle: '#CC0000' },
      {
        text: ' DT 16-80mm F3.5-4.5 ZA',
        x: 150,
        y: 10,
        fillStyle: '#ffffff',
      },
    ]);
  });

  it('handles T* in the middle of the string', () => {
    const { ctx, calls } = createMockCtx();
    fillTextWithTStarHighlight(ctx, 'Vario T* Lens', 0, 10);
    expect(calls).toEqual([
      { text: 'Vario ', x: 0, y: 10, fillStyle: '#ffffff' },
      { text: 'T*', x: 60, y: 10, fillStyle: '#CC0000' },
      { text: ' Lens', x: 80, y: 10, fillStyle: '#ffffff' },
    ]);
  });

  it('right-aligned text shifts segments left so the right edge stays at x', () => {
    const { ctx, calls, state } = createMockCtx();
    state.textAlign = 'right';
    fillTextWithTStarHighlight(ctx, 'A T*', 200, 10);
    // total width = 4 chars * 10 = 40, so segments start at 200 - 40 = 160
    expect(calls).toEqual([
      { text: 'A ', x: 160, y: 10, fillStyle: '#ffffff' },
      { text: 'T*', x: 180, y: 10, fillStyle: '#CC0000' },
    ]);
    // textAlign is restored after drawing
    expect(state.textAlign).toBe('right');
  });

  it('restores fillStyle and textAlign after drawing', () => {
    const { ctx, state } = createMockCtx();
    state.fillStyle = '#000000';
    state.textAlign = 'center';
    fillTextWithTStarHighlight(ctx, 'X T*', 100, 10);
    expect(state.fillStyle).toBe('#000000');
    expect(state.textAlign).toBe('center');
  });
});

describe('CanvasRenderer.calculateOptimalSize', () => {
  it('returns original dimensions when within limits', () => {
    const result = CanvasRenderer.calculateOptimalSize(1920, 1080);
    expect(result).toEqual({ width: 1920, height: 1080 });
  });

  it('scales down landscape images exceeding 4096', () => {
    const result = CanvasRenderer.calculateOptimalSize(8000, 4000);
    expect(result.width).toBe(4096);
    expect(result.height).toBe(Math.round(4096 / (8000 / 4000)));
    expect(result.width).toBeLessThanOrEqual(4096);
    expect(result.height).toBeLessThanOrEqual(4096);
  });

  it('scales down portrait images exceeding 4096', () => {
    const result = CanvasRenderer.calculateOptimalSize(3000, 6000);
    expect(result.height).toBe(4096);
    expect(result.width).toBe(Math.round(4096 * (3000 / 6000)));
    expect(result.width).toBeLessThanOrEqual(4096);
    expect(result.height).toBeLessThanOrEqual(4096);
  });

  it('handles square images', () => {
    const result = CanvasRenderer.calculateOptimalSize(5000, 5000);
    expect(result.width).toBeLessThanOrEqual(4096);
    expect(result.height).toBeLessThanOrEqual(4096);
  });

  it('handles very small images', () => {
    const result = CanvasRenderer.calculateOptimalSize(100, 100);
    expect(result).toEqual({ width: 100, height: 100 });
  });

  it('preserves aspect ratio', () => {
    const originalRatio = 3 / 2;
    const result = CanvasRenderer.calculateOptimalSize(6000, 4000);
    const resultRatio = result.width / result.height;
    expect(Math.abs(resultRatio - originalRatio)).toBeLessThan(0.01);
  });
});
