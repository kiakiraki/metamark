import { useMemo } from 'react';
import { useExifStore } from '@/stores/exifStore';
import type { NormalizedExifData } from '@/types/exif';

export function useEffectiveExifData(
  imageId: string | undefined
): NormalizedExifData | undefined {
  const base = useExifStore((state) =>
    imageId ? state.normalizedData[imageId] : undefined
  );
  const override = useExifStore((state) =>
    imageId ? state.lensOverrides[imageId] : undefined
  );

  return useMemo(() => {
    if (!base) return undefined;
    if (override === undefined) return base;
    const trimmed = typeof override === 'string' ? override.trim() : '';
    return { ...base, lens: trimmed ? trimmed : null };
  }, [base, override]);
}
