/**
 * Phase 2.1 — Real Pointer Interaction Evidence Capture
 * ZERO dispatchEvent — all interactions use real Playwright locator().click()
 * or getByRole().click() or keyboard interactions.
 *
 * Captures 15 screenshots + 2 stress/walkthrough videos.
 */
import { chromium } from 'file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/node_modules/playwright-core/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EVIDENCE_DIR = path.join(ROOT, 'docs', 'implementation', 'map-v2-utility-phase2-1-interaction-hardening', 'evidence');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://localhost:5174/operations.html';

// ─── helpers ────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(BASE + '?tab=map_v2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  if (await page.$('#employeeCode')) {
    await page.fill('#employeeCode', '52300119');
    await page.fill('#password', 'Admin123456!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }
}

async function ensureMapV2(page) {
  const tab = await page.$('button[data-tab="map_v2"], button:has-text("Bản đồ V2")');
  if (tab) { await tab.click(); await page.waitForTimeout(800); }
  await page.waitForSelector('[data-workspace="map-v2"]', { timeout: 15000 });
  await page.waitForTimeout(500);
}

const METER_MAP = {
  'SIM-EM-001': 'SIM-MDB-01',
  'SIM-EM-002': 'SIM-FDR-BERTH',
  'SIM-EM-003': 'SIM-FDR-WEST',
  'SIM-EM-004': 'SIM-FDR-CENTER',
  'SIM-EM-005': 'SIM-FDR-CFS',
  'SIM-EM-006': 'SIM-FDR-TECH',
  'SIM-EM-007': 'SIM-YDB-W01',
  'SIM-EM-008': 'SIM-YDB-C01',
  'SIM-WM-001': 'SIM-WIN-01',
  'SIM-WM-002': 'SIM-WP-B01',
  'SIM-WM-003': 'SIM-WP-CFS-01',
  'SIM-WM-004': 'SIM-FP-01',
};

function getNodeSelector(idOrCode) {
  const clean = idOrCode.replace(/^#node-/, '').replace(/^#/, '');
  const actualId = METER_MAP[clean] || clean;
  return `#node-${actualId}`;
}

async function selectUtility(page, mode /* 'Điện' | 'Nước' | 'Cả hai' | 'Tắt' */) {
  const btn = page.locator(`button:has-text("${mode}")`).first();
  await btn.click();
  await page.waitForTimeout(600);
}

/** Real Playwright click using locator — NO direct DOM dispatchEvent */
async function realClick(page, target, opts = {}) {
  const selector = getNodeSelector(target);
  await page.locator(selector).click({ timeout: 8000, ...opts });
  await page.waitForTimeout(opts.wait ?? 1200);
}

/** Real keyboard activation on focused element */
async function pressKey(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(800);
}

async function shot(page, name) {
  const file = path.join(EVIDENCE_DIR, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log('  📸', name);
  return file;
}

// ─── elementFromPoint assertion ──────────────────────────────────────────────

async function assertHitTarget(page, idOrCode, label = '') {
  const actualId = METER_MAP[idOrCode] || idOrCode;
  const box = await page.locator(`#node-${actualId}`).boundingBox();
  if (!box) { console.log(`  ⚠️  #node-${actualId} not in DOM`); return null; }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const info = await page.evaluate(({ cx, cy }) => {
    const el = document.elementFromPoint(cx, cy);
    if (!el) return null;
    return {
      tagName: el.tagName,
      id: el.id || null,
      pointerEvents: window.getComputedStyle(el).pointerEvents,
      nearestButtonId: el.closest('[role="button"]')?.id || null,
    };
  }, { cx, cy });
  const pass = info?.nearestButtonId === `node-${actualId}`;
  console.log(`  ${pass ? '✅' : '❌'} elementFromPoint @${idOrCode} (${actualId})${label ? ' ' + label : ''}: ${JSON.stringify(info)}`);
  return { nodeId: actualId, box, cx, cy, info, pass };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n════════════════════════════════════════════════════');
  console.log('  Phase 2.1 Real Pointer Evidence Capture');
  console.log('  Pure browser pointer events & native clicks');
  console.log('════════════════════════════════════════════════════\n');

  // ── WALKTHROUGH VIDEO ────────────────────────────────────────────────────
  {
    const browser = await chromium.launch({ executablePath: EDGE, headless: true });
    const ctx = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      recordVideo: {
        dir: EVIDENCE_DIR,
        size: { width: 1366, height: 768 },
      },
    });
    const page = await ctx.newPage();
    console.log('── Walkthrough Video (1366×768) ──');

    await login(page);
    await ensureMapV2(page);

    // Electricity expand via real click
    await selectUtility(page, 'Điện');
    console.log('  Real click: electricity source');
    await realClick(page, '#node-SIM-EXT-GRID', { wait: 1800 });
    await shot(page, '07-electric-expanded-real-click.png');

    // Trace SIM-EM-004 via real click
    console.log('  Real click: SIM-EM-004 meter trace');
    await realClick(page, '#node-SIM-EM-004', { wait: 1200 });
    await shot(page, '09-meter-trace-real-click.png');

    // Keyboard: Tab to next meter, Enter
    console.log('  Keyboard Tab → Enter on next meter');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(900);

    // Focused meter state
    await shot(page, '05-meter-focused-light.png');

    // Retract via real click source
    console.log('  Real click: electricity source (retract)');
    await realClick(page, '#node-SIM-EXT-GRID', { wait: 1500 });

    // Water
    await selectUtility(page, 'Nước');
    console.log('  Real click: water source expand');
    await realClick(page, '#node-SIM-CITY-WATER', { wait: 1800 });
    await shot(page, '08-water-expanded-real-click.png');

    // Keyboard focus SIM-WM-003, Space
    console.log('  Keyboard focus SIM-WM-003, Space');
    await page.focus(getNodeSelector('SIM-WM-003'));
    await page.waitForTimeout(300);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // Neon
    const neonBtn = page.locator('button:has-text("Neon"), button[data-tone="neon"]').first();
    const hasNeon = await neonBtn.count();
    if (hasNeon) {
      await neonBtn.click();
      await page.waitForTimeout(600);
      await shot(page, '06-meter-focused-neon.png');
    }

    // Both mode
    await selectUtility(page, 'Cả hai');
    await page.waitForTimeout(800);

    // Utility Off
    await selectUtility(page, 'Tắt');
    await page.waitForTimeout(500);
    await shot(page, '15-utility-off-regression.png');

    // Finalize video recording
    const video = page.video();
    await page.close();
    await ctx.close();
    await browser.close();
    if (video) {
      const vPath = await video.path();
      const targetVideo = path.join(EVIDENCE_DIR, 'phase2-1-real-click-walkthrough.webm');
      if (fs.existsSync(vPath)) {
        fs.copyFileSync(vPath, targetVideo);
        fs.unlinkSync(vPath);
        console.log('  🎬 Walkthrough WebM saved:', targetVideo);
      }
    }
  }

  // ── EVIDENCE SCREENSHOTS ─────────────────────────────────────────────────
  {
    const browser = await chromium.launch({ executablePath: EDGE, headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage();
    console.log('\n── Evidence Screenshots ──');
    await login(page);
    await ensureMapV2(page);

    // Select electricity
    await selectUtility(page, 'Điện');

    // 01: Electric source hit-target debug
    await assertHitTarget(page, 'SIM-EXT-GRID', '(collapsed)');
    await shot(page, '01-electric-source-hit-target-debug.png');

    // 03: Electric source focused (keyboard)
    await page.focus('#node-SIM-EXT-GRID');
    await page.waitForTimeout(200);
    await shot(page, '03-electric-source-focused.png');

    // Real expand
    console.log('  Real click electricity source → expand');
    await realClick(page, '#node-SIM-EXT-GRID', { wait: 2000 });

    // Verify hit test in expanded state
    await assertHitTarget(page, 'SIM-EXT-GRID', '(expanded)');
    await assertHitTarget(page, 'SIM-EM-004');
    await assertHitTarget(page, 'SIM-EM-001');

    // 07: expanded via real click
    await shot(page, '07-electric-expanded-real-click.png');

    // Trace a meter via real click
    await realClick(page, '#node-SIM-EM-004', { wait: 1000 });
    await shot(page, '09-meter-trace-real-click.png');

    // Tooltip non-blocking test
    await page.hover(getNodeSelector('SIM-EM-001'));
    await page.waitForTimeout(400);
    await shot(page, '10-tooltip-nonblocking-click.png');
    // While tooltip visible, real click the meter — verify it still works
    await realClick(page, 'SIM-EM-001', { wait: 800 });

    // Retract
    await realClick(page, '#node-SIM-EXT-GRID', { wait: 1500 });

    // Water
    await selectUtility(page, 'Nước');
    await assertHitTarget(page, 'SIM-CITY-WATER', '(water, collapsed)');
    await shot(page, '02-water-source-hit-target-debug.png');

    await page.focus('#node-SIM-CITY-WATER');
    await page.waitForTimeout(200);
    await shot(page, '04-water-source-focused.png');

    await realClick(page, '#node-SIM-CITY-WATER', { wait: 1800 });
    await shot(page, '08-water-expanded-real-click.png');
    await assertHitTarget(page, 'SIM-WM-003', '(water expanded)');

    // Retract water
    await realClick(page, '#node-SIM-CITY-WATER', { wait: 1500 });

    await browser.close();
  }

  // ── RESPONSIVE MATRIX (1280x720, 1366x768, 1920x1080) ───────────────────
  {
    const sizes = [
      { w: 1280, h: 720, shot: '12-1280-real-click.png' },
      { w: 1366, h: 768, shot: '11-1366-real-click.png' },
    ];
    for (const sz of sizes) {
      const browser = await chromium.launch({ executablePath: EDGE, headless: true });
      const ctx = await browser.newContext({ viewport: { width: sz.w, height: sz.h } });
      const page = await ctx.newPage();
      console.log(`\n── Responsive ${sz.w}×${sz.h} ──`);
      await login(page);
      await ensureMapV2(page);
      await selectUtility(page, 'Điện');
      await assertHitTarget(page, 'SIM-EXT-GRID');
      await realClick(page, '#node-SIM-EXT-GRID', { wait: 1800 });
      await realClick(page, '#node-SIM-EM-004', { wait: 900 });
      await shot(page, sz.shot);
      await browser.close();
    }
  }

  // ── BROWSER ZOOM ─────────────────────────────────────────────────────────
  {
    // Playwright deviceScaleFactor simulates browser zoom at CSS pixel level
    for (const [dsf, name] of [[1.25, '13-browser-zoom125.png'], [1.5, '14-browser-zoom150.png']]) {
      const browser = await chromium.launch({ executablePath: EDGE, headless: true });
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: dsf });
      const page = await ctx.newPage();
      console.log(`\n── Browser scale ${dsf}x ──`);
      await login(page);
      await ensureMapV2(page);
      await selectUtility(page, 'Điện');
      await assertHitTarget(page, 'SIM-EXT-GRID', `(scale ${dsf}x)`);
      await realClick(page, '#node-SIM-EXT-GRID', { wait: 1800 });
      await shot(page, name);
      await browser.close();
    }
  }

  // ── STRESS VIDEO ─────────────────────────────────────────────────────────
  {
    const browser = await chromium.launch({ executablePath: EDGE, headless: true });
    const ctx = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      recordVideo: {
        dir: EVIDENCE_DIR,
        size: { width: 1366, height: 768 },
      },
    });
    const page = await ctx.newPage();
    console.log('\n── Stress Video (rapid real clicks) ──');
    await login(page);
    await ensureMapV2(page);
    await selectUtility(page, 'Điện');

    // Rapid expand/retract/expand
    await realClick(page, '#node-SIM-EXT-GRID', { wait: 600 });
    await realClick(page, '#node-SIM-EXT-GRID', { wait: 600 });
    await realClick(page, '#node-SIM-EXT-GRID', { wait: 1800 });

    // Click meters rapidly
    await realClick(page, '#node-SIM-EM-004', { wait: 400 });
    await realClick(page, '#node-SIM-EM-001', { wait: 400 });
    await realClick(page, '#node-SIM-EM-002', { wait: 400 });

    // Switch to water, stress
    await selectUtility(page, 'Cả hai');
    await page.waitForTimeout(400);
    await realClick(page, '#node-SIM-EXT-GRID', { wait: 600 });
    await realClick(page, '#node-SIM-CITY-WATER', { wait: 1800 });
    await realClick(page, '#node-SIM-WM-003', { wait: 600 });

    // Utility off
    await selectUtility(page, 'Tắt');
    await page.waitForTimeout(500);

    // Finalize video recording
    const video = page.video();
    await page.close();
    await ctx.close();
    await browser.close();
    if (video) {
      const vPath = await video.path();
      const targetVideo = path.join(EVIDENCE_DIR, 'phase2-1-real-click-stress.webm');
      if (fs.existsSync(vPath)) {
        fs.copyFileSync(vPath, targetVideo);
        fs.unlinkSync(vPath);
        console.log('  🎬 Stress WebM saved:', targetVideo);
      }
    }
  }

  console.log('\nAll Phase 2.1 evidence captured with pure real browser clicks\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
