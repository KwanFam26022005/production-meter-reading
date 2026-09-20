import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const REPO_OUT_DIR = path.resolve('docs/product/four-workspaces/evidence');
const ARTIFACT_OUT_DIR = 'C:\\Users\\User\\.gemini\antigravity\\brain\\21f5766e-a48a-4ad1-a814-a31018f7affd\\evidence';

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

async function ensureLoggedIn(page) {
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1200);
  const isLogin = await page.evaluate(() => Boolean(document.querySelector('input[type="password"]')));
  if (isLogin) {
    console.log('Logging in as admin 52300119...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }
}

async function run() {
  console.log('Launching browser at:', EDGE_PATH);
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  try {
    // =========================================================================
    // VIEWPORT 1: DESKTOP (1920 x 1080)
    // =========================================================================
    console.log('\n--- VIEWPORT 1: DESKTOP (1920x1080) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await desktopContext.newPage();
    await ensureLoggedIn(page);

    // 1. Workspace 1: Dashboard (Bản đồ)
    console.log('Navigating to Dashboard (Bản đồ)...');
    await page.click('button.admin-nav-item[data-tab="dashboard"]');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, '01-desktop-workspace-dashboard.png');

    // 2. Workspace 2: Schedules (Lịch ghi) + Round Meter Logbook
    console.log('Navigating to Schedules (Lịch ghi)...');
    await page.evaluate(() => sessionStorage.setItem('admin_schedules_date', '2026-09-15'));
    await page.click('button.admin-nav-item[data-tab="schedules"]');
    await page.waitForTimeout(2000);

    // Click "Sổ ca" button on the first round row to open Round Meter Logbook
    console.log('Selecting a round in Schedules to display Round Meter Logbook...');
    const soCaBtn = await page.$('.admin-sched-row button:has-text("Sổ ca")');
    if (soCaBtn) {
      await soCaBtn.click();
    } else {
      const firstRow = await page.$('.admin-sched-row');
      if (firstRow) await firstRow.click();
    }
    await captureScreenshot(page, '02a-desktop-workspace-schedules-timeline.png');

    console.log('Scrolling Round Meter Logbook into view...');
    const logbookEl = await page.$('#round-meter-logbook');
    if (logbookEl) {
      await logbookEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    }
    await captureScreenshot(page, '02-desktop-workspace-schedules-logbook.png');

    // 3. Workspace 3: Staff Roster (Phân ca)
    console.log('Navigating to Staff Roster (Phân ca)...');
    await page.click('button.admin-nav-item[data-tab="staff_roster"]');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, '03-desktop-workspace-staff-roster.png');

    // 4. Workspace 4: Reports (Báo cáo) - Overview
    console.log('Navigating to Reports (Báo cáo)...');
    await page.click('button.admin-nav-item[data-tab="reports"]');
    await page.waitForTimeout(2500);
    await captureScreenshot(page, '04-desktop-workspace-reports-overview.png');

    // 5. Workspace 4: Reports (Báo cáo) - Audit Log Sub-tab
    console.log('Switching to Audit Log sub-tab in Reports...');
    const auditTabBtn = await page.$('button[role="tab"]:has-text("Nhật ký kiểm toán")');
    if (auditTabBtn) {
      await auditTabBtn.click();
      await page.waitForTimeout(2000);
    }
    await captureScreenshot(page, '05-desktop-workspace-reports-audit.png');

    await desktopContext.close();

    // =========================================================================
    // VIEWPORT 2: LAPTOP / COMPACT DESKTOP (1366 x 768)
    // =========================================================================
    console.log('\n--- VIEWPORT 2: LAPTOP (1366x768) ---');
    const laptopContext = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
    });
    const laptopPage = await laptopContext.newPage();
    await ensureLoggedIn(laptopPage);

    // 6. Laptop Dashboard
    console.log('Capturing Laptop Dashboard...');
    await laptopPage.click('button.admin-nav-item[data-tab="dashboard"]');
    await laptopPage.waitForTimeout(2000);
    await captureScreenshot(laptopPage, '06-laptop-workspace-dashboard.png');

    // 7. Laptop Schedules with Logbook
    console.log('Capturing Laptop Schedules with Logbook...');
    await laptopPage.evaluate(() => sessionStorage.setItem('admin_schedules_date', '2026-09-15'));
    await laptopPage.click('button.admin-nav-item[data-tab="schedules"]');
    await laptopPage.waitForTimeout(2000);
    const laptopSoCaBtn = await laptopPage.$('.admin-sched-row button:has-text("Sổ ca")');
    if (laptopSoCaBtn) {
      await laptopSoCaBtn.click();
      await laptopPage.waitForTimeout(2000);
      const laptopLogbookEl = await laptopPage.$('#round-meter-logbook');
      if (laptopLogbookEl) {
        await laptopLogbookEl.scrollIntoViewIfNeeded();
        await laptopPage.waitForTimeout(1000);
      }
    }
    await captureScreenshot(laptopPage, '07-laptop-workspace-schedules-logbook.png');

    await laptopContext.close();

    // =========================================================================
    // VIEWPORT 3: MOBILE (390 x 844)
    // =========================================================================
    console.log('\n--- VIEWPORT 3: MOBILE (390x844) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await ensureLoggedIn(mobilePage);

    // 8. Mobile Dashboard
    console.log('Capturing Mobile Dashboard...');
    await mobilePage.waitForTimeout(2000);
    await captureScreenshot(mobilePage, '08-mobile-workspace-dashboard.png');

    // 9. Mobile Drawer with 4 Workspaces
    console.log('Opening Mobile Drawer...');
    const drawerToggle = await mobilePage.$('button.admin-sidebar-toggle-btn');
    if (drawerToggle) {
      await drawerToggle.click();
      await mobilePage.waitForTimeout(1200);
    }
    await captureScreenshot(mobilePage, '09-mobile-navigation-drawer.png');

    // 10. Mobile Schedules
    console.log('Navigating to Mobile Schedules from Drawer...');
    const mobileSchedNav = await mobilePage.$('button.admin-drawer-nav-item[data-tab="schedules"]');
    if (mobileSchedNav) {
      await mobileSchedNav.click();
      await mobilePage.waitForTimeout(2000);
    }
    await captureScreenshot(mobilePage, '10-mobile-workspace-schedules.png');

    await mobileContext.close();

    console.log('\n[SUCCESS] All 10 visual QA screenshots successfully captured!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
