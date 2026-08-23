import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasRenderer } from '../useCanvasRenderer';
import { CanvasRenderer } from '@/services/canvasRenderer';
import { ImageProcessor } from '@/services/imageProcessor';
import { useExifStore } from '@/stores/exifStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTemplateStore } from '@/stores/templateStore';
import { templates } from '@/templates';
import type { NormalizedExifData } from '@/types/exif';
import type { ProcessedImage } from '@/types/image';

const exifData: NormalizedExifData = {
  camera: 'Sony α7 IV',
  cameraMake: 'Sony',
  cameraModel: 'α7 IV',
  lens: null,
  focalLength: null,
  aperture: null,
  shutterSpeed: null,
  iso: null,
  dateTime: null,
  location: null,
};

function makeImage(id: string): ProcessedImage {
  return {
    id,
    name: `${id}.jpg`,
    url: `blob:${id}`,
    size: 1024,
    type: 'image/jpeg',
    width: 1920,
    height: 1080,
    isProcessing: false,
  };
}

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function Preview({ image }: { image: ProcessedImage }) {
  const { canvasRef } = useCanvasRenderer(image);
  return <canvas ref={canvasRef} data-testid="preview" />;
}

describe('useCanvasRenderer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useExifStore.setState({
      exifData: {},
      normalizedData: {
        first: exifData,
        second: exifData,
      },
      lensOverrides: {},
      locationOverrides: {},
    });
    useSettingsStore.setState({
      canvasSettings: {
        width: 1920,
        height: 1080,
        quality: 0.95,
        format: 'png',
        scale: 1,
        overlayPosition: 'top-left',
      },
      galleryPlacardPosition: 'top-left',
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    useTemplateStore.setState({ selectedTemplate: templates.caption ?? null });
  });

  it('commits only the newest render when an older render finishes last', async () => {
    const firstRender = deferred();
    const secondRender = deferred();
    const renderSpy = vi
      .spyOn(CanvasRenderer, 'render')
      .mockImplementationOnce(() => firstRender.promise)
      .mockImplementationOnce(() => secondRender.promise);
    vi.spyOn(ImageProcessor, 'createImageElement').mockResolvedValue(
      new Image()
    );
    vi.spyOn(CanvasRenderer, 'estimateBottomPaddingHeight').mockReturnValue(0);
    vi.spyOn(
      CanvasRenderer,
      'estimateGalleryPlacardSidePadding'
    ).mockReturnValue({ leftPad: 0, rightPad: 0 });

    const visibleDrawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: visibleDrawImage,
        }) as unknown as CanvasRenderingContext2D
    );

    const firstImage = makeImage('first');
    const secondImage = makeImage('second');
    const view = render(<Preview image={firstImage} />);

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect(renderSpy).toHaveBeenCalledTimes(1);

    view.rerender(<Preview image={secondImage} />);
    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect(renderSpy).toHaveBeenCalledTimes(2);

    const secondOffscreenCanvas = renderSpy.mock.calls[1]![0].canvas;
    await act(async () => {
      secondRender.resolve();
      await secondRender.promise;
    });
    expect(visibleDrawImage).toHaveBeenCalledOnce();
    expect(visibleDrawImage).toHaveBeenLastCalledWith(
      secondOffscreenCanvas,
      0,
      0
    );

    await act(async () => {
      firstRender.resolve();
      await firstRender.promise;
    });
    expect(visibleDrawImage).toHaveBeenCalledOnce();
  });

  it('does not re-render when an export-only setting like quality changes', async () => {
    const renderSpy = vi
      .spyOn(CanvasRenderer, 'render')
      .mockResolvedValue(undefined);
    vi.spyOn(ImageProcessor, 'createImageElement').mockResolvedValue(
      new Image()
    );
    vi.spyOn(CanvasRenderer, 'estimateBottomPaddingHeight').mockReturnValue(0);
    vi.spyOn(
      CanvasRenderer,
      'estimateGalleryPlacardSidePadding'
    ).mockReturnValue({ leftPad: 0, rightPad: 0 });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
        }) as unknown as CanvasRenderingContext2D
    );

    const image = makeImage('first');
    render(<Preview image={image} />);

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect(renderSpy).toHaveBeenCalledTimes(1);

    act(() => {
      useSettingsStore.getState().updateCanvasSettings({ quality: 0.5 });
    });
    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('re-renders when overlayPosition changes', async () => {
    const renderSpy = vi
      .spyOn(CanvasRenderer, 'render')
      .mockResolvedValue(undefined);
    vi.spyOn(ImageProcessor, 'createImageElement').mockResolvedValue(
      new Image()
    );
    vi.spyOn(CanvasRenderer, 'estimateBottomPaddingHeight').mockReturnValue(0);
    vi.spyOn(
      CanvasRenderer,
      'estimateGalleryPlacardSidePadding'
    ).mockReturnValue({ leftPad: 0, rightPad: 0 });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
        }) as unknown as CanvasRenderingContext2D
    );

    const image = makeImage('first');
    render(<Preview image={image} />);

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect(renderSpy).toHaveBeenCalledTimes(1);

    act(() => {
      useSettingsStore
        .getState()
        .updateCanvasSettings({ overlayPosition: 'bottom-right' });
    });
    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('uses galleryPlacardPosition for the gallery-placard template and overlayPosition for other templates', async () => {
    const renderSpy = vi
      .spyOn(CanvasRenderer, 'render')
      .mockResolvedValue(undefined);
    vi.spyOn(ImageProcessor, 'createImageElement').mockResolvedValue(
      new Image()
    );
    vi.spyOn(CanvasRenderer, 'estimateBottomPaddingHeight').mockReturnValue(0);
    vi.spyOn(
      CanvasRenderer,
      'estimateGalleryPlacardSidePadding'
    ).mockReturnValue({ leftPad: 0, rightPad: 0 });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
        }) as unknown as CanvasRenderingContext2D
    );

    useSettingsStore.setState({
      galleryPlacardPosition: 'bottom-right',
    });

    // Glass (caption) template: renders with canvasSettings.overlayPosition.
    const image = makeImage('first');
    render(<Preview image={image} />);

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy.mock.calls[0]![0].settings.overlayPosition).toBe(
      'top-left'
    );

    // Switch to gallery-placard: renders with galleryPlacardPosition instead.
    act(() => {
      useTemplateStore.setState({
        selectedTemplate: templates['gallery-placard'] ?? null,
      });
    });
    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(renderSpy.mock.calls[1]![0].settings.overlayPosition).toBe(
      'bottom-right'
    );
  });

  it('does not re-render when galleryPlacardPosition changes while a non-gallery template is selected', async () => {
    const renderSpy = vi
      .spyOn(CanvasRenderer, 'render')
      .mockResolvedValue(undefined);
    vi.spyOn(ImageProcessor, 'createImageElement').mockResolvedValue(
      new Image()
    );
    vi.spyOn(CanvasRenderer, 'estimateBottomPaddingHeight').mockReturnValue(0);
    vi.spyOn(
      CanvasRenderer,
      'estimateGalleryPlacardSidePadding'
    ).mockReturnValue({ leftPad: 0, rightPad: 0 });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
        }) as unknown as CanvasRenderingContext2D
    );

    // Glass (caption) template is selected by default (see beforeEach).
    const image = makeImage('first');
    render(<Preview image={image} />);

    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
    expect(renderSpy).toHaveBeenCalledTimes(1);

    act(() => {
      useSettingsStore.getState().setGalleryPlacardPosition('bottom-right');
    });
    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
