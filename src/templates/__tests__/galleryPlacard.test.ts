import { describe, it, expect } from 'vitest';
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

  it('returns no side padding for the bottom-left default position', () => {
    const pad = CanvasRenderer.estimateGalleryPlacardSidePadding(
      galleryPlacardTemplate,
      1200,
      'bottom-left'
    );
    expect(pad).toEqual({ leftPad: 0, rightPad: 0 });
  });

  it('reports left-side padding only when overlay position is top-left', () => {
    const pad = CanvasRenderer.estimateGalleryPlacardSidePadding(
      galleryPlacardTemplate,
      1200,
      'top-left'
    );
    expect(pad.leftPad).toBeGreaterThan(0);
    expect(pad.rightPad).toBe(0);
  });

  it('reports right-side padding only when overlay position is top-right', () => {
    const pad = CanvasRenderer.estimateGalleryPlacardSidePadding(
      galleryPlacardTemplate,
      1200,
      'top-right'
    );
    expect(pad.leftPad).toBe(0);
    expect(pad.rightPad).toBeGreaterThan(0);
  });

  it('reports padding on both sides for the split layout (bottom-right)', () => {
    const pad = CanvasRenderer.estimateGalleryPlacardSidePadding(
      galleryPlacardTemplate,
      1200,
      'bottom-right'
    );
    expect(pad.leftPad).toBeGreaterThan(0);
    expect(pad.rightPad).toBeGreaterThan(0);
  });

  it('skips bottom padding when a side mode is active', () => {
    const h = CanvasRenderer.estimateBottomPaddingHeight(
      galleryPlacardTemplate,
      fullExif,
      1200,
      1600,
      'top-left'
    );
    expect(h).toBe(0);
  });
});
