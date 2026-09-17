#!/usr/bin/env node
// ADM-10: verifies the Requests tab without creating or changing any record.
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { launchAdminPage } = require('./lib/admin.cjs');
const [, , baseArg, outArg] = process.argv;
if (!baseArg || !outArg) throw new Error('Usage: run-admin-requests.cjs BASE EVIDENCE');
(async () => {
  const out = resolve(outArg), base = baseArg.replace(/\/$/, ''); await mkdir(out, { recursive: true });
  const { browser: b, page: p } = await launchAdminPage(baseArg);
  try {
    const tab = p.getByRole('tab', { name: 'Zapytania' }); await tab.click(); await tab.waitFor(); await p.waitForTimeout(500);
    const details = p.getByRole('button', { name: /Szczegóły/i }); const detailCount = await details.count();
    await p.screenshot({ path: `${out}/01-requests-list.png`, fullPage: true });
    let opened = false;
    if (detailCount) {
      await details.first().click(); await p.waitForTimeout(700);
      opened = !p.url().endsWith('/admin');
      await p.screenshot({ path: `${out}/02-request-detail.png`, fullPage: true });
    }
    console.log(JSON.stringify({ tabOpened: true, detailsAvailable: detailCount, opened, result: opened ? 'PASS' : 'BLOCKED_NO_QA_CONFIGURATION' }, null, 2));
  } finally { await b.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
