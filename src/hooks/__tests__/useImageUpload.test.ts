import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExifData, NormalizedExifData } from '@/types/exif';
import type { ImageFile } from '@/types/image';

const mocks = vi.hoisted(() => ({
  onDrop: null as ((files: File[]) => Promise<void>) | null,
  extractExifData: vi.fn<(file: File) => Promise<ExifData>>(),
  normalizeExifData: vi.fn<(data: ExifData) => NormalizedExifData>(),
}));

vi.mock('react-dropzone', () => ({
  useDropzone: (options: { onDrop: (files: File[]) => Promise<void> }) => {
    mocks.onDrop = options.onDrop;
    return {
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
      isDragReject: false,
    };
  },
}));

vi.mock('@/services/exifExtractor', () => ({
  extractExifData: mocks.extractExifData,
  normalizeExifData: mocks.normalizeExifData,
}));

import { useImageUpload } from '../useImageUpload';
import { ImageProcessor } from '@/services/imageProcessor';
import { useExifStore } from '@/stores/exifStore';
import { useImageStore } from '@/stores/imageStore';

const normalizedData: NormalizedExifData = {
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

const imageFile: ImageFile = {
  id: 'image-1',
  name: 'image.jpg',
  url: 'blob:image-1',
  size: 1024,
  type: 'image/jpeg',
  width: 1920,
  height: 1080,
};

describe('useImageUpload', () => {
  beforeEach(() => {
    mocks.onDrop = null;
    mocks.extractExifData.mockReset();
    mocks.normalizeExifData.mockReset();
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

  it('does not restore EXIF data after the image is removed', async () => {
    let resolveExif!: (data: ExifData) => void;
    const pendingExif = new Promise<ExifData>((resolve) => {
      resolveExif = resolve;
    });
    mocks.extractExifData.mockReturnValue(pendingExif);
    mocks.normalizeExifData.mockReturnValue(normalizedData);
    vi.spyOn(ImageProcessor, 'loadImageFile').mockResolvedValue(imageFile);

    const { result } = renderHook(() => useImageUpload());
    const file = new File(['jpeg'], 'image.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await mocks.onDrop?.([file]);
    });
    expect(useImageStore.getState().currentImage?.id).toBe(imageFile.id);

    act(() => {
      result.current.clearImage();
    });
    expect(useImageStore.getState().currentImage).toBeNull();

    await act(async () => {
      resolveExif({ camera: { make: 'Sony' } });
      await pendingExif;
    });

    expect(useExifStore.getState().exifData).toEqual({});
    expect(useExifStore.getState().normalizedData).toEqual({});
    expect(mocks.normalizeExifData).not.toHaveBeenCalled();
  });
});
