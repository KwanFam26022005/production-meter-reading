import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const REPO_OUT_DIR = path.resolve('docs/audit/v16e-a0/screenshots');
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
  console.log('Launching Edge browser at:', EDGE_PATH);
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

    console.log('Navigating to app on http://localhost:5173...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1500);

    const isLogin = await page.evaluate(() => Boolean(document.querySelector('input[type="password"]')));
    if (isLogin) {
      console.log('Logging in as admin 52300119...');
      await page.fill('#employeeCode', '52300119');
      await page.fill('#password', 'Admin123456!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2500);
    }

    console.log('Waiting for map console (.sgp-map-first-root)...');
    await page.waitForSelector('.sgp-map-first-root', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // 01: Current Map Zones
    console.log('Capturing: 01-current-map-zones.png...');
    await captureScreenshot(page, '01-current-map-zones.png');

    // 02: Current Meter Positions
    console.log('Capturing: 02-current-meter-positions.png...');
    // Ensure meter points are visible
    await page.waitForTimeout(500);
    await captureScreenshot(page, '02-current-meter-positions.png');

    // 03: Meter Zone Mismatch (Highlighting CT-008 / CT-001)
    console.log('Capturing: 03-meter-zone-mismatch.png...');
    await page.evaluate(() => {
      const el = document.querySelector('.sgp-meter-point');
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(1200);
    await captureScreenshot(page, '03-meter-zone-mismatch.png');

    // 04: Current Electricity Topology
    console.log('Switching to Network View (Electricity)...');
    const networkModeBtn = await page.$('button[title*="mạng lưới"], button:has-text("Mạng lưới")');
    if (networkModeBtn) {
      await networkModeBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.evaluate(() => {
        sessionStorage.setItem('map_workspace_view', 'network');
        window.location.search = '?view=network';
      });
      await page.waitForTimeout(2500);
    }
    console.log('Capturing: 04-current-electricity-topology.png...');
    await captureScreenshot(page, '04-current-electricity-topology.png');

    // 05: Current Water Topology
    console.log('Switching Utility to Water...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.includes('Cấp nước'));
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    console.log('Capturing: 05-current-water-topology.png...');
    await captureScreenshot(page, '05-current-water-topology.png');

    // Switch back to Map view
    console.log('Switching back to Map View...');
    const mapModeBtn = await page.$('button[title*="bản đồ"], button:has-text("Bản đồ")');
    if (mapModeBtn) {
      await mapModeBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.evaluate(() => {
        sessionStorage.setItem('map_workspace_view', 'map');
        window.location.search = '?view=map';
      });
      await page.waitForTimeout(2500);
    }

    // 06: Current Assets on Map
    console.log('Capturing: 06-current-assets-on-map.png...');
    await page.evaluate(() => {
      const assetEl = document.querySelector('.sgp-asset-glyph');
      if (assetEl) assetEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(1500);
    await captureScreenshot(page, '06-current-assets-on-map.png');

    // 07: Pres-Gate Impact
    console.log('Capturing: 07-pres-gate-impact.png (Focus on Cổng chính)...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.includes('Cổng chính'));
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    await captureScreenshot(page, '07-pres-gate-impact.png');

    // 08: Current Operational Overview
    console.log('Capturing: 08-current-operational-overview.png...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.includes('Tất cả') || btn.textContent.includes('Toàn cảng'));
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    await captureScreenshot(page, '08-current-operational-overview.png');

    console.log('ALL 8 AUDIT SCREENSHOTS CAPTURED SUCCESSFULLY.');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Audit screenshot capture failed:', err);
  process.exit(1);
});
