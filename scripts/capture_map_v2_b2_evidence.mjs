import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EVIDENCE_DIR = path.join(rootDir, 'docs', 'implementation', 'map-v2-utility-layout-b2', 'evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
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
    await page.waitForTimeout(1000);
  }
  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page.waitForTimeout(500);
}

const captureTasks = [
  // 1. Baseline Before (Layout B) @ 1366x768
  {
    fileName: 'B-before-both-1366.png',
    width: 1366,
    height: 768,
    mode: 'both',
    layout: 'B',
    tone: 'technical',
  },

  // 2. Refined After (Layout B2) @ 1366x768
  {
    fileName: 'B2-after-both-1366.png',
    width: 1366,
    height: 768,
    mode: 'both',
    layout: 'B2',
    tone: 'technical',
  },

  // 3. Layout B2 Single Utilities @ 1366x768
  {
    fileName: 'B2-electricity-1366.png',
    width: 1366,
    height: 768,
    mode: 'electricity',
    layout: 'B2',
    tone: 'technical',
  },
  {
    fileName: 'B2-water-1366.png',
    width: 1366,
    height: 768,
    mode: 'water',
    layout: 'B2',
    tone: 'technical',
  },
  {
    fileName: 'B2-both-1366.png',
    width: 1366,
    height: 768,
    mode: 'both',
    layout: 'B2',
    tone: 'technical',
  },

  // 4. Layout B2 Responsive Acceptance Suite
  {
    fileName: 'B2-both-1280.png',
    width: 1280,
    height: 800,
    mode: 'both',
    layout: 'B2',
    tone: 'technical',
  },
  {
    fileName: 'B2-both-1440.png',
    width: 1440,
    height: 900,
    mode: 'both',
    layout: 'B2',
    tone: 'technical',
  },
  {
    fileName: 'B2-both-1920.png',
    width: 1920,
    height: 1080,
    mode: 'both',
    layout: 'B2',
    tone: 'technical',
  },
  {
    fileName: 'B2-both-2560.png',
    width: 2560,
    height: 1440,
    mode: 'both',
    layout: 'B2',
    tone: 'technical',
  },

  // 5. Layout B2 Neon Digital Twin Suite @ 1920x1080
  {
    fileName: 'B2-neon-electricity.png',
    width: 1920,
    height: 1080,
    mode: 'electricity',
    layout: 'B2',
    tone: 'neon',
  },
  {
    fileName: 'B2-neon-water.png',
    width: 1920,
    height: 1080,
    mode: 'water',
    layout: 'B2',
    tone: 'neon',
  },
  {
    fileName: 'B2-neon-both.png',
    width: 1920,
    height: 1080,
    mode: 'both',
    layout: 'B2',
    tone: 'neon',
  },

  // 6. Regression Check: Utility Overlay OFF @ 1366x768
  {
    fileName: 'utility-off-regression.png',
    width: 1366,
    height: 768,
    mode: 'off',
    layout: 'B2',
    tone: 'technical',
  },
];

async function run() {
  console.log('=== STARTING MAP V2 UTILITY LAYOUT B2 SCREENSHOT EVIDENCE SUITE ===');
  console.log(`Output Directory: ${EVIDENCE_DIR}`);

  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Initial navigation and login
  await page.goto('http://localhost:5174/operations.html?tab=map_v2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await loginIfNeeded(page);
  await ensureMapV2(page);

  // 1. Standard capture tasks
  for (let i = 0; i < captureTasks.length; i++) {
    const task = captureTasks[i];
    console.log(`[${i + 1}/${captureTasks.length + 2}] Capturing ${task.fileName} (${task.width}x${task.height}, mode=${task.mode}, layout=${task.layout}, tone=${task.tone})...`);

    await page.setViewportSize({ width: task.width, height: task.height });
    const url = `http://localhost:5174/operations.html?tab=map_v2&utilityMode=${task.mode}&utilityLayout=${task.layout}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await ensureMapV2(page);

    // Apply tone mode
    if (task.tone === 'neon') {
      const neonBtn = await page.$('button:has-text("Neon số")');
      if (neonBtn) {
        await neonBtn.click();
        await page.waitForTimeout(400);
      }
    } else {
      const techBtn = await page.$('button:has-text("Chuẩn kỹ thuật")');
      if (techBtn) {
        await techBtn.click();
        await page.waitForTimeout(400);
      }
    }

    await page.waitForTimeout(600);
    const outPath = path.join(EVIDENCE_DIR, task.fileName);
    await page.screenshot({ path: outPath, fullPage: false });
    const stat = fs.statSync(outPath);
    console.log(`  -> Saved ${task.fileName} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  // 2. Interactive Feature: Meter Hover disclosure in BOTH mode @ 1366x768
  console.log(`[${captureTasks.length + 1}/${captureTasks.length + 2}] Capturing B2-meter-hover.png (Hover on #node-SIM-MDB-01 to reveal tag)...`);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://localhost:5174/operations.html?tab=map_v2&utilityMode=both&utilityLayout=B2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await ensureMapV2(page);
  const techBtn = await page.$('button:has-text("Chuẩn kỹ thuật")');
  if (techBtn) await techBtn.click();
  await page.waitForTimeout(500);

  // Hover on SIM-MDB-01
  const mdbNode = await page.$('#node-SIM-MDB-01');
  if (mdbNode) {
    await mdbNode.hover();
    await page.waitForTimeout(500);
  } else {
    console.warn('Could not find #node-SIM-MDB-01 for hover test');
  }
  const hoverOutPath = path.join(EVIDENCE_DIR, 'B2-meter-hover.png');
  await page.screenshot({ path: hoverOutPath, fullPage: false });
  const hoverStat = fs.statSync(hoverOutPath);
  console.log(`  -> Saved B2-meter-hover.png (${(hoverStat.size / 1024).toFixed(1)} KB)`);

  // 3. Detail Feature: Close-up of Central Corridor / Ingress / Crossing @ 1920x1080
  console.log(`[${captureTasks.length + 2}/${captureTasks.length + 2}] Capturing B2-central-cluster-closeup.png...`);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5174/operations.html?tab=map_v2&utilityMode=both&utilityLayout=B2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await ensureMapV2(page);
  const techBtn2 = await page.$('button:has-text("Chuẩn kỹ thuật")');
  if (techBtn2) await techBtn2.click();
  await page.waitForTimeout(500);

  // Find canvas element to calculate central region clip
  const canvasEl = await page.$('.map-v2-canvas, svg.map-v2-svg-root');
  if (canvasEl) {
    const box = await canvasEl.boundingBox();
    if (box) {
      // In 1536x1024 canonical space, central cluster is X: 640..880, Y: 460..820
      // Scale coordinates relative to canvas bounding box
      const scaleX = box.width / 1536;
      const scaleY = box.height / 1024;
      const clipX = box.x + 600 * scaleX;
      const clipY = box.y + 440 * scaleY;
      const clipW = 340 * scaleX;
      const clipH = 430 * scaleY;

      const closeupPath = path.join(EVIDENCE_DIR, 'B2-central-cluster-closeup.png');
      await page.screenshot({
        path: closeupPath,
        clip: {
          x: Math.max(0, clipX),
          y: Math.max(0, clipY),
          width: Math.min(box.width, clipW),
          height: Math.min(box.height, clipH),
        },
      });
      const closeupStat = fs.statSync(closeupPath);
      console.log(`  -> Saved B2-central-cluster-closeup.png (${(closeupStat.size / 1024).toFixed(1)} KB)`);
    }
  }

  await browser.close();
  console.log('=== ALL 15 EVIDENCE SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Fatal error during B2 screenshot capture:', err);
  process.exit(1);
});
