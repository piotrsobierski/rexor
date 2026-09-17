#!/usr/bin/env node
// ADM-05: creates a marked E82 battery, verifies public catalog visibility, then deletes it by admin API.
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { launchAdminPage } = require('./lib/admin.cjs');
const [, , baseArg, evidenceArg] = process.argv;
if (!baseArg || !evidenceArg) throw new Error('Usage: run-admin-battery-lifecycle.cjs BASE EVIDENCE');

(async () => {
  const base = baseArg.replace(/\/$/, ''), evidence = resolve(evidenceArg);
  const code = `qa-e82-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-test`;
  const name = `[QA ${new Date().toISOString().slice(0, 10)}] E82 test battery`;
  await mkdir(evidence, { recursive: true });
  const { browser, page } = await launchAdminPage(base);
  let createdId = null;
  try {
    await page.getByRole('tab', { name: 'Baterie' }).click();
    const e82 = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Rexor E82', exact: true }) });
    const createForm = e82.locator('details').filter({ has: e82.getByText('Dodaj pakiet do modelu Rexor E82', { exact: true }) });
    await createForm.getByText('Dodaj pakiet do modelu Rexor E82', { exact: true }).click();
    await createForm.getByPlaceholder('np. e82-706wh').fill(code);
    await createForm.getByPlaceholder('np. Samsung 35E 14S4P').fill(name);
    const [createResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/admin/batteries') && response.request().method() === 'POST'),
      createForm.getByRole('button', { name: 'Dodaj baterię do modelu' }).click(),
    ]);
    if (createResponse.status() !== 201) throw new Error(`QA battery creation failed: HTTP ${createResponse.status()}.`);
    await page.getByText('Bateria dodana do modelu.', { exact: true }).waitFor({ timeout: 5_000 });
    await page.screenshot({ path: `${evidence}/01-created-in-admin.png`, fullPage: true });

    const catalog = await (await page.request.get(`${base}/api/catalog`)).json();
    const e82Public = catalog.models.find((model) => model.slug === 'e82');
    const publicBattery = e82Public.batteries.find((battery) => battery.code === code);
    if (!publicBattery) throw new Error('Created QA battery is absent from public catalog.');
    await page.screenshot({ path: `${evidence}/02-catalog-verified.png`, fullPage: true });

    const token = await page.evaluate(() => sessionStorage.getItem('rexor_admin_token'));
    const adminCatalogResponse = await page.request.get(`${base}/api/admin/catalog`, { headers: { Authorization: `Bearer ${token}` } });
    const adminCatalog = await adminCatalogResponse.json();
    const record = adminCatalog.batteries.find((battery) => battery.code === code);
    if (!record?.id) throw new Error('Cannot resolve the QA battery ID for cleanup.');
    createdId = record.id;
    const removed = await page.request.delete(`${base}/api/admin/batteries/${createdId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!removed.ok()) throw new Error(`QA battery cleanup failed: HTTP ${removed.status()}.`);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('tab', { name: 'Baterie' }).click();
    const cleaned = await (await page.request.get(`${base}/api/catalog`)).json();
    const absentAfterCleanup = !cleaned.models.find((model) => model.slug === 'e82').batteries.some((battery) => battery.code === code);
    await page.screenshot({ path: `${evidence}/03-cleaned-up.png`, fullPage: true });
    console.log(JSON.stringify({ created: true, publicCatalogVisible: true, cleanedUp: absentAfterCleanup }, null, 2));
    if (!absentAfterCleanup) throw new Error('QA battery remained in public catalog after cleanup.');
  } finally {
    // If an assertion fails after creation, leave the identifier visible in the error-free evidence only;
    // the next run uses a deterministic QA prefix and can safely locate leftovers.
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
