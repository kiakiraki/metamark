import { create } from 'zustand';
import type { CanvasSettings } from '@/types/canvas';

interface SettingsState {
  canvasSettings: CanvasSettings;
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void;
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

export const useSettingsStore = create<SettingsState>((set) => ({
  canvasSettings: defaultCanvasSettings,

  updateCanvasSettings: (settingsUpdate) =>
    set((state) => ({
      canvasSettings: { ...state.canvasSettings, ...settingsUpdate },
    })),

  resetToDefaults: () => set({ canvasSettings: defaultCanvasSettings }),
}));
