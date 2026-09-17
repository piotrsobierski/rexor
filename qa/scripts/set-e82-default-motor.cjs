#!/usr/bin/env node
// ADM-04 support: assigns E82's factory/default motor and verifies catalog state.
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { launchAdminPage } = require('./lib/admin.cjs');
const [, , baseArg, evidenceArg] = process.argv;
if (!baseArg || !evidenceArg) throw new Error('Usage: set-e82-default-motor.cjs BASE EVIDENCE');
(async () => {
  const evidence = resolve(evidenceArg); await mkdir(evidence, { recursive: true });
  const { browser, page } = await launchAdminPage(baseArg);
  try {
    await page.getByRole('tab', { name: 'Osprzęt i cena modelu' }).click(); await page.waitForTimeout(400);
    const desired = 'Silnik Bafang M510 250 W / 95 Nm (3700.00 zł)';
    const motorSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Silnik Bafang M510 250 W / 95 Nm' }) });
    await motorSelect.selectOption({ label: desired }); await page.waitForTimeout(800);
    await page.screenshot({ path: `${evidence}/01-e82-default-motor.png`, fullPage: true });
    const catalog = await (await page.request.get(`${baseArg.replace(/\/$/, '')}/api/catalog`)).json();
    const e82 = catalog.models.find((model) => model.slug === 'e82');
    const motor = e82.groups.find((group) => group.slug === 'motor');
    const result = { defaultSku: motor.defaultSku, basePrice: e82.base_price, passed: motor.defaultSku === 'motor-m510-250w' };
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) throw new Error('Default E82 motor was not saved.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
