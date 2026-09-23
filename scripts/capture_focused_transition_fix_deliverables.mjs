import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FIX_DIR = path.resolve('docs/implementation/user-focused-capture-transition-fix');
const OUT_SCREENSHOTS = path.join(FIX_DIR, 'screenshots');
const OUT_VIDEOS = path.join(FIX_DIR, 'videos');
const ORIGINAL_VIDEOS = path.resolve('docs/implementation/user-focused-capture/videos');

if (!fs.existsSync(OUT_SCREENSHOTS)) {
  fs.mkdirSync(OUT_SCREENSHOTS, { recursive: true });
}
if (!fs.existsSync(OUT_VIDEOS)) {
  fs.mkdirSync(OUT_VIDEOS, { recursive: true });
}

async function mockActiveRound(page) {
  await page.route('**/api/v1/meter-operations/today*', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.current_round = {
      id: 'round-sim-active-01',
      batch_id: json.batch?.id || 'batch-01',
      scheduled_at: new Date().toISOString(),
      scheduled_local: '14:00 - 21/09/2026',
      scheduled_time_only: '14:00',
      status: 'OPEN',
      is_legacy: false,
      timing_state: 'CURRENT',
      progress: { total: 12, confirmed: 4, review: 1, pending: 7 },
    };
    json.summary.confirmed_current = 4;
    json.summary.review_current = 1;
    json.summary.pending_current = 7;
    json.summary.percent_current = 33;
    if (json.meters && json.meters.length > 0) {
      json.meters[0].current_status = 'PENDING';
      json.meters[0].current_reading = null;
      if (json.meters[1]) {
        json.meters[1].current_status = 'CONFIRMED';
        json.meters[1].current_reading = '04582.10';
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(json),
    });
  });
}

async function loginAsEmployee(page) {
  const pwdInput = await page.$('input[type="password"]');
  if (pwdInput) {
    console.log('Logging in as EMPLOYEE (CSG-0102)...');
    await page.fill('#employeeCode', 'CSG-0102');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }
}

async function navigateToWorklist(page) {
  await page.waitForSelector('.workspace-container', { timeout: 10000 });
  const fab = await page.$('.sgp-radial-fab');
  if (fab) {
    await fab.click();
    await page.waitForTimeout(500);
    const radMeter = await page.$('.arc-item-center button, button[aria-label="Đo đếm điện năng"]');
    if (radMeter) {
      await radMeter.click();
    }
  }
  await page.waitForSelector('.meter-operations-container', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

async function run() {
  console.log('=== STARTING FOCUSED CAPTURE TRANSITION FIX VERIFICATION ===');
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
      recordVideo: {
        dir: OUT_VIDEOS,
        size: { width: 390, height: 844 },
      },
    });

    const page = await context.newPage();
    const videoRef = page.video();
    await mockActiveRound(page);

    console.log('Navigating to application...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1200);
    await loginAsEmployee(page);
    await navigateToWorklist(page);

    // Enter capture mode
    console.log('Tapping "Ghi chỉ số" to enter focused capture mode...');
    const captureBtn = await page.$('.btn-worklist-capture');
    if (!captureBtn) throw new Error('Capture CTA not found on worklist');

    await captureBtn.click();
    await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Setup PerformanceObserver for empirical CLS measurement
    await page.evaluate(() => {
      window.__clsScores = [];
      window.__layoutShiftEntries = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__clsScores.push(entry.value);
            window.__layoutShiftEntries.push({
              value: entry.value,
              hadRecentInput: entry.hadRecentInput,
            });
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    });

    // Frame 1: Camera Ready (video filling viewport with object-fit: cover)
    console.log('Capturing: 01-camera-ready-preview-match.png...');
    await page.screenshot({
      path: path.join(OUT_SCREENSHOTS, '01-camera-ready-preview-match.png'),
      fullPage: false,
    });

    // Tap Shutter
    console.log('Tapping shutter button...');
    const shutterBtn = await page.$('button[data-testid="shutter-button"]');
    if (!shutterBtn) throw new Error('Shutter button not found');
    await shutterBtn.click();

    // Frame 2: Immediate captured still image rendered in same viewport
    console.log('Capturing: 02-capture-instant-still.png...');
    await page.waitForTimeout(120);
    await page.screenshot({
      path: path.join(OUT_SCREENSHOTS, '02-capture-instant-still.png'),
      fullPage: false,
    });

    // Frame 3: Preview state ready with controls and cover fitting (NO horizontal strip)
    await page.waitForSelector('.focused-preview-image', { timeout: 8000 });
    await page.waitForTimeout(400);
    console.log('Capturing: 03-preview-stable-framing.png...');
    await page.screenshot({
      path: path.join(OUT_SCREENSHOTS, '03-preview-stable-framing.png'),
      fullPage: false,
    });

    // Setup OCR delay to verify translucent overlay and visible underlying image
    await page.route('**/api/v1/read-meter', async (route) => {
      console.log('OCR request intercepted, holding 2.5s for visual inspection...');
      await new Promise((r) => setTimeout(r, 2500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          reading: '04582.12',
          meter_type: 'lcd',
          det_confidence: 0.942,
          ocr_confidence: 0.978,
          localization_imgsz: 960,
          pipeline_version: 'e2-adaptive-ppocrv6-medium-v1',
          roi_bbox: [0.18, 0.33, 0.82, 0.67],
        }),
      });
    });

    const readBtn = await page.$('.btn-primary:has-text("Đọc chỉ số")');
    if (!readBtn) throw new Error('"Đọc chỉ số" button not found');
    await readBtn.click();

    // Frame 4: OCR Processing overlay active, photo visible underneath, controls dimmed but stable height
    await page.waitForSelector('.focused-processing-overlay', { timeout: 4000 });
    await page.waitForTimeout(500);
    console.log('Capturing: 04-ocr-overlay-visible-meter.png...');
    await page.screenshot({
      path: path.join(OUT_SCREENSHOTS, '04-ocr-overlay-visible-meter.png'),
      fullPage: false,
    });

    // Frame 5: Verification success with hero number
    await page.waitForSelector('.result-card', { timeout: 8000 });
    await page.waitForTimeout(800);
    console.log('Capturing: 05-verification-result.png...');
    await page.screenshot({
      path: path.join(OUT_SCREENSHOTS, '05-verification-result.png'),
      fullPage: false,
    });

    // Measure CLS up to this point
    const clsData = await page.evaluate(() => {
      const total = (window.__clsScores || []).reduce((a, b) => a + b, 0);
      return { total, count: (window.__clsScores || []).length, entries: window.__layoutShiftEntries };
    });
    console.log(`\n>>> EMPIRICAL CLS MEASUREMENT (Capture -> Preview -> OCR): ${clsData.total} (${clsData.count} entries) <<<\n`);

    // Frame 6: Retake clicked -> Dark opening state (NO white frame)
    console.log('Clicking "Chụp lại" to test retake transition...');
    const retakeBtn = await page.$('.btn-secondary:has-text("Chụp lại")');
    if (!retakeBtn) throw new Error('Retake button not found');
    await retakeBtn.click();

    // Capture immediately upon retake click (0-80ms) to check for absence of white flash
    console.log('Capturing: 06-retake-smooth-dark-opening.png...');
    await page.waitForTimeout(60);
    await page.screenshot({
      path: path.join(OUT_SCREENSHOTS, '06-retake-smooth-dark-opening.png'),
      fullPage: false,
    });

    // Frame 7: Camera stream cleanly restarted
    await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await page.waitForTimeout(800);
    console.log('Capturing: 07-retake-camera-restarted.png...');
    await page.screenshot({
      path: path.join(OUT_SCREENSHOTS, '07-retake-camera-restarted.png'),
      fullPage: false,
    });

    // Complete recording
    await page.waitForTimeout(1200);
    await page.close();
    await context.close();

    // Save continuous runtime video
    if (videoRef) {
      try {
        const videoTempPath = await videoRef.path();
        const targetVideoAfter = path.join(OUT_VIDEOS, 'focused-meter-capture-flow-after.webm');
        const targetVideoUpdated = path.join(ORIGINAL_VIDEOS, 'focused-meter-capture-flow.webm');

        fs.copyFileSync(videoTempPath, targetVideoAfter);
        fs.copyFileSync(videoTempPath, targetVideoUpdated);
        console.log(`Saved AFTER video: ${targetVideoAfter} (${fs.statSync(targetVideoAfter).size} bytes)`);
        console.log(`Updated baseline video: ${targetVideoUpdated}`);
      } catch (videoErr) {
        console.warn('Video save notice:', videoErr.message);
      }
    }

    console.log('=== TRANSITION FIX VERIFICATION COMPLETED SUCCESSFULLY ===');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('VERIFICATION SCRIPT ERROR:', err);
  process.exit(1);
});
