import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const REPO_OUT_DIR = path.resolve('docs/design/map-operations/v16e-s1/screenshots');
const ARTIFACT_OUT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\a062cd27-5c2c-4b3e-b4f4-86ca8989a904\\screenshots';

for (const dir of [REPO_OUT_DIR, ARTIFACT_OUT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, filename) {
  const repoPath = path.join(REPO_OUT_DIR, filename);
  const artifactPath = path.join(ARTIFACT_OUT_DIR, filename);
  await page.screenshot({ path: repoPath });
  try {
    fs.copyFileSync(repoPath, artifactPath);
  } catch (e) {
    // ignore
  }
  console.log(`[CAPTURED] ${filename}`);
}

async function run() {
  console.log('Launching browser at:', EDGE_PATH);
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    console.log('Navigating to app...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1500);

    const isLogin = await page.evaluate(() => Boolean(document.querySelector('input[type="password"]')));
    if (isLogin) {
      console.log('Logging in as admin 52300119...');
      await page.fill('#employeeCode', '52300119');
      await page.fill('#password', 'Admin123456!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    console.log('Waiting for map console...');
    await page.waitForSelector('.sgp-map-first-root', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // 1. 01-5zone-simulation-map.png
    console.log('Capturing: 01-5zone-simulation-map.png...');
    await captureScreenshot(page, '01-5zone-simulation-map.png');

    // 2. 02-simulation-badge-quiet.png
    console.log('Capturing: 02-simulation-badge-quiet.png...');
    await captureScreenshot(page, '02-simulation-badge-quiet.png');

    // 3. 03-simulated-meters-on-map.png
    console.log('Capturing: 03-simulated-meters-on-map.png...');
    try {
      const point = await page.$('.sgp-meter-point, circle');
      if (point) {
        await point.hover({ force: true, timeout: 3000 });
        await page.waitForTimeout(500);
      }
    } catch (e) {}
    await captureScreenshot(page, '03-simulated-meters-on-map.png');

    // 4. 04-electricity-network-view.png
    console.log('Switching to Utility Network View (Electricity)...');
    try {
      const networkModeBtn = await page.$('button[title*="mạng lưới"], button:has-text("Mạng lưới")');
      if (networkModeBtn) {
        await networkModeBtn.click();
        await page.waitForTimeout(2500);
      }
      const elecTab = await page.$('button:has-text("Điện")');
      if (elecTab) {
        await elecTab.click();
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      console.log('Network switch note:', e.message);
    }
    console.log('Capturing: 04-electricity-network-view.png...');
    await captureScreenshot(page, '04-electricity-network-view.png');

    // 5. 05-water-network-view.png
    console.log('Switching to Water Tab...');
    try {
      const waterTab = await page.$('button:has-text("Nước")');
      if (waterTab) {
        await waterTab.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('Water tab note:', e.message);
    }
    console.log('Capturing: 05-water-network-view.png...');
    await captureScreenshot(page, '05-water-network-view.png');

    // 6. 06-asset-context-surface.png
    console.log('Selecting node to open context surface...');
    try {
      const nodeEl = await page.$('.sgp-network-node');
      if (nodeEl) {
        await nodeEl.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('Node select note:', e.message);
    }
    console.log('Capturing: 06-asset-context-surface.png...');
    await captureScreenshot(page, '06-asset-context-surface.png');

    // 7. 07-admin-assets-simulation-list.png
    console.log('Navigating to Admin Assets...');
    const thietBiBtn = await page.$('.admin-nav-item:has-text("Thiết bị"), button[title="Thiết bị"]');
    if (thietBiBtn) {
      await thietBiBtn.click();
      await page.waitForTimeout(2500);
    }
    console.log('Capturing: 07-admin-assets-simulation-list.png...');
    await captureScreenshot(page, '07-admin-assets-simulation-list.png');

    // 8. 08-admin-assets-legacy-quarantine.png
    console.log('Switching scope filter to Legacy Test Data...');
    try {
      // Find select for scope
      const selects = await page.$$('select');
      for (const sel of selects) {
        const text = await sel.innerText();
        if (text.includes('Mô phỏng') || text.includes('Dữ liệu thử nghiệm cũ')) {
          await sel.selectOption('LEGACY_TEST');
          await page.waitForTimeout(2500);
          break;
        }
      }
    } catch (e) {
      console.log('Select option note:', e.message);
    }
    console.log('Capturing: 08-admin-assets-legacy-quarantine.png...');
    await captureScreenshot(page, '08-admin-assets-legacy-quarantine.png');

    // 9. 09-admin-meters-simulation-list.png
    console.log('Navigating to Meters View in Map Console...');
    const banDoBtn = await page.$('.admin-nav-item:has-text("Bản đồ"), button[title="Bản đồ"]');
    if (banDoBtn) {
      await banDoBtn.click();
      await page.waitForTimeout(2000);
    }
    // Click Danh sách button in command bar
    const danhSachBtn = await page.$('button:has-text("Danh sách")');
    if (danhSachBtn) {
      await danhSachBtn.click();
      await page.waitForTimeout(2500);
    }
    console.log('Capturing: 09-admin-meters-simulation-list.png...');
    await captureScreenshot(page, '09-admin-meters-simulation-list.png');

    // 10. 10-mobile-simulation-view.png
    console.log('Switching to Mobile Viewport 390x844...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(2500);
    console.log('Capturing: 10-mobile-simulation-view.png...');
    await captureScreenshot(page, '10-mobile-simulation-view.png');

    console.log('All 10 runtime screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
