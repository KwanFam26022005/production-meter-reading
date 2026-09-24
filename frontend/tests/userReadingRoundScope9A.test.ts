import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const userSource = fs.readFileSync(path.resolve(here, '../src/components/ReadingBatchView.tsx'), 'utf-8');
const typeSource = fs.readFileSync(path.resolve(here, '../src/types.ts'), 'utf-8');
const measurementUnitSource = fs.readFileSync(path.resolve(here, '../src/utils/measurementUnit.ts'), 'utf-8');

test('9A User: current queue labels scheduled meters and shows round status counts', () => {
  assert.match(userSource, /công tơ trong lượt đã ghi/);
  assert.match(userSource, /operations\.summary\.confirmed_current/);
  assert.match(userSource, /operations\.summary\.review_current/);
  assert.match(userSource, /operations\.summary\.pending_current/);
  assert.match(typeSource, /scheduled_meter_count\?: number \| null/);
});

test('9A User: scheduled water meters retain their correct reading unit', () => {
  assert.match(measurementUnitSource, /case 'M3':\s*return 'm³'/);
  assert.match(measurementUnitSource, /case 'KWH':\s*return 'kWh'/);
  assert.match(userSource, /formatMeasurementUnit\(meter\.measurement_unit\)/);
  assert.match(userSource, /getMeterUnit\(selectedDetailMeter\.meter\)/);
});

test('9A User: unavailable scheduled meters remain visible without a capture action', () => {
  assert.match(userSource, /item\.meter_availability === 'AVAILABLE'/);
  assert.match(userSource, /vẫn giữ trong lượt đã lập/);
  assert.match(userSource, /kết quả lịch sử vẫn được giữ/);
  assert.match(typeSource, /meter_availability\?: 'AVAILABLE' \| 'INACTIVE' \| 'RETIRED' \| 'MISSING'/);
});

test('9A User: in-scope items continue to open the OCR/manual meter workflow', () => {
  assert.match(userSource, /onSelectMeter\(meter, operations\.batch, operations\.current_round\)/);
  assert.match(userSource, /onSelectMeter\(meter, operations\?\.batch \|\| null, roundObj\)/);
  assert.match(userSource, /className="btn-worklist-capture"/);
});

test('9A User: modal dialogs have accessible names, Escape close, focus trapping, and progress labels', () => {
  assert.match(userSource, /aria-labelledby="reading-meter-detail-title"/);
  assert.match(userSource, /aria-labelledby="reading-schedule-title"/);
  assert.match(userSource, /event\.key === 'Escape'/);
  assert.match(userSource, /event\.shiftKey && document\.activeElement === first/);
  assert.match(userSource, /getDialogFocusableElements/);
  assert.match(userSource, /closest\('\[aria-hidden="true"\]'\)/);
  assert.match(userSource, /aria-label="Tiến độ lượt ghi"/);
});
