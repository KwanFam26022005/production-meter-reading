import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const REPO_OUT_DIR = 'docs/maps/qa';
const ARTIFACT_OUT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f5bc3394-7581-4408-bc96-d9f75dc8232f\\qa_screenshots';

for (const dir of [REPO_OUT_DIR, ARTIFACT_OUT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, filename) {
  const repoPath = path.join(REPO_OUT_DIR, filename);
  const artifactPath = path.join(ARTIFACT_OUT_DIR, filename);
  await page.screenshot({ path: repoPath });
  fs.copyFileSync(repoPath, artifactPath);
  console.log(`Saved: ${filename}`);
}

async function loginIfNeeded(page) {
  const employeeInput = await page.$('input[name="employee_code"], input[type="text"]');
  if (employeeInput) {
    console.log('Logging in...');
    await employeeInput.fill('52300119');
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.fill('khoa2005');
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
      }
    }
  }
}

async function run() {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  console.log('====================================================');
  console.log('--- Step 1: 1440x900 Map Operational Scenarios ---');
  console.log('====================================================');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);
  await loginIfNeeded(page);
  await page.waitForTimeout(1500);

  // A. Map Default (Healthy state)
  console.log('Capturing: Map default...');
  await captureScreenshot(page, 'qa-1440x900-default.png');

  // B. Sidebar Expanded Overlay
  console.log('Capturing: Sidebar expanded overlay...');
  const expandBtn = await page.$('.admin-sidebar-rail-menu-btn');
  if (expandBtn) {
    await expandBtn.click();
    await page.waitForTimeout(500);
    await captureScreenshot(page, 'qa-1440x900-sidebar-expanded.png');
    // Close sidebar
    const closeBackdrop = await page.$('.admin-sidebar-backdrop');
    if (closeBackdrop) await closeBackdrop.click();
    await page.waitForTimeout(400);
  }

  // C. Meter Selected
  console.log('Capturing: Meter selected...');
  await page.evaluate(() => {
    const el = document.querySelector('.sgp-meter-point');
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await captureScreenshot(page, 'qa-1440x900-meter-selected.png');
  // Click away to close meter popup
  await page.mouse.click(120, 120);
  await page.waitForTimeout(400);

  // D. Operator Selected
  console.log('Capturing: Operator selected...');
  await page.evaluate(() => {
    const el = document.querySelector('.sgp-operator-map-marker');
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await captureScreenshot(page, 'qa-1440x900-operator-selected.png');
  await page.mouse.click(120, 120);
  await page.waitForTimeout(400);

  // E. Analytics Drawer Open
  console.log('Capturing: Analytics drawer...');
  const analyticsBtn = await page.$('.chip-analytics, button:has-text("Phân tích")');
  if (analyticsBtn) {
    await analyticsBtn.click();
    await page.waitForTimeout(600);
    await captureScreenshot(page, 'qa-1440x900-analytics-drawer.png');
    const closeBtn = await page.$('.sgp-analytics-drawer .sgp-drawer-close-btn');
    if (closeBtn) await closeBtn.click();
    else await page.mouse.click(120, 120);
    await page.waitForTimeout(400);
  }

  // F. Critical State (2026-08-07)
  console.log('Capturing: Critical state (2026-08-07)...');
  await page.evaluate(() => {
    const input = document.querySelector('.vn-datepicker-native-input');
    if (input) {
      // @ts-ignore
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, '2026-08-07');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1500);
  await captureScreenshot(page, 'qa-1440x900-critical.png');

  // G. Operational List View
  console.log('Capturing: Operational list view...');
  const listModeBtn = await page.$('.sgp-segmented-btn:has-text("Danh sách")');
  if (listModeBtn) {
    await listModeBtn.click();
    await page.waitForTimeout(600);
    await captureScreenshot(page, 'qa-1440x900-list-view.png');
    // Switch back to Map
    const mapModeBtn = await page.$('.sgp-segmented-btn:has-text("Bản đồ")');
    if (mapModeBtn) await mapModeBtn.click();
    await page.waitForTimeout(400);
  }

  console.log('====================================================');
  console.log('--- Step 2: Global Admin Screens Consistency ---');
  console.log('====================================================');

  // Reading Schedule (schedules)
  console.log('Capturing: Reading Schedule...');
  const schedulesNav = await page.$('.admin-nav-item[title="Lịch ghi"]');
  if (schedulesNav) {
    await schedulesNav.click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'qa-admin-schedules.png');
  }

  // Shift Schedule (staff_roster)
  console.log('Capturing: Shift Schedule...');
  const rosterNav = await page.$('.admin-nav-item[title="Phân ca"]');
  if (rosterNav) {
    await rosterNav.click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'qa-admin-staff-roster.png');
  }

  // Meters (meters)
  console.log('Capturing: Meters...');
  const metersNav = await page.$('.admin-nav-item[title="Công tơ"]');
  if (metersNav) {
    await metersNav.click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'qa-admin-meters.png');
  }

  // Reports (reports)
  console.log('Capturing: Reports...');
  const reportsNav = await page.$('.admin-nav-item[title="Báo cáo"]');
  if (reportsNav) {
    await reportsNav.click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'qa-admin-reports.png');
  }

  // Audit Logs (audit)
  console.log('Capturing: Audit logs...');
  const auditNav = await page.$('.admin-nav-item[title="Nhật ký"]');
  if (auditNav) {
    await auditNav.click();
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'qa-admin-audit.png');
  }

  await context.close();

  console.log('====================================================');
  console.log('--- Step 3: Multi-Viewport Map Responsive QA ---');
  console.log('====================================================');
  const viewports = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1600, height: 900, name: '1600x900' },
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1280, height: 800, name: '1280x800' },
    { width: 1024, height: 768, name: '1024x768' },
    { width: 768, height: 1024, name: '768x1024' },
    { width: 390, height: 844, name: '390x844' },
  ];

  for (const vp of viewports) {
    console.log(`Capturing viewport: ${vp.name}...`);
    const vpContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const vpPage = await vpContext.newPage();
    await vpPage.goto('http://localhost:5173');
    await vpPage.waitForTimeout(800);
    await loginIfNeeded(vpPage);
    await vpPage.waitForTimeout(1200);

    // Make sure we are on dashboard / map tab
    const dashNav = await vpPage.$('.admin-nav-item[title="Bản đồ"]');
    if (dashNav && (await dashNav.isVisible())) {
      await dashNav.click();
      await vpPage.waitForTimeout(400);
    }

    await captureScreenshot(vpPage, `qa-${vp.name}.png`);
    await vpContext.close();
  }

  await browser.close();
  console.log('=== ALL_QA_SCREENSHOTS_COMPLETED_SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Screenshot generation failed:', err);
  process.exit(1);
});
