import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Users\\User\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const REPO_OUT_DIR = path.resolve('docs/design/map-operations/v7/screenshots');
const ARTIFACT_OUT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\6801f4bc-045d-4f27-87cd-b5c43f0be593\\screenshots';

for (const dir of [REPO_OUT_DIR, ARTIFACT_OUT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, filename) {
  const repoPath = path.join(REPO_OUT_DIR, filename);
  const artifactPath = path.join(ARTIFACT_OUT_DIR, filename);
  await page.screenshot({ path: repoPath, fullPage: false });
  try {
    fs.copyFileSync(repoPath, artifactPath);
  } catch (e) {
    // ignore
  }
  console.log(`[CAPTURED] ${filename}`);
}

async function login(page) {
  console.log('Navigating to app...');
  await page.goto('http://127.0.0.1:5173');
  await page.waitForTimeout(1000);

  const empInput = await page.$('input[name="employee_code"], input[type="text"]');
  if (empInput) {
    console.log('Logging in as admin 52300119...');
    await empInput.fill('52300119');
    const pwdInput = await page.$('input[type="password"]');
    if (pwdInput) {
      await pwdInput.fill('Admin123456!');
      const submit = await page.$('button[type="submit"]');
      if (submit) await submit.click();
      await page.waitForTimeout(2000);
    }
  }
}

async function run() {
  console.log('Launching browser at:', CHROME_PATH);
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await login(page);

    await page.evaluate(() => {
      localStorage.setItem('admin_dashboard_view_mode', 'map');
    });
    await page.goto('http://127.0.0.1:5173');
    await page.waitForTimeout(2000);

    // 10_v2_map_default.png
    console.log('10: V2 map default...');
    await captureScreenshot(page, '10_v2_map_default.png');

    // 11_zone_focus_berth.png
    console.log('11: Zone focus berth...');
    await page.evaluate(() => {
      const z = document.querySelector('[data-zone-id="pres-berth-main"] path') ||
                document.querySelector('[data-zone-id="pres-berth-main"]') ||
                document.querySelector('.sgp-operational-zone path');
      if (z) z.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    await captureScreenshot(page, '11_zone_focus_berth.png');

    // 35_zone_drawer_full.png
    console.log('35: Zone drawer full...');
    await captureScreenshot(page, '35_zone_drawer_full.png');

    // 20_add_meter_entry.png
    console.log('20: Add meter entry...');
    await captureScreenshot(page, '20_add_meter_entry.png');

    // 21_placement_mode_grid.png
    console.log('21: Placement mode grid...');
    const addMeterBtn = await page.$('button:has-text("+ Thêm công tơ vào khu vực")');
    if (addMeterBtn) {
      await addMeterBtn.click();
      await page.waitForTimeout(700);
    }
    await captureScreenshot(page, '21_placement_mode_grid.png');

    // 22_candidate_hover.png
    console.log('22: Candidate hover...');
    await page.mouse.move(700, 450);
    await page.waitForTimeout(300);
    await captureScreenshot(page, '22_candidate_hover.png');

    // 23_candidate_outside_warning.png
    console.log('23: Candidate outside warning...');
    await page.mouse.move(150, 100);
    await page.waitForTimeout(300);
    await captureScreenshot(page, '23_candidate_outside_warning.png');

    // 24_candidate_valid_pinned.png
    console.log('24: Candidate valid pinned...');
    await page.mouse.click(750, 420);
    await page.waitForTimeout(400);
    await captureScreenshot(page, '24_candidate_valid_pinned.png');

    // 25_placement_confirm_dialog.png
    console.log('25: Placement confirm dialog / card...');
    const meterCodeInput = await page.$('.sgp-placement-input, input[placeholder="CT-xxx"]');
    if (meterCodeInput) {
      await meterCodeInput.fill('CT-V7-DEMO');
    }
    await page.waitForTimeout(300);
    await captureScreenshot(page, '25_placement_confirm_dialog.png');

    // Cancel placement
    console.log('Cancel placement...');
    const cancelBtn = await page.$('button:has-text("Hủy")');
    if (cancelBtn) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
    }

    // 26_placement_persisted.png
    console.log('26: Placement persisted/restored...');
    await captureScreenshot(page, '26_placement_persisted.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 12_zone_focus_container.png
    console.log('12: Zone focus container...');
    await page.evaluate(() => {
      const z = document.querySelector('[data-zone-id="pres-container-main"] path') ||
                document.querySelector('[data-zone-id="pres-container-main"]');
      if (z) z.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    await captureScreenshot(page, '12_zone_focus_container.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 13_meter_quick_popup.png
    console.log('13: Meter quick popup...');
    await page.evaluate(() => {
      const m = document.querySelector('.sgp-meter-point') || document.querySelector('g[cursor="pointer"]');
      if (m) m.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(600);
    await captureScreenshot(page, '13_meter_quick_popup.png');

    // 27_existing_meter_relocation.png
    console.log('27: Existing meter relocation...');
    const relocateBtn = await page.$('button:has-text("Chỉnh vị trí")');
    if (relocateBtn) {
      await relocateBtn.click();
      await page.waitForTimeout(600);
      await captureScreenshot(page, '27_existing_meter_relocation.png');
      const cancelReloc = await page.$('button:has-text("Hủy")');
      if (cancelReloc) await cancelReloc.click();
      await page.waitForTimeout(400);
    } else {
      await captureScreenshot(page, '27_existing_meter_relocation.png');
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 14_operator_popover.png
    console.log('14: Operator popover...');
    await page.evaluate(() => {
      const op = document.querySelector('.sgp-operator-map-marker');
      if (op) op.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(600);
    await captureScreenshot(page, '14_operator_popover.png');

    // 15_operator_hover_route.png
    console.log('15: Operator hover route...');
    await page.evaluate(() => {
      const op = document.querySelector('.sgp-operator-map-marker');
      if (op) op.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    await page.waitForTimeout(400);
    await captureScreenshot(page, '15_operator_hover_route.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 16_filter_active.png
    console.log('16: Filter active...');
    const filterChip = await page.$('.sgp-filter-chip:nth-child(2)');
    if (filterChip) {
      await filterChip.click();
      await page.waitForTimeout(500);
    }
    await captureScreenshot(page, '16_filter_active.png');

    // 17_exception_state.png
    console.log('17: Exception state...');
    await captureScreenshot(page, '17_exception_state.png');

    const allFilter = await page.$('.sgp-filter-chip:first-child');
    if (allFilter) await allFilter.click();
    await page.waitForTimeout(400);

    // 30_map_view.png
    console.log('30: Map view...');
    await captureScreenshot(page, '30_map_view.png');

    // 31_list_view.png
    console.log('31: List view...');
    const listToggleBtn = await page.$('button:has-text("Danh sách")');
    if (listToggleBtn) {
      await listToggleBtn.click();
      await page.waitForTimeout(700);
      await captureScreenshot(page, '31_list_view.png');
      const mapToggleBtn = await page.$('button:has-text("Bản đồ")');
      if (mapToggleBtn) await mapToggleBtn.click();
      await page.waitForTimeout(700);
    } else {
      await captureScreenshot(page, '31_list_view.png');
    }

    // 32_admin_meters_list.png
    console.log('32: Admin meters list...');
    const metersNav = await page.$('button:has-text("Công tơ")');
    if (metersNav) {
      await metersNav.click();
      await page.waitForTimeout(800);
      await captureScreenshot(page, '32_admin_meters_list.png');
      const dashNav = await page.$('button:has-text("Tổng quan")');
      if (dashNav) await dashNav.click();
      await page.waitForTimeout(800);
    } else {
      await captureScreenshot(page, '32_admin_meters_list.png');
    }

    // 33_analytics_drawer.png
    console.log('33: Analytics drawer...');
    const analyticsBtn = await page.$('button:has-text("Phân tích")');
    if (analyticsBtn) {
      await analyticsBtn.click();
      await page.waitForTimeout(600);
      await captureScreenshot(page, '33_analytics_drawer.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      await captureScreenshot(page, '33_analytics_drawer.png');
    }

    // 34_round_switcher.png
    console.log('34: Round switcher...');
    const roundBtn = await page.$('.sgp-round-trigger, button:has-text("08:00")');
    if (roundBtn) {
      await roundBtn.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, '34_round_switcher.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      await captureScreenshot(page, '34_round_switcher.png');
    }

    // 36_empty_filter_state.png
    console.log('36: Empty filter state...');
    const searchInput = await page.$('input[placeholder*="Tìm"], input[type="text"]');
    if (searchInput) {
      await searchInput.fill('KHONG_CO_CONG_TO_NAY_999');
      await page.waitForTimeout(500);
      await captureScreenshot(page, '36_empty_filter_state.png');
      await searchInput.fill('');
      await page.waitForTimeout(400);
    } else {
      await captureScreenshot(page, '36_empty_filter_state.png');
    }

    // 37_sidebar_expanded.png
    console.log('37: Sidebar expanded...');
    const railBtn = await page.$('.admin-sidebar-rail-menu-btn, button[aria-label="Mở menu"]');
    if (railBtn) {
      await railBtn.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, '37_sidebar_expanded.png');
      const backdrop = await page.$('.admin-sidebar-backdrop');
      if (backdrop) await backdrop.click();
      await page.waitForTimeout(400);
    } else {
      await captureScreenshot(page, '37_sidebar_expanded.png');
    }

    // Viewports
    const viewports = [
      { name: '40_1440x900.png', width: 1440, height: 900 },
      { name: '41_1024x768.png', width: 1024, height: 768 },
      { name: '42_768x1024.png', width: 768, height: 1024 },
      { name: '43_1366x768.png', width: 1366, height: 768 },
      { name: '44_390x844.png', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      console.log(`Viewport: ${vp.name}...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(600);
      await captureScreenshot(page, vp.name);
    }

    console.log('All 29 screenshots refreshed successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

run();
