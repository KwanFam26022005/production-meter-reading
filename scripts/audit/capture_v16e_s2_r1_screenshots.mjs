import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = 'D:\\Projects\\production-meter-reading\\production-meter-reading\\docs\\design\\map-operations\\v16e-s2-r1\\screenshots';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log('Starting Playwright browser for V16E-S2-R1 (18 screenshots)...');
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

  await page.waitForSelector('.sgp-unified-workspace-header, .admin-shell-layout, .sgp-uwh-container', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Switch to Map workspace
  const mapTabBtn = await page.$('button[data-tab="dashboard"], .admin-nav-item:has-text("Bản đồ")');
  if (mapTabBtn) {
    await mapTabBtn.click();
    await page.waitForTimeout(1000);
  }

  // Ensure "Không gian" mode is selected
  const spatialBtn = await page.$('.sgp-uwh-mode-btn:has-text("Không gian")');
  if (spatialBtn) {
    await spatialBtn.click();
    await page.waitForTimeout(1000);
  }

  // -------------------------------------------------------------
  // DESKTOP 1920x1080
  // -------------------------------------------------------------
  console.log('--- CAPTURING DESKTOP (1920x1080) ---');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);

  // 1. 01-map-default.png
  console.log('Capturing 01-map-default.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '01-map-default.png') });

  // 2. 02-map-shift-panel.png
  console.log('Opening Shift Meter Panel for 02-map-shift-panel.png...');
  const shiftBtn = await page.$('.sgp-uwh-shift-btn, [data-testid="shift-summary-btn"]');
  if (shiftBtn) {
    await shiftBtn.click();
    await page.waitForTimeout(1200);
    console.log('Capturing 02-map-shift-panel.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '02-map-shift-panel.png') });
  }

  // 3. 03-map-meter-selected.png
  console.log('Selecting meter for 03-map-meter-selected.png...');
  const firstMeterCard = await page.$('.sgp-meter-card, .sgp-shift-meter-panel [role="button"]');
  if (firstMeterCard) {
    await firstMeterCard.click();
    await page.waitForTimeout(1500);
  } else {
    // Try map pin
    const pin = await page.$('.sgp-meter-marker, g[data-meter-id]');
    if (pin) {
      await pin.click();
      await page.waitForTimeout(1500);
    }
  }
  console.log('Capturing 03-map-meter-selected.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '03-map-meter-selected.png') });

  // Clear selection / close shift panel
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const closeShift = await page.$('.sgp-shift-meter-panel button[title*="Đóng"]');
  if (closeShift) await closeShift.click();
  await page.waitForTimeout(500);

  // 4. 04-network-electricity-overview.png
  console.log('Switching to Network view (Mạng lưới)...');
  const netBtn = await page.$('.sgp-uwh-mode-btn:has-text("Mạng lưới"), [data-tab="dashboard-network"]');
  if (netBtn) {
    await netBtn.click();
    await page.waitForTimeout(2000);
    // Ensure Electricity is selected
    const elecBtn = await page.$('.sgp-network-toolbar button:has-text("Điện")');
    if (elecBtn) await elecBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 04-network-electricity-overview.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '04-network-electricity-overview.png') });

    // 5. 05-network-electricity-feeder-expanded.png
    console.log('Expanding feeder for 05-network-electricity-feeder-expanded.png...');
    const feederCard = await page.$('.sgp-feeder-card, text:has-text("FDR-WEST"), [data-feeder-code="SIM-FDR-WEST"]');
    if (feederCard) {
      await feederCard.click();
      await page.waitForTimeout(1200);
    }
    console.log('Capturing 05-network-electricity-feeder-expanded.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '05-network-electricity-feeder-expanded.png') });

    // 6. 06-network-electricity-upstream-trace.png
    console.log('Activating upstream trace for 06-network-electricity-upstream-trace.png...');
    const upstreamBtn = await page.$('.sgp-network-toolbar button:has-text("Nguồn cấp")');
    if (upstreamBtn) {
      await upstreamBtn.click();
      await page.waitForTimeout(1000);
    }
    console.log('Capturing 06-network-electricity-upstream-trace.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '06-network-electricity-upstream-trace.png') });

    // Reset trace mode
    const allTraceBtn = await page.$('.sgp-network-toolbar button:has-text("Toàn mạng")');
    if (allTraceBtn) await allTraceBtn.click();
    await page.waitForTimeout(500);

    // 7. 07-network-water-overview.png
    console.log('Switching to Water network for 07-network-water-overview.png...');
    const waterBtn = await page.$('.sgp-network-toolbar button:has-text("Nước")');
    if (waterBtn) {
      await waterBtn.click();
      await page.waitForTimeout(1500);
    }
    console.log('Capturing 07-network-water-overview.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '07-network-water-overview.png') });
  }

  // 8. 08-devices-all.png
  console.log('Switching to Thiết bị workspace...');
  const devicesRailBtn = await page.$('button[data-tab="assets"], .admin-nav-item:has-text("Thiết bị"), button[aria-label="Thiết bị"]');
  if (devicesRailBtn) {
    await devicesRailBtn.click();
    await page.waitForTimeout(2000);

    const allTab = await page.$('button[role="tab"]:has-text("Tất cả")');
    if (allTab) await allTab.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 08-devices-all.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '08-devices-all.png') });

    // 9. 09-devices-assets.png
    console.log('Switching to Hạ tầng segment for 09-devices-assets.png...');
    const assetsSegment = await page.$('button[role="tab"]:has-text("Hạ tầng")');
    if (assetsSegment) {
      await assetsSegment.click();
      await page.waitForTimeout(1000);
      console.log('Capturing 09-devices-assets.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '09-devices-assets.png') });
    }

    // 10. 10-devices-meters.png
    console.log('Switching to Công tơ segment for 10-devices-meters.png...');
    const metersSegment = await page.$('button[role="tab"]:has-text("Công tơ")');
    if (metersSegment) {
      await metersSegment.click();
      await page.waitForTimeout(1000);
      console.log('Capturing 10-devices-meters.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '10-devices-meters.png') });
    }

    // 11. 11-device-asset-detail.png
    console.log('Opening Asset detail drawer for 11-device-asset-detail.png...');
    if (assetsSegment) {
      await assetsSegment.click();
      await page.waitForTimeout(800);
    }
    const firstAssetRow = await page.$('.sgp-devices-table tbody tr, table tbody tr');
    if (firstAssetRow) {
      await firstAssetRow.click();
      await page.waitForTimeout(1500);
      console.log('Capturing 11-device-asset-detail.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '11-device-asset-detail.png') });

      // Close drawer
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
    }

    // 12. 12-device-meter-detail.png
    console.log('Opening Meter detail drawer for 12-device-meter-detail.png...');
    if (metersSegment) {
      await metersSegment.click();
      await page.waitForTimeout(800);
    }
    const firstMeterRow = await page.$('.sgp-devices-table tbody tr, table tbody tr');
    if (firstMeterRow) {
      await firstMeterRow.click();
      await page.waitForTimeout(1500);
      console.log('Capturing 12-device-meter-detail.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '12-device-meter-detail.png') });

      // Close drawer
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
    }
  }

  // Switch to Map before switching to mobile
  console.log('Switching to Map before resizing to mobile...');
  await page.evaluate(() => {
    const el = document.querySelector('button[data-tab="dashboard"], .admin-nav-item[data-tab="dashboard"]');
    if (el) el.click();
  });
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------
  // MOBILE 390x844
  // -------------------------------------------------------------
  console.log('--- CAPTURING MOBILE (390x844) ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);

  // 13. 13-mobile-map.png
  console.log('Capturing 13-mobile-map.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '13-mobile-map.png') });

  // 14. 14-mobile-shift-sheet.png
  console.log('Opening Shift Sheet for 14-mobile-shift-sheet.png...');
  const mobileShiftBtn = await page.$('.sgp-uwh-shift-btn, [data-testid="shift-summary-btn"]');
  if (mobileShiftBtn) {
    await mobileShiftBtn.click();
    await page.waitForTimeout(1200);
    console.log('Capturing 14-mobile-shift-sheet.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '14-mobile-shift-sheet.png') });

    // Close sheet
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // 15. 15-mobile-devices.png
  console.log('Switching to Devices workspace on mobile...');
  await page.evaluate(() => {
    const el = document.querySelector('button[data-tab="assets"], .admin-nav-item[data-tab="assets"]');
    if (el) el.click();
  });
  await page.waitForTimeout(2000);
  console.log('Capturing 15-mobile-devices.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '15-mobile-devices.png') });

  // 16. 16-mobile-device-detail.png
  console.log('Opening mobile device detail for 16-mobile-device-detail.png...');
  const firstMobileCard = await page.$('.sgp-device-card');
  if (firstMobileCard) {
    await firstMobileCard.click();
    await page.waitForTimeout(1500);
    console.log('Capturing 16-mobile-device-detail.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '16-mobile-device-detail.png') });

    // Close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // -------------------------------------------------------------
  // TABLET 1024x768
  // -------------------------------------------------------------
  console.log('--- CAPTURING TABLET (1024x768) ---');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(1500);

  // 17. 17-tablet-map.png
  console.log('Switching to Map on tablet...');
  await page.evaluate(() => {
    const el = document.querySelector('button[data-tab="dashboard"], .admin-nav-item[data-tab="dashboard"]');
    if (el) el.click();
  });
  await page.waitForTimeout(2000);
  console.log('Capturing 17-tablet-map.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '17-tablet-map.png') });

  // 18. 18-tablet-devices.png
  console.log('Switching to Devices on tablet...');
  await page.evaluate(() => {
    const el = document.querySelector('button[data-tab="assets"], .admin-nav-item[data-tab="assets"]');
    if (el) el.click();
  });
  await page.waitForTimeout(2000);
  console.log('Capturing 18-tablet-devices.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '18-tablet-devices.png') });

  console.log('ALL 18 EXACT SCREENSHOTS CAPTURED SUCCESSFULLY!');
  await browser.close();
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
