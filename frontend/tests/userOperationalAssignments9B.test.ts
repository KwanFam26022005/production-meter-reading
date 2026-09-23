import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schedule = fs.readFileSync(path.join(root, 'src/components/UserScheduleView.tsx'), 'utf8');
const reading = fs.readFileSync(path.join(root, 'src/components/ReadingBatchView.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');

test('9B User schedule loads own monthly assignments', () => {
  assert.match(schedule, /getMyOperationalAssignments\(currentMonth\)/);
  assert.match(api, /\/api\/v1\/operational-assignments\/me\?month=/);
});

test('9B User schedule differentiates unassigned shift from OFF and LEAVE', () => {
  assert.match(schedule, /case 'UNASSIGNED':/);
  assert.match(schedule, /Chưa phân ca/);
  assert.match(schedule, /case 'LEAVE':/);
  assert.match(schedule, /case 'CA3':/);
});

test('9B User schedule shows named zones, role, multiple zones, and empty state', () => {
  assert.match(schedule, /item\.zone_name/);
  assert.match(schedule, /item\.assignment_role === 'PRIMARY' \? 'Chính' : 'Hỗ trợ'/);
  assert.match(schedule, /\.join\('; '\)/);
  assert.match(schedule, /Chưa được phân khu tác nghiệp/);
});

test('9B User reading queue remains global round scope', () => {
  assert.match(reading, /operations\.current_round/);
  assert.match(reading, /operations\.meters/);
  assert.doesNotMatch(reading, /operational-assignments\/me|getMyOperationalAssignments/);
});
