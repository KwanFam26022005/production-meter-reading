import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const VIDEO_PATH = path.resolve('docs/implementation/user-focused-capture-transition-fix/videos/focused-meter-capture-flow-after.webm');
const INVESTIGATION_DIR = path.resolve('docs/implementation/user-meter-verification-refinement/investigation');

if (!fs.existsSync(INVESTIGATION_DIR)) {
  fs.mkdirSync(INVESTIGATION_DIR, { recursive: true });
}

async function extractVideoFrames() {
  console.log('--- STEP 1: EXTRACTING VIDEO FRAMES AROUND 7.3s - 7.6s ---');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const page = await browser.newPage();

  // Create an HTML page that plays the video and draws frames to canvas
  const videoBase64 = fs.readFileSync(VIDEO_PATH).toString('base64');
  const videoUri = `data:video/webm;base64,${videoBase64}`;
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; background: black;">
        <video id="v" src="${videoUri}" muted playsinline></video>
        <canvas id="c"></canvas>
      </body>
    </html>
  `);

  await page.waitForFunction(() => {
    const v = document.getElementById('v');
    return v && v.readyState >= 2;
  }, { timeout: 15000 });

  const duration = await page.evaluate(() => document.getElementById('v').duration);
  const videoWidth = await page.evaluate(() => document.getElementById('v').videoWidth);
  const videoHeight = await page.evaluate(() => document.getElementById('v').videoHeight);
  console.log(`Video loaded: duration=${duration}s, resolution=${videoWidth}x${videoHeight}`);

  const timestamps = [7.20, 7.30, 7.38, 7.40, 7.42, 7.44, 7.46, 7.50, 7.60];
  for (const t of timestamps) {
    if (t > duration) continue;
    const frameDataUrl = await page.evaluate(async (seekTime) => {
      const v = document.getElementById('v');
      const c = document.getElementById('c');
      v.currentTime = seekTime;
      await new Promise((resolve) => {
        v.onseeked = resolve;
      });
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(v, 0, 0);
      return c.toDataURL('image/png');
    }, t);

    const base64Data = frameDataUrl.replace(/^data:image\/png;base64,/, '');
    const filename = `frame_${t.toFixed(2).replace('.', '_')}s.png`;
    fs.writeFileSync(path.join(INVESTIGATION_DIR, filename), Buffer.from(base64Data, 'base64'));
    console.log(`Saved frame at ${t.toFixed(2)}s -> ${filename}`);
  }

  await browser.close();
}

async function runLiveAppInvestigation() {
  console.log('\n--- STEP 2: LIVE RUNTIME DOM & VIEWPORT AUDIT ---');
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
    permissions: ['camera'],
  });

  const page = await context.newPage();

  // Mock active round
  await page.route('**/api/v1/meter-operations/today*', async (route) => {
    let json = {};
    try {
      const response = await route.fetch();
      if (response.ok) {
        json = await response.json();
      }
    } catch {
      // fallback
    }
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

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  // Login
  const pwdInput = await page.$('input[type="password"]');
  if (pwdInput) {
    await page.fill('#employeeCode', 'CSG-0102');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
  }

  // Worklist
  await page.waitForSelector('.workspace-container', { timeout: 10000 });
  const fab = await page.$('.sgp-radial-fab');
  if (fab) {
    await fab.click();
    await page.waitForTimeout(500);
    const radMeter = await page.$('.arc-item-center button, button[aria-label="Đo đếm điện năng"]');
    if (radMeter) await radMeter.click();
  }
  await page.waitForSelector('.meter-operations-container', { timeout: 10000 });
  await page.waitForTimeout(800);

  // Click capture
  const captureBtn = await page.$('.btn-worklist-capture');
  await captureBtn.click();
  await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
  await page.waitForTimeout(800);

  // Monitor DOM metrics before and during shutter click
  const metricsBefore = await page.evaluate(() => {
    const shell = document.querySelector('.focused-capture-shell');
    const video = document.querySelector('.focused-live-video');
    const header = document.querySelector('.focused-capture-header');
    return {
      windowInner: { w: window.innerWidth, h: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      visualViewport: window.visualViewport ? { w: window.visualViewport.width, h: window.visualViewport.height, scale: window.visualViewport.scale } : null,
      shellRect: shell ? shell.getBoundingClientRect() : null,
      videoRect: video ? video.getBoundingClientRect() : null,
      headerRect: header ? header.getBoundingClientRect() : null,
      shellComputed: shell ? {
        transform: window.getComputedStyle(shell).transform,
        width: window.getComputedStyle(shell).width,
        height: window.getComputedStyle(shell).height,
        zoom: window.getComputedStyle(shell).zoom,
      } : null,
    };
  });
  console.log('Metrics BEFORE shutter tap:', JSON.stringify(metricsBefore, null, 2));

  // Shutter click
  const shutterBtn = await page.$('button[data-testid="shutter-button"]');
  await shutterBtn.click();

  // Audit metrics at 50ms, 120ms, 250ms, 500ms
  for (const delay of [50, 120, 250, 500]) {
    await page.waitForTimeout(delay === 50 ? 50 : delay - 50);
    const metricsAt = await page.evaluate(() => {
      const shell = document.querySelector('.focused-capture-shell');
      const img = document.querySelector('.focused-captured-frame, .focused-preview-image');
      const video = document.querySelector('.focused-live-video');
      return {
        windowInner: { w: window.innerWidth, h: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
        visualViewport: window.visualViewport ? { w: window.visualViewport.width, h: window.visualViewport.height, scale: window.visualViewport.scale } : null,
        shellRect: shell ? shell.getBoundingClientRect() : null,
        targetRect: img ? img.getBoundingClientRect() : (video ? video.getBoundingClientRect() : null),
        shellTransform: shell ? window.getComputedStyle(shell).transform : null,
      };
    });
    console.log(`Metrics at +${delay}ms after shutter:`, JSON.stringify(metricsAt, null, 2));
    await page.screenshot({
      path: path.join(INVESTIGATION_DIR, `live_screenshot_${delay}ms.png`),
      fullPage: false,
    });
  }

  await browser.close();
}

async function testVideoWithoutScreenshots() {
  console.log('\n--- STEP 3: RECORDING VIDEO WITHOUT INTERLEAVED CDP SCREENSHOTS ---');
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
    permissions: ['camera'],
    recordVideo: {
      dir: INVESTIGATION_DIR,
      size: { width: 390, height: 844 },
    },
  });

  const page = await context.newPage();
  const videoRef = page.video();

  await page.route('**/api/v1/meter-operations/today*', async (route) => {
    let json = {};
    try {
      const response = await route.fetch();
      if (response.ok) {
        json = await response.json();
      }
    } catch {
      // fallback
    }
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

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  const pwdInput = await page.$('input[type="password"]');
  if (pwdInput) {
    await page.fill('#employeeCode', 'CSG-0102');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
  }

  await page.waitForSelector('.workspace-container', { timeout: 10000 });
  const fab = await page.$('.sgp-radial-fab');
  if (fab) {
    await fab.click();
    await page.waitForTimeout(500);
    const radMeter = await page.$('.arc-item-center button, button[aria-label="Đo đếm điện năng"]');
    if (radMeter) await radMeter.click();
  }
  await page.waitForSelector('.meter-operations-container', { timeout: 10000 });
  await page.waitForTimeout(800);

  const captureBtn = await page.$('.btn-worklist-capture');
  await captureBtn.click();
  await page.waitForSelector('.focused-live-video.is-ready', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Tap shutter WITHOUT calling page.screenshot during the transition
  const shutterBtn = await page.$('button[data-testid="shutter-button"]');
  await shutterBtn.click();
  await page.waitForSelector('.focused-preview-image', { timeout: 8000 });
  await page.waitForTimeout(2000);

  await page.close();
  await context.close();

  if (videoRef) {
    const p = await videoRef.path();
    const dest = path.join(INVESTIGATION_DIR, 'video_clean_no_cdp_screenshots.webm');
    fs.copyFileSync(p, dest);
    console.log(`Saved test video without CDP screenshots: ${dest}`);
  }

  await browser.close();
}

async function main() {
  await extractVideoFrames();
  await runLiveAppInvestigation();
  await testVideoWithoutScreenshots();
  console.log('\n=== INVESTIGATION COMPLETED ===');
}

main().catch((err) => {
  console.error('Investigation error:', err);
  process.exit(1);
});
