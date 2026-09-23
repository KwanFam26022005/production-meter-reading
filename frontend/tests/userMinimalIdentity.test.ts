import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  getShortDisplayName,
  formatEmployeeMeta,
  getTimeBasedGreeting,
} from '../src/components/HomeHub';
import {
  selectPriorityInsight,
  PrioritySelectionInput,
} from '../src/components/home/priorityInsightLogic';
import {
  TodayOperationsResponse,
  TodayAttendance,
  NextShiftInfo,
} from '../src/types';

// ---------------------------------------------------------------------------
// 1. MINIMAL OPERATIONAL IDENTITY: NAME EXTRACTION
// ---------------------------------------------------------------------------

test('Minimal Identity: getShortDisplayName extracts short name naturally without greeting salutations', () => {
  // Vietnamese multi-part names
  assert.equal(getShortDisplayName('Nguyễn Văn An'), 'An');
  assert.equal(getShortDisplayName('Trần Thị Bích Loan'), 'Loan');
  assert.equal(getShortDisplayName('Lê Hoàng Nam'), 'Nam');

  // Single token name
  assert.equal(getShortDisplayName('An'), 'An');

  // Fallback to neutral role title when missing, empty or whitespace
  assert.equal(getShortDisplayName(''), 'Nhân viên');
  assert.equal(getShortDisplayName('   '), 'Nhân viên');
  assert.equal(getShortDisplayName(null), 'Nhân viên');
  assert.equal(getShortDisplayName(undefined), 'Nhân viên');

  // Verify getTimeBasedGreeting does NOT output time greetings anymore
  assert.equal(getTimeBasedGreeting('Nguyễn Văn An'), 'An');
  assert.ok(!getTimeBasedGreeting('An').includes('Chào'));
  assert.ok(!getTimeBasedGreeting('An').includes('Xin chào'));
});

// ---------------------------------------------------------------------------
// 2. EMPLOYEE CODE & ROLE FORMATTING (NO UNWANTED BULLETS OR UNDEFINED)
// ---------------------------------------------------------------------------

test('Minimal Identity: formatEmployeeMeta formats code and role accurately without trailing bullets', () => {
  // Both code and role
  const fullMeta = formatEmployeeMeta('CSG-0102', 'EMPLOYEE');
  assert.equal(fullMeta, 'CSG-0102 • Nhân viên hiện trường');

  // Only code
  const codeOnly = formatEmployeeMeta('CSG-0102', null);
  assert.equal(codeOnly, 'CSG-0102');
  assert.ok(!codeOnly.includes('•'), 'Code-only meta must not contain bullet separator');
  assert.ok(!codeOnly.includes('undefined'), 'Must not contain undefined string');

  // Only role
  const roleOnly = formatEmployeeMeta('', 'ADMIN');
  assert.equal(roleOnly, 'Quản trị viên');
  assert.ok(!roleOnly.includes('•'), 'Role-only meta must not contain bullet separator');

  // Neither code nor role
  const emptyMeta = formatEmployeeMeta(null, null);
  assert.equal(emptyMeta, '', 'Must be empty string when both are missing');
  assert.ok(!emptyMeta.includes('•'));
  assert.ok(!emptyMeta.includes('undefined'));
});

// ---------------------------------------------------------------------------
// 3. ZERO-GREETING HOME HUB & TRUTHFUL SHIFT STATUS CONTRACT
// ---------------------------------------------------------------------------

test('Zero-Greeting Home Hub: Complete removal of identity block and salutations', () => {
  const homeHubPath = path.resolve('src/components/HomeHub.tsx');
  assert.ok(fs.existsSync(homeHubPath), 'HomeHub.tsx must exist');
  const code = fs.readFileSync(homeHubPath, 'utf-8');

  // Verify identity block is completely removed from HomeHub JSX
  assert.ok(!code.includes('className="workspace-user-context"'), 'HomeHub must NOT render workspace-user-context');
  assert.ok(!code.includes('className="workspace-operator-name"'), 'HomeHub must NOT render workspace-operator-name');
  assert.ok(!code.includes('className="workspace-subcontext"'), 'HomeHub must NOT render workspace-subcontext');

  // Verify no greeting salutations
  assert.ok(!code.includes('Chào buổi sáng'), 'HomeHub must not render "Chào buổi sáng"');
  assert.ok(!code.includes('Chào buổi chiều'), 'HomeHub must not render "Chào buổi chiều"');
  assert.ok(!code.includes('Xin chào'), 'HomeHub must not render "Xin chào"');

  // Verify AuthenticatedShell houses the attendance status mapping
  const shellPath = path.resolve('src/components/AuthenticatedShell.tsx');
  assert.ok(fs.existsSync(shellPath), 'AuthenticatedShell.tsx must exist');
  const shellCode = fs.readFileSync(shellPath, 'utf-8');

  assert.ok(shellCode.includes('resolveAvatarShiftStatus'), 'AuthenticatedShell must export resolveAvatarShiftStatus');
  assert.ok(shellCode.includes('Chưa xác định'), 'Must resolve unknown/error to "Chưa xác định"');
  assert.ok(shellCode.includes('Đang kiểm tra...'), 'Must resolve loading to "Đang kiểm tra..."');
  assert.ok(shellCode.includes('Chưa vào ca'), 'Must resolve unchecked to "Chưa vào ca"');
  assert.ok(shellCode.includes('Đang trong ca'), 'Must resolve active to "Đang trong ca"');
  assert.ok(shellCode.includes('Đã hoàn tất ca'), 'Must resolve completed to "Đã hoàn tất ca"');
});

// ---------------------------------------------------------------------------
// 4. CSS TOKENS & AVATAR STATUS BADGE CONTRACTS
// ---------------------------------------------------------------------------

test('Avatar Status Badge: CSS defines indicator dot and shift rings with Saigon Port dresscode', () => {
  const cssPath = path.resolve('src/index.css');
  assert.ok(fs.existsSync(cssPath), 'index.css must exist');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Avatar button & initial
  assert.ok(css.includes('.btn-account-avatar'), 'CSS must define .btn-account-avatar');
  assert.ok(css.includes('.avatar-initial'), 'CSS must define .avatar-initial');

  // Status indicator badge (N◉)
  assert.ok(css.includes('.avatar-status-badge'), 'CSS must define .avatar-status-badge');
  assert.ok(css.includes('.avatar-status-badge--warning'), 'CSS must define .avatar-status-badge--warning');
  assert.ok(css.includes('.avatar-status-badge--success'), 'CSS must define .avatar-status-badge--success');
  assert.ok(css.includes('.avatar-status-badge--completed'), 'CSS must define .avatar-status-badge--completed');

  // Popover status row
  assert.ok(css.includes('.account-popover-status-section'), 'CSS must define .account-popover-status-section');
  assert.ok(css.includes('.account-popover-status-label'), 'CSS must define .account-popover-status-label');
  assert.ok(css.includes('.account-popover-status-val'), 'CSS must define .account-popover-status-val');

  // Obsolete .workspace-user-context rule must NOT exist
  assert.ok(!css.includes('.workspace-user-context {'), 'CSS must NOT contain obsolete .workspace-user-context rule');
});

// ---------------------------------------------------------------------------
// 5. INVARIANCE: PRIORITY SELECTION & RADIAL MENU PRESERVATION
// ---------------------------------------------------------------------------

test('Minimal Identity: Preserves priority selection logic and radial invariants', () => {
  const noop = () => {};
  const mockOperations: TodayOperationsResponse = {
    date: '2026-09-21',
    date_formatted: '21/09/2026',
    batch: null,
    current_round: null,
    summary: {
      total_meters: 12,
      confirmed_current: 12,
      pending_current: 0,
      review_current: 0,
      percent_current: 100,
    },
    meters: [],
  };

  const mockAttendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: { timestamp: '2026-09-21T06:00:00', formatted_time: '06:00' },
    check_out: { timestamp: '2026-09-21T14:00:00', formatted_time: '14:00' },
    status: 'CHECKED_OUT',
  };

  const input: PrioritySelectionInput = {
    operations: mockOperations,
    attendance: mockAttendance,
    nextShift: null,
    onOpenMeter: noop,
    onOpenAttendance: noop,
    onOpenSchedule: noop,
  };

  const result = selectPriorityInsight(input);
  assert.equal(result.priority, null, 'Priority is still null when work is complete');
  assert.equal(result.updates.length, 3, 'All 3 items are present in compact updates');

  // Radial menu file unchanged in circumference calculation
  const radialPath = path.resolve('src/components/home/BottomRadialNav.tsx');
  const radialCode = fs.readFileSync(radialPath, 'utf-8');
  assert.ok(radialCode.includes('circumference = 188.5'));
  assert.ok(radialCode.includes('role="menu"'));
});
