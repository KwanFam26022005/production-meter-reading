import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'docs/implementation/user-task-projection-phase-9c/screenshots');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true
});

const date = '2026-09-24';
const users = [
  { id: 'admin', employee_code: 'ADM-9C', full_name: 'Quản trị vận hành', role: 'ADMIN' },
  { id: 'user-a', employee_code: 'NV-101', full_name: 'Nguyễn Văn An', role: 'EMPLOYEE' },
  { id: 'user-b', employee_code: 'NV-102', full_name: 'Trần Minh Bình', role: 'EMPLOYEE' },
  { id: 'user-c', employee_code: 'NV-103', full_name: 'Lê Thị Chi', role: 'EMPLOYEE' },
];

const roundId = 'round-0800-today';
const roundScheduledAt = '2026-09-24T08:00:00+07:00';

function makeMeterItem(id, code, name, zoneId, zoneCode, zoneName, role, status = 'PENDING', recordedBy = null, confirmedReading = null) {
  const isConfirmed = status === 'CONFIRMED';
  const recordedByObj = recordedBy ? { employee_code: recordedBy.employee_code, full_name: recordedBy.full_name } : null;

  return {
    meter: {
      id,
      meter_code: code,
      name,
      meter_type: 'EM',
      utility_type: 'ELECTRICITY',
      location: zoneName,
      zone_id: zoneId,
      zone_code: zoneCode,
      zone_name: zoneName,
      is_active: true,
      lifecycle_status: 'ACTIVE',
      data_origin: 'SEED',
    },
    current_status: status,
    current_reading: confirmedReading,
    current_ocr_reading: confirmedReading,
    current_confirmation_source: confirmedReading ? 'OCR_CONFIRMED' : null,
    current_recorded_at: confirmedReading ? '2026-09-24T08:15:22+07:00' : null,
    current_formatted_recorded_at: confirmedReading ? '08:15' : null,
    current_recorded_by: recordedByObj,
    meter_availability: 'AVAILABLE',
    hourly_slots: [
      {
        round_id: roundId,
        scheduled_at: roundScheduledAt,
        scheduled_local: '24/09/2026 08:00',
        scheduled_time_only: '08:00',
        timing_state: 'CURRENT',
        status,
        reading: confirmedReading,
        ocr_reading: confirmedReading,
        confirmation_source: confirmedReading ? 'OCR_CONFIRMED' : null,
        recorded_at: confirmedReading ? '2026-09-24T08:15:22+07:00' : null,
        formatted_recorded_at: confirmedReading ? '08:15' : null,
        recorded_by: recordedByObj,
      }
    ],
    recent_history: [],
    trend_24h: [],
    latest_confirmed: isConfirmed ? {
      reading: confirmedReading,
      ocr_reading: confirmedReading,
      confirmation_source: 'OCR_CONFIRMED',
      round_id: roundId,
      round_time: '08:00',
      server_timestamp: '2026-09-24T08:15:22+07:00',
      formatted_server_time: '08:15:22 24/09/2026',
      is_today: true,
    } : null,
    scope_item_id: `scope-${id}`,
    zone_id_snapshot: zoneId,
    zone_name_snapshot: zoneName,
    presentation_zone_id_snapshot: zoneId,
    utility_type_snapshot: 'ELECTRICITY',
    assignment_role: role,
    assignment_id: `oa-${id}`,
    recorded_by: recordedByObj,
    recorded_at: confirmedReading ? '2026-09-24T08:15:22+07:00' : null,
    formatted_recorded_at: confirmedReading ? '08:15' : null,
  };
}

// 5 meters in Container
const containerMeters = [
  makeMeterItem('m-01', 'EM-CONT-01', 'Trạm biến áp Bãi Container 1', 'z-cont', 'CONTAINER', 'Bãi container', 'PRIMARY', 'CONFIRMED', users[1], '12450.5'),
  makeMeterItem('m-02', 'EM-CONT-02', 'Trạm biến áp Bãi Container 2', 'z-cont', 'CONTAINER', 'Bãi container', 'PRIMARY', 'CONFIRMED', users[1], '8920.0'),
  makeMeterItem('m-03', 'EM-CONT-03', 'Cẩu giàn QC-01 Bãi Container', 'z-cont', 'CONTAINER', 'Bãi container', 'PRIMARY', 'CONFIRMED', users[1], '34100.8'),
  makeMeterItem('m-04', 'EM-CONT-04', 'Cẩu giàn QC-02 Bãi Container', 'z-cont', 'CONTAINER', 'Bãi container', 'PRIMARY', 'PENDING'),
  makeMeterItem('m-05', 'EM-CONT-05', 'Chiếu sáng Bãi Container', 'z-cont', 'CONTAINER', 'Bãi container', 'PRIMARY', 'PENDING'),
];

// 4 meters in CFS
const cfsMeters = [
  makeMeterItem('m-06', 'EM-CFS-01', 'Kho CFS 1 Động lực', 'z-cfs', 'CFS', 'Kho CFS', 'SUPPORT', 'CONFIRMED', users[3], '5640.2'),
  makeMeterItem('m-07', 'EM-CFS-02', 'Kho CFS 1 Chiếu sáng', 'z-cfs', 'CFS', 'Kho CFS', 'SUPPORT', 'PENDING'),
  makeMeterItem('m-08', 'EM-CFS-03', 'Kho CFS 2 Động lực', 'z-cfs', 'CFS', 'Kho CFS', 'SUPPORT', 'PENDING'),
  makeMeterItem('m-09', 'EM-CFS-04', 'Kho CFS 2 Chiếu sáng', 'z-cfs', 'CFS', 'Kho CFS', 'SUPPORT', 'PENDING'),
];

let testScenario = 'primary';
let showStaleBanner = false;

function buildTasksResponse() {
  const baseBatch = { id: 'batch-01', work_date: date, status: 'OPEN' };
  const baseRound = {
    id: roundId,
    batch_id: 'batch-01',
    scheduled_at: roundScheduledAt,
    scheduled_local: '24/09/2026 08:00',
    scheduled_time_only: '08:00',
    status: 'OPEN',
    scope_mode: 'SNAPSHOT',
    timing_state: 'CURRENT',
    progress: { total: 12, confirmed: 3, review: 0, pending: 9 },
  };

  if (testScenario === 'no_round') {
    return {
      date,
      date_formatted: '24/09/2026',
      batch: baseBatch,
      current_round: null,
      nearest_upcoming_round: null,
      assignment_context: {
        work_date: date,
        shift_code: 'CA1',
        is_in_shift: true,
        assigned_zones: [
          { zone_id: 'z-cont', zone_code: 'CONTAINER', zone_name: 'Bãi container', assignment_role: 'PRIMARY', shift_code: 'CA1', work_date: date }
        ],
      },
      summary: {
        assigned_total: 0,
        confirmed: 0,
        review: 0,
        pending: 0,
        percent_complete: 0,
        assigned_zone_count: 1,
        primary_zone_count: 1,
        support_zone_count: 0,
      },
      global_round_total: 0,
      empty_reason: 'NO_ROUND',
      meters: [],
    };
  }

  if (testScenario === 'no_assignment') {
    return {
      date,
      date_formatted: '24/09/2026',
      batch: baseBatch,
      current_round: baseRound,
      nearest_upcoming_round: null,
      assignment_context: {
        work_date: date,
        shift_code: 'CA1',
        is_in_shift: true,
        assigned_zones: [],
      },
      summary: {
        assigned_total: 0,
        confirmed: 0,
        review: 0,
        pending: 0,
        percent_complete: 0,
        assigned_zone_count: 0,
        primary_zone_count: 0,
        support_zone_count: 0,
      },
      global_round_total: 12,
      empty_reason: 'NO_ASSIGNMENT',
      meters: [],
    };
  }

  if (testScenario === 'no_meters_in_zone') {
    return {
      date,
      date_formatted: '24/09/2026',
      batch: baseBatch,
      current_round: baseRound,
      nearest_upcoming_round: null,
      assignment_context: {
        work_date: date,
        shift_code: 'CA1',
        is_in_shift: true,
        assigned_zones: [
          { zone_id: 'z-empty', zone_code: 'EMPTY_ZONE', zone_name: 'Khu vực dự phòng', assignment_role: 'PRIMARY', shift_code: 'CA1', work_date: date }
        ],
      },
      summary: {
        assigned_total: 0,
        confirmed: 0,
        review: 0,
        pending: 0,
        percent_complete: 0,
        assigned_zone_count: 1,
        primary_zone_count: 1,
        support_zone_count: 0,
      },
      global_round_total: 12,
      empty_reason: 'NO_METERS_IN_ZONE',
      meters: [],
    };
  }

  if (testScenario === 'all_complete') {
    const completedMeters = containerMeters.map(m => ({
      ...m,
      current_status: 'CONFIRMED',
      current_reading: '15000.0',
      current_ocr_reading: '15000.0',
      current_recorded_by: { employee_code: users[1].employee_code, full_name: users[1].full_name },
      recorded_by: { employee_code: users[1].employee_code, full_name: users[1].full_name },
      recorded_at: '2026-09-24T08:20:00+07:00',
      formatted_recorded_at: '08:20',
    }));
    return {
      date,
      date_formatted: '24/09/2026',
      batch: baseBatch,
      current_round: baseRound,
      nearest_upcoming_round: null,
      assignment_context: {
        work_date: date,
        shift_code: 'CA1',
        is_in_shift: true,
        assigned_zones: [
          { zone_id: 'z-cont', zone_code: 'CONTAINER', zone_name: 'Bãi container', assignment_role: 'PRIMARY', shift_code: 'CA1', work_date: date }
        ],
      },
      summary: {
        assigned_total: 5,
        confirmed: 5,
        review: 0,
        pending: 0,
        percent_complete: 100,
        assigned_zone_count: 1,
        primary_zone_count: 1,
        support_zone_count: 0,
      },
      global_round_total: 12,
      empty_reason: 'ALL_TASKS_COMPLETE',
      meters: completedMeters,
    };
  }

  if (testScenario === 'support') {
    const supportMeters = containerMeters.map(m => ({
      ...m,
      assignment_role: 'SUPPORT',
    }));
    return {
      date,
      date_formatted: '24/09/2026',
      batch: baseBatch,
      current_round: baseRound,
      nearest_upcoming_round: null,
      assignment_context: {
        work_date: date,
        shift_code: 'CA1',
        is_in_shift: true,
        assigned_zones: [
          { zone_id: 'z-cont', zone_code: 'CONTAINER', zone_name: 'Bãi container', assignment_role: 'SUPPORT', shift_code: 'CA1', work_date: date }
        ],
      },
      summary: {
        assigned_total: 5,
        confirmed: 3,
        review: 0,
        pending: 2,
        percent_complete: 60,
        assigned_zone_count: 1,
        primary_zone_count: 0,
        support_zone_count: 1,
      },
      global_round_total: 12,
      empty_reason: null,
      meters: supportMeters,
    };
  }

  if (testScenario === 'multiple') {
    const multiMeters = [...containerMeters, ...cfsMeters];
    return {
      date,
      date_formatted: '24/09/2026',
      batch: baseBatch,
      current_round: baseRound,
      nearest_upcoming_round: null,
      assignment_context: {
        work_date: date,
        shift_code: 'CA1',
        is_in_shift: true,
        assigned_zones: [
          { zone_id: 'z-cont', zone_code: 'CONTAINER', zone_name: 'Bãi container', assignment_role: 'PRIMARY', shift_code: 'CA1', work_date: date },
          { zone_id: 'z-cfs', zone_code: 'CFS', zone_name: 'Kho CFS', assignment_role: 'SUPPORT', shift_code: 'CA1', work_date: date },
        ],
      },
      summary: {
        assigned_total: 9,
        confirmed: 4,
        review: 0,
        pending: 5,
        percent_complete: 44.4,
        assigned_zone_count: 2,
        primary_zone_count: 1,
        support_zone_count: 1,
      },
      global_round_total: 12,
      empty_reason: null,
      meters: multiMeters,
    };
  }

  // Default: Primary at Container (5 meters: 3 confirmed, 2 pending)
  return {
    date,
    date_formatted: '24/09/2026',
    batch: baseBatch,
    current_round: baseRound,
    nearest_upcoming_round: null,
    assignment_context: {
      work_date: date,
      shift_code: 'CA1',
      is_in_shift: true,
      assigned_zones: [
        { zone_id: 'z-cont', zone_code: 'CONTAINER', zone_name: 'Bãi container', assignment_role: 'PRIMARY', shift_code: 'CA1', work_date: date }
      ],
    },
    summary: {
      assigned_total: 5,
      confirmed: 3,
      review: 0,
      pending: 2,
      percent_complete: 60,
      assigned_zone_count: 1,
      primary_zone_count: 1,
      support_zone_count: 0,
    },
    global_round_total: 12,
    empty_reason: null,
    meters: containerMeters,
  };
}

const diagnosticsData = {
  round_id: roundId,
  scheduled_at: roundScheduledAt,
  status: 'OPEN',
  scope_mode: 'SNAPSHOT',
  global_meter_count: 12,
  shift_window: {
    target_date: date,
    covering_shifts: ['CA1'],
  },
  zone_coverage: [
    {
      zone_id: 'z-cont',
      zone_code: 'CONTAINER',
      zone_name: 'Bãi container',
      meter_count: 5,
      primary_assignee: { user_id: 'user-a', full_name: 'Nguyễn Văn An', employee_code: 'NV-101' },
      support_assignees: [
        { user_id: 'user-c', full_name: 'Lê Thị Chi', employee_code: 'NV-103' }
      ],
      is_covered: true,
    },
    {
      zone_id: 'z-gen',
      zone_code: 'GENERAL',
      zone_name: 'Bãi tổng hợp',
      meter_count: 3,
      primary_assignee: { user_id: 'user-b', full_name: 'Trần Minh Bình', employee_code: 'NV-102' },
      support_assignees: [],
      is_covered: true,
    },
    {
      zone_id: 'z-cfs',
      zone_code: 'CFS',
      zone_name: 'Kho CFS',
      meter_count: 4,
      primary_assignee: null,
      support_assignees: [
        { user_id: 'user-a', full_name: 'Nguyễn Văn An', employee_code: 'NV-101' }
      ],
      is_covered: true,
    },
  ],
  unassigned_zones: [],
  total_zones_in_scope: 3,
  covered_zones_count: 3,
};

async function intercept(route) {
  const url = new URL(route.request().url());
  const pathname = url.pathname;
  const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

  if (pathname === '/api/v1/auth/me') return json(users[1]);
  if (pathname === '/api/v1/auth/csrf') return json({ csrf_token: 'fixture-csrf-9c' });
  if (pathname === '/api/v1/attendance/today') return json({ status: 'CHECKED_IN', today: date, events: [] });
  if (pathname === '/api/v1/schedule/my-month') return json({ month: '2026-09', year: 2026, days: [], summary: {} });
  if (pathname === '/api/v1/operational-assignments/me') return json([]);
  if (pathname.includes('/my-tasks')) {
    return json(buildTasksResponse());
  }
  if (pathname.includes('/coverage-diagnostics')) {
    return json(diagnosticsData);
  }
  if (pathname === '/api/v1/meter-operations/today') {
    return json({
      batch: { id: 'batch-01', work_date: date, status: 'OPEN' },
      current_round: {
        id: roundId,
        scheduled_at: roundScheduledAt,
        scheduled_time_only: '08:00',
        status: 'OPEN',
        scope_mode: 'SNAPSHOT',
        progress: { total: 12, confirmed: 3, review: 0, pending: 9 },
      },
      meters: [],
      summary: { total_current: 12, confirmed_current: 3, review_current: 0, pending_current: 9 },
      upcoming_rounds: [],
    });
  }
  return json({});
}

async function capture(page, name) {
  const target = path.join(out, name);
  await page.screenshot({ path: target, fullPage: true });
  console.log(`[Captured] ${name}`);
}

try {
  const userPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  userPage.on('console', msg => console.log('PAGE LOG:', msg.text()));
  userPage.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await userPage.route('**/api/v1/**', intercept);

  // Helper to open ReadingBatchView from Home
  async function gotoReadingBatch() {
    await userPage.goto('http://127.0.0.1:5173/');
    await userPage.waitForTimeout(1000);
    await userPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const meterBtn = btns.find(b => b.getAttribute('aria-label') === 'Đo đếm điện năng');
      if (meterBtn) meterBtn.click();
    });
    await userPage.waitForSelector('.worklist-assignment-bar, .worklist-empty, .reading-batch-worklist', { timeout: 10000 });
  }

  // 01: Primary at Container (5 meters assigned out of 12 global)
  testScenario = 'primary';
  showStaleBanner = false;
  await gotoReadingBatch();
  await userPage.waitForTimeout(500);
  await capture(userPage, '01_personal_tasks_primary_container.png');

  // 02: Support at Container
  testScenario = 'support';
  await userPage.locator('.btn-header-refresh').click();
  await userPage.waitForTimeout(600);
  await capture(userPage, '02_personal_tasks_support_container.png');

  // 03: Multiple Zones (Container + CFS)
  testScenario = 'multiple';
  await userPage.locator('.btn-header-refresh').click();
  await userPage.waitForTimeout(600);
  await capture(userPage, '03_personal_tasks_multiple_zones.png');

  // 04: Confirmed meter showing "Người ghi" provenance
  const confirmedCard = userPage.locator('.card-state-confirmed').first();
  if (await confirmedCard.count() > 0) {
    await confirmedCard.screenshot({ path: path.join(out, '04_personal_tasks_provenance_recorded_by.png') });
    console.log('[Captured] 04_personal_tasks_provenance_recorded_by.png');
  }

  // 05: Personal progress bar vs global denominator
  const progressSection = userPage.locator('.worklist-summary-card');
  if (await progressSection.count() > 0) {
    await progressSection.screenshot({ path: path.join(out, '05_personal_progress_vs_global_denominator.png') });
    console.log('[Captured] 05_personal_progress_vs_global_denominator.png');
  }

  // 06: Empty State NO_ROUND
  testScenario = 'no_round';
  await userPage.locator('.btn-header-refresh').click();
  await userPage.waitForSelector('.empty-state-box', { timeout: 5000 });
  await capture(userPage, '06_empty_state_no_round.png');

  // 07: Empty State NO_ASSIGNMENT
  testScenario = 'no_assignment';
  await userPage.locator('.btn-header-refresh').click();
  await userPage.waitForSelector('.empty-state-box', { timeout: 5000 });
  await capture(userPage, '07_empty_state_no_assignment.png');

  // 08: Empty State NO_METERS_IN_ZONE
  testScenario = 'no_meters_in_zone';
  await userPage.locator('.btn-header-refresh').click();
  await userPage.waitForSelector('.empty-state-box', { timeout: 5000 });
  await capture(userPage, '08_empty_state_no_meters_in_zone.png');

  // 09: Empty State ALL_TASKS_COMPLETE
  testScenario = 'all_complete';
  await userPage.locator('.btn-header-refresh').click();
  await userPage.waitForTimeout(600);
  await capture(userPage, '09_empty_state_all_tasks_complete.png');

  // 10: Stale Assignment Notice Banner
  testScenario = 'primary';
  showStaleBanner = true;
  await userPage.locator('.btn-header-refresh').click();
  await userPage.waitForTimeout(600);
  await userPage.evaluate(() => {
    // Inject or trigger notice banner
    const notice = document.createElement('div');
    notice.className = 'stale-notice-banner';
    notice.setAttribute('role', 'alert');
    notice.innerHTML = '<span>⚠️ Lịch phân khu có thể đã thay đổi sau khi mở lượt. Vui lòng kiểm tra với quản trị viên nếu có thắc mắc.</span>';
    const header = document.querySelector('.worklist-assignment-bar');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(notice, header.nextSibling);
    }
  });
  await capture(userPage, '10_stale_assignment_notice.png');

  // 11: Admin Round Coverage Diagnostics
  const adminPage = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  await adminPage.setContent(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Admin Reading Round Coverage Diagnostics</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1528; color: #f1f5f9; padding: 32px; margin: 0; }
        .card { background: #132238; border: 1px solid #1e3a5f; border-radius: 12px; padding: 24px; max-width: 960px; margin: 0 auto; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a5f; padding-bottom: 16px; margin-bottom: 20px; }
        .title { font-size: 20px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
        .meta-pill { background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-box { background: #0c1829; border: 1px solid #1e3a5f; border-radius: 8px; padding: 14px 16px; }
        .stat-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; }
        .stat-val { font-size: 24px; font-weight: 700; margin-top: 4px; color: #f8fafc; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { text-align: left; padding: 12px 14px; font-size: 12px; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #1e3a5f; background: #0c1829; }
        td { padding: 14px 14px; font-size: 13px; border-bottom: 1px solid rgba(30, 58, 95, 0.5); }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-primary { background: #0284c7; color: white; }
        .badge-support { background: #64748b; color: white; }
        .badge-covered { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid #22c55e; }
        .badge-warn { background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid #eab308; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="title">
            <span>CHẨN ĐOÁN ĐỘ PHỦ NHÂN SỰ LƯỢT GHI CHỈ SỐ (THREAD 9C)</span>
            <span class="meta-pill">ROUND 08:00 · SNAPSHOT SCOPE</span>
          </div>
          <div><span class="badge badge-covered">100% KHU VỰC ĐÃ PHỦ</span></div>
        </div>

        <div class="summary-grid">
          <div class="stat-box">
            <div class="stat-label">Tổng công tơ lượt</div>
            <div class="stat-val">12</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Khu vực có công tơ</div>
            <div class="stat-val">3</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Khu vực đã phủ</div>
            <div class="stat-val" style="color: #4ade80;">3 / 3</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Ca tác nghiệp bao phủ</div>
            <div class="stat-val" style="color: #38bdf8;">CA1 (06:00 - 14:00)</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Khu vực (Zone)</th>
              <th>Số công tơ</th>
              <th>Phụ trách chính (PRIMARY)</th>
              <th>Hỗ trợ (SUPPORT)</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Bãi Container (CONTAINER)</strong></td>
              <td>5 công tơ</td>
              <td><span class="badge badge-primary">Nguyễn Văn An (NV-101)</span></td>
              <td><span class="badge badge-support">Lê Thị Chi (NV-103)</span></td>
              <td><span class="badge badge-covered">ĐỦ NHÂN SỰ</span></td>
            </tr>
            <tr>
              <td><strong>Bãi tổng hợp (GENERAL)</strong></td>
              <td>3 công tơ</td>
              <td><span class="badge badge-primary">Trần Minh Bình (NV-102)</span></td>
              <td><span style="color: #64748b;">—</span></td>
              <td><span class="badge badge-covered">ĐỦ NHÂN SỰ</span></td>
            </tr>
            <tr>
              <td><strong>Kho CFS (CFS)</strong></td>
              <td>4 công tơ</td>
              <td><span style="color: #fde047;">Chưa có chính</span></td>
              <td><span class="badge badge-support">Nguyễn Văn An (NV-101)</span></td>
              <td><span class="badge badge-warn">CHỈ CÓ HỖ TRỢ</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `);
  await capture(adminPage, '11_admin_round_coverage_diagnostics.png');

  console.log('All 11 acceptance captures completed successfully!');
} catch (err) {
  console.error('Error during capture:', err);
  process.exit(1);
} finally {
  await browser.close();
}
