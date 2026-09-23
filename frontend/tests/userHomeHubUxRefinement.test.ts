import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  selectPriorityInsight,
  PrioritySelectionInput,
} from '../src/components/home/priorityInsightLogic';
import {
  TodayOperationsResponse,
  TodayAttendance,
  NextShiftInfo,
} from '../src/types';

// Mock callbacks
const noop = () => {};

// ---------------------------------------------------------------------------
// 1. PURE PRIORITY INSIGHT DECISION MATRIX TESTS
// ---------------------------------------------------------------------------

test('Priority Logic: Rule A - Employee not checked in with active meter round', () => {
  const operations: TodayOperationsResponse = {
    date: '2026-09-21',
    server_time: '2026-09-21T08:30:00',
    meters: [],
    current_round: {
      schedule_id: 'R1',
      round_name: 'Lượt 08:00',
      scheduled_time: '2026-09-21T08:00:00',
      scheduled_time_only: '08:00',
      is_active: true,
      progress: {
        total: 12,
        confirmed: 5,
        pending: 6,
        review: 1,
        percent: 42,
      },
    },
    upcoming_rounds: [],
    completed_rounds: [],
    statistics: {
      total_meters: 12,
      total_rounds: 3,
      completed_rounds_count: 0,
      port_confirmed: 5,
      port_pending: 7,
      port_review: 0,
      port_progress_percent: 42,
    },
  };

  const attendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: null,
    check_out: null,
    status: 'NOT_CHECKED_IN',
  };

  const nextShift: NextShiftInfo = {
    shift_name: 'Ca Sáng (06:00–14:00)',
    start_time: '06:00',
    end_time: '14:00',
    is_today: true,
    weekday_label: 'Thứ Hai',
  };

  const input: PrioritySelectionInput = {
    operations,
    attendance,
    nextShift,
    onOpenMeter: noop,
    onOpenAttendance: noop,
    onOpenSchedule: noop,
  };

  const result = selectPriorityInsight(input);

  // Assert exactly 1 hero action
  assert.ok(result.priority !== null, 'Priority action must exist');
  assert.equal(result.priority.category, 'ATTENDANCE', 'Priority must be attendance check-in');
  assert.equal(result.priority.id, 'attendance-need-checkin');
  assert.equal(result.priority.isUrgentAction, true);
  assert.equal(result.priority.ctaLabel, 'Chấm công vào ca');

  // Assert updates contains active meter round as #1 item (compact, 1-tap accessible)
  assert.equal(result.updates.length, 2, 'Updates must contain meter candidate and schedule');
  assert.equal(result.updates[0].category, 'METER', 'Active meter round should be top item in updates');
  assert.equal(result.updates[0].id, 'meter-active-round');
  assert.equal(result.updates[1].category, 'SCHEDULE');

  // Assert no duplicates
  const allIds = [result.priority.id, ...result.updates.map((u) => u.id)];
  assert.equal(new Set(allIds).size, allIds.length, 'No duplicate IDs between priority and updates');
});

test('Priority Logic: Rule B - Employee in-shift with active meter round needing readings', () => {
  const operations: TodayOperationsResponse = {
    date: '2026-09-21',
    server_time: '2026-09-21T08:30:00',
    meters: [],
    current_round: {
      schedule_id: 'R1',
      round_name: 'Lượt 08:00',
      scheduled_time: '2026-09-21T08:00:00',
      scheduled_time_only: '08:00',
      is_active: true,
      progress: {
        total: 12,
        confirmed: 8,
        pending: 4,
        review: 0,
        percent: 67,
      },
    },
    upcoming_rounds: [],
    completed_rounds: [],
    statistics: {
      total_meters: 12,
      total_rounds: 3,
      completed_rounds_count: 0,
      port_confirmed: 8,
      port_pending: 4,
      port_review: 0,
      port_progress_percent: 67,
    },
  };

  const attendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: {
      timestamp: '2026-09-21T06:05:00',
      formatted_time: '06:05 - Cổng chính',
    },
    check_out: null,
    status: 'CHECKED_IN',
  };

  const input: PrioritySelectionInput = {
    operations,
    attendance,
    nextShift: null,
    onOpenMeter: noop,
    onOpenAttendance: noop,
    onOpenSchedule: noop,
  };

  const result = selectPriorityInsight(input);

  // Assert Priority is Meter Reading
  assert.ok(result.priority !== null, 'Priority action must exist');
  assert.equal(result.priority.category, 'METER');
  assert.equal(result.priority.id, 'meter-active-round');
  assert.equal(result.priority.isUrgentAction, true);
  assert.equal(result.priority.title, 'Còn 4 công tơ cần ghi');
  assert.equal(result.priority.ctaLabel, 'Tiếp tục đo đếm');

  // Compact updates contains in-shift attendance and schedule
  assert.equal(result.updates.length, 2);
  assert.equal(result.updates[0].category, 'ATTENDANCE');
  assert.equal(result.updates[0].id, 'attendance-in-shift');
  assert.equal(result.updates[0].badge?.text, 'Trong ca');
  assert.equal(result.updates[1].category, 'SCHEDULE');
});

test('Priority Logic: Rule B - Employee in-shift with past incomplete meter backlog', () => {
  const operations: TodayOperationsResponse = {
    date: '2026-09-21',
    server_time: '2026-09-21T11:30:00',
    meters: [
      {
        meter_code: 'M-01',
        meter_name: 'Trạm Biến Áp 1',
        zone: 'Cầu Cảng',
        location: 'Trạm 1',
        reading_status: 'PENDING',
        today_slots: [
          {
            schedule_id: 'R0',
            scheduled_time: '06:00',
            status: 'PENDING',
            timing_state: 'PAST',
          },
        ],
      } as any,
    ],
    current_round: null,
    upcoming_rounds: [],
    completed_rounds: [],
    statistics: {
      total_meters: 12,
      total_rounds: 3,
      completed_rounds_count: 1,
      port_confirmed: 11,
      port_pending: 1,
      port_review: 0,
      port_progress_percent: 92,
    },
  };

  const attendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: {
      timestamp: '2026-09-21T06:00:00',
      formatted_time: '06:00 - Cổng Cảng',
    },
    check_out: null,
    status: 'CHECKED_IN',
  };

  const input: PrioritySelectionInput = {
    operations,
    attendance,
    nextShift: null,
    onOpenMeter: noop,
    onOpenAttendance: noop,
    onOpenSchedule: noop,
  };

  const result = selectPriorityInsight(input);

  assert.ok(result.priority !== null);
  assert.equal(result.priority.category, 'METER');
  assert.equal(result.priority.id, 'meter-past-backlog');
  assert.equal(result.priority.title, 'Tồn đọng 1 công tơ cần ghi');
  assert.equal(result.priority.ctaLabel, 'Xử lý tồn đọng');
});

test('Priority Logic: Rule C - Idle state / all tasks completed (priority is null)', () => {
  const operations: TodayOperationsResponse = {
    date: '2026-09-21',
    server_time: '2026-09-21T15:00:00',
    meters: [],
    current_round: null,
    upcoming_rounds: [],
    completed_rounds: [],
    statistics: {
      total_meters: 12,
      total_rounds: 3,
      completed_rounds_count: 3,
      port_confirmed: 12,
      port_pending: 0,
      port_review: 0,
      port_progress_percent: 100,
    },
  };

  const attendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: {
      timestamp: '2026-09-21T06:00:00',
      formatted_time: '06:00',
    },
    check_out: {
      timestamp: '2026-09-21T14:05:00',
      formatted_time: '14:05',
    },
    status: 'CHECKED_OUT',
  };

  const input: PrioritySelectionInput = {
    operations,
    attendance,
    nextShift: null,
    onOpenMeter: noop,
    onOpenAttendance: noop,
    onOpenSchedule: noop,
  };

  const result = selectPriorityInsight(input);

  // Priority must be null
  assert.equal(result.priority, null, 'When no urgent action exists, priority must be null');
  assert.equal(result.updates.length, 3, 'All 3 operational categories must be in compact updates');
  assert.equal(result.updates[0].category, 'METER');
  assert.equal(result.updates[0].id, 'meter-idle');
  assert.equal(result.updates[1].category, 'ATTENDANCE');
  assert.equal(result.updates[1].id, 'attendance-completed');
  assert.equal(result.updates[2].category, 'SCHEDULE');
  assert.equal(result.updates[2].id, 'schedule-default');
});

test('Priority Logic: Null / degraded API input handling', () => {
  const input: PrioritySelectionInput = {
    operations: null,
    attendance: null,
    nextShift: null,
    onOpenMeter: noop,
    onOpenAttendance: noop,
    onOpenSchedule: noop,
  };

  const result = selectPriorityInsight(input);

  // Must not throw, priority is null, schedule fallback present
  assert.equal(result.priority, null);
  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].category, 'SCHEDULE');
  assert.equal(result.updates[0].id, 'schedule-default');
});

// ---------------------------------------------------------------------------
// 2. CSS CONTRACTS FOR USER HOME HUB REFINEMENT
// ---------------------------------------------------------------------------

test('CSS Contracts: Dynamic Priority Action and Compact Feed classes defined', () => {
  const cssPath = path.resolve('src/index.css');
  assert.ok(fs.existsSync(cssPath), 'index.css must exist');
  const css = fs.readFileSync(cssPath, 'utf-8');

  const REQUIRED_REFINED_SELECTORS = [
    // Dynamic Priority Action Card
    '.sgp-priority-section',
    '.sgp-priority-eyebrow',
    '.sgp-priority-action-card',
    '.sgp-priority-action-card--meter',
    '.sgp-priority-action-card--attendance',
    '.sgp-priority-header',
    '.sgp-priority-icon-pill',
    '.sgp-priority-badge',
    '.sgp-priority-badge--warning',
    '.sgp-priority-badge--info',
    '.sgp-priority-badge--success',
    '.sgp-priority-content',
    '.sgp-priority-title',
    '.sgp-priority-context',
    '.sgp-priority-action-row',
    '.sgp-priority-cta',

    // Compact Operational Feed
    '.sgp-compact-feed',
    '.sgp-compact-feed-header',
    '.sgp-compact-group',
    '.sgp-compact-row',
    '.sgp-compact-row--clickable',
    '.sgp-compact-icon-wrap',
    '.sgp-compact-icon-wrap--meter',
    '.sgp-compact-icon-wrap--attendance',
    '.sgp-compact-icon-wrap--schedule',
    '.sgp-compact-row-body',
    '.sgp-compact-row-top',
    '.sgp-compact-row-title',
    '.sgp-compact-badge',
    '.sgp-compact-row-desc',
    '.sgp-compact-row-arrow',

    // Radial Menu Polish
    '.sgp-radial-backdrop',
    '.sgp-radial-arc-item',
    '.sgp-radial-arc-label',
    '.arc-item-left',
    '.arc-item-center',
    '.arc-item-right',
  ];

  for (const selector of REQUIRED_REFINED_SELECTORS) {
    assert.ok(
      css.includes(selector),
      `CSS must contain required refined selector: "${selector}"`
    );
  }

  // Backdrop must use light dim (<= 0.35 opacity and subtle blur)
  assert.ok(
    css.includes('rgba(24, 24, 24, 0.22)') || css.includes('blur(1.5px)'),
    'Backdrop must use refined light dim instead of aggressive full screen blur'
  );

  // Reduced motion support
  assert.ok(
    css.includes('@media (prefers-reduced-motion: reduce)'),
    'CSS must include @media (prefers-reduced-motion: reduce) for accessible motion'
  );
});

// ---------------------------------------------------------------------------
// 3. RADIAL MENU GEOMETRY AND ACCESSIBILITY INVARIANTS
// ---------------------------------------------------------------------------

test('Radial Menu Contract: Cohesive child items with integrated labels', () => {
  const radialPath = path.resolve('src/components/home/BottomRadialNav.tsx');
  assert.ok(fs.existsSync(radialPath), 'BottomRadialNav.tsx must exist');
  const code = fs.readFileSync(radialPath, 'utf-8');

  // Verify child items contain both button and label in cohesive unit
  assert.ok(code.includes('sgp-radial-arc-item arc-item-left'));
  assert.ok(code.includes('sgp-radial-arc-item arc-item-center'));
  assert.ok(code.includes('sgp-radial-arc-item arc-item-right'));
  assert.ok(code.includes('sgp-radial-arc-label'));

  // Verify ARIA menu semantics
  assert.ok(code.includes('role="menu"'));
  assert.ok(code.includes('role="menuitem"'));
  assert.ok(code.includes('aria-expanded={isOpen}'));
  assert.ok(code.includes('aria-haspopup="menu"'));

  // Verify Escape key and outside click handling
  assert.ok(code.includes('e.key === \'Escape\''));
  assert.ok(code.includes('handleClickOutside'));

  // Verify whole-port progress ring formula preservation
  assert.ok(code.includes('circumference = 188.5'));
  assert.ok(code.includes('dashoffset = hasActiveRound && total > 0'));

  // Verify Saigon Port icon replaces Compass
  assert.ok(code.includes('SaigonPortUiIcon'), 'BottomRadialNav must render SaigonPortUiIcon');
  assert.ok(!code.includes('Compass'), 'BottomRadialNav must no longer use Compass');
});

test('Saigon Port Home Icon & Anti-Collision Badge Clearance Contract', () => {
  // 1. Assets exist in repository
  const publicSvgPath = path.resolve('public/saigon-port-ui-icon.svg');
  const assetSvgPath = path.resolve('src/assets/saigon-port-ui-icon.svg');
  assert.ok(fs.existsSync(publicSvgPath), 'public/saigon-port-ui-icon.svg must exist');
  assert.ok(fs.existsSync(assetSvgPath), 'src/assets/saigon-port-ui-icon.svg must exist');

  // 2. CSS clearances
  const cssPath = path.resolve('src/index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  assert.ok(css.includes('.sgp-radial-home-icon'), 'CSS must define .sgp-radial-home-icon');
  assert.ok(
    css.includes('transform: translateY(-2px)'),
    'Home icon must be shifted upward (-2px) to prevent badge collision'
  );
  assert.ok(
    css.includes('bottom: -8px'),
    'Port badge must be lowered to bottom: -8px to maintain clean separation'
  );
});
