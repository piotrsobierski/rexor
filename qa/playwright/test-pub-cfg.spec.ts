import { test, expect } from '@playwright/test';
import { BASE_URL, API_BASE, evidenceDir } from './lib/admin';

// Completion of previously-PARTIAL scenarios from qa/SCENARIUSZE_TESTOWE.md
// and qa/POKRYCIE_AUTOMATYZACJA.md, all read-only against the public site
// (no admin login, no writes):
//
//   VIS-11  PUB-01/02: qa/scripts/run-public-navigation.cjs already confirmed
//           the category filter toggles its active state, but never asserted
//           *which* models appear/disappear per category (per
//           POKRYCIE_AUTOMATYZACJA.md: "filtr wymaga dopisania asercji
//           modeli"). This cross-checks GET /api/catalog against the
//           /rowery filter UI: for every category filter, only models whose
//           catalog `categorySlug` matches are shown; "Wszystkie" restores
//           the full list.
//
//   VIS-12  CFG-05: the model-description "Rozwiń/Zwiń" <details> toggle
//           (apps/web/components/bike-configurator.tsx) starts open on
//           desktop (>=1024px, matchMedia check) and collapsed on mobile
//           (390x844), and the summary label + chevron rotation track the
//           open state on both.
//
//   VIS-13  CFG-07 remainder: VIS-06 (test-visual.spec.ts) already covers the
//           paint-picker modal's own focus trap. This audits the rest of the
//           model detail / configurator page: Tabbing through the photo
//           carousel (prev/next controls) and the description accordion
//           never drops focus to <body> (i.e. focus is always visible on
//           some element), and Enter/Escape on the carousel controls and the
//           accordion <summary> behave sanely (advance the slide / toggle
//           open, without throwing or trapping focus).
//
// Run with:
//   QA_ADMIN_EMAIL=admin@rexor.local QA_ADMIN_PASSWORD=rexor \
//     npx playwright test --config qa/playwright/playwright.config.ts -g "VIS-11|VIS-12|VIS-13"
// (Admin credentials are not actually needed by these three tests, but are
// kept in the invocation per the shared team convention.)

type CatalogModel = { id: string; name: string; category_slug?: string | null };
type CatalogCategory = { slug: string; name: string };

async function fetchCatalog(): Promise<{ models: CatalogModel[]; categories: CatalogCategory[] }> {
  const response = await fetch(`${API_BASE}/catalog`);
  if (!response.ok) throw new Error(`GET /catalog failed: ${response.status}`);
  return (await response.json()) as { models: CatalogModel[]; categories: CatalogCategory[] };
}

test.describe('rexor public/configurator coverage (PUB-01/02, CFG-05, CFG-07)', () => {
  test('VIS-11: /rowery category filter shows only models of the selected category', async ({ page }) => {
    const evidence = await evidenceDir('VIS-11');
    const { models, categories } = await fetchCatalog();
    const slugToName = new Map(categories.map((c) => [c.slug, c.name]));

    await page.goto(`${BASE_URL}/rowery`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const filterFieldset = page.locator('fieldset').first();
    await filterFieldset.waitFor();
    const filterButtons = filterFieldset.getByRole('button');
    const filterCount = await filterButtons.count();
    test.skip(filterCount <= 1, 'No category filters available in the test catalog (only "Wszystkie").');

    async function visibleModelNames(): Promise<string[]> {
      const links = page.locator('article a[aria-label^="Poznaj "]');
      const count = await links.count();
      const names: string[] = [];
      for (let i = 0; i < count; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const label = await links.nth(i).getAttribute('aria-label');
        if (label) names.push(label.replace(/^Poznaj /, ''));
      }
      return names;
    }

    // Baseline: "Wszystkie" must show every model in the catalog.
    const allNames = await visibleModelNames();
    for (const model of models) {
      expect(allNames, `"Wszystkie" must include model "${model.name}".`).toContain(model.name);
    }
    await page.screenshot({ path: `${evidence}/01-all-models.png`, fullPage: true });

    // Exercise every category filter chip that actually exists in the UI,
    // asserting the exact set of models shown against /api/catalog's
    // category_slug — not just that "some" narrowing happened.
    for (let i = 1; i < filterCount; i += 1) {
      const chip = filterButtons.nth(i);
      const label = (await chip.textContent())?.trim() ?? '';
      const matchingSlug = [...slugToName.entries()].find(([, name]) => name === label)?.[0];
      expect(matchingSlug, `Filter chip "${label}" must correspond to a known catalog category slug.`).toBeDefined();
      const expectedNames = models.filter((m) => m.category_slug === matchingSlug).map((m) => m.name);

      await chip.click();
      await page.waitForTimeout(300);
      const shownNames = await visibleModelNames();
      await page.screenshot({ path: `${evidence}/02-filter-${i}-${label || 'chip'}.png`, fullPage: true });

      expect(
        shownNames.sort(),
        `Filter "${label}" (category_slug=${matchingSlug}) must show exactly the models with that category.`,
      ).toEqual(expectedNames.sort());

      for (const name of allNames.filter((n) => !expectedNames.includes(n))) {
        expect(shownNames, `Model "${name}" from a different category must be hidden under filter "${label}".`).not.toContain(name);
      }
    }

    // Return to "Wszystkie" and confirm the full list comes back.
    await filterButtons.first().click();
    await page.waitForTimeout(300);
    const restoredNames = await visibleModelNames();
    expect(restoredNames.sort(), 'Returning to "Wszystkie" must restore the exact original model list.').toEqual(
      allNames.sort(),
    );
    await page.screenshot({ path: `${evidence}/03-all-models-restored.png`, fullPage: true });
  });

  test('VIS-12: model description "Rozwiń/Zwiń" starts collapsed on mobile, open on desktop', async ({ browser }) => {
    const evidence = await evidenceDir('VIS-12');

    // Mobile: 390x844, per SCENARIUSZE_TESTOWE.md CFG-05 step 1.
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(3000);

    const mobileDetails = mobilePage.getByTestId('model-description-collapsible');
    await mobileDetails.waitFor();
    await expect(mobileDetails, 'Description must start collapsed on mobile (390px).').not.toHaveAttribute('open', '');
    const mobileToggle = mobilePage.getByTestId('model-description-toggle');
    await expect(mobileToggle).toContainText('Rozwiń');
    await mobilePage.screenshot({ path: `${evidence}/01-mobile-collapsed.png`, fullPage: true });

    await mobileToggle.click();
    await expect(mobileDetails, 'Clicking the toggle must open the description.').toHaveAttribute('open', '');
    await expect(mobileToggle, 'Label must switch to "Zwiń" once expanded.').toContainText('Zwiń');
    await mobilePage.screenshot({ path: `${evidence}/02-mobile-expanded.png`, fullPage: true });

    await mobileToggle.click();
    await expect(mobileDetails, 'Clicking again must collapse it back.').not.toHaveAttribute('open', '');
    await expect(mobileToggle).toContainText('Rozwiń');
    await mobilePage.screenshot({ path: `${evidence}/03-mobile-collapsed-again.png`, fullPage: true });
    await mobileContext.close();

    // Desktop: default 1440x1000 (per playwright.config.ts).
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(3000);

    const desktopDetails = desktopPage.getByTestId('model-description-collapsible');
    await desktopDetails.waitFor();
    await expect(desktopDetails, 'Description must start open on desktop (>=1024px).').toHaveAttribute('open', '');
    const desktopToggle = desktopPage.getByTestId('model-description-toggle');
    await expect(desktopToggle).toContainText('Zwiń');
    await desktopPage.screenshot({ path: `${evidence}/04-desktop-open.png`, fullPage: true });
    await desktopContext.close();
  });

  test('VIS-13: keyboard focus stays visible through the photo carousel and description accordion', async ({
    page,
  }) => {
    const evidence = await evidenceDir('VIS-13');
    await page.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    async function activeElementInfo() {
      return page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return null;
        return {
          tag: active.tagName,
          testId: active.getAttribute('data-testid'),
          ariaLabel: active.getAttribute('aria-label'),
          visible: active.getClientRects().length > 0,
        };
      });
    }

    // Carousel: focus the "next slide" control directly (it is inside a
    // sticky/scrolled area, so Tab-from-top would be viewport-order
    // dependent and flaky) and drive it with the keyboard, as CFG-07 step 1
    // (Tab, spacja, Enter, Escape) requires.
    const gallery = page.getByTestId('model-gallery');
    await gallery.waitFor();
    const nextButton = page.getByRole('button', { name: 'Next slide' });
    const slideCountText = await page.locator('span.tabular-nums', { hasText: '/' }).first().textContent();
    const hasMultipleSlides = /\/\s*(\d+)/.exec(slideCountText ?? '')?.[1] !== '1';

    if (hasMultipleSlides) {
      await nextButton.focus();
      let info = await activeElementInfo();
      expect(info, 'Focusing the carousel "next" control must leave a visible, non-body focus target.').not.toBeNull();
      expect(info?.visible).toBe(true);
      await page.screenshot({ path: `${evidence}/01-carousel-next-focused.png`, fullPage: true });

      const indexBefore = await page.locator('span.tabular-nums', { hasText: '/' }).first().textContent();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      const indexAfter = await page.locator('span.tabular-nums', { hasText: '/' }).first().textContent();
      expect(indexAfter, 'Enter on the carousel "next" control must advance the slide.').not.toBe(indexBefore);

      info = await activeElementInfo();
      expect(info, 'Focus must remain on a visible element after activating the carousel control with Enter.').not.toBeNull();
      expect(info?.visible).toBe(true);
      await page.screenshot({ path: `${evidence}/02-carousel-advanced.png`, fullPage: true });
    } else {
      test.info().annotations.push({ type: 'skip-reason', description: 'Model gallery has only one slide in test data — carousel controls are not rendered.' });
    }

    // Accordion: the description <summary> is a native, keyboard-operable
    // disclosure widget — Enter/Space must toggle it and never move focus
    // off it or to <body>.
    const summary = page.getByTestId('model-description-toggle');
    const details = page.getByTestId('model-description-collapsible');
    await summary.focus();
    let info = await activeElementInfo();
    expect(info?.testId, 'Summary control must be focusable directly.').toBe('model-description-toggle');

    const openBefore = await details.getAttribute('open');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const openAfterEnter = await details.getAttribute('open');
    expect(openAfterEnter, 'Enter on the description summary must toggle its open state.').not.toBe(openBefore);
    info = await activeElementInfo();
    expect(info, 'Focus must stay on a visible element after toggling the accordion with Enter.').not.toBeNull();
    expect(info?.testId).toBe('model-description-toggle');
    await page.screenshot({ path: `${evidence}/03-accordion-enter-toggle.png`, fullPage: true });

    await page.keyboard.press(' ');
    await page.waitForTimeout(200);
    const openAfterSpace = await details.getAttribute('open');
    expect(openAfterSpace, 'Space on the description summary must toggle it again.').not.toBe(openAfterEnter);
    info = await activeElementInfo();
    expect(info?.visible, 'Focus must remain visible after Space toggles the accordion.').toBe(true);
    await page.screenshot({ path: `${evidence}/04-accordion-space-toggle.png`, fullPage: true });

    // Escape must not do anything destructive to focus for a non-modal,
    // non-dialog control like this <details> — it should simply leave focus
    // where it was (no dialog to close here, unlike VIS-06's paint modal).
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    info = await activeElementInfo();
    expect(info, 'Escape outside any modal must not blur focus to <body>.').not.toBeNull();
    expect(info?.visible).toBe(true);
  });
});
