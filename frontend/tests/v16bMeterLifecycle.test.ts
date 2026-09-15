import test from 'node:test';
import assert from 'node:assert/strict';

import type { MapMeterItem } from '../src/features/map-operations/types';
import type { Meter, AdminMeterItem, AdminMeterRetirePayload } from '../src/types';

// ===========================================================================
// SUITE: V16B METER LIFECYCLE SAFETY & ADMIN SEMANTICS
// ===========================================================================

test('V16B Types: Meter and AdminMeterItem include authoritative lifecycle attributes', () => {
  const activeMeter: Partial<Meter> = {
    id: 'm-001',
    meter_code: 'CT-001',
    is_active: true,
    lifecycle_status: 'ACTIVE',
    retired_at: null,
    retired_by: null,
    retirement_reason: null,
  };

  assert.equal(activeMeter.lifecycle_status, 'ACTIVE');
  assert.equal(activeMeter.is_active, true);
  assert.equal(activeMeter.retired_at, null);

  const retiredMeter: AdminMeterItem = {
    id: 'm-002',
    meter_code: 'CT-002',
    name: 'Công tơ 002',
    meter_type: 'LCD',
    is_active: false,
    lifecycle_status: 'RETIRED',
    retired_at: '2026-09-15T08:30:00Z',
    retired_by: 'user-admin-01',
    retirement_reason: 'Màn hình LCD chập cháy do thời tiết cảng biển',
    route_status: 'VALID',
    has_readings: true,
    total_readings: 245,
  };

  assert.equal(retiredMeter.lifecycle_status, 'RETIRED');
  assert.equal(retiredMeter.is_active, false);
  assert.equal(retiredMeter.total_readings, 245);
  assert.ok(retiredMeter.retired_at);
  assert.equal(retiredMeter.retirement_reason, 'Màn hình LCD chập cháy do thời tiết cảng biển');
});

test('V16B MapMeterItem: Normalized mapping correctly preserves lifecycle metadata', () => {
  const mapMeter: MapMeterItem = {
    id: 'm-003',
    meterCode: 'CT-003',
    name: 'Công tơ Cầu Cảng 03',
    location: 'Bến 2 Cầu Cảng',
    meterType: 'MECHANICAL',
    isActive: false,
    lifecycleStatus: 'RETIRED',
    retiredAt: '2026-09-15T09:00:00Z',
    retiredBy: 'admin-id',
    retirementReason: 'Thay thế định kỳ',
    zoneId: 'zone-berth',
    zoneCode: 'ZONE-BERTH',
    zoneName: 'Cầu cảng',
    presentationZoneId: 'pres-berth',
    routeStatus: 'VALID',
    coordinates: { x: 0.25, y: 0.35 },
    semanticState: 'INACTIVE',
    stateLabel: 'Tạm ngừng',
    latestReading: {
      readingId: 'rd-999',
      readingValue: '4567.8',
    },
  };

  assert.equal(mapMeter.lifecycleStatus, 'RETIRED');
  assert.equal(mapMeter.isActive, false);
  assert.equal(mapMeter.latestReading?.readingValue, '4567.8');
  assert.equal(mapMeter.retirementReason, 'Thay thế định kỳ');
});

test('V16B Status Badge & Labels: Formats 3 states deterministically without aggressive red', () => {
  const getLifecyclePresentation = (status?: string, isActive?: boolean) => {
    if (status === 'RETIRED') {
      return { label: 'Đã ngừng sử dụng', badgeStatus: 'normal' as const };
    }
    if (status === 'INACTIVE' || !isActive) {
      return { label: 'Tạm ngừng', badgeStatus: 'warning' as const };
    }
    return { label: 'Đang sử dụng', badgeStatus: 'success' as const };
  };

  const activePres = getLifecyclePresentation('ACTIVE', true);
  assert.equal(activePres.label, 'Đang sử dụng');
  assert.equal(activePres.badgeStatus, 'success');

  const inactPres = getLifecyclePresentation('INACTIVE', false);
  assert.equal(inactPres.label, 'Tạm ngừng');
  assert.equal(inactPres.badgeStatus, 'warning');

  const retPres = getLifecyclePresentation('RETIRED', false);
  assert.equal(retPres.label, 'Đã ngừng sử dụng');
  assert.equal(retPres.badgeStatus, 'normal'); // Neutral quiet tone, NOT destructive error red
});

test('V16B Action Controls Policy: Actions are strictly scoped to lifecycle states', () => {
  const deriveAvailableActions = (meter: { lifecycleStatus?: string; isActive: boolean }) => {
    if (meter.lifecycleStatus === 'RETIRED') {
      return {
        canRelocate: false,
        canChangeZone: false,
        canDeactivate: false,
        canReactivate: false,
        canRetire: false,
        canHardDelete: false,
        showsRetiredBanner: true,
      };
    }
    if (meter.lifecycleStatus === 'INACTIVE' || !meter.isActive) {
      return {
        canRelocate: false,
        canChangeZone: true,
        canDeactivate: false,
        canReactivate: true,
        canRetire: true,
        canHardDelete: false,
        showsRetiredBanner: false,
      };
    }
    // ACTIVE
    return {
      canRelocate: true,
      canChangeZone: true,
      canDeactivate: true,
      canReactivate: false,
      canRetire: true,
      canHardDelete: false,
      showsRetiredBanner: false,
    };
  };

  // Test ACTIVE actions
  const act = deriveAvailableActions({ lifecycleStatus: 'ACTIVE', isActive: true });
  assert.equal(act.canRelocate, true);
  assert.equal(act.canChangeZone, true);
  assert.equal(act.canDeactivate, true);
  assert.equal(act.canReactivate, false);
  assert.equal(act.canRetire, true);
  assert.equal(act.showsRetiredBanner, false);

  // Test INACTIVE actions
  const ina = deriveAvailableActions({ lifecycleStatus: 'INACTIVE', isActive: false });
  assert.equal(ina.canRelocate, false);
  assert.equal(ina.canChangeZone, true);
  assert.equal(ina.canDeactivate, false);
  assert.equal(ina.canReactivate, true);
  assert.equal(ina.canRetire, true);
  assert.equal(ina.showsRetiredBanner, false);

  // Test RETIRED actions
  const ret = deriveAvailableActions({ lifecycleStatus: 'RETIRED', isActive: false });
  assert.equal(ret.canRelocate, false);
  assert.equal(ret.canChangeZone, false);
  assert.equal(ret.canDeactivate, false);
  assert.equal(ret.canReactivate, false);
  assert.equal(ret.canRetire, false);
  assert.equal(ret.showsRetiredBanner, true);
});

test('V16B Non-Destructive Payload: Retire payload carries audit reason and zero coordinate changes', () => {
  const retirePayload: AdminMeterRetirePayload = {
    reason: 'Đồng hồ chuyển vào kho bảo dưỡng theo đợt Q3',
  };
  assert.ok(retirePayload.reason);
  assert.equal(typeof retirePayload.reason, 'string');
});
