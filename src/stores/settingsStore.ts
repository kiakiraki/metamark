import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CanvasSettings } from '@/types/canvas';

interface SettingsState {
  canvasSettings: CanvasSettings;
  captionInvert: boolean;
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setCaptionInvert: (value: boolean) => void;
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      canvasSettings: defaultCanvasSettings,
      captionInvert: false,

      updateCanvasSettings: (settingsUpdate) =>
        set((state) => ({
          canvasSettings: { ...state.canvasSettings, ...settingsUpdate },
        })),

      setCaptionInvert: (value) => set({ captionInvert: value }),

      resetToDefaults: () =>
        set({ canvasSettings: defaultCanvasSettings, captionInvert: false }),
    }),
    {
      name: 'metamark-settings',
      partialize: (state) => ({
        canvasSettings: state.canvasSettings,
        captionInvert: state.captionInvert,
      }),
    }
  )
);
