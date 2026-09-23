import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EVIDENCE_DIR = path.join(rootDir, 'docs', 'implementation', 'map-v2-utility-demo-layout', 'evidence');

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
    await page.waitForTimeout(1500);
  }
  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page.waitForTimeout(800);
}

const captureTasks = [
  // 1. Control baseline: Utility overlay OFF
  {
    fileName: 'utility-off-map-v2.png',
    width: 1366,
    height: 768,
    mode: 'off',
    layout: 'B',
    tone: 'technical',
  },

  // 2. Layout Option A (Perimeter / Road Corridor) @ 1366x768
  {
    fileName: 'A-electricity-1366.png',
    width: 1366,
    height: 768,
    mode: 'electricity',
    layout: 'A',
    tone: 'technical',
  },
  {
    fileName: 'A-water-1366.png',
    width: 1366,
    height: 768,
    mode: 'water',
    layout: 'A',
    tone: 'technical',
  },
  {
    fileName: 'A-both-1366.png',
    width: 1366,
    height: 768,
    mode: 'both',
    layout: 'A',
    tone: 'technical',
  },

  // 3. Layout Option B (Central Backbone - Recommended) @ 1366x768
  {
    fileName: 'B-electricity-1366.png',
    width: 1366,
    height: 768,
    mode: 'electricity',
    layout: 'B',
    tone: 'technical',
  },
  {
    fileName: 'B-water-1366.png',
    width: 1366,
    height: 768,
    mode: 'water',
    layout: 'B',
    tone: 'technical',
  },
  {
    fileName: 'B-both-1366.png',
    width: 1366,
    height: 768,
    mode: 'both',
    layout: 'B',
    tone: 'technical',
  },

  // 4. Layout Option C (Zone-Based Distribution) @ 1366x768
  {
    fileName: 'C-electricity-1366.png',
    width: 1366,
    height: 768,
    mode: 'electricity',
    layout: 'C',
    tone: 'technical',
  },
  {
    fileName: 'C-water-1366.png',
    width: 1366,
    height: 768,
    mode: 'water',
    layout: 'C',
    tone: 'technical',
  },
  {
    fileName: 'C-both-1366.png',
    width: 1366,
    height: 768,
    mode: 'both',
    layout: 'C',
    tone: 'technical',
  },

  // 5. Recommended Layout (Layout B) Responsive & High-Res Viewports
  {
    fileName: 'recommended-electricity-1280.png',
    width: 1280,
    height: 800,
    mode: 'electricity',
    layout: 'B',
    tone: 'technical',
  },
  {
    fileName: 'recommended-water-1280.png',
    width: 1280,
    height: 800,
    mode: 'water',
    layout: 'B',
    tone: 'technical',
  },
  {
    fileName: 'recommended-both-1280.png',
    width: 1280,
    height: 800,
    mode: 'both',
    layout: 'B',
    tone: 'technical',
  },
  {
    fileName: 'recommended-electricity-1920.png',
    width: 1920,
    height: 1080,
    mode: 'electricity',
    layout: 'B',
    tone: 'technical',
  },
  {
    fileName: 'recommended-water-1920.png',
    width: 1920,
    height: 1080,
    mode: 'water',
    layout: 'B',
    tone: 'technical',
  },
  {
    fileName: 'recommended-both-1920.png',
    width: 1920,
    height: 1080,
    mode: 'both',
    layout: 'B',
    tone: 'technical',
  },

  // 6. Recommended Layout (Layout B) Neon Digital Twin Mode
  {
    fileName: 'recommended-neon-electricity.png',
    width: 1920,
    height: 1080,
    mode: 'electricity',
    layout: 'B',
    tone: 'neon',
  },
  {
    fileName: 'recommended-neon-water.png',
    width: 1920,
    height: 1080,
    mode: 'water',
    layout: 'B',
    tone: 'neon',
  },
];

async function run() {
  console.log('=== STARTING MAP V2 UTILITY DEMO LAYOUT SCREENSHOT SUITE ===');
  console.log(`Target evidence directory: ${EVIDENCE_DIR}`);

  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Initial navigation and login
  await page.goto('http://localhost:5174/operations.html?tab=map_v2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await loginIfNeeded(page);
  await ensureMapV2(page);

  for (let i = 0; i < captureTasks.length; i++) {
    const task = captureTasks[i];
    console.log(`[${i + 1}/${captureTasks.length}] Capturing ${task.fileName} (${task.width}x${task.height}, mode=${task.mode}, layout=${task.layout}, tone=${task.tone})...`);

    // Set viewport
    await page.setViewportSize({ width: task.width, height: task.height });

    // Navigate with URL parameters
    const url = `http://localhost:5174/operations.html?tab=map_v2&utilityMode=${task.mode}&utilityLayout=${task.layout}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await ensureMapV2(page);

    // If neon mode is needed, click the Neon button
    if (task.tone === 'neon') {
      const neonBtn = await page.$('button:has-text("Neon số")');
      if (neonBtn) {
        await neonBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      const techBtn = await page.$('button:has-text("Chuẩn kỹ thuật")');
      if (techBtn) {
        await techBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Wait for canvas stabilization
    await page.waitForTimeout(800);

    // Capture screenshot of workspace or page
    const outPath = path.join(EVIDENCE_DIR, task.fileName);
    await page.screenshot({ path: outPath, fullPage: false });

    const stat = fs.statSync(outPath);
    console.log(`  -> Saved ${task.fileName} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
  console.log('=== ALL MAP V2 UTILITY DEMO LAYOUT SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Fatal error during screenshot capture:', err);
  process.exit(1);
});
