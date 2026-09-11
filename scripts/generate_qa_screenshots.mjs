import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_DIR = 'docs/maps/qa';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function loginIfNeeded(page) {
  const employeeInput = await page.$('input[name="employee_code"], input[type="text"]');
  if (employeeInput) {
    console.log('Logging in...');
    await employeeInput.fill('52300119');
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.fill('khoa2005');
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
      }
    }
  }
}

async function run() {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  console.log('--- Step 1: 1440x900 Immersive Spatial Console Scenarios ---');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);
  await loginIfNeeded(page);
  await page.waitForTimeout(1200);

  // A. Healthy State (Default Immersive Shell)
  console.log('Capturing A: Healthy state (Immersive Shell)...');
  await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-healthy.png') });

  // C. Zone Hover
  console.log('Capturing C: Zone hover...');
  await page.evaluate(() => {
    const el = document.querySelector('.sgp-operational-zone path');
    if (el) el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-zone-hover.png') });
  await page.evaluate(() => {
    const el = document.querySelector('.sgp-operational-zone path');
    if (el) el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  });
  await page.waitForTimeout(200);

  // D. Zone Selected (Zone Drawer)
  console.log('Capturing D: Zone selected...');
  await page.evaluate(() => {
    const el = document.querySelector('.sgp-operational-zone path');
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-zone-selected.png') });
  await page.mouse.click(100, 100);
  await page.waitForTimeout(400);

  // E. Meter Selected (Quick Popup)
  console.log('Capturing E: Meter selected...');
  await page.evaluate(() => {
    const el = document.querySelector('.sgp-meter-point');
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-meter-selected.png') });
  await page.mouse.click(100, 100);
  await page.waitForTimeout(400);

  // F. Operator Selected (Shift Popover)
  console.log('Capturing F: Operator selected...');
  await page.evaluate(() => {
    const el = document.querySelector('.sgp-operator-map-marker');
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-operator-selected.png') });
  // Close Operator popover and reset view to 100%
  await page.mouse.click(100, 100);
  await page.waitForTimeout(300);
  const resetBtn = await page.$('.sgp-vctrl-btn.reset');
  if (resetBtn) await resetBtn.click();
  await page.waitForTimeout(400);

  // B. Critical State (Date 2026-08-07)
  console.log('Capturing B: Critical state (2026-08-07)...');
  await page.evaluate(() => {
    const input = document.querySelector('.vn-datepicker-native-input');
    if (input) {
      // @ts-ignore
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, '2026-08-07');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-critical.png') });

  // G. Alert Focus Mode
  console.log('Capturing G: Alert focus mode...');
  const alertBtn = await page.$('button:has-text("vấn đề"), button:has-text("ngoại lệ")');
  if (alertBtn) {
    await alertBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-alert-focus.png') });
    await alertBtn.click();
    await page.waitForTimeout(400);
  }

  // NEW: Analytics Drawer (Quality & Progress Detail)
  console.log('Capturing Analytics Drawer...');
  const analyticsBtn = await page.$('.chip-analytics, button:has-text("Phân tích")');
  if (analyticsBtn) {
    await analyticsBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-analytics-drawer.png') });
    // Close drawer
    const closeBtn = await page.$('.sgp-analytics-drawer .sgp-drawer-close-btn');
    if (closeBtn) await closeBtn.click();
    else await page.mouse.click(100, 100);
    await page.waitForTimeout(400);
  }

  // NEW: Operational List View Switch
  console.log('Capturing Operational List View...');
  const listModeBtn = await page.$('.sgp-segmented-btn:has-text("Danh sách")');
  if (listModeBtn) {
    await listModeBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-list-view.png') });
    // Switch back to map
    const mapModeBtn = await page.$('.sgp-segmented-btn:has-text("Bản đồ")');
    if (mapModeBtn) await mapModeBtn.click();
    await page.waitForTimeout(400);
  }

  // H. Debug Mode (?mapDebug=1)
  console.log('Capturing H: Debug mode (?mapDebug=1)...');
  await page.goto('http://localhost:5173/?mapDebug=1');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, 'qa-1440x900-debug-mode.png') });

  await context.close();

  // Multi-viewport captures
  console.log('--- Step 2: Multi-Viewport Scenarios ---');

  // 1366x768 Standard Laptop
  const ctx1366 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page1366 = await ctx1366.newPage();
  await page1366.goto('http://localhost:5173');
  await page1366.waitForTimeout(1000);
  await loginIfNeeded(page1366);
  await page1366.waitForTimeout(1000);
  await page1366.screenshot({ path: path.join(OUT_DIR, 'qa-1366x768.png') });
  await ctx1366.close();

  // 1024x768 Tablet
  const ctx1024 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page1024 = await ctx1024.newPage();
  await page1024.goto('http://localhost:5173');
  await page1024.waitForTimeout(1000);
  await loginIfNeeded(page1024);
  await page1024.waitForTimeout(1000);
  await page1024.screenshot({ path: path.join(OUT_DIR, 'qa-1024x768.png') });
  await ctx1024.close();

  // 390x844 Mobile
  const ctx390 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page390 = await ctx390.newPage();
  await page390.goto('http://localhost:5173');
  await page390.waitForTimeout(1000);
  await loginIfNeeded(page390);
  await page390.waitForTimeout(1000);
  await page390.screenshot({ path: path.join(OUT_DIR, 'qa-390x844.png') });
  await ctx390.close();

  await browser.close();
  console.log('ALL_QA_SCREENSHOTS_DONE');
}

run().catch(console.error);
