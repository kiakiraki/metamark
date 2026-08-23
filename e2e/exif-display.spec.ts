import { test, expect } from '@playwright/test';
import { uploadSampleImage, SAMPLE_LENS_MODEL } from './helpers';

test.describe('EXIF display', () => {
  test('parses EXIF from the uploaded file and surfaces it in the UI', async ({
    page,
  }) => {
    await page.goto('/');
    await uploadSampleImage(page);

    // The lens override input's placeholder reflects the EXIF-derived lens
    // name (LensModel) when no override has been set — the one reliable
    // non-canvas signal that EXIF parsing succeeded and reached the UI.
    const lensInput = page.getByLabel('Lens Override');
    await expect(lensInput).toHaveAttribute('placeholder', SAMPLE_LENS_MODEL);

    // Secondary DOM assertion: the info bar shows the uploaded filename.
    await expect(page.getByText('sample-sony.jpg')).toBeVisible();
  });
});
