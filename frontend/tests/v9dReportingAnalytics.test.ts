import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReportingOperationsResponse, UsageMeterResponse, UsageOverviewResponse } from '../src/types';
import { ReportingOperationsWorkspace } from '../src/components/admin/ReportingOperationsWorkspace';
import { ReportingUsageWorkspace, ReportingMeterUsage } from '../src/components/admin/ReportingUsageWorkspace';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const operations: ReportingOperationsResponse = {
  date_range: { start_date: '2024-01-10', end_date: '2024-01-10' },
  summary: { scheduled: 3, scheduled_rounds: 2, due: 2, confirmed: 1, review: 0, missing: 1,
    assigned_due: 1, unassigned_due: 1, coverage_percent: 50, completion_percent: 50,
    unassigned_zone_count: 1, legacy_dynamic_count: 0 },
  available_zones: [{ id: 'z1', name: 'Khu A' }],
  breakdown: [{ round_id: 'r1', scheduled_at: '2024-01-10T01:00:00Z', zone_id: 'z1', zone_name: 'Khu A',
    scope_mode: 'SNAPSHOT', scheduled: 2, due: 2, confirmed: 1, review: 0, missing: 1,
    assigned_due: 1, unassigned_due: 1, shift_codes: ['CA1'] }],
  tasks: [],
  actions: [{ type: 'REVIEW', round_id: 'r1', scheduled_at: '2024-01-10T01:00:00Z', meter_id: 'm1',
    meter_code: 'E-1', meter_name: 'Điện 1', zone_id: 'z1', zone_name: 'Khu A', utility_type: 'ELECTRICITY',
    scope_mode: 'SNAPSHOT', status: 'REVIEW', shift_code: 'CA1', work_date: '2024-01-10',
    assigned: [{ user_id: 'a', name: 'Người A', role: 'PRIMARY' }, { user_id: 'b', name: 'Người B', role: 'SUPPORT' }],
    reading_id: 'reading-1', executor_id: 'b', executor_name: 'Người B' }],
};

function usageData(unit: 'KWH' | 'M3' | 'UNKNOWN', utility: 'ELECTRICITY' | 'WATER'): UsageOverviewResponse {
  return {
    date_range: { start_date: '2024-01-10', end_date: '2024-01-10' },
    selection: { utility_type: utility, zone_id: null, meter_id: null },
    resolution: 'Theo lượt ghi đã công bố; không phải dữ liệu thời gian thực.',
    available_meters: [{ id: 'm1', code: utility === 'WATER' ? 'W-1' : 'E-1' }],
    groups: [{ utility_type: utility, measurement_unit: unit, total_delta: unit === 'UNKNOWN' ? null : 40,
      interval_count: unit === 'UNKNOWN' ? 0 : 1,
      coverage: { eligible_meters: 2, meters_with_valid_interval: unit === 'UNKNOWN' ? 0 : 1, coverage_percent: unit === 'UNKNOWN' ? 0 : 50 },
      highest_interval: null, baseline_delta: null, difference: null, deviation_percent: null }],
    series: [], top_contributors: [], zone_breakdown: [], intervals: [], data_quality: { INSUFFICIENT_DATA: 1 },
  };
}

test('9D tab navigation keeps the requested operational order and original keys', () => {
  const source = fs.readFileSync(path.resolve(dirname, '../src/components/admin/AdminReports.tsx'), 'utf8');
  const ids = [...source.matchAll(/\{ id: '(overview|usage|data|quality|meters|audit)', label: '([^']+)'/g)].map(match => [match[1], match[2]]);
  assert.deepEqual(ids, [
    ['overview', 'Điều hành'], ['usage', 'Tiêu thụ & dao động'], ['data', 'Việc cần xử lý'],
    ['quality', 'Chất lượng OCR'], ['meters', 'Công tơ'], ['audit', 'Kiểm toán'],
  ]);
});

test('9D operational view discloses workload, coverage, and separate responsibility/executor', () => {
  const overview = renderToStaticMarkup(React.createElement(ReportingOperationsWorkspace, {
    data: operations, view: 'overview', integrityCount: 0, onOpenActions() {}, onSelectMeter() {},
  }));
  assert.match(overview, /Đến hạn/);
  assert.match(overview, /2 \/ 3/);
  assert.match(overview, /Chưa phân công/);
  assert.match(overview, /Coverage 50%/);
  const actions = renderToStaticMarkup(React.createElement(ReportingOperationsWorkspace, {
    data: operations, view: 'actions', integrityCount: 0, onOpenActions() {}, onSelectMeter() {}, onInspectReading() {},
  }));
  assert.match(actions, /Người A \(PRIMARY\), Người B \(SUPPORT\)/);
  assert.match(actions, /Đã ghi: Người B/);
  assert.match(actions, /Xem bản ghi/);
});

test('9D usage selection keeps electricity and water separate with explicit coverage', () => {
  const props = { loading: false, error: null, operations, zoneId: 'ALL', meterId: '',
    onUtility() {}, onZone() {}, onMeter() {}, onPreset() {}, onSelectMeter() {} };
  const electricity = renderToStaticMarkup(React.createElement(ReportingUsageWorkspace, {
    ...props, data: usageData('KWH', 'ELECTRICITY'), utilityType: 'ELECTRICITY',
  }));
  assert.match(electricity, /40 kWh/);
  assert.match(electricity, /1\/2 công tơ có khoảng hợp lệ/);
  assert.doesNotMatch(electricity, /40 m³/);
  const water = renderToStaticMarkup(React.createElement(ReportingUsageWorkspace, {
    ...props, data: usageData('M3', 'WATER'), utilityType: 'WATER',
  }));
  assert.match(water, /40 m³/);
  assert.doesNotMatch(water, /40 kWh/);
});

test('9D unknown unit and meter view never invent a physical total', () => {
  const props = { loading: false, error: null, operations, utilityType: 'ELECTRICITY', zoneId: 'ALL', meterId: '',
    onUtility() {}, onZone() {}, onMeter() {}, onPreset() {}, onSelectMeter() {} };
  const unknown = renderToStaticMarkup(React.createElement(ReportingUsageWorkspace, { ...props, data: usageData('UNKNOWN', 'ELECTRICITY') }));
  assert.match(unknown, /Đơn vị chưa cấu hình/);
  assert.match(unknown, /Chưa đủ dữ liệu/);
  assert.doesNotMatch(unknown, /40 kWh/);
  const meter: UsageMeterResponse = { meter_id: 'm1', meter_code: 'E-1', meter_name: 'Điện 1',
    utility_type: 'ELECTRICITY', measurement_unit: 'UNKNOWN', register_semantics: 'UNKNOWN',
    points: [{ reading_id: 'r1', round_id: 'round', scheduled_at: '2024-01-10T01:00:00Z', value: '100', confirmation_source: 'MANUAL_ENTRY' }], intervals: [] };
  const meterMarkup = renderToStaticMarkup(React.createElement(ReportingMeterUsage, { data: meter }));
  assert.match(meterMarkup, /Tiêu thụ/);
  assert.match(meterMarkup, /Tốc độ/);
  assert.match(meterMarkup, /Chỉ số gốc/);
  assert.match(meterMarkup, /Cần ít nhất hai chỉ số/);
});
