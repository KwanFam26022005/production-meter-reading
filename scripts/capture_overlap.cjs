const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const CHROME_PATH = 'C:\\Users\\User\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

async function run() {
  const p = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-gpu',
      '--user-data-dir=' + path.resolve('temp_p2'),
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let verData = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const verRes = await fetch('http://127.0.0.1:9222/json/version');
      if (verRes.ok) {
        verData = await verRes.json();
        break;
      }
    } catch (e) {}
  }

  if (!verData) throw new Error('Chrome failed to start');

  const ws = new WebSocket(verData.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 1;
  const send = (m, params = {}) =>
    new Promise((res, rej) => {
      const curId = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          res(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method: m, params }));
    });

  const { targetId } = await send('Target.createTarget', { url: 'http://127.0.0.1:5173' });
  const tgts = await (await fetch('http://127.0.0.1:9222/json')).json();
  const pageTarget = tgts.find((t) => t.id === targetId);

  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((r) => (pageWs.onopen = r));
  let pid = 1;
  const psend = (m, params = {}) =>
    new Promise((res, rej) => {
      const curId = pid++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === curId) {
          pageWs.removeEventListener('message', handler);
          res(msg.result);
        }
      };
      pageWs.addEventListener('message', handler);
      pageWs.send(JSON.stringify({ id: curId, method: m, params }));
    });

  await psend('Page.enable');
  await psend('Runtime.enable');
  await new Promise((r) => setTimeout(r, 1500));

  // Log in
  await psend('Runtime.evaluate', {
    expression: `
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
    `,
  });
  await new Promise((r) => setTimeout(r, 2500));

  // Capture close-up of gate / operator overlap defect
  const { data } = await psend('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 1100, y: 700, width: 450, height: 320, scale: 1 },
  });
  fs.writeFileSync('docs/design/map-operations/v7/screenshots/07_as_is_overlap_defect.png', Buffer.from(data, 'base64'));
  console.log('Saved 07_as_is_overlap_defect.png');

  ws.close();
  pageWs.close();
  p.kill();
  try {
    fs.rmSync('temp_p2', { recursive: true, force: true });
  } catch {}
}

run();
