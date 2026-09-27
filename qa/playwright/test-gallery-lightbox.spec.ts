import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Gallery fullscreen, zoom, navigation and close (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/konfigurator?model=e82');
    const trigger = page.getByTestId('gallery-slide-0').getByRole('button', { name: /Otwórz zdjęcie/ });
    await trigger.click();
    const viewer = page.getByTestId('gallery-lightbox');
    await expect(viewer).toBeVisible();
    await expect.poll(async () => Math.round((await viewer.boundingBox())?.width ?? 0)).toBe(viewport.width);
    await expect.poll(async () => Math.round((await viewer.boundingBox())?.height ?? 0)).toBe(viewport.height);
    await viewer.getByRole('button', { name: 'Przybliż zdjęcie', exact: true }).first().click();
    await expect(viewer.getByRole('button', { name: 'Oddal zdjęcie', exact: true }).first()).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(viewer.locator('p').first()).toHaveText(/^2 \/ /);
    await expect(viewer.getByRole('button', { name: 'Przybliż zdjęcie', exact: true }).first()).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('ArrowLeft');
    await expect(viewer.locator('p').first()).toHaveText(/^1 \/ /);
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await viewer.getByRole('button', { name: 'Zamknij podgląd' }).click();
    await expect(viewer).toBeHidden();
  });
}
