#!/usr/bin/env node

/*
 * Bezpieczny, odczytowy pomocnik do zrzutów stron publicznych.
 * Nie klika elementów, nie wypełnia formularzy i nie wysyła żądań POST.
 * Wymaga dostępnego modułu playwright-core, np.:
 *   npm install --prefix /private/tmp/rexor-playwright playwright-core@1.55.0 --no-save
 *   NODE_PATH=/private/tmp/rexor-playwright/node_modules node qa/scripts/capture-page.cjs URL PLIK.png 390 844
 */

const { mkdir } = require('node:fs/promises');
const { dirname, resolve } = require('node:path');
const { chromium } = require('playwright-core');

const [, , url, output, widthArg = '1440', heightArg = '1000'] = process.argv;
if (!url || !output) {
  console.error('Użycie: node qa/scripts/capture-page.cjs URL PLIK.png [SZEROKOŚĆ] [WYSOKOŚĆ]');
  process.exit(2);
}

const width = Number(widthArg);
const height = Number(heightArg);
if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
  console.error('Szerokość i wysokość muszą być dodatnimi liczbami całkowitymi.');
  process.exit(2);
}

async function main() {
  const target = resolve(output);
  await mkdir(dirname(target), { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    const consoleIssues = [];
    page.on('console', (entry) => {
      if (['error', 'warning'].includes(entry.type())) consoleIssues.push(`${entry.type()}: ${entry.text()}`);
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: target, fullPage: true });
    console.log(JSON.stringify({ url, target, viewport: { width, height }, consoleIssues }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
