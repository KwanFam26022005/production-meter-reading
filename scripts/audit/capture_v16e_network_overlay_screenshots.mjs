import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = 'D:\\Projects\\production-meter-reading\\production-meter-reading\\docs\\recovery\\v16e-network-overlay\\screenshots';
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\5457745e-1208-4356-9eb2-7f80e279b469\\screenshots';

for (const dir of [OUT_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveScreenshot(page, filename) {
  const p1 = path.join(OUT_DIR, filename);
  const p2 = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

async function loginIfNeeded(page) {
  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    console.log('Logging in as Admin (52300119)...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }
  await page.waitForSelector('.sgp-unified-workspace-header, .sgp-map-first-root', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function run() {
  console.log('Starting Playwright Edge browser for V16E Network Map Overlay visual capture...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // =========================================================================
  // PART 1: DESKTOP AUDIT (1920 x 1080)
  // =========================================================================
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/?tab=dashboard ...');
  await page.goto('http://localhost:5173/?tab=dashboard');
  await page.waitForTimeout(2000);
  await loginIfNeeded(page);

  // 1. Desktop Map Default
  console.log('Capturing 01-desktop-map-default.png ...');
  const mapModeBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-map"]');
  if (mapModeBtn) {
    await mapModeBtn.click();
    await page.waitForTimeout(1500);
  }
  await saveScreenshot(page, '01-desktop-map-default.png');

  // 2. Desktop Network Overlay Default (Both Electricity & Water on real map)
  console.log('Capturing 02-desktop-network-overlay-default.png ...');
  const netModeBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-network"]');
  if (netModeBtn) {
    await netModeBtn.click();
    await page.waitForTimeout(2500);
  }
  await saveScreenshot(page, '02-desktop-network-overlay-default.png');

  // 3. Desktop Network Overlay with Electricity Only
  console.log('Capturing 03-desktop-network-overlay-electricity.png ...');
  const elecBtn = await page.$('.sgp-network-filter-btn:has-text("Điện")');
  if (elecBtn) {
    await elecBtn.click();
    await page.waitForTimeout(1500);
  }
  await saveScreenshot(page, '03-desktop-network-overlay-electricity.png');

  // 4. Desktop Network Overlay with Water Only
  console.log('Capturing 04-desktop-network-overlay-water.png ...');
  const waterBtn = await page.$('.sgp-network-filter-btn:has-text("Nước")');
  if (waterBtn) {
    await waterBtn.click();
    await page.waitForTimeout(1500);
  }
  await saveScreenshot(page, '04-desktop-network-overlay-water.png');

  // Switch back to All
  const allBtn = await page.$('.sgp-network-filter-btn:has-text("Tất cả")');
  if (allBtn) {
    await allBtn.click();
    await page.waitForTimeout(1200);
  }

  // 5. Desktop Network Overlay with Selected Node (Trace Upstream / Downstream)
  console.log('Capturing 05-desktop-network-overlay-selected-node.png ...');
  // Click on a distribution node (e.g. SIM-TR-01 or SIM-MDB-01 or any technical node)
  await page.evaluate(() => {
    const target =
      document.querySelector('[data-asset-code="SIM-MDB-01"]') ||
      document.querySelector('[data-asset-code="SIM-FDR-BERTH"]') ||
      document.querySelector('.sgp-network-node');
    if (target) {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
  await page.waitForTimeout(1500);
  await saveScreenshot(page, '05-desktop-network-overlay-selected-node.png');

  // 6. Contextual Detail Quick-Info Card
  console.log('Capturing 06-desktop-network-context-card.png ...');
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '06-desktop-network-context-card.png');

  // 7. Status Differentiation (Toggle unverified / alert badges)
  console.log('Capturing 07-desktop-network-overlay-status.png ...');
  const unverifiedToggle = await page.$('button:has-text("Chưa duyệt")');
  if (unverifiedToggle) {
    await unverifiedToggle.click({ force: true });
    await page.waitForTimeout(1500);
  }
  await saveScreenshot(page, '07-desktop-network-overlay-status.png');

  // =========================================================================
  // PART 2: MOBILE VIEWPORT AUDIT (390 x 844, iPhone 14 Pro)
  // =========================================================================
  console.log('Switching to mobile viewport (390 x 844)...');
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.0 });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto('http://localhost:5173/?tab=dashboard');
  await mobilePage.waitForTimeout(2000);
  await loginIfNeeded(mobilePage);

  // 8. Mobile Map Mode
  console.log('Capturing 08-mobile-map-mode.png ...');
  const mModeMap = await mobilePage.$('.sgp-uwh-mode-btn[data-tab="dashboard-map"]');
  if (mModeMap) {
    await mModeMap.click();
    await mobilePage.waitForTimeout(1500);
  }
  await saveScreenshot(mobilePage, '08-mobile-map-mode.png');

  // 9. Mobile Network Mode
  console.log('Capturing 09-mobile-network-mode.png ...');
  const mModeNet = await mobilePage.$('.sgp-uwh-mode-btn[data-tab="dashboard-network"]');
  if (mModeNet) {
    await mModeNet.click();
    await mobilePage.waitForTimeout(2000);
  }
  await saveScreenshot(mobilePage, '09-mobile-network-mode.png');

  await browser.close();
  console.log('Visual audit complete! All screenshots captured successfully.');
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
