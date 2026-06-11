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
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Location
        </h3>
        <span
          className={clsx(
            'text-xs font-medium px-2 py-0.5 rounded',
            state === 'exif' &&
              'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
            state === 'custom' &&
              'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            state === 'hidden' &&
              'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
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
          'w-full px-3 py-2 rounded-md border text-sm transition-colors',
          'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />

      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={handleResetToExif}
          disabled={disabled || state === 'exif'}
          className={clsx(
            'px-2 py-1 rounded text-gray-600 dark:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
        >
          Reset to EXIF
        </button>
        <button
          type="button"
          onClick={handleHide}
          disabled={disabled || state === 'hidden'}
          className={clsx(
            'px-2 py-1 rounded text-gray-600 dark:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
        >
          Hide field
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Add the place where the photo was taken. Shown on the Caption, Glass,
        and Compact templates. Falls back to IPTC location tags if present.
      </p>
    </div>
  );
}
