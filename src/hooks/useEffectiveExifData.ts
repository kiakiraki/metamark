import { useMemo } from 'react';
import { useExifStore } from '@/stores/exifStore';
import type { NormalizedExifData } from '@/types/exif';

function applyStringOverride(
  current: string | null,
  override: string | null | undefined
): string | null {
  if (override === undefined) return current;
  const trimmed = typeof override === 'string' ? override.trim() : '';
  return trimmed ? trimmed : null;
}

export function useEffectiveExifData(
  imageId: string | undefined
): NormalizedExifData | undefined {
  const base = useExifStore((state) =>
    imageId ? state.normalizedData[imageId] : undefined
  );
  const lensOverride = useExifStore((state) =>
    imageId ? state.lensOverrides[imageId] : undefined
  );
  const locationOverride = useExifStore((state) =>
    imageId ? state.locationOverrides[imageId] : undefined
  );

  return useMemo(() => {
    if (!base) return undefined;
    return {
      ...base,
      lens: applyStringOverride(base.lens, lensOverride),
      location: applyStringOverride(base.location, locationOverride),
    };
  }, [base, lensOverride, locationOverride]);
}
