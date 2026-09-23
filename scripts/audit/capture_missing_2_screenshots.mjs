import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.resolve('docs/audits/user-meter-reading-ux/screenshots');

async function loginAsEmployee(page) {
  const pwdInput = await page.$('input[type="password"]');
  if (pwdInput) {
    await page.fill('#employeeCode', 'CSG-0102');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }
}

async function run() {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  try {
    // -----------------------------------------------------------
    // 1. Capture 06-camera-permission-error-mobile.png
    // -----------------------------------------------------------
    console.log('Capturing: 06-camera-permission-error-mobile.png...');
    const noCamContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: [],
    });
    const page1 = await noCamContext.newPage();

    // Mock active round right before navigation
    await page1.route('**/api/v1/meter-operations/today*', async (route) => {
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
      json.summary.pending_current = 7;
      if (json.meters && json.meters.length > 0) {
        json.meters[0].current_status = 'PENDING';
        json.meters[0].current_reading = null;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json),
      });
    });

    // Mock camera failure
    await page1.addInitScript(() => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () => {
          const err = new Error('Permission denied');
          err.name = 'NotAllowedError';
          return Promise.reject(err);
        };
      }
    });

    await page1.goto('http://localhost:5173');
    await loginAsEmployee(page1);

    await page1.waitForSelector('.workspace-container', { timeout: 10000 });
    const fab1 = await page1.$('.sgp-radial-fab');
    if (fab1) {
      await fab1.click();
      await page1.waitForTimeout(400);
      await page1.click('.arc-item-center button, button[aria-label="Đo đếm điện năng"]');
    }

    await page1.waitForSelector('.meter-operations-container', { timeout: 10000 });
    await page1.waitForTimeout(600);

    const captureBtn1 = await page1.$('.btn-worklist-capture');
    if (captureBtn1) {
      await captureBtn1.click();
      await page1.waitForSelector('.camera-permission-box', { timeout: 8000 });
      await page1.waitForTimeout(800);
      await page1.screenshot({
        path: path.join(OUT_DIR, '06-camera-permission-error-mobile.png'),
        fullPage: false,
      });
      console.log('Saved 06-camera-permission-error-mobile.png!');
    }
    await noCamContext.close();

    // -----------------------------------------------------------
    // 2. Capture 14-unsaved-work-modal-mobile.png
    // -----------------------------------------------------------
    console.log('Capturing: 14-unsaved-work-modal-mobile.png...');
    const unsavedContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
    });
    const page2 = await unsavedContext.newPage();

    await page2.route('**/api/v1/meter-operations/today*', async (route) => {
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
      json.summary.pending_current = 7;
      if (json.meters && json.meters.length > 0) {
        json.meters[0].current_status = 'PENDING';
        json.meters[0].current_reading = null;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json),
      });
    });

    await page2.goto('http://localhost:5173');
    await loginAsEmployee(page2);

    await page2.waitForSelector('.workspace-container', { timeout: 10000 });
    const fab2 = await page2.$('.sgp-radial-fab');
    if (fab2) {
      await fab2.click();
      await page2.waitForTimeout(400);
      await page2.click('.arc-item-center button, button[aria-label="Đo đếm điện năng"]');
    }

    await page2.waitForSelector('.meter-operations-container', { timeout: 10000 });
    await page2.waitForTimeout(600);

    const captureBtn2 = await page2.$('.btn-worklist-capture');
    if (captureBtn2) {
      await captureBtn2.click();
      await page2.waitForSelector('.meter-live-camera-viewport, .camera-permission-box', { timeout: 8000 });
      await page2.waitForTimeout(600);

      // Upload test photo
      const testBuffer = await page2.evaluate(async () => {
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

      const tempImgPath = path.resolve('docs/audits/user-meter-reading-ux/screenshots/temp_test_meter_unsaved.jpg');
      const b64Data = testBuffer.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(tempImgPath, Buffer.from(b64Data, 'base64'));

      const fileInput = await page2.$('input[type="file"].hidden-input');
      if (fileInput) {
        await fileInput.setInputFiles(tempImgPath);
        await page2.waitForTimeout(800);
        try { fs.unlinkSync(tempImgPath); } catch {}

        // Now we are in Preview state! Click the back button (.btn-header-back)
        const headerBackBtn = await page2.$('.btn-header-back');
        if (headerBackBtn) {
          await headerBackBtn.click();
          await page2.waitForSelector('.logout-modal-card', { timeout: 4000 });
          await page2.waitForTimeout(600);
          await page2.screenshot({
            path: path.join(OUT_DIR, '14-unsaved-work-modal-mobile.png'),
            fullPage: false,
          });
          console.log('Saved 14-unsaved-work-modal-mobile.png!');
        }
      }
    }
    await unsavedContext.close();

    console.log('Done capturing missing 2 screenshots!');
  } finally {
    await browser.close();
  }
}

run();
