import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useSelectedImage } from '@/stores/imageStore';
import { useExifStore } from '@/stores/exifStore';

const DEBOUNCE_MS = 200;

type OverrideState = 'exif' | 'custom' | 'hidden';

function deriveState(override: string | null | undefined): OverrideState {
  if (override === undefined) return 'exif';
  if (override === null) return 'hidden';
  return override.trim() ? 'custom' : 'hidden';
}

export function LocationOverrideField() {
  const selectedImage = useSelectedImage();
  const imageId = selectedImage?.id;

  const baseLocation = useExifStore((state) =>
    imageId ? (state.normalizedData[imageId]?.location ?? null) : null
  );
  const override = useExifStore((state) =>
    imageId ? state.locationOverrides[imageId] : undefined
  );
  const setLocationOverride = useExifStore(
    (state) => state.setLocationOverride
  );
  const clearLocationOverride = useExifStore(
    (state) => state.clearLocationOverride
  );

  const [inputValue, setInputValue] = useState('');
  const [lastSyncedImageId, setLastSyncedImageId] = useState<
    string | undefined
  >(undefined);

  if (imageId !== lastSyncedImageId) {
    setLastSyncedImageId(imageId);
    setInputValue(override === undefined || override === null ? '' : override);
  }

  useEffect(() => {
    if (!imageId) return;
    const handle = window.setTimeout(() => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
        if (override !== undefined && override !== null) {
          clearLocationOverride(imageId);
        }
        return;
      }
      if (override !== inputValue) {
        setLocationOverride(imageId, inputValue);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [
    inputValue,
    imageId,
    override,
    setLocationOverride,
    clearLocationOverride,
  ]);

  const state = deriveState(override);
  const disabled = !imageId;

  const handleResetToExif = () => {
    if (!imageId) return;
    setInputValue('');
    clearLocationOverride(imageId);
  };

  const handleHide = () => {
    if (!imageId) return;
    setInputValue('');
    setLocationOverride(imageId, null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Location
        </h3>
        <span
          className={clsx(
            'rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
            state === 'exif' && 'bg-white/10 text-zinc-400',
            state === 'custom' && 'bg-accent/15 text-accent',
            state === 'hidden' && 'bg-red-500/15 text-red-400'
          )}
        >
          {state === 'exif' && 'EXIF'}
          {state === 'custom' && 'Custom'}
          {state === 'hidden' && 'Hidden'}
        </span>
      </div>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={disabled}
        placeholder={baseLocation ?? 'e.g. Tokyo, Asakusa'}
        className={clsx(
          'w-full rounded-md border px-3 py-2 text-sm transition-colors',
          'border-white/10 bg-surface-2 text-zinc-100 placeholder:text-zinc-600',
          'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent/70',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      />

      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={handleResetToExif}
          disabled={disabled || state === 'exif'}
          className={clsx(
            'rounded px-2 py-1 text-zinc-400',
            'transition-colors hover:bg-white/5 hover:text-zinc-200',
            'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
          )}
        >
          Reset to EXIF
        </button>
        <button
          type="button"
          onClick={handleHide}
          disabled={disabled || state === 'hidden'}
          className={clsx(
            'rounded px-2 py-1 text-zinc-400',
            'transition-colors hover:bg-white/5 hover:text-zinc-200',
            'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
          )}
        >
          Hide field
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Add the place where the photo was taken. Shown on the Caption, Glass,
        and Compact templates. Falls back to IPTC location tags if present.
      </p>
    </div>
  );
}
