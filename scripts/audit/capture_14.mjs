import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = path.resolve('docs/audits/user-meter-reading-ux/screenshots');

async function run() {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2.0,
      permissions: ['camera'],
    });
    const page = await context.newPage();

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

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    const isLogin = await page.$('input[type="password"]');
    if (isLogin) {
      await page.fill('#employeeCode', 'CSG-0102');
      await page.fill('#password', 'Admin123456!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2500);
    }

    await page.waitForSelector('.workspace-container', { timeout: 15000 });
    const fab = await page.$('.sgp-radial-fab');
    if (fab) {
      await fab.click();
      await page.waitForTimeout(500);
      await page.click('.arc-item-center button, button[aria-label="Đo đếm điện năng"]');
    }

    await page.waitForSelector('.meter-operations-container', { timeout: 10000 });
    await page.waitForTimeout(600);

    const captureBtn = await page.$('.btn-worklist-capture');
    if (captureBtn) {
      await captureBtn.click();
      await page.waitForSelector('.meter-camera-container', { timeout: 8000 });
      await page.waitForTimeout(600);

      // Create test image in canvas
      const testBuffer = await page.evaluate(async () => {
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

      const fileInput = await page.$('input[type="file"].hidden-input');
      if (fileInput) {
        await fileInput.setInputFiles(tempImgPath);
        await page.waitForTimeout(1000);
        try { fs.unlinkSync(tempImgPath); } catch {}

        // Now in Preview state: click header back button
        const headerBackBtn = await page.$('.btn-header-back');
        if (headerBackBtn) {
          await headerBackBtn.click();
          await page.waitForSelector('.logout-modal-card', { timeout: 5000 });
          await page.waitForTimeout(600);
          await page.screenshot({
            path: path.join(OUT_DIR, '14-unsaved-work-modal-mobile.png'),
            fullPage: false,
          });
          console.log('Successfully captured 14-unsaved-work-modal-mobile.png!');
        }
      }
    }
  } catch (err) {
    console.error('Error in capture_14:', err);
  } finally {
    await browser.close();
  }
}

run();
