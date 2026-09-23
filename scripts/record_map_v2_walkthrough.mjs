import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const VIDEO_DIR = path.join(rootDir, 'docs', 'implementation', 'admin-map-v2-reveal', 'videos');
const ARTIFACT_VIDEO_DIR = 'C:\\Users\\User\\.gemini\\antigravity-cli\\brain\\bc871c02-2f4c-4232-9fc9-83018eaf8d95\\videos';

for (const d of [VIDEO_DIR, ARTIFACT_VIDEO_DIR]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function run() {
  console.log('Launching Playwright with video recording for Map V2 Walkthrough...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.0,
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  const videoRef = page.video();

  console.log('Navigating to http://localhost:5174/operations.html?tab=map_v2 ...');
  await page.goto('http://localhost:5174/operations.html?tab=map_v2');
  await page.waitForTimeout(2000);

  // Perform login if needed
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
  await page.waitForTimeout(1500);

  // Step 1: Tour the clean operational view
  console.log('Step 1: Touring clean operational view & hovering anchor hotspots...');
  await page.evaluate(() => {
    const el = document.getElementById('v2-anchor-BLDG_KHO_1');
    el?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    const el = document.getElementById('v2-anchor-BLDG_KHO_2');
    el?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  });
  await page.waitForTimeout(1200);

  // Step 2: Click ZONE_QUAY to trigger Reveal Animation
  console.log('Step 2: Clicking Cầu cảng (CSL) for radial reveal animation...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_QUAY')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(2500);

  // Step 3: Switch to ZONE_GENERAL
  console.log('Step 3: Switching to Bãi tổng hợp (BTH)...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_GENERAL')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(2500);

  // Step 4: Switch to ZONE_CONTAINER
  console.log('Step 4: Switching to Bãi Container (CONT)...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_CONTAINER')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(2500);

  // Step 5: Toggle View Mode
  console.log('Step 5: Testing View Mode: Tràn chiều rộng and back...');
  const widthModeBtn = await page.$('button:has-text("Tràn chiều rộng")');
  if (widthModeBtn) {
    await widthModeBtn.click({ force: true });
    await page.waitForTimeout(2000);
  }
  const fitModeBtn = await page.$('button:has-text("Fit toàn bộ")');
  if (fitModeBtn) {
    await fitModeBtn.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Step 6: Switch to Neon Tone Mode (Cyber Digital Twin)
  console.log('Step 6: Switching to Neon Digital Twin mode...');
  const neonBtn = await page.$('button:has-text("Neon số")');
  if (neonBtn) {
    await neonBtn.click({ force: true });
    await page.waitForTimeout(2500);
  }

  // Step 7: Zone Reveal in Neon Mode
  console.log('Step 7: Testing Zone Reveal in Neon Mode...');
  await page.evaluate(() => {
    document.getElementById('v2-anchor-ZONE_QUAY')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    document.getElementById('v2-anchor-BLDG_KHO_4')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(2500);

  // Step 8: Switch to Technical Inspection Mode in Neon
  console.log('Step 8: Switching to Technical Inspection Mode in Neon...');
  const techBtn = await page.$('button:has-text("Kiểm tra")');
  if (techBtn) {
    await techBtn.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Step 9: Open Inspection Panel
  console.log('Step 9: Opening Technical Inspection Panel...');
  const inspectBtn = await page.$('button:has-text("Bảng kiểm tra")');
  if (inspectBtn) {
    await inspectBtn.click({ force: true });
    await page.waitForTimeout(2500);
  }

  // Inspect ROAD_BACKLAND
  console.log('Step 10: Inspecting ROAD_BACKLAND invariant...');
  await page.evaluate(() => {
    const road = document.getElementById('v2-road-ROAD_BACKLAND');
    if (road) road.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(2500);

  // Close inspector
  const closeInspectBtn = await page.$('button[aria-label="Đóng panel"], button:has-text("✕")');
  if (closeInspectBtn) {
    await closeInspectBtn.click({ force: true });
    await page.waitForTimeout(1500);
  }

  // Step 11: Layers Popover
  console.log('Step 11: Opening Layers Popover...');
  const layersBtn = await page.$('button:has-text("Lớp hiển thị")');
  if (layersBtn) {
    await layersBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await layersBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }

  // Return to Standard Technical Tone & Operational Mode
  console.log('Step 12: Returning to Clean Operational view with Technical tone...');
  const stdToneBtn = await page.$('button:has-text("Chuẩn kỹ thuật")');
  if (stdToneBtn) {
    await stdToneBtn.click({ force: true });
    await page.waitForTimeout(1500);
  }
  const opModeBtn = await page.$('button:has-text("Vận hành")');
  if (opModeBtn) {
    await opModeBtn.click({ force: true });
    await page.waitForTimeout(2000);
  }

  console.log('Walkthrough demonstration completed successfully.');

  // Close page and context to finalize video writing
  await page.close();
  await context.close();

  if (videoRef) {
    const rawPath = await videoRef.path();
    const finalName = 'map-v2-zone-reveal-walkthrough.webm';
    const targetFile1 = path.join(VIDEO_DIR, finalName);
    const targetFile2 = path.join(ARTIFACT_VIDEO_DIR, finalName);

    // Give filesystem a moment to flush
    await new Promise((r) => setTimeout(r, 1000));

    if (fs.existsSync(rawPath)) {
      fs.copyFileSync(rawPath, targetFile1);
      fs.copyFileSync(rawPath, targetFile2);
      console.log(`Video saved to: ${targetFile1}`);
      console.log(`Video copied to artifact: ${targetFile2}`);
    }
  }

  await browser.close();
  console.log('Done recording walkthrough video.');
}

run().catch((err) => {
  console.error('Error during walkthrough recording:', err);
  process.exit(1);
});
