import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.resolve('docs/design/screenshots');

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
  await page.waitForSelector('.workspace-container', { timeout: 10000 });
  await page.waitForTimeout(800);
}

async function run() {
  console.log('Launching Edge headless browser...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // 1. Mobile View (390 x 844)
  console.log('Capturing Mobile User Home Hub...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173');
  await loginAsEmployee(mobilePage);

  console.log('Saving: 01-user-home-hub-mobile.png');
  await mobilePage.screenshot({ path: path.join(OUT_DIR, '01-user-home-hub-mobile.png'), fullPage: false });

  // Open Radial Menu
  const fabButton = await mobilePage.$('.sgp-radial-fab');
  if (fabButton) {
    console.log('Opening Radial Menu...');
    await fabButton.click();
    await mobilePage.waitForTimeout(600);
    console.log('Saving: 02-user-home-radial-open-mobile.png');
    await mobilePage.screenshot({ path: path.join(OUT_DIR, '02-user-home-radial-open-mobile.png'), fullPage: false });
  }
  await mobileContext.close();

  // 2. Tablet View (768 x 1024)
  console.log('Capturing Tablet User Home Hub...');
  const tabletContext = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 1.5,
  });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto('http://localhost:5173');
  await loginAsEmployee(tabletPage);

  console.log('Saving: 03-user-home-hub-tablet.png');
  await tabletPage.screenshot({ path: path.join(OUT_DIR, '03-user-home-hub-tablet.png'), fullPage: false });
  await tabletContext.close();

  // 3. Desktop View (1280 x 800)
  console.log('Capturing Desktop User Home Hub...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.0,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:5173');
  await loginAsEmployee(desktopPage);

  console.log('Saving: 04-user-home-hub-desktop.png');
  await desktopPage.screenshot({ path: path.join(OUT_DIR, '04-user-home-hub-desktop.png'), fullPage: false });
  await desktopContext.close();

  // 4. Login View
  console.log('Capturing Login View...');
  const loginContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
  });
  const loginPage = await loginContext.newPage();
  await loginPage.goto('http://localhost:5173');
  await loginPage.waitForTimeout(600);

  // Logout if logged in
  const avatarBtn = await loginPage.$('.btn-account-avatar');
  if (avatarBtn) {
    await avatarBtn.click();
    await loginPage.waitForTimeout(400);
    const doLogout = await loginPage.$('.account-popover-logout-btn');
    if (doLogout) {
      await doLogout.click();
      await loginPage.waitForTimeout(1000);
    }
  }

  console.log('Saving: 05-login-view.png');
  await loginPage.screenshot({ path: path.join(OUT_DIR, '05-login-view.png'), fullPage: false });
  await loginContext.close();

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
