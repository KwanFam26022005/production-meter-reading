import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = fs.readFileSync(path.join(root, 'src/components/admin/OperationalAssignmentBoard.tsx'), 'utf8');
const roster = fs.readFileSync(path.join(root, 'src/components/admin/AdminStaffRoster.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const utils = fs.readFileSync(path.join(root, 'src/components/admin/roster/rosterUtils.ts'), 'utf8');

test('9B Admin keeps shift roster and zone responsibility on separate tabs', () => {
  assert.match(roster, /setActiveSubTab\('ROSTER'\)/);
  assert.match(roster, /setActiveSubTab\('ZONES'\)/);
  assert.match(roster, /activeSubTab === 'ZONES' && <OperationalAssignmentBoard/);
});

test('9B Admin board selects date and shift and shows availability and uncovered zones', () => {
  assert.match(board, /aria-label="Ngày phân khu"/);
  assert.match(board, /aria-label="Ca phân khu"/);
  assert.match(board, /UNASSIGNED_SHIFT: 'Chưa phân ca'/);
  assert.match(board, /APPROVED_LEAVE: 'Nghỉ phép'/);
  assert.match(board, /PENDING_LEAVE: 'Đang chờ duyệt phép'/);
  assert.match(board, /Chưa phân công/);
});

test('9B Admin distinguishes PRIMARY and SUPPORT and previews before apply', () => {
  assert.match(board, /assignment_role === 'PRIMARY' \? 'Chính' : 'Hỗ trợ'/);
  assert.match(board, /previewOperationalAssignments\(date, shift, \[candidate\]\)/);
  assert.match(board, /disabled=\{saving \|\| preview\.conflict_count > 0\}/);
  assert.match(board, /aria-label=\{`Hủy phân khu/);
  assert.match(api, /'X-CSRF-Token': csrf/);
});

test('9B roster shows missing schedule explicitly', () => {
  assert.match(utils, /UNASSIGNED: \{ code: 'UNASSIGNED', shortLabel: '—', name: 'Chưa phân ca'/);
  assert.match(utils, /persistedShifts\?\.\[dateStr\] \|\| 'UNASSIGNED'/);
});
