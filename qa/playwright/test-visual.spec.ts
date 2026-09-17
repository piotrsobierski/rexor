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
});
