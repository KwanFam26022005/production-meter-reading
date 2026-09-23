import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.resolve('docs/implementation/user-minimal-identity/screenshots');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function loginAsEmployee(page) {
  const pwdInput = await page.$('input[type="password"]');
  if (pwdInput) {
    console.log('Logging in as EMPLOYEE (CSG-0102)...');
    await page.fill('#employeeCode', 'CSG-0102');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }
  await page.waitForSelector('.workspace-container', { timeout: 12000 });
  await page.waitForTimeout(1000);
}

async function run() {
  console.log('Launching Edge headless browser...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // -------------------------------------------------------------
  // Base Context: Login and extract storageState
  // -------------------------------------------------------------
  console.log('Authenticating base session...');
  const baseContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const basePage = await baseContext.newPage();
  await basePage.goto('http://localhost:5173');
  await loginAsEmployee(basePage);

  // 1. Mobile 390x844 - Not Checked In (Live Real Server Data)
  console.log('1. Capturing 01-identity-not-checked-in-390x844.png...');
  await basePage.screenshot({
    path: path.join(OUT_DIR, '01-identity-not-checked-in-390x844.png'),
    fullPage: false,
  });

  // 6. Mobile 390x844 - Radial Open (Live Real Server Data)
  console.log('6. Capturing 06-identity-radial-open-390x844.png...');
  const fabButton = await basePage.$('.sgp-radial-fab');
  if (fabButton) {
    await fabButton.click();
    await basePage.waitForTimeout(600);
    await basePage.screenshot({
      path: path.join(OUT_DIR, '06-identity-radial-open-390x844.png'),
      fullPage: false,
    });
    // Close radial menu
    await fabButton.click();
    await basePage.waitForTimeout(400);
  }

  const storageState = await baseContext.storageState();
  await baseContext.close();

  // -------------------------------------------------------------
  // 2. State: In-Shift (390x844 Fixture)
  // -------------------------------------------------------------
  console.log('2. Capturing 02-identity-in-shift-390x844.png (Fixture)...');
  const inShiftContext = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const inShiftPage = await inShiftContext.newPage();
  await inShiftPage.route('**/api/v1/attendance/today**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        date: '2026-09-21',
        check_in: {
          timestamp: '2026-09-21T06:15:00',
          formatted_time: '06:15 - Cổng chính',
        },
        check_out: null,
        status: 'CHECKED_IN',
      }),
    });
  });
  await inShiftPage.goto('http://localhost:5173');
  await inShiftPage.waitForSelector('.workspace-container', { timeout: 10000 });
  await inShiftPage.waitForTimeout(1000);
  await inShiftPage.screenshot({
    path: path.join(OUT_DIR, '02-identity-in-shift-390x844.png'),
    fullPage: false,
  });
  await inShiftContext.close();

  // -------------------------------------------------------------
  // 3. State: Completed Shift (390x844 Fixture)
  // -------------------------------------------------------------
  console.log('3. Capturing 03-identity-completed-390x844.png (Fixture)...');
  const completedContext = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const completedPage = await completedContext.newPage();
  await completedPage.route('**/api/v1/attendance/today**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        date: '2026-09-21',
        check_in: {
          timestamp: '2026-09-21T06:00:00',
          formatted_time: '06:00 - Cổng Cảng',
        },
        check_out: {
          timestamp: '2026-09-21T14:02:00',
          formatted_time: '14:02 - Cổng Cảng',
        },
        status: 'CHECKED_OUT',
      }),
    });
  });
  await completedPage.goto('http://localhost:5173');
  await completedPage.waitForSelector('.workspace-container', { timeout: 10000 });
  await completedPage.waitForTimeout(1000);
  await completedPage.screenshot({
    path: path.join(OUT_DIR, '03-identity-completed-390x844.png'),
    fullPage: false,
  });
  await completedContext.close();

  // -------------------------------------------------------------
  // 4. State: Loading State (390x844 Fixture)
  // -------------------------------------------------------------
  console.log('4. Capturing 04-identity-loading-390x844.png (Fixture)...');
  const loadingContext = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const loadingPage = await loadingContext.newPage();
  // Delay attendance response by 10 seconds so loading badge "Đang kiểm tra..." is visible
  await loadingPage.route('**/api/v1/attendance/today**', async (route) => {
    await new Promise((res) => setTimeout(res, 8000));
    await route.continue();
  });
  await loadingPage.goto('http://localhost:5173');
  await loadingPage.waitForSelector('.workspace-operator-name', { timeout: 10000 });
  await loadingPage.waitForTimeout(400);
  await loadingPage.screenshot({
    path: path.join(OUT_DIR, '04-identity-loading-390x844.png'),
    fullPage: false,
  });
  await loadingContext.close();

  // -------------------------------------------------------------
  // 5. State: API Error State (390x844 Fixture)
  // -------------------------------------------------------------
  console.log('5. Capturing 05-identity-error-390x844.png (Fixture)...');
  const errorContext = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const errorPage = await errorContext.newPage();
  // Simulate 500 error on attendance endpoint -> should render "Chưa xác định"
  await errorPage.route('**/api/v1/attendance/today**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Internal Server Error' }),
    });
  });
  await errorPage.goto('http://localhost:5173');
  await errorPage.waitForSelector('.workspace-container', { timeout: 10000 });
  await errorPage.waitForTimeout(1000);
  await errorPage.screenshot({
    path: path.join(OUT_DIR, '05-identity-error-390x844.png'),
    fullPage: false,
  });
  await errorContext.close();

  // -------------------------------------------------------------
  // 7. Viewport: Compact Mobile (375 × 812)
  // -------------------------------------------------------------
  console.log('7. Capturing 07-identity-compact-375x812.png...');
  const compactContext = await browser.newContext({
    storageState,
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2.0,
  });
  const compactPage = await compactContext.newPage();
  await compactPage.goto('http://localhost:5173');
  await compactPage.waitForSelector('.workspace-container', { timeout: 10000 });
  await compactPage.waitForTimeout(1000);
  await compactPage.screenshot({
    path: path.join(OUT_DIR, '07-identity-compact-375x812.png'),
    fullPage: false,
  });
  await compactContext.close();

  // -------------------------------------------------------------
  // 8. Viewport: Large Mobile (428 × 926)
  // -------------------------------------------------------------
  console.log('8. Capturing 08-identity-large-428x926.png...');
  const largeMobileContext = await browser.newContext({
    storageState,
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 2.0,
  });
  const largeMobilePage = await largeMobileContext.newPage();
  await largeMobilePage.goto('http://localhost:5173');
  await largeMobilePage.waitForSelector('.workspace-container', { timeout: 10000 });
  await largeMobilePage.waitForTimeout(1000);
  await largeMobilePage.screenshot({
    path: path.join(OUT_DIR, '08-identity-large-428x926.png'),
    fullPage: false,
  });
  await largeMobileContext.close();

  // -------------------------------------------------------------
  // 9. Viewport: Tablet (768 × 1024)
  // -------------------------------------------------------------
  console.log('9. Capturing 09-identity-tablet-768x1024.png...');
  const tabletContext = await browser.newContext({
    storageState,
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 1.5,
  });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto('http://localhost:5173');
  await tabletPage.waitForSelector('.workspace-container', { timeout: 10000 });
  await tabletPage.waitForTimeout(1000);
  await tabletPage.screenshot({
    path: path.join(OUT_DIR, '09-identity-tablet-768x1024.png'),
    fullPage: false,
  });
  await tabletContext.close();

  // -------------------------------------------------------------
  // 10. Viewport: Desktop (1280 × 800)
  // -------------------------------------------------------------
  console.log('10. Capturing 10-identity-desktop-1280x800.png...');
  const desktopContext = await browser.newContext({
    storageState,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.0,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:5173');
  await desktopPage.waitForSelector('.workspace-container', { timeout: 10000 });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({
    path: path.join(OUT_DIR, '10-identity-desktop-1280x800.png'),
    fullPage: false,
  });
  await desktopContext.close();

  await browser.close();
  console.log('All 10 Minimal Operational Identity screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
