import { test, expect } from '@playwright/test';
import { uploadSampleImage } from './helpers';

test.describe('smoke', () => {
  test('loads the app, shows the empty dropzone, and renders a canvas after upload', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Start creating your overlay' })
    ).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();

    await uploadSampleImage(page);

    const canvas = page.getByRole('img', { name: /Preview of/ });
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    const [canvasWidth, canvasHeight] = await canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      return [c.width, c.height];
    });
    expect(canvasWidth).toBeGreaterThan(0);
    expect(canvasHeight).toBeGreaterThan(0);
  });
});
