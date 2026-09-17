#!/usr/bin/env node
// CFG-06: without --create validates only; --create saves a marked QA record.
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { chromium } = require('playwright-core');
const [, , baseArg, evidenceArg, ...flags] = process.argv;
if (!baseArg || !evidenceArg) throw new Error('Usage: run-configuration-save.cjs BASE EVIDENCE [--create]');
const create = flags.includes('--create');
(async () => {
  const evidence = resolve(evidenceArg); await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); const responses = [], issues = [];
    page.on('response', r => { if (r.url().includes('/api/configurations')) responses.push(r.status()); });
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`); });
    await page.goto(`${baseArg.replace(/\/$/, '')}/konfigurator?model=e82`, { waitUntil: 'domcontentloaded', timeout: 20000 }); await page.waitForTimeout(3500);
    await page.getByRole('button', { name: /Zapisz i przejdź/i }).click();
    await page.getByLabel('Imię i nazwisko').fill('[QA] Config save scenario'); await page.getByLabel('E-mail').fill('qa-configurator@example.invalid');
    if (create) { await page.getByRole('checkbox', { name: /Zgadzam się/ }).click({ force: true }); }
    await page.screenshot({ path: `${evidence}/01-before-submit.png`, fullPage: true }); await page.getByRole('button', { name: /Utwórz prywatny link/i }).click(); await page.waitForTimeout(2000); await page.screenshot({ path: `${evidence}/02-result.png`, fullPage: true });
    console.log(JSON.stringify({ create, createdSummary: page.url().includes('/konfiguracja/'), responses, issues }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
