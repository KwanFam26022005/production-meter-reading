import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = 'D:\\Projects\\production-meter-reading\\production-meter-reading\\docs\\recovery\\v16e-r2\\screenshots';
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

async function verifyContainment(page, label) {
  const metrics = await page.evaluate(() => {
    return {
      innerWidth: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      shellScrollWidth: document.querySelector('.sgp-devices-shell')?.scrollWidth || null,
    };
  });
  const passDoc = metrics.docScrollWidth <= metrics.innerWidth + 1;
  const passBody = metrics.bodyScrollWidth <= metrics.innerWidth + 1;
  const pass = passDoc && passBody;
  console.log(`[CONTAINMENT CHECK] ${label}: ${pass ? 'PASS' : 'FAIL'} (innerWidth=${metrics.innerWidth}, docScrollWidth=${metrics.docScrollWidth}, bodyScrollWidth=${metrics.bodyScrollWidth}, shellScrollWidth=${metrics.shellScrollWidth})`);
  return { label, ...metrics, pass };
}

async function run() {
  console.log('Starting Playwright Edge browser for V16E-R2 Device Mobile Responsive audit...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/?tab=assets ...');
  await page.goto('http://localhost:5173/?tab=assets');
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

  await page.waitForSelector('.sgp-devices-shell, .admin-shell-layout', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const containmentResults = [];

  // =========================================================================
  // 1. Desktop Assets 1920x1080
  // =========================================================================
  console.log('Capturing 01-desktop-assets-1920.png...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  const haTangTab = await page.$('#tab-segment-assets, .sgp-devices-tab-btn:has-text("Hạ tầng")');
  if (haTangTab) await haTangTab.click();
  await page.waitForTimeout(1500);
  await saveScreenshot(page, '01-desktop-assets-1920.png');

  // =========================================================================
  // 2. Desktop Meters 1920x1080
  // =========================================================================
  console.log('Capturing 02-desktop-meters-1920.png...');
  const congToTab = await page.$('#tab-segment-meters, .sgp-devices-tab-btn:has-text("Công tơ")');
  if (congToTab) await congToTab.click();
  await page.waitForTimeout(1500);
  await saveScreenshot(page, '02-desktop-meters-1920.png');

  // =========================================================================
  // 3. Mobile Assets 390x844 (Default Card View)
  // =========================================================================
  console.log('Switching to mobile 390x844 for Hạ tầng...');
  await page.setViewportSize({ width: 390, height: 844 });
  const haTangTabMobile = await page.$('#tab-segment-assets, .sgp-devices-tab-btn:has-text("Hạ tầng")');
  if (haTangTabMobile) await haTangTabMobile.click();
  await page.waitForTimeout(1500);
  containmentResults.push(await verifyContainment(page, '03-mobile-assets-default (390x844)'));
  await saveScreenshot(page, '03-mobile-assets-default.png');

  // =========================================================================
  // 4. Mobile Assets Filter Disclosure Open
  // =========================================================================
  console.log('Opening mobile filter disclosure for Hạ tầng...');
  const assetsFilterToggle = await page.$('.admin-assets-mobile-filter-toggle');
  if (assetsFilterToggle) {
    await assetsFilterToggle.click();
    await page.waitForTimeout(1000);
  }
  containmentResults.push(await verifyContainment(page, '04-mobile-assets-filter (390x844)'));
  await saveScreenshot(page, '04-mobile-assets-filter.png');

  // Close filter
  if (assetsFilterToggle) {
    await assetsFilterToggle.click();
    await page.waitForTimeout(500);
  }

  // =========================================================================
  // 5. Mobile Asset Detail Drawer Open
  // =========================================================================
  console.log('Opening asset detail drawer...');
  const firstAssetCard = await page.$('.admin-asset-mobile-card');
  if (firstAssetCard) {
    await firstAssetCard.click();
    await page.waitForTimeout(1500);
  }
  containmentResults.push(await verifyContainment(page, '05-mobile-asset-detail (390x844)'));
  await saveScreenshot(page, '05-mobile-asset-detail.png');

  // Close detail drawer (click close button or press Escape)
  const closeDrawerBtn = await page.$('button[aria-label="Đóng chi tiết"]');
  if (closeDrawerBtn) {
    await closeDrawerBtn.click();
    await page.waitForTimeout(1000);
  } else {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }

  // =========================================================================
  // 6. Mobile Meters 390x844 (Default Card View)
  // =========================================================================
  console.log('Switching to mobile 390x844 for Công tơ...');
  const congToTabMobile = await page.$('#tab-segment-meters, .sgp-devices-tab-btn:has-text("Công tơ")');
  if (congToTabMobile) await congToTabMobile.click();
  await page.waitForTimeout(1500);
  containmentResults.push(await verifyContainment(page, '06-mobile-meters-default (390x844)'));
  await saveScreenshot(page, '06-mobile-meters-default.png');

  // =========================================================================
  // 7. Mobile Meters Filter Disclosure Open
  // =========================================================================
  console.log('Opening mobile filter disclosure for Công tơ...');
  const metersFilterToggle = await page.$('.admin-meters-mobile-filter-toggle');
  if (metersFilterToggle) {
    await metersFilterToggle.click();
    await page.waitForTimeout(1000);
  }
  containmentResults.push(await verifyContainment(page, '07-mobile-meters-filter (390x844)'));
  await saveScreenshot(page, '07-mobile-meters-filter.png');

  // Close filter
  if (metersFilterToggle) {
    await metersFilterToggle.click();
    await page.waitForTimeout(500);
  }

  // =========================================================================
  // 8. Mobile Meter Detail / Edit Drawer Open
  // =========================================================================
  console.log('Opening meter edit/detail drawer...');
  const firstMeterCard = await page.$('.admin-meter-mobile-card');
  if (firstMeterCard) {
    await firstMeterCard.click();
    await page.waitForTimeout(1500);
  }
  containmentResults.push(await verifyContainment(page, '08-mobile-meter-detail (390x844)'));
  await saveScreenshot(page, '08-mobile-meter-detail.png');

  // Close meter drawer
  const closeMeterBtn = await page.$('.admin-drawer-close, button[aria-label="Đóng bảng chỉnh sửa"]');
  if (closeMeterBtn) {
    await closeMeterBtn.click();
    await page.waitForTimeout(1000);
  } else {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }

  // =========================================================================
  // 9. Mobile Assets 360x800
  // =========================================================================
  console.log('Switching to mobile 360x800 for Hạ tầng...');
  await page.setViewportSize({ width: 360, height: 800 });
  const haTangTab360 = await page.$('#tab-segment-assets, .sgp-devices-tab-btn:has-text("Hạ tầng")');
  if (haTangTab360) await haTangTab360.click();
  await page.waitForTimeout(1500);
  containmentResults.push(await verifyContainment(page, '09-mobile-assets-360 (360x800)'));
  await saveScreenshot(page, '09-mobile-assets-360.png');

  // =========================================================================
  // 10. Mobile Meters 360x800
  // =========================================================================
  console.log('Switching to mobile 360x800 for Công tơ...');
  const congToTab360 = await page.$('#tab-segment-meters, .sgp-devices-tab-btn:has-text("Công tơ")');
  if (congToTab360) await congToTab360.click();
  await page.waitForTimeout(1500);
  containmentResults.push(await verifyContainment(page, '10-mobile-meters-360 (360x800)'));
  await saveScreenshot(page, '10-mobile-meters-360.png');

  await browser.close();

  console.log('\n================ CONTAINMENT SUMMARY ================');
  let allPass = true;
  for (const r of containmentResults) {
    console.log(`${r.label}: ${r.pass ? 'PASS' : 'FAIL'} (w=${r.innerWidth}, docScroll=${r.docScrollWidth}, bodyScroll=${r.bodyScrollWidth})`);
    if (!r.pass) allPass = false;
  }
  console.log('====================================================\n');

  if (!allPass) {
    console.error('CONTAINMENT VERIFICATION FAILED!');
    process.exit(1);
  } else {
    console.log('ALL CONTAINMENT CHECKS PASSED PERFECTLY!');
  }
}

run().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
