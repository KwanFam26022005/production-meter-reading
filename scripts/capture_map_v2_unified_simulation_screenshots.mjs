import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.join(rootDir, 'docs', 'implementation', 'map-v2-unified-simulation-infrastructure', 'screenshots');

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
  console.log('=== STARTING MAP V2 UNIFIED SIMULATION INFRASTRUCTURE SCREENSHOT CAPTURE ===');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  try {
    // -------------------------------------------------------------------------
    // 1. Default Map V2 Workspace (1920x1080)
    // -------------------------------------------------------------------------
    console.log('Capturing 01: Unified Default 1920x1080...');
    let ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
    let page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await ensureMapV2(page);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_unified_default_1920x1080.png') });
    await ctx.close();

    // -------------------------------------------------------------------------
    // 2. Default Map V2 Workspace (1440x900)
    // -------------------------------------------------------------------------
    console.log('Capturing 02: Unified Default 1440x900...');
    ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.0 });
    page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await ensureMapV2(page);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_unified_default_1440x900.png') });
    await ctx.close();

    // Reopen standard 1920x1080 context for interactive states
    ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.0 });
    page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await ensureMapV2(page);

    const layersBtn = await page.$('button[title*="Quản lý các lớp"], button[aria-label*="lớp"]');

    // -------------------------------------------------------------------------
    // 3. Layer Manager Reorganized (4 Canonical Groups)
    // -------------------------------------------------------------------------
    console.log('Capturing 03: Layer Manager Reorganized...');
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_layer_manager_reorganized.png') });

    // -------------------------------------------------------------------------
    // 4. Electricity Network [MÔ PHỎNG]
    // -------------------------------------------------------------------------
    console.log('Capturing 04: Electricity Network...');
    // Toggle on Electricity Network
    const elecCheckbox = await page.$('input[aria-label*="Mạng điện"], label:has-text("Mạng điện") input');
    if (elecCheckbox) {
      await elecCheckbox.click({ force: true });
      await page.waitForTimeout(500);
    }
    // Close layer manager to inspect canvas clearly
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_electricity_network.png') });

    // -------------------------------------------------------------------------
    // 5. Water Network [MÔ PHỎNG]
    // -------------------------------------------------------------------------
    console.log('Capturing 05: Water Network...');
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(400);
    }
    if (elecCheckbox) {
      await elecCheckbox.click({ force: true }); // turn off electricity
      await page.waitForTimeout(300);
    }
    const waterCheckbox = await page.$('input[aria-label*="Mạng nước"], label:has-text("Mạng nước") input');
    if (waterCheckbox) {
      await waterCheckbox.click({ force: true }); // turn on water
      await page.waitForTimeout(500);
    }
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_water_network.png') });

    // -------------------------------------------------------------------------
    // 6. Both Networks Visible (Canonical Crossing at 740, 520)
    // -------------------------------------------------------------------------
    console.log('Capturing 06: Both Networks Visible...');
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(400);
    }
    if (elecCheckbox) {
      await elecCheckbox.click({ force: true }); // turn on electricity as well
      await page.waitForTimeout(400);
    }
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_both_networks.png') });

    // -------------------------------------------------------------------------
    // 7. Meter Selected Host Highlight
    // -------------------------------------------------------------------------
    console.log('Capturing 07: Meter Selected Host Highlight...');
    // Select SIM-EM-001 by clicking its meter marker or using search
    const searchInput = await page.$('.map-v2-search-input');
    if (searchInput) {
      await searchInput.fill('SIM-EM-001');
      await page.waitForTimeout(400);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_meter_selected_host_highlight.png') });

    // -------------------------------------------------------------------------
    // 8. Meter Trace to Source
    // -------------------------------------------------------------------------
    console.log('Capturing 08: Meter Trace to Source...');
    // In the inspector panel, click "Truy vết tuyến nguồn"
    const traceBtn = await page.$('button:has-text("Truy vết tuyến nguồn")');
    if (traceBtn) {
      await traceBtn.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '08_meter_trace_to_source.png') });

    // -------------------------------------------------------------------------
    // 9. Host to Meter Inspector (Click Host Node)
    // -------------------------------------------------------------------------
    console.log('Capturing 09: Host to Meter Inspector...');
    // Close current selection via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    // Click host node SIM-EM-HOST-1 on SVG canvas
    await page.evaluate(() => {
      const hostNode = document.querySelector('g[data-node-id="SIM-EM-HOST-1"]') ||
                       document.querySelector('circle[data-node-id="SIM-EM-HOST-1"]') ||
                       document.querySelector('g[role="button"][aria-label*="SIM-EM-HOST-1"]');
      if (hostNode) {
        hostNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '09_host_to_meter_inspector.png') });

    // Close inspector
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------------------
    // 10. Real Zone Assignee Layer
    // -------------------------------------------------------------------------
    console.log('Capturing 10: Real Zone Assignee Layer...');
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(400);
    }
    // Real assignee is on by default or toggle if needed
    const assigneeCheckbox = await page.$('input[aria-label*="Người phụ trách"], label:has-text("phụ trách") input');
    if (assigneeCheckbox) {
      const isChecked = await assigneeCheckbox.isChecked();
      if (!isChecked) await assigneeCheckbox.click({ force: true });
    }
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(400);
    }
    // Click an assignee marker to inspect
    await page.evaluate(() => {
      const assigneeMarker = document.querySelector('g[role="button"][aria-label*="Phụ trách"]') || document.querySelector('.map-v2-employee-marker');
      if (assigneeMarker) {
        assigneeMarker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '10_real_assignee_layer.png') });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------------------
    // 11. Demo Personnel Animation Layer
    // -------------------------------------------------------------------------
    console.log('Capturing 11: Demo Personnel Animation Layer...');
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(400);
    }
    const demoCheckbox = await page.$('input[aria-label*="Nhân sự di chuyển"], label:has-text("di chuyển") input');
    if (demoCheckbox) {
      await demoCheckbox.click({ force: true });
      await page.waitForTimeout(400);
    }
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(800); // allow movement animation
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '11_demo_employee_layer.png') });

    // -------------------------------------------------------------------------
    // 12. Technical Light Presentation Mode
    // -------------------------------------------------------------------------
    console.log('Capturing 12: Technical Light Mode...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '12_technical_light.png') });

    // -------------------------------------------------------------------------
    // 13. Neon Digital Twin Network Mode
    // -------------------------------------------------------------------------
    console.log('Capturing 13: Neon Digital Twin Network Mode...');
    const optionsBtn = await page.$('button[title*="Tùy chọn bổ sung"], button[aria-label*="Tùy chọn bổ sung"]');
    if (optionsBtn) {
      await optionsBtn.click();
      await page.waitForTimeout(400);
      const neonBtn = await page.$('button:has-text("Neon số")');
      if (neonBtn) {
        await neonBtn.click({ force: true });
        await page.waitForTimeout(400);
      }
      await optionsBtn.click(); // close menu
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, '13_neon_network.png') });

    console.log('=== ALL 13 SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error during capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
