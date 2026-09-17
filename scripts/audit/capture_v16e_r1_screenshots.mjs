import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = 'D:\\Projects\\production-meter-reading\\production-meter-reading\\docs\\recovery\\v16e-r1\\screenshots';
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\7f074780-35bc-4a92-8247-48c96cd40ce2\\screenshots';

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

async function run() {
  console.log('Starting Playwright Edge browser for V16E-R1 navigation & mobile audit...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/?tab=dashboard ...');
  await page.goto('http://localhost:5173/?tab=dashboard');
  await page.waitForTimeout(2000);

  // Login as Admin if on login screen
  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    console.log('Logging in as Admin (52300119)...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  await page.waitForSelector('.sgp-unified-workspace-header, .admin-shell-layout, .sgp-map-first-root', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Switch to Map workspace & ensure map view mode
  const mapTabBtn = await page.$('button[data-tab="dashboard"], .admin-nav-item:has-text("Bản đồ")');
  if (mapTabBtn) {
    await mapTabBtn.click();
    await page.waitForTimeout(1000);
  }
  const mapModeBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-map"]');
  if (mapModeBtn) {
    await mapModeBtn.click();
    await page.waitForTimeout(1500);
  }

  // -------------------------------------------------------------
  // 1. 01-map-1920-nav-clean.png
  // -------------------------------------------------------------
  console.log('Capturing 01-map-1920-nav-clean.png...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1500);
  await saveScreenshot(page, '01-map-1920-nav-clean.png');

  // -------------------------------------------------------------
  // 2. 02-map-1366-nav-clean.png
  // -------------------------------------------------------------
  console.log('Capturing 02-map-1366-nav-clean.png...');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(1500);
  await saveScreenshot(page, '02-map-1366-nav-clean.png');

  // -------------------------------------------------------------
  // 3. 03-map-1280-nav-clean.png
  // -------------------------------------------------------------
  console.log('Capturing 03-map-1280-nav-clean.png...');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(1500);
  await saveScreenshot(page, '03-map-1280-nav-clean.png');

  // Reset viewport to 1920x1080 for desktop device views
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------
  // 4. 04-devices-assets-nav.png
  // -------------------------------------------------------------
  console.log('Switching to Thiết bị -> Hạ tầng for 04-devices-assets-nav.png...');
  const devicesRailBtn = await page.$('button[data-tab="assets"], .admin-nav-item:has-text("Thiết bị")');
  if (devicesRailBtn) {
    await devicesRailBtn.click();
    await page.waitForTimeout(2000);
  }
  const haTangBtn = await page.$('#tab-segment-assets, .sgp-devices-tab-btn:has-text("Hạ tầng")');
  if (haTangBtn) {
    await haTangBtn.click();
    await page.waitForTimeout(1500);
  }
  await saveScreenshot(page, '04-devices-assets-nav.png');

  // -------------------------------------------------------------
  // 5. 05-devices-meters-nav.png
  // -------------------------------------------------------------
  console.log('Switching to Thiết bị -> Công tơ for 05-devices-meters-nav.png...');
  const congToBtn = await page.$('#tab-segment-meters, .sgp-devices-tab-btn:has-text("Công tơ")');
  if (congToBtn) {
    await congToBtn.click();
    await page.waitForTimeout(2000);
  }
  await saveScreenshot(page, '05-devices-meters-nav.png');

  // -------------------------------------------------------------
  // 6. 06-tools-popover.png
  // -------------------------------------------------------------
  console.log('Opening Tools menu popover for 06-tools-popover.png...');
  const toolsRailBtn = await page.$('.admin-nav-item:has-text("Công cụ"), button[aria-label="Công cụ quản trị"]');
  if (toolsRailBtn) {
    await toolsRailBtn.click();
    await page.waitForTimeout(1000);
  }
  await saveScreenshot(page, '06-tools-popover.png');

  // Close tools popover
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // -------------------------------------------------------------
  // 7. 07-mobile-map.png (Mobile 390x844 Map)
  // -------------------------------------------------------------
  console.log('Switching to Mobile 390x844 for 07-mobile-map.png...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/?tab=dashboard');
  await page.waitForTimeout(2500);
  // Ensure Map mode button is active
  const mobMapModeBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-map"]');
  if (mobMapModeBtn) {
    await mobMapModeBtn.click();
    await page.waitForTimeout(1000);
  }
  await saveScreenshot(page, '07-mobile-map.png');

  // -------------------------------------------------------------
  // 8. 08-mobile-map-menu.png (Mobile Drawer open)
  // -------------------------------------------------------------
  console.log('Opening mobile drawer for 08-mobile-map-menu.png...');
  const drawerToggleBtn = await page.$('.admin-sidebar-toggle-btn');
  if (drawerToggleBtn) {
    await drawerToggleBtn.click();
    await page.waitForTimeout(1500);
  }
  await saveScreenshot(page, '08-mobile-map-menu.png');

  // Close drawer
  const drawerCloseBtn = await page.$('.admin-drawer-close-btn');
  if (drawerCloseBtn) {
    await drawerCloseBtn.click();
    await page.waitForTimeout(500);
  } else {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // -------------------------------------------------------------
  // 9. 09-mobile-map-sorca.png (Mobile Map switched to Sổ ca)
  // -------------------------------------------------------------
  console.log('Switching internal map mode to Sổ ca for 09-mobile-map-sorca.png...');
  const sorCaBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-list"], .sgp-uwh-mode-btn:has-text("Sổ ca")');
  if (sorCaBtn) {
    await sorCaBtn.click();
    await page.waitForTimeout(2000);
  }
  await saveScreenshot(page, '09-mobile-map-sorca.png');

  // -------------------------------------------------------------
  // 10. 10-mobile-devices-assets.png (Mobile Thiết bị -> Hạ tầng)
  // -------------------------------------------------------------
  console.log('Navigating to Mobile Thiết bị (assets) for 10-mobile-devices-assets.png...');
  await page.goto('http://localhost:5173/?tab=assets');
  await page.waitForTimeout(2500);
  const mobHaTangBtn = await page.$('#tab-segment-assets, .sgp-devices-tab-btn:has-text("Hạ tầng")');
  if (mobHaTangBtn) {
    await mobHaTangBtn.click();
    await page.waitForTimeout(1500);
  }
  await saveScreenshot(page, '10-mobile-devices-assets.png');

  // -------------------------------------------------------------
  // 11. 11-mobile-devices-meters.png (Mobile Thiết bị -> Công tơ)
  // -------------------------------------------------------------
  console.log('Navigating to Mobile Thiết bị (meters) for 11-mobile-devices-meters.png...');
  await page.goto('http://localhost:5173/?tab=meters');
  await page.waitForTimeout(2500);
  const mobCongToBtn = await page.$('#tab-segment-meters, .sgp-devices-tab-btn:has-text("Công tơ")');
  if (mobCongToBtn) {
    await mobCongToBtn.click();
    await page.waitForTimeout(1500);
  }
  await saveScreenshot(page, '11-mobile-devices-meters.png');

  // -------------------------------------------------------------
  // 12. 12-mobile-tools-menu.png (Mobile Secondary Tool, e.g. Lịch ghi)
  // -------------------------------------------------------------
  console.log('Navigating to Mobile Secondary Tool (schedules) for 12-mobile-tools-menu.png...');
  await page.goto('http://localhost:5173/?tab=schedules');
  await page.waitForTimeout(2500);
  await saveScreenshot(page, '12-mobile-tools-menu.png');

  console.log('All 12 V16E-R1 review screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
