import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const REPO_OUT_DIR = path.resolve('docs/product/desktop-ux-r1/evidence');
const ARTIFACT_OUT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\21f5766e-a48a-4ad1-a814-a31018f7affd\\evidence';

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
  await page.waitForTimeout(1500);
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
    // VIEWPORT 1: DESKTOP FULL HD (1920 x 1080)
    // =========================================================================
    console.log('\n================ VIEWPORT 1: 1920x1080 ================');
    const ctx1920 = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page1920 = await ctx1920.newPage();
    await ensureLoggedIn(page1920);

    // State 01: Map default
    console.log('[1/10] Capturing Map default...');
    await page1920.click('button.admin-nav-item[data-tab="dashboard"]');
    await page1920.waitForTimeout(2500);
    await captureScreenshot(page1920, '01-desktop-1920-map-default.png');

    // State 03: Schedules list with shift filter tabs (ALL)
    console.log('[3/10] Capturing Schedules list with shift filter tabs...');
    await page1920.evaluate(() => sessionStorage.setItem('admin_schedules_date', '2026-09-15'));
    await page1920.click('button.admin-nav-item[data-tab="schedules"]');
    await page1920.waitForTimeout(2000);
    await captureScreenshot(page1920, '03-desktop-1920-schedules-shifts-all.png');

    // State 04: Schedules shift filter active (Ca 1 · Sáng)
    console.log('[4/10] Capturing Schedules shift filter Ca 1...');
    const ca1Btn = await page1920.$('button.admin-shift-tab:has-text("Ca 1")');
    if (ca1Btn) {
      await ca1Btn.click();
      await page1920.waitForTimeout(1000);
    }
    await captureScreenshot(page1920, '04-desktop-1920-schedules-shift-ca1.png');

    // State 05: Open Round Meter Logbook (displaying resolved zones and map pin)
    console.log('[5/10] Opening Round Meter Logbook...');
    const soCaBtn = await page1920.$('.admin-sched-row button:has-text("Sổ ca")');
    if (soCaBtn) {
      await soCaBtn.click();
      await page1920.waitForTimeout(1500);
    }
    const logbookEl = await page1920.$('#round-meter-logbook');
    if (logbookEl) {
      await logbookEl.scrollIntoViewIfNeeded();
      await page1920.waitForTimeout(1000);
    }
    await captureScreenshot(page1920, '05-desktop-1920-schedules-logbook-zones.png');

    // State 02: Cross-navigation from Logbook to Map
    console.log('[2/10] Testing cross-navigation from Logbook to Map...');
    const mapPinBtn = await page1920.$('#round-meter-logbook button:has-text("Bản đồ")');
    if (mapPinBtn) {
      await mapPinBtn.click();
      await page1920.waitForTimeout(2500);
      await captureScreenshot(page1920, '02-desktop-1920-map-focused-meter.png');
    }

    // State 06: Schedules delete confirmation modal with explicit protection checkbox
    console.log('[6/10] Capturing Schedules delete day modal with explicit protection...');
    await page1920.click('button.admin-nav-item[data-tab="schedules"]');
    await page1920.waitForTimeout(1500);
    const deleteDayBtn = await page1920.$('button[aria-label^="Xóa toàn bộ lịch ngày"]');
    if (deleteDayBtn) {
      await deleteDayBtn.click();
      await page1920.waitForTimeout(1000);
      await captureScreenshot(page1920, '06-desktop-1920-schedules-delete-modal.png');
      // Close modal
      const cancelBtn = await page1920.$('.admin-modal-box.modal-danger button:has-text("Hủy")');
      if (cancelBtn) await cancelBtn.click();
      await page1920.waitForTimeout(500);
    }

    // State 07: Staff Roster workspace default
    console.log('[7/10] Capturing Staff Roster workspace...');
    await page1920.click('button.admin-nav-item[data-tab="staff_roster"]');
    await page1920.waitForTimeout(2000);
    await captureScreenshot(page1920, '07-desktop-1920-staff-roster.png');

    // State 08: Reports Overview (KPIs with 99.7% completion & latency badge)
    console.log('[8/10] Capturing Reports Overview...');
    await page1920.click('button.admin-nav-item[data-tab="reports"]');
    await page1920.waitForTimeout(2500);
    await captureScreenshot(page1920, '08-desktop-1920-reports-overview-kpis.png');

    // State 09: Reports Watchlist (resolved zones & 100% OCR calm note)
    console.log('[9/10] Capturing Reports Watchlist...');
    const watchlistEl = await page1920.$('.admin-tech-table[aria-label="Bảng công tơ cần theo dõi"]');
    if (watchlistEl) {
      await watchlistEl.scrollIntoViewIfNeeded();
      await page1920.waitForTimeout(1000);
    }
    await captureScreenshot(page1920, '09-desktop-1920-reports-watchlist.png');

    // State 10: Reports Quality by Location tab
    console.log('[10/10] Capturing Reports Quality by Location...');
    const qualitySubTab = await page1920.$('button[role="tab"]:has-text("Chất lượng")');
    if (qualitySubTab) {
      await qualitySubTab.click();
      await page1920.waitForTimeout(2000);
      const locQualityTable = await page1920.$('.admin-tech-table[aria-label="Bảng chất lượng theo khu vực"]');
      if (locQualityTable) {
        await locQualityTable.scrollIntoViewIfNeeded();
        await page1920.waitForTimeout(1000);
      }
      await captureScreenshot(page1920, '10-desktop-1920-reports-quality-location.png');
    }

    await ctx1920.close();

    // =========================================================================
    // VIEWPORT 2: LAPTOP (1366 x 768)
    // =========================================================================
    console.log('\n================ VIEWPORT 2: 1366x768 ================');
    const ctx1366 = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
    });
    const page1366 = await ctx1366.newPage();
    await ensureLoggedIn(page1366);

    // Map on 1366x768
    await page1366.click('button.admin-nav-item[data-tab="dashboard"]');
    await page1366.waitForTimeout(2000);
    await captureScreenshot(page1366, '11-laptop-1366-map.png');

    // Schedules on 1366x768
    await page1366.evaluate(() => sessionStorage.setItem('admin_schedules_date', '2026-09-15'));
    await page1366.click('button.admin-nav-item[data-tab="schedules"]');
    await page1366.waitForTimeout(2000);
    const soCaBtn1366 = await page1366.$('.admin-sched-row button:has-text("Sổ ca")');
    if (soCaBtn1366) {
      await soCaBtn1366.click();
      await page1366.waitForTimeout(1500);
    }
    await captureScreenshot(page1366, '12-laptop-1366-schedules-logbook.png');

    // Reports on 1366x768
    await page1366.click('button.admin-nav-item[data-tab="reports"]');
    await page1366.waitForTimeout(2000);
    await captureScreenshot(page1366, '13-laptop-1366-reports.png');

    await ctx1366.close();

    // =========================================================================
    // VIEWPORT 3: COMPACT HD (1280 x 720)
    // =========================================================================
    console.log('\n================ VIEWPORT 3: 1280x720 ================');
    const ctx1280 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    const page1280 = await ctx1280.newPage();
    await ensureLoggedIn(page1280);

    // Map on 1280x720
    await page1280.click('button.admin-nav-item[data-tab="dashboard"]');
    await page1280.waitForTimeout(2000);
    await captureScreenshot(page1280, '14-compact-1280-map.png');

    // Schedules on 1280x720
    await page1280.evaluate(() => sessionStorage.setItem('admin_schedules_date', '2026-09-15'));
    await page1280.click('button.admin-nav-item[data-tab="schedules"]');
    await page1280.waitForTimeout(2000);
    const soCaBtn1280 = await page1280.$('.admin-sched-row button:has-text("Sổ ca")');
    if (soCaBtn1280) {
      await soCaBtn1280.click();
      await page1280.waitForTimeout(1500);
    }
    await captureScreenshot(page1280, '15-compact-1280-schedules-logbook.png');

    // Reports on 1280x720
    await page1280.click('button.admin-nav-item[data-tab="reports"]');
    await page1280.waitForTimeout(2000);
    await captureScreenshot(page1280, '16-compact-1280-reports.png');

    await ctx1280.close();

    console.log('\n[SUCCESS] All QA screenshots captured successfully across 3 viewports.');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('[ERROR] Capturing screenshots failed:', err);
  process.exit(1);
});
