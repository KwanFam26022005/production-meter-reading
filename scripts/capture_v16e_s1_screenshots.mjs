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
  } catch (e) {}
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

    // 1. 01-map-clean-overview.png
    console.log('Capturing: 01-map-clean-overview.png...');
    await captureScreenshot(page, '01-map-clean-overview.png');

    // 2. 02-map-selected-meter.png
    console.log('Capturing: 02-map-selected-meter.png...');
    try {
      const meterPin = await page.$('.sgp-meter-layer .sgp-meter-point, .sgp-meter-point');
      if (meterPin) {
        await meterPin.click({ force: true });
        await page.waitForTimeout(1500);
      }
    } catch (e) {}
    await captureScreenshot(page, '02-map-selected-meter.png');

    // Close meter drawer before switching view
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);

    // Switch to Network Mode
    console.log('Switching to Network view...');
    const networkModeBtn = await page.$('button[title*="mạng lưới"], button[title*="Mạng lưới"], .sgp-cmd-switch-btn:has-text("Mạng lưới")');
    if (networkModeBtn) {
      await networkModeBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }

    // 3. 03-network-electricity-clean.png
    const elecTab = await page.$('.sgp-utility-network-view button:has-text("Điện"), button:has-text("Điện")');
    if (elecTab) {
      await elecTab.click({ force: true });
      await page.waitForTimeout(2000);
    }
    console.log('Capturing: 03-network-electricity-clean.png...');
    await captureScreenshot(page, '03-network-electricity-clean.png');

    // Select an electricity node to test selection reset later
    const elecNode = await page.$('.sgp-network-node');
    if (elecNode) {
      await elecNode.click({ force: true });
      await page.waitForTimeout(1500);
    }

    // 4. 04-network-water-clean.png
    const waterTab = await page.$('.sgp-utility-network-view button:has-text("Nước"), button:has-text("Nước")');
    if (waterTab) {
      await waterTab.click({ force: true });
      await page.waitForTimeout(2000);
    }
    console.log('Capturing: 04-network-water-clean.png...');
    await captureScreenshot(page, '04-network-water-clean.png');

    // 5. 05-network-utility-switch-selection-reset.png
    console.log('Capturing: 05-network-utility-switch-selection-reset.png...');
    await captureScreenshot(page, '05-network-utility-switch-selection-reset.png');

    // Switch to List View in Map Console
    console.log('Switching to List view...');
    const danhSachBtn = await page.$('button[title*="Danh sách"], .sgp-cmd-switch-btn:has-text("Danh sách")');
    if (danhSachBtn) {
      await danhSachBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }
    // 6. 06-list-correct-zones-units.png
    console.log('Capturing: 06-list-correct-zones-units.png...');
    await captureScreenshot(page, '06-list-correct-zones-units.png');

    // 9. 09-mobile-meter-list.png (capture while already on List view)
    console.log('Switching to Mobile Viewport 390x844 for list view...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(2000);
    console.log('Capturing: 09-mobile-meter-list.png...');
    await captureScreenshot(page, '09-mobile-meter-list.png');

    // Switch back to desktop
    console.log('Restoring desktop viewport 1440x900...');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(2000);

    // 10. 10-simulation-indicator-consistency.png
    console.log('Capturing: 10-simulation-indicator-consistency.png...');
    await captureScreenshot(page, '10-simulation-indicator-consistency.png');

    // Navigate to Admin Assets
    console.log('Navigating to Admin Assets...');
    const thietBiBtn = await page.$('.admin-nav-item:has-text("Thiết bị"), button[title="Thiết bị"]');
    if (thietBiBtn) {
      await thietBiBtn.click();
      await page.waitForTimeout(2500);
    }
    // 7. 07-admin-assets-polished.png
    console.log('Capturing: 07-admin-assets-polished.png...');
    await captureScreenshot(page, '07-admin-assets-polished.png');

    // 8. 08-admin-legacy-quarantine.png
    console.log('Switching scope filter to Legacy Test Data...');
    try {
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
    console.log('Capturing: 08-admin-legacy-quarantine.png...');
    await captureScreenshot(page, '08-admin-legacy-quarantine.png');

    console.log('All 10 R1 screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
