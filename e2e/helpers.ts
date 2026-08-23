import { type Page, expect } from '@playwright/test';
import path from 'node:path';

export const SAMPLE_SONY_JPG = path.join(
  __dirname,
  'fixtures',
  'sample-sony.jpg'
);

export const SAMPLE_LENS_MODEL = 'FE 24-70mm F2.8 GM';

/**
 * Uploads the sample fixture through the hidden file input (present in both
 * the empty and loaded dropzone states) and waits for the canvas preview to
 * appear and finish its initial render.
 */
export async function uploadSampleImage(page: Page) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(SAMPLE_SONY_JPG);

  const canvas = page.getByRole('img', { name: /Preview of/ });
  await expect(canvas).toBeVisible();

  await waitForRenderToSettle(page);
}

/**
 * Waits for the "Rendering overlay…" status overlay to be gone (or to never
 * have appeared) and for web fonts to finish loading, so screenshots and
 * pixel-dependent assertions are stable.
 */
export async function waitForRenderToSettle(page: Page) {
  await page
    .getByRole('status')
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => {
      // The overlay may never have attached at all if the render was
      // synchronous/fast — that's fine, nothing to wait for.
    });

  await page.evaluate(() => document.fonts.ready);
}
