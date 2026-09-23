import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const out = path.join(root, 'docs/implementation/operational-shift-zone-assignment-phase-9b/screenshots');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
const date = '2026-09-23';
const month = '2026-09';
const users = [
  { id: 'admin', employee_code: 'ADM-9B', full_name: 'Quản trị vận hành', role: 'ADMIN' },
  { id: 'a', employee_code: 'NV-101', full_name: 'Nguyễn Văn An', role: 'EMPLOYEE' },
  { id: 'b', employee_code: 'NV-102', full_name: 'Trần Minh Bình', role: 'EMPLOYEE' },
  { id: 'c', employee_code: 'NV-103', full_name: 'Lê Thị Chi', role: 'EMPLOYEE' },
];
const zone1 = { id: 'zone-container', code: 'CONTAINER', name: 'Bãi container', is_active: true, default_user_id: 'a' };
const zone2 = { id: 'zone-general', code: 'GENERAL', name: 'Bãi tổng hợp', is_active: true, default_user_id: null };
const assignment = (id, user, zone, role, shift = 'CA1', status = 'ASSIGNED') => ({
  id, user_id: user.id, employee_code: user.employee_code, employee_name: user.full_name,
  zone_id: zone.id, zone_code: zone.code, zone_name: zone.name, work_date: date,
  shift_code: shift, assignment_role: role, status, source: 'MANUAL', timing_state: status === 'CANCELLED' ? 'CANCELLED' : 'PAST',
  notes: null, actionable: status === 'ASSIGNED', created_at: '2026-09-23T00:00:00Z', cancelled_at: status === 'CANCELLED' ? '2026-09-23T02:00:00Z' : null,
  cancel_reason: status === 'CANCELLED' ? 'SHIFT_CHANGED' : null,
});
const first = assignment('oa-1', users[1], zone1, 'PRIMARY');
const support = assignment('oa-2', users[2], zone1, 'SUPPORT');
const another = assignment('oa-3', users[1], zone2, 'SUPPORT');
let adminMode = 'empty';
let userMode = 'zones';

const dayHeaders = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const value = `${month}-${String(day).padStart(2, '0')}`;
  const weekday = new Date(`${value}T00:00:00Z`).getUTCDay();
  return { date: value, day, weekday_label: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][weekday], is_weekend: weekday === 0 || weekday === 6, is_today: value === date };
});
const rosterRows = users.map((user, index) => ({
  user_id: user.id, employee_code: user.employee_code, full_name: user.full_name, role: user.role,
  shifts: Object.fromEntries(dayHeaders.map(day => [day.date, day.date === date ? (index === 3 ? 'UNASSIGNED' : 'CA1') : 'UNASSIGNED'])),
  total_shifts: index === 3 ? 0 : 1,
}));
const roster = { month, year: 2026, month_number: 9, today: date, days_header: dayHeaders, users: rosterRows,
  daily_staff_count: Object.fromEntries(dayHeaders.map(day => [day.date, { counts: { CA1: day.date === date ? 3 : 0, CA2: 0, CA3: 0, HC: 0, OFF: 0, LEAVE: 0, UNASSIGNED: day.date === date ? 1 : 4 }, total_working: day.date === date ? 3 : 0 }])),
  shift_definitions: {} };

function board() {
  const assigned = ['assigned', 'conflict', 'cancelled'].includes(adminMode) ? [first, support] : [];
  const staff = users.map((user, index) => ({ id: user.id, employee_code: user.employee_code, full_name: user.full_name,
    state: adminMode === 'pending' && index === 2 ? 'PENDING_LEAVE' : adminMode === 'approved' && index === 2 ? 'APPROVED_LEAVE' : index === 3 ? 'UNASSIGNED_SHIFT' : 'AVAILABLE',
    assignable: index !== 3 && !(adminMode === 'approved' && index === 2),
    warning: adminMode === 'pending' && index === 2 ? 'Nhân viên có yêu cầu nghỉ đang chờ duyệt.' : null,
    shift_code: index === 3 ? null : 'CA1' }));
  return { work_date: date, shift_code: 'CA1', shift_start: '2026-09-23T06:00:00+07:00', shift_end: '2026-09-23T14:00:00+07:00',
    staff, zones: [{ ...zone1, assignments: assigned }, { ...zone2, assignments: [] }], cancelled: adminMode === 'cancelled' ? [assignment('old', users[3], zone2, 'PRIMARY', 'CA1', 'CANCELLED')] : [] };
}

function monthlySchedule() {
  const shift = userMode === 'unassigned' ? 'UNASSIGNED' : userMode === 'off' ? 'OFF' : userMode === 'leave' ? 'LEAVE' : userMode === 'ca3' ? 'CA3' : 'CA1';
  const time = shift === 'CA3' ? ['22:00', '06:00'] : shift === 'CA1' ? ['06:00', '14:00'] : [null, null];
  const days = dayHeaders.map(day => ({ date: day.date, day: day.day, day_of_week: new Date(`${day.date}T00:00:00Z`).getUTCDay() === 0 ? 6 : new Date(`${day.date}T00:00:00Z`).getUTCDay() - 1,
    weekday_label: day.weekday_label, shift_code: day.date === date ? shift : 'UNASSIGNED', shift_name: day.date === date ? ({ CA1: 'Ca 1 (Sáng)', CA3: 'Ca 3 (Đêm)', OFF: 'Nghỉ tuần', LEAVE: 'Nghỉ phép', UNASSIGNED: 'Chưa phân ca' }[shift]) : 'Chưa phân ca',
    start_time: day.date === date ? time[0] : null, end_time: day.date === date ? time[1] : null, color: '#003875', bg_color: '#EEF2F8', is_work: day.date === date && ['CA1', 'CA3'].includes(shift),
    status: day.date === date ? (shift === 'UNASSIGNED' ? 'UNASSIGNED' : 'SCHEDULED') : 'UNASSIGNED', is_today: day.date === date, is_past: day.date < date, has_pending_leave: false, notes: null }));
  return { month, year: 2026, month_number: 9, today: date, days, summary: { total_shifts: ['CA1', 'CA3'].includes(shift) ? 1 : 0, completed_shifts: 0, upcoming_shifts: 1, annual_leave_remaining: 12 }, next_shift: null, available_shifts: [] };
}

async function intercept(route, isAdmin) {
  const url = new URL(route.request().url());
  const pathname = url.pathname;
  const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (pathname === '/api/v1/auth/me') return json(isAdmin ? users[0] : users[1]);
  if (pathname === '/api/v1/auth/csrf') return json({ csrf_token: 'fixture-csrf' });
  if (pathname === '/api/v1/admin/roster') return json(roster);
  if (pathname === '/api/v1/admin/leave-requests' || pathname === '/api/v1/schedule/leave-requests/my') return json([]);
  if (pathname === '/api/v1/admin/operational-assignments') return json(board());
  if (pathname === '/api/v1/admin/operational-assignments/preview') {
    const payload = route.request().postDataJSON();
    const conflict = adminMode === 'conflict';
    return json({ work_date: payload.work_date, shift_code: payload.shift_code, conflict_count: conflict ? 1 : 0, warning_count: adminMode === 'pending' ? 1 : 0,
      items: payload.items.map(item => ({ ...item, errors: conflict ? ['Khu vực đã có người phụ trách chính trong ca.'] : [],
        warnings: adminMode === 'pending' ? ['Nhân viên có yêu cầu nghỉ đang chờ duyệt.'] : [], outcome: conflict ? 'CONFLICT' : 'CREATE' })) });
  }
  if (pathname === '/api/v1/schedule/my-month') return json(monthlySchedule());
  if (pathname === '/api/v1/operational-assignments/me') {
    const assignments = userMode === 'zones' ? [first] : userMode === 'support' ? [support] : userMode === 'multiple' ? [first, another] : userMode === 'ca3' ? [assignment('night', users[1], zone1, 'PRIMARY', 'CA3')] : [];
    return json(assignments);
  }
  if (pathname === '/api/v1/meter-operations/today') return json({ batch: null, current_round: null, meters: [], summary: { total_current: 0, confirmed_current: 0, review_current: 0, pending_current: 0 }, upcoming_rounds: [] });
  if (pathname === '/api/v1/attendance/today') return json({ status: 'NOT_CHECKED_IN', today: date, events: [] });
  return json({});
}

async function capture(page, name) {
  const target = path.join(out, name);
  await page.screenshot({ path: target, fullPage: true });
  console.log(name);
}

try {
  const adminPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  await adminPage.route('**/api/v1/**', route => intercept(route, true));
  await adminPage.goto('http://127.0.0.1:5174/?tab=staff_roster');
  await adminPage.getByText('Lịch ca (Tuần)').waitFor();
  await adminPage.getByRole('group', { name: 'Chế độ xem lịch' }).getByRole('button', { name: 'Tháng' }).click();
  await capture(adminPage, '01_staff_roster_month.png');
  await adminPage.getByRole('group', { name: 'Chế độ xem lịch' }).getByRole('button', { name: 'Tuần', exact: true }).click();
  await adminPage.locator('[data-cell-date="2026-09-23"][data-user-name="Lê Thị Chi"]').click();
  await adminPage.locator('.roster-popover-card').waitFor();
  assert.match(await adminPage.locator('[data-cell-date="2026-09-23"][data-user-name="Lê Thị Chi"]').getAttribute('aria-label'), /Chưa phân ca/);
  await adminPage.waitForTimeout(300);
  await capture(adminPage, '02_unassigned_shift_state.png');
  await adminPage.keyboard.press('Escape');
  await adminPage.getByRole('button', { name: 'Phân khu tác nghiệp' }).first().click();
  await adminPage.getByRole('heading', { name: 'Phân khu tác nghiệp' }).waitFor();
  await adminPage.getByLabel('Ca phân khu').focus();
  await adminPage.keyboard.press('ArrowDown');
  assert.equal(await adminPage.getByLabel('Ca phân khu').inputValue(), 'CA2');
  await adminPage.keyboard.press('ArrowUp');
  assert.equal(await adminPage.getByLabel('Ca phân khu').inputValue(), 'CA1');
  await capture(adminPage, '03_zone_assignment_board_ca1.png');
  await adminPage.getByLabel('Nhân sự trong ca').screenshot({ path: path.join(out, '04_available_staff.png') });
  adminMode = 'assigned'; await adminPage.getByLabel('Ca phân khu').selectOption('CA2'); await adminPage.getByLabel('Ca phân khu').selectOption('CA1');
  await adminPage.getByText('Nguyễn Văn An · Chính').waitFor();
  assert.ok(await adminPage.getByText('Trần Minh Bình · Hỗ trợ').count());
  await capture(adminPage, '05_primary_support_assignment.png');
  await adminPage.getByRole('article').filter({ hasText: 'Bãi tổng hợp' }).screenshot({ path: path.join(out, '06_unassigned_zone.png') });
  adminMode = 'pending'; await adminPage.getByLabel('Ca phân khu').selectOption('CA2'); await adminPage.getByLabel('Ca phân khu').selectOption('CA1');
  await adminPage.getByText(/Nhân viên có yêu cầu nghỉ đang chờ duyệt/).waitFor();
  assert.ok(await adminPage.getByLabel('Nhân viên tại Bãi container').locator('option[value="b"]').isEnabled());
  await capture(adminPage, '07_pending_leave_warning.png');
  adminMode = 'approved'; await adminPage.getByLabel('Ca phân khu').selectOption('CA2'); await adminPage.getByLabel('Ca phân khu').selectOption('CA1');
  await adminPage.waitForFunction(() => document.querySelector('select[aria-label="Nhân viên tại Bãi container"] option[value="b"]')?.disabled === true);
  assert.equal(await adminPage.getByLabel('Nhân viên tại Bãi container').locator('option[value="b"]').evaluate(option => option.disabled), true);
  await capture(adminPage, '08_approved_leave_block.png');
  adminMode = 'conflict'; await adminPage.getByLabel('Ca phân khu').selectOption('CA2'); await adminPage.getByLabel('Ca phân khu').selectOption('CA1');
  await adminPage.getByLabel('Nhân viên tại Bãi container').selectOption('b');
  await adminPage.getByRole('button', { name: 'Xem trước' }).click();
  await adminPage.getByText('Khu vực đã có người phụ trách chính trong ca.').waitFor();
  assert.equal(await adminPage.getByRole('button', { name: 'Xác nhận phân khu' }).isDisabled(), true);
  await capture(adminPage, '09_primary_conflict.png');
  adminMode = 'cancelled'; await adminPage.getByLabel('Ca phân khu').selectOption('CA2'); await adminPage.getByLabel('Ca phân khu').selectOption('CA1');
  await adminPage.getByText('Phân khu đã hủy (1)').waitFor();
  await adminPage.getByText('Phân khu đã hủy (1)').click();
  await adminPage.getByText(/SHIFT_CHANGED/).waitFor();
  await capture(adminPage, '10_assignment_cancelled.png');

  const userPage = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  await userPage.route('**/api/v1/**', route => intercept(route, false));
  async function userShot(mode, name, expected) {
    userMode = mode;
    await userPage.goto('http://127.0.0.1:5173/');
    await userPage.getByRole('button', { name: 'Xem Lịch làm việc & Phép' }).click();
    await userPage.getByText('Chi tiết:').waitFor();
    if (expected) assert.ok(await userPage.getByText(expected, { exact: false }).count(), `Missing ${expected} in ${name}`);
    await capture(userPage, name);
  }
  await userShot('zones', '11_user_schedule_with_zone.png', 'Bãi container — Chính');
  await userPage.locator('.user-sched-card').first().screenshot({ path: path.join(out, '12_user_primary_assignment.png') });
  await userShot('support', '13_user_support_assignment.png', 'Bãi container — Hỗ trợ');
  await userShot('multiple', '14_user_multiple_zones.png', 'Bãi tổng hợp — Hỗ trợ');
  await userShot('none', '15_user_unassigned_zone.png', 'Chưa được phân khu tác nghiệp.');
  await userShot('unassigned', '16_user_unassigned_shift.png', 'Chưa phân ca');
  await userShot('ca3', '17_user_ca3_assignment.png', '22:00 – 06:00');
} finally {
  await browser.close();
}
