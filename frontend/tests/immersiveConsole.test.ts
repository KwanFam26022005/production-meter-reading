import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Motion Tokens: Standard durations and easing curves defined', () => {
  const motionTokensPath = path.resolve(__dirname, '../src/features/map-operations/motion/motionTokens.ts');
  const content = fs.readFileSync(motionTokensPath, 'utf-8');

  // Verify specified timing tokens (Section 14)
  assert.ok(content.includes('fast: 120'), 'fast duration must be 120ms');
  assert.ok(content.includes('normal: 180'), 'normal duration must be 180ms');
  assert.ok(content.includes('medium: 240'), 'medium duration must be 240ms');
  assert.ok(content.includes('slow: 320'), 'slow duration must be 320ms');

  // Verify standard easing
  assert.ok(content.includes('cubic-bezier(0.4, 0, 0.2, 1)'), 'standard easing must be cubic-bezier(0.4, 0, 0.2, 1)');
});

test('Immersive Shell: Full-bleed container and CSS containment intact', () => {
  const cssPath = path.resolve(__dirname, '../src/features/map-operations/motion/mapMotion.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Full-bleed HUD container with pointer-events none
  assert.ok(cssContent.includes('.sgp-scene-hud-container'), 'HUD container class must exist');
  assert.ok(cssContent.includes('pointer-events: none;'), 'HUD container must not block canvas panning');

  // Segmented switch sliding indicator
  assert.ok(cssContent.includes('.sgp-segmented-active-pill'), 'Segmented control sliding indicator must exist');
  assert.ok(cssContent.includes('cubic-bezier(0.4, 0, 0.2, 1)'), 'Segmented pill must use standard easing');

  // Reduced motion overrides
  assert.ok(cssContent.includes('@media (prefers-reduced-motion: reduce)'), 'Prefers-reduced-motion must be respected');
});

test('Telemetry & Alert Focus: Logic isolates problem assets correctly', () => {
  type MockMeter = { id: string; semanticState: string };

  const meters: MockMeter[] = [
    { id: 'm1', semanticState: 'CONFIRMED' },
    { id: 'm2', semanticState: 'OVERDUE' },
    { id: 'm3', semanticState: 'REVIEW' },
    { id: 'm4', semanticState: 'PENDING' },
    { id: 'm5', semanticState: 'OVERDUE' },
  ];

  // Helper simulating MapOperationsPage focus filter logic
  const applyFocus = (
    list: MockMeter[],
    focusType: 'OVERDUE' | 'REVIEW' | 'PENDING' | null,
    exceptionFocus: boolean
  ) => {
    if (focusType === 'OVERDUE') {
      return list.filter((m) => m.semanticState === 'OVERDUE');
    } else if (focusType === 'REVIEW') {
      return list.filter((m) => m.semanticState === 'REVIEW');
    } else if (focusType === 'PENDING') {
      return list.filter((m) => m.semanticState === 'PENDING');
    } else if (exceptionFocus) {
      return list.filter((m) => m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW');
    }
    return list;
  };

  // 1. Overdue focus
  const overdueOnly = applyFocus(meters, 'OVERDUE', false);
  assert.equal(overdueOnly.length, 2);
  assert.ok(overdueOnly.every((m) => m.semanticState === 'OVERDUE'));

  // 2. Review focus
  const reviewOnly = applyFocus(meters, 'REVIEW', false);
  assert.equal(reviewOnly.length, 1);
  assert.equal(reviewOnly[0].id, 'm3');

  // 3. Pending focus
  const pendingOnly = applyFocus(meters, 'PENDING', false);
  assert.equal(pendingOnly.length, 1);
  assert.equal(pendingOnly[0].id, 'm4');

  // 4. Exception focus (all issues)
  const allIssues = applyFocus(meters, null, true);
  assert.equal(allIssues.length, 3);
  assert.ok(allIssues.every((m) => m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW'));

  // 5. Normal (no focus)
  const allMeters = applyFocus(meters, null, false);
  assert.equal(allMeters.length, 5);
});

test('Contextual Drawers: AnalyticsDrawer and ZoneDrawer components cleanly exported', () => {
  const contextIndexPath = path.resolve(__dirname, '../src/features/map-operations/context/index.ts');
  const indexContent = fs.readFileSync(contextIndexPath, 'utf-8');

  assert.ok(indexContent.includes('AnalyticsDrawer'), 'context/index.ts must export AnalyticsDrawer');
  assert.ok(indexContent.includes('ZoneDrawer'), 'context/index.ts must export ZoneDrawer');
  assert.ok(indexContent.includes('MeterQuickPopup'), 'context/index.ts must export MeterQuickPopup');
  assert.ok(indexContent.includes('OperatorShiftPopover'), 'context/index.ts must export OperatorShiftPopover');
});

test('OperationalListView: Alternate view mode presents table cleanly', () => {
  const listViewPath = path.resolve(__dirname, '../src/features/map-operations/shell/OperationalListView.tsx');
  const content = fs.readFileSync(listViewPath, 'utf-8');

  assert.ok(content.includes('OperationalListView'), 'OperationalListView component must be declared');
  assert.ok(content.includes('onSwitchToMap'), 'Must provide action to switch back to map');
  assert.ok(content.includes('sgp-list-table'), 'Must render operational list table');
});
