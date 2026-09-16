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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  const isLogin = await page.$('input[type="password"]');
  if (isLogin) {
    console.log('Logging in...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  // 1. Map Operations with Workspace Header
  console.log('Capturing: 01-workspace-map-header.png...');
  await page.waitForSelector('.sgp-unified-workspace-header', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_OUT_DIR, '01-workspace-map-header.png') });

  // 2. Open Inline Asset Drawer
  console.log('Opening Inline Asset Drawer...');
  const assetBtn = await page.$('.sgp-uwh-hud-toggle:has-text("Thiết bị")');
  if (assetBtn) {
    await assetBtn.click();
    await page.waitForTimeout(1500);
    console.log('Capturing: 02-map-asset-drawer-open.png...');
    await page.screenshot({ path: path.join(ARTIFACT_OUT_DIR, '02-map-asset-drawer-open.png') });
    // Close drawer
    const closeBtn = await page.$('.sgp-mid-close-btn');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Navigate to Assets tab
  console.log('Navigating to Assets Tab...');
  const assetTabBtn = await page.$('.sgp-uwh-mode-btn:has-text("Kho Thiết bị")');
  if (assetTabBtn) {
    await assetTabBtn.click();
    await page.waitForTimeout(2000);
    console.log('Capturing: 03-workspace-assets-tab.png...');
    await page.screenshot({ path: path.join(ARTIFACT_OUT_DIR, '03-workspace-assets-tab.png') });
  }

  // 4. Navigate to Verification tab
  console.log('Navigating to Verification Tab...');
  const verifyTabBtn = await page.$('.sgp-uwh-mode-btn:has-text("Trung tâm Đối soát")');
  if (verifyTabBtn) {
    await verifyTabBtn.click();
    await page.waitForTimeout(2000);
    console.log('Capturing: 04-workspace-verification-tab.png...');
    await page.screenshot({ path: path.join(ARTIFACT_OUT_DIR, '04-workspace-verification-tab.png') });
  }

  console.log('All screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
