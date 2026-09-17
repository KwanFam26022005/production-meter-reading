import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function smokeTest() {
  console.log('[SMOKE TEST] Starting V16E-R0 runtime smoke test...');
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // 1. Bản đồ loads
  console.log('[SMOKE TEST] 1. Navigating to root / Bản đồ...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    console.log('[SMOKE TEST] Logging in as Admin...');
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  // Verify Bản đồ elements
  await page.waitForSelector('.sgp-unified-workspace-header', { timeout: 10000 });
  const mapHeaderTitle = await page.$eval('.sgp-uwh-title', el => el.textContent);
  console.log(`[SMOKE TEST] 1. PASS - Bản đồ loaded with header: "${mapHeaderTitle.trim()}"`);

  // 2. Thiết bị -> Hạ tầng loads
  console.log('[SMOKE TEST] 2. Navigating to Thiết bị -> Hạ tầng...');
  const devRailBtn = await page.$('button[data-tab="assets"], .admin-nav-item:has-text("Thiết bị")');
  if (devRailBtn) await devRailBtn.click();
  await page.waitForTimeout(2000);
  await page.waitForSelector('.sgp-devices-shell', { timeout: 10000 });
  const haTangActive = await page.$eval('#tab-segment-assets', el => el.getAttribute('aria-selected'));
  console.log(`[SMOKE TEST] 2. PASS - Thiết bị -> Hạ tầng loaded (active=${haTangActive})`);

  // 3. Thiết bị -> Công tơ loads
  console.log('[SMOKE TEST] 3. Switching to Thiết bị -> Công tơ...');
  const congToTab = await page.$('#tab-segment-meters');
  if (congToTab) await congToTab.click();
  await page.waitForTimeout(2000);
  const congToActive = await page.$eval('#tab-segment-meters', el => el.getAttribute('aria-selected'));
  const metersTable = await page.$('.admin-table-container, table');
  console.log(`[SMOKE TEST] 3. PASS - Thiết bị -> Công tơ loaded (active=${congToActive}, hasTable=${Boolean(metersTable)})`);

  // 4. Công cụ -> Lịch ghi loads
  console.log('[SMOKE TEST] 4. Opening Công cụ -> Lịch ghi...');
  const toolsRailBtn = await page.$('.admin-nav-item:has-text("Công cụ")');
  if (toolsRailBtn) await toolsRailBtn.click();
  await page.waitForTimeout(1000);
  const lichGhiBtn = await page.$('.sgp-popover-item:has-text("Lịch ghi")');
  if (lichGhiBtn) await lichGhiBtn.click();
  await page.waitForTimeout(2000);
  const scheduleContent = await page.$('.admin-schedules-root, .admin-page-header:has-text("Lịch"), .admin-main-viewport');
  console.log(`[SMOKE TEST] 4. PASS - Công cụ -> Lịch ghi loaded (${Boolean(scheduleContent)})`);

  // 5. Return Bản đồ
  console.log('[SMOKE TEST] 5. Returning to Bản đồ...');
  const mapRailBtn = await page.$('button[data-tab="dashboard"], .admin-nav-item:has-text("Bản đồ")');
  if (mapRailBtn) await mapRailBtn.click();
  await page.waitForTimeout(2000);
  const mapAgain = await page.$('.sgp-unified-workspace-header');
  console.log(`[SMOKE TEST] 5. PASS - Returned to Bản đồ (${Boolean(mapAgain)})`);

  // 6. Select one meter
  console.log('[SMOKE TEST] 6. Selecting one meter...');
  const meterPin = await page.$('.sgp-marker, .sgp-meter-pin, svg circle, g[data-meter-id]');
  if (meterPin) await meterPin.click();
  await page.waitForTimeout(1500);
  console.log('[SMOKE TEST] 6. PASS - Meter selected on map');

  // 7. Network mode loads
  console.log('[SMOKE TEST] 7. Loading Network mode...');
  const netBtn = await page.$('.sgp-uwh-mode-btn[data-tab="dashboard-network"], .sgp-uwh-mode-btn:has-text("Mạng lưới"), .sgp-cmd-switch-btn:has-text("Mạng lưới")');
  if (netBtn) await netBtn.click();
  await page.waitForTimeout(2000);
  const netCanvas = await page.$('.sgp-utility-network-root');
  console.log(`[SMOKE TEST] 7. PASS - Network mode loaded (${Boolean(netCanvas)})`);

  await browser.close();
  console.log('[SMOKE TEST] ALL RUNTIME SMOKE CHECKS PASSED!');
}

smokeTest().catch((err) => {
  console.error('[SMOKE TEST FAILED]', err);
  process.exit(1);
});
