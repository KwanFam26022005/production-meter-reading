import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.resolve('docs/implementation/user-focused-capture/screenshots');
const VIDEO_DIR = path.resolve('docs/implementation/user-focused-capture/videos');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
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
      progress: { total: 12, confirmed: 4, review: 1, pending: 7 }
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
  console.log('Starting Playwright with Edge browser...');
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
    // =========================================================================
    // 1. PRIMARY RUNTIME CONTEXT (Video Recording + Main Happy Path Screenshots)
    // =========================================================================
    console.log('\n--- SESSION 1: Video Recording + Happy Path Flow ---');
    const primaryContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
      recordVideo: {
        dir: VIDEO_DIR,
        size: { width: 390, height: 844 },
      },
    });

    const page = await primaryContext.newPage();
    const videoRef = page.video();
    await mockActiveRound(page);

    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1500);
    await loginAsEmployee(page);
    await navigateToWorklist(page);

    // 01: 01-worklist-before-capture.png
    console.log('Capturing: 01-worklist-before-capture.png...');
    await page.screenshot({
      path: path.join(OUT_DIR, '01-worklist-before-capture.png'),
      fullPage: false,
    });

    // Tap "Ghi chỉ số" on SIM-EM-001
    console.log('Tapping "Ghi chỉ số" to enter Focused Capture Mode...');
    const captureBtn = await page.$('.btn-worklist-capture');
    if (!captureBtn) {
      throw new Error('Could not find .btn-worklist-capture on worklist card');
    }

    // Capture opening state as it switches
    await captureBtn.click();
    console.log('Capturing: 02-camera-opening.png...');
    await page.waitForTimeout(60);
    await page.screenshot({
      path: path.join(OUT_DIR, '02-camera-opening.png'),
      fullPage: false,
    });

    // Wait for camera to become ready
    await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await page.waitForSelector('.focused-reticle-overlay', { timeout: 5000 });
    await page.waitForTimeout(800);

    // 03: 03-camera-ready.png
    console.log('Capturing: 03-camera-ready.png...');
    await page.screenshot({
      path: path.join(OUT_DIR, '03-camera-ready.png'),
      fullPage: false,
    });

    // Click Shutter button to take photo
    console.log('Clicking shutter button...');
    const shutterBtn = await page.$('button[data-testid="shutter-button"]');
    if (!shutterBtn) {
      throw new Error('Shutter button not found');
    }
    await shutterBtn.click();

    // Wait for preview shell
    await page.waitForSelector('.focused-preview-image', { timeout: 8000 });
    await page.waitForTimeout(600);

    // 05: 05-captured-image-preview.png
    console.log('Capturing: 05-captured-image-preview.png...');
    await page.screenshot({
      path: path.join(OUT_DIR, '05-captured-image-preview.png'),
      fullPage: false,
    });

    // Setup route delay on OCR to capture processing overlay
    console.log('Setting up OCR processing delay...');
    await page.route('**/api/v1/read-meter', async (route) => {
      console.log('OCR request intercepted, holding for 2.8s...');
      await new Promise((r) => setTimeout(r, 2800));
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
    if (!readBtn) {
      throw new Error('"Đọc chỉ số" button not found in preview');
    }
    await readBtn.click();

    // 06: 06-ocr-processing.png
    await page.waitForSelector('.focused-processing-overlay', { timeout: 3000 });
    await page.waitForTimeout(400);
    console.log('Capturing: 06-ocr-processing.png...');
    await page.screenshot({
      path: path.join(OUT_DIR, '06-ocr-processing.png'),
      fullPage: false,
    });

    // 07: 07-verification-success.png
    await page.waitForSelector('.result-card', { timeout: 8000 });
    await page.waitForTimeout(800);
    console.log('Capturing: 07-verification-success.png...');
    await page.screenshot({
      path: path.join(OUT_DIR, '07-verification-success.png'),
      fullPage: false,
    });

    // Click "Chụp lại" (Retake)
    console.log('Testing Retake button...');
    const retakeBtn = await page.$('.btn-secondary:has-text("Chụp lại")');
    if (!retakeBtn) {
      throw new Error('"Chụp lại" button not found on verification card');
    }
    await retakeBtn.click();
    await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await page.waitForTimeout(800);

    // 09: 09-retake-camera.png
    console.log('Capturing: 09-retake-camera.png...');
    await page.screenshot({
      path: path.join(OUT_DIR, '09-retake-camera.png'),
      fullPage: false,
    });

    // Complete video context
    await page.waitForTimeout(1200);
    console.log('Closing primary context to finalize video...');
    await page.close();
    await primaryContext.close();

    // Rename/copy recorded video
    if (videoRef) {
      try {
        const videoTempPath = await videoRef.path();
        const targetVideoPath = path.join(VIDEO_DIR, 'focused-meter-capture-flow.webm');
        if (fs.existsSync(targetVideoPath)) {
          fs.unlinkSync(targetVideoPath);
        }
        fs.copyFileSync(videoTempPath, targetVideoPath);
        console.log(`Video saved: focused-meter-capture-flow.webm (${fs.statSync(targetVideoPath).size} bytes)`);
      } catch (videoErr) {
        console.warn('Video save notice:', videoErr.message);
      }
    }

    // =========================================================================
    // 2. OCR REVIEW FALLBACK CONTEXT (Screenshot 08)
    // =========================================================================
    console.log('\n--- SESSION 2: Review Fallback State ---');
    const reviewContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
    });
    const reviewPage = await reviewContext.newPage();
    await mockActiveRound(reviewPage);
    await reviewPage.goto('http://localhost:5173');
    await reviewPage.waitForTimeout(1000);
    await loginAsEmployee(reviewPage);
    await navigateToWorklist(reviewPage);

    // Enter camera
    const captureBtn2 = await reviewPage.$('.btn-worklist-capture');
    if (captureBtn2) await captureBtn2.click();
    await reviewPage.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await reviewPage.waitForTimeout(400);

    // Mock review response
    await reviewPage.route('**/api/v1/read-meter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'review',
          reading: null,
          meter_type: 'mechanical',
          det_confidence: 0.62,
          ocr_confidence: null,
          localization_imgsz: 960,
          pipeline_version: 'e2-adaptive-ppocrv6-medium-v1',
          roi_bbox: [0.15, 0.3, 0.85, 0.7],
        }),
      });
    });

    const shutterBtn2 = await reviewPage.$('button[data-testid="shutter-button"]');
    if (shutterBtn2) await shutterBtn2.click();
    await reviewPage.waitForSelector('.focused-preview-image', { timeout: 8000 });
    const readBtn2 = await reviewPage.$('.btn-primary:has-text("Đọc chỉ số")');
    if (readBtn2) await readBtn2.click();

    await reviewPage.waitForSelector('.status-badge-review', { timeout: 8000 });
    await reviewPage.waitForTimeout(600);

    // 08: 08-verification-review.png
    console.log('Capturing: 08-verification-review.png...');
    await reviewPage.screenshot({
      path: path.join(OUT_DIR, '08-verification-review.png'),
      fullPage: false,
    });
    await reviewPage.close();
    await reviewContext.close();

    // =========================================================================
    // 3. CAMERA PERMISSION ERROR CONTEXT (Screenshot 04)
    // =========================================================================
    console.log('\n--- SESSION 3: Camera Permission Error State ---');
    const errContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: [], // Deny camera permission
    });
    const errPage = await errContext.newPage();
    await mockActiveRound(errPage);

    // Override getUserMedia before loading
    await errPage.addInitScript(() => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () =>
          Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      }
    });

    await errPage.goto('http://localhost:5173');
    await errPage.waitForTimeout(1000);
    await loginAsEmployee(errPage);
    await navigateToWorklist(errPage);

    const captureBtnErr = await errPage.$('.btn-worklist-capture');
    if (captureBtnErr) await captureBtnErr.click();
    await errPage.waitForSelector('.focused-camera-error-card', { timeout: 8000 });
    await errPage.waitForTimeout(500);

    // 04: 04-camera-permission-error.png
    console.log('Capturing: 04-camera-permission-error.png...');
    await errPage.screenshot({
      path: path.join(OUT_DIR, '04-camera-permission-error.png'),
      fullPage: false,
    });
    await errPage.close();
    await errContext.close();

    // =========================================================================
    // 4. REDUCED MOTION CONTEXT (Screenshot 10)
    // =========================================================================
    console.log('\n--- SESSION 4: Reduced Motion Preference ---');
    const rmContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
      reducedMotion: 'reduce',
    });
    const rmPage = await rmContext.newPage();
    await mockActiveRound(rmPage);
    await rmPage.goto('http://localhost:5173');
    await rmPage.waitForTimeout(1000);
    await loginAsEmployee(rmPage);
    await navigateToWorklist(rmPage);

    const captureBtnRm = await rmPage.$('.btn-worklist-capture');
    if (captureBtnRm) await captureBtnRm.click();
    await rmPage.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await rmPage.waitForTimeout(500);

    // 10: 10-camera-reduced-motion.png
    console.log('Capturing: 10-camera-reduced-motion.png...');
    await rmPage.screenshot({
      path: path.join(OUT_DIR, '10-camera-reduced-motion.png'),
      fullPage: false,
    });
    await rmPage.close();
    await rmContext.close();

    // =========================================================================
    // 5. TABLET VIEWPORT (Screenshot 11)
    // =========================================================================
    console.log('\n--- SESSION 5: Tablet Viewport (768x1024) ---');
    const tabContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
    });
    const tabPage = await tabContext.newPage();
    await mockActiveRound(tabPage);
    await tabPage.goto('http://localhost:5173');
    await tabPage.waitForTimeout(1000);
    await loginAsEmployee(tabPage);
    await navigateToWorklist(tabPage);

    const captureBtnTab = await tabPage.$('.btn-worklist-capture');
    if (captureBtnTab) await captureBtnTab.click();
    await tabPage.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await tabPage.waitForTimeout(500);

    // 11: 11-camera-tablet.png
    console.log('Capturing: 11-camera-tablet.png...');
    await tabPage.screenshot({
      path: path.join(OUT_DIR, '11-camera-tablet.png'),
      fullPage: false,
    });
    await tabPage.close();
    await tabContext.close();

    // =========================================================================
    // 6. DESKTOP VIEWPORT (Screenshot 12)
    // =========================================================================
    console.log('\n--- SESSION 6: Desktop Viewport (1280x800) ---');
    const dskContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
    });
    const dskPage = await dskContext.newPage();
    await mockActiveRound(dskPage);
    await dskPage.goto('http://localhost:5173');
    await dskPage.waitForTimeout(1000);
    await loginAsEmployee(dskPage);
    await navigateToWorklist(dskPage);

    const captureBtnDsk = await dskPage.$('.btn-worklist-capture');
    if (captureBtnDsk) await captureBtnDsk.click();
    await dskPage.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await dskPage.waitForTimeout(500);

    // 12: 12-camera-desktop.png
    console.log('Capturing: 12-camera-desktop.png...');
    await dskPage.screenshot({
      path: path.join(OUT_DIR, '12-camera-desktop.png'),
      fullPage: false,
    });
    await dskPage.close();
    await dskContext.close();

    console.log('\n=== ALL DELIVERABLES CAPTURED SUCCESSFULLY! ===');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('FAILED TO CAPTURE DELIVERABLES:', err);
  process.exit(1);
});
