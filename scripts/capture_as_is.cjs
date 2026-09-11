const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Users\\User\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT_DIR = path.resolve('docs/design/map-operations/v7/screenshots');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Launch Chrome
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-gpu',
      '--user-data-dir=' + path.resolve('temp_chrome_profile'),
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let verData = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const verRes = await fetch('http://127.0.0.1:9222/json/version');
      if (verRes.ok) {
        verData = await verRes.json();
        break;
      }
    } catch (e) {}
  }

  if (!verData) {
    throw new Error('Could not connect to Chrome debugging port 9222');
  }

  try {
    const browserWs = new WebSocket(verData.webSocketDebuggerUrl);
    await new Promise((res) => (browserWs.onopen = res));

    const browserCdp = new CDPClient(browserWs);
    const { targetId } = await browserCdp.send('Target.createTarget', {
      url: 'http://127.0.0.1:5173',
    });

    const pageWsRes = await fetch('http://127.0.0.1:9222/json');
    const targets = await pageWsRes.json();
    const target = targets.find((t) => t.id === targetId);

    const pageWs = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res) => (pageWs.onopen = res));
    const pageCdp = new CDPClient(pageWs);

    await pageCdp.send('Page.enable');
    await pageCdp.send('Runtime.enable');
    await pageCdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Navigating to app...');
    await sleep(2000);

    async function evalCode(expr) {
      const res = await pageCdp.send('Runtime.evaluate', {
        expression: expr,
        awaitPromise: true,
        returnByValue: true,
      });
      return res.result?.value;
    }

    async function takeScreenshot(filename) {
      await sleep(1000);
      const { data } = await pageCdp.send('Page.captureScreenshot', { format: 'png' });
      const dest = path.join(OUT_DIR, filename);
      fs.writeFileSync(dest, Buffer.from(data, 'base64'));
      console.log(`Saved screenshot: ${filename}`);
    }

    // Check if login is needed
    const isLogin = await evalCode(`Boolean(document.querySelector('input[type="password"]'))`);
    if (isLogin) {
      console.log('Logging in as admin with native setters...');
      await evalCode(`
        function setReactInput(input, val) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, val);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const inputs = Array.from(document.querySelectorAll('input'));
        const codeInput = inputs.find(i => i.type !== 'password');
        const passInput = inputs.find(i => i.type === 'password');
        if (codeInput && passInput) {
          setReactInput(codeInput, '52300119');
          setReactInput(passInput, 'Admin123456!');
          const btn = document.querySelector('button[type="submit"]') || document.querySelector('.auth-submit-btn');
          if (btn) btn.click();
        }
      `);
      await sleep(3500);
    }

    // 01: Default map
    console.log('Capturing 01_as_is_map_default.png...');
    await evalCode(`
      const mapBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Bản đồ'));
      if (mapBtn) mapBtn.click();
    `);
    await sleep(1500);
    await takeScreenshot('01_as_is_map_default.png');

    // 02: Selected meter
    console.log('Capturing 02_as_is_map_selected_meter.png...');
    await evalCode(`
      const meterMarker = document.querySelector('.sgp-meter-marker') || document.querySelector('g[cursor="pointer"]');
      if (meterMarker) {
        meterMarker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    `);
    await sleep(1200);
    await takeScreenshot('02_as_is_map_selected_meter.png');

    // 03: List view
    console.log('Capturing 03_as_is_list.png...');
    await evalCode(`
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Danh sách'));
      if (listBtn) listBtn.click();
    `);
    await sleep(1500);
    await takeScreenshot('03_as_is_list.png');

    // Switch back to Map or other tabs from sidebar
    // 04: Reading schedule
    console.log('Capturing 04_as_is_reading_schedule.png...');
    await evalCode(`
      const schedNav = Array.from(document.querySelectorAll('nav a, nav button, .admin-nav-item, .admin-rail-item')).find(el => el.textContent.includes('Lịch ghi'));
      if (schedNav) schedNav.click();
    `);
    await sleep(1500);
    await takeScreenshot('04_as_is_reading_schedule.png');

    // 05: Shift schedule (Phân ca)
    console.log('Capturing 05_as_is_shift_schedule.png...');
    await evalCode(`
      const shiftNav = Array.from(document.querySelectorAll('nav a, nav button, .admin-nav-item, .admin-rail-item')).find(el => el.textContent.includes('Phân ca'));
      if (shiftNav) shiftNav.click();
    `);
    await sleep(1500);
    await takeScreenshot('05_as_is_shift_schedule.png');

    // 06: Reports (Báo cáo)
    console.log('Capturing 06_as_is_reports.png...');
    await evalCode(`
      const repNav = Array.from(document.querySelectorAll('nav a, nav button, .admin-nav-item, .admin-rail-item')).find(el => el.textContent.includes('Báo cáo'));
      if (repNav) repNav.click();
    `);
    await sleep(1500);
    await takeScreenshot('06_as_is_reports.png');

    // Switch back to Dashboard / Map for runtime state
    await evalCode(`
      const dashNav = Array.from(document.querySelectorAll('nav a, nav button, .admin-nav-item, .admin-rail-item')).find(el => el.textContent.includes('Tổng quan'));
      if (dashNav) dashNav.click();
    `);
    await sleep(1000);

    browserWs.close();
    pageWs.close();
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    chromeProcess.kill();
    try {
      fs.rmSync(path.resolve('temp_chrome_profile'), { recursive: true, force: true });
    } catch {}
  }
}

run();
