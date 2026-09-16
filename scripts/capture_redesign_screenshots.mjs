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
  async function captureViewport(name, width, height) {
    console.log(`Setting up ${name} (${width}x${height})...`);
    const context = await browser.newContext({ viewport: { width, height } });
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

  // 1. 14-inch Laptop (1366x768)
  await captureViewport('01-14inch-laptop', 1366, 768);

  // 2. 24-inch Desktop (1920x1080)
  await captureViewport('02-24inch-desktop', 1920, 1080);

  console.log('All responsive screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});

