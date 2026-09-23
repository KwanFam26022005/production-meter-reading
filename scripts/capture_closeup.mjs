import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EVIDENCE_DIR = path.join(rootDir, 'docs', 'implementation', 'map-v2-utility-layout-b2', 'evidence');

async function run() {
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5174/operations.html?tab=map_v2&utilityMode=both&utilityLayout=B2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }

  const mapV2Tab = await page.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Tab) {
    await mapV2Tab.click();
    await page.waitForTimeout(1000);
  }
  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });

  const techBtn = await page.$('button:has-text("Chuẩn kỹ thuật")');
  if (techBtn) await techBtn.click();
  await page.waitForTimeout(800);

  const wrapperEl = await page.$('.map-v2-canvas-wrapper');
  if (wrapperEl) {
    const box = await wrapperEl.boundingBox();
    if (box) {
      console.log('Canvas wrapper boundingBox:', box);
      // In 1536x1024 canonical space, central cluster is X: 640..860, Y: 480..800
      const scale = box.width / 1536;
      // In 'width' fit mode, X is scaled by `scale`.
      // Let's compute clip region around the central cluster:
      const clipX = box.x + 620 * scale;
      const clipY = box.y + 440 * scale;
      const clipW = 340 * scale;
      const clipH = 400 * scale;

      const closeupPath = path.join(EVIDENCE_DIR, 'B2-central-cluster-closeup.png');
      await page.screenshot({
        path: closeupPath,
        clip: {
          x: Math.max(0, clipX),
          y: Math.max(0, clipY),
          width: clipW,
          height: clipH,
        },
      });
      const stat = fs.statSync(closeupPath);
      console.log(`Saved B2-central-cluster-closeup.png (${(stat.size / 1024).toFixed(1)} KB)`);
    }
  } else {
    console.error('Could not find .map-v2-canvas-wrapper');
  }

  await browser.close();
}

run().catch(console.error);
