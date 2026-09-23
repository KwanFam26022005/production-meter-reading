import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.resolve('docs/audits/user-meter-reading-ux/screenshots');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
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
  console.log('Launching Edge browser with media stream flags...');
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  try {
    // =============================================================
    // Context 1: Real Runtime Base Screenshots (No route mock)
    // =============================================================
    const baseContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
    });

    const page = await baseContext.newPage();
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1500);
    await loginAsEmployee(page);
    await navigateToWorklist(page);

    // 01: 01-reading-worklist-top-mobile.png (REAL_TEST_RUNTIME)
    console.log('Capturing: 01-reading-worklist-top-mobile.png...');
    await page.screenshot({
      path: path.join(OUT_DIR, '01-reading-worklist-top-mobile.png'),
      fullPage: false,
    });

    // 02: 02-reading-worklist-scrolled-mobile.png (REAL_TEST_RUNTIME)
    console.log('Capturing: 02-reading-worklist-scrolled-mobile.png...');
    await page.evaluate(() => window.scrollBy(0, 350));
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT_DIR, '02-reading-worklist-scrolled-mobile.png'),
      fullPage: false,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    // 03: 03-meter-detail-mobile.png (REAL_TEST_RUNTIME)
    console.log('Capturing: 03-meter-detail-mobile.png...');
    const firstMeterCard = await page.$('.worklist-card-body-clickable');
    if (firstMeterCard) {
      await firstMeterCard.click();
      await page.waitForSelector('.meter-detail-modal-card', { timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(OUT_DIR, '03-meter-detail-mobile.png'),
        fullPage: false,
      });

      const closeBtn = await page.$('.modal-close-btn');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // 04: 04-hourly-schedule-mobile.png (REAL_TEST_RUNTIME)
    console.log('Capturing: 04-hourly-schedule-mobile.png...');
    const scheduleLink = await page.$('.worklist-schedule-link');
    if (scheduleLink) {
      await scheduleLink.click();
      await page.waitForSelector('.schedule-inspection-modal-card', { timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(OUT_DIR, '04-hourly-schedule-mobile.png'),
        fullPage: false,
      });

      const closeSchedBtn = await page.$('.modal-close-btn');
      if (closeSchedBtn) await closeSchedBtn.click();
      await page.waitForTimeout(400);
    }

    // 15: 15-no-active-round-mobile.png (REAL_TEST_RUNTIME - Today has no scheduled rounds)
    console.log('Capturing: 15-no-active-round-mobile.png...');
    await page.screenshot({
      path: path.join(OUT_DIR, '15-no-active-round-mobile.png'),
      fullPage: false,
    });

    // =============================================================
    // Active Round Fixture for Interactive Capture (TEST_FIXTURE)
    // =============================================================
    console.log('Setting up active round fixture to enable meter capture...');
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

    // Refresh worklist to pick up active round
    const refreshBtn = await page.$('.btn-header-refresh');
    if (refreshBtn) await refreshBtn.click();
    await page.waitForTimeout(1000);

    // 16: 16-confirmed-meter-mobile.png (TEST_FIXTURE)
    console.log('Capturing: 16-confirmed-meter-mobile.png...');
    const cards = await page.$$('.worklist-card-body-clickable');
    if (cards.length > 1) {
      await cards[1].click();
      await page.waitForSelector('.meter-detail-modal-card', { timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(OUT_DIR, '16-confirmed-meter-mobile.png'),
        fullPage: false,
      });
      const closeDetailBtn = await page.$('.modal-close-btn');
      if (closeDetailBtn) await closeDetailBtn.click();
      await page.waitForTimeout(400);
    }

    // 05: 05-camera-ready-mobile.png (TEST_FIXTURE)
    console.log('Capturing: 05-camera-ready-mobile.png...');
    const captureBtn = await page.$('.btn-worklist-capture');
    if (captureBtn) {
      await captureBtn.click();
      await page.waitForSelector('.meter-live-camera-viewport', { timeout: 10000 });
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: path.join(OUT_DIR, '05-camera-ready-mobile.png'),
        fullPage: false,
      });
    }

    // Generate test image buffer
    const testFileBuffer = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(100, 150, 440, 180);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 52px monospace';
      ctx.fillText('04582.12', 170, 255);
      return new Promise((res) => {
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.readAsDataURL(blob);
        }, 'image/jpeg');
      });
    });

    // 07: 07-image-preview-mobile.png (TEST_FIXTURE)
    const fileInput = await page.$('input[type="file"].hidden-input');
    if (fileInput) {
      const tempImgPath = path.resolve('docs/audits/user-meter-reading-ux/screenshots/temp_test_meter.jpg');
      const b64Data = testFileBuffer.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(tempImgPath, Buffer.from(b64Data, 'base64'));

      await fileInput.setInputFiles(tempImgPath);
      await page.waitForTimeout(800);
      try { fs.unlinkSync(tempImgPath); } catch {}

      console.log('Capturing: 07-image-preview-mobile.png...');
      await page.screenshot({
        path: path.join(OUT_DIR, '07-image-preview-mobile.png'),
        fullPage: false,
      });

      // 14: 14-unsaved-work-modal-mobile.png (TEST_FIXTURE)
      console.log('Capturing: 14-unsaved-work-modal-mobile.png...');
      const headerBackBtn = await page.$('.btn-shell-back');
      if (headerBackBtn) {
        await headerBackBtn.click();
        await page.waitForSelector('.logout-modal-card', { timeout: 4000 });
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(OUT_DIR, '14-unsaved-work-modal-mobile.png'),
          fullPage: false,
        });

        // Cancel modal to stay
        const stayBtn = await page.$('.btn-secondary:has-text("Tiếp tục ghi")');
        if (stayBtn) await stayBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // 08: 08-ocr-processing-mobile.png (TEST_FIXTURE)
    console.log('Setting up route delay to capture: 08-ocr-processing-mobile.png...');
    await page.route('**/api/v1/read-meter', async (route) => {
      await new Promise((r) => setTimeout(r, 3500));
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
    if (readBtn) {
      await readBtn.click();
      await page.waitForSelector('.processing-card', { timeout: 3000 });
      await page.waitForTimeout(400);
      console.log('Capturing: 08-ocr-processing-mobile.png...');
      await page.screenshot({
        path: path.join(OUT_DIR, '08-ocr-processing-mobile.png'),
        fullPage: false,
      });

      // 09: 09-ocr-success-mobile.png (TEST_FIXTURE)
      await page.waitForSelector('.result-card', { timeout: 8000 });
      await page.waitForTimeout(800);
      console.log('Capturing: 09-ocr-success-mobile.png...');
      await page.screenshot({
        path: path.join(OUT_DIR, '09-ocr-success-mobile.png'),
        fullPage: false,
      });

      // 11: 11-edit-reading-mobile.png (TEST_FIXTURE)
      console.log('Capturing: 11-edit-reading-mobile.png...');
      const editBtn = await page.$('.btn-edit-inline');
      if (editBtn) {
        await editBtn.click();
        await page.waitForSelector('.edit-reading-box', { timeout: 3000 });
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(OUT_DIR, '11-edit-reading-mobile.png'),
          fullPage: false,
        });
        const cancelEditBtn = await page.$('.btn-cancel-icon');
        if (cancelEditBtn) await cancelEditBtn.click();
        await page.waitForTimeout(400);
      }
    }

    await page.unroute('**/api/v1/read-meter');

    // 10: 10-ocr-review-mobile.png & 12: 12-manual-entry-mobile.png & 13: 13-confirmation-success-mobile.png (TEST_FIXTURE)
    console.log('Setting up mock review response for 10, 12, 13...');
    await page.route('**/api/v1/read-meter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'review',
          reading: null,
          meter_type: 'mechanical',
          det_confidence: 0.65,
          ocr_confidence: null,
          localization_imgsz: 960,
          pipeline_version: 'e2-adaptive-ppocrv6-medium-v1',
          roi_bbox: [0.15, 0.3, 0.85, 0.7],
        }),
      });
    });

    const retakeBtn = await page.$('.btn-secondary:has-text("Chụp lại")');
    if (retakeBtn) {
      await retakeBtn.click();
      await page.waitForTimeout(500);

      const tempImgPath = path.resolve('docs/audits/user-meter-reading-ux/screenshots/temp_test_meter2.jpg');
      const b64Data = testFileBuffer.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(tempImgPath, Buffer.from(b64Data, 'base64'));
      const fileInput2 = await page.$('input[type="file"].hidden-input');
      if (fileInput2) {
        await fileInput2.setInputFiles(tempImgPath);
        await page.waitForTimeout(600);
        try { fs.unlinkSync(tempImgPath); } catch {}

        const readAgainBtn = await page.$('.btn-primary:has-text("Đọc chỉ số")');
        if (readAgainBtn) {
          await readAgainBtn.click();
          await page.waitForSelector('.status-badge-review', { timeout: 6000 });
          await page.waitForTimeout(600);

          // 10: 10-ocr-review-mobile.png (TEST_FIXTURE)
          console.log('Capturing: 10-ocr-review-mobile.png...');
          await page.screenshot({
            path: path.join(OUT_DIR, '10-ocr-review-mobile.png'),
            fullPage: false,
          });

          // 12: 12-manual-entry-mobile.png (TEST_FIXTURE)
          const manualEntryBtn = await page.$('.btn-primary:has-text("Nhập chỉ số thủ công")');
          if (manualEntryBtn) {
            await manualEntryBtn.click();
            await page.waitForSelector('.edit-reading-box', { timeout: 3000 });
            await page.waitForTimeout(400);
            console.log('Capturing: 12-manual-entry-mobile.png...');
            await page.screenshot({
              path: path.join(OUT_DIR, '12-manual-entry-mobile.png'),
              fullPage: false,
            });

            // Fill manual reading and mock confirm
            await page.fill('.edit-reading-input', '04582.15');
            await page.route('**/api/v1/meter-readings/confirm', async (route) => {
              await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  status: 'success',
                  reading_id: 'reading-test-fixture-01',
                  meter_id: 'meter-test-01',
                  batch_id: 'batch-test-01',
                  reading_round_id: 'round-test-01',
                  round_scheduled_local: '14:00 - 21/09/2026',
                  reading_status: 'CONFIRMED',
                  reading: '04582.15',
                  ocr_reading: null,
                  confirmation_source: 'MANUAL_ENTRY',
                  server_timestamp: new Date().toISOString(),
                  formatted_time: '14:15:30 - 21/09/2026',
                  message: 'Đã xác nhận chỉ số 04582.15 thành công lúc 14:15:30 - 21/09/2026.',
                }),
              });
            });

            const confirmManualBtn = await page.$('.btn-primary:has-text("Xác nhận chỉ số")');
            if (confirmManualBtn) {
              await confirmManualBtn.click();
              await page.waitForSelector('.status-badge-success', { timeout: 6000 });
              await page.waitForTimeout(600);

              // 13: 13-confirmation-success-mobile.png (TEST_FIXTURE)
              console.log('Capturing: 13-confirmation-success-mobile.png...');
              await page.screenshot({
                path: path.join(OUT_DIR, '13-confirmation-success-mobile.png'),
                fullPage: false,
              });
            }
          }
        }
      }
    }

    await baseContext.close();

    // =============================================================
    // Context 2: Camera Permission Error (TEST_FIXTURE)
    // =============================================================
    console.log('Capturing: 06-camera-permission-error-mobile.png (Permission Denied)...');
    const noCamContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: [],
    });
    const noCamPage = await noCamContext.newPage();
    await noCamPage.goto('http://localhost:5173');
    await loginAsEmployee(noCamPage);

    // Provide active round fixture
    await noCamPage.route('**/api/v1/meter-operations/today*', async (route) => {
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json),
      });
    });

    await navigateToWorklist(noCamPage);

    // Override getUserMedia to fail with NotAllowedError
    await noCamPage.addInitScript(() => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () => {
          const err = new Error('Permission denied');
          err.name = 'NotAllowedError';
          return Promise.reject(err);
        };
      }
    });

    const captureBtn2 = await noCamPage.$('.btn-worklist-capture');
    if (captureBtn2) {
      await captureBtn2.click();
      await noCamPage.waitForSelector('.camera-permission-box', { timeout: 8000 });
      await noCamPage.waitForTimeout(600);
      await noCamPage.screenshot({
        path: path.join(OUT_DIR, '06-camera-permission-error-mobile.png'),
        fullPage: false,
      });
    }
    await noCamContext.close();

    // =============================================================
    // Context 3: Tablet Viewport (768 x 1024) (REAL_TEST_RUNTIME)
    // =============================================================
    console.log('Capturing: 17-reading-worklist-tablet.png (768 x 1024)...');
    const tabletContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2.0,
    });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto('http://localhost:5173');
    await loginAsEmployee(tabletPage);
    await navigateToWorklist(tabletPage);
    await tabletPage.screenshot({
      path: path.join(OUT_DIR, '17-reading-worklist-tablet.png'),
      fullPage: false,
    });
    await tabletContext.close();

    // =============================================================
    // Context 4: Desktop Viewport (1280 x 800) (REAL_TEST_RUNTIME)
    // =============================================================
    console.log('Capturing: 18-reading-worklist-desktop.png (1280 x 800)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1.0,
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://localhost:5173');
    await loginAsEmployee(desktopPage);
    await navigateToWorklist(desktopPage);
    await desktopPage.screenshot({
      path: path.join(OUT_DIR, '18-reading-worklist-desktop.png'),
      fullPage: false,
    });
    await desktopContext.close();

    console.log('>>> ALL 18 SCREENSHOTS CAPTURED SUCCESSFULLY! <<<');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

run();
