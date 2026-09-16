import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const REPO_OUT_DIR = path.resolve('docs/design/map-operations/v16e/screenshots');
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
    await page.waitForTimeout(1000);

    const isLogin = await page.evaluate(() => Boolean(document.querySelector('input[type="password"]')));
    if (isLogin) {
      console.log('Logging in as admin 52300119...');
      await page.fill('#employeeCode', '52300119');
      await page.fill('#password', 'Admin123456!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2500);
    }

    console.log('Waiting for map console...');
    await page.waitForSelector('.sgp-map-first-root', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // 1. Map Overview with Asset Layer
    console.log('Capturing: 01-map-overview.png...');
    await captureScreenshot(page, '01-map-overview.png');

    // 2. Map Asset Selected + Context Surface
    console.log('Selecting asset on map...');
    await page.evaluate(() => {
      const el = document.querySelector('.sgp-asset-glyph') || document.querySelector('.sgp-meter-point');
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(1500);
    console.log('Capturing: 02-map-asset-selected.png...');
    await captureScreenshot(page, '02-map-asset-selected.png');

    // 3. Network View (Electricity)
    console.log('Switching to Network View via Command Bar...');
    const networkModeBtn = await page.$('button[title*="mạng lưới"], button:has-text("Mạng lưới")');
    if (networkModeBtn) {
      await networkModeBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.evaluate(() => {
        sessionStorage.setItem('map_workspace_view', 'network');
        window.location.search = '?view=network';
      });
      await page.waitForTimeout(2000);
    }
    console.log('Capturing: 03-network-electricity.png...');
    await captureScreenshot(page, '03-network-electricity.png');

    // 4. Network Asset Selected + Trace active
    console.log('Selecting node in Network View...');
    await page.evaluate(() => {
      const el = document.querySelector('.sgp-network-node');
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(
        (btn) => btn.textContent.includes('Cấp đến') || btn.textContent.includes('Nguồn cấp')
      );
      if (b) b.click();
    });
    await page.waitForTimeout(800);
    console.log('Capturing: 04-network-asset-selected.png...');
    await captureScreenshot(page, '04-network-asset-selected.png');

    // 5. Network Empty State (Calm truthful message)
    console.log('Selecting WATER utility for calm empty state...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.includes('Cấp nước'));
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    console.log('Capturing: 05-network-no-verified-data.png...');
    await captureScreenshot(page, '05-network-no-verified-data.png');

    // 6. Admin Unverified Preview
    console.log('Enabling unverified preview toggle...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.includes('Tất cả'));
      if (b) b.click();
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(
        (btn) => btn.textContent.includes('chưa xác minh') || btn.textContent.includes('Duyệt chưa xác minh')
      );
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    console.log('Capturing: 06-admin-unverified-preview.png...');
    await captureScreenshot(page, '06-admin-unverified-preview.png');

    // 7. Mobile Viewport (Asset Context Surface)
    await context.close();

    console.log('Creating mobile context (390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:5173');
    await mobilePage.waitForTimeout(1500);

    const isMobileLogin = await mobilePage.evaluate(() => Boolean(document.querySelector('input[type="password"]')));
    if (isMobileLogin) {
      await mobilePage.fill('#employeeCode', '52300119');
      await mobilePage.fill('#password', 'Admin123456!');
      await mobilePage.click('button[type="submit"]');
      await mobilePage.waitForTimeout(2500);
    }

    await mobilePage.waitForSelector('.sgp-map-first-root', { timeout: 10000 });
    await mobilePage.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.includes('Mạng lưới'));
      if (b) b.click();
    });
    await mobilePage.waitForTimeout(1500);

    await mobilePage.evaluate(() => {
      const el = document.querySelector('.sgp-network-node') || document.querySelector('.sgp-asset-glyph');
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await mobilePage.waitForTimeout(1000);

    console.log('Capturing: 07-mobile-asset-context.png...');
    await captureScreenshot(mobilePage, '07-mobile-asset-context.png');

    await mobileContext.close();
    console.log('ALL V16E SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
