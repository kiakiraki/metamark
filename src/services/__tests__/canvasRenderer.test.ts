import { describe, it, expect } from 'vitest';
import { CanvasRenderer } from '../canvasRenderer';

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
