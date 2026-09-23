import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_DOCS_DIR = path.resolve('docs/implementation/user-attendance-reliability-refinement');
const SCREENSHOTS_DIR = path.join(BASE_DOCS_DIR, 'screenshots');
const VIDEOS_DIR = path.join(BASE_DOCS_DIR, 'videos');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });

// Minimal 1x1 synthetic image base64
const SYNTHETIC_IMAGE_BASE64 =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function loginAsEmployee(page) {
  await page.waitForTimeout(1000);
  const pwdInput = await page.$('input[type="password"]');
  if (pwdInput) {
    console.log('Logging in as EMPLOYEE (CSG-0102)...');
    await page.fill('#employeeCode', 'CSG-0102');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }
}

async function openAttendanceView(page) {
  // Try priority card CTA first
  const priorityCta = await page.$('.sgp-priority-cta');
  if (priorityCta && (await priorityCta.isVisible())) {
    await priorityCta.click();
    await page.waitForTimeout(800);
    return;
  }

  // Or click radial fab then attendance button
  const fab = await page.$('.sgp-radial-fab');
  if (fab) {
    await fab.click();
    await page.waitForTimeout(400);
    const attBtn = await page.$('button[aria-label*="chấm công" i], .arc-item-left button, button:has-text("Chấm công")');
    if (attBtn) {
      await attBtn.click();
      await page.waitForTimeout(800);
      return;
    }
  }

  // Or check update list item
  const updateItem = await page.$('.sgp-compact-row:has-text("Chấm công")');
  if (updateItem) {
    await updateItem.click();
    await page.waitForTimeout(800);
  }
}

async function run() {
  console.log('Starting Attendance QA Capture with Edge...');
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
    ],
  });

  // Helper to attach listeners
  const setupPageLogging = (p) => {
    p.on('console', (msg) => console.log('  [Browser]', msg.text()));
    p.on('pageerror', (err) => console.error('  [PageError]', err.message));
  };

  // =========================================================================
  // SCENARIO 1: Standard Check-In Flow Video & Screenshots (Mobile 390x844)
  // =========================================================================
  console.log('\n--- SCENARIO 1: Standard Check-In Flow (Mobile) ---');
  const videoContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
    recordVideo: { dir: VIDEOS_DIR, size: { width: 390, height: 844 } },
  });

  const page = await videoContext.newPage();

  let attendanceState = {
    date: '2026-09-21',
    check_in: null,
    check_out: null,
    allowed_action: 'CHECK_IN',
  };

  await page.route('**/api/v1/attendance/today', async (route) => {
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(attendanceState),
      });
    } catch {}
  });

  await page.route('**/api/v1/attendance/check-in', async (route) => {
    try {
      attendanceState = {
        date: '2026-09-21',
        check_in: {
          id: 'att-evt-001',
          timestamp: '2026-09-21T07:05:00Z',
          formatted_time: '07:05:00 - 21/09/2026',
          status: 'VALID',
          photo_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          client_submission_id: 'att_demo_checkin_001',
        },
        check_out: null,
        allowed_action: 'CHECK_OUT',
      };
      await page.waitForTimeout(600);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          id: 'att-evt-001',
          event_type: 'CHECK_IN',
          server_timestamp: '2026-09-21T07:05:00Z',
          formatted_time: '07:05:00 - 21/09/2026',
          message: 'Đã ghi nhận vào ca thành công lúc 07:05:00 - 21/09/2026.',
          photo_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          client_submission_id: 'att_demo_checkin_001',
        }),
      });
    } catch {}
  });

  await page.goto('http://localhost:5173');
  await loginAsEmployee(page);

  // 1. Home Hub Not-Checked-In Hero
  console.log('Capturing: 01-homehub-not-checked-in-mobile.png');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-homehub-not-checked-in-mobile.png') });

  // Open Attendance
  await openAttendanceView(page);

  // 2. Attendance Overview Screen (Not Checked In)
  console.log('Capturing: 02-attendance-overview-not-checked-in-mobile.png');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-attendance-overview-not-checked-in-mobile.png') });

  // Click "Chấm công vào ca"
  const startCheckInBtn = await page.$('button:has-text("Chấm công vào ca")');
  if (startCheckInBtn) {
    await startCheckInBtn.click();
    await page.waitForTimeout(400);
  }

  // 3. Camera Viewport
  console.log('Capturing: 03-attendance-camera-view-mobile.png');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-attendance-camera-view-mobile.png') });

  // Capture photo
  const captureBtn = await page.$('button:has-text("Chụp ảnh")');
  if (captureBtn && (await captureBtn.isVisible())) {
    await captureBtn.click();
    await page.waitForTimeout(600);
  } else {
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const dummyPath = path.resolve('temp_qa_pic_1.jpg');
      fs.writeFileSync(dummyPath, Buffer.from(SYNTHETIC_IMAGE_BASE64.split(',')[1], 'base64'));
      await fileInput.setInputFiles(dummyPath);
      await page.waitForTimeout(600);
      try { fs.unlinkSync(dummyPath); } catch {}
    }
  }

  // 4. Preview Screen
  console.log('Capturing: 04-attendance-preview-screen-mobile.png');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-attendance-preview-screen-mobile.png') });

  // Click "Xác nhận vào ca"
  const confirmBtn = await page.$('button:has-text("Xác nhận vào ca")');
  if (confirmBtn) {
    await confirmBtn.click();
  }

  // Wait for success card
  await page.waitForSelector('.attendance-success-box, .status-badge-success', { timeout: 8000 });
  await page.waitForTimeout(800);

  // 5. Success Screen
  console.log('Capturing: 05-attendance-success-check-in-mobile.png');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-attendance-success-check-in-mobile.png') });

  // Click "Xem trạng thái"
  const viewStatusBtn = await page.$('button:has-text("Xem trạng thái")');
  if (viewStatusBtn) {
    await viewStatusBtn.click();
    await page.waitForTimeout(600);
  }

  // 6. Overview In-Shift
  console.log('Capturing: 06-attendance-overview-in-shift-mobile.png');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-attendance-overview-in-shift-mobile.png') });

  await page.waitForTimeout(500);
  await page.close();
  await videoContext.close();

  // Rename video 1
  const videoFiles1 = fs.readdirSync(VIDEOS_DIR).filter((f) => f.endsWith('.webm'));
  if (videoFiles1.length > 0) {
    const latest = path.join(VIDEOS_DIR, videoFiles1[videoFiles1.length - 1]);
    const target = path.join(VIDEOS_DIR, '01-standard-check-in-flow.webm');
    if (fs.existsSync(target)) fs.unlinkSync(target);
    fs.renameSync(latest, target);
    console.log('Saved: 01-standard-check-in-flow.webm');
  }

  // =========================================================================
  // SCENARIO 2: Network Drop & Reconciliation Flow (Mobile 390x844)
  // =========================================================================
  console.log('\n--- SCENARIO 2: Network Drop & Reconciliation Flow (Mobile) ---');
  const reconContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.0,
    recordVideo: { dir: VIDEOS_DIR, size: { width: 390, height: 844 } },
  });

  const reconPage = await reconContext.newPage();

  let committedReconEvent = null;

  await reconPage.route('**/api/v1/attendance/today', async (route) => {
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: '2026-09-21',
          check_in: committedReconEvent,
          check_out: null,
          allowed_action: committedReconEvent ? 'CHECK_OUT' : 'CHECK_IN',
        }),
      });
    } catch {}
  });

  await reconPage.route('**/api/v1/attendance/check-in', async (route) => {
    try {
      const postData = route.request().postData() || '';
      const match = postData.match(/name="client_submission_id"\r?\n\r?\n([^\r\n]+)/);
      const subId = match ? match[1].trim() : 'att_recon_sub_002';

      // Backend committed the record silently before dropping response
      committedReconEvent = {
        id: 'att-reconciled-999',
        timestamp: '2026-09-21T07:15:00Z',
        formatted_time: '07:15:00 - 21/09/2026',
        status: 'VALID',
        client_submission_id: subId,
      };
      await reconPage.waitForTimeout(600);
      // Return 504 Gateway Timeout
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Gateway Timeout: connection lost' }),
      });
    } catch {}
  });

  await reconPage.goto('http://localhost:5173');
  await loginAsEmployee(reconPage);
  await openAttendanceView(reconPage);

  const reconStartBtn = await reconPage.$('button:has-text("Chấm công vào ca")');
  if (reconStartBtn) {
    await reconStartBtn.click();
    await reconPage.waitForTimeout(400);
  }

  const reconCapBtn = await reconPage.$('button:has-text("Chụp ảnh")');
  if (reconCapBtn && (await reconCapBtn.isVisible())) {
    await reconCapBtn.click();
    await reconPage.waitForTimeout(600);
  } else {
    const fileInput = await reconPage.$('input[type="file"]');
    if (fileInput) {
      const dummyPath = path.resolve('temp_qa_pic_2.jpg');
      fs.writeFileSync(dummyPath, Buffer.from(SYNTHETIC_IMAGE_BASE64.split(',')[1], 'base64'));
      await fileInput.setInputFiles(dummyPath);
      await reconPage.waitForTimeout(600);
      try { fs.unlinkSync(dummyPath); } catch {}
    }
  }

  // Submit (receives 504)
  const reconSubmitBtn = await reconPage.$('button:has-text("Xác nhận vào ca")');
  if (reconSubmitBtn) {
    await reconSubmitBtn.click();
    await reconPage.waitForTimeout(1400);
  }

  // 7. OUTCOME_UNKNOWN Screen
  console.log('Capturing: 07-attendance-outcome-unknown-network-error-mobile.png');
  await reconPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-attendance-outcome-unknown-network-error-mobile.png') });

  // Click "Đối soát trạng thái"
  const reconcileBtn = await reconPage.$('button:has-text("Đối soát trạng thái")');
  if (reconcileBtn) {
    console.log('Clicking "Đối soát trạng thái"...');
    await reconcileBtn.click();
    await reconPage.waitForTimeout(1400);
  }

  // 8. Reconciled Success Screen
  console.log('Capturing: 08-attendance-reconciled-success-mobile.png');
  await reconPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-attendance-reconciled-success-mobile.png') });

  await reconPage.waitForTimeout(500);
  await reconPage.close();
  await reconContext.close();

  // Rename video 2
  const videoFiles2 = fs.readdirSync(VIDEOS_DIR).filter((f) => f.endsWith('.webm') && f !== '01-standard-check-in-flow.webm');
  if (videoFiles2.length > 0) {
    const latest = path.join(VIDEOS_DIR, videoFiles2[videoFiles2.length - 1]);
    const target = path.join(VIDEOS_DIR, '02-network-drop-reconciliation-flow.webm');
    if (fs.existsSync(target)) fs.unlinkSync(target);
    fs.renameSync(latest, target);
    console.log('Saved: 02-network-drop-reconciliation-flow.webm');
  }

  // =========================================================================
  // SCENARIO 3: Desktop View & Error Discrimination (1280x800)
  // =========================================================================
  console.log('\n--- SCENARIO 3: Desktop View & Error Discrimination ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  const desktopPage = await desktopContext.newPage();

  await desktopPage.route('**/api/v1/attendance/today', async (route) => {
    try {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Database connection failed' }),
      });
    } catch {}
  });

  await desktopPage.goto('http://localhost:5173');
  await loginAsEmployee(desktopPage);

  console.log('Capturing: 09-homehub-attendance-error-state-desktop.png');
  await desktopPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-homehub-attendance-error-state-desktop.png') });

  await desktopPage.close();
  await desktopContext.close();

  await browser.close();
  console.log('\nAll QA screenshots and videos captured successfully in:', BASE_DOCS_DIR);
}

run().catch((err) => {
  console.error('QA capture script failed:', err);
  process.exit(1);
});
