import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.resolve('docs/implementation/user-avatar-attendance-refinement/screenshots');
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity-cli\\brain\\c1fb09c4-4b65-4502-901c-51f33b7c0fee\\screenshots';

for (const dir of [OUT_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

async function saveScreenshots(page, baseName) {
  const primaryPath = path.join(OUT_DIR, `${baseName}.png`);
  const artifactPath = path.join(ARTIFACT_DIR, `${baseName}.png`);
  await page.screenshot({ path: primaryPath, fullPage: false });
  try {
    fs.copyFileSync(primaryPath, artifactPath);
  } catch (err) {
    console.error(`Failed to copy to artifact dir: ${err.message}`);
  }
  console.log(`Saved: ${baseName}.png`);
}

async function run() {
  console.log('Launching Edge headless browser...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // -------------------------------------------------------------
  // 1. Mobile 390x844 - Avatar Chưa vào ca (Live Data)
  // -------------------------------------------------------------
  console.log('1. Capturing Avatar Chưa vào ca (390x844)...');
  const baseContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const basePage = await baseContext.newPage();
  await basePage.goto('http://localhost:5173');
  await loginAsEmployee(basePage);

  await saveScreenshots(basePage, '01-avatar-not-checked-in-mobile-390x844');

  // -------------------------------------------------------------
  // 4. Mobile 390x844 - Account Popover Mở
  // -------------------------------------------------------------
  console.log('4. Capturing Account Popover Mở (390x844)...');
  const avatarBtn = await basePage.$('.btn-account-avatar');
  if (avatarBtn) {
    await avatarBtn.click();
    await basePage.waitForTimeout(400);
    await saveScreenshots(basePage, '04-account-popover-open-mobile-390x844');

    // Close popover cleanly
    const closeBtn = await basePage.$('.account-popover-close');
    if (closeBtn) {
      await closeBtn.click();
    } else {
      const backdrop = await basePage.$('.account-popover-backdrop');
      if (backdrop) await backdrop.click();
    }
    await basePage.waitForTimeout(400);
  }

  // -------------------------------------------------------------
  // Extra: Focus ring verification
  // -------------------------------------------------------------
  console.log('Capturing Avatar Focus Ring (390x844)...');
  await basePage.focus('.btn-account-avatar');
  await basePage.waitForTimeout(300);
  await saveScreenshots(basePage, '05-avatar-focused-ring-mobile-390x844');

  const storageState = await baseContext.storageState();
  await baseContext.close();

  // -------------------------------------------------------------
  // 2. Mobile 390x844 - Avatar Đang trong ca (Fixture)
  // -------------------------------------------------------------
  console.log('2. Capturing Avatar Đang trong ca (390x844)...');
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
        allowed_action: 'CHECK_OUT',
      }),
    });
  });
  await inShiftPage.goto('http://localhost:5173');
  await inShiftPage.waitForSelector('.workspace-container', { timeout: 10000 });
  await inShiftPage.waitForTimeout(800);
  await saveScreenshots(inShiftPage, '02-avatar-in-shift-mobile-390x844');
  await inShiftContext.close();

  // -------------------------------------------------------------
  // 3. Mobile 390x844 - Avatar Hoàn tất ca (Fixture)
  // -------------------------------------------------------------
  console.log('3. Capturing Avatar Hoàn tất ca (390x844)...');
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
          formatted_time: '06:00 - Cổng chính',
        },
        check_out: {
          timestamp: '2026-09-21T14:00:00',
          formatted_time: '14:00 - Cổng chính',
        },
        allowed_action: null,
      }),
    });
  });
  await completedPage.goto('http://localhost:5173');
  await completedPage.waitForSelector('.workspace-container', { timeout: 10000 });
  try {
    await completedPage.waitForSelector('.sgp-compact-feed, .sgp-priority-card', { timeout: 4000 });
  } catch (e) {
    await completedPage.waitForTimeout(1500);
  }
  await completedPage.waitForTimeout(500);
  await saveScreenshots(completedPage, '03-avatar-completed-shift-mobile-390x844');
  await completedContext.close();

  await browser.close();
  console.log('All avatar visibility screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
