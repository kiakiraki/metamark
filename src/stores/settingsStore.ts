import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CanvasSettings } from '@/types/canvas';

export type ImprintColor = 'white' | 'black';

interface SettingsState {
  canvasSettings: CanvasSettings;
  captionInvert: boolean;
  galleryPlacardInvert: boolean;
  imprintColor: ImprintColor;
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setCaptionInvert: (value: boolean) => void;
  setGalleryPlacardInvert: (value: boolean) => void;
  setImprintColor: (value: ImprintColor) => void;
  resetToDefaults: () => void;
}

const defaultCanvasSettings: CanvasSettings = {
  width: 1920,
  height: 1080,
  quality: 0.95,
  format: 'png',
  scale: 1,
  overlayPosition: 'top-left',
};

const defaultState = {
  canvasSettings: defaultCanvasSettings,
  captionInvert: false,
  galleryPlacardInvert: false,
  imprintColor: 'white' as ImprintColor,
};

// Only these canvasSettings fields are meaningful to persist: width/height/
// scale are computed at render time and must always be recalculated, never
// restored from storage.
type PersistedCanvasSettings = Pick<
  CanvasSettings,
  'format' | 'quality' | 'overlayPosition'
>;

interface PersistedState {
  canvasSettings: PersistedCanvasSettings;
  captionInvert: boolean;
  galleryPlacardInvert: boolean;
  imprintColor: ImprintColor;
}

const SETTINGS_STORE_VERSION = 1;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultState,

      updateCanvasSettings: (settingsUpdate) =>
        set((state) => ({
          canvasSettings: { ...state.canvasSettings, ...settingsUpdate },
        })),

      setCaptionInvert: (value) => set({ captionInvert: value }),

      setGalleryPlacardInvert: (value) => set({ galleryPlacardInvert: value }),

      setImprintColor: (value) => set({ imprintColor: value }),

      resetToDefaults: () => set({ ...defaultState }),
    }),
    {
      name: 'metamark-settings',
      version: SETTINGS_STORE_VERSION,
      // version 0 (or entirely unset, from before this field existed) is the
      // pre-migration shape: same field names, but canvasSettings may also
      // carry stale width/height/scale. There is no structural rename to
      // perform here — `merge` below is what actually guards against those
      // stale/missing fields, so migrate is a pass-through.
      migrate: (persistedState) => persistedState as PersistedState,
      partialize: (state): PersistedState => ({
        canvasSettings: {
          format: state.canvasSettings.format,
          quality: state.canvasSettings.quality,
          overlayPosition: state.canvasSettings.overlayPosition,
        },
        captionInvert: state.captionInvert,
        galleryPlacardInvert: state.galleryPlacardInvert,
        imprintColor: state.imprintColor,
      }),
      // Deep-merge canvasSettings onto the in-code defaults so that any
      // field missing from (or stale in) localStorage - including a future
      // field added to CanvasSettings that an old localStorage entry never
      // had - falls back to the default rather than becoming undefined.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<PersistedState>;
        const persistedCanvas: Partial<PersistedCanvasSettings> =
          persisted.canvasSettings ?? {};

        return {
          ...currentState,
          ...persisted,
          canvasSettings: {
            ...currentState.canvasSettings,
            ...(persistedCanvas.format !== undefined && {
              format: persistedCanvas.format,
            }),
            ...(persistedCanvas.quality !== undefined && {
              quality: persistedCanvas.quality,
            }),
            ...(persistedCanvas.overlayPosition !== undefined && {
              overlayPosition: persistedCanvas.overlayPosition,
            }),
          },
        };
      },
    }
  )
);
