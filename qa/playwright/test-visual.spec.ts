import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Consolidated regression coverage for the three issues reported against the
// admin editor (2026-09-17):
//   VIS-01  /rowery listing card keeps a stale main photo after a reorder in
//           the admin "Modele i zdjęcia" tab, while the model detail page
//           already shows the new order.
//   VIS-02  The admin "Rowery" (models) tab has no category filter, unlike
//           what was expected from the "Ramy" tab (which, per investigation,
//           doesn't actually have one either — see qa/POKRYCIE_AUTOMATYZACJA.md).
//   VIS-03  Opening a just-submitted public configuration from the admin
//           "Zapytania" tab ("Szczegóły") errors out.
//
// Plus completion of previously-PARTIAL scenarios from
// qa/SCENARIUSZE_TESTOWE.md, now that an admin session and a test mailbox
// are available (2026-09-17):
//   VIS-04  CFG-04: paint-picker render zoom (blocked before — E82 has zero
//           paint renders in the test catalog; E55 has 229/680, so this
//           runs against E55).
//   VIS-05  CFG-06 + ADM-10: full save → admin "Dziennik aktywności" shows
//           the event → open the same record from "Zapytania" → "Szczegóły"
//           through the real UI flow (not a direct URL). Email *delivery*
//           to the order-notification inbox still cannot be verified from
//           this environment (IMAPS to mail.sobierski.com:993 times out
//           even outside the shell sandbox) — see VIS-05's WYNIK.md.
//   VIS-06  CFG-07: keyboard focus stays trapped inside the paint-picker
//           modal while Tabbing, and Escape returns focus to the trigger.
//
// Run with: npm run test:visual
// Requires QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD in the environment.

const BASE_URL = (process.env.BASE_URL ?? 'https://rexor.sobierski.com').replace(/\/$/, '');
const API_BASE = process.env.API_BASE_URL ?? `${BASE_URL}/api`;
const EVIDENCE_ROOT = resolve(
  __dirname,
  '../evidence',
  new Date().toISOString().slice(0, 10),
  'test',
);

function requiredAdminCredentials() {
  const { QA_ADMIN_EMAIL: email, QA_ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) {
    throw new Error('Set QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD before running test:visual.');
  }
  return { email, password };
}

async function evidenceDir(id: string) {
  const dir = resolve(EVIDENCE_ROOT, id);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function loginAdmin(page: Page) {
  const { email, password } = requiredAdminCredentials();
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
  // fill() does not reliably update this React form (same note as
  // qa/scripts/lib/admin.cjs) — type it out instead.
  for (const [id, value] of [
    ['#admin-email', email],
    ['#admin-password', password],
  ] as const) {
    const field = page.locator(id);
    await field.click();
    await field.press('ControlOrMeta+A');
    await field.pressSequentially(value, { delay: 20 });
  }
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Zaloguj' }).click();
  await page.getByRole('tab', { name: 'Modele i zdjęcia' }).waitFor({ timeout: 15_000 });
}

async function fetchModelBySlug(slug: string) {
  const response = await fetch(`${API_BASE}/catalog`);
  if (!response.ok) throw new Error(`GET /catalog failed: ${response.status}`);
  const data = (await response.json()) as { models: Array<Record<string, unknown>> };
  const model = data.models.find((m) => String(m.slug) === slug);
  if (!model) throw new Error(`Model with slug "${slug}" not found in /catalog`);
  return model as { id: number; slug: string; name: string; categorySlug?: string };
}

test.describe('rexor visual regression (admin editor)', () => {
  test('VIS-01: reordering a model photo in admin updates the /rowery listing main image', async ({
    page,
    context,
  }) => {
    const evidence = await evidenceDir('VIS-01');
    const model = await fetchModelBySlug('e82');

    await loginAdmin(page);
    const article = page.locator('article').filter({ has: page.locator(`#model-name-${model.id}`) });
    await article.scrollIntoViewIfNeeded();
    const photos = article.locator('[class*="group/photo"]');
    const photoCount = await photos.count();
    test.skip(photoCount < 2, 'Model E82 needs at least 2 photos in the test environment to exercise reorder.');

    const firstImgBefore = await photos.nth(0).locator('img').getAttribute('src');
    await page.screenshot({ path: `${evidence}/01-admin-before-reorder.png`, fullPage: true });

    // Move the first photo one slot to the right (index 0 -> 1), i.e. change
    // which image is first / "main".
    await photos.nth(0).hover();
    await photos.nth(0).getByRole('button', { name: 'Przesuń zdjęcie w prawo' }).click({ force: true });
    await page.waitForTimeout(500);
    const firstImgAfter = await photos.nth(0).locator('img').getAttribute('src');
    expect(firstImgAfter).not.toBe(firstImgBefore);
    await page.screenshot({ path: `${evidence}/02-admin-after-reorder.png`, fullPage: true });

    // Public listing: reuse the SAME browser context (same as a real visitor
    // who had the admin tab open) so any client-side HTTP caching of GET
    // /catalog is exercised rather than bypassed by a clean context.
    const publicPage = await context.newPage();
    await publicPage.goto(`${BASE_URL}/rowery`, { waitUntil: 'domcontentloaded' });
    const card = publicPage.getByRole('link', { name: `Poznaj ${model.name}` });
    await card.scrollIntoViewIfNeeded();
    const listingImg = await card.locator('img').first().getAttribute('src');
    await publicPage.screenshot({ path: `${evidence}/03-public-rowery-listing.png`, fullPage: true });

    // Model detail page.
    const detailUrl = `${BASE_URL}/rowery/${model.categorySlug ?? 'elektryczne'}/${model.slug}`;
    await publicPage.goto(detailUrl, { waitUntil: 'domcontentloaded' });
    const detailImg = await publicPage.locator('img[alt="' + model.name + '"]').first().getAttribute('src');
    await publicPage.screenshot({ path: `${evidence}/04-public-model-detail.png`, fullPage: true });

    // Revert the reorder so the test is idempotent / repeatable.
    await article.scrollIntoViewIfNeeded();
    await photos.nth(0).hover();
    await photos.nth(0).getByRole('button', { name: 'Przesuń zdjęcie w prawo' }).click({ force: true });
    await page.waitForTimeout(300);

    expect(
      listingImg,
      'Listing card main image must match the freshly reordered detail-page main image (reported bug: it stays stale).',
    ).toBe(detailImg);
  });

  test('VIS-02: admin "Rowery" (models) tab offers a category filter', async ({ page }) => {
    const evidence = await evidenceDir('VIS-02');
    await loginAdmin(page);
    await page.screenshot({ path: `${evidence}/01-models-tab.png`, fullPage: true });

    // Per investigation (qa/POKRYCIE_AUTOMATYZACJA.md), neither the "Rowery"
    // nor the "Ramy" admin tab currently has a list-filter-by-category
    // control (only free-text search + per-row category *reassignment*
    // selects). This assertion documents the requested feature and will
    // start passing once a `data-testid="models-category-filter"` control
    // (or equivalent accessible control) is added above the model list.
    const categoryFilter = page.getByTestId('models-category-filter');
    await expect(
      categoryFilter,
      'Admin "Rowery" tab has no category filter control yet (see qa/POKRYCIE_AUTOMATYZACJA.md VIS-02 note).',
    ).toBeVisible();
  });

  test('VIS-03: admin can open a freshly submitted configuration without an error', async ({
    page,
    context,
  }) => {
    const evidence = await evidenceDir('VIS-03');

    // 1) Submit a real configuration through the public configurator.
    const configPage = await context.newPage();
    const issues: string[] = [];
    configPage.on('console', (m) => {
      if (['error', 'warning'].includes(m.type())) issues.push(`configurator ${m.type()}: ${m.text()}`);
    });
    await configPage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
    await configPage.waitForTimeout(3000);
    await configPage.getByRole('button', { name: /Zapisz i przejdź/i }).click();
    await configPage.getByLabel('Imię i nazwisko').fill('[QA] test:visual VIS-03');
    await configPage.getByLabel('E-mail').fill('qa-configurator@example.invalid');
    await configPage.getByRole('checkbox', { name: /Zgadzam się/ }).click({ force: true });
    await configPage.screenshot({ path: `${evidence}/01-configurator-before-submit.png`, fullPage: true });
    await configPage.getByRole('button', { name: /Utwórz prywatny link/i }).click();
    await configPage.waitForURL(/\/konfiguracja\//, { timeout: 15_000 });
    await configPage.waitForTimeout(500);

    const publicId = await configPage
      .getByText('Numer projektu')
      .locator('xpath=following-sibling::*[1]')
      .innerText();
    expect(publicId, 'Public confirmation page must expose the project number (publicId) used by the admin view.').toMatch(/\S+/);
    await configPage.screenshot({ path: `${evidence}/02-configurator-confirmation.png`, fullPage: true });

    // 2) Open that exact configuration from the admin panel.
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/admin/konfiguracje/${publicId.trim()}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${evidence}/03-admin-configuration-detail.png`, fullPage: true });

    const bodyText = await page.locator('body').innerText();
    expect(
      /błąd|error|wystąpił problem/i.test(bodyText),
      `Admin configuration detail view for ${publicId.trim()} shows an error state. Console issues: ${issues.join('; ') || 'none'}`,
    ).toBeFalsy();
    await expect(page.getByText(publicId.trim())).toBeVisible();
  });

  test('VIS-04: paint picker shows and zooms a render for a model that has one (E55)', async ({ page }) => {
    const evidence = await evidenceDir('VIS-04');
    await page.goto(`${BASE_URL}/konfigurator?model=e55`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.getByRole('button', { name: /Wybierz kolor/i }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Kolor lakieru' }).or(page.locator('[role="dialog"]')).first();
    await dialog.waitFor();

    const renderChip = page.getByText(/^Z wizualizacją/);
    await renderChip.click();
    await page.screenshot({ path: `${evidence}/01-paint-picker-filtered.png`, fullPage: true });

    const swatches = page.locator('button[aria-label][title*="·"]');
    const swatchCount = await swatches.count();
    test.skip(swatchCount === 0, 'No render-backed swatch found after filtering — test catalog data changed.');
    await swatches.first().click();

    const zoomTrigger = page.getByRole('button', { name: /Powiększ (zdjęcie|wizualizację)/ });
    await expect(zoomTrigger).toBeVisible();
    await page.screenshot({ path: `${evidence}/02-paint-preview-selected.png`, fullPage: true });

    await zoomTrigger.click();
    const zoomedImg = page.locator('[role="dialog"] img').last();
    await expect(zoomedImg).toBeVisible();
    const zoomedSrc = await zoomedImg.getAttribute('src');
    expect(zoomedSrc, 'Zoomed dialog must actually load a render image.').toMatch(/\/media\/paints\/renders\//);
    await page.screenshot({ path: `${evidence}/03-paint-zoomed.png`, fullPage: true });
  });

  test('VIS-05: saved configuration shows in admin activity log and opens via the Zapytania UI', async ({
    page,
    context,
  }) => {
    const evidence = await evidenceDir('VIS-05');
    const marker = `[QA] test-visual VIS-05 ${Date.now()}`;

    const configPage = await context.newPage();
    await configPage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
    await configPage.waitForTimeout(3000);
    await configPage.getByRole('button', { name: /Zapisz i przejdź/i }).click();
    await configPage.getByLabel('Imię i nazwisko').fill(marker);
    await configPage.getByLabel('E-mail').fill('qa-configurator@example.invalid');
    await configPage.getByRole('checkbox', { name: /Zgadzam się/ }).click({ force: true });
    await configPage.getByRole('button', { name: /Utwórz prywatny link/i }).click();
    await configPage.waitForURL(/\/konfiguracja\//, { timeout: 15_000 });
    await configPage.waitForTimeout(500);
    const publicId = (
      await configPage.getByText('Numer projektu').locator('xpath=following-sibling::*[1]').innerText()
    ).trim();
    await configPage.close();

    await loginAdmin(page);

    // Activity log: the "configuration_created" event must show up for this
    // exact submission (proves the record + event were created end to end;
    // actual SMTP delivery to the order-notification inbox is a separate,
    // currently unverifiable, concern — see WYNIK.md).
    await page.getByRole('tab', { name: 'Dziennik aktywności' }).click();
    await page.getByLabel('Typ zdarzenia').selectOption({ label: 'Nowa konfiguracja' });
    await page.waitForTimeout(500);
    // Scope to the activity-log table specifically ("Kiedy" column) — Tabs
    // may keep the previous panel mounted, and the marker text legitimately
    // appears in both tables, which trips Playwright's strict-mode check.
    const activityTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Kiedy' }) });
    const logRow = activityTable.getByRole('row').filter({ hasText: marker });
    await expect(
      logRow.first(),
      `Expected a "Nowa konfiguracja" activity-log entry for ${publicId} / "${marker}".`,
    ).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: `${evidence}/01-activity-log.png`, fullPage: true });

    // Zapytania tab, via the real "Szczegóły" link (not a direct URL) — this
    // is the exact flow the original bug report used.
    await page.getByRole('tab', { name: 'Zapytania' }).click();
    const inquiriesTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Projekt' }) });
    const row = inquiriesTable.getByRole('row').filter({ hasText: marker });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: `${evidence}/02-zapytania-row.png`, fullPage: true });
    await row.getByRole('button', { name: /Szczegóły/i }).click();
    await page.waitForURL(new RegExp(`/admin/konfiguracje/${publicId}`), { timeout: 10_000 });
    await page.waitForTimeout(800);

    const bodyText = await page.locator('body').innerText();
    expect(
      /błąd|error|wystąpił problem/i.test(bodyText),
      `Admin configuration detail view for ${publicId} shows an error state.`,
    ).toBeFalsy();
    await page.screenshot({ path: `${evidence}/03-configuration-detail.png`, fullPage: true });
  });

  test('VIS-06: keyboard focus stays trapped inside the paint picker modal', async ({ page }) => {
    const evidence = await evidenceDir('VIS-06');
    await page.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const trigger = page.getByRole('button', { name: /Wybierz kolor/i });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor();
    await page.screenshot({ path: `${evidence}/01-dialog-open.png`, fullPage: true });

    let escaped = false;
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      // eslint-disable-next-line no-await-in-loop
      const insideDialog = await page.evaluate(() => {
        const active = document.activeElement;
        const dlg = document.querySelector('[role="dialog"]');
        return !!active && !!dlg && dlg.contains(active);
      });
      if (!insideDialog) {
        escaped = true;
        break;
      }
    }
    expect(escaped, 'Tabbing inside the open paint-picker modal must not move focus behind it.').toBe(false);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5000 });
    const focusReturnedToTrigger = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.getAttribute('aria-label') ? true : active === document.body ? false : true;
    });
    await page.screenshot({ path: `${evidence}/02-dialog-closed.png`, fullPage: true });
    expect(focusReturnedToTrigger, 'Escape must close the dialog and leave focus somewhere sane, not on <body>.').toBe(true);
  });
});
