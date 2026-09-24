import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readingSource = fs.readFileSync(path.join(root, 'src/components/ReadingBatchView.tsx'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const typesSource = fs.readFileSync(path.join(root, 'src/types.ts'), 'utf8');
const cssSource = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');

test('9C User: ReadingBatchView loads tasks via getMyMeterTasks and supports roundId parameter', () => {
  assert.match(readingSource, /getMyMeterTasks/);
  assert.match(apiSource, /export async function getMyMeterTasks/);
  assert.match(apiSource, /\/api\/v1\/meter-operations\/my-tasks/);
  assert.match(apiSource, /export async function getMyRoundTasks/);
  assert.match(apiSource, /\/api\/v1\/reading-rounds\/\$\{encodeURIComponent\(roundId\)\}\/my-tasks/);
});

test('9C User: Types export comprehensive UserTaskProjection models', () => {
  assert.match(typesSource, /export interface UserAssignedZoneContext/);
  assert.match(typesSource, /export interface UserAssignmentContext/);
  assert.match(typesSource, /export interface UserTaskSummary/);
  assert.match(typesSource, /export interface UserRoundTaskItem/);
  assert.match(typesSource, /export interface UserTasksResponse/);
  assert.match(typesSource, /export interface UserTaskCoverageDiagnostics/);
  assert.match(typesSource, /assigned_total: number/);
  assert.match(typesSource, /global_round_total\?: number \| null/);
  assert.match(typesSource, /assignment_role: 'PRIMARY' \| 'SUPPORT'/);
});

test('9C User: Personal progress preserves truthfulness and does not replace global round denominator', () => {
  // Personal count display: e.g. "3/5 công tơ được giao đã ghi"
  assert.match(readingSource, /công tơ được giao đã ghi/);
  assert.match(readingSource, /operations\.summary\.assigned_total/);
  // Separate global round denominator pill: e.g. "Lượt này có 12 công tơ"
  assert.match(readingSource, /worklist-global-scope-pill/);
  assert.match(readingSource, /Lượt này có \{operations\.global_round_total\} công tơ/);
  assert.match(cssSource, /\.worklist-global-scope-pill/);
});

test('9C User: Assignment context renders assigned zones with PRIMARY and SUPPORT badges', () => {
  assert.match(readingSource, /worklist-assignment-bar/);
  assert.match(readingSource, /assignment-zone-chip/);
  assert.match(readingSource, /task-role-badge/);
  assert.match(readingSource, /z\.assignment_role === 'PRIMARY' \? 'Chính' : 'Hỗ trợ'/);
  assert.match(cssSource, /\.worklist-assignment-bar/);
  assert.match(cssSource, /\.assignment-zone-chip/);
  assert.match(cssSource, /\.task-role-badge\.role-primary/);
  assert.match(cssSource, /\.task-role-badge\.role-support/);
});

test('9C User: Meter cards render assignment role, zone tag, and recorded_by provenance', () => {
  assert.match(readingSource, /task-card-role-badge/);
  assert.match(readingSource, /item\.assignment_role === 'PRIMARY' \? 'Chính' : 'Hỗ trợ'/);
  assert.match(readingSource, /meter-card-zone-tag/);
  assert.match(readingSource, /item\.zone_name_snapshot/);
  assert.match(readingSource, /meter-card-recorded-by/);
  assert.match(readingSource, /Người ghi: <strong>\{item\.recorded_by\.full_name\}<\/strong>/);
  assert.match(cssSource, /\.task-card-role-badge/);
  assert.match(cssSource, /\.meter-card-zone-tag/);
  assert.match(cssSource, /\.meter-card-recorded-by/);
});

test('9C User: Explicitly handles 4 distinct empty states truthfully', () => {
  // 1. NO_ROUND
  assert.match(readingSource, /operations\.empty_reason === 'NO_ROUND'/);
  assert.match(readingSource, /Hiện chưa có lượt ghi\./);
  // 2. NO_ASSIGNMENT
  assert.match(readingSource, /operations\.empty_reason === 'NO_ASSIGNMENT'/);
  assert.match(readingSource, /Bạn chưa được phân khu tác nghiệp cho lượt này\./);
  // 3. NO_METERS_IN_ZONE
  assert.match(readingSource, /operations\.empty_reason === 'NO_METERS_IN_ZONE'/);
  assert.match(readingSource, /Khu vực được phân công không có công tơ trong lượt này\./);
  // 4. ALL_TASKS_COMPLETE
  assert.match(readingSource, /operations\.empty_reason === 'ALL_TASKS_COMPLETE'/);
  assert.match(readingSource, /Bạn đã hoàn thành các công tơ được giao trong lượt này\./);
});

test('9C User: Stale assignment notification and administrative diagnostics support', () => {
  assert.match(readingSource, /stale-notice-banner/);
  assert.match(readingSource, /Phân công của bạn đã thay đổi/);
  assert.match(cssSource, /\.stale-notice-banner/);
  assert.match(apiSource, /getRoundCoverageDiagnostics/);
  assert.match(apiSource, /\/api\/v1\/admin\/reading-rounds\/\$\{encodeURIComponent\(roundId\)\}\/coverage-diagnostics/);
});
