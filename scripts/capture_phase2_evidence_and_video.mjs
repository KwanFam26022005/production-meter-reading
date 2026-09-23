import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EVIDENCE_DIR = path.join(rootDir, 'docs', 'implementation', 'map-v2-utility-animation-phase2', 'evidence');

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

async function clickNode(page, nodeId) {
  await page.waitForSelector(`#node-${nodeId}`, { timeout: 10000 });
  await page.$eval(`#node-${nodeId}`, el => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function run() {
  console.log('=== STARTING PHASE 2 ANIMATION & INTERACTION WALKTHROUGH ===');
  console.log(`Target Evidence Directory: ${EVIDENCE_DIR}`);

  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  // ---------------------------------------------------------------------------
  // PART 1: MAIN WALKTHROUGH & 15 EVIDENCE SCREENSHOTS (1366x768 with VIDEO)
  // ---------------------------------------------------------------------------
  const videoContext = await browser.newContext({
    recordVideo: {
      dir: EVIDENCE_DIR,
      size: { width: 1366, height: 768 },
    },
    viewport: { width: 1366, height: 768 },
  });

  const page = await videoContext.newPage();

  // Navigate to Operations Map V2
  await page.goto('http://localhost:5174/operations.html?tab=map_v2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await loginIfNeeded(page);
  await ensureMapV2(page);

  // Set Technical tone
  const techBtn = await page.$('button:has-text("Chuẩn kỹ thuật")');
  if (techBtn) await techBtn.click();
  await page.waitForTimeout(500);

  // 1. Choose Electricity -> Collapsed Source
  console.log('[1/15] Selecting Electricity (Collapsed state)...');
  await page.click('button:has-text("Điện")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-electricity-collapsed.png') });

  // 2. Click Electricity Source -> Expanding Midpoint
  console.log('[2/15] Clicking SIM-EXT-GRID to expand (Capturing midpoint)...');
  await clickNode(page, 'SIM-EXT-GRID');
  await page.waitForTimeout(500); // 500ms into 1465ms expansion
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-electricity-expanding-midpoint.png') });

  // 3. Fully Expanded Electricity
  console.log('[3/15] Waiting for full expansion...');
  await page.waitForTimeout(1300); // Reach stable expanded state
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-electricity-expanded.png') });

  // 4. Trace Meter SIM-EM-004 (SIM-FDR-CENTER)
  console.log('[4/15] Clicking SIM-FDR-CENTER to trace SIM-EM-004...');
  await clickNode(page, 'SIM-FDR-CENTER');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-electricity-trace-em004.png') });

  // Switch trace to another meter (SIM-EM-007 / SIM-YDB-C01)
  console.log('Switching trace to SIM-YDB-C01...');
  await clickNode(page, 'SIM-YDB-C01');
  await page.waitForTimeout(600);

  // 5. Click Source to Retract -> Retracting Midpoint
  console.log('[5/15] Clicking SIM-EXT-GRID to retract (Capturing retracting)...');
  await clickNode(page, 'SIM-EXT-GRID');
  await page.waitForTimeout(350); // Midpoint of 1020ms retract
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '05-electricity-retracting.png') });
  await page.waitForTimeout(1000); // Wait for retract complete

  // 6. Switch Water -> Collapsed Water Source
  console.log('[6/15] Selecting Water (Collapsed state)...');
  await page.click('button:has-text("Nước")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '06-water-collapsed.png') });

  // 7. Click Water Source -> Expand Water
  console.log('[7/15] Clicking SIM-CITY-WATER to expand...');
  await clickNode(page, 'SIM-CITY-WATER');
  await page.waitForTimeout(1200); // Wait for 884ms water expansion
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '07-water-expanded.png') });

  // 8. Trace Water Meter SIM-WM-003 (SIM-WP-CFS-01)
  console.log('[8/15] Tracing SIM-WP-CFS-01 (SIM-WM-003)...');
  await clickNode(page, 'SIM-WP-CFS-01');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '08-water-trace-wm003.png') });

  // 9. Switch Both -> Both Collapsed
  console.log('[9/15] Selecting Both (Both collapsed)...');
  await page.click('button:has-text("Cả hai")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '09-both-collapsed.png') });

  // 10. Expand Electricity then Expand Water in BOTH mode
  console.log('[10/15] Expanding Electricity and Water in BOTH mode...');
  await clickNode(page, 'SIM-EXT-GRID');
  await page.waitForTimeout(400);
  await clickNode(page, 'SIM-CITY-WATER');
  await page.waitForTimeout(1600); // Both fully expanded
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '10-both-expanded.png') });

  // 11. Trace Meter in BOTH mode
  console.log('[11/15] Tracing meter in BOTH mode...');
  await clickNode(page, 'SIM-FDR-BERTH');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '11-both-trace.png') });

  // 12. Switch to Neon Mode
  console.log('[12/15] Switching to Neon Digital Twin mode...');
  const neonBtn = await page.$('button:has-text("Neon số")');
  if (neonBtn) await neonBtn.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '12-neon-expanded.png') });

  // 13. Neon Trace
  console.log('[13/15] Tracing in Neon Digital Twin mode...');
  await clickNode(page, 'SIM-MDB-01'); // Trace MDB-01
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '13-neon-trace.png') });

  // Retract both sources in Neon
  console.log('Retracting both in Neon...');
  await clickNode(page, 'SIM-EXT-GRID');
  await clickNode(page, 'SIM-CITY-WATER');
  await page.waitForTimeout(1200);

  // Switch back to Technical
  const techBtn2 = await page.$('button:has-text("Chuẩn kỹ thuật")');
  if (techBtn2) await techBtn2.click();
  await page.waitForTimeout(500);

  // 15. Utility Off Regression
  console.log('[15/15] Turning Utility OFF (Regression check)...');
  await page.click('button:has-text("Tắt lưới")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '15-utility-off-regression.png') });

  // Close walkthrough video page & context
  const video = page.video();
  await page.close();
  await videoContext.close();

  if (video) {
    const videoPath = await video.path();
    const destPath = path.join(EVIDENCE_DIR, 'phase2-utility-animation-walkthrough.webm');
    fs.copyFileSync(videoPath, destPath);
    console.log(`Saved walkthrough video to: ${destPath}`);
  }

  // ---------------------------------------------------------------------------
  // PART 2: REDUCED MOTION CAPTURE (Screenshot 14)
  // ---------------------------------------------------------------------------
  console.log('[14/15] Testing Prefers-Reduced-Motion...');
  const rmContext = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: 'reduce',
  });
  const rmPage = await rmContext.newPage();
  await rmPage.goto('http://localhost:5174/operations.html?tab=map_v2&utilityMode=electricity', { waitUntil: 'domcontentloaded' });
  await rmPage.waitForTimeout(1500);
  await loginIfNeeded(rmPage);
  await ensureMapV2(rmPage);
  await rmPage.click('button:has-text("Điện")');
  await rmPage.waitForTimeout(500);
  // In reduced motion, click source immediately produces full expanded network (0ms)
  await clickNode(rmPage, 'SIM-EXT-GRID');
  await rmPage.waitForTimeout(200);
  await rmPage.screenshot({ path: path.join(EVIDENCE_DIR, '14-reduced-motion-expanded.png') });
  await rmPage.close();
  await rmContext.close();

  // ---------------------------------------------------------------------------
  // PART 3: RAPID INTERRUPTION STRESS TEST VIDEO
  // ---------------------------------------------------------------------------
  console.log('Recording Interruption Stress Test Video...');
  const stressContext = await browser.newContext({
    recordVideo: {
      dir: EVIDENCE_DIR,
      size: { width: 1366, height: 768 },
    },
    viewport: { width: 1366, height: 768 },
  });
  const stressPage = await stressContext.newPage();
  await stressPage.goto('http://localhost:5174/operations.html?tab=map_v2&utilityMode=both', { waitUntil: 'domcontentloaded' });
  await stressPage.waitForTimeout(1500);
  await loginIfNeeded(stressPage);
  await ensureMapV2(stressPage);
  await stressPage.click('button:has-text("Cả hai")');
  await stressPage.waitForTimeout(500);

  // Rapid interrupt: expand -> immediately retract -> immediately expand -> trace -> utility off
  console.log('Stress: Rapid click expand -> retract -> expand...');
  await clickNode(stressPage, 'SIM-EXT-GRID');
  await stressPage.waitForTimeout(100);
  await clickNode(stressPage, 'SIM-EXT-GRID'); // interrupt with retract
  await stressPage.waitForTimeout(100);
  await clickNode(stressPage, 'SIM-EXT-GRID'); // interrupt with expand
  await stressPage.waitForTimeout(1500); // let expand finish

  // Rapid meter trace switching
  await clickNode(stressPage, 'SIM-FDR-WEST');
  await stressPage.waitForTimeout(120);
  await clickNode(stressPage, 'SIM-FDR-CENTER');
  await stressPage.waitForTimeout(120);
  await clickNode(stressPage, 'SIM-MDB-01');
  await stressPage.waitForTimeout(600);

  // Turn off directly from trace
  await stressPage.click('button:has-text("Tắt lưới")');
  await stressPage.waitForTimeout(800);

  const stressVideo = stressPage.video();
  await stressPage.close();
  await stressContext.close();

  if (stressVideo) {
    const sPath = await stressVideo.path();
    const destPath = path.join(EVIDENCE_DIR, 'phase2-utility-animation-stress-interruption.webm');
    fs.copyFileSync(sPath, destPath);
    console.log(`Saved stress interruption video to: ${destPath}`);
  }

  await browser.close();
  console.log('=== ALL PHASE 2 EVIDENCE, VIDEOS, AND SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Fatal error during Phase 2 capture:', err);
  process.exit(1);
});
