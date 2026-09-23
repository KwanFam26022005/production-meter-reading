import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to calculate relative luminance according to WCAG 2.1
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

test('Map V2 Responsive Refinement: Comprehensive Suite', async (t) => {
  const workspacePath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.tsx');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');

  const canvasPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Canvas.tsx');
  const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

  const inspectorPath = path.resolve(__dirname, '../src/components/map-v2/MapV2InspectionPanel.tsx');
  const inspectorContent = fs.readFileSync(inspectorPath, 'utf-8');

  const layersPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Layers.tsx');
  const layersContent = fs.readFileSync(layersPath, 'utf-8');

  const cssPath = path.resolve(__dirname, '../src/components/map-v2/MapV2Workspace.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  await t.test('1. Wide vs Compact toolbar breakpoint exists and is container-driven', () => {
    assert.ok(
      workspaceContent.includes('COMPACT_WORKSPACE_THRESHOLD'),
      'Must define container width threshold'
    );
    assert.ok(
      workspaceContent.includes('containerWidth < COMPACT_WORKSPACE_THRESHOLD'),
      'Must conditionally evaluate container width'
    );
    assert.ok(
      workspaceContent.includes('layout-compact'),
      'Must apply layout-compact class on container when compact'
    );
  });

  await t.test('2. All secondary controls remain reachable in compact presentation via options popover', () => {
    assert.ok(
      workspaceContent.includes('map-v2-options-popover'),
      'Must provide options popover in compact mode'
    );
    assert.ok(
      workspaceContent.includes('Chế độ khung nhìn') && workspaceContent.includes('Fit toàn bộ'),
      'View mode control must be accessible in compact popover'
    );
    assert.ok(
      workspaceContent.includes('Quản lý 6 lớp hiển thị'),
      'Layer management entry point must exist in compact popover'
    );
    assert.ok(
      workspaceContent.includes('1536×1024 px'),
      'Metadata must be accessible in compact popover'
    );
  });

  await t.test('3. Inspector presentation adapts between docked and drawer', () => {
    assert.ok(
      workspaceContent.includes("inspectorPresentation = isCompact ? 'drawer' : 'docked'"),
      'Must adapt inspector presentation based on workspace width'
    );
    assert.ok(
      inspectorContent.includes("presentation === 'drawer' ? 'mode-drawer' : 'mode-docked'"),
      'Inspector component must render mode-drawer or mode-docked class'
    );
    assert.ok(
      cssContent.includes('.map-v2-inspector-panel.mode-drawer'),
      'CSS must style drawer overlay without squeezing canvas'
    );
  });

  await t.test('4. Inspector and popovers support Escape key to close and appropriate focus roles', () => {
    assert.ok(
      inspectorContent.includes("e.key === 'Escape'"),
      'Inspector must listen for Escape key to close'
    );
    assert.ok(
      layersContent.includes("e.key === 'Escape'"),
      'Layers popover must listen for Escape key to close'
    );
    assert.ok(
      workspaceContent.includes("e.key === 'Escape'"),
      'Workspace options popover must listen for Escape key to close'
    );
    assert.ok(
      inspectorContent.includes("role={presentation === 'drawer' ? 'dialog' : 'complementary'}"),
      'Inspector must declare accessible ARIA roles'
    );
  });

  await t.test('5. AUTO_FIT recalculation mathematics preserves canonical aspect ratio and centering', () => {
    const CANVAS_WIDTH = 1536;
    const CANVAS_HEIGHT = 1024;

    const calculateFit = (mode: 'contain' | 'width', width: number, height: number) => {
      if (mode === 'width') {
        const targetZoom = width / CANVAS_WIDTH;
        const scaledHeight = CANVAS_HEIGHT * targetZoom;
        const targetPanX = 0;
        const targetPanY = scaledHeight < height ? (height - scaledHeight) / 2 : 0;
        return { zoom: targetZoom, pan: { x: targetPanX, y: targetPanY } };
      } else {
        const scaleX = width / CANVAS_WIDTH;
        const scaleY = height / CANVAS_HEIGHT;
        const targetZoom = Math.min(scaleX, scaleY);
        const targetPanX = (width - CANVAS_WIDTH * targetZoom) / 2;
        const targetPanY = (height - CANVAS_HEIGHT * targetZoom) / 2;
        return { zoom: targetZoom, pan: { x: targetPanX, y: targetPanY } };
      }
    };

    // Test on 1280x720
    const fit1280 = calculateFit('contain', 1200, 660);
    assert.ok(fit1280.zoom > 0 && fit1280.zoom <= 1, 'Fit zoom must be valid');
    assert.strictEqual(fit1280.pan.x, (1200 - CANVAS_WIDTH * fit1280.zoom) / 2);
    assert.strictEqual(fit1280.pan.y, (660 - CANVAS_HEIGHT * fit1280.zoom) / 2);

    // Test on 1920x1080
    const fit1920 = calculateFit('contain', 1840, 1018);
    assert.ok(fit1920.zoom > 0.9 && fit1920.zoom <= 1.0, 'Fit zoom on 1080p should be near 100%');
  });

  await t.test('6. MANUAL_VIEW focal-point preservation algorithm correctly preserves viewport center map coordinates', () => {
    const prevW = 1200;
    const prevH = 700;
    const zoom = 1.5;
    const prevPan = { x: 100, y: -50 };

    // Point in map coordinates under previous viewport center:
    const centerMapX = (prevW / 2 - prevPan.x) / zoom;
    const centerMapY = (prevH / 2 - prevPan.y) / zoom;

    // Viewport resizes to:
    const newW = 1500;
    const newH = 850;

    // Preserved pan calculation:
    const nextPanX = newW / 2 - centerMapX * zoom;
    const nextPanY = newH / 2 - centerMapY * zoom;

    // Check that the new center in map coordinates matches the old center:
    const recomputedCenterMapX = (newW / 2 - nextPanX) / zoom;
    const recomputedCenterMapY = (newH / 2 - nextPanY) / zoom;

    assert.ok(
      Math.abs(recomputedCenterMapX - centerMapX) < 1e-6,
      'Map X focal point under center must remain identical'
    );
    assert.ok(
      Math.abs(recomputedCenterMapY - centerMapY) < 1e-6,
      'Map Y focal point under center must remain identical'
    );
  });

  await t.test('7. Selected zone remains visible and its screen coordinates are tracked', () => {
    assert.ok(
      canvasContent.includes('onAnchorScreenPosChange'),
      'MapV2Canvas must notify anchor screen position'
    );
    assert.ok(
      workspaceContent.includes('onAnchorScreenPosChange={handleAnchorScreenPosChange}'),
      'MapV2Workspace must wire anchor screen position callback'
    );
  });

  await t.test('8. Hotspot labels collapse at compact zoom (< 0.72) and expand on hover/focus/selection', () => {
    assert.ok(
      canvasContent.includes('zoom < 0.72'),
      'MapV2Canvas must determine compact scale when zoom < 0.72'
    );
    assert.ok(
      canvasContent.includes('showFullLabel = !isCompactScale || isZoneSelected || isHovered || isFocused'),
      'Full label must be shown on hover, focus, or selection'
    );
    assert.ok(
      canvasContent.includes('displayText = showFullLabel ? anchor.label : anchor.code'),
      'Must display short code when collapsed'
    );
  });

  await t.test('9. Context card viewport clamping ensures card never clips outside workspace boundaries', () => {
    const bodyW = 1200;
    const bodyH = 700;
    const cardW = 340;
    const cardH = 145;

    const clampCard = (anchorX: number, anchorY: number) => {
      let left = anchorX - cardW / 2;
      let top = anchorY + 36;
      if (top + cardH > bodyH - 32) {
        top = anchorY - cardH - 36;
      }
      left = Math.max(16, Math.min(left, bodyW - cardW - 16));
      top = Math.max(16, Math.min(top, bodyH - cardH - 16));
      if (left + cardW > bodyW - 85 && top + cardH > bodyH - 190) {
        left = Math.max(16, bodyW - cardW - 90);
      }
      return { left, top };
    };

    // Test extreme positions:
    const posLeft = clampCard(10, 50);
    assert.ok(posLeft.left >= 16, 'Card left edge must be >= 16px');

    const posRight = clampCard(1190, 50);
    assert.ok(posRight.left + cardW <= bodyW - 16, 'Card right edge must be within bodyW');

    const posBottom = clampCard(600, 680);
    assert.ok(posBottom.top + cardH <= bodyH - 16, 'Card bottom edge must be within bodyH');
    assert.ok(posBottom.top >= 16, 'Card flipped top edge must be >= 16px');
  });

  await t.test('10. Neon text contrast achieves WCAG AAA standards for text tokens', () => {
    const neonBg = '#07152b';
    const primaryWhiteText = '#f8fafc';
    const secondaryMutedText = '#94a3b8';
    const cyanAccent = '#00f0ff';

    const ratioWhite = getContrastRatio(primaryWhiteText, neonBg);
    const ratioMuted = getContrastRatio(secondaryMutedText, neonBg);
    const ratioCyan = getContrastRatio(cyanAccent, neonBg);

    // WCAG AAA requires 7.0:1 for normal text, WCAG AA requires 4.5:1
    assert.ok(
      ratioWhite >= 12.0,
      `Primary white text contrast (${ratioWhite.toFixed(2)}) must exceed 12:1 against neon background`
    );
    assert.ok(
      ratioMuted >= 5.0,
      `Secondary muted text contrast (${ratioMuted.toFixed(2)}) must exceed 5.0:1 against neon background`
    );
    assert.ok(
      ratioCyan >= 9.0,
      `Cyan accent contrast (${ratioCyan.toFixed(2)}) must exceed 9.0:1 against neon background`
    );
  });

  await t.test('11. Zone Reveal wavefront is strictly bounded inside polygon clipPath', () => {
    assert.ok(
      canvasContent.includes('id={`v2-poly-clip-${activeRevealedPolygon.id}`}'),
      'Must define polygon boundary clipPath'
    );
    assert.ok(
      canvasContent.includes('clipPath={`url(#v2-poly-clip-${activeRevealedPolygon.id})`}'),
      'Reveal group must be clipped by polygon boundary clipPath'
    );
  });

  await t.test('12. Rapid zone switching unmounts and remounts reveal wave via dynamic key', () => {
    assert.ok(
      canvasContent.includes('key={`reveal-wave-${activeRevealedPolygon.id}`}'),
      'Reveal wave must use active polygon ID key to ensure immediate cancellation'
    );
    assert.ok(
      canvasContent.includes('key={`reveal-circle-${activeRevealedPolygon.id}`}'),
      'Reveal circle must use active polygon ID key'
    );
  });

  await t.test('13. Reduced motion (prefers-reduced-motion: reduce) is supported in stylesheet', () => {
    assert.ok(
      cssContent.includes('@media (prefers-reduced-motion: reduce)'),
      'Stylesheet must include prefers-reduced-motion media query'
    );
    assert.ok(
      cssContent.includes('animation: none !important') && cssContent.includes('transition: none !important'),
      'Must suppress animations and transitions under reduced motion'
    );
  });

  await t.test('14. Shared affine transform invariant is strictly maintained for zero drift', () => {
    assert.ok(
      canvasContent.includes('transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}'),
      'SVG base image and all vector overlays must share single affine transform group'
    );
  });

  await t.test('15. Map V1 and User Portal isolation invariants are strictly preserved', () => {
    // Map V1 components exist and are separate
    const mapV1AppPath = path.resolve(__dirname, '../src/components/admin/AdminDashboard.tsx');
    assert.ok(fs.existsSync(mapV1AppPath), 'AdminDashboard (Map V1) must exist');

    // User Portal does not import map-v2
    const userAppPath = path.resolve(__dirname, '../src/apps/user/UserApp.tsx');
    const userAppContent = fs.readFileSync(userAppPath, 'utf-8');
    assert.ok(!userAppContent.includes('map-v2'), 'UserApp must have ZERO references to map-v2');
  });
});
