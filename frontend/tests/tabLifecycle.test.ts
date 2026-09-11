import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Tab Lifecycle & Overlay Integrity: CSS rules do not forcibly show inactive tabs', () => {
  const cssPath = path.resolve(__dirname, '../src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Rule 1: No rogue display: contents override that forces display: flex !important
  assert.equal(
    cssContent.includes('div[style*="display: contents"] > div'),
    false,
    'CSS must not contain wildcard div[style*="display: contents"] > div overrides'
  );

  // Rule 2: sgp-map-first-root and sgp-unified-console-root are properly targeted
  assert.ok(
    cssContent.includes('.admin-main-viewport:has(.sgp-map-first-root) > .sgp-map-first-root') ||
    cssContent.includes('.admin-main-viewport:has(.sgp-map-first-root) > div'),
    'CSS must cleanly style the direct active map root'
  );
});

test('Tab Lifecycle & Overlay Integrity: App.tsx mounts only active admin tab', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  // Rule 1: visitedAdminTabs must be completely removed
  assert.equal(
    appContent.includes('visitedAdminTabs'),
    false,
    'App.tsx must not use visitedAdminTabs caching mechanism'
  );

  // Rule 2: Must conditionally render active tab directly
  assert.ok(
    appContent.includes("adminActiveTab === 'dashboard' &&"),
    'App.tsx must conditionally mount dashboard'
  );
  assert.ok(
    appContent.includes("adminActiveTab === 'staff_roster' &&"),
    'App.tsx must conditionally mount staff_roster'
  );
  assert.ok(
    appContent.includes("adminActiveTab === 'schedules' &&"),
    'App.tsx must conditionally mount schedules'
  );
  assert.ok(
    appContent.includes("adminActiveTab === 'meters' &&"),
    'App.tsx must conditionally mount meters'
  );
  assert.ok(
    appContent.includes("adminActiveTab === 'reports' &&"),
    'App.tsx must conditionally mount reports'
  );
  assert.ok(
    appContent.includes("adminActiveTab === 'audit' &&"),
    'App.tsx must conditionally mount audit'
  );
});

test('Tab Lifecycle & Overlay Integrity: MapOperationsPage cleans up on unmount', () => {
  const mapOpsPath = path.resolve(__dirname, '../src/features/map-operations/MapOperationsPage.tsx');
  const mapOpsContent = fs.readFileSync(mapOpsPath, 'utf-8');

  // Unmount effect present
  assert.ok(
    mapOpsContent.includes('// Tab Lifecycle: On unmount, ensure all selection & transient surfaces are cleanly reset'),
    'MapOperationsPage must include explicit unmount cleanup effect'
  );
  assert.ok(
    mapOpsContent.includes('clearSelection()'),
    'Unmount cleanup must call clearSelection'
  );
});

test('Tab Lifecycle & Overlay Integrity: Absolute controls are contained inside workspace', () => {
  const cssPath = path.resolve(__dirname, '../src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // sgp-map-first-workspace must establish a relative positioning context with overflow hidden
  assert.ok(
    cssContent.includes('.sgp-map-first-workspace'),
    'CSS must define .sgp-map-first-workspace'
  );
  assert.ok(
    cssContent.includes('overflow: hidden'),
    'Workspace must clip overlays'
  );
});
