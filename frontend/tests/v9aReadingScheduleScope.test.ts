import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const adminSource = fs.readFileSync(path.resolve(here, '../src/components/admin/AdminSchedules.tsx'), 'utf-8');
const apiSource = fs.readFileSync(path.resolve(here, '../src/services/api.ts'), 'utf-8');
const typesSource = fs.readFileSync(path.resolve(here, '../src/types.ts'), 'utf-8');

test('9A Admin: all four stable-ID meter scope modes are selectable', () => {
  for (const mode of ['ALL_ELIGIBLE', 'BY_ZONE', 'BY_UTILITY', 'SELECTED_METERS']) {
    assert.ok(adminSource.includes(`'${mode}'`), `Admin schedule UI supports ${mode}`);
  }
  assert.match(adminSource, /zone_ids/);
  assert.match(adminSource, /utility_types/);
  assert.match(adminSource, /meter_ids/);
  assert.match(typesSource, /export interface AdminScheduleScopeRequest/);
});

test('9A Admin: preview exposes exact round scope counts and publish sends its fingerprint', () => {
  assert.match(adminSource, /previewData\.scope\.meter_count/);
  assert.match(adminSource, /previewData\.scope\.electricity_count/);
  assert.match(adminSource, /previewData\.scope\.water_count/);
  assert.match(adminSource, /expected_scope_fingerprint:\s*previewData\.scope\.fingerprint/);
  assert.match(adminSource, /err\.status === 409/);
  assert.match(apiSource, /expected_scope_fingerprint/);
});

test('9A Admin: persisted round scope and legacy provenance are visible in round detail', () => {
  assert.match(adminSource, /roundMetersData\.progress\.total/);
  assert.match(adminSource, /scope_mode === 'LEGACY_DYNAMIC'/);
  assert.match(adminSource, /scope_zone_id_snapshot/);
  assert.match(adminSource, /current_zone_id/);
  assert.match(adminSource, /scope_utility_type_snapshot/);
  assert.match(adminSource, /Khu vực hiện tại/);
  assert.match(adminSource, /công tơ trong lượt/);
  assert.match(adminSource, /Phạm vi lịch cũ/);
});

test('9A Admin: schedule dialog has labelled scope controls, keyboard close, and safe delete wording', () => {
  assert.match(adminSource, /Tất cả công tơ đủ điều kiện/);
  assert.match(adminSource, /Theo khu vực/);
  assert.match(adminSource, /Theo tiện ích/);
  assert.match(adminSource, /Chọn công tơ/);
  assert.match(adminSource, /event\.key === 'Escape'/);
  assert.match(adminSource, /getDialogFocusableElements/);
  assert.match(adminSource, /closest\('\[aria-hidden="true"\]'\)/);
  assert.match(adminSource, /hủy lượt có kết quả/);
  assert.doesNotMatch(adminSource, /force=true/);
});
