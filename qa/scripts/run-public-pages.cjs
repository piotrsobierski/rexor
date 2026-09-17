#!/usr/bin/env node

/*
 * Odczytowy pakiet PUB-04: strony publiczne i pierwszy dostępny detal ramy
 * oraz realizacji. Nie klika CTA i nie wysyła formularzy.
 *
 * Użycie:
 * NODE_PATH=/private/tmp/rexor-playwright/node_modules \
 *   node qa/scripts/run-public-pages.cjs https://rexor.sobierski.com \
 *   qa/evidence/RRRR-MM-DD/test/PUB-04
 */

const { launchEvidenceBrowser, baseUrl } = require('./lib/browser.cjs');

const [, , baseArg, evidenceArg] = process.argv;
if (!baseArg || !evidenceArg) {
  console.error('Użycie: node qa/scripts/run-public-pages.cjs BAZOWY_URL KATALOG_DOWODOW');
  process.exit(2);
}

const base = baseUrl(baseArg);
const pages = [
  ['01', 'ramy'],
  ['02', 'realizacje'],
  ['03', 'serwis'],
  ['04', 'kontakt'],
  ['05', 'regulamin'],
  ['06', 'polityka-prywatnosci'],
];

async function visit(page, screenshot, number, path) {
  await page.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(1_000);
  const body = await page.locator('body').innerText();
  const screenshotFile = await screenshot(page, number, path);
  return {
    path: `/${path}`,
    result: body.includes('Nie znaleziono') ? 'NOT_FOUND' : 'PASS',
    images: await page.locator('main img').count(),
    screenshot: screenshotFile,
  };
}

async function firstDetail(page, screenshot, kind, number) {
  await page.goto(`${base}/${kind}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(1_000);
  const href = await page.locator('a').evaluateAll((nodes, prefix) => nodes
    .map((node) => new URL(node.href).pathname)
    .find((path) => path.startsWith(`/${prefix}/`) && path.split('/').filter(Boolean).length === 2) ?? null, kind);
  if (!href) return { kind, result: 'BLOCKED_NO_DATA', screenshot: null };
  await page.goto(`${base}${href}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(1_000);
  const body = await page.locator('body').innerText();
  const screenshotFile = await screenshot(page, number, `${kind}-detail`);
  return {
    kind,
    href,
    result: body.includes('Nie znaleziono') ? 'NOT_FOUND' : 'PASS',
    images: await page.locator('main img').count(),
    screenshot: screenshotFile,
  };
}

async function main() {
  const { browser, issues, newPage, screenshot } = await launchEvidenceBrowser(evidenceArg);
  try {
    const page = await newPage();
    const results = [];
    for (const [number, path] of pages) results.push(await visit(page, screenshot, number, path));
    results.push(await firstDetail(page, screenshot, 'ramy', '07'));
    results.push(await firstDetail(page, screenshot, 'realizacje', '08'));
    console.log(JSON.stringify({ base, results, issues }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
