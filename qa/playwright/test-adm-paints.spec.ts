import { test, expect, type Page } from '@playwright/test';
import { BASE_URL, API_BASE, evidenceDir, loginAdmin, requiredAdminCredentials } from './lib/admin';

// ADM-06 / VIS-18: admin "Lakiery" tab — palette + color CRUD, per-product
// (model vs. frame) availability isolation, render upload/zoom, and the
// price surcharge a paid palette adds to the configurator total.
//
// Scope:
//   1. Create a brand-new test palette (with a price surcharge) and a test
//      color inside it, entirely through the admin UI ("Lakiery" tab).
//   2. Enable the palette for model e55 only and confirm the frame page for
//      the test frame `scott-spark-test` does NOT show it (no cross-leak).
//   3. Upload a render for e55, confirm the model configurator's paint
//      picker finds the color by search, shows the surcharge on the total
//      price, and the render zooms.
//   4. Flip availability to the frame only and confirm the leak check now
//      runs in the other direction: the model configurator loses the color,
//      the frame page's paint browser gains it.
//   5. Delete the test color (via the UI's own delete button) and the test
//      palette (via a direct API call — the panel has no palette-delete
//      button), then confirm both public paint pickers no longer offer it.
//
// The palette/color delete cascades (ON DELETE CASCADE on paint_colors,
// paint_renders, model_paint_palettes, frame_paint_palettes — see
// database/migrations/028_paint_colors.sql) so removing the palette alone
// is enough to also drop the color, its render and both availability rows.
//
// Run with:
//   QA_ADMIN_EMAIL=... QA_ADMIN_PASSWORD=... \
//     npx playwright test --config qa/playwright/playwright.config.ts -g VIS-18

const MODEL_SLUG = 'e55';
const FRAME_SLUG = 'scott-spark-test';
const RUN_ID = Date.now();
const PALETTE_NAME = `[QA-D] Paleta VIS-18 ${RUN_ID}`;
const COLOR_NAME = `[QA-D] Kolor VIS-18 ${RUN_ID}`;
const SURCHARGE = 250;

// 1x1 red PNG — enough to exercise the upload -> render -> zoom pipeline
// without shipping a binary fixture into the repo.
const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function adminToken(): Promise<string> {
  const { email, password } = requiredAdminCredentials();
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`POST /admin/login failed: ${response.status}`);
  const data = (await response.json()) as { token: string };
  return data.token;
}

/**
 * React sets a controlled input's `value` as a DOM property, not an HTML
 * attribute, so a CSS/XPath `[value=...]` selector can't find it (this
 * Playwright version also predates `getByDisplayValue`). Find it by reading
 * the live property in the page instead.
 */
async function inputByValue(page: Page, selector: string, value: string) {
  const candidates = page.locator(selector);
  const index = await candidates.evaluateAll(
    (elements, target) => elements.findIndex((el) => (el as HTMLInputElement).value === target),
    value,
  );
  if (index === -1) throw new Error(`No "${selector}" with value "${value}" found.`);
  return candidates.nth(index);
}

async function fetchPaints(token: string) {
  const response = await fetch(`${API_BASE}/admin/paints`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GET /admin/paints failed: ${response.status}`);
  return (await response.json()) as {
    palettes: Array<{ id: number; slug: string; name: string }>;
    colors: Array<{ id: number; paletteId: number; slug: string; name: string }>;
  };
}

test.describe('rexor admin paints (ADM-06)', () => {
  test('VIS-18: palette/color CRUD, per-product availability isolation, render zoom and price surcharge', async ({
    page,
    context,
  }) => {
    const evidence = await evidenceDir('VIS-18');
    let paletteId: number | null = null;

    try {
      await loginAdmin(page);
      await page.getByRole('tab', { name: 'Lakiery' }).click();
      await page.getByRole('heading', { name: 'Palety' }).waitFor();

      // --- 1. Create the test palette --------------------------------
      await page.getByPlaceholder('Nazwa nowej palety').fill(PALETTE_NAME);
      await page.getByRole('button', { name: 'Dodaj paletę' }).click();
      await page.waitForTimeout(500); // let the post-create reload land before scanning input values
      const paletteNameInput = await inputByValue(page, 'input', PALETTE_NAME);
      // `.filter({ has })` re-resolves its inner locator per-candidate, so an
      // absolute `.nth()` index (as inputByValue produces) doesn't survive
      // being wrapped in it -- walk up from the already-resolved element
      // instead.
      const paletteCard = paletteNameInput.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " rounded-2xl ")][1]');
      // "Dopłata brutto" is a plain <Label> sibling, not a <label htmlFor>,
      // so getByLabel() can't associate it -- scope by the enclosing field
      // div's text instead.
      const surchargeField = paletteCard.locator('div.grid.gap-1\\.5').filter({ hasText: 'Dopłata brutto' }).locator('input');
      await surchargeField.fill(String(SURCHARGE));
      await paletteCard.getByRole('button', { name: 'Zapisz' }).click();
      await expect(surchargeField).toHaveValue(String(SURCHARGE), { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/01-palette-created.png`, fullPage: true });

      // Resolve the palette id (and a reusable admin token) right away, so
      // the `finally` cleanup below can delete it even if a later step in
      // this test throws.
      const token = await adminToken();
      const paints = await fetchPaints(token);
      const palette = paints.palettes.find((row) => row.name === PALETTE_NAME);
      expect(palette, 'Palette must exist in /admin/paints after creation.').toBeTruthy();
      paletteId = palette!.id;

      // --- 2. Availability: model e55 only ----------------------------
      // The test catalog only has 3 models + 1 frame, well under
      // MANY_PRODUCTS (12, see admin-paints.tsx), so the "Dostępna w"
      // picker isn't "crowded" and shows every row (no search box, no
      // "pokaż wszystkie" gate) -- rows can be toggled directly.
      const modelSwitch = paletteCard.locator('label').filter({ hasText: 'Rexor E55' }).first();
      await modelSwitch.scrollIntoViewIfNeeded();
      await modelSwitch.getByRole('checkbox').click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${evidence}/02-availability-model-only.png`, fullPage: true });

      // --- 3. Create the test color under the new palette -------------
      const newColorForm = page.locator('div.flex.flex-wrap.items-end.gap-2').filter({ has: page.getByPlaceholder('Nazwa') });
      await newColorForm.locator('select').first().selectOption({ label: PALETTE_NAME });
      await newColorForm.getByPlaceholder('Nazwa').fill(COLOR_NAME);
      await newColorForm.getByPlaceholder('Kod').fill('QAD1');
      await newColorForm.locator('input[type="color"]').fill('#3388ff');
      await newColorForm.getByRole('button', { name: 'Dodaj kolor' }).click();
      await expect(page.getByText('Zapisano')).toBeVisible({ timeout: 10_000 });

      // The "Kolory" list only renders the first 60 (of ~680) matches, and a
      // freshly created color sorts last, so it needs the section's own
      // search box to actually appear in the rendered list.
      await page.getByPlaceholder('Szukaj po nazwie, kodzie, hexie…').fill(COLOR_NAME);
      const colorRow = page.locator('button').filter({ hasText: COLOR_NAME }).first();
      await colorRow.waitFor({ timeout: 10_000 });
      await colorRow.click();
      await page.screenshot({ path: `${evidence}/03-color-created.png`, fullPage: true });

      // --- 4. Upload a render for E55 ----------------------------------
      const targetChip = page.getByRole('button', { name: /Rexor E55/ }).first();
      if (await targetChip.count()) await targetChip.click();
      // `div >> filter({has: ...})` also matches ancestor divs that wrap all
      // three slots, not just the "standard" one -- `.first()` on the file
      // input then grabs whichever slot renders first in the DOM (the photo
      // slot), not the intended one. Walk up from the slot's own heading to
      // its specific card instead.
      const standardSlotInput = page
        .getByText('Wizualizacja standard', { exact: true })
        .locator('xpath=ancestor::div[contains(@class, "rounded-2xl") and contains(@class, "border-2")][1]')
        .locator('input[type="file"]');
      await standardSlotInput.setInputFiles({ name: 'qa-d-render.png', mimeType: 'image/png', buffer: TEST_PNG });
      await expect(page.getByText('to widzi klient')).toBeVisible({ timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/04-render-uploaded.png`, fullPage: true });

      // --- 5. Model configurator: color found, priced, render zooms ---
      const configPage = await context.newPage();
      await configPage.goto(`${BASE_URL}/konfigurator?model=${MODEL_SLUG}`, { waitUntil: 'domcontentloaded' });
      await configPage.waitForTimeout(3000);
      await configPage.getByRole('button', { name: /Wybierz kolor/i }).click();
      const dialog = configPage.getByRole('dialog').filter({ hasText: 'Kolor lakieru' }).or(configPage.locator('[role="dialog"]')).first();
      await dialog.waitFor();

      await configPage.getByTestId('paint-search-input').fill(COLOR_NAME);
      const swatch = configPage.getByTestId(new RegExp(`^paint-color-${palette!.slug}-`));
      await expect(swatch).toBeVisible({ timeout: 10_000 });
      await configPage.screenshot({ path: `${evidence}/05-model-picker-search.png`, fullPage: true });

      const priceBefore = (await configPage.getByTestId('total-price').innerText()).trim();
      await swatch.click();
      const zoomButton = configPage.getByTestId('paint-preview-zoom-button');
      await expect(zoomButton).toBeVisible();
      await zoomButton.click();
      const zoomedImg = configPage.getByTestId('paint-zoom-image');
      await expect(zoomedImg).toBeVisible();
      const zoomedSrc = await zoomedImg.getAttribute('src');
      // Imported production renders live under /media/paints/renders/, but a
      // freshly admin-uploaded one goes through the generic media endpoint
      // instead (see RendersEditor's upload() in admin-paints.tsx, which
      // POSTs to /admin/media first) -- either is a real, loaded image.
      expect(zoomedSrc, 'Zoomed dialog must load the uploaded render.').toMatch(/\/(media\/paints\/renders|api\/uploads)\//);
      await configPage.screenshot({ path: `${evidence}/06-render-zoomed.png`, fullPage: true });

      await configPage.keyboard.press('Escape');
      await configPage.getByTestId('paint-dialog-confirm-button-desktop').click();
      const priceAfter = (await configPage.getByTestId('total-price').innerText()).trim();
      expect(priceAfter, 'Selecting the surcharge palette must raise the total price.').not.toBe(priceBefore);
      const delta = configPage.getByTestId('price-delta');
      await expect(delta).toBeVisible();
      await expect(delta).toContainText(String(SURCHARGE));
      await configPage.screenshot({ path: `${evidence}/07-price-surcharge-applied.png`, fullPage: true });

      // Deselect: pick a stock free color again and confirm the surcharge drops.
      await configPage.getByTestId('paint-color-change-button').click();
      await dialog.waitFor();
      await configPage.getByTestId('paint-search-input').fill('');
      // `[data-testid^="paint-color-"]` unscoped also matches the closed
      // summary's own "paint-color-preview"/"paint-color-swatch-*"/
      // "paint-color-change-button" nodes (same prefix, rendered outside
      // this dialog and hidden behind its overlay) -- scope to the dialog
      // and exclude our own palette's swatches so this always lands on a
      // genuinely different, free color.
      const anyOtherSwatch = dialog
        .locator(`[data-testid^="paint-color-"]:not([data-testid^="paint-color-${palette!.slug}-"])`)
        .first();
      await anyOtherSwatch.click();
      await configPage.getByTestId('paint-dialog-confirm-button-desktop').click();
      const priceReverted = (await configPage.getByTestId('total-price').innerText()).trim();
      expect(priceReverted, 'Deselecting the surcharge palette must drop the total back down.').not.toBe(priceAfter);
      await configPage.screenshot({ path: `${evidence}/08-price-reverted.png`, fullPage: true });

      // --- 6. Frame page: must NOT show the model-only palette ---------
      const framePage = await context.newPage();
      await framePage.goto(`${BASE_URL}/ramy/${FRAME_SLUG}`, { waitUntil: 'domcontentloaded' });
      const browseCta = framePage.getByRole('button', { name: /Zobacz kolory|Przeglądaj kolory|Pokaż kolory/ }).first();
      await browseCta.scrollIntoViewIfNeeded();
      await browseCta.click();
      const frameDialog = framePage.locator('[role="dialog"]').first();
      await frameDialog.waitFor();
      await framePage.getByTestId('paint-search-input').fill(COLOR_NAME);
      await expect(framePage.locator(`[data-testid^="paint-color-${palette!.slug}-"]`)).toHaveCount(
        0,
        'Model-only palette leaked into the frame paint picker.',
      );
      await framePage.screenshot({ path: `${evidence}/09-frame-picker-no-leak.png`, fullPage: true });
      await framePage.close();

      // --- 7. Flip availability: frame only ----------------------------
      await modelSwitch.getByRole('checkbox').click(); // off for model
      const frameSwitch = paletteCard.locator('label').filter({ hasText: 'Scott Spark' }).first();
      await frameSwitch.scrollIntoViewIfNeeded();
      await frameSwitch.getByRole('checkbox').click(); // on for frame
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${evidence}/10-availability-frame-only.png`, fullPage: true });

      // Model configurator must now lose the color (reload for a fresh fetch).
      await configPage.reload({ waitUntil: 'domcontentloaded' });
      await configPage.waitForTimeout(3000);
      await configPage.getByRole('button', { name: /Wybierz kolor|Zmień/i }).first().click();
      await dialog.waitFor();
      await configPage.getByTestId('paint-search-input').fill(COLOR_NAME);
      await expect(configPage.locator(`[data-testid^="paint-color-${palette!.slug}-"]`)).toHaveCount(
        0,
        'Frame-only palette leaked into the model configurator.',
      );
      await configPage.screenshot({ path: `${evidence}/11-model-picker-no-leak.png`, fullPage: true });
      await configPage.close();

      // Frame page must now show it.
      const framePage2 = await context.newPage();
      await framePage2.goto(`${BASE_URL}/ramy/${FRAME_SLUG}`, { waitUntil: 'domcontentloaded' });
      const browseCta2 = framePage2.getByRole('button', { name: /Zobacz kolory|Przeglądaj kolory|Pokaż kolory/ }).first();
      await browseCta2.scrollIntoViewIfNeeded();
      await browseCta2.click();
      const frameDialog2 = framePage2.locator('[role="dialog"]').first();
      await frameDialog2.waitFor();
      await framePage2.getByTestId('paint-search-input').fill(COLOR_NAME);
      await expect(framePage2.locator(`[data-testid^="paint-color-${palette!.slug}-"]`)).toBeVisible({ timeout: 10_000 });
      await framePage2.screenshot({ path: `${evidence}/12-frame-picker-shows-color.png`, fullPage: true });
      await framePage2.close();

      // --- 8. Cleanup: delete color (UI), palette (API) ----------------
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: 'Modele' }).waitFor({ timeout: 15_000 });
      await page.getByRole('tab', { name: 'Lakiery' }).click();
      await page.getByRole('heading', { name: 'Palety' }).waitFor();
      await page.getByPlaceholder('Szukaj po nazwie, kodzie, hexie…').fill(COLOR_NAME);
      const colorRowAgain = page.locator('button').filter({ hasText: COLOR_NAME }).first();
      await colorRowAgain.waitFor({ timeout: 10_000 });
      await colorRowAgain.click();
      // Scope to the row's own action bar (next to "Zapisz kolor") -- the
      // render-slot delete icons elsewhere on the page also expose an
      // accessible name of "Usuń" via their title attribute.
      const colorActions = page.locator('div.flex.flex-wrap.items-center.gap-4').filter({ has: page.getByRole('button', { name: 'Zapisz kolor' }) });
      page.once('dialog', (dialog2) => void dialog2.accept());
      await colorActions.getByRole('button', { name: 'Usuń' }).click();
      await expect(page.locator('button').filter({ hasText: COLOR_NAME })).toHaveCount(0, { timeout: 10_000 });

      const deleteResponse = await fetch(`${API_BASE}/admin/paint-palettes/${paletteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(deleteResponse.ok, `DELETE /admin/paint-palettes/${paletteId} must succeed.`).toBe(true);
      paletteId = null;
      await page.screenshot({ path: `${evidence}/13-cleanup-done.png`, fullPage: true });

      // Confirm gone from both public pickers.
      const finalCheck = await context.newPage();
      await finalCheck.goto(`${BASE_URL}/konfigurator?model=${MODEL_SLUG}`, { waitUntil: 'domcontentloaded' });
      await finalCheck.waitForTimeout(3000);
      await finalCheck.getByRole('button', { name: /Wybierz kolor|Zmień/i }).first().click();
      // A fresh locator on this page -- `dialog` above belongs to `configPage`
      // (already closed), and reusing it here would wait on the wrong page.
      const finalDialog = finalCheck.getByRole('dialog').filter({ hasText: 'Kolor lakieru' }).or(finalCheck.locator('[role="dialog"]')).first();
      await finalDialog.waitFor();
      await finalCheck.getByTestId('paint-search-input').fill(COLOR_NAME);
      // Scoped to the dialog: the unscoped selector also matches the closed
      // summary's "paint-color-select-button" (always present pre-selection)
      // and would never read 0.
      await expect(finalDialog.locator('[data-testid^="paint-color-"]')).toHaveCount(0);
      await finalCheck.close();

      const finalFrameCheck = await context.newPage();
      await finalFrameCheck.goto(`${BASE_URL}/ramy/${FRAME_SLUG}`, { waitUntil: 'domcontentloaded' });
      const browseCta3 = finalFrameCheck.getByRole('button', { name: /Zobacz kolory|Przeglądaj kolory|Pokaż kolory/ }).first();
      if (await browseCta3.count()) {
        await browseCta3.click();
        const frameDialog3 = finalFrameCheck.locator('[role="dialog"]').first();
        await frameDialog3.waitFor();
        await finalFrameCheck.getByTestId('paint-search-input').fill(COLOR_NAME);
        await expect(frameDialog3.locator('[data-testid^="paint-color-"]')).toHaveCount(0);
      }
      await finalFrameCheck.screenshot({ path: `${evidence}/14-cleanup-confirmed-frame.png`, fullPage: true });
      await finalFrameCheck.close();
    } finally {
      // Best-effort cleanup if an assertion above threw before the
      // in-test cleanup step ran — never leave [QA-D] data behind.
      if (paletteId !== null) {
        try {
          const token = await adminToken();
          await fetch(`${API_BASE}/admin/paint-palettes/${paletteId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // If this also fails, the run summary must report it manually.
        }
      }
    }
  });
});
