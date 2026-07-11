import { afterEach, describe, expect, it } from 'vitest';
import { getDisplayBounds } from '../useResponsiveCanvas';

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
