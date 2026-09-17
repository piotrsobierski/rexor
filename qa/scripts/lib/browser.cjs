const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { chromium } = require('playwright-core');

async function launchEvidenceBrowser(evidencePath, viewport = { width: 1440, height: 1000 }) {
  const evidence = resolve(evidencePath); await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const issues = [];
  async function newPage(nextViewport = viewport) {
    const page = await browser.newPage({ viewport: nextViewport });
    page.on('console', (entry) => { if (['error', 'warning'].includes(entry.type())) issues.push({ url: page.url(), message: `${entry.type()}: ${entry.text()}` }); });
    return page;
  }
  async function screenshot(page, step, label) {
    const filename = `${String(step).padStart(2, '0')}-${label}.png`;
    await page.screenshot({ path: `${evidence}/${filename}`, fullPage: true });
    return filename;
  }
  return { browser, evidence, issues, newPage, screenshot };
}

function baseUrl(value) { return value.replace(/\/$/, ''); }

module.exports = { launchEvidenceBrowser, baseUrl };
