import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_OUT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\a062cd27-5c2c-4b3e-b4f4-86ca8989a904\\screenshots';

if (!fs.existsSync(ARTIFACT_OUT_DIR)) {
  fs.mkdirSync(ARTIFACT_OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // Helper to log in and capture
  async function captureViewport(name, width, height, deviceScaleFactor = 1.0) {
    console.log(`Setting up ${name} (${width}x${height}, scale=${deviceScaleFactor})...`);
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor });
    const page = await context.newPage();

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1500);

    const isLogin = await page.$('input[type="password"]');
    if (isLogin) {
      console.log(`Logging in for ${name}...`);
      await page.fill('#employeeCode', '52300119');
      await page.fill('#password', 'Admin123456!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    await page.waitForSelector('.sgp-unified-workspace-header', { timeout: 10000 });
    await page.waitForTimeout(1500);

    console.log(`Capturing: ${name}-map.png...`);
    await page.screenshot({ path: path.join(ARTIFACT_OUT_DIR, `${name}-map.png`) });

    // Open Assets tab
    const assetTabBtn = await page.$('.sgp-uwh-mode-btn[data-tab="assets"]');
    if (assetTabBtn) {
      await assetTabBtn.click();
      await page.waitForTimeout(1500);
      console.log(`Capturing: ${name}-assets.png...`);
      await page.screenshot({ path: path.join(ARTIFACT_OUT_DIR, `${name}-assets.png`) });
    }

    // Open Verification tab
    const verifyTabBtn = await page.$('.sgp-uwh-mode-btn[data-tab="verification"]');
    if (verifyTabBtn) {
      await verifyTabBtn.click();
      await page.waitForTimeout(1500);
      console.log(`Capturing: ${name}-verification.png...`);
      await page.screenshot({ path: path.join(ARTIFACT_OUT_DIR, `${name}-verification.png`) });
    }

    await context.close();
  }

  // 1A. 14-inch Laptop at 150% Scaling (Typical Windows FHD laptop default: 1280x720 CSS)
  await captureViewport('01-14inch-laptop-150scale', 1280, 720, 1.5);

  // 1B. 14-inch Laptop at 125% Scaling (FHD laptop high productivity: 1536x864 CSS)
  await captureViewport('01-14inch-laptop-125scale', 1536, 864, 1.25);

  // 1C. 14-inch Laptop at Native WXGA (1366x768 CSS)
  await captureViewport('01-14inch-laptop-1366', 1366, 768, 1.0);

  // 2. 24-inch Desktop (1920x1080 Full HD at 100% scale)
  await captureViewport('02-24inch-desktop', 1920, 1080, 1.0);

  console.log('All responsive screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});

