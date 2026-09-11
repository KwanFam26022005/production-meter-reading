import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveOperatorShiftSummary,
  deriveShiftFromRoundTime,
} from '../src/features/map-operations/utils/deriveOperatorShiftSummary.ts';
import {
  getZoneOperatorAnchor,
  OPERATIONAL_ZONES_GEOMETRY,
} from '../src/features/map-operations/geometry/operationalGeometry.ts';
import type { MapMeterItem, MapOperationalZone } from '../src/features/map-operations/types';

const mockOperator = {
  id: 'user-001',
  fullName: 'Nguyễn Văn A',
  employeeCode: 'NV001',
  role: 'OPERATOR',
};

const mockOperator2 = {
  id: 'user-002',
  fullName: 'Trần Văn B',
  employeeCode: 'NV002',
  role: 'OPERATOR',
};

function createZone(id: string, name: string, assignedUser?: any): MapOperationalZone {
  return {
    id,
    code: id.toUpperCase(),
    name,
    shortName: name,
    assignedUser,
    metrics: {
      totalMeters: 0,
      confirmedCount: 0,
      pendingCount: 0,
      dueCount: 0,
      overdueCount: 0,
      reviewCount: 0,
      inactiveCount: 0,
      completionPercent: 0,
    },
  };
}

function createMeter(
  id: string,
  meterCode: string,
  zoneId: string,
  semanticState: 'CONFIRMED' | 'PENDING' | 'DUE' | 'OVERDUE' | 'REVIEW',
  isActive: boolean = true
): MapMeterItem {
  return {
    id,
    meterCode,
    name: `Công tơ ${meterCode}`,
    location: 'Vị trí thử nghiệm',
    meterType: 'LCD',
    isActive,
    zoneId,
    zoneCode: zoneId.toUpperCase(),
    zoneName: `Khu ${zoneId}`,
    coordinates: { x: 0.5, y: 0.5 },
    semanticState,
    stateLabel: semanticState,
  };
}

test('Case A: 1 zone with 100% progress', () => {
  const zones = [createZone('zone-wh', 'Kho Bãi', mockOperator)];
  const meters = [
    createMeter('m1', 'CT-001', 'zone-wh', 'CONFIRMED'),
    createMeter('m2', 'CT-002', 'zone-wh', 'CONFIRMED'),
  ];

  const summary = deriveOperatorShiftSummary(mockOperator, zones, meters, '11:00');
  assert.ok(summary !== null);
  assert.equal(summary.operatorId, 'user-001');
  assert.equal(summary.fullName, 'Nguyễn Văn A');
  assert.equal(summary.totalAssignedMeters, 2);
  assert.equal(summary.completedMeters, 2);
  assert.equal(summary.progressPct, 100);
  assert.equal(summary.overdueMeters, 0);
  assert.equal(summary.reviewMeters, 0);
  assert.equal(summary.shiftCode, 'CA1');
  assert.equal(summary.shiftLabel, 'Ca 1 · 06:00–14:00');
  assert.equal(summary.zoneBreakdown.length, 1);
  assert.equal(summary.zoneBreakdown[0].completed, 2);
  assert.equal(summary.zoneBreakdown[0].total, 2);
});

test('Case B: 1 zone with 0% progress and overdue meters', () => {
  const zones = [createZone('zone-cont', 'Bãi Container', mockOperator)];
  const meters = [
    createMeter('m1', 'CT-007', 'zone-cont', 'OVERDUE'),
    createMeter('m2', 'CT-008', 'zone-cont', 'OVERDUE'),
  ];

  const summary = deriveOperatorShiftSummary(mockOperator, zones, meters, '11:00');
  assert.ok(summary !== null);
  assert.equal(summary.totalAssignedMeters, 2);
  assert.equal(summary.completedMeters, 0);
  assert.equal(summary.progressPct, 0);
  assert.equal(summary.overdueMeters, 2);
  assert.equal(summary.reviewMeters, 0);
  assert.equal(summary.zoneBreakdown[0].overdue, 2);
});

test('Case C: Multiple zones for same operator aggregates progress across all zones', () => {
  const zones = [
    createZone('zone-berth', 'Cầu cảng', mockOperator),
    createZone('zone-cont', 'Bãi Container', mockOperator),
  ];
  const meters = [
    // Zone Berth: 5 completed, 1 pending (total 6)
    createMeter('b1', 'CT-001', 'zone-berth', 'CONFIRMED'),
    createMeter('b2', 'CT-002', 'zone-berth', 'CONFIRMED'),
    createMeter('b3', 'CT-003', 'zone-berth', 'CONFIRMED'),
    createMeter('b4', 'CT-004', 'zone-berth', 'CONFIRMED'),
    createMeter('b5', 'CT-005', 'zone-berth', 'CONFIRMED'),
    createMeter('b6', 'CT-006', 'zone-berth', 'PENDING'),
    // Zone Cont: 8 completed, 3 overdue, 1 review, 2 due (total 14)
    createMeter('c1', 'CT-007', 'zone-cont', 'CONFIRMED'),
    createMeter('c2', 'CT-008', 'zone-cont', 'CONFIRMED'),
    createMeter('c3', 'CT-009', 'zone-cont', 'CONFIRMED'),
    createMeter('c4', 'CT-010', 'zone-cont', 'CONFIRMED'),
    createMeter('c5', 'CT-011', 'zone-cont', 'CONFIRMED'),
    createMeter('c6', 'CT-012', 'zone-cont', 'CONFIRMED'),
    createMeter('c7', 'CT-013', 'zone-cont', 'CONFIRMED'),
    createMeter('c8', 'CT-014', 'zone-cont', 'CONFIRMED'),
    createMeter('c9', 'CT-015', 'zone-cont', 'OVERDUE'),
    createMeter('c10', 'CT-016', 'zone-cont', 'OVERDUE'),
    createMeter('c11', 'CT-017', 'zone-cont', 'OVERDUE'),
    createMeter('c12', 'CT-018', 'zone-cont', 'REVIEW'),
    createMeter('c13', 'CT-019', 'zone-cont', 'DUE'),
    createMeter('c14', 'CT-020', 'zone-cont', 'DUE'),
  ];

  const summary = deriveOperatorShiftSummary(mockOperator, zones, meters, '11:00');
  assert.ok(summary !== null);
  // Total: 6 + 14 = 20
  assert.equal(summary.totalAssignedMeters, 20);
  // Completed: 5 + 8 = 13
  assert.equal(summary.completedMeters, 13);
  // Progress: 13 / 20 = 65%
  assert.equal(summary.progressPct, 65);
  assert.equal(summary.overdueMeters, 3);
  assert.equal(summary.reviewMeters, 1);
  assert.equal(summary.dueMeters, 2);
  assert.equal(summary.pendingMeters, 1);

  // Breakdown verification
  assert.equal(summary.zoneBreakdown.length, 2);
  assert.equal(summary.zoneBreakdown[0].zoneId, 'zone-berth');
  assert.equal(summary.zoneBreakdown[0].completed, 5);
  assert.equal(summary.zoneBreakdown[0].total, 6);
  assert.equal(summary.zoneBreakdown[1].zoneId, 'zone-cont');
  assert.equal(summary.zoneBreakdown[1].completed, 8);
  assert.equal(summary.zoneBreakdown[1].total, 14);
});

test('Case D: Mixed confirmed, review, overdue counts', () => {
  const zones = [createZone('zone-tech', 'Kỹ thuật', mockOperator)];
  const meters = [
    createMeter('t1', 'CT-021', 'zone-tech', 'CONFIRMED'),
    createMeter('t2', 'CT-022', 'zone-tech', 'REVIEW'),
    createMeter('t3', 'CT-023', 'zone-tech', 'OVERDUE'),
  ];

  const summary = deriveOperatorShiftSummary(mockOperator, zones, meters, '15:00');
  assert.ok(summary !== null);
  assert.equal(summary.totalAssignedMeters, 3);
  assert.equal(summary.completedMeters, 1);
  assert.equal(summary.progressPct, 33);
  assert.equal(summary.reviewMeters, 1);
  assert.equal(summary.overdueMeters, 1);
  assert.equal(summary.shiftCode, 'CA2');
  assert.equal(summary.shiftLabel, 'Ca 2 · 14:00–22:00');
});

test('Case E: Zero assigned meters does not divide by zero', () => {
  const zones = [createZone('zone-empty', 'Khu rỗng', mockOperator)];
  const meters: MapMeterItem[] = [];

  const summary = deriveOperatorShiftSummary(mockOperator, zones, meters, '11:00');
  assert.ok(summary !== null);
  assert.equal(summary.totalAssignedMeters, 0);
  assert.equal(summary.completedMeters, 0);
  assert.equal(summary.progressPct, 0);
});

test('Case F: Unassigned operator returns null safely', () => {
  const zones = [createZone('zone-wh', 'Kho Bãi', mockOperator)];
  const meters = [createMeter('m1', 'CT-001', 'zone-wh', 'CONFIRMED')];

  const summary = deriveOperatorShiftSummary(mockOperator2, zones, meters, '11:00');
  assert.equal(summary, null);

  const summaryNull = deriveOperatorShiftSummary(null, zones, meters);
  assert.equal(summaryNull, null);
});

test('Case G: Different operator assignments remain completely isolated', () => {
  const zones = [
    createZone('zone-wh', 'Kho Bãi', mockOperator),
    createZone('zone-cont', 'Bãi Container', mockOperator2),
  ];
  const meters = [
    createMeter('m1', 'CT-001', 'zone-wh', 'CONFIRMED'),
    createMeter('m2', 'CT-002', 'zone-wh', 'PENDING'),
    createMeter('m3', 'CT-003', 'zone-cont', 'OVERDUE'),
  ];

  const op1 = deriveOperatorShiftSummary(mockOperator, zones, meters, '11:00');
  const op2 = deriveOperatorShiftSummary(mockOperator2, zones, meters, '11:00');

  assert.ok(op1 !== null);
  assert.ok(op2 !== null);
  assert.equal(op1.totalAssignedMeters, 2);
  assert.equal(op1.completedMeters, 1);
  assert.equal(op1.overdueMeters, 0);

  assert.equal(op2.totalAssignedMeters, 1);
  assert.equal(op2.completedMeters, 0);
  assert.equal(op2.overdueMeters, 1);
});

test('Case H: Current shift window label derivation', () => {
  assert.equal(deriveShiftFromRoundTime('07:00').shiftCode, 'CA1');
  assert.equal(deriveShiftFromRoundTime('11:00').shiftCode, 'CA1');
  assert.equal(deriveShiftFromRoundTime('13:59').shiftCode, 'CA1');
  assert.equal(deriveShiftFromRoundTime('14:00').shiftCode, 'CA2');
  assert.equal(deriveShiftFromRoundTime('18:30').shiftCode, 'CA2');
  assert.equal(deriveShiftFromRoundTime('22:00').shiftCode, 'CA3');
  assert.equal(deriveShiftFromRoundTime('02:00').shiftCode, 'CA3');
  assert.equal(deriveShiftFromRoundTime(undefined).shiftCode, 'CA1');
});

test('Case I: Deterministic operator anchor geometry and fallback', () => {
  const berthAnchor = getZoneOperatorAnchor('zone-berth');
  assert.deepEqual(berthAnchor, { x: 920, y: 330 });

  const whAnchor = getZoneOperatorAnchor('zone-warehouse');
  assert.deepEqual(whAnchor, { x: 440, y: 480 });

  const contAnchor = getZoneOperatorAnchor('zone-container');
  assert.deepEqual(contAnchor, { x: 1280, y: 440 });

  const techAnchor = getZoneOperatorAnchor('zone-technical');
  assert.deepEqual(techAnchor, { x: 1100, y: 770 });

  // Unknown zone fallback (canonical center 1915/2, 821/2)
  const fallbackAnchor = getZoneOperatorAnchor('non-existent-zone');
  assert.deepEqual(fallbackAnchor, { x: 958, y: 411 });
});
