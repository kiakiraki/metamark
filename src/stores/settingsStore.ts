import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CanvasSettings } from '@/types/canvas';
import type { PositionPreset } from '@/types/template';

export type ImprintColor = 'white' | 'black';

interface SettingsState {
  canvasSettings: CanvasSettings;
  captionInvert: boolean;
  galleryPlacardInvert: boolean;
  imprintColor: ImprintColor;
  // Independent from canvasSettings.overlayPosition: the corner-style
  // templates (Glass, etc.) and the gallery-placard template each interpret
  // the same PositionPreset enum with a different meaning ("bottom-right"
  // means a photo corner for one, "Split panels" for the other). Sharing a
  // single field meant switching templates silently changed the other
  // template's stored position - see refactor/review-followup-202608.
  galleryPlacardPosition: PositionPreset;
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setCaptionInvert: (value: boolean) => void;
  setGalleryPlacardInvert: (value: boolean) => void;
  setImprintColor: (value: ImprintColor) => void;
  setGalleryPlacardPosition: (value: PositionPreset) => void;
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
  galleryPlacardPosition: 'top-left' as PositionPreset,
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
  galleryPlacardPosition: PositionPreset;
}

const SETTINGS_STORE_VERSION = 2;

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

      setGalleryPlacardPosition: (value) =>
        set({ galleryPlacardPosition: value }),

      resetToDefaults: () => set({ ...defaultState }),
    }),
    {
      name: 'metamark-settings',
      version: SETTINGS_STORE_VERSION,
      // version 0 (from before `version`/`migrate`/`merge` existed) is the
      // pre-migration shape: same field names, but canvasSettings may also
      // carry stale width/height/scale, and there is no galleryPlacardPosition
      // at all. version 1 added format/quality/overlayPosition persistence
      // but still predates galleryPlacardPosition. There is no structural
      // rename to perform for either case - `merge` below seeds
      // galleryPlacardPosition from the persisted overlayPosition (their
      // values were identical in practice pre-v2, since gallery-placard used
      // to read/write canvasSettings.overlayPosition directly) and guards
      // against the other stale/missing fields, so migrate is a pass-through.
      //
      // Note: a genuinely pre-`version`-field v0 entry has no numeric
      // `version` key at all, so zustand's persist middleware skips calling
      // `migrate` for it entirely and feeds the raw state straight into
      // `merge` - see the comment there.
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
        galleryPlacardPosition: state.galleryPlacardPosition,
      }),
      // Deep-merge canvasSettings onto the in-code defaults so that any
      // field missing from (or stale in) localStorage - including a future
      // field added to CanvasSettings that an old localStorage entry never
      // had - falls back to the default rather than becoming undefined.
      //
      // Note: zustand's persist middleware only calls `migrate` when the
      // stored payload has a numeric `version` field that differs from
      // SETTINGS_STORE_VERSION; an entry written before `version` existed
      // at all (true pre-migration v0 data) has no such field, so `migrate`
      // above is skipped entirely and this raw state flows straight into
      // `merge`. galleryPlacardPosition therefore also falls back to the
      // persisted overlayPosition here, so both that historical case and
      // the normal migrate path end up seeded consistently.
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
          galleryPlacardPosition:
            persisted.galleryPlacardPosition ??
            persistedCanvas.overlayPosition ??
            currentState.galleryPlacardPosition,
        };
      },
    }
  )
);
