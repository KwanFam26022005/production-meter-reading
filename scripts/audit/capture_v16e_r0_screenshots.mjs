import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = 'D:\\Projects\\production-meter-reading\\production-meter-reading\\docs\\recovery\\v16e-r0\\screenshots';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log('Starting Playwright Edge browser for V16E-R0 recovery screenshots...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');
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

  // Switch to Map workspace
  const mapTabBtn = await page.$('button[data-tab="dashboard"], .admin-nav-item:has-text("Bản đồ")');
  if (mapTabBtn) {
    await mapTabBtn.click();
    await page.waitForTimeout(1000);
  }

  // Ensure "Bản đồ" view mode is selected
  const mapModeBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-map"], .sgp-uwh-mode-btn:has-text("Bản đồ"), .sgp-cmd-switch-btn:has-text("Bản đồ")');
  if (mapModeBtn) {
    await mapModeBtn.click();
    await page.waitForTimeout(1500);
  }

  // -------------------------------------------------------------
  // 1. 01-map-1920.png
  // -------------------------------------------------------------
  console.log('Capturing 01-map-1920.png...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '01-map-1920.png') });

  // -------------------------------------------------------------
  // 2. 02-map-1366.png
  // -------------------------------------------------------------
  console.log('Capturing 02-map-1366.png...');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '02-map-1366.png') });

  // -------------------------------------------------------------
  // 3. 03-map-1280.png
  // -------------------------------------------------------------
  console.log('Capturing 03-map-1280.png...');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '03-map-1280.png') });

  // Reset to 1920x1080
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------
  // 4. 04-map-meter-selected.png
  // -------------------------------------------------------------
  console.log('Selecting meter for 04-map-meter-selected.png...');
  const pin = await page.$('.sgp-marker, .sgp-meter-pin, svg circle, g[data-meter-id], .leaflet-marker-icon, .sgp-meter-marker');
  if (pin) {
    await pin.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(OUT_DIR, '04-map-meter-selected.png') });

  // Clear selection
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // -------------------------------------------------------------
  // 5. 05-map-network.png
  // -------------------------------------------------------------
  console.log('Switching to Network mode for 05-map-network.png...');
  const netBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-network"], .sgp-uwh-mode-btn:has-text("Mạng lưới"), .sgp-cmd-switch-btn:has-text("Mạng lưới")');
  if (netBtn) {
    await netBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, '05-map-network.png') });

  // -------------------------------------------------------------
  // 6. 06-devices-assets.png
  // -------------------------------------------------------------
  console.log('Switching to Thiết bị -> Hạ tầng for 06-devices-assets.png...');
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
  await page.screenshot({ path: path.join(OUT_DIR, '06-devices-assets.png') });

  // -------------------------------------------------------------
  // 7. 07-devices-meters.png
  // -------------------------------------------------------------
  console.log('Switching to Thiết bị -> Công tơ for 07-devices-meters.png...');
  const congToBtn = await page.$('#tab-segment-meters, .sgp-devices-tab-btn:has-text("Công tơ")');
  if (congToBtn) {
    await congToBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, '07-devices-meters.png') });

  // -------------------------------------------------------------
  // 8. 08-tools-menu.png
  // -------------------------------------------------------------
  console.log('Opening Tools menu popover for 08-tools-menu.png...');
  const toolsRailBtn = await page.$('.admin-nav-item:has-text("Công cụ"), button[aria-label="Công cụ quản trị"]');
  if (toolsRailBtn) {
    await toolsRailBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, '08-tools-menu.png') });

  // Close tools popover
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // -------------------------------------------------------------
  // 9. 09-mobile-map-390.png
  // -------------------------------------------------------------
  console.log('Switching to Mobile 390x844 for 09-mobile-map-390.png...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/?tab=dashboard');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '09-mobile-map-390.png') });

  // -------------------------------------------------------------
  // 10. 10-mobile-devices-390.png
  // -------------------------------------------------------------
  console.log('Switching to Mobile Thiết bị for 10-mobile-devices-390.png...');
  await page.goto('http://localhost:5173/?tab=assets');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '10-mobile-devices-390.png') });

  console.log('All 10 recovery screenshots captured successfully in:', OUT_DIR);
  await browser.close();
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
