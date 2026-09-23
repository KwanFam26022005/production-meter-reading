import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  resolveAvatarShiftStatus,
  AvatarShiftStatus,
} from '../src/components/AuthenticatedShell';
import { TodayAttendance } from '../src/types';

// ---------------------------------------------------------------------------
// 1. RESOLVE AVATAR SHIFT STATUS: PURE STATE MAPPER
// ---------------------------------------------------------------------------

test('Avatar Shift Status: Pure mapper handles all 5 shift states truthfully', () => {
  // 1. Loading state -> neutral "Đang kiểm tra..."
  const loadingStatus = resolveAvatarShiftStatus(null, true, null);
  assert.equal(loadingStatus.variant, 'neutral');
  assert.equal(loadingStatus.label, 'Đang kiểm tra...');

  // 2. Error state -> unknown "Chưa xác định" (NEVER false "Chưa vào ca")
  const errorStatus = resolveAvatarShiftStatus(null, false, 'Network error');
  assert.equal(errorStatus.variant, 'unknown');
  assert.equal(errorStatus.label, 'Chưa xác định');

  // 3. Null attendance state -> unknown "Chưa xác định"
  const nullStatus = resolveAvatarShiftStatus(null, false, null);
  assert.equal(nullStatus.variant, 'unknown');
  assert.equal(nullStatus.label, 'Chưa xác định');

  // 4. Genuine Chưa vào ca (both check_in & check_out are null)
  const uncheckedAttendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: null,
    check_out: null,
    allowed_action: 'CHECK_IN',
  };
  const uncheckedStatus = resolveAvatarShiftStatus(uncheckedAttendance, false, null);
  assert.equal(uncheckedStatus.variant, 'warning');
  assert.equal(uncheckedStatus.label, 'Chưa vào ca');

  // 5. Genuine Đang trong ca (check_in present, check_out null)
  const checkedInAttendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: { timestamp: '2026-09-21T06:00:00', formatted_time: '06:00' },
    check_out: null,
    allowed_action: 'CHECK_OUT',
  };
  const checkedInStatus = resolveAvatarShiftStatus(checkedInAttendance, false, null);
  assert.equal(checkedInStatus.variant, 'success');
  assert.equal(checkedInStatus.label, 'Đang trong ca');

  // 6. Genuine Đã hoàn tất ca (both present)
  const completedAttendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: { timestamp: '2026-09-21T06:00:00', formatted_time: '06:00' },
    check_out: { timestamp: '2026-09-21T14:00:00', formatted_time: '14:00' },
    allowed_action: null,
  };
  const completedStatus = resolveAvatarShiftStatus(completedAttendance, false, null);
  assert.equal(completedStatus.variant, 'completed');
  assert.equal(completedStatus.label, 'Đã hoàn tất ca');
});

// ---------------------------------------------------------------------------
// 2. HEADER AVATAR ACCESSIBILITY & RING DYNAMICS
// ---------------------------------------------------------------------------

test('Header Avatar: Accessible name and class bindings in AuthenticatedShell', () => {
  const shellPath = path.resolve('src/components/AuthenticatedShell.tsx');
  assert.ok(fs.existsSync(shellPath), 'AuthenticatedShell.tsx must exist');
  const code = fs.readFileSync(shellPath, 'utf-8');

  // Accessible name pattern with dynamic shift status
  assert.ok(
    code.includes('aria-label={`Mở tài khoản, trạng thái: ${statusLabel}`}'),
    'Avatar button must include accessible name with current status'
  );

  // Status badge element exists inside avatar button
  assert.ok(
    code.includes('className={`avatar-status-badge avatar-status-badge--${statusVariant}`}'),
    'Status badge element must be present inside avatar button'
  );

  // Subtle ring reflecting status
  assert.ok(
    code.includes('btn-account-avatar--${statusVariant}'),
    'Avatar button must receive subtle ring class matching status variant'
  );

  // Initial extraction fallback
  assert.ok(
    code.includes("user.full_name.trim().charAt(0).toUpperCase()"),
    'Avatar must extract first character of full_name'
  );
  assert.ok(
    code.includes(": 'U'"),
    'Avatar must fallback to "U" when full_name is missing'
  );
});

// ---------------------------------------------------------------------------
// 3. ACCOUNT POPOVER METADATA & DEDICATED SHIFT STATUS
// ---------------------------------------------------------------------------

test('Account Popover: Houses full identity metadata and dedicated shift status row', () => {
  const shellPath = path.resolve('src/components/AuthenticatedShell.tsx');
  const code = fs.readFileSync(shellPath, 'utf-8');

  // Full user metadata
  assert.ok(code.includes('account-popover-name'), 'Must render popover user name');
  assert.ok(code.includes('account-popover-code'), 'Must render popover employee code');
  assert.ok(code.includes('account-popover-role'), 'Must render popover role');

  // Dedicated shift status row
  assert.ok(
    code.includes('account-popover-status-section'),
    'Popover must contain dedicated shift status section'
  );
  assert.ok(
    code.includes('Trạng thái ca'),
    'Popover shift status section must have "Trạng thái ca" label'
  );
  assert.ok(
    code.includes('account-popover-status-text'),
    'Popover must render shift status text'
  );
  assert.ok(
    code.includes('status-dot'),
    'Popover shift status section must render colored status dot'
  );
});

// ---------------------------------------------------------------------------
// 4. ZERO-GREETING HOME HUB CONTRACT
// ---------------------------------------------------------------------------

test('Zero-Greeting Home Hub: Clean layout with no greeting and no duplicate identity', () => {
  const homeHubPath = path.resolve('src/components/HomeHub.tsx');
  assert.ok(fs.existsSync(homeHubPath), 'HomeHub.tsx must exist');
  const code = fs.readFileSync(homeHubPath, 'utf-8');

  // No separate identity block
  assert.ok(!code.includes('workspace-user-context'), 'HomeHub must NOT have workspace-user-context');
  assert.ok(!code.includes('workspace-operator-name'), 'HomeHub must NOT have workspace-operator-name');
  assert.ok(!code.includes('workspace-employee-meta'), 'HomeHub must NOT have workspace-employee-meta');
  assert.ok(!code.includes('workspace-status-badge'), 'HomeHub must NOT have workspace-status-badge');

  // No greetings
  assert.ok(!code.includes('Chào buổi sáng'), 'Must not contain "Chào buổi sáng"');
  assert.ok(!code.includes('Chào buổi chiều'), 'Must not contain "Chào buổi chiều"');
  assert.ok(!code.includes('Xin chào'), 'Must not contain "Xin chào"');

  // Top element in workspace-container is InsightFeed
  assert.ok(
    code.includes('className="workspace-container') &&
    code.includes('<InsightFeed'),
    'InsightFeed must be the direct first element of workspace-container'
  );
});

// ---------------------------------------------------------------------------
// 5. ATTENDANCE SYNCHRONIZATION VIA APP.TSX
// ---------------------------------------------------------------------------

test('Attendance Sync: App.tsx manages shared attendance and refreshes on return to home', () => {
  const appPath = path.resolve('src/App.tsx');
  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
  const code = fs.readFileSync(appPath, 'utf-8');

  // Hoisted state
  assert.ok(code.includes('todayAttendance'), 'App must hoist todayAttendance');
  assert.ok(code.includes('loadingAttendance'), 'App must hoist loadingAttendance');
  assert.ok(code.includes('attendanceError'), 'App must hoist attendanceError');
  assert.ok(code.includes('fetchTodayAttendance'), 'App must define fetchTodayAttendance');

  // Passed to AuthenticatedShell
  assert.ok(
    code.includes('attendance={todayAttendance}'),
    'App must pass attendance to AuthenticatedShell'
  );

  // Synchronized on activeScreen change to home
  assert.ok(
    code.includes("activeScreen === 'home'"),
    'App must refresh attendance when navigating back to home screen'
  );
});

// ---------------------------------------------------------------------------
// 6. CSS DESIGN TOKENS & ELEVATION CONTRACTS
// ---------------------------------------------------------------------------

test('CSS Tokens: Avatar and status badges follow Saigon Port palette', () => {
  const cssPath = path.resolve('src/index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Header avatar button: white background and corporate navy initial
  assert.ok(
    css.includes('.btn-account-avatar') &&
    css.includes('background-color: var(--sgp-corporate-white);') &&
    css.includes('color: var(--sgp-corporate-navy);'),
    'Header avatar button must use corporate white background and corporate navy text'
  );

  // Status badge colors and separating border
  assert.ok(
    css.includes('.avatar-status-badge') && css.includes('border: 2px solid var(--sgp-corporate-white);'),
    'Status badge must have crisp separating border from background'
  );
  assert.ok(
    css.includes('.avatar-status-badge--warning') && css.includes('var(--sgp-corporate-orange)'),
    'Warning status badge must use corporate orange'
  );
  assert.ok(
    css.includes('.avatar-status-badge--success') && css.includes('var(--sgp-success)'),
    'Success status badge must use success token'
  );
  assert.ok(
    css.includes('.avatar-status-badge--completed') && css.includes('var(--sgp-corporate-gray)'),
    'Completed status badge must use corporate gray token'
  );

  // Popover avatar uses corporate navy background and white text
  assert.ok(
    css.includes('.account-popover-avatar') &&
    css.includes('background-color: var(--sgp-corporate-navy);') &&
    css.includes('color: #ffffff;'),
    'Popover avatar must use corporate navy background and white text for high contrast'
  );

  // State classes retained
  assert.ok(css.includes('.btn-account-avatar--warning'), 'Must define .btn-account-avatar--warning');
  assert.ok(css.includes('.btn-account-avatar--success'), 'Must define .btn-account-avatar--success');
  assert.ok(css.includes('.btn-account-avatar--completed'), 'Must define .btn-account-avatar--completed');
  assert.ok(css.includes('.btn-account-avatar--neutral'), 'Must define .btn-account-avatar--neutral');
});
