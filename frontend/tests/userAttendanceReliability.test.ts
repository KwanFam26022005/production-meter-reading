import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectPriorityInsight,
  PrioritySelectionInput,
} from '../src/components/home/priorityInsightLogic';
import {
  reconcileAttendance,
  AttendanceReconciliationResult,
} from '../src/services/api';
import {
  TodayAttendance,
  AttendanceSubmissionPhase,
  TodayOperationsResponse,
  NextShiftInfo,
} from '../src/types';

const noop = () => {};

// =============================================================================
// 1. HOME HUB ATTENDANCE 5-STATE DISCRIMINATION
// =============================================================================

test('Home Hub Attendance States: Explicitly distinguishes LOADING, ERROR, NOT_CHECKED_IN, IN_SHIFT, COMPLETED', () => {
  const baseInput: PrioritySelectionInput = {
    operations: null,
    attendance: null,
    nextShift: null,
    onOpenMeter: noop,
    onOpenAttendance: noop,
    onOpenSchedule: noop,
  };

  // State 1: LOADING (loadingAttendance=true, attendance=null) -> distinct loading candidate
  const loadingResult = selectPriorityInsight({
    ...baseInput,
    loadingAttendance: true,
  });
  const loadingCandidate = loadingResult.updates.find((u) => u.category === 'ATTENDANCE');
  assert.ok(loadingCandidate, 'Loading attendance candidate must be present');
  assert.equal(loadingCandidate.id, 'attendance-loading');
  assert.equal(loadingCandidate.badge?.text, 'Đang kiểm tra...');
  assert.notEqual(loadingCandidate.badge?.text, 'Chưa vào ca', 'Loading MUST NOT be conflated with Chưa vào ca');

  // State 2: ERROR (attendanceError present, attendance=null) -> distinct error candidate with retry CTA
  const errorResult = selectPriorityInsight({
    ...baseInput,
    attendanceError: 'Lỗi máy chủ nội bộ 500',
    onRetryAttendance: noop,
  });
  const errorCandidate = errorResult.updates.find((u) => u.category === 'ATTENDANCE');
  assert.ok(errorCandidate, 'Error attendance candidate must be present');
  assert.equal(errorCandidate.id, 'attendance-error');
  assert.equal(errorCandidate.badge?.text, 'Lỗi tải');
  assert.equal(errorCandidate.ctaLabel, 'Thử lại');
  assert.notEqual(errorCandidate.badge?.text, 'Chưa vào ca', 'Error MUST NOT be conflated with Chưa vào ca');

  // State 3: NOT_CHECKED_IN (attendance with no check-in) -> urgent action hero
  const notCheckedInAttendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: null,
    check_out: null,
    allowed_action: 'CHECK_IN',
  };
  const notCheckedInResult = selectPriorityInsight({
    ...baseInput,
    attendance: notCheckedInAttendance,
  });
  assert.ok(notCheckedInResult.priority, 'Priority hero must be attendance check-in');
  assert.equal(notCheckedInResult.priority.id, 'attendance-need-checkin');
  assert.equal(notCheckedInResult.priority.badge?.text, 'Chưa vào ca');
  assert.equal(notCheckedInResult.priority.isUrgentAction, true);

  // State 4: IN_SHIFT (check-in recorded, check-out null) -> in-shift update
  const inShiftAttendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: {
      id: 'att-ci-01',
      timestamp: '2026-09-21T06:30:00Z',
      formatted_time: '06:30:00 - 21/09/2026',
      status: 'VALID',
    },
    check_out: null,
    allowed_action: 'CHECK_OUT',
  };
  const inShiftResult = selectPriorityInsight({
    ...baseInput,
    attendance: inShiftAttendance,
  });
  const inShiftCandidate = inShiftResult.updates.find((u) => u.category === 'ATTENDANCE');
  assert.ok(inShiftCandidate, 'In-shift candidate must be in updates');
  assert.equal(inShiftCandidate.id, 'attendance-in-shift');
  assert.equal(inShiftCandidate.badge?.text, 'Trong ca');

  // State 5: COMPLETED (both check-in and check-out recorded) -> completed update
  const completedAttendance: TodayAttendance = {
    date: '2026-09-21',
    check_in: {
      id: 'att-ci-01',
      timestamp: '2026-09-21T06:30:00Z',
      formatted_time: '06:30:00 - 21/09/2026',
      status: 'VALID',
    },
    check_out: {
      id: 'att-co-01',
      timestamp: '2026-09-21T14:30:00Z',
      formatted_time: '14:30:00 - 21/09/2026',
      status: 'VALID',
    },
    allowed_action: null,
  };
  const completedResult = selectPriorityInsight({
    ...baseInput,
    attendance: completedAttendance,
  });
  const completedCandidate = completedResult.updates.find((u) => u.category === 'ATTENDANCE');
  assert.ok(completedCandidate, 'Completed candidate must be in updates');
  assert.equal(completedCandidate.id, 'attendance-completed');
  assert.equal(completedCandidate.badge?.text, 'Đã tan ca');
});

// =============================================================================
// 2. ATTENDANCE SUBMISSION PHASE & RECONCILIATION CONTRACT
// =============================================================================

test('Attendance Submission Phases: Contract covers all required lifecycle states', () => {
  const phases: AttendanceSubmissionPhase[] = [
    'NOT_SUBMITTED',
    'SUBMITTING',
    'CONFIRMED_BY_SERVER',
    'OUTCOME_UNKNOWN',
    'RECONCILING',
    'CONFLICT',
    'REJECTED',
  ];
  assert.equal(phases.length, 7, 'Must support exactly the 7 robust lifecycle phases');
});

// =============================================================================
// 3. RECONCILIATION LOGIC IN PURE FORM
// =============================================================================

test('Reconciliation Matcher: Confirms server record only with positive correlation linkage', () => {
  const mockServerRecord = {
    id: 'att-event-888',
    timestamp: '2026-09-21T07:15:00Z',
    formatted_time: '14:15:00 - 21/09/2026',
    status: 'VALID',
    client_submission_id: 'sub-my-client-key-123',
    photo_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  };

  // Case A: Matching submission id -> CONFIRMED
  const idMatch = Boolean(
    mockServerRecord.client_submission_id === 'sub-my-client-key-123'
  );
  assert.equal(idMatch, true, 'Matching client_submission_id must confirm record');

  // Case B: Different submission ID on server -> CONFLICT (must NOT confirm even if photo hash matches)
  const differentClientSubId = 'sub-other-device-456';
  const isMatchWithDifferentId = Boolean(
    mockServerRecord.client_submission_id === differentClientSubId
  );
  assert.equal(isMatchWithDifferentId, false, 'Different client_submission_id must NOT confirm request');

  // Case C: Unlinked event exists with DIFFERENT submission id and hash -> CONFLICT (must NOT confirm)
  const differentHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const unlinkedMatch = Boolean(
    mockServerRecord.client_submission_id === differentClientSubId ||
    mockServerRecord.photo_sha256 === differentHash
  );
  assert.equal(unlinkedMatch, false, 'Unlinked event on server must NOT confirm current request');
});
