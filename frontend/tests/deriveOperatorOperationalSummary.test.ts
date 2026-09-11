import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveOperatorOperationalSummary } from '../src/features/map-operations/utils/deriveOperatorOperationalSummary.ts';
import type { MapOperationalZone, MapMeterItem } from '../src/features/map-operations/types';

const mockBaseZone: MapOperationalZone = {
  id: 'zone-container',
  code: 'BAI-CONT',
  name: 'Bãi Container',
  shortName: 'Bãi Container',
  description: 'Khu vực bãi container',
  polygon: [{ x: 0.6, y: 0.3 }, { x: 0.8, y: 0.3 }, { x: 0.8, y: 0.5 }, { x: 0.6, y: 0.5 }],
  labelPosition: { x: 0.7, y: 0.4 },
  primaryColor: '#00B4D8',
  metrics: {
    totalMeters: 2,
    confirmedCount: 0,
    pendingCount: 0,
    dueCount: 0,
    overdueCount: 2,
    reviewCount: 0,
    inactiveCount: 0,
    completionPercent: 0,
  },
  assignedUser: {
    id: 'user-op-1',
    fullName: 'Nguyễn Văn A',
    employeeCode: 'NV-001',
    role: 'Nhân viên phụ trách',
  },
  meters: [],
};

const makeMockMeter = (
  id: string,
  code: string,
  zoneId: string,
  semanticState: 'CONFIRMED' | 'PENDING' | 'DUE' | 'OVERDUE' | 'REVIEW',
  isActive: boolean = true
): MapMeterItem => ({
  id,
  meterCode: code,
  name: `Công tơ ${code}`,
  location: 'Bãi C1',
  meterType: 'MECHANICAL',
  isActive,
  zoneId,
  zoneCode: 'BAI-CONT',
  zoneName: 'Bãi Container',
  coordinates: { x: 0.5, y: 0.5 },
  semanticState,
  stateLabel: semanticState,
});

test('Case A: Healthy zone with 100% progress', () => {
  const meters: MapMeterItem[] = [
    makeMockMeter('m1', 'CT-001', 'zone-container', 'CONFIRMED'),
    makeMockMeter('m2', 'CT-002', 'zone-container', 'CONFIRMED'),
  ];
  const summary = deriveOperatorOperationalSummary(mockBaseZone, meters, '11:00');
  assert.ok(summary);
  assert.equal(summary.fullName, 'Nguyễn Văn A');
  assert.equal(summary.zoneName, 'Bãi Container');
  assert.equal(summary.totalAssignedMeters, 2);
  assert.equal(summary.completedMeters, 2);
  assert.equal(summary.overdueMeters, 0);
  assert.equal(summary.reviewMeters, 0);
  assert.equal(summary.progressPct, 100);
  assert.equal(summary.currentRoundLabel, 'Lượt hiện tại · 11:00');
});

test('Case B: Critical zone with 0% progress and overdue meters (Figma 9:8 match)', () => {
  const meters: MapMeterItem[] = [
    makeMockMeter('m1', 'CT-001', 'zone-container', 'OVERDUE'),
    makeMockMeter('m2', 'CT-002', 'zone-container', 'OVERDUE'),
  ];
  const summary = deriveOperatorOperationalSummary(mockBaseZone, meters, '11:00');
  assert.ok(summary);
  assert.equal(summary.fullName, 'Nguyễn Văn A');
  assert.equal(summary.totalAssignedMeters, 2);
  assert.equal(summary.completedMeters, 0);
  assert.equal(summary.overdueMeters, 2);
  assert.equal(summary.reviewMeters, 0);
  assert.equal(summary.progressPct, 0);
  assert.equal(summary.currentRoundLabel, 'Lượt hiện tại · 11:00');
});

test('Case C & D: Partial progress with overdue and review meters', () => {
  const meters: MapMeterItem[] = [
    makeMockMeter('m1', 'CT-001', 'zone-container', 'CONFIRMED'),
    makeMockMeter('m2', 'CT-002', 'zone-container', 'OVERDUE'),
    makeMockMeter('m3', 'CT-003', 'zone-container', 'REVIEW'),
    makeMockMeter('m4', 'CT-004', 'zone-container', 'PENDING'),
  ];
  const summary = deriveOperatorOperationalSummary(mockBaseZone, meters, '14:00');
  assert.ok(summary);
  assert.equal(summary.totalAssignedMeters, 4);
  assert.equal(summary.completedMeters, 1);
  assert.equal(summary.overdueMeters, 1);
  assert.equal(summary.reviewMeters, 1);
  assert.equal(summary.progressPct, 25);
  assert.equal(summary.currentRoundLabel, 'Lượt hiện tại · 14:00');
});

test('Case E: Zero assigned meters does not divide by zero', () => {
  const summary = deriveOperatorOperationalSummary(mockBaseZone, [], '09:00');
  assert.ok(summary);
  assert.equal(summary.totalAssignedMeters, 0);
  assert.equal(summary.completedMeters, 0);
  assert.equal(summary.progressPct, 0);
});

test('Case F: Unassigned zone returns null safely', () => {
  const unassignedZone: MapOperationalZone = {
    ...mockBaseZone,
    assignedUser: undefined,
  };
  const summary = deriveOperatorOperationalSummary(unassignedZone, []);
  assert.equal(summary, null);
});
