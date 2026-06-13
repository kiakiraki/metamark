import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useImageExport } from '../useImageExport';
import { useImageStore } from '@/stores/imageStore';
import { useExifStore } from '@/stores/exifStore';
import { useToastStore } from '@/hooks/useToast';
import { CanvasRenderer } from '@/services/canvasRenderer';
import { ImageProcessor } from '@/services/imageProcessor';
import type { ProcessedImage } from '@/types/image';
import type { NormalizedExifData } from '@/types/exif';

// jsdom does not implement URL.createObjectURL / revokeObjectURL — stub them
// at module scope so they're available for the whole test file.
const createObjectURLMock = vi.fn().mockReturnValue('blob:fake');
const revokeObjectURLMock = vi.fn();

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  configurable: true,
  value: createObjectURLMock,
});
Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  configurable: true,
  value: revokeObjectURLMock,
});

const fakeImage: ProcessedImage = {
  id: 'img-1',
  name: 'test.jpg',
  url: 'blob:test-url',
  size: 1024,
  type: 'image/jpeg',
  width: 1920,
  height: 1080,
  isProcessing: false,
};

const fakeExifData: NormalizedExifData = {
  camera: 'Sony α7 IV',
  cameraMake: 'Sony',
  cameraModel: 'α7 IV',
  lens: null,
  focalLength: null,
  iso: null,
  aperture: null,
  shutterSpeed: null,
  dateTime: null,
  location: null,
};

describe('useImageExport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    // Bypass setImage side-effects (clearing exifStore) by writing state directly.
    useImageStore.setState({ currentImage: null });
    useExifStore.setState({
      exifData: {},
      normalizedData: {},
      lensOverrides: {},
      locationOverrides: {},
    });
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('canExport is false when no image is selected', () => {
    const { result } = renderHook(() => useImageExport());
    expect(result.current.canExport).toBe(false);
  });

  it('canExport is true when image + template + normalized exif are present', () => {
    useImageStore.setState({ currentImage: fakeImage });
    useExifStore.setState({ normalizedData: { [fakeImage.id]: fakeExifData } });

    const { result } = renderHook(() => useImageExport());
    // templateStore defaults to captionTemplate, so all three conditions are met.
    expect(result.current.canExport).toBe(true);
  });

  it('exportImage success: returns true, renderToBlob called with devicePixelRatio 1, anchor clicked', async () => {
    useImageStore.setState({ currentImage: fakeImage });
    useExifStore.setState({ normalizedData: { [fakeImage.id]: fakeExifData } });

    const renderToBlobSpy = vi
      .spyOn(CanvasRenderer, 'renderToBlob')
      .mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    vi.spyOn(CanvasRenderer, 'calculateOptimalSize').mockReturnValue({
      width: 100,
      height: 50,
    });
    vi.spyOn(ImageProcessor, 'createImageElement').mockResolvedValue(
      new Image()
    );
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useImageExport());

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.exportImage();
    });

    expect(returnValue).toBe(true);
    expect(renderToBlobSpy).toHaveBeenCalledOnce();
    expect(renderToBlobSpy).toHaveBeenCalledWith(
      expect.objectContaining({ devicePixelRatio: 1 })
    );
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('exportImage failure: renderToBlob rejects → returns false, error toast added, isExporting is false', async () => {
    useImageStore.setState({ currentImage: fakeImage });
    useExifStore.setState({ normalizedData: { [fakeImage.id]: fakeExifData } });

    vi.spyOn(CanvasRenderer, 'renderToBlob').mockRejectedValue(
      new Error('render failed')
    );
    vi.spyOn(CanvasRenderer, 'calculateOptimalSize').mockReturnValue({
      width: 100,
      height: 50,
    });
    vi.spyOn(ImageProcessor, 'createImageElement').mockResolvedValue(
      new Image()
    );

    const { result } = renderHook(() => useImageExport());

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.exportImage();
    });

    expect(returnValue).toBe(false);
    expect(result.current.isExporting).toBe(false);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toMatch(/export failed/i);
  });

  it('blob URL revoke is deferred: not called immediately, called after 10 seconds', async () => {
    useImageStore.setState({ currentImage: fakeImage });
    useExifStore.setState({ normalizedData: { [fakeImage.id]: fakeExifData } });

    vi.spyOn(CanvasRenderer, 'renderToBlob').mockResolvedValue(
      new Blob(['x'], { type: 'image/png' })
    );
    vi.spyOn(CanvasRenderer, 'calculateOptimalSize').mockReturnValue({
      width: 100,
      height: 50,
    });
    vi.spyOn(ImageProcessor, 'createImageElement').mockResolvedValue(
      new Image()
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { result } = renderHook(() => useImageExport());

    await act(async () => {
      await result.current.exportImage();
    });

    // The 10 s setTimeout is still pending — revoke must not have fired yet.
    expect(revokeObjectURLMock).not.toHaveBeenCalled();

    // Advance the clock past the threshold to trigger the deferred revoke.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(revokeObjectURLMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:fake');
  });
});
