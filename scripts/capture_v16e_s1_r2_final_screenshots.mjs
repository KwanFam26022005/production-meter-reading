import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const REPO_OUT_DIR = path.resolve('docs/design/map-operations/v16e-s1-r2/screenshots');
const ARTIFACT_OUT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\a062cd27-5c2c-4b3e-b4f4-86ca8989a904\\screenshots';

for (const dir of [REPO_OUT_DIR, ARTIFACT_OUT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, filename) {
  const repoPath = path.join(REPO_OUT_DIR, filename);
  const artifactPath = path.join(ARTIFACT_OUT_DIR, filename);
  await page.screenshot({ path: repoPath });
  try {
    fs.copyFileSync(repoPath, artifactPath);
  } catch (e) {}
  console.log(`[CAPTURED] ${filename}`);
}

async function run() {
  console.log('Launching browser at:', EDGE_PATH);
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    console.log('Navigating to app...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1500);

    const isLogin = await page.evaluate(() => Boolean(document.querySelector('input[type="password"]')));
    if (isLogin) {
      console.log('Logging in as admin 52300119...');
      await page.fill('#employeeCode', '52300119');
      await page.fill('#password', 'Admin123456!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    console.log('Waiting for map console...');
    await page.waitForSelector('.sgp-map-first-root', { timeout: 15000 });
    await page.waitForTimeout(2500);

    // 1. 01-final-map.png — Full map view with 5 zones, 12 meters
    console.log('Capturing: 01-final-map.png...');
    await captureScreenshot(page, '01-final-map.png');

    // Switch to Network Mode
    console.log('Switching to Network view...');
    const networkModeBtn = await page.$('button[title*="mạng lưới"], button[title*="Mạng lưới"], .sgp-cmd-switch-btn:has-text("Mạng lưới")');
    if (networkModeBtn) {
      await networkModeBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }

    // 2. 02-final-electricity.png — Electricity network tab with 24 edges
    const elecTab = await page.$('.sgp-utility-network-view button:has-text("Điện"), button:has-text("Điện")');
    if (elecTab) {
      await elecTab.click({ force: true });
      await page.waitForTimeout(2000);
    }
    console.log('Capturing: 02-final-electricity.png...');
    await captureScreenshot(page, '02-final-electricity.png');

    // 3. 03-final-water.png — Water network tab with 7 edges
    const waterTab = await page.$('.sgp-utility-network-view button:has-text("Nước"), button:has-text("Nước")');
    if (waterTab) {
      await waterTab.click({ force: true });
      await page.waitForTimeout(2000);
    }
    console.log('Capturing: 03-final-water.png...');
    await captureScreenshot(page, '03-final-water.png');

    // Switch to List View in Map Console
    console.log('Switching to List view...');
    const danhSachBtn = await page.$('button[title*="Danh sách"], .sgp-cmd-switch-btn:has-text("Danh sách")');
    if (danhSachBtn) {
      await danhSachBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }
    // 4. 04-final-list.png — Meter list view showing correct zones and units
    console.log('Capturing: 04-final-list.png...');
    await captureScreenshot(page, '04-final-list.png');

    console.log('All 4 final screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
