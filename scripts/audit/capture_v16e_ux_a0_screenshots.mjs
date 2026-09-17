import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = 'D:\\Projects\\production-meter-reading\\production-meter-reading\\docs\\audit\\v16e-ux-a0\\screenshots';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.0 });
  const page = await context.newPage();

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Login if needed
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

  // 1. 01-sidebar-map.png
  console.log('1. Capturing 01-sidebar-map.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '01-sidebar-map.png') });

  // 2. 02-map-meter-selected.png (click a meter pin or meter in sidebar/hud)
  console.log('2. Selecting a meter on Map...');
  const meterGlyph = await page.$('.sgp-meter-marker, g[data-meter-id], .sgp-meter-glyph, circle.meter-pin');
  if (meterGlyph) {
    await meterGlyph.click();
  } else {
    // try clicking via command bar search or list
    const searchBtn = await page.$('button[title*="Tìm kiếm"], input[placeholder*="Tìm công tơ"]');
    if (searchBtn) {
      await searchBtn.click();
      await page.keyboard.type('SIM-EM-001');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
    }
  }
  await page.waitForTimeout(1500);
  console.log('Capturing 02-map-meter-selected.png...');
  await page.screenshot({ path: path.join(OUT_DIR, '02-map-meter-selected.png') });

  // 3. 03-network-asset-selected.png
  console.log('3. Switching to Network view...');
  const netBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-network"]');
  if (netBtn) {
    await netBtn.click();
    await page.waitForTimeout(2000);
    // Click an asset node
    const node = await page.$('.sgp-net-node, rect.net-node-box, g.utility-node');
    if (node) {
      await node.click();
      await page.waitForTimeout(1000);
    }
    console.log('Capturing 03-network-asset-selected.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '03-network-asset-selected.png') });
  }

  // 4. 04-list-default.png
  console.log('4. Switching to List view...');
  const listBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-list"]');
  if (listBtn) {
    await listBtn.click();
    await page.waitForTimeout(2000);
    console.log('Capturing 04-list-default.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '04-list-default.png') });

    // 5. 05-list-meter-selected.png
    console.log('5. Selecting meter in List view...');
    const row = await page.$('.sgp-list-row');
    if (row) {
      await row.click();
      await page.waitForTimeout(1500);
      console.log('Capturing 05-list-meter-selected.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '05-list-meter-selected.png') });
    }
  }

  // 6. 06-assets-default.png
  console.log('6. Opening Assets tab...');
  const assetsBtn = await page.$('.sgp-uwh-mode-btn[data-tab="assets"]');
  if (assetsBtn) {
    await assetsBtn.click();
    await page.waitForTimeout(2000);
    console.log('Capturing 06-assets-default.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '06-assets-default.png') });

    // 7. 07-asset-selected.png
    console.log('7. Selecting asset in Assets tab...');
    const assetRow = await page.$('tbody tr');
    if (assetRow) {
      await assetRow.click();
      await page.waitForTimeout(1500);
      console.log('Capturing 07-asset-selected.png...');
      await page.screenshot({ path: path.join(OUT_DIR, '07-asset-selected.png') });
    }
  }

  // 8. 08-verification-default.png
  console.log('8. Opening Verification tab...');
  const verifBtn = await page.$('.sgp-uwh-mode-btn[data-tab="verification"]');
  if (verifBtn) {
    await verifBtn.click();
    await page.waitForTimeout(2000);
    console.log('Capturing 08-verification-default.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '08-verification-default.png') });

    // 9. 09-verification-detail.png
    console.log('9. Selecting item in Verification tab...');
    const verifItem = await page.$('tbody tr, button:has-text("Thẩm định"), button:has-text("Xem hồ sơ"), .cursor-pointer');
    if (verifItem) {
      await verifItem.click();
      await page.waitForTimeout(1500);
    }
    console.log('Capturing 09-verification-detail.png...');
    await page.screenshot({ path: path.join(OUT_DIR, '09-verification-detail.png') });
  }

  console.log('Done capturing all 9 audit screenshots.');
  await browser.close();
}

run().catch((err) => {
  console.error('Screenshot audit failed:', err);
  process.exit(1);
});
