import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'metamark-settings';

describe('settingsStore persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('fills in new/stale canvasSettings fields with defaults when hydrating a version-0 (pre-migration) localStorage entry', async () => {
    // Simulates a localStorage entry written before `version`/`migrate`/`merge`
    // existed: no top-level `version` key, and canvasSettings carries stale
    // width/height/scale that must never be restored verbatim.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          canvasSettings: {
            width: 999,
            height: 999,
            quality: 0.5,
            format: 'jpeg',
            scale: 2,
            overlayPosition: 'bottom-right',
          },
          captionInvert: true,
          galleryPlacardInvert: false,
          imprintColor: 'black',
        },
      })
    );

    const { useSettingsStore } = await import('../settingsStore');

    await waitFor(() => {
      expect(useSettingsStore.persist.hasHydrated()).toBe(true);
    });

    const state = useSettingsStore.getState();
    // width/height/scale are render-time computed values; hydration must
    // fall back to the in-code defaults rather than the stale stored values.
    expect(state.canvasSettings.width).toBe(1920);
    expect(state.canvasSettings.height).toBe(1080);
    expect(state.canvasSettings.scale).toBe(1);
  });

  it('restores format/quality/overlayPosition from a version-0 entry', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          canvasSettings: {
            width: 999,
            height: 999,
            quality: 0.42,
            format: 'jpeg',
            scale: 2,
            overlayPosition: 'bottom-right',
          },
          captionInvert: true,
          galleryPlacardInvert: false,
          imprintColor: 'black',
        },
      })
    );

    const { useSettingsStore } = await import('../settingsStore');

    await waitFor(() => {
      expect(useSettingsStore.persist.hasHydrated()).toBe(true);
    });

    const state = useSettingsStore.getState();
    expect(state.canvasSettings.quality).toBe(0.42);
    expect(state.canvasSettings.format).toBe('jpeg');
    expect(state.canvasSettings.overlayPosition).toBe('bottom-right');
    expect(state.captionInvert).toBe(true);
    expect(state.galleryPlacardInvert).toBe(false);
    expect(state.imprintColor).toBe('black');
  });

  it('hydrates cleanly with no prior localStorage entry (fresh install)', async () => {
    const { useSettingsStore } = await import('../settingsStore');

    await waitFor(() => {
      expect(useSettingsStore.persist.hasHydrated()).toBe(true);
    });

    const state = useSettingsStore.getState();
    expect(state.canvasSettings).toEqual({
      width: 1920,
      height: 1080,
      quality: 0.95,
      format: 'png',
      scale: 1,
      overlayPosition: 'top-left',
    });
  });

  it('only persists format/quality/overlayPosition from canvasSettings, not width/height/scale', async () => {
    const { useSettingsStore } = await import('../settingsStore');

    await waitFor(() => {
      expect(useSettingsStore.persist.hasHydrated()).toBe(true);
    });

    useSettingsStore.getState().updateCanvasSettings({
      width: 4000,
      height: 3000,
      scale: 3,
      quality: 0.7,
      format: 'jpeg',
      overlayPosition: 'bottom-left',
    });

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    });

    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
    expect(parsed.version).toBe(1);
    expect(parsed.state.canvasSettings).toEqual({
      format: 'jpeg',
      quality: 0.7,
      overlayPosition: 'bottom-left',
    });
  });
});
