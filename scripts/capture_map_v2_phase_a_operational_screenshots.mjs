import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.join(rootDir, 'docs', 'implementation', 'map-v2-operational-integration-phase-a', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function loginIfNeeded(page) {
  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    console.log('Logging in as Admin (52300119)...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }
}

async function ensureMapV2(page) {
  const mapV2Tab = await page.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Tab) {
    await mapV2Tab.click();
    await page.waitForTimeout(1500);
  }
  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function run() {
  console.log('=== STARTING MAP V2 PHASE A OPERATIONAL SCREENSHOT CAPTURE ===');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  try {
    // -------------------------------------------------------------------------
    // 1. Operational Default (1920x1080)
    // -------------------------------------------------------------------------
    console.log('Capturing 01: Operational Default 1920x1080...');
    let ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
    let page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await ensureMapV2(page);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_map_v2_operational_default_1920x1080.png') });
    await ctx.close();

    // -------------------------------------------------------------------------
    // 2. Operational Default (1440x900)
    // -------------------------------------------------------------------------
    console.log('Capturing 02: Operational Default 1440x900...');
    ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.0 });
    page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await ensureMapV2(page);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_map_v2_operational_default_1440x900.png') });
    await ctx.close();

    // -------------------------------------------------------------------------
    // 3. Compact Presentation (1280x800)
    // -------------------------------------------------------------------------
    console.log('Capturing 03: Operational Compact 1280x800...');
    ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.0 });
    page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await ensureMapV2(page);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_map_v2_operational_compact_1280x800.png') });
    await ctx.close();

    // Reopen standard 1920x1080 context for interactive states
    ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
    page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await ensureMapV2(page);

    // -------------------------------------------------------------------------
    // 4. Date & Round Context Picker Open
    // -------------------------------------------------------------------------
    console.log('Capturing 04: Date/Round Context Picker Open...');
    const contextTrigger = await page.$('.map-v2-context-trigger');
    if (contextTrigger) {
      await contextTrigger.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_map_v2_date_round_context_open.png') });
    // Close context picker
    if (contextTrigger) {
      await contextTrigger.click();
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------------------
    // 5. Quick Search Results
    // -------------------------------------------------------------------------
    console.log('Capturing 05: Quick Search Results...');
    const searchInput = await page.$('.map-v2-search-input');
    if (searchInput) {
      await searchInput.fill('Kho');
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_map_v2_quick_search_results.png') });
    if (searchInput) {
      await searchInput.fill('');
      await page.waitForTimeout(300);
    }

    // -------------------------------------------------------------------------
    // 6. Operational Zone Inspector Dock
    // -------------------------------------------------------------------------
    console.log('Capturing 06: Operational Zone Inspector...');
    await page.evaluate(() => {
      const anchor = document.getElementById('v2-anchor-ZONE_QUAY') || document.querySelector('.map-v2-anchor-badge');
      anchor?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_map_v2_zone_operational_inspector.png') });

    // -------------------------------------------------------------------------
    // 7. Real Stationary Assignee Inspector
    // -------------------------------------------------------------------------
    console.log('Capturing 07: Real Assignee Inspector...');
    await page.evaluate(() => {
      const employeeMarker = document.querySelector('g[role="button"][aria-label*="Phụ trách"]') || document.querySelector('.map-v2-employee-marker');
      if (employeeMarker) {
        employeeMarker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_map_v2_real_assignee_inspector.png') });

    // -------------------------------------------------------------------------
    // 8. Meter Operational Inspector
    // -------------------------------------------------------------------------
    console.log('Capturing 08: Meter Operational Inspector...');
    await page.evaluate(() => {
      const meterMarker = document.querySelector('.map-v2-meter-pin') || document.querySelector('g[role="button"][aria-label*="Công tơ"]');
      if (meterMarker) {
        meterMarker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '08_map_v2_meter_operational_inspector.png') });
    // Close inspector via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------------------
    // 9. Missing Coordinate Search Toast Notification
    // -------------------------------------------------------------------------
    console.log('Capturing 09: Missing Coordinate Search Toast...');
    // Type a meter code known to lack coordinates or trigger toast
    if (searchInput) {
      await searchInput.fill('CT-999');
      await page.waitForTimeout(400);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '09_map_v2_missing_coord_search_toast.png') });
    if (searchInput) {
      await searchInput.fill('');
      await page.waitForTimeout(300);
    }

    // -------------------------------------------------------------------------
    // 10. Exception Discovery Active
    // -------------------------------------------------------------------------
    console.log('Capturing 10: Exception Discovery Filter Active...');
    const exceptionChip = await page.$('.map-v2-exception-chip');
    if (exceptionChip) {
      await exceptionChip.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '10_map_v2_exception_discovery_active.png') });
    if (exceptionChip) {
      await exceptionChip.click(); // toggle off
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------------------
    // 11. Layer Manager Open (Axis 2)
    // -------------------------------------------------------------------------
    console.log('Capturing 11: Layer Manager Open...');
    const layersBtn = await page.$('button[title*="Quản lý các lớp"], button[aria-label*="lớp"]');
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '11_map_v2_layer_manager_open.png') });
    if (layersBtn) {
      await layersBtn.click(); // close
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------------------
    // 12. More Options Popover Open (Axis 3)
    // -------------------------------------------------------------------------
    console.log('Capturing 12: More Options Popover Open...');
    const optionsBtn = await page.$('button[title*="Tùy chọn bổ sung"], button[aria-label*="Tùy chọn bổ sung"]');
    if (optionsBtn) {
      await optionsBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '12_map_v2_options_popover_open.png') });

    // -------------------------------------------------------------------------
    // 13. Neon Digital Twin Mode
    // -------------------------------------------------------------------------
    console.log('Capturing 13: Neon Digital Twin Mode...');
    const neonBtn = await page.$('button:has-text("Neon số")');
    if (neonBtn) {
      await neonBtn.click({ force: true });
      await page.waitForTimeout(600);
    }
    // Close options popover to reveal neon map
    if (optionsBtn) {
      await optionsBtn.click({ force: true });
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '13_map_v2_neon_operational_mode.png') });

    // Switch back to technical mode
    if (optionsBtn) {
      await optionsBtn.click({ force: true });
      await page.waitForTimeout(400);
      const techBtn = await page.$('button:has-text("Kỹ thuật")');
      if (techBtn) await techBtn.click({ force: true });
      await optionsBtn.click({ force: true });
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------------------
    // 14. Simulated Demo Mode (Power B2 + Demo employee movement)
    // -------------------------------------------------------------------------
    console.log('Capturing 14: Simulated Demo Mode...');
    if (layersBtn) {
      await layersBtn.click({ force: true });
      await page.waitForTimeout(400);
      const powerLayerToggle = await page.$('.map-v2-layer-item:has-text("Mạng điện mô phỏng")');
      if (powerLayerToggle) await powerLayerToggle.click({ force: true });
      const demoStaffToggle = await page.$('.map-v2-layer-item:has-text("Hoạt họa nhân sự")');
      if (demoStaffToggle) await demoStaffToggle.click({ force: true });
      await page.waitForTimeout(400);
      await layersBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '14_map_v2_simulated_demo_mode.png') });

    // -------------------------------------------------------------------------
    // 15. Degraded Error Mode
    // -------------------------------------------------------------------------
    console.log('Capturing 15: Degraded Error Mode...');
    await page.evaluate(() => {
      // Simulate non-blocking degraded banner
      const banner = document.createElement('div');
      banner.className = 'map-v2-degraded-banner';
      banner.setAttribute('role', 'alert');
      banner.innerHTML = '<span>⚠️ Không thể đồng bộ dữ liệu tác nghiệp mới nhất. Đang hiển thị bản đồ ở chế độ ngoại tuyến/đọc.</span><button class="map-v2-degraded-retry-btn">Thử lại</button>';
      const workspace = document.querySelector('.map-v2-workspace');
      const body = document.querySelector('.map-v2-body');
      if (workspace && body) {
        workspace.insertBefore(banner, body);
      }
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '15_map_v2_degraded_error_mode.png') });

    console.log('=== ALL 15 OPERATIONAL SCREENSHOTS CAPTURED SUCCESSFULLY! ===');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
