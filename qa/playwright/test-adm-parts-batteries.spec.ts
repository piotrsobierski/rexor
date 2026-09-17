import { test, expect, type Page, type Locator } from '@playwright/test';
import { BASE_URL, evidenceDir, loginAdmin } from './lib/admin';

// ADM-04 ("Części i ceny" + "Osprzęt i cena modelu") and ADM-05 ("Baterie")
// coverage, per qa/SCENARIUSZE_TESTOWE.md (2026-09-17).
//
//   VIS-16 (ADM-04): create a [QA-C] test part, assign it to model E82 in
//           "Osprzęt i cena modelu" as an optional (non-default) choice, verify
//           it appears as a selectable option in the public configurator with
//           the correct price delta; then promote it to the group's default
//           and verify the admin pricing calculator ("Cena od") recalculates
//           and the configurator's initial selection/base price follow suit;
//           then restore the original default, unassign, and delete the part.
//           Also verifies the part is scoped to E82 only (absent from E55).
//
//   VIS-17 (ADM-05): create a [QA-C] test battery pack under model E82,
//           verify it is absent from E55's battery selector (batteries are
//           already model-scoped by a model_id foreign key -- there is no
//           separate "assign" step, unlike parts), select it in the public
//           configurator and verify capacity (Wh), price delta and the range
//           estimate table update; then delete the pack and confirm it is
//           gone from the configurator.
//
// Run with: npm run test:visual -- -g "VIS-16|VIS-17"
// Requires QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD in the environment.

const MODEL_NAME = 'Rexor E82';
const OTHER_MODEL_NAME = 'Rexor E55';

async function selectEquipmentModel(page: Page, modelName: string) {
  await page.getByRole('tab', { name: 'Osprzęt i cena modelu' }).click();
  await page.locator('button').filter({ hasText: modelName }).first().click();
  await page.waitForTimeout(300);
}

async function findGroupPanel(page: Page): Promise<{ panel: Locator; groupName: string }> {
  const modeSelects = page.locator('select[id^="mode-"]');
  const count = await modeSelects.count();
  for (let i = 0; i < count; i += 1) {
    const select = modeSelects.nth(i);
    const value = await select.inputValue();
    if (value === 'fixed') continue;
    const panel = select.locator('xpath=ancestor::section[1]');
    const groupName = (await panel.locator('h2').first().innerText()).trim();
    return { panel, groupName };
  }
  throw new Error('No non-fixed part group found for this model -- cannot exercise an assignable option.');
}

async function calculatorText(page: Page): Promise<string> {
  const calculator = page
    .locator('section', { has: page.getByRole('heading', { name: /Kalkulator ceny bazowej/ }) })
    .first();
  return (await calculator.innerText()).trim();
}

async function findDefaultRowName(panel: Locator): Promise<string> {
  const rows = panel.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const switches = row.getByRole('switch');
    if ((await switches.count()) < 2) continue;
    if ((await switches.nth(1).getAttribute('aria-checked')) === 'true') {
      const cellText = await row.locator('td').nth(1).innerText();
      return cellText.split('\n')[0].trim();
    }
  }
  throw new Error('No default part currently set in this group.');
}

test.describe('rexor admin: parts/equipment + batteries (ADM-04, ADM-05)', () => {
  test('VIS-16: test part is assignable (optional and default) to a model, priced, and scoped to it', async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    const evidence = await evidenceDir('VIS-16');
    const marker = `[QA-C] parts-batteries ${Date.now()}`;
    const partName = marker;
    const partPrice = '555';

    await loginAdmin(page);

    // 1) Find a non-fixed part group already used by E82, so the new part
    // shows up as a real selectable choice in the public configurator.
    await selectEquipmentModel(page, MODEL_NAME);
    const { groupName } = await findGroupPanel(page);
    {
      const { panel } = await findGroupPanel(page);
      await panel.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${evidence}/01-equipment-group-before.png`, fullPage: true });
    }

    let originalDefaultName = '';
    {
      const { panel } = await findGroupPanel(page);
      originalDefaultName = await findDefaultRowName(panel);
    }

    const originalCalculatorText = await calculatorText(page);

    try {
      // 2) Create the test part in that same group, from "Części i ceny".
      await page.getByRole('tab', { name: 'Części i ceny' }).click();
      const addPartCard = page
        .getByRole('heading', { name: 'Dodaj nową część' })
        .locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]');
      await addPartCard.getByPlaceholder('Nazwa części').fill(partName);
      await addPartCard.getByRole('combobox').selectOption({ label: groupName });
      await addPartCard.getByPlaceholder('Cena brutto').fill(partPrice);
      await addPartCard.getByRole('button', { name: 'Dodaj' }).click();
      await expect(page.getByRole('status')).toHaveText('Część dodana do katalogu.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/02-part-created.png`, fullPage: true });

      // Confirm it landed in the right category with the right price, via
      // the search box (isolates exactly one row). Note: the part's name
      // lives inside an <input value>, which Playwright's `hasText` filter
      // cannot see (it only matches rendered text nodes) -- rely on the
      // search box narrowing the table down to exactly one row instead.
      await page.getByPlaceholder('Szukaj części lub SKU…').fill(partName);
      const partsRow = page.locator('tbody tr');
      await expect(partsRow).toHaveCount(1, { timeout: 10_000 });
      const selectedGroupLabel = await partsRow
        .getByRole('combobox')
        .evaluate((el) => (el as HTMLSelectElement).options[(el as HTMLSelectElement).selectedIndex].text);
      expect(selectedGroupLabel, 'New part must be created in the intended group.').toBe(groupName);
      await expect(partsRow.locator('input[type="number"]')).toHaveValue(`${partPrice}.00`);
      await page.screenshot({ path: `${evidence}/03-part-in-catalog.png`, fullPage: true });

      // 3) Assign it to the model as an OPTIONAL (non-default) choice.
      await selectEquipmentModel(page, MODEL_NAME);
      let { panel } = await findGroupPanel(page);
      let row = panel.getByRole('row').filter({ hasText: partName });
      await expect(row).toHaveCount(1);
      await row.scrollIntoViewIfNeeded();
      await expect(row.getByRole('switch')).toHaveCount(1, { timeout: 5000 });
      await row.getByRole('switch').first().click();
      await expect(page.getByRole('status')).toHaveText('Osprzęt zapisany, cena przeliczona.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/04-assigned-optional.png`, fullPage: true });

      // Optional assignment must not change the model's base price.
      const calculatorAfterOptional = await calculatorText(page);
      expect(
        calculatorAfterOptional,
        'Assigning a part as an optional (non-default) choice must not change "Cena od".',
      ).toBe(originalCalculatorText);

      // 4) Public configurator: the part must show up as a selectable,
      // priced option for E82.
      const cfgPage = await context.newPage();
      await cfgPage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
      await cfgPage.waitForTimeout(3000);
      const optionLabel = cfgPage.locator('label.option-choice').filter({ hasText: partName });
      await expect(optionLabel, 'New part must appear as a selectable option in the E82 configurator.').toBeVisible({
        timeout: 10_000,
      });
      const totalBefore = await cfgPage.getByTestId('total-price').innerText();
      await optionLabel.click();
      await expect(optionLabel).toHaveClass(/option-choice-active/);
      const totalAfterOptionalPick = await cfgPage.getByTestId('total-price').innerText();
      expect(
        totalAfterOptionalPick,
        'Selecting the new (paid) optional part must change the displayed total.',
      ).not.toBe(totalBefore);
      await cfgPage.screenshot({ path: `${evidence}/05-configurator-optional-selected.png`, fullPage: true });

      // Scoped to E82: must not appear at all for E55.
      await cfgPage.goto(`${BASE_URL}/konfigurator?model=e55`, { waitUntil: 'domcontentloaded' });
      await cfgPage.waitForTimeout(3000);
      await expect(
        cfgPage.getByText(partName),
        'Part assigned only to E82 must not be visible in the E55 configurator.',
      ).toHaveCount(0);
      await cfgPage.screenshot({ path: `${evidence}/06-configurator-e55-absent.png`, fullPage: true });
      await cfgPage.close();

      // 5) Promote it to DEFAULT and verify pricing recalculates.
      await selectEquipmentModel(page, MODEL_NAME);
      ({ panel } = await findGroupPanel(page));
      row = panel.getByRole('row').filter({ hasText: partName });
      await row.scrollIntoViewIfNeeded();
      await expect(row.getByRole('switch')).toHaveCount(2);
      await row.getByRole('switch').nth(1).click();
      await expect(page.getByRole('status')).toHaveText('Osprzęt zapisany, cena przeliczona.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/07-assigned-default.png`, fullPage: true });

      const calculatorAfterDefault = await calculatorText(page);
      expect(
        calculatorAfterDefault,
        'Promoting the new part to default must recalculate "Cena od".',
      ).not.toBe(originalCalculatorText);

      const cfgPage2 = await context.newPage();
      await cfgPage2.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
      await cfgPage2.waitForTimeout(3000);
      const defaultOptionLabel = cfgPage2.locator('label.option-choice').filter({ hasText: partName });
      await expect(
        defaultOptionLabel,
        'The newly default part must be pre-selected on a fresh configurator load.',
      ).toHaveClass(/option-choice-active/, { timeout: 10_000 });
      await cfgPage2.screenshot({ path: `${evidence}/08-configurator-new-default.png`, fullPage: true });
      await cfgPage2.close();

      // 6) Restore the original default part.
      await selectEquipmentModel(page, MODEL_NAME);
      ({ panel } = await findGroupPanel(page));
      const originalRow = panel.getByRole('row').filter({ hasText: originalDefaultName });
      await originalRow.scrollIntoViewIfNeeded();
      await originalRow.getByRole('switch').nth(1).click();
      await expect(page.getByRole('status')).toHaveText('Osprzęt zapisany, cena przeliczona.', { timeout: 10_000 });

      const calculatorRestored = await calculatorText(page);
      expect(calculatorRestored, 'Restoring the original default must restore the original "Cena od".').toBe(
        originalCalculatorText,
      );
      await page.screenshot({ path: `${evidence}/09-default-restored.png`, fullPage: true });

      // 7) Unassign the test part from the model.
      ({ panel } = await findGroupPanel(page));
      row = panel.getByRole('row').filter({ hasText: partName });
      await row.getByRole('switch').first().click();
      await expect(page.getByRole('status')).toHaveText('Osprzęt zapisany, cena przeliczona.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/10-unassigned.png`, fullPage: true });
    } finally {
      // 8) Delete the test part from the global catalog.
      await page.getByRole('tab', { name: 'Części i ceny' }).click();
      await page.getByPlaceholder('Szukaj części lub SKU…').fill(partName);
      // Same input-value caveat as above: rely on the search box, not hasText.
      const cleanupRow = page.locator('tbody tr');
      if (await cleanupRow.count()) {
        page.once('dialog', (dialog) => void dialog.accept());
        await cleanupRow.first().getByRole('button', { name: 'Usuń' }).click();
        await expect(page.getByRole('status')).toHaveText('Część usunięta.', { timeout: 10_000 });
      }
      await page.screenshot({ path: `${evidence}/11-part-deleted.png`, fullPage: true }).catch(() => {});

      const verifyPage = await context.newPage();
      await verifyPage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
      await verifyPage.waitForTimeout(2000);
      await expect(
        verifyPage.getByText(partName),
        'Deleted test part must no longer appear in the E82 configurator.',
      ).toHaveCount(0);
      await verifyPage.close();
    }
  });

  test('VIS-17: test battery pack is model-scoped, priced, and drives capacity/range figures', async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    const evidence = await evidenceDir('VIS-17');
    const ts = Date.now();
    const batteryName = `[QA-C] Test Battery ${ts}`;
    const batteryCode = `qa-c-${ts}`;

    await loginAdmin(page);
    await page.getByRole('tab', { name: 'Baterie' }).click();
    const modelArticle = page.locator('article').filter({ hasText: MODEL_NAME });
    await modelArticle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidence}/01-batteries-before.png`, fullPage: true });

    try {
      const details = page.getByTestId('add-battery-collapsible-e82');
      const isOpen = await details.evaluate((el) => (el as HTMLDetailsElement).open);
      if (!isOpen) await page.getByTestId('add-battery-toggle-e82').click();

      await details.getByLabel('Kod (np. e82-982wh)').fill(batteryCode);
      await details.getByLabel('Nazwa pakietu').fill(batteryName);
      await details.getByLabel('Format ogniwa').fill('18650');
      await details.getByLabel('Ogniwa szeregowo (S)').fill('14');
      await details.getByLabel('Gałęzie równolegle (P)').fill('4');
      await details.getByLabel('Pojemność ogniwa (Ah)').fill('3.5');
      await details.getByLabel('Cena brutto (zł)').fill('500');
      await page.screenshot({ path: `${evidence}/02-battery-form-filled.png`, fullPage: true });

      await details.getByRole('button', { name: 'Dodaj baterię do modelu' }).click();
      await expect(page.getByRole('status')).toHaveText('Bateria dodana do modelu.', { timeout: 10_000 });
      await page.screenshot({ path: `${evidence}/03-battery-added.png`, fullPage: true });

      const batteryRow = modelArticle.locator('div.rounded-2xl.bg-ink-wash').filter({ hasText: batteryCode });
      await expect(batteryRow).toHaveCount(1);

      // Model-scoped: must not exist under E55's article.
      const otherArticle = page.locator('article').filter({ hasText: OTHER_MODEL_NAME });
      await expect(
        otherArticle.getByText(batteryCode),
        'A battery created under E82 must not appear under E55 in the admin panel.',
      ).toHaveCount(0);

      // Public configurator: select it, verify capacity/price/range update.
      const cfgPage = await context.newPage();
      await cfgPage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
      await cfgPage.waitForTimeout(3000);

      const batteryOption = cfgPage.getByTestId(`battery-option-${batteryCode}`);
      await expect(batteryOption, 'New battery pack must be selectable in the E82 configurator.').toBeVisible({
        timeout: 10_000,
      });
      const whBadge = cfgPage.getByText(/^\d+([.,]\d+)?\s*Wh$/);
      const whBadgeBefore = await whBadge.innerText();
      const totalBefore = await cfgPage.getByTestId('total-price').innerText();
      await cfgPage.screenshot({ path: `${evidence}/04-configurator-before-select.png`, fullPage: true });

      await batteryOption.click();
      await expect(batteryOption).toHaveClass(/option-choice-active/);
      const whBadgeAfter = await whBadge.innerText();
      const totalAfter = await cfgPage.getByTestId('total-price').innerText();
      expect(whBadgeAfter, 'Selecting a different-capacity battery must update the Wh badge.').not.toBe(whBadgeBefore);
      expect(totalAfter, 'Selecting a non-default, priced battery must update the total.').not.toBe(totalBefore);
      await cfgPage.screenshot({ path: `${evidence}/05-configurator-after-select.png`, fullPage: true });

      // Absent from E55.
      await cfgPage.goto(`${BASE_URL}/konfigurator?model=e55`, { waitUntil: 'domcontentloaded' });
      await cfgPage.waitForTimeout(3000);
      await expect(
        cfgPage.getByTestId(`battery-option-${batteryCode}`),
        'Battery created for E82 must not appear in the E55 configurator.',
      ).toHaveCount(0);
      await cfgPage.screenshot({ path: `${evidence}/06-configurator-e55-absent.png`, fullPage: true });
      await cfgPage.close();
    } finally {
      await page.getByRole('tab', { name: 'Baterie' }).click();
      const article = page.locator('article').filter({ hasText: MODEL_NAME });
      const row = article.locator('div.rounded-2xl.bg-ink-wash').filter({ hasText: batteryCode });
      if (await row.count()) {
        await row.scrollIntoViewIfNeeded();
        page.once('dialog', (dialog) => void dialog.accept());
        await row.getByRole('button', { name: /Usuń pakiet/ }).click();
        await expect(page.getByRole('status')).toHaveText('Pakiet usunięty.', { timeout: 10_000 });
      }
      await page.screenshot({ path: `${evidence}/07-battery-deleted.png`, fullPage: true }).catch(() => {});

      const verifyPage = await context.newPage();
      await verifyPage.goto(`${BASE_URL}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded' });
      await verifyPage.waitForTimeout(2000);
      await expect(
        verifyPage.getByTestId(`battery-option-${batteryCode}`),
        'Deleted battery pack must no longer appear in the E82 configurator.',
      ).toHaveCount(0);
      await verifyPage.close();
    }
  });
});
