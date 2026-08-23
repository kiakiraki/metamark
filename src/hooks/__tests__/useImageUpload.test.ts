import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExifData, NormalizedExifData } from '@/types/exif';
import type { ImageFile } from '@/types/image';

const mocks = vi.hoisted(() => ({
  onDrop: null as
    ((files: File[], rejections?: unknown[]) => Promise<void>) | null,
  extractExifData: vi.fn<(file: File) => Promise<ExifData>>(),
  normalizeExifData: vi.fn<(data: ExifData) => NormalizedExifData>(),
}));

vi.mock('react-dropzone', () => ({
  useDropzone: (options: {
    onDrop: (files: File[], rejections?: unknown[]) => Promise<void>;
  }) => {
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
import { useToastStore } from '../useToast';
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
    useToastStore.setState({ toasts: [] });
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

  it('shows an error toast when dropzone rejects a file for exceeding the size limit', async () => {
    renderHook(() => useImageUpload());
    const file = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await mocks.onDrop?.(
        [],
        [{ file, errors: [{ code: 'file-too-large', message: 'too large' }] }]
      );
    });

    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({
        type: 'error',
        message: 'File too large. Maximum size is 50MB.',
      }),
    ]);
    expect(useImageStore.getState().currentImage).toBeNull();
  });

  it('shows an error toast when dropzone rejects a file with an unsupported type', async () => {
    renderHook(() => useImageUpload());
    const file = new File(['x'], 'movie.gif', { type: 'image/gif' });

    await act(async () => {
      await mocks.onDrop?.(
        [],
        [{ file, errors: [{ code: 'file-invalid-type', message: 'bad type' }] }]
      );
    });

    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({
        type: 'error',
        message: 'Unsupported file type. Please use JPEG, PNG, or HEIC files.',
      }),
    ]);
  });

  it('shows a single deduplicated toast for multiple identical rejections', async () => {
    renderHook(() => useImageUpload());
    const makeFile = (name: string) =>
      new File(['x'], name, { type: 'image/jpeg' });

    await act(async () => {
      await mocks.onDrop?.(
        [],
        [
          {
            file: makeFile('a.jpg'),
            errors: [{ code: 'too-many-files', message: 'too many' }],
          },
          {
            file: makeFile('b.jpg'),
            errors: [{ code: 'too-many-files', message: 'too many' }],
          },
        ]
      );
    });

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.message).toBe(
      'Only one image can be uploaded at a time.'
    );
  });
});
