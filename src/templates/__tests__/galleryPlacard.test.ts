import { describe, it, expect, vi } from 'vitest';

// next/font/google and next/font/local are next.js build-time loaders that
// throw outside the next runtime. Stub them so importing the template
// registry (which transitively pulls in fonts.ts) works under vitest.
vi.mock('next/font/google', () => {
  const stub = () => ({ style: { fontFamily: 'stub' } });
  return { Geist: stub, Geist_Mono: stub, Besley: stub };
});
vi.mock('next/font/local', () => ({
  default: () => ({ style: { fontFamily: 'stub-local' } }),
}));

import { templates, galleryPlacardTemplate } from '@/templates';
import { CanvasRenderer } from '@/services/canvasRenderer';
import type { NormalizedExifData } from '@/types/exif';

const fullExif: NormalizedExifData = {
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

const emptyExif: NormalizedExifData = {
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

describe('galleryPlacardTemplate', () => {
  it('is registered under the gallery-placard preset', () => {
    expect(templates['gallery-placard']).toBe(galleryPlacardTemplate);
    expect(galleryPlacardTemplate.id).toBe('gallery-placard');
    expect(galleryPlacardTemplate.name).toBe('Gallery Placard');
  });

  it('uses bottom-padding layout and opts into custom drawing', () => {
    expect(galleryPlacardTemplate.layout).toBe('bottom-padding');
    expect(galleryPlacardTemplate.customDraw).toBe('gallery-placard');
  });

  it('paints a warm ivory background', () => {
    expect(galleryPlacardTemplate.style.backgroundColor.toLowerCase()).toMatch(
      /^#f[46]/
    );
  });

  it('estimates a positive bottom-padding height with full EXIF', () => {
    const h = CanvasRenderer.estimateBottomPaddingHeight(
      galleryPlacardTemplate,
      fullExif,
      1000,
      1000
    );
    expect(h).toBeGreaterThan(0);
  });

  it('estimates a positive bottom-padding height with empty EXIF', () => {
    const h = CanvasRenderer.estimateBottomPaddingHeight(
      galleryPlacardTemplate,
      emptyExif,
      1000,
      1000
    );
    expect(h).toBeGreaterThan(0);
  });

  it('handles narrow portrait canvases without throwing', () => {
    expect(() =>
      CanvasRenderer.estimateBottomPaddingHeight(
        galleryPlacardTemplate,
        fullExif,
        600,
        900
      )
    ).not.toThrow();
  });
});
