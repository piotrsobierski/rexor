import { test, expect } from '@playwright/test';
import { requiredMailboxCredentials, openMailbox, waitForMail } from './lib/mailbox';
import { BASE_URL, API_BASE, evidenceDir, loginAdmin } from './lib/admin';

// Coverage for the three global-settings scenarios from
// qa/SCENARIUSZE_TESTOWE.md that no other spec touches (2026-09-17):
//   VIS-19  ADM-08: "Kolory" (branding/theme) — change one previously-agreed
//           accent color, confirm it reaches the public site's injected
//           <style>, check desktop + mobile, then restore byte-for-byte.
//   VIS-20  ADM-09: "Chatbot AI" (round-trips existing text, no destructive
//           edit needed) + "Poczta" — email-format validation on the
//           order/contact/service addresses, the confirmation-email
//           template's non-empty validation, and (only with
//           QA_MAILBOX_EMAIL/QA_MAILBOX_PASSWORD set — skipped like VIS-07
//           otherwise) an actual order-notification send to the test
//           mailbox, verifying subject AND body (model, price, marker) —
//           VIS-07 only confirmed the subject/arrival, not the body content.
//   VIS-21  REL-01: the tagged @smoke bundle run after every deploy. Reuses
//           the same helpers/selectors as VIS-01..VIS-13 and the *.cjs
//           scripts instead of re-deriving assertions — see the inline notes
//           on each leg for what it intentionally does NOT re-check in full.
//           Never performs a real configurator submission (so it's safe to
//           run against production too): the CFG-06 leg only exercises the
//           client-side validation block, exactly like
//           `run-configuration-save.cjs` without --create.
//
// "Kolory" / "Chatbot AI" / "Poczta" are singleton settings shared with
// other concurrent QA agents' tabs — every mutating sub-test here captures
// the exact original value first and restores it in a `finally` block.
//
// Run with:
//   QA_ADMIN_EMAIL=... QA_ADMIN_PASSWORD=... npx playwright test \
//     --config qa/playwright/playwright.config.ts -g "VIS-19|VIS-20|VIS-21"

const THEME_FIELD_LABELS: Record<string, string> = {
  background: 'Tło strony',
  foreground: 'Tekst',
  surface: 'Karty',
  muted: 'Tło pomocnicze',
  accent: 'Akcent',
  accentForeground: 'Tekst akcentu',
  border: 'Obramowania',
};

function themeColorInput(page: import('@playwright/test').Page, fieldKey: string) {
  const label = THEME_FIELD_LABELS[fieldKey];
  return page
    .locator('label')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${label}$`) }) })
    .locator('input[type="color"]');
}

async function setColorInput(input: import('@playwright/test').Locator, value: string) {
  await input.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function fetchPublicTheme(): Promise<Record<string, string> | null> {
  const response = await fetch(`${API_BASE}/settings/theme`);
  if (!response.ok) return null;
  const data = (await response.json()) as { theme: Record<string, string> | null };
  return data.theme ?? null;
}

async function waitForPublicTheme(
  predicate: (theme: Record<string, string> | null) => boolean,
  timeoutMs = 10_000,
) {
  const deadline = Date.now() + timeoutMs;
  let last: Record<string, string> | null = null;
  while (Date.now() < deadline) {
    last = await fetchPublicTheme();
    if (predicate(last)) return last;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 400));
  }
  return last;
}

test.describe('rexor admin global settings (Kolory / Chatbot AI / Poczta / smoke)', () => {
  test('VIS-19: ADM-08 branding — accent color change reaches the public site and restores exactly', async ({
    page,
  }) => {
    const evidence = await evidenceDir('VIS-19');
    // Distinct, obviously-synthetic QA test color — never a real brand color,
    // so a screenshot immediately shows whether the change took effect.
    const testAccent = '#ff2d78';

    await loginAdmin(page);
    await page.getByRole('tab', { name: 'Kolory' }).click();
    await page.getByRole('heading', { name: 'Kolorystyka serwisu' }).waitFor({ timeout: 10_000 });

    const accentInput = themeColorInput(page, 'accent');
    await accentInput.waitFor();
    const originalAccent = await accentInput.inputValue();
    expect(originalAccent, 'Accent color must already be a #RRGGBB value before we touch it.').toMatch(/^#[0-9a-f]{6}$/i);
    await page.screenshot({ path: `${evidence}/01-theme-before.png`, fullPage: true });

    try {
      await setColorInput(accentInput, testAccent);
      expect(await accentInput.inputValue()).toBe(testAccent);
      await page.screenshot({ path: `${evidence}/02-theme-form-changed.png`, fullPage: true });

      await page.getByRole('button', { name: 'Zapisz motyw' }).click();
      await expect(page.getByRole('status')).toHaveText('Kolory zapisane w bazie. Odśwież stronę publiczną, aby zobaczyć zmianę.', {
        timeout: 10_000,
      });

      const publicTheme = await waitForPublicTheme((theme) => theme?.accent?.toLowerCase() === testAccent);
      expect(publicTheme?.accent?.toLowerCase(), 'GET /settings/theme must reflect the saved accent color.').toBe(testAccent);

      // Desktop: header + primary buttons use --accent-brand (see
      // theme-runtime.tsx and bike-configurator.tsx's grossBadge pill).
      const desktopPage = await page.context().newPage();
      await desktopPage.setViewportSize({ width: 1440, height: 1000 });
      await desktopPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      // This deployment is a static export (STATIC_EXPORT=1 -- see
      // server-catalog.ts's fetchJson short-circuit), so the SSR
      // <ThemeStyle> <head> injection never fires; ThemeClientRuntime
      // applies the theme client-side instead, as an inline style property
      // on <html> (see theme-client-runtime.tsx). Poll for that, since it's
      // set from a post-mount fetch.
      await expect
        .poll(
          () => desktopPage.evaluate(() => document.documentElement.style.getPropertyValue('--accent-brand')),
          { timeout: 10_000 },
        )
        .toBe(testAccent);
      await desktopPage.screenshot({ path: `${evidence}/03-public-desktop.png`, fullPage: true });
      await desktopPage.close();

      // Mobile viewport + header/nav check, per ADM-08's "widok mobilny" step.
      const mobilePage = await page.context().newPage();
      await mobilePage.setViewportSize({ width: 390, height: 844 });
      await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await expect(mobilePage.locator('header')).toBeVisible();
      await mobilePage.screenshot({ path: `${evidence}/04-public-mobile.png`, fullPage: true });
      await mobilePage.close();
    } finally {
      await accentInput.waitFor();
      await setColorInput(accentInput, originalAccent);
      await expect(accentInput).toHaveValue(originalAccent);
      await page.getByRole('button', { name: 'Zapisz motyw' }).click();
      await expect(page.getByRole('status')).toHaveText(/Kolory zapisane w bazie/, { timeout: 10_000 });
      const restoredTheme = await waitForPublicTheme((theme) => theme?.accent?.toLowerCase() === originalAccent.toLowerCase());
      expect(
        restoredTheme?.accent?.toLowerCase(),
        'The public theme must show the exact original accent color again after restoring.',
      ).toBe(originalAccent.toLowerCase());
      await page.screenshot({ path: `${evidence}/05-theme-restored.png`, fullPage: true });
    }
  });

  test('VIS-20: ADM-09 Chatbot AI text + Poczta address/template validation (+ optional real send)', async ({
    page,
    context,
  }) => {
    // VIS-07 budgets 120s for login + one settings save + submit + a 60s IMAP
    // wait + restore. This test does all of that PLUS the chatbot round-trip
    // and the mail-routing/template validation legs first, so it needs more
    // headroom to still let cleanup run before a hard timeout would skip it.
    test.setTimeout(210_000);
    // Same reasoning as configPage below: unbounded actions can silently eat
    // the whole test timeout instead of failing fast.
    page.setDefaultTimeout(20_000);
    const evidence = await evidenceDir('VIS-20');

    await loginAdmin(page);

    // --- Chatbot AI: use the existing text, round-trip a save with no net
    // change, confirming the editor loads the real live prompt (not a blank
    // default) and a save doesn't corrupt it. No destructive edit needed per
    // the scenario ("zmień tylko tekst testowy lub użyj istniejącego").
    await page.getByRole('tab', { name: 'Chatbot AI' }).click();
    await page.getByRole('heading', { name: 'Chatbot AI (Rexor AI Advisor)' }).waitFor({ timeout: 10_000 });
    const instructionsField = page.locator('#chatbot-instructions');
    await instructionsField.waitFor();
    const originalInstructions = await instructionsField.inputValue();
    expect(originalInstructions.length, 'Chatbot instructions editor must load real content, not be empty.').toBeGreaterThan(0);
    await page.screenshot({ path: `${evidence}/01-chatbot-before.png`, fullPage: true });

    await page.getByRole('button', { name: 'Zapisz prompt chatbota' }).click();
    await expect(page.getByRole('status')).toHaveText(/Prompt chatbota zapisany w bazie/, { timeout: 10_000 });
    await expect(instructionsField).toHaveValue(originalInstructions);
    await page.screenshot({ path: `${evidence}/02-chatbot-saved.png`, fullPage: true });

    // --- Poczta: address validation.
    await page.getByRole('tab', { name: 'Poczta' }).click();
    const orderEmailField = page.locator('#mail-order_email');
    await orderEmailField.waitFor();
    const originalOrderEmail = await orderEmailField.inputValue();
    await page.screenshot({ path: `${evidence}/03-mail-before.png`, fullPage: true });

    try {
      // Invalid address must be rejected server-side (filter_var
      // FILTER_VALIDATE_EMAIL in updateMailRouting) and not persisted.
      await orderEmailField.fill('not-an-email');
      await page.getByRole('button', { name: 'Zapisz adresy' }).click();
      await expect(page.getByRole('status')).toHaveText(/nieprawidłowy/i, { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/04-mail-invalid-rejected.png`, fullPage: true });

      // No public GET for mail routing -- confirm the rejected value never
      // reached the DB by reloading the admin panel itself.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: 'Modele i zdjęcia' }).waitFor({ timeout: 15_000 });
      await page.getByRole('tab', { name: 'Poczta' }).click();
      await expect(orderEmailField).toHaveValue(originalOrderEmail, { timeout: 10_000 });

      // Restore the field to the real value before touching the template
      // editor below (still on the same "Poczta" tab).
      await orderEmailField.fill(originalOrderEmail);
      await page.getByRole('button', { name: 'Zapisz adresy' }).click();
      await expect(page.getByRole('status')).toHaveText('Adresy e-mail zapisane w bazie.', { timeout: 10_000 });

      // --- Poczta: confirmation-email template (subject/body) validation.
      const subjectField = page.locator('#config-mail-subject');
      await subjectField.waitFor();
      const originalSubject = await subjectField.inputValue();
      await page.screenshot({ path: `${evidence}/05-template-before.png`, fullPage: true });

      await subjectField.fill('');
      await page.getByRole('button', { name: 'Zapisz szablon' }).click();
      await expect(page.getByRole('status')).toHaveText(/nie mogą być puste/i, { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/06-template-empty-rejected.png`, fullPage: true });

      await subjectField.fill(originalSubject);
      await page.getByRole('button', { name: 'Zapisz szablon' }).click();
      await expect(page.getByRole('status')).toHaveText('Szablon e-maila zapisany w bazie.', { timeout: 10_000 });
      await expect(subjectField).toHaveValue(originalSubject);
      await page.screenshot({ path: `${evidence}/07-template-restored.png`, fullPage: true });

      // --- Optional: real send to the test mailbox, with consent implied by
      // QA_MAILBOX_EMAIL/QA_MAILBOX_PASSWORD being explicitly set for this
      // run (same convention as VIS-07). Verifies subject AND body content
      // (model name, price, marker) -- VIS-07 only confirmed arrival.
      const mailbox = requiredMailboxCredentials();
      test.skip(!mailbox, 'Set QA_MAILBOX_EMAIL / QA_MAILBOX_PASSWORD to run the real-send leg of ADM-09.');
      if (!mailbox) return;

      const marker = `[QA] test-visual VIS-20 ${Date.now()}`;
      if (originalOrderEmail.trim().toLowerCase() !== mailbox.email.toLowerCase()) {
        await orderEmailField.fill(mailbox.email);
        await page.getByRole('button', { name: 'Zapisz adresy' }).click();
        await expect(page.getByRole('status')).toHaveText('Adresy e-mail zapisane w bazie.', { timeout: 10_000 });
      }

      const configPage = await context.newPage();
      // Playwright actions have no default timeout of their own (0 = "use
      // the whole remaining test budget") -- bound every action on this page
      // so a bad selector fails fast instead of silently eating the mail
      // wait's time margin, which is how a prior run of this test blew past
      // its 210s timeout.
      configPage.setDefaultTimeout(20_000);
      await configPage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
      await configPage.waitForTimeout(3000);
      await configPage.getByRole('button', { name: /Zapisz i przejdź/i }).click();
      await configPage.getByLabel('Imię i nazwisko').fill(marker);
      await configPage.getByLabel('E-mail').fill('qa-configurator@example.invalid');
      await configPage.getByRole('checkbox', { name: /Zgadzam się/ }).click({ force: true });
      await configPage.getByRole('button', { name: /Utwórz prywatny link/i }).click();
      await configPage.waitForURL(/\/konfiguracja\//, { timeout: 15_000 });
      const publicId = (
        await configPage.getByText('Numer projektu').locator('xpath=following-sibling::*[1]').innerText()
      ).trim();
      // Bounded explicitly: Playwright actions have no default timeout of
      // their own (they'd otherwise block for the whole test timeout), and
      // this price readout is optional -- only used for a soft cross-check
      // below, never worth risking the mail-wait budget over.
      const grossTotalText = await configPage
        .getByText(/zł brutto/)
        .first()
        .innerText({ timeout: 5_000 })
        .catch(() => '');
      await configPage.close();

      const client = await openMailbox(mailbox);
      let found;
      try {
        found = await waitForMail(client, (subject) => subject.includes('Nowe zapytanie ofertowe'), {
          timeoutMs: 60_000,
        });
        expect(found, `Order-notification inbox (${mailbox.email}) never received the message for ${publicId} within 60s.`).not.toBeNull();

        // Fetch the raw message body to confirm actual config data landed in
        // it, not just a matching subject line.
        const uid = found!.uid;
        const full = await client.fetchOne(uid, { source: true }, { uid: true });
        const source = full && full.source ? full.source.toString('utf8') : '';
        expect(source, 'Order-notification body must mention Rexor E82.').toMatch(/Rexor E82/);
        if (grossTotalText) {
          const priceDigits = grossTotalText.replace(/\D/g, '');
          if (priceDigits) {
            expect(source.replace(/\D/g, ''), 'Order-notification body must include the quoted price.').toContain(
              priceDigits.slice(0, Math.min(4, priceDigits.length)),
            );
          }
        }
      } finally {
        await client.logout();
      }
      await page.screenshot({ path: `${evidence}/08-mail-received.png`, fullPage: true });
    } finally {
      // Always restore mail routing to the real address, whatever failed above.
      await page.getByRole('tab', { name: 'Poczta' }).click();
      const field = page.locator('#mail-order_email');
      await field.waitFor();
      const current = await field.inputValue();
      if (current.trim().toLowerCase() !== originalOrderEmail.trim().toLowerCase()) {
        await field.fill(originalOrderEmail);
        await page.getByRole('button', { name: 'Zapisz adresy' }).click();
        await expect(page.getByRole('status')).toHaveText('Adresy e-mail zapisane w bazie.', { timeout: 10_000 });
      }
      await page.screenshot({ path: `${evidence}/09-mail-restored.png`, fullPage: true });
    }
  });

  test(
    'VIS-21: REL-01 post-deploy smoke bundle (PUB-01, PUB-02, CFG-05, CFG-06 validation-only, ADM-01, API-01)',
    { tag: '@smoke' },
    async ({ page, context }) => {
      test.setTimeout(90_000);
      const evidence = await evidenceDir('VIS-21');
      const issues: string[] = [];
      const badResponses: string[] = [];
      function watch(p: typeof page) {
        p.on('console', (m) => {
          if (['error', 'warning'].includes(m.type())) issues.push(`${p.url()} console ${m.type()}: ${m.text()}`);
        });
        p.on('response', (r) => {
          if (r.status() >= 400) badResponses.push(`${r.status()} ${r.request().method()} ${r.url()}`);
        });
      }
      watch(page);

      // API-01: health + catalog respond and agree on model count.
      const [health, catalog] = await Promise.all([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/catalog`),
      ]);
      expect(health.ok, 'GET /api/health must respond OK.').toBe(true);
      expect(catalog.ok, 'GET /api/catalog must respond OK.').toBe(true);
      const catalogData = (await catalog.json()) as { models: unknown[] };
      expect(catalogData.models.length, 'Public catalog must list at least one model.').toBeGreaterThan(0);

      // PUB-01: main nav has only the expected links, no "Części".
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const navLinks = await page.locator('header').getByRole('link').allTextContents();
      expect(navLinks.join(' '), 'Main nav must not expose "Części".').not.toMatch(/Części/);
      for (const expected of ['Rowery', 'Ramy', 'Realizacje', 'Serwis']) {
        expect(navLinks.some((t) => t.includes(expected)), `Main nav must include "${expected}".`).toBe(true);
      }
      await page.screenshot({ path: `${evidence}/01-pub01-nav.png`, fullPage: true });

      // PUB-02: category filter narrows the /rowery listing. Which category
      // chips exist depends on which categories the test catalog's models
      // actually use (BikesPage only renders chips for categories with at
      // least one model) -- pick whichever non-"Wszystkie" chip is present
      // rather than hardcoding one that may not exist in this data set.
      await page.goto(`${BASE_URL}/rowery`, { waitUntil: 'domcontentloaded' });
      const allCount = await page.locator('main a[href^="/rowery/"]').count();
      const categoryTab = page.locator('fieldset button[aria-pressed]').filter({ hasNotText: 'Wszystkie' }).first();
      if (await categoryTab.count()) {
        const categoryName = await categoryTab.innerText();
        await categoryTab.click();
        await page.waitForTimeout(300);
        const filteredCount = await page.locator('main a[href^="/rowery/"]').count();
        expect(filteredCount, `Filtering by "${categoryName}" must not show more models than "Wszystkie".`).toBeLessThanOrEqual(allCount);
        await page.screenshot({ path: `${evidence}/02-pub02-filtered.png`, fullPage: true });
      }

      // CFG-05: description starts collapsed on mobile, expands on tap.
      const mobilePage = await context.newPage();
      watch(mobilePage);
      await mobilePage.setViewportSize({ width: 390, height: 844 });
      await mobilePage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
      await mobilePage.waitForTimeout(3000);
      const collapsible = mobilePage.getByTestId('model-description-collapsible');
      if (await collapsible.count()) {
        expect(await collapsible.getAttribute('open'), 'Description must start collapsed on mobile.').toBeNull();
        await mobilePage.getByTestId('model-description-toggle').click();
        await expect(collapsible).toHaveAttribute('open', '');
        await mobilePage.screenshot({ path: `${evidence}/03-cfg05-expanded.png`, fullPage: true });
      }
      await mobilePage.close();

      // CFG-06 (validation-only, never a real send -- safe on any
      // environment including production): leaving consent unchecked must
      // block submission, same as run-configuration-save.cjs without
      // --create.
      const configPage = await context.newPage();
      watch(configPage);
      await configPage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
      await configPage.waitForTimeout(3000);
      await configPage.getByRole('button', { name: /Zapisz i przejdź/i }).click();
      await configPage.getByLabel('Imię i nazwisko').fill('[QA] REL-01 smoke');
      await configPage.getByLabel('E-mail').fill('qa-configurator@example.invalid');
      await configPage.getByRole('button', { name: /Utwórz prywatny link/i }).click();
      await configPage.waitForTimeout(1000);
      expect(configPage.url(), 'Submitting without consent must not create a configuration.').not.toMatch(/\/konfiguracja\//);
      await configPage.screenshot({ path: `${evidence}/04-cfg06-blocked.png`, fullPage: true });
      await configPage.close();

      // ADM-01: admin session works, protected tab loads.
      await loginAdmin(page);
      await expect(page.getByRole('tab', { name: 'Modele i zdjęcia' })).toBeVisible();
      await page.screenshot({ path: `${evidence}/05-adm01-session.png`, fullPage: true });

      const seriousBadResponses = badResponses.filter((r) => !r.startsWith('404 ') || !r.includes('/favicon'));
      expect(issues, `Console errors/warnings collected during the smoke run:\n${issues.join('\n')}`).toEqual([]);
      expect(
        seriousBadResponses,
        `4xx/5xx network responses collected during the smoke run:\n${seriousBadResponses.join('\n')}`,
      ).toEqual([]);
    },
  );
});
