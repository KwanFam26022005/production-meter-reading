import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const VIDEO_DIR = path.join(rootDir, 'docs', 'implementation', 'admin-map-v2-camera-and-animation-fix', 'evidence', 'baseline');

if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

async function run() {
  console.log('Recording baseline reproduction video...');
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1.0,
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1366, height: 768 },
    },
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:5174/operations.html?tab=map_v2 ...');
  await page.goto('http://localhost:5174/operations.html?tab=map_v2');
  await page.waitForTimeout(2000);

  // Login if needed
  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    console.log('Logging in as Admin (52300119)...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }

  // Ensure Map V2 tab is active
  const mapV2Tab = await page.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Tab) {
    await mapV2Tab.click();
    await page.waitForTimeout(1500);
  }

  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Step 1: Initial camera framing (shows Issue A & Issue C floating circles)
  console.log('Step 1: Demonstrating initial framing and floating circles...');
  await page.waitForTimeout(3000);

  // Step 2: Select Administrative office anchor (shows Issue B growing rectangle)
  console.log('Step 2: Clicking administrative office anchor to trigger growing rectangle...');
  await page.evaluate(() => {
    const el = document.getElementById('v2-anchor-ZONE_ADMIN');
    el?.focus();
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  // Wait 10 seconds to show the rectangle growing over time
  console.log('Waiting 10 seconds to capture growing rectangle over time...');
  for (let s = 1; s <= 10; s++) {
    await page.waitForTimeout(1000);
    console.log(`  Elapsed: ${s}s`);
  }

  await page.waitForTimeout(1500);
  await context.close();
  await browser.close();

  // Find generated video file and rename to reproduction_walkthrough.webm
  const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
  const videoFile = files.find(f => f !== 'reproduction_walkthrough.webm');
  if (videoFile) {
    const src = path.join(VIDEO_DIR, videoFile);
    const dest = path.join(VIDEO_DIR, 'reproduction_walkthrough.webm');
    fs.renameSync(src, dest);
    console.log('Saved baseline reproduction video to:', dest);
  }
}

run().catch(err => {
  console.error('Error recording baseline video:', err);
  process.exit(1);
});
