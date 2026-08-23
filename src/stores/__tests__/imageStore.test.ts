import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useImageStore } from '../imageStore';
import { useExifStore } from '../exifStore';
import type { ImageFile } from '@/types/image';

// jsdom does not implement URL.revokeObjectURL — stub it so we can spy on it.
const revokeObjectURLMock = vi.fn();
Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  writable: true,
  value: revokeObjectURLMock,
});

function makeImageFile(id: string): ImageFile {
  return {
    id,
    url: `blob:${id}`,
    name: `${id}.jpg`,
    size: 1024,
    type: 'image/jpeg',
    width: 1920,
    height: 1080,
  };
}

describe('imageStore', () => {
  beforeEach(() => {
    revokeObjectURLMock.mockClear();
    useImageStore.setState({ currentImage: null });
    useExifStore.setState({
      exifData: {},
      normalizedData: {},
      lensOverrides: {},
      locationOverrides: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets the image with isProcessing initialized to false', () => {
    useImageStore.getState().setImage(makeImageFile('img-1'));

    const current = useImageStore.getState().currentImage;
    expect(current?.id).toBe('img-1');
    expect(current?.isProcessing).toBe(false);
  });

  it('revokes the previous blob URL when a new image replaces it', () => {
    useImageStore.getState().setImage(makeImageFile('img-1'));
    revokeObjectURLMock.mockClear();

    useImageStore.getState().setImage(makeImageFile('img-2'));

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:img-1');
    expect(useImageStore.getState().currentImage?.id).toBe('img-2');
  });

  it('clears the previous image EXIF data when a new image replaces it', () => {
    useImageStore.getState().setImage(makeImageFile('img-1'));
    useExifStore.getState().setLensOverride('img-1', 'Helios 44-2');

    useImageStore.getState().setImage(makeImageFile('img-2'));

    expect(useExifStore.getState().lensOverrides['img-1']).toBeUndefined();
  });

  it('does not attempt to revoke anything on the very first setImage call', () => {
    useImageStore.getState().setImage(makeImageFile('img-1'));
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
  });

  it('revokes the current blob URL on clearImage', () => {
    useImageStore.getState().setImage(makeImageFile('img-1'));
    revokeObjectURLMock.mockClear();

    useImageStore.getState().clearImage();

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:img-1');
    expect(useImageStore.getState().currentImage).toBeNull();
  });

  it('clears EXIF data for the current image on clearImage', () => {
    useImageStore.getState().setImage(makeImageFile('img-1'));
    useExifStore.getState().setLocationOverride('img-1', 'Tokyo');

    useImageStore.getState().clearImage();

    expect(useExifStore.getState().locationOverrides['img-1']).toBeUndefined();
  });

  it('is a no-op when clearImage is called with no current image', () => {
    useImageStore.getState().clearImage();
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
    expect(useImageStore.getState().currentImage).toBeNull();
  });
});
