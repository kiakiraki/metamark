import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasRenderer } from '../canvasRenderer';
import { galleryPlacardTemplate } from '@/templates';
import type { NormalizedExifData } from '@/types/exif';
import type { Template } from '@/types/template';

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

describe('CanvasRenderer.fillTextWithBrandHighlights', () => {
  const fillTextWithBrandHighlights = (
    CanvasRenderer as unknown as {
      fillTextWithBrandHighlights: (
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number
      ) => void;
    }
  ).fillTextWithBrandHighlights.bind(CanvasRenderer);

  it('falls through to a single fillText when no brand mark is present', () => {
    const { ctx, calls } = createMockCtx();
    fillTextWithBrandHighlights(ctx, 'FE 35mm F1.4', 0, 10);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      text: 'FE 35mm F1.4',
      x: 0,
      y: 10,
      fillStyle: '#ffffff',
    });
  });

  it('splits a left-aligned string at T* and paints only T* in red', () => {
    const { ctx, calls } = createMockCtx();
    fillTextWithBrandHighlights(ctx, 'FE 55mm F1.8 ZA T*', 0, 10);
    expect(calls).toEqual([
      { text: 'FE 55mm F1.8 ZA ', x: 0, y: 10, fillStyle: '#ffffff' },
      { text: 'T*', x: 160, y: 10, fillStyle: '#CC0000' },
    ]);
  });

  it('matches the full-width T＊ form (Sony/Zeiss EXIF strings)', () => {
    const { ctx, calls } = createMockCtx();
    fillTextWithBrandHighlights(
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
    fillTextWithBrandHighlights(ctx, 'Vario T* Lens', 0, 10);
    expect(calls).toEqual([
      { text: 'Vario ', x: 0, y: 10, fillStyle: '#ffffff' },
      { text: 'T*', x: 60, y: 10, fillStyle: '#CC0000' },
      { text: ' Lens', x: 80, y: 10, fillStyle: '#ffffff' },
    ]);
  });

  it('paints Sony G Master GM in vermilion', () => {
    const { ctx, calls } = createMockCtx();
    fillTextWithBrandHighlights(ctx, 'FE 24-70mm F2.8 GM', 0, 10);
    expect(calls).toEqual([
      { text: 'FE 24-70mm F2.8 ', x: 0, y: 10, fillStyle: '#ffffff' },
      { text: 'GM', x: 160, y: 10, fillStyle: '#CB4801' },
    ]);
  });

  it('handles GM in the middle (e.g. GM II) and leaves GM word-bounded', () => {
    const { ctx, calls } = createMockCtx();
    fillTextWithBrandHighlights(ctx, 'FE 70-200mm F2.8 GM II', 0, 10);
    expect(calls).toEqual([
      { text: 'FE 70-200mm F2.8 ', x: 0, y: 10, fillStyle: '#ffffff' },
      { text: 'GM', x: 170, y: 10, fillStyle: '#CB4801' },
      { text: ' II', x: 190, y: 10, fillStyle: '#ffffff' },
    ]);
  });

  it('does not match GM when not at a word boundary', () => {
    const { ctx, calls } = createMockCtx();
    // hypothetical "GMx" wouldn't be a word-bounded GM token
    fillTextWithBrandHighlights(ctx, 'foo GMx bar', 0, 10);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.fillStyle).toBe('#ffffff');
  });

  it('right-aligned text shifts segments left so the right edge stays at x', () => {
    const { ctx, calls, state } = createMockCtx();
    state.textAlign = 'right';
    fillTextWithBrandHighlights(ctx, 'A T*', 200, 10);
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
    fillTextWithBrandHighlights(ctx, 'X T*', 100, 10);
    expect(state.fillStyle).toBe('#000000');
    expect(state.textAlign).toBe('center');
  });
});

// A string containing an unpaired ("lone") surrogate is not well-formed
// UTF-16 and renders as tofu; well-formed strings never split a surrogate
// pair or a grapheme cluster.
function hasLoneSurrogate(text: string): boolean {
  return !text.isWellFormed();
}

describe('CanvasRenderer.fillTextEllipsis', () => {
  const fillTextEllipsis = (
    CanvasRenderer as unknown as {
      fillTextEllipsis: (
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number
      ) => void;
    }
  ).fillTextEllipsis.bind(CanvasRenderer);

  // A ZWJ family emoji: 4 codepoints (each a surrogate pair, 2 UTF-16 code
  // units) joined by 3 ZWJ (1 code unit each) = 11 code units, but a single
  // grapheme. createMockCtx measures by code-unit length, so slicing this
  // string mid-sequence (as the old implementation did) produces a lone
  // surrogate that renders as tofu next to the ellipsis.
  const family = '👨‍👩‍👧‍👦';

  it('never leaves a lone surrogate when truncating deep inside a multi-unit grapheme', () => {
    const { ctx, calls } = createMockCtx();
    // Full text is far wider than maxWidth, forcing truncation to a point
    // that falls inside the family emoji's code-unit run.
    fillTextEllipsis(ctx, `${family}ABC`, 0, 10, 55);
    expect(calls).toHaveLength(1);
    expect(hasLoneSurrogate(calls[0]!.text)).toBe(false);
  });

  it('keeps a whole grapheme rather than splitting it when it fits', () => {
    const { ctx, calls } = createMockCtx();
    // maxWidth fits the family emoji + ellipsis but not the family emoji
    // plus any further character.
    fillTextEllipsis(ctx, `${family}ABC`, 0, 10, 125);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toBe(`${family}…`);
    expect(hasLoneSurrogate(calls[0]!.text)).toBe(false);
  });

  it('renders text unchanged when it already fits', () => {
    const { ctx, calls } = createMockCtx();
    fillTextEllipsis(ctx, 'short', 0, 10, 1000);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toBe('short');
  });
});

describe('CanvasRenderer.wrapText', () => {
  const wrapText = (
    CanvasRenderer as unknown as {
      wrapText: (
        ctx: CanvasRenderingContext2D,
        text: string,
        maxWidth: number
      ) => string[];
    }
  ).wrapText.bind(CanvasRenderer);

  it('wraps Japanese text without requiring spaces', () => {
    const { ctx } = createMockCtx();
    expect(wrapText(ctx, '東京都台東区浅草', 30)).toEqual([
      '東京都',
      '台東区',
      '浅草',
    ]);
  });

  it('wraps long ASCII tokens when no word boundary is available', () => {
    const { ctx } = createMockCtx();
    expect(wrapText(ctx, 'ABCDEFG', 30)).toEqual(['ABC', 'DEF', 'G']);
  });

  it('does not split a multi-code-point emoji grapheme', () => {
    const { ctx } = createMockCtx();
    const family = '👨‍👩‍👧‍👦';
    expect(wrapText(ctx, `${family}東京`, 30)).toEqual([family, '東京']);
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

describe('CanvasRenderer frosted panel sampling', () => {
  it('uses the render DPR instead of the device DPR for export sampling', () => {
    const originalDevicePixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true,
    });

    const offscreenDrawImage = vi.fn();
    const offscreenScale = vi.fn();
    const offscreenContext = {
      scale: offscreenScale,
      drawImage: offscreenDrawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      filter: 'none',
    } as unknown as CanvasRenderingContext2D;
    const offscreenCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => offscreenContext),
    } as unknown as HTMLCanvasElement;
    const sourceCanvas = { width: 400, height: 300 } as HTMLCanvasElement;
    const context = {
      canvas: sourceCanvas,
      save: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      stroke: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(offscreenCanvas);

    const drawFrostedPanel = (
      CanvasRenderer as unknown as {
        drawFrostedPanel: (
          ctx: CanvasRenderingContext2D,
          x: number,
          y: number,
          width: number,
          height: number,
          radius: number,
          scaleFactor: number,
          backgroundColor: string,
          devicePixelRatio: number
        ) => void;
      }
    ).drawFrostedPanel.bind(CanvasRenderer);

    try {
      // Exports explicitly render at DPR 1, even on a DPR 2 display.
      drawFrostedPanel(context, 10, 20, 30, 40, 5, 1, '#fff', 1);

      expect(offscreenCanvas.width).toBe(30);
      expect(offscreenCanvas.height).toBe(40);
      expect(offscreenScale).toHaveBeenCalledWith(1, 1);
      expect(offscreenDrawImage).toHaveBeenCalledWith(
        sourceCanvas,
        10,
        20,
        30,
        40,
        0,
        0,
        30,
        40
      );
    } finally {
      createElementSpy.mockRestore();
      Object.defineProperty(window, 'devicePixelRatio', {
        value: originalDevicePixelRatio,
        configurable: true,
      });
    }
  });
});

describe('CanvasRenderer gallery-placard stacked layout (WYSIWYG)', () => {
  const buildGalleryPlacardLayout = (
    CanvasRenderer as unknown as {
      buildGalleryPlacardLayout: (
        template: Template,
        exifData: NormalizedExifData,
        scaleFactor: number,
        availableWidth: number,
        ctx: CanvasRenderingContext2D
      ) => { stacked: boolean };
    }
  ).buildGalleryPlacardLayout.bind(CanvasRenderer);

  const exifData: NormalizedExifData = {
    camera: 'Sony α1 II',
    cameraMake: 'Sony',
    cameraModel: 'α1 II',
    lens: 'FE 35mm F1.4 GM',
    focalLength: '35mm',
    iso: 'ISO 200',
    aperture: 'f/1.4',
    shutterSpeed: '1/500s',
    dateTime: '2026/05/04 14:30:00',
    location: 'Lisbon, Portugal',
  };

  // Two renders of the *same* portrait photo (2:3) at different
  // resolutions: a preview-sized canvas and a full export-sized canvas.
  // baseWidth/baseHeight scale together, so scaleFactor (min(w,h)/1000)
  // scales proportionally too.
  const previewBaseWidth = 600;
  const previewBaseHeight = 900;
  const previewScaleFactor =
    Math.min(previewBaseWidth, previewBaseHeight) / 1000;

  const exportBaseWidth = 3600;
  const exportBaseHeight = 5400;
  const exportScaleFactor = Math.min(exportBaseWidth, exportBaseHeight) / 1000;

  it('resolves the same stacked/two-column mode at preview and export resolution', () => {
    const { ctx: previewCtx } = createMockCtx();
    const { ctx: exportCtx } = createMockCtx();

    const previewLayout = buildGalleryPlacardLayout(
      galleryPlacardTemplate,
      exifData,
      previewScaleFactor,
      previewBaseWidth,
      previewCtx
    );
    const exportLayout = buildGalleryPlacardLayout(
      galleryPlacardTemplate,
      exifData,
      exportScaleFactor,
      exportBaseWidth,
      exportCtx
    );

    // With an absolute-pixel threshold, the 600px-wide preview would fall
    // under the old 720px cutoff (forcing a stacked layout) while the
    // 3600px-wide export would not — a WYSIWYG mismatch. Scaled relative to
    // scaleFactor, both must agree.
    expect(previewLayout.stacked).toBe(exportLayout.stacked);
    expect(previewLayout.stacked).toBe(false);
  });
});

describe('CanvasRenderer.formatApertureDisplay', () => {
  const formatApertureDisplay = (
    CanvasRenderer as unknown as {
      formatApertureDisplay: (aperture: string) => string;
    }
  ).formatApertureDisplay.bind(CanvasRenderer);

  it('converts the f/ prefix to the typographic ƒ/ form', () => {
    expect(formatApertureDisplay('f/1.4')).toBe('ƒ/1.4');
  });

  it('is case-insensitive on the f/ prefix', () => {
    expect(formatApertureDisplay('F/2.8')).toBe('ƒ/2.8');
  });

  it('leaves strings without an f/ prefix unchanged', () => {
    expect(formatApertureDisplay('1.4')).toBe('1.4');
  });
});

describe('CanvasRenderer.buildTechnicalRows', () => {
  const buildTechnicalRows = (
    CanvasRenderer as unknown as {
      buildTechnicalRows: (exifData: NormalizedExifData) => Array<{
        kind: string;
        label: string;
        value: string;
      }>;
    }
  ).buildTechnicalRows.bind(CanvasRenderer);

  it('builds one row per populated EXIF field, in a fixed order, with the aperture normalized to ƒ/', () => {
    const exifData: NormalizedExifData = {
      camera: 'Sony α1 II',
      cameraMake: 'Sony',
      cameraModel: 'α1 II',
      lens: 'FE 35mm F1.4 GM',
      focalLength: '35mm',
      iso: 'ISO 200',
      aperture: 'f/1.4',
      shutterSpeed: '1/500s',
      dateTime: '2026/05/04 14:30:00',
      location: 'Lisbon, Portugal',
    };

    expect(buildTechnicalRows(exifData)).toEqual([
      { kind: 'lens', label: 'Lens', value: 'FE 35mm F1.4 GM' },
      { kind: 'focal', label: 'Focal', value: '35mm' },
      { kind: 'aperture', label: 'Aperture', value: 'ƒ/1.4' },
      { kind: 'shutter', label: 'Shutter', value: '1/500s' },
      { kind: 'iso', label: 'ISO', value: 'ISO 200' },
      { kind: 'date', label: 'Date', value: '2026/05/04 14:30:00' },
      { kind: 'location', label: 'Location', value: 'Lisbon, Portugal' },
    ]);
  });

  it('omits rows for fields that are null', () => {
    const exifData: NormalizedExifData = {
      camera: null,
      cameraMake: null,
      cameraModel: null,
      lens: null,
      focalLength: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      dateTime: null,
      location: null,
    };

    expect(buildTechnicalRows(exifData)).toEqual([]);
  });
});

describe('CanvasRenderer gallery-placard layout cache (bounded Map)', () => {
  const buildGalleryPlacardLayoutWithOptions = (
    CanvasRenderer as unknown as {
      buildGalleryPlacardLayout: (
        template: Template,
        exifData: NormalizedExifData,
        scaleFactor: number,
        availableWidth: number,
        ctx: CanvasRenderingContext2D,
        options?: {
          forceStacked?: boolean;
          sections?: 'all' | 'left-only' | 'right-only';
        }
      ) => { stacked: boolean };
    }
  ).buildGalleryPlacardLayout.bind(CanvasRenderer);

  const exifData: NormalizedExifData = {
    camera: 'Sony α1 II',
    cameraMake: 'Sony',
    cameraModel: 'α1 II',
    lens: 'FE 35mm F1.4 GM',
    focalLength: '35mm',
    iso: 'ISO 200',
    aperture: 'f/1.4',
    shutterSpeed: '1/500s',
    dateTime: '2026/05/04 14:30:00',
    location: 'Lisbon, Portugal',
  };

  it('keeps entries for interleaved distinct cache keys instead of thrashing a single slot', () => {
    // Mirrors gallery-placard split mode, which calls the layout builder
    // once per side panel (sections: 'left-only' then 'right-only') within
    // the same render, and a single-entry cache would miss on every call.
    const { ctx } = createMockCtx();
    const scaleFactor = 1;
    const availableWidth = 1000;

    const leftFirst = buildGalleryPlacardLayoutWithOptions(
      galleryPlacardTemplate,
      exifData,
      scaleFactor,
      availableWidth,
      ctx,
      { forceStacked: true, sections: 'left-only' }
    );
    const rightFirst = buildGalleryPlacardLayoutWithOptions(
      galleryPlacardTemplate,
      exifData,
      scaleFactor,
      availableWidth,
      ctx,
      { forceStacked: true, sections: 'right-only' }
    );
    const leftSecond = buildGalleryPlacardLayoutWithOptions(
      galleryPlacardTemplate,
      exifData,
      scaleFactor,
      availableWidth,
      ctx,
      { forceStacked: true, sections: 'left-only' }
    );

    // Object identity indicates a cache hit (no recomputation) rather than
    // just structural equality, so this fails if the intervening
    // 'right-only' call evicted the 'left-only' entry.
    expect(leftSecond).toBe(leftFirst);
    expect(rightFirst).not.toBe(leftFirst);
  });
});

// loadFontCached is exported for testing. jsdom does not ship document.fonts,
// so each test defines it as a stub. vi.resetModules() + dynamic import gives
// each test a fresh module-level fontLoadCache so cache tests are independent.
describe('loadFontCached', () => {
  let mockLoad: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLoad = vi.fn().mockResolvedValue([]);
    Object.defineProperty(document, 'fonts', {
      value: { load: mockLoad },
      configurable: true,
      writable: true,
    });
    vi.resetModules();
  });

  it('passes both spec and text arguments to document.fonts.load', async () => {
    const { loadFontCached } = await import('../canvasRenderer');
    await loadFontCached('16px DotGothic16', 'カメラ');
    expect(mockLoad).toHaveBeenCalledOnce();
    expect(mockLoad).toHaveBeenCalledWith('16px DotGothic16', 'カメラ');
  });

  it('deduplicates when the same unique char set is requested (cache hit on reordered text)', async () => {
    const { loadFontCached } = await import('../canvasRenderer');
    await loadFontCached('16px DotGothic16', 'ab');
    await loadFontCached('16px DotGothic16', 'ba');
    // 'ab' and 'ba' normalise to the same sorted-unique key → only one load call
    expect(mockLoad).toHaveBeenCalledOnce();
  });

  it('calls fonts.load again when text contains different characters (cache miss)', async () => {
    const { loadFontCached } = await import('../canvasRenderer');
    await loadFontCached('16px DotGothic16', 'abc');
    await loadFontCached('16px DotGothic16', 'xyz');
    expect(mockLoad).toHaveBeenCalledTimes(2);
  });
});
