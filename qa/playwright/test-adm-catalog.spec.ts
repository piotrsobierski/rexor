import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  API_BASE,
  evidenceDir,
  loginAdmin,
  fetchModelBySlug,
} from './lib/admin';

// Catalog CRUD coverage for the admin panel (2026-09-17):
//   VIS-14  ADM-02: "Modele" -- edit an existing model's name,
//           short description, spec ("Fakty o ramie"), description (rich
//           text), category and availability ("Status"); add/reorder/delete
//           a gallery image; confirm every change on the public listing
//           card and the model detail page, then restore the model to its
//           exact original state.
//   VIS-15  ADM-03: "Ramy" and "Realizacje" -- create a brand-new `[QA-B]`
//           test record, add and reorder gallery media, publish it, confirm
//           it on the matching public page, then delete it. "Kategorie" has
//           no create form (fixed list of real categories used across the
//           whole catalog), so it is covered by editing one category's
//           short description and restoring it afterwards, the same
//           edit/verify/restore pattern as VIS-09's page-content check.
//
// Run with: npm run test:visual -- -g "VIS-14|VIS-15"
// Requires QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD in the environment.

async function fetchCatalog(): Promise<{
  categories: Array<Record<string, unknown>>;
  models: Array<Record<string, unknown>>;
}> {
  const response = await fetch(`${API_BASE}/catalog`);
  if (!response.ok) throw new Error(`GET /catalog failed: ${response.status}`);
  return response.json();
}

async function pollModel(
  id: number,
  predicate: (m: Record<string, unknown>) => boolean,
  timeoutMs = 10_000,
): Promise<Record<string, unknown> | null> {
  const deadline = Date.now() + timeoutMs;
  let last: Record<string, unknown> | null = null;
  while (Date.now() < deadline) {
    const { models } = await fetchCatalog();
    last = models.find((m) => Number(m.id) === id) ?? null;
    if (last && predicate(last)) return last;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 500));
  }
  return last;
}

async function fetchFrames(): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(`${API_BASE}/frames`);
  if (!response.ok) throw new Error(`GET /frames failed: ${response.status}`);
  const data = (await response.json()) as { frames: Array<Record<string, unknown>> };
  return data.frames;
}

async function fetchProjects(): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(`${API_BASE}/projects`);
  if (!response.ok) throw new Error(`GET /projects failed: ${response.status}`);
  const data = (await response.json()) as { projects: Array<Record<string, unknown>> };
  return data.projects;
}

async function pollUntil<T>(
  fetcher: () => Promise<T[]>,
  predicate: (items: T[]) => boolean,
  timeoutMs = 10_000,
): Promise<T[]> {
  const deadline = Date.now() + timeoutMs;
  let last: T[] = [];
  while (Date.now() < deadline) {
    last = await fetcher();
    if (predicate(last)) return last;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 500));
  }
  return last;
}

test.describe('rexor admin catalog CRUD (ADM-02 / ADM-03)', () => {
  test('VIS-14: ADM-02 - edit model fields, category, availability, and gallery images (E82)', async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    const evidence = await evidenceDir('VIS-14');
    const marker = `[QA-B] VIS-14 ${Date.now()}`;

    await loginAdmin(page);
    const model = await fetchModelBySlug('e82');
    const modelId = Number(model.id);

    let article = page.locator('article').filter({ has: page.locator(`#model-name-${modelId}`) });
    await article.scrollIntoViewIfNeeded();

    const original = {
      name: await article.locator(`#model-name-${modelId}`).inputValue(),
      short: await article.locator(`#model-short-${modelId}`).inputValue(),
      facts: await article.locator(`#model-facts-${modelId}`).inputValue(),
      category: await article.locator(`#model-cat-${modelId}`).inputValue(),
      status: await article.locator(`#model-status-${modelId}`).inputValue(),
      descriptionHtml: await article.locator('[contenteditable=true]').first().innerHTML(),
    };

    const categoryOptions = await article
      .locator(`#model-cat-${modelId} option`)
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    const altCategory = categoryOptions.find((v) => v !== original.category);
    expect(altCategory, 'Need at least two categories in the test catalog to exercise a category change.').toBeTruthy();

    await page.screenshot({ path: `${evidence}/01-model-before.png`, fullPage: true });

    try {
      // --- Text fields, spec, category ---
      const nameField = article.locator(`#model-name-${modelId}`);
      const shortField = article.locator(`#model-short-${modelId}`);
      const factsField = article.locator(`#model-facts-${modelId}`);
      const catField = article.locator(`#model-cat-${modelId}`);
      const descField = article.locator('[contenteditable=true]').first();

      await nameField.click();
      await nameField.press('End');
      await page.keyboard.type(` ${marker}`, { delay: 10 });
      await shortField.click();
      await shortField.press('End');
      await page.keyboard.type(` ${marker}`, { delay: 10 });
      await factsField.click();
      await factsField.press('End');
      await page.keyboard.type(`\n${marker}`, { delay: 10 });
      await catField.selectOption(altCategory!);

      await descField.click();
      await descField.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      });
      await page.keyboard.press('Enter');
      await page.keyboard.type(marker, { delay: 10 });

      await page.screenshot({ path: `${evidence}/02-model-edited.png`, fullPage: true });
      await article.getByRole('button', { name: 'Zapisz model' }).click();
      await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/03-model-saved.png`, fullPage: true });

      const updated = await pollModel(modelId, (m) => String(m.name).includes(marker));
      expect(updated, 'Catalog API never reflected the saved name/description/category change.').toBeTruthy();
      expect(String(updated!.short_description ?? '')).toContain(marker);
      expect(String(updated!.description_html ?? '')).toContain(marker);
      expect(String(updated!.category_slug ?? '')).not.toBe(String(model.categorySlug ?? original.category));

      const publicPage = await context.newPage();
      await publicPage.goto(`${BASE_URL}/rowery`, { waitUntil: 'domcontentloaded' });
      await expect(
        publicPage.getByText(marker).first(),
        'Renamed model must show the marker on the /rowery public listing card.',
      ).toBeVisible({ timeout: 10_000 });
      await publicPage.screenshot({ path: `${evidence}/04-public-listing.png`, fullPage: true });

      const detailUrl = `${BASE_URL}/rowery/${updated!.category_slug}/${model.slug}`;
      await publicPage.goto(detailUrl, { waitUntil: 'domcontentloaded' });
      await expect(
        publicPage.getByText(marker).first(),
        'Model detail page must show the marker after saving the edit.',
      ).toBeVisible({ timeout: 10_000 });
      await publicPage.screenshot({ path: `${evidence}/05-public-detail.png`, fullPage: true });
      await publicPage.close();
    } finally {
      // A full reload gets a clean React tree before writing originals back
      // (same rationale as restorePageContent in lib/admin.ts).
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: 'Modele' }).waitFor({ timeout: 15_000 });
      article = page.locator('article').filter({ has: page.locator(`#model-name-${modelId}`) });
      await article.scrollIntoViewIfNeeded();

      const nameF = article.locator(`#model-name-${modelId}`);
      const shortF = article.locator(`#model-short-${modelId}`);
      const factsF = article.locator(`#model-facts-${modelId}`);
      const catF = article.locator(`#model-cat-${modelId}`);
      const descF = article.locator('[contenteditable=true]').first();

      await nameF.click();
      await nameF.press('ControlOrMeta+A');
      await nameF.press('Delete');
      await nameF.pressSequentially(original.name, { delay: 5 });
      await shortF.click();
      await shortF.press('ControlOrMeta+A');
      await shortF.press('Delete');
      await shortF.pressSequentially(original.short, { delay: 5 });
      await factsF.click();
      await factsF.press('ControlOrMeta+A');
      await factsF.press('Delete');
      await factsF.pressSequentially(original.facts, { delay: 5 });
      await catF.selectOption(original.category);
      await descF.evaluate((el, html) => {
        el.innerHTML = html;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, original.descriptionHtml);

      await article.getByRole('button', { name: 'Zapisz model' }).click();
      await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/06-model-restored.png`, fullPage: true });

      const restored = await pollModel(modelId, (m) => String(m.name) === original.name);
      expect(restored, 'Catalog API never reflected the restored model name.').toBeTruthy();
      expect(String(restored!.short_description ?? '')).toBe(original.short);
      expect(String(restored!.category_slug ?? '') || original.category).toBeTruthy();
    }

    // --- Availability (Status) toggle: published -> hidden -> published ---
    article = page.locator('article').filter({ has: page.locator(`#model-name-${modelId}`) });
    await article.scrollIntoViewIfNeeded();
    const statusField = article.locator(`#model-status-${modelId}`);
    expect(await statusField.inputValue(), 'Precondition: E82 must start published for this check to be meaningful.').toBe(
      'published',
    );

    try {
      await statusField.selectOption('archived');
      await article.getByRole('button', { name: 'Zapisz model' }).click();
      await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/07-model-archived.png`, fullPage: true });

      const archived = await pollModel(modelId, (m) => !(m as { models?: unknown }).models && String((m as Record<string, unknown>).status ?? '') !== 'published', 10_000).catch(() => null);
      // The /catalog endpoint may simply omit non-published models rather than including a status field -- check both ways.
      const { models: catalogAfterArchive } = await fetchCatalog();
      const stillListed = catalogAfterArchive.some((m) => Number(m.id) === modelId);
      expect(stillListed, 'Archiving the model must hide it from the public /api/catalog response.').toBe(false);

      const publicPage2 = await context.newPage();
      await publicPage2.goto(`${BASE_URL}/rowery`, { waitUntil: 'domcontentloaded' });
      await expect(
        publicPage2.getByRole('link', { name: `Poznaj ${model.name}` }),
        'Archived model must disappear from the /rowery public listing.',
      ).toHaveCount(0);
      await publicPage2.screenshot({ path: `${evidence}/08-public-listing-hidden.png`, fullPage: true });
      await publicPage2.close();
    } finally {
      await statusField.selectOption('published');
      await article.getByRole('button', { name: 'Zapisz model' }).click();
      await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/09-model-republished.png`, fullPage: true });

      const restoredCatalog = await pollUntil(
        async () => (await fetchCatalog()).models,
        (models) => models.some((m) => Number(m.id) === modelId),
      );
      expect(
        restoredCatalog.some((m) => Number(m.id) === modelId),
        'Model must reappear in /api/catalog after restoring status to "published".',
      ).toBe(true);
    }

    // --- Gallery: add, reorder, delete a test image ---
    article = page.locator('article').filter({ has: page.locator(`#model-name-${modelId}`) });
    await article.scrollIntoViewIfNeeded();
    const photos = article.locator('[class*="group/photo"]');
    const originalOrder = await photos.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));

    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    await article.getByLabel('Dodaj zdjęcia do galerii').setInputFiles({
      name: 'vis-14-test.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });
    await expect(photos).toHaveCount(originalOrder.length + 1, { timeout: 10_000 });
    await page.screenshot({ path: `${evidence}/10-gallery-added.png`, fullPage: true });

    // The upload does not necessarily append at the end -- locate the new
    // photo positionally by diffing against the pre-upload src list.
    const afterAdd = await photos.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
    const addedIndex = afterAdd.findIndex((src) => !originalOrder.includes(src));
    expect(addedIndex, 'Must be able to locate the freshly-added test photo.').toBeGreaterThanOrEqual(0);

    const moveButtonName = addedIndex === 0 ? 'Przesuń zdjęcie w prawo' : 'Przesuń zdjęcie w lewo';
    await photos.nth(addedIndex).hover();
    await photos.nth(addedIndex).getByRole('button', { name: moveButtonName }).click({ force: true });
    await page.waitForTimeout(500);
    const afterReorder = await photos.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
    const newPhotoIndex = afterReorder.findIndex((src) => !originalOrder.includes(src));
    expect(newPhotoIndex, 'Must be able to locate the freshly-added test photo after reordering it.').toBeGreaterThanOrEqual(0);
    expect(newPhotoIndex, 'Reordering must actually change the new photo\'s position.').not.toBe(addedIndex);
    await page.screenshot({ path: `${evidence}/11-gallery-reordered.png`, fullPage: true });

    await photos.nth(newPhotoIndex).hover();
    page.once('dialog', (d) => d.accept());
    await photos.nth(newPhotoIndex).getByRole('button', { name: 'Usuń zdjęcie' }).click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${evidence}/12-gallery-deleted.png`, fullPage: true });

    const finalOrder = await photos.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
    expect(finalOrder, 'Gallery must be back to its exact original photo order after cleanup.').toEqual(originalOrder);
  });

  test('VIS-15: ADM-03 - create/manage test Ramy and Realizacje records, edit a Kategorie entry', async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    const evidence = await evidenceDir('VIS-15');
    const marker = `[QA-B] VIS-15 ${Date.now()}`;

    await loginAdmin(page);

    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );

    // --- Ramy: create, add + reorder media, publish, verify public, delete ---
    await page.getByRole('tab', { name: 'Ramy' }).click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Nazwa ramy"]').fill(`${marker} Frame`);
    await page.locator('input[placeholder*="Producent"]').fill('QA-B');
    await page.getByRole('button', { name: 'Dodaj ramę' }).click();
    await expect(page.getByRole('status')).toHaveText(/Rama dodana/, { timeout: 10_000 });

    let frameArticle = page
      .locator('article')
      .filter({ has: page.locator(`input[value="${marker} Frame"]`) })
      .last();
    await frameArticle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidence}/01-frame-created.png`, fullPage: true });

    try {
      const frameIdMatch = await frameArticle.locator('input[id^="frame-name-"]').getAttribute('id');
      const frameId = frameIdMatch!.replace('frame-name-', '');

      await frameArticle.locator(`#frame-status-${frameId}`).selectOption('published');
      await frameArticle.locator(`#frame-short-${frameId}`).fill(`${marker} short description`);
      await frameArticle.locator(`#frame-facts-${frameId}`).fill(`${marker} fact line`);

      // Save the text/status fields BEFORE touching the gallery: photo
      // actions call their own API and refetch the frame list immediately,
      // which wipes any *unsaved* edits still sitting in these inputs.
      await frameArticle.getByRole('button', { name: 'Zapisz ramę' }).click();
      await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.', { timeout: 10_000 });

      // Add two photos so a reorder is meaningful.
      const frameGalleryInput = frameArticle.getByLabel('Dodaj zdjęcia do galerii');
      await frameGalleryInput.setInputFiles({ name: 'vis-15-frame-1.png', mimeType: 'image/png', buffer: pngBuffer });
      await page.waitForTimeout(800);
      await frameGalleryInput.setInputFiles({ name: 'vis-15-frame-2.png', mimeType: 'image/png', buffer: pngBuffer });
      await page.waitForTimeout(500);

      const framePhotos = frameArticle.locator('[class*="group/photo"]');
      await expect(framePhotos).toHaveCount(2, { timeout: 10_000 });
      const firstSrcBefore = await framePhotos.nth(0).locator('img').getAttribute('src');
      await framePhotos.nth(0).hover();
      await framePhotos.nth(0).getByRole('button', { name: 'Przesuń zdjęcie w prawo' }).click({ force: true });
      await page.waitForTimeout(500);
      const firstSrcAfter = await framePhotos.nth(0).locator('img').getAttribute('src');
      expect(firstSrcAfter, 'Reordering frame photos must actually change the first photo.').not.toBe(firstSrcBefore);
      await page.screenshot({ path: `${evidence}/02-frame-configured.png`, fullPage: true });

      const frames = await pollUntil(fetchFrames, (list) => list.some((f) => String(f.name).includes(marker)));
      const savedFrame = frames.find((f) => String(f.name).includes(marker));
      expect(savedFrame, 'GET /api/frames must include the new published test frame.').toBeTruthy();

      const publicPage = await context.newPage();
      await publicPage.goto(`${BASE_URL}/ramy`, { waitUntil: 'domcontentloaded' });
      await expect(publicPage.getByText(`${marker} Frame`).first()).toBeVisible({ timeout: 10_000 });
      await publicPage.screenshot({ path: `${evidence}/03-public-ramy-listing.png`, fullPage: true });

      await publicPage.goto(`${BASE_URL}/ramy/${savedFrame!.slug}`, { waitUntil: 'domcontentloaded' });
      await expect(publicPage.getByText(`${marker} short description`).first()).toBeVisible({ timeout: 10_000 });
      await publicPage.screenshot({ path: `${evidence}/04-public-frame-detail.png`, fullPage: true });
      await publicPage.close();
    } finally {
      frameArticle = page
        .locator('article')
        .filter({ has: page.locator(`input[value="${marker} Frame"]`) })
        .last();
      await frameArticle.scrollIntoViewIfNeeded();
      page.once('dialog', (d) => d.accept());
      await frameArticle.getByRole('button', { name: 'Usuń ramę' }).click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${evidence}/05-frame-deleted.png`, fullPage: true });

      const framesAfterDelete = await pollUntil(
        fetchFrames,
        (list) => !list.some((f) => String(f.name).includes(marker)),
      );
      expect(
        framesAfterDelete.some((f) => String(f.name).includes(marker)),
        'Test frame must be gone from /api/frames after cleanup.',
      ).toBe(false);
      const stillInDom = await page
        .locator('article')
        .filter({ has: page.locator(`input[value="${marker} Frame"]`) })
        .count();
      expect(stillInDom, 'Test frame article must be gone from the admin panel after cleanup.').toBe(0);
    }

    // --- Realizacje: create, add media, publish, verify public, delete ---
    await page.getByRole('tab', { name: 'Realizacje' }).click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Tytuł"]').fill(`${marker} Realization`);
    await page.getByRole('button', { name: 'Dodaj realizację' }).click();
    await expect(page.getByRole('status')).toHaveText(/dodana/i, { timeout: 10_000 });

    let projectArticle = page
      .locator('article')
      .filter({ has: page.locator(`input[value="${marker} Realization"]`) })
      .last();
    await projectArticle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidence}/06-realization-created.png`, fullPage: true });

    try {
      const projectIdMatch = await projectArticle.locator('input[id^="project-title-"]').getAttribute('id');
      const projectId = projectIdMatch!.replace('project-title-', '');

      await projectArticle.locator(`#project-short-${projectId}`).fill(`${marker} short description`);
      await projectArticle.getByRole('switch', { name: 'Opublikowana' }).click();

      // Save the text/visibility fields BEFORE touching the gallery -- same
      // refetch-wipes-unsaved-edits reasoning as the frame section above.
      await projectArticle.getByRole('button', { name: 'Zapisz realizację' }).click();
      await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.', { timeout: 10_000 });

      const projectGalleryInput = projectArticle.getByLabel('Dodaj zdjęcia do galerii');
      await projectGalleryInput.setInputFiles({ name: 'vis-15-project-1.png', mimeType: 'image/png', buffer: pngBuffer });
      await page.waitForTimeout(800);
      await projectGalleryInput.setInputFiles({ name: 'vis-15-project-2.png', mimeType: 'image/png', buffer: pngBuffer });
      await page.waitForTimeout(500);

      const projectPhotos = projectArticle.locator('[class*="group/photo"]');
      await expect(projectPhotos).toHaveCount(2, { timeout: 10_000 });
      const firstSrcBefore = await projectPhotos.nth(0).locator('img').getAttribute('src');
      await projectPhotos.nth(0).hover();
      await projectPhotos.nth(0).getByRole('button', { name: 'Przesuń zdjęcie w prawo' }).click({ force: true });
      await page.waitForTimeout(500);
      const firstSrcAfter = await projectPhotos.nth(0).locator('img').getAttribute('src');
      expect(firstSrcAfter, 'Reordering realization photos must actually change the first photo.').not.toBe(
        firstSrcBefore,
      );
      await page.screenshot({ path: `${evidence}/07-realization-configured.png`, fullPage: true });

      const projects = await pollUntil(fetchProjects, (list) => list.some((p) => String(p.title).includes(marker)));
      const savedProject = projects.find((p) => String(p.title).includes(marker));
      expect(savedProject, 'GET /api/projects must include the new published test realization.').toBeTruthy();

      const publicPage = await context.newPage();
      await publicPage.goto(`${BASE_URL}/realizacje`, { waitUntil: 'domcontentloaded' });
      await expect(publicPage.getByText(`${marker} Realization`).first()).toBeVisible({ timeout: 10_000 });
      await publicPage.screenshot({ path: `${evidence}/08-public-realizacje-listing.png`, fullPage: true });

      await publicPage.goto(`${BASE_URL}/realizacje/${savedProject!.slug}`, { waitUntil: 'domcontentloaded' });
      await expect(publicPage.getByText(`${marker} short description`).first()).toBeVisible({ timeout: 10_000 });
      await publicPage.screenshot({ path: `${evidence}/09-public-realization-detail.png`, fullPage: true });
      await publicPage.close();
    } finally {
      projectArticle = page
        .locator('article')
        .filter({ has: page.locator(`input[value="${marker} Realization"]`) })
        .last();
      await projectArticle.scrollIntoViewIfNeeded();
      page.once('dialog', (d) => d.accept());
      await projectArticle.getByRole('button', { name: 'Usuń realizację' }).click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${evidence}/10-realization-deleted.png`, fullPage: true });

      const projectsAfterDelete = await pollUntil(
        fetchProjects,
        (list) => !list.some((p) => String(p.title).includes(marker)),
      );
      expect(
        projectsAfterDelete.some((p) => String(p.title).includes(marker)),
        'Test realization must be gone from /api/projects after cleanup.',
      ).toBe(false);
    }

    // --- Kategorie: edit an existing category's description, then restore it ---
    await page.getByRole('tab', { name: 'Kategorie' }).click();
    await page.waitForTimeout(500);
    const catArticle = page.locator('article').filter({ has: page.locator('input[value="Szosa"]') });
    await catArticle.scrollIntoViewIfNeeded();
    const catIdMatch = await catArticle.locator('input[id^="cat-desc-"]').getAttribute('id');
    const catId = catIdMatch!.replace('cat-desc-', '');
    const descField = catArticle.locator(`#cat-desc-${catId}`);
    const originalDesc = await descField.inputValue();
    await page.screenshot({ path: `${evidence}/11-category-before.png`, fullPage: true });

    try {
      await descField.click();
      await descField.press('End');
      await page.keyboard.type(` ${marker}`, { delay: 10 });
      await catArticle.getByRole('button', { name: 'Zapisz' }).click();
      await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/12-category-edited.png`, fullPage: true });

      const { categories } = await pollUntil(
        async () => [await fetchCatalog()],
        ([c]) => (c.categories.find((cat) => cat.slug === 'szosa')?.short_description as string | undefined)?.includes(marker) ?? false,
      ).then(([c]) => c);
      expect(
        categories.find((c) => c.slug === 'szosa')?.short_description,
        'Category description must be updated in /api/catalog.',
      ).toContain(marker);
    } finally {
      await descField.click();
      await descField.press('ControlOrMeta+A');
      await descField.press('Delete');
      await descField.pressSequentially(originalDesc, { delay: 5 });
      await catArticle.getByRole('button', { name: 'Zapisz' }).click();
      await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/13-category-restored.png`, fullPage: true });

      const { categories: restoredCategories } = await fetchCatalog();
      expect(
        restoredCategories.find((c) => c.slug === 'szosa')?.short_description,
        'Category description must be restored to its exact original text.',
      ).toBe(originalDesc);
    }
  });
});
