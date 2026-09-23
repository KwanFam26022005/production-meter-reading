import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.join(rootDir, 'docs', 'implementation', 'admin-map-v2-responsive-refinement', 'evidence', 'before');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { width: 1280, height: 720, label: '1280x720' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1536, height: 864, label: '1536x864' },
  { width: 1920, height: 1080, label: '1920x1080' },
  { width: 2560, height: 1440, label: '2560x1440' },
];

async function run() {
  console.log('Running Responsive Root Cause Audit across 5 mandatory viewports...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  const auditReport = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Auditing Viewport ${vp.label} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1.0,
    });
    const page = await context.newPage();

    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await page.waitForTimeout(1500);

    // Login if on login page
    const loginInput = await page.$('#employeeCode');
    if (loginInput) {
      await page.fill('#employeeCode', '52300119');
      await page.fill('#password', 'Admin123456!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // Ensure Map V2 tab is selected
    const mapV2Tab = await page.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
    if (mapV2Tab) {
      await mapV2Tab.click();
      await page.waitForTimeout(1000);
    }

    await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
    await page.waitForTimeout(800);

    // 1. Measure Operational Mode (Inspector closed)
    const metricsOperational = await page.evaluate(() => {
      const header = document.querySelector('.map-v2-header');
      const toolbar = document.querySelector('.map-v2-toolbar');
      const canvas = document.querySelector('.map-v2-canvas-wrapper');
      const container = document.querySelector('.map-v2-container');
      const sidebar = document.querySelector('.admin-sidebar');
      const zoomText = document.querySelector('.map-v2-floating-hud div[title^="Độ phóng đại"]')?.textContent?.trim() || '';

      const headerHeight = header ? header.offsetHeight : 0;
      const toolbarWidth = toolbar ? toolbar.offsetWidth : 0;
      const toolbarScrollWidth = toolbar ? toolbar.scrollWidth : 0;
      const isToolbarClipped = toolbarScrollWidth > toolbarWidth;
      const canvasWidth = canvas ? canvas.clientWidth : 0;
      const canvasHeight = canvas ? canvas.clientHeight : 0;
      const containerWidth = container ? container.clientWidth : 0;
      const containerHeight = container ? container.clientHeight : 0;
      const sidebarWidth = sidebar ? sidebar.offsetWidth : 0;

      return {
        sidebarWidth,
        containerWidth,
        containerHeight,
        headerHeight,
        toolbarWidth,
        toolbarScrollWidth,
        isToolbarClipped,
        canvasWidth,
        canvasHeight,
        zoomText,
      };
    });

    console.log('Metrics (Operational):', metricsOperational);
    const ssPathOp = path.join(OUT_DIR, `before-${vp.label}-operational.png`);
    await page.screenshot({ path: ssPathOp });

    // 2. Click zone (ZONE_GENERAL) to inspect operational card
    await page.evaluate(() => {
      document.getElementById('v2-anchor-ZONE_GENERAL')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(600);

    const cardMetrics = await page.evaluate(() => {
      const card = document.querySelector('.map-v2-operational-card');
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      const canvas = document.querySelector('.map-v2-canvas-wrapper');
      const cRect = canvas ? canvas.getBoundingClientRect() : { left: 0, bottom: 0 };
      return {
        cardLeft: rect.left,
        cardTop: rect.top,
        cardWidth: rect.width,
        cardHeight: rect.height,
        offsetFromCanvasLeft: rect.left - cRect.left,
        offsetFromCanvasBottom: cRect.bottom - rect.bottom,
      };
    });

    // 3. Switch to Technical Mode and Open Inspection Panel
    const techBtn = await page.$('button:has-text("Kiểm tra")');
    if (techBtn) {
      await techBtn.click({ force: true });
      await page.waitForTimeout(600);
    }

    const metricsTechnicalWithInspector = await page.evaluate(() => {
      const canvas = document.querySelector('.map-v2-canvas-wrapper');
      const inspector = document.querySelector('.map-v2-inspector-panel');
      const zoomText = document.querySelector('.map-v2-floating-hud div[title^="Độ phóng đại"]')?.textContent?.trim() || '';

      return {
        canvasWidth: canvas ? canvas.clientWidth : 0,
        canvasHeight: canvas ? canvas.clientHeight : 0,
        inspectorWidth: inspector ? inspector.offsetWidth : 0,
        inspectorPresent: !!inspector,
        zoomText,
      };
    });

    console.log('Metrics (With Inspector):', metricsTechnicalWithInspector);
    const ssPathInsp = path.join(OUT_DIR, `before-${vp.label}-inspector-open.png`);
    await page.screenshot({ path: ssPathInsp });

    // 4. Test Neon tone on 1280x720 to record contrast issues
    if (vp.label === '1280x720') {
      const neonBtn = await page.$('button:has-text("Neon số")');
      if (neonBtn) {
        await neonBtn.click({ force: true });
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(OUT_DIR, `before-${vp.label}-neon-inspector.png`) });
      }
    }

    auditReport.push({
      viewport: vp.label,
      width: vp.width,
      height: vp.height,
      operational: metricsOperational,
      card: cardMetrics,
      technicalInspector: metricsTechnicalWithInspector,
    });

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(rootDir, 'docs', 'implementation', 'admin-map-v2-responsive-refinement', 'baseline_measurements.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf-8');
  console.log(`Baseline measurement audit report written to: ${reportPath}`);
}

run().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
