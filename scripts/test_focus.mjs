import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto('http://localhost:5174/operations.html?tab=map_v2');
  await page.waitForTimeout(1500);

  const isLogin = await page.$('#employeeCode');
  if (isLogin) {
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }
  await page.waitForSelector('[data-workspace="map-v2"]');

  await page.evaluate(() => {
    const el = document.getElementById('v2-anchor-ZONE_ADMIN');
    el?.focus();
  });
  await page.waitForTimeout(300);

  const focusInfo = await page.evaluate(() => {
    const el = document.activeElement;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      activeTag: el.tagName,
      activeId: el.id,
      outline: style.outline,
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      rect,
    };
  });
  console.log('Focus Info:', JSON.stringify(focusInfo, null, 2));
  await page.screenshot({ path: 'docs/implementation/admin-map-v2-camera-and-animation-fix/evidence/baseline/focus_test.png' });
  await browser.close();
}

run().catch(console.error);
