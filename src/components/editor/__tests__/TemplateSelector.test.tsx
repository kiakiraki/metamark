import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TemplateSelector } from '../TemplateSelector';
import {
  captionTemplate,
  filmTemplate,
  galleryPlacardTemplate,
} from '@/templates';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTemplateStore } from '@/stores/templateStore';

describe('TemplateSelector position controls', () => {
  beforeEach(() => {
    useTemplateStore.setState({ selectedTemplate: captionTemplate });
    useSettingsStore.getState().updateCanvasSettings({
      overlayPosition: 'top-left',
    });
  });

  it('explains that Caption has a fixed position', () => {
    render(<TemplateSelector />);
    expect(screen.getByText('Caption is fixed below the photo.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Top Left' })).toBeNull();
  });

  it('explains that Film position is automatic', () => {
    useTemplateStore.setState({ selectedTemplate: filmTemplate });
    render(<TemplateSelector />);
    expect(
      screen.getByText(
        'Film position is selected automatically for the image orientation.'
      )
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Top Left' })).toBeNull();
  });

  it('shows the actual Gallery Placard layouts', () => {
    useTemplateStore.setState({ selectedTemplate: galleryPlacardTemplate });
    render(<TemplateSelector />);

    expect(screen.getByRole('group', { name: 'Placard layout' })).toBeTruthy();
    const split = screen.getByRole('button', { name: 'Split panels' });
    fireEvent.click(split);

    expect(useSettingsStore.getState().canvasSettings.overlayPosition).toBe(
      'bottom-right'
    );
    expect(split.getAttribute('aria-pressed')).toBe('true');
  });
});
