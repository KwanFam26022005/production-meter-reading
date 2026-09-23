import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EVIDENCE_DIR = path.join(rootDir, 'docs', 'implementation', 'admin-map-v2-responsive-refinement', 'evidence');
const SS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const VID_DIR = path.join(EVIDENCE_DIR, 'videos');

const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity-cli\\brain\\bc871c02-2f4c-4232-9fc9-83018eaf8d95\\evidence';
const ARTIFACT_SS_DIR = path.join(ARTIFACT_DIR, 'screenshots');
const ARTIFACT_VID_DIR = path.join(ARTIFACT_DIR, 'videos');

for (const d of [SS_DIR, VID_DIR, ARTIFACT_SS_DIR, ARTIFACT_VID_DIR]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function saveScreenshot(page, filename) {
  const p1 = path.join(SS_DIR, filename);
  const p2 = path.join(ARTIFACT_SS_DIR, filename);
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

async function loginIfNeeded(page) {
  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    console.log('Logging in as Admin (52300119)...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }
  const mapV2Tab = await page.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (mapV2Tab) {
    await mapV2Tab.click();
    await page.waitForTimeout(1000);
  }
  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page.waitForTimeout(800);
}

async function run() {
  console.log('Launching Playwright for Responsive Visual Acceptance and Interaction Video...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // =========================================================================
  // PART 1: 5 MANDATORY VIEWPORTS SCREENSHOTS
  // =========================================================================

  // 1. Viewport: 1280 x 720 (Compact Laptop)
  console.log('\n--- Capturing 1280x720 ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await loginIfNeeded(page);

    // 01: Default Operational (Compact toolbar, collapsed labels)
    await saveScreenshot(page, '01-1280x720-operational-default.png');

    // 02: Open compact options popover
    const optBtn = await page.$('button[aria-label="Tùy chọn bản đồ"]');
    if (optBtn) {
      await optBtn.click();
      await page.waitForTimeout(400);
      await saveScreenshot(page, '02-1280x720-options-popover-open.png');
      await optBtn.click();
      await page.waitForTimeout(300);
    }

    // 03: Reveal General Yard
    await page.evaluate(() => {
      document.getElementById('v2-anchor-ZONE_GENERAL')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '03-1280x720-general-yard-revealed.png');

    // 04: Switch to Technical Mode -> Inspector Drawer Open
    const techBtn = await page.$('button:has-text("Kiểm tra")');
    if (techBtn) {
      await techBtn.click({ force: true });
      await page.waitForTimeout(600);
      await saveScreenshot(page, '04-1280x720-inspector-drawer-open.png');
    }

    // 05: Neon Mode in Drawer
    const neonBtn = await page.$('button:has-text("Neon số")');
    if (neonBtn) {
      await neonBtn.click({ force: true });
      await page.waitForTimeout(600);
      await saveScreenshot(page, '06-1280x720-neon-technical-drawer.png');
    }

    // Return to operational
    const opBtn = await page.$('button:has-text("Vận hành")');
    if (opBtn) {
      await opBtn.click({ force: true });
      await page.waitForTimeout(500);
      await saveScreenshot(page, '05-1280x720-neon-operational.png');
    }

    await ctx.close();
  }

  // 2. Viewport: 1366 x 768 (Standard Laptop)
  console.log('\n--- Capturing 1366x768 ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await loginIfNeeded(page);

    await saveScreenshot(page, '07-1366x768-operational-default.png');

    // Reveal Container Yard
    await page.evaluate(() => {
      document.getElementById('v2-anchor-ZONE_CONTAINER')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    await saveScreenshot(page, '08-1366x768-container-yard-revealed.png');

    // Technical Mode Drawer
    const techBtn = await page.$('button:has-text("Kiểm tra")');
    if (techBtn) {
      await techBtn.click({ force: true });
      await page.waitForTimeout(600);
      await saveScreenshot(page, '09-1366x768-inspector-drawer-open.png');
    }

    await ctx.close();
  }

  // 3. Viewport: 1536 x 864 (Large Laptop / Docked Inspector)
  console.log('\n--- Capturing 1536x864 ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await loginIfNeeded(page);

    await saveScreenshot(page, '10-1536x864-operational-default.png');

    // Switch to Technical View & Docked Inspector
    const techBtn = await page.$('button:has-text("Kiểm tra")');
    if (techBtn) {
      await techBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        document.getElementById('v2-poly-ZONE_QUAY')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await page.waitForTimeout(600);
      await saveScreenshot(page, '11-1536x864-inspector-docked.png');
    }

    // Switch ViewMode to Width (Tràn chiều rộng)
    const widthBtn = await page.$('button:has-text("Tràn chiều rộng")');
    if (widthBtn) {
      await widthBtn.click({ force: true });
      await page.waitForTimeout(600);
      await saveScreenshot(page, '12-1536x864-width-mode.png');
    }

    await ctx.close();
  }

  // 4. Viewport: 1920 x 1080 (Desktop FHD)
  console.log('\n--- Capturing 1920x1080 ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await loginIfNeeded(page);

    await saveScreenshot(page, '13-1920x1080-operational-default.png');

    // Technical Mode with ROAD_BACKLAND inflection warning
    const techBtn = await page.$('button:has-text("Kiểm tra")');
    if (techBtn) {
      await techBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        document.getElementById('v2-road-ROAD_BACKLAND')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await page.waitForTimeout(600);
      await saveScreenshot(page, '14-1920x1080-inspector-docked-road-backland.png');
    }

    // Neon Technical Mode on 1080p
    const neonBtn = await page.$('button:has-text("Neon số")');
    if (neonBtn) {
      await neonBtn.click({ force: true });
      await page.waitForTimeout(600);
      await saveScreenshot(page, '15-1920x1080-neon-technical-view.png');
    }

    await ctx.close();
  }

  // 5. Viewport: 2560 x 1440 (2K QHD)
  console.log('\n--- Capturing 2560x1440 ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await loginIfNeeded(page);

    await saveScreenshot(page, '16-2560x1440-operational-default.png');

    const techBtn = await page.$('button:has-text("Kiểm tra")');
    if (techBtn) {
      await techBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        document.getElementById('v2-poly-BLDG_KHO_1')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await page.waitForTimeout(600);
      await saveScreenshot(page, '17-2560x1440-inspector-docked.png');
    }

    await ctx.close();
  }

  // 6. Browser Zoom Levels (125% and 150%)
  console.log('\n--- Capturing Browser Scaling ---');
  {
    // Zoom 125% (deviceScaleFactor: 1.25)
    const ctx125 = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 });
    const page125 = await ctx125.newPage();
    await page125.goto('http://localhost:5174/operations.html?tab=map_v2');
    await loginIfNeeded(page125);
    await saveScreenshot(page125, '18-zoom125-1536x864.png');
    await ctx125.close();

    // Zoom 150% (deviceScaleFactor: 1.5)
    const ctx150 = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.5 });
    const page150 = await ctx150.newPage();
    await page150.goto('http://localhost:5174/operations.html?tab=map_v2');
    await loginIfNeeded(page150);
    await saveScreenshot(page150, '19-zoom150-1536x864.png');
    await ctx150.close();
  }

  // =========================================================================
  // PART 2: REAL BROWSER INTERACTION WALKTHROUGH VIDEO
  // Required sequence:
  // Default Map V2 -> select General Yard -> open inspector -> resize viewport -> close inspector -> switch to Container Yard -> enable Neon -> switch to Technical View -> return to Operational View
  // =========================================================================
  console.log('\n--- Recording Responsive Interaction Walkthrough Video ---');
  {
    const videoCtx = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1.0,
      recordVideo: {
        dir: VID_DIR,
        size: { width: 1366, height: 768 },
      },
    });

    const page = await videoCtx.newPage();
    const vidRef = page.video();

    await page.goto('http://localhost:5174/operations.html?tab=map_v2');
    await loginIfNeeded(page);
    await page.waitForTimeout(1500);

    // 1. Default Map V2 view
    console.log('Video Step 1: Default Map V2 in compact layout...');
    await page.waitForTimeout(2000);

    // 2. Select General Yard (Zone Reveal)
    console.log('Video Step 2: Selecting General Yard...');
    await page.evaluate(() => {
      document.getElementById('v2-anchor-ZONE_GENERAL')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(2500);

    // 3. Open Inspector (Switch to Technical View)
    console.log('Video Step 3: Opening Inspector in drawer mode...');
    const techBtn = await page.$('button:has-text("Kiểm tra")');
    if (techBtn) {
      await techBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }

    // 4. Resize viewport to 1600x900 (transitions from drawer to docked mode smoothly!)
    console.log('Video Step 4: Resizing viewport to 1600x900 (drawer -> docked transition)...');
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(2500);

    // 5. Close inspector
    console.log('Video Step 5: Closing inspector...');
    const closeBtn = await page.$('button[aria-label="Đóng thanh kiểm tra"]');
    if (closeBtn) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(1800);
    }

    // 6. Switch to Container Yard (Operational mode)
    console.log('Video Step 6: Switching to Operational and selecting Container Yard...');
    const opBtn = await page.$('button:has-text("Vận hành")');
    if (opBtn) {
      await opBtn.click({ force: true });
      await page.waitForTimeout(1200);
    }
    await page.evaluate(() => {
      document.getElementById('v2-anchor-ZONE_CONTAINER')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(2500);

    // 7. Enable Neon mode
    console.log('Video Step 7: Enabling Neon Digital Twin mode...');
    const neonBtn = await page.$('button:has-text("Neon số")');
    if (neonBtn) {
      await neonBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }

    // 8. Switch to Technical View in Neon
    console.log('Video Step 8: Switching to Technical View in Neon...');
    const techBtn2 = await page.$('button:has-text("Kiểm tra")');
    if (techBtn2) {
      await techBtn2.click({ force: true });
      await page.waitForTimeout(2500);
    }

    // 9. Return to Operational View
    console.log('Video Step 9: Returning to Operational View...');
    const opBtn2 = await page.$('button:has-text("Vận hành")');
    if (opBtn2) {
      await opBtn2.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // Close and save video
    await page.close();
    await videoCtx.close();

    if (vidRef) {
      const rawPath = await vidRef.path();
      const targetName = 'map-v2-responsive-interaction.webm';
      const targetPath1 = path.join(VID_DIR, targetName);
      const targetPath2 = path.join(ARTIFACT_VID_DIR, targetName);

      await new Promise((r) => setTimeout(r, 1000));
      if (fs.existsSync(rawPath)) {
        fs.copyFileSync(rawPath, targetPath1);
        fs.copyFileSync(rawPath, targetPath2);
        console.log(`Saved interaction video: ${targetPath1}`);
        console.log(`Copied video to artifact: ${targetPath2}`);
      }
    }
  }

  await browser.close();
  console.log('\nAll visual acceptance screenshots and interaction video captured successfully!');
}

run().catch((err) => {
  console.error('Visual capture failed:', err);
  process.exit(1);
});
