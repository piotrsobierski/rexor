const { chromium } = require('playwright-core');

function requiredAdminCredentials() {
  const { QA_ADMIN_EMAIL: email, QA_ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Set QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD.');
  return { email, password };
}

async function launchAdminPage(base, viewport = { width: 1440, height: 1000 }) {
  const credentials = requiredAdminCredentials();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport });
  await page.goto(`${base.replace(/\/$/, '')}/admin`, { waitUntil: 'domcontentloaded' });
  // fill() does not reliably update this React form. Keep the realistic input
  // sequence in one reusable place; credentials never enter reports or logs.
  for (const [id, value] of [['#admin-email', credentials.email], ['#admin-password', credentials.password]]) {
    const field = page.locator(id); await field.click(); await field.press('ControlOrMeta+A'); await field.pressSequentially(value, { delay: 20 });
  }
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Zaloguj' }).click();
  await page.getByRole('tab', { name: 'Modele i zdjęcia' }).waitFor({ timeout: 15_000 });
  return { browser, page };
}

module.exports = { launchAdminPage, requiredAdminCredentials };
