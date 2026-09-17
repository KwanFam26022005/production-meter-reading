import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = 'D:\\Projects\\production-meter-reading\\production-meter-reading\\docs\\design\\map-operations\\v16e-s2\\screenshots';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log('Starting Playwright browser for V16E-S2 screenshots...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.0 });
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

  await page.waitForSelector('.sgp-unified-workspace-header, .admin-shell-layout', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 1. 01_desktop_map_default.png (1440x900)
  console.log('Capturing 01_desktop_map_default.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '01_desktop_map_default.png') });

  // 2. 02_desktop_map_shift_panel_open.png (1440x900)
  console.log('Opening Shift Meter Panel...');
  const shiftBtn = await page.$('[data-testid="shift-summary-btn"]');
  if (shiftBtn) {
    await shiftBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 02_desktop_map_shift_panel_open.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '02_desktop_map_shift_panel_open.png') });

    // Close shift panel by clicking close button or pressing Esc
    const closeBtn = await page.$('.sgp-shift-meter-panel button[title*="Đóng"]');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // 3. 03_desktop_map_meter_selected.png (1440x900)
  console.log('Selecting a meter on map...');
  const meterGlyph = await page.$('.sgp-meter-marker, g[data-meter-id], circle.meter-pin');
  if (meterGlyph) {
    await meterGlyph.click();
    await page.waitForTimeout(1500);
  } else {
    // Open shift panel and click first meter
    if (shiftBtn) {
      await shiftBtn.click();
      await page.waitForTimeout(500);
      const firstRow = await page.$('.sgp-shift-meter-panel [role="button"]');
      if (firstRow) await firstRow.click();
      await page.waitForTimeout(1500);
    }
  }
  console.log('Capturing 03_desktop_map_meter_selected.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '03_desktop_map_meter_selected.png') });

  // Clear selection
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 4. 04_desktop_map_asset_selected.png (1440x900)
  console.log('Selecting an asset on map...');
  const assetPin = await page.$('.sgp-asset-marker, g[data-asset-id]');
  if (assetPin) {
    await assetPin.click();
    await page.waitForTimeout(1500);
  }
  console.log('Capturing 04_desktop_map_asset_selected.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '04_desktop_map_asset_selected.png') });

  // Clear selection
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 5. 05_desktop_network_default.png (1440x900)
  console.log('Switching to Network view (Mạng lưới)...');
  const netBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-network"]');
  if (netBtn) {
    await netBtn.click();
    await page.waitForTimeout(2000);
    console.log('Capturing 05_desktop_network_default.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '05_desktop_network_default.png') });

    // 6. 06_desktop_network_node_selected.png (1440x900)
    console.log('Selecting a node in Network view...');
    const node = await page.$('.sgp-net-node, rect.net-node-box, g.utility-node, svg g[cursor="pointer"]');
    if (node) {
      await node.click();
      await page.waitForTimeout(1500);
    }
    console.log('Capturing 06_desktop_network_node_selected.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '06_desktop_network_node_selected.png') });
  }

  // 7. 07_desktop_devices_all.png (1440x900)
  console.log('Switching to Thiết bị workspace...');
  const devicesRailBtn = await page.$('button[data-tab="assets"], .admin-nav-item:has-text("Thiết bị"), button[aria-label="Thiết bị"]');
  if (devicesRailBtn) {
    await devicesRailBtn.click();
    await page.waitForTimeout(2000);
    console.log('Capturing 07_desktop_devices_all.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '07_desktop_devices_all.png') });

    // 8. 08_desktop_devices_assets.png (1440x900)
    console.log('Clicking Hạ tầng segment...');
    const assetsSegmentBtn = await page.$('button[role="tab"]:has-text("Hạ tầng")');
    if (assetsSegmentBtn) {
      await assetsSegmentBtn.click();
      await page.waitForTimeout(1000);
      console.log('Capturing 08_desktop_devices_assets.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '08_desktop_devices_assets.png') });
    }

    // 9. 09_desktop_devices_meters.png (1440x900)
    console.log('Clicking Công tơ segment...');
    const metersSegmentBtn = await page.$('button[role="tab"]:has-text("Công tơ")');
    if (metersSegmentBtn) {
      await metersSegmentBtn.click();
      await page.waitForTimeout(1000);
      console.log('Capturing 09_desktop_devices_meters.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '09_desktop_devices_meters.png') });
    }

    // 10. 10_desktop_devices_attention_filter.png (1440x900)
    console.log('Activating [Cần chú ý] filter...');
    const allSegmentBtn = await page.$('button[role="tab"]:has-text("Tất cả")');
    if (allSegmentBtn) await allSegmentBtn.click();
    await page.waitForTimeout(500);
    const attentionBtn = await page.$('button:has-text("Cần chú ý")');
    if (attentionBtn) {
      await attentionBtn.click();
      await page.waitForTimeout(1000);
      console.log('Capturing 10_desktop_devices_attention_filter.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '10_desktop_devices_attention_filter.png') });
      // Turn off attention filter
      await attentionBtn.click();
      await page.waitForTimeout(500);
    }

    // 11. 11_desktop_devices_asset_detail_open.png (1440x900)
    console.log('Opening Asset detail drawer...');
    if (assetsSegmentBtn) {
      await assetsSegmentBtn.click();
      await page.waitForTimeout(500);
    }
    const firstAssetRow = await page.$('table tbody tr');
    if (firstAssetRow) {
      await firstAssetRow.click();
      await page.waitForTimeout(1500);
      console.log('Capturing 11_desktop_devices_asset_detail_open.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '11_desktop_devices_asset_detail_open.png') });
      // Close drawer
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 12. 12_desktop_devices_meter_detail_open.png (1440x900)
    console.log('Opening Meter detail drawer...');
    if (metersSegmentBtn) {
      await metersSegmentBtn.click();
      await page.waitForTimeout(500);
    }
    const firstMeterRow = await page.$('table tbody tr');
    if (firstMeterRow) {
      await firstMeterRow.click();
      await page.waitForTimeout(1500);
      console.log('Capturing 12_desktop_devices_meter_detail_open.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '12_desktop_devices_meter_detail_open.png') });
      // Close drawer
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // 13. 13_mobile_map_default.png (390x844)
  console.log('Switching to Map before resizing to mobile...');
  const mapRailBtn = await page.$('button[data-tab="dashboard"], .admin-nav-item:has-text("Bản đồ")');
  if (mapRailBtn) {
    await mapRailBtn.click();
    await page.waitForTimeout(1000);
  }
  console.log('Resizing to mobile (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);
  console.log('Capturing 13_mobile_map_default.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '13_mobile_map_default.png') });

  // 14. 14_mobile_devices_default.png (390x844)
  console.log('Opening mobile drawer to switch to Thiết bị...');
  const menuToggle = await page.$('.admin-sidebar-toggle-btn');
  if (menuToggle) {
    await menuToggle.click();
    await page.waitForTimeout(800);
    const drawerAssetsBtn = await page.$('.admin-drawer-nav-item[data-tab="assets"]');
    if (drawerAssetsBtn) {
      await drawerAssetsBtn.click();
      await page.waitForTimeout(2000);
    }
  }
  console.log('Capturing 14_mobile_devices_default.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '14_mobile_devices_default.png') });

  console.log('All 14 screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
