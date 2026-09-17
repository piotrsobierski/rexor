import { expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export const BASE_URL = (process.env.BASE_URL ?? 'https://rexor.sobierski.com').replace(/\/$/, '');
export const API_BASE = process.env.API_BASE_URL ?? `${BASE_URL}/api`;
export const EVIDENCE_ROOT = resolve(
  __dirname,
  '../../evidence',
  new Date().toISOString().slice(0, 10),
  'test',
);

export function requiredAdminCredentials() {
  const { QA_ADMIN_EMAIL: email, QA_ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) {
    throw new Error('Set QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD before running test:visual.');
  }
  return { email, password };
}

export async function evidenceDir(id: string) {
  const dir = resolve(EVIDENCE_ROOT, id);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function loginAdmin(page: Page) {
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

export async function fetchPublicPageHtml(slug: string): Promise<string | null> {
  const response = await fetch(`${API_BASE}/pages/${slug}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GET /pages/${slug} failed: ${response.status}`);
  const data = (await response.json()) as { page: { content_html: string } };
  return data.page.content_html;
}

/** Save can lag slightly behind the public read -- poll instead of a single check. */
export async function waitForPublicPageContent(
  slug: string,
  predicate: (html: string) => boolean,
  timeoutMs = 10_000,
) {
  const deadline = Date.now() + timeoutMs;
  let lastHtml: string | null = null;
  while (Date.now() < deadline) {
    lastHtml = await fetchPublicPageHtml(slug);
    if (lastHtml !== null && predicate(lastHtml)) return lastHtml;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 500));
  }
  return lastHtml;
}

/**
 * Root cause found (confirmed with a 5x repro, 5/5 hits) of what looked like
 * a cross-session DB race corrupting the "Serwis" page: PagesEditor mounts
 * defaulting to `pages[0]`, which is "Kontakt" (site_pages query is
 * `ORDER BY navigation_label`, alphabetically first) -- clicking "Serwis"
 * right after opening the "Strony" tab, then immediately reading the
 * editor's innerHTML, reliably captures *Kontakt's* still-on-screen
 * placeholder content, because the click only dispatches a React state
 * update; the editor DOM doesn't repaint to the new page until a later
 * effect flushes. `editor.waitFor()` doesn't help -- the contenteditable
 * node already exists (same instance, reused across page switches). Waiting
 * for the panel heading to actually say "Strona: <label>" before reading
 * anything closes the gap.
 */
export async function selectSitePage(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('heading', { name: `Strona: ${label}` }).waitFor({ timeout: 10_000 });
  // The heading text updates one render ahead of the editor's own DOM-sync
  // effect (WysiwygEditor's useEffect on its `content` prop) -- confirmed by
  // this still occasionally reading Kontakt's placeholder right after the
  // heading above already said "Strona: <label>". Poll the editor itself,
  // not just the heading, before trusting its content.
  if (label !== 'Kontakt') {
    const editor = page.locator('[contenteditable=true]').first();
    await expect(
      editor,
      `Editor never repainted away from the "Kontakt" placeholder after selecting "${label}".`,
    ).not.toContainText('Uzupełnij dane w nawiasach kwadratowych', { timeout: 10_000 });
  }
}

/**
 * Restoring a page's content by mutating the live editor's DOM and clicking
 * Save (in the same session that just saved the test edit) was unreliable:
 * once caught it saving stale/wrong content while the on-screen editor still
 * *looked* like the right page was selected -- some race between the first
 * save's `loadCatalog()` re-render and our follow-up DOM mutation. A full
 * page reload gets a clean React tree with no leftover closures before we
 * write the original HTML back, which has been reliable in repeated runs.
 */
export async function restorePageContent(
  page: Page,
  evidence: string,
  pageLabel: string,
  pageSlug: string,
  originalHtml: string,
) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Modele i zdjęcia' }).waitFor({ timeout: 15_000 });
  await page.getByRole('tab', { name: 'Strony' }).click();
  await selectSitePage(page, pageLabel);

  const editor = page.locator('[contenteditable=true]').first();
  await editor.waitFor();
  await editor.evaluate((el, html) => {
    el.innerHTML = html;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, originalHtml);
  const restoredHtml = await editor.innerHTML();
  expect(restoredHtml, 'The editor must actually hold the original HTML right before we save it back.').toBe(
    originalHtml,
  );

  const restoreSaveButton = page.getByRole('button', { name: /Zapisz stronę/ });
  await restoreSaveButton.scrollIntoViewIfNeeded();
  await restoreSaveButton.click();
  await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.', { timeout: 10_000 });
  await page.screenshot({ path: `${evidence}/restored.png`, fullPage: true });

  const publicHtml = await waitForPublicPageContent(pageSlug, (html) => html === originalHtml);
  expect(publicHtml, 'The public page must show the exact original content again after restoring.').toBe(
    originalHtml,
  );
}

export async function fetchModelBySlug(slug: string) {
  const response = await fetch(`${API_BASE}/catalog`);
  if (!response.ok) throw new Error(`GET /catalog failed: ${response.status}`);
  const data = (await response.json()) as { models: Array<Record<string, unknown>> };
  const model = data.models.find((m) => String(m.slug) === slug);
  if (!model) throw new Error(`Model with slug "${slug}" not found in /catalog`);
  return model as { id: number; slug: string; name: string; categorySlug?: string };
}
