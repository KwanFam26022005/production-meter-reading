import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.resolve('docs/implementation/user-homehub-ux-refinement/screenshots');

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

  // 1. Mobile View - Live Server State (02-home-after-mobile.png)
  console.log('1. Capturing 02-home-after-mobile.png...');
  await basePage.screenshot({
    path: path.join(OUT_DIR, '02-home-after-mobile.png'),
    fullPage: false,
  });

  // 2. Mobile View - Radial Open (03-home-after-radial-open.png)
  console.log('2. Capturing 03-home-after-radial-open.png...');
  const fabButton = await basePage.$('.sgp-radial-fab');
  if (fabButton) {
    await fabButton.click();
    await basePage.waitForTimeout(600);
    await basePage.screenshot({
      path: path.join(OUT_DIR, '03-home-after-radial-open.png'),
      fullPage: false,
    });
    // Close radial menu
    await fabButton.click();
    await basePage.waitForTimeout(400);
  }

  const storageState = await baseContext.storageState();
  await baseContext.close();

  // -------------------------------------------------------------
  // 3. State: No Active Round / All Completed (04-home-after-no-active-round.png)
  // -------------------------------------------------------------
  console.log('3. Capturing 04-home-after-no-active-round.png...');
  const idleContext = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const idlePage = await idleContext.newPage();

  await idlePage.route('**/api/v1/attendance/today**', async (route) => {
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
          timestamp: '2026-09-21T14:00:00',
          formatted_time: '14:00 - Cổng Cảng',
        },
        status: 'CHECKED_OUT',
      }),
    });
  });

  await idlePage.route('**/api/v1/meter-operations/today**', async (route) => {
    const res = await route.fetch();
    if (res.ok()) {
      const json = await res.json();
      json.current_round = null;
      json.meters = [];
      if (json.summary) {
        json.summary.confirmed_current = json.summary.total_meters || 12;
        json.summary.pending_current = 0;
        json.summary.percent_current = 100;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json),
      });
    } else {
      await route.continue();
    }
  });

  await idlePage.goto('http://localhost:5173');
  await idlePage.waitForSelector('.workspace-container', { timeout: 10000 });
  await idlePage.waitForTimeout(1000);
  await idlePage.screenshot({
    path: path.join(OUT_DIR, '04-home-after-no-active-round.png'),
    fullPage: false,
  });
  await idleContext.close();

  // -------------------------------------------------------------
  // 4. State: Active Meter Round Needing Readings (05-home-after-active-round.png)
  // -------------------------------------------------------------
  console.log('4. Capturing 05-home-after-active-round.png...');
  const activeContext = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const activePage = await activeContext.newPage();

  await activePage.route('**/api/v1/attendance/today**', async (route) => {
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

  await activePage.route('**/api/v1/meter-operations/today**', async (route) => {
    const res = await route.fetch();
    if (res.ok()) {
      const json = await res.json();
      json.current_round = {
        id: 'round-0800',
        batch_id: 'batch-today',
        scheduled_at: '2026-09-21T08:00:00',
        scheduled_local: '08:00 21/09/2026',
        scheduled_time_only: '08:00',
        status: 'OPEN',
        timing_state: 'CURRENT',
        progress: {
          total: 12,
          confirmed: 8,
          pending: 4,
          review: 0,
          percent: 67,
        },
      };
      if (json.summary) {
        json.summary.total_meters = 12;
        json.summary.confirmed_current = 8;
        json.summary.pending_current = 4;
        json.summary.percent_current = 67;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json),
      });
    } else {
      await route.continue();
    }
  });

  await activePage.goto('http://localhost:5173');
  await activePage.waitForSelector('.workspace-container', { timeout: 10000 });
  await activePage.waitForTimeout(1000);
  await activePage.screenshot({
    path: path.join(OUT_DIR, '05-home-after-active-round.png'),
    fullPage: false,
  });
  await activeContext.close();

  // -------------------------------------------------------------
  // 5. State: Attendance Completed (06-home-after-attendance-completed.png)
  // -------------------------------------------------------------
  console.log('5. Capturing 06-home-after-attendance-completed.png...');
  const attendedContext = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const attendedPage = await attendedContext.newPage();

  await attendedPage.route('**/api/v1/attendance/today**', async (route) => {
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

  await attendedPage.goto('http://localhost:5173');
  await attendedPage.waitForSelector('.workspace-container', { timeout: 10000 });
  await attendedPage.waitForTimeout(1000);
  await attendedPage.screenshot({
    path: path.join(OUT_DIR, '06-home-after-attendance-completed.png'),
    fullPage: false,
  });
  await attendedContext.close();

  // -------------------------------------------------------------
  // 6. Tablet View (07-home-after-tablet.png)
  // -------------------------------------------------------------
  console.log('6. Capturing 07-home-after-tablet.png...');
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
    path: path.join(OUT_DIR, '07-home-after-tablet.png'),
    fullPage: false,
  });
  await tabletContext.close();

  // -------------------------------------------------------------
  // 7. Desktop View (08-home-after-desktop.png)
  // -------------------------------------------------------------
  console.log('7. Capturing 08-home-after-desktop.png...');
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
    path: path.join(OUT_DIR, '08-home-after-desktop.png'),
    fullPage: false,
  });
  await desktopContext.close();

  await browser.close();
  console.log('All 8 User Home Hub refinement screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
