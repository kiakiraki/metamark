import { useMemo } from 'react';
import { applyStringOverride, useExifStore } from '@/stores/exifStore';
import type { NormalizedExifData } from '@/types/exif';

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
