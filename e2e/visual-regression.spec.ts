import { test, expect } from '@playwright/test';
import { uploadSampleImage, waitForRenderToSettle } from './helpers';

// Maps the button's visible display name to the template id used in
// snapshot filenames. "Glass" = technical, "Placard" = gallery-placard.
const TEMPLATES: { button: string; id: string }[] = [
  { button: 'Caption', id: 'caption' },
  { button: 'Compact', id: 'compact' },
  { button: 'Glass', id: 'technical' },
  { button: 'Imprint', id: 'imprint' },
  { button: 'Placard', id: 'gallery-placard' },
  { button: 'Film', id: 'film' },
];

test.describe('visual regression', () => {
  for (const { button, id } of TEMPLATES) {
    test(`renders the ${id} template`, async ({ page }) => {
      await page.goto('/');
      await uploadSampleImage(page);

      const templateButton = page.getByRole('button', { name: button });
      await templateButton.click();
      await expect(templateButton).toHaveAttribute('aria-pressed', 'true');
      await waitForRenderToSettle(page);

      const viewport = page.locator('[data-canvas-viewport]');
      await expect(viewport).toHaveScreenshot(`template-${id}.png`);
    });
  }
});
