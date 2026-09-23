import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DELIVERABLES_DIR = path.resolve('docs/implementation/user-meter-verification-refinement');
const SCREENSHOTS_DIR = path.join(DELIVERABLES_DIR, 'screenshots');
const VIDEOS_DIR = path.join(DELIVERABLES_DIR, 'videos');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });

async function mockActiveRound(page) {
  await page.route('**/api/v1/meter-operations/today*', async (route) => {
    let json = {};
    try {
      const response = await route.fetch();
      if (response.ok) json = await response.json();
    } catch {}

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
    json.summary = json.summary || { total_meters: 12 };
    json.summary.confirmed_current = 4;
    json.summary.review_current = 1;
    json.summary.pending_current = 7;
    json.summary.percent_current = 33;
    if (json.meters && json.meters.length > 0) {
      json.meters[0].current_status = 'PENDING';
      json.meters[0].current_reading = null;
    } else {
      json.meters = [
        {
          meter: { id: 'm1', meter_code: 'SIM-EM-001', name: 'Trạm Biến Áp Cảng', meter_type: 'LCD', location: 'Cầu Cảng Tân Thuận' },
          current_status: 'PENDING',
          current_reading: null,
          missed_count: 0,
        },
      ];
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
  });
}

async function loginAsEmployee(page) {
  const pwdInput = await page.$('input[type="password"]');
  if (pwdInput) {
    console.log('Logging in as CSG-0102...');
    await page.fill('#employeeCode', 'CSG-0102');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1800);
  }
}

async function navigateToWorklist(page) {
  await page.waitForSelector('.workspace-container', { timeout: 10000 });
  const fab = await page.$('.sgp-radial-fab');
  if (fab) {
    await fab.click();
    await page.waitForTimeout(400);
    const radMeter = await page.$('.arc-item-center button, button[aria-label="Đo đếm điện năng"]');
    if (radMeter) {
      await radMeter.click();
    }
  }
  await page.waitForSelector('.meter-operations-container', { timeout: 10000 });
  await page.waitForTimeout(800);
}

async function run() {
  console.log('=== STARTING DELIVERABLES CAPTURE ===');
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
    // 1. VIDEO CONTEXT: CONTINUOUS RUNTIME RECORDING (ZERO SCREENSHOTS TO AVOID ARTIFACTS)
    // Flow: Camera → Preview → OCR → Verification → Sửa số → Xác nhận
    // =========================================================================
    console.log('\n--- 1. RECORDING CLEAN CONTINUOUS VIDEO ---');
    const videoContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
      recordVideo: {
        dir: VIDEOS_DIR,
        size: { width: 390, height: 844 },
      },
    });

    const videoPage = await videoContext.newPage();
    const videoRef = videoPage.video();
    await mockActiveRound(videoPage);

    // Mock OCR readMeter endpoint
    await videoPage.route('**/api/v1/read-meter', async (route) => {
      console.log('[Video] OCR request intercepted, simulating inference (1.5s)...');
      await new Promise((r) => setTimeout(r, 1500));
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

    // Mock confirmation endpoint
    await videoPage.route('**/api/v1/meter-readings/confirm', async (route) => {
      console.log('[Video] Confirm request intercepted...');
      const req = route.request();
      const postData = JSON.parse(req.postData() || '{}');
      await new Promise((r) => setTimeout(r, 800));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          reading_id: 'rd-qa-verified-01',
          meter_id: postData.meter_id || 'm1',
          batch_id: postData.batch_id || 'b1',
          reading_round_id: postData.reading_round_id || 'round-sim-active-01',
          round_scheduled_local: '14:00 - 21/09/2026',
          reading_status: 'CONFIRMED',
          reading: postData.reading || '04583.50',
          ocr_reading: '04582.12',
          confirmation_source: postData.confirmation_source || 'USER_CORRECTED',
          server_timestamp: new Date().toISOString(),
          formatted_time: '14:15:20',
          message: 'Ghi nhận chỉ số thành công vào sổ đo đếm',
        }),
      });
    });

    await videoPage.goto('http://localhost:5173');
    await videoPage.waitForTimeout(1000);
    await loginAsEmployee(videoPage);
    await navigateToWorklist(videoPage);

    // Step 1: Click "Ghi chỉ số" to enter Camera
    console.log('[Video] Entering camera...');
    const captureBtn = await videoPage.$('.btn-worklist-capture');
    if (captureBtn) await captureBtn.click();
    await videoPage.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await videoPage.waitForTimeout(1500);

    // Step 2: Shutter click → Preview
    console.log('[Video] Shutter capture...');
    const shutterBtn = await videoPage.$('button[data-testid="shutter-button"]');
    if (shutterBtn) await shutterBtn.click();
    await videoPage.waitForSelector('.focused-preview-image', { timeout: 8000 });
    await videoPage.waitForTimeout(1200);

    // Step 3: Click "Đọc chỉ số" → OCR Processing overlay
    console.log('[Video] Triggering OCR...');
    const readBtn = await videoPage.$('.btn-primary:has-text("Đọc chỉ số")');
    if (readBtn) await readBtn.click();

    // Step 4: Verification screen appears (State 4A)
    await videoPage.waitForSelector('.result-card', { timeout: 10000 });
    console.log('[Video] Verification screen loaded...');
    await videoPage.waitForTimeout(1500);

    // Step 5: Click "Sửa" to edit number
    console.log('[Video] Clicking Sửa...');
    const editBtn = await videoPage.$('.btn-edit-inline');
    if (editBtn) await editBtn.click();
    await videoPage.waitForSelector('.edit-reading-input', { timeout: 4000 });
    await videoPage.waitForTimeout(800);

    // Fill new number
    console.log('[Video] Typing new reading 04583.50...');
    await videoPage.fill('.edit-reading-input', '04583.50');
    await videoPage.waitForTimeout(600);

    // Save edit
    console.log('[Video] Saving edit...');
    const saveEditBtn = await videoPage.$('.btn-primary:has-text("Lưu chỉnh sửa")');
    if (saveEditBtn) await saveEditBtn.click();
    await videoPage.waitForTimeout(1200);

    // Step 6: Click "Xác nhận & lưu"
    console.log('[Video] Confirming reading...');
    const confirmBtn = await videoPage.$('.btn-primary:has-text("Xác nhận & lưu")');
    if (confirmBtn) await confirmBtn.click();

    // Step 7: Confirmation success (State 4B)
    await videoPage.waitForSelector('text=ĐÃ GHI NHẬN VÀO SỔ', { timeout: 8000 });
    console.log('[Video] Confirmation success reached!');
    await videoPage.waitForTimeout(2000);

    // Close video context
    await videoPage.close();
    await videoContext.close();

    if (videoRef) {
      const tempPath = await videoRef.path();
      const finalVideoPath = path.join(VIDEOS_DIR, 'user-meter-verification-refinement-flow.webm');
      if (fs.existsSync(tempPath)) {
        fs.copyFileSync(tempPath, finalVideoPath);
        console.log(`✓ Video recorded and saved: ${finalVideoPath}`);
      }
    }

    // =========================================================================
    // 2. SCREENSHOTS CONTEXT: HIGH-RES EVIDENCE CAPTURE (NO VIDEO RECORDING)
    // =========================================================================
    console.log('\n--- 2. CAPTURING EVIDENCE SCREENSHOTS ---');
    const ssContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
    });

    const page = await ssContext.newPage();
    await mockActiveRound(page);

    // Setup OCR mock
    await page.route('**/api/v1/read-meter', async (route) => {
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

    // Mock confirm
    await page.route('**/api/v1/meter-readings/confirm', async (route) => {
      const postData = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          reading_id: 'rd-qa-verified-01',
          meter_id: postData.meter_id || 'm1',
          batch_id: postData.batch_id || 'b1',
          reading_round_id: postData.reading_round_id || 'round-sim-active-01',
          round_scheduled_local: '14:00 - 21/09/2026',
          reading_status: 'CONFIRMED',
          reading: postData.reading || '04582.12',
          ocr_reading: '04582.12',
          confirmation_source: postData.confirmation_source || 'OCR_CONFIRMED',
          server_timestamp: new Date().toISOString(),
          formatted_time: '14:15:20',
          message: 'Ghi nhận chỉ số thành công vào sổ đo đếm',
        }),
      });
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);
    await loginAsEmployee(page);
    await navigateToWorklist(page);

    // Capture 01: Worklist before capture
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-worklist-ready.png') });
    console.log('✓ Captured: 01-worklist-ready.png');

    // Enter camera
    const cBtn = await page.$('.btn-worklist-capture');
    if (cBtn) await cBtn.click();
    await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    await page.waitForTimeout(600);

    // Capture 02: Focused camera ready
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-focused-camera-ready.png') });
    console.log('✓ Captured: 02-focused-camera-ready.png');

    // Click shutter
    const sBtn = await page.$('button[data-testid="shutter-button"]');
    if (sBtn) await sBtn.click();
    await page.waitForSelector('.focused-preview-image', { timeout: 8000 });
    await page.waitForTimeout(500);

    // Capture 03: Captured preview
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-captured-image-preview.png') });
    console.log('✓ Captured: 03-captured-image-preview.png');

    // Trigger OCR
    const rBtn = await page.$('.btn-primary:has-text("Đọc chỉ số")');
    if (rBtn) await rBtn.click();
    await page.waitForSelector('.result-card', { timeout: 10000 });
    await page.waitForTimeout(600);

    // Capture 04: Redesigned Verification Screen (State 4A)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-verification-redesigned-4a.png') });
    console.log('✓ Captured: 04-verification-redesigned-4a.png');

    // Click "Sửa"
    const eBtn = await page.$('.btn-edit-inline');
    if (eBtn) await eBtn.click();
    await page.waitForSelector('.edit-reading-input', { timeout: 4000 });
    await page.waitForTimeout(400);

    // Capture 05: Inline editing mode
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-verification-inline-edit.png') });
    console.log('✓ Captured: 05-verification-inline-edit.png');

    // Type edited value & save
    await page.fill('.edit-reading-input', '04583.50');
    const svBtn = await page.$('.btn-primary:has-text("Lưu chỉnh sửa")');
    if (svBtn) await svBtn.click();
    await page.waitForTimeout(500);

    // Capture 06: Verification with edited number banner
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-verification-edited-state.png') });
    console.log('✓ Captured: 06-verification-edited-state.png');

    // Confirm reading
    const cfmBtn = await page.$('.btn-primary:has-text("Xác nhận & lưu")');
    if (cfmBtn) await cfmBtn.click();
    await page.waitForSelector('text=ĐÃ GHI NHẬN VÀO SỔ', { timeout: 8000 });
    await page.waitForTimeout(600);

    // Capture 07: Confirmation success (State 4B)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-confirmation-success-4b.png') });
    console.log('✓ Captured: 07-confirmation-success-4b.png');

    // Return to worklist
    const backBtn = await page.$('.btn-primary:has-text("Về danh sách công tơ")');
    if (backBtn) await backBtn.click();
    await page.waitForSelector('.meter-operations-container', { timeout: 8000 });
    await page.waitForTimeout(500);

    // =========================================================================
    // 3. CAPTURE REVIEW SCREEN (STATE 5) & MANUAL ENTRY
    // =========================================================================
    console.log('\n--- 3. CAPTURING REVIEW STATE & MANUAL ENTRY ---');
    // Override OCR route to return review status
    await page.route('**/api/v1/read-meter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'review',
          reading: null,
          meter_type: 'lcd',
          det_confidence: 0.42,
          ocr_confidence: null,
          localization_imgsz: 960,
          pipeline_version: 'e2-adaptive-ppocrv6-medium-v1',
          roi_bbox: null,
        }),
      });
    });

    const cBtn2 = await page.$('.btn-worklist-capture');
    if (cBtn2) await cBtn2.click();
    await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    const sBtn2 = await page.$('button[data-testid="shutter-button"]');
    if (sBtn2) await sBtn2.click();
    await page.waitForSelector('.focused-preview-image', { timeout: 8000 });
    const rBtn2 = await page.$('.btn-primary:has-text("Đọc chỉ số")');
    if (rBtn2) await rBtn2.click();

    await page.waitForSelector('text=CHƯA ĐỌC ĐƯỢC TỰ ĐỘNG', { timeout: 8000 });
    await page.waitForTimeout(500);

    // Capture 08: Streamlined REVIEW screen
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-review-streamlined-state5.png') });
    console.log('✓ Captured: 08-review-streamlined-state5.png');

    // Click "Nhập chỉ số thủ công"
    const manualBtn = await page.$('.btn-primary:has-text("Nhập chỉ số thủ công")');
    if (manualBtn) await manualBtn.click();
    await page.waitForSelector('.edit-reading-input', { timeout: 4000 });
    await page.waitForTimeout(400);

    // Capture 09: Manual entry open in REVIEW
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-review-manual-entry-open.png') });
    console.log('✓ Captured: 09-review-manual-entry-open.png');

    // Reset back to worklist by clicking "Thoát" on confirmation modal
    const cancelManual = await page.$('.btn-secondary:has-text("Hủy")');
    if (cancelManual) await cancelManual.click();
    await page.waitForTimeout(300);
    const headerBack = await page.$('.btn-focused-back');
    if (headerBack) await headerBack.click();
    await page.waitForSelector('.logout-modal-card', { timeout: 4000 });
    const modalConfirmExit = await page.$('.btn-primary:has-text("Thoát")');
    if (modalConfirmExit) await modalConfirmExit.click();
    await page.waitForSelector('.meter-operations-container', { timeout: 8000 });
    await page.waitForTimeout(600);

    // =========================================================================
    // 4. CAPTURE HTTP 409 CONFLICT BANNER & OUTCOME UNKNOWN BANNER
    // =========================================================================
    console.log('\n--- 4. CAPTURING 409 CONFLICT & OUTCOME UNKNOWN BANNERS ---');

    // Reset OCR back to success
    await page.route('**/api/v1/read-meter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          reading: '04582.12',
          meter_type: 'lcd',
          det_confidence: 0.95,
          ocr_confidence: 0.98,
          localization_imgsz: 960,
          pipeline_version: 'e2-adaptive-ppocrv6-medium-v1',
          roi_bbox: [0.18, 0.33, 0.82, 0.67],
        }),
      });
    });

    // Mock 409 conflict on confirm
    await page.route('**/api/v1/meter-readings/confirm', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Công tơ này đã được xác nhận trong lượt hiện tại (409 Conflict)',
        }),
      });
    });

    const cBtn3 = await page.$('.btn-worklist-capture');
    if (cBtn3) await cBtn3.click();
    await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    const sBtn3 = await page.$('button[data-testid="shutter-button"]');
    if (sBtn3) await sBtn3.click();
    await page.waitForSelector('.focused-preview-image', { timeout: 8000 });
    const rBtn3 = await page.$('.btn-primary:has-text("Đọc chỉ số")');
    if (rBtn3) await rBtn3.click();
    await page.waitForSelector('.result-card', { timeout: 10000 });

    // Click confirm to trigger 409
    const cfmBtn409 = await page.$('.btn-primary:has-text("Xác nhận & lưu")');
    if (cfmBtn409) await cfmBtn409.click();
    await page.waitForSelector('.verify-conflict-banner', { timeout: 6000 });
    await page.waitForTimeout(500);

    // Capture 10: HTTP 409 Conflict Banner
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-conflict-409-banner.png') });
    console.log('✓ Captured: 10-conflict-409-banner.png');

    // Test Outcome Unknown by causing network abort on confirm
    console.log('Testing Outcome Unknown banner (network loss after send)...');
    await page.route('**/api/v1/meter-readings/confirm', async (route) => {
      await route.abort('failed');
    });

    // Reset back to worklist from conflict banner
    const backFromConflict = await page.$('.verify-conflict-banner .btn-primary');
    if (backFromConflict) await backFromConflict.click();
    await page.waitForSelector('.meter-operations-container', { timeout: 8000 });
    await page.waitForTimeout(500);

    // Re-enter to trigger outcome unknown
    const cBtn4 = await page.$('.btn-worklist-capture');
    if (cBtn4) await cBtn4.click();
    await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
    const sBtn4 = await page.$('button[data-testid="shutter-button"]');
    if (sBtn4) await sBtn4.click();
    await page.waitForSelector('.focused-preview-image', { timeout: 8000 });
    const rBtn4 = await page.$('.btn-primary:has-text("Đọc chỉ số")');
    if (rBtn4) await rBtn4.click();
    await page.waitForSelector('.result-card', { timeout: 10000 });

    // Click confirm to trigger network failure
    const cfmBtnNet = await page.$('.btn-primary:has-text("Xác nhận & lưu")');
    if (cfmBtnNet) await cfmBtnNet.click();
    await page.waitForSelector('.verify-outcome-unknown-banner', { timeout: 6000 });
    await page.waitForTimeout(500);

    // Capture 10b: Outcome Unknown Banner
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10b-outcome-unknown-banner.png') });
    console.log('✓ Captured: 10b-outcome-unknown-banner.png');

    // Close session
    await page.close();
    await ssContext.close();

    // =========================================================================
    // 5. CAPTURE 5 VIEWPORTS: 375x812, 390x844, 428x926, 768x1024, 1280x800
    // =========================================================================
    console.log('\n--- 5. CAPTURING 5 VIEWPORTS ---');
    const viewports = [
      { name: 'viewport-375x812', width: 375, height: 812 },
      { name: 'viewport-390x844', width: 390, height: 844 },
      { name: 'viewport-428x926', width: 428, height: 926 },
      { name: 'viewport-768x1024', width: 768, height: 1024 },
      { name: 'viewport-1280x800', width: 1280, height: 800 },
    ];

    for (const vp of viewports) {
      console.log(`Capturing verification screen at ${vp.width}x${vp.height}...`);
      const vpContext = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2.0,
        permissions: ['camera'],
      });
      const vpPage = await vpContext.newPage();
      await mockActiveRound(vpPage);

      await vpPage.route('**/api/v1/read-meter', async (route) => {
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

      await vpPage.goto('http://localhost:5173');
      await vpPage.waitForTimeout(800);
      await loginAsEmployee(vpPage);
      await navigateToWorklist(vpPage);

      const cap = await vpPage.$('.btn-worklist-capture');
      if (cap) await cap.click();
      await vpPage.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
      const shut = await vpPage.$('button[data-testid="shutter-button"]');
      if (shut) await shut.click();
      await vpPage.waitForSelector('.focused-preview-image', { timeout: 8000 });
      const rd = await vpPage.$('.btn-primary:has-text("Đọc chỉ số")');
      if (rd) await rd.click();
      await vpPage.waitForSelector('.result-card', { timeout: 10000 });
      await vpPage.waitForTimeout(500);

      await vpPage.screenshot({ path: path.join(SCREENSHOTS_DIR, `11-${vp.name}-verification.png`) });
      console.log(`✓ Captured: 11-${vp.name}-verification.png`);

      await vpPage.close();
      await vpContext.close();
    }

    console.log('\n=== ALL DELIVERABLES CAPTURED SUCCESSFULLY ===');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Fatal error capturing deliverables:', err);
  process.exit(1);
});
