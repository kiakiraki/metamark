import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { LensOverrideField } from '../LensOverrideField';
import { LocationOverrideField } from '../LocationOverrideField';
import { ExportControls } from '@/components/export/ExportControls';
import { useSettingsStore } from '@/stores/settingsStore';

describe('editor form accessibility', () => {
  beforeEach(() => {
    useSettingsStore.getState().updateCanvasSettings({ format: 'png' });
  });

  it('gives override inputs accessible names', () => {
    render(
      <>
        <LensOverrideField />
        <LocationOverrideField />
      </>
    );

    expect(screen.getByRole('textbox', { name: 'Lens Override' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Location' })).toBeTruthy();
  });

  it('exposes the selected export format', () => {
    render(<ExportControls />);
    const png = screen.getByRole('button', { name: 'png' });
    const jpeg = screen.getByRole('button', { name: 'jpeg' });

    expect(png.getAttribute('aria-pressed')).toBe('true');
    expect(jpeg.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(jpeg);

    expect(png.getAttribute('aria-pressed')).toBe('false');
    expect(jpeg.getAttribute('aria-pressed')).toBe('true');
  });
});
