// Dev-only script: drives the BigFive quiz using the [DEV] Fill all shortcut,
// submits, and screenshots the result page.
import { chromium } from 'playwright';
import path from 'path';
import os from 'os';

const URL = 'http://localhost:3000';
const SCREENSHOT = path.join(os.tmpdir(), 'bigfive-result.png');

// Reuse Chrome's default user data dir so existing auth session is preserved.
const userDataDir = path.join(
  os.homedir(),
  'AppData', 'Local', 'ms-playwright', 'bigfive-test-profile'
);

const browser = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 800 },
});

const page = await browser.newPage();

// Step 1: land on root and follow redirects to dashboard
console.log('Navigating to', URL);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
console.log('Current URL after redirect:', page.url());

// Step 2: if we ended up on login, report and stop
if (page.url().includes('/auth/') || page.url().includes('/login')) {
  await page.screenshot({ path: SCREENSHOT });
  console.log('NOT LOGGED IN — screenshot at', SCREENSHOT);
  console.log('Please log in first, then re-run this script.');
  await browser.close();
  process.exit(1);
}

// Step 3: navigate to bigfive page
const locale = page.url().match(/\/([a-z]{2})\//)?.[1] ?? 'en';
const bigfiveUrl = `${URL}/${locale}/dashboard/divination/bigfive`;
console.log('Navigating to bigfive:', bigfiveUrl);
await page.goto(bigfiveUrl, { waitUntil: 'networkidle', timeout: 15000 });
console.log('Current URL:', page.url());

// Step 4: wait for the DEV Fill all button
const devBtn = page.getByText('[DEV] Fill all');
await devBtn.waitFor({ timeout: 10000 });
console.log('Clicking [DEV] Fill all');
await devBtn.click();
await page.waitForTimeout(300);

// Step 5: click Submit
const submitBtn = page.getByRole('button', { name: /submit/i });
await submitBtn.waitFor({ timeout: 5000 });
console.log('Clicking Submit');
await submitBtn.click();

// Step 6: wait for result (radar chart container)
await page.waitForFunction(
  () => document.querySelector('canvas') !== null,
  { timeout: 15000 }
).catch(() => console.warn('Canvas not found — may still be loading'));

await page.waitForTimeout(1500);
await page.screenshot({ path: SCREENSHOT, fullPage: true });
console.log('Screenshot saved to', SCREENSHOT);

await browser.close();
