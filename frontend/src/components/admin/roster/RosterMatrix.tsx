import React, { useState } from 'react';
import {
  AdminRosterDayHeader,
  AdminRosterUserRow,
} from '../../../types';
import {
  ActiveCellPopoverState,
  DayCoverageSummary,
  RosterConflict,
  RosterViewMode,
} from './types';
import { RosterCell } from './RosterCell';
import { CoverageRows } from './CoverageRows';
import { calculateUserWorkload, getEffectiveShift } from './rosterUtils';
import { RotateCcw } from 'lucide-react';

interface RosterMatrixProps {
  users: AdminRosterUserRow[];
  visibleDays: AdminRosterDayHeader[];
  viewMode: RosterViewMode;
  pendingChanges: Record<string, string>;
  dayCoverage: Record<string, DayCoverageSummary>;
  conflictsByCell: Record<string, RosterConflict[]>;
  approvedLeavesLookup: Record<string, any>;
  pendingLeavesLookup: Record<string, any>;
  activePopover: ActiveCellPopoverState | null;
  shiftFocus: string;
  targetConflictCellKey: string | null;
  onlyConflicts: boolean;
  onCellClick: (cellState: ActiveCellPopoverState) => void;
  onResetFilters: () => void;
}

export const RosterMatrix: React.FC<RosterMatrixProps> = ({
  users,
  visibleDays,
  viewMode,
  pendingChanges,
  dayCoverage,
  conflictsByCell,
  approvedLeavesLookup,
  pendingLeavesLookup,
  activePopover,
  shiftFocus,
  targetConflictCellKey,
  onlyConflicts,
  onCellClick,
  onResetFilters,
}) => {
  // Crosshair hover state
  const [activeHoverRow, setActiveHoverRow] = useState<string | null>(null);
  const [activeHoverCol, setActiveHoverCol] = useState<string | null>(null);

  const isCoverageOnly = viewMode === 'COVERAGE';

  return (
    <div className="admin-roster-table-wrap" role="region" aria-label="Bảng phân ca nhân sự">
      <table className="admin-roster-table" role="grid">
        <thead>
          <tr>
            <th className="col-employee" scope="col">
              Nhân sự ({users.length})
            </th>
            {visibleDays.map((d) => {
              const isColHover = activeHoverCol === d.date;
              let dayClass = '';
              if (d.is_today) dayClass = 'day-today';
              else if (d.is_weekend) dayClass = 'day-weekend';
              if (isColHover) dayClass += ' col-active';

              return (
                <th
                  key={d.date}
                  className={dayClass}
                  scope="col"
                  onMouseEnter={() => setActiveHoverCol(d.date)}
                  onMouseLeave={() => setActiveHoverCol(null)}
                >
                  <div style={{ fontSize: '10px', lineHeight: 1.1, textTransform: 'uppercase' }}>
                    {d.weekday_label}
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 750, fontVariantNumeric: 'tabular-nums' }}>
                    {d.day}
                  </div>
                </th>
              );
            })}
            <th style={{ width: '85px', textAlign: 'center' }} scope="col" title="Tổng số ca và thời lượng làm việc ước tính">
              Tổng ca
            </th>
          </tr>
        </thead>

        {!isCoverageOnly && (
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={visibleDays.length + 2} style={{ padding: '36px 16px', textAlign: 'center', background: '#FFFFFF' }}>
                  <div style={{ color: 'var(--sgp-ink-muted)', fontSize: '13px' }}>
                    {onlyConflicts
                      ? 'Không có nhân sự nào có xung đột trong khoảng thời gian này.'
                      : 'Không tìm thấy nhân sự phù hợp với tiêu chí lọc.'}
                  </div>
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="admin-btn-secondary"
                    style={{ marginTop: '10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <RotateCcw size={13} />
                    <span>Xóa bộ lọc</span>
                  </button>
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isRowHover = activeHoverRow === u.user_id;

                // P2.7: Compute approximate scheduled work hours
                const workload = calculateUserWorkload(u.user_id, visibleDays, pendingChanges, u.shifts);

                return (
                  <tr
                    key={u.user_id}
                    className={isRowHover ? 'row-active' : ''}
                    onMouseEnter={() => setActiveHoverRow(u.user_id)}
                    onMouseLeave={() => setActiveHoverRow(null)}
                  >
                    {/* Sticky Employee Identity Column */}
                    <td className="col-employee">
                      <div
                        style={{
                          fontWeight: 700,
                          color: 'var(--sgp-ink)',
                          fontSize: '12px',
                          lineHeight: 1.25,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '210px',
                        }}
                        title={u.full_name}
                      >
                        {u.full_name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--sgp-ink-muted)', marginTop: '2px' }}>
                        {u.employee_code} · {u.role}
                      </div>
                    </td>

                    {/* Day Shift Cells */}
                    {visibleDays.map((d) => {
                      const cellKey = `${u.user_id}_${d.date}`;
                      const isModified = pendingChanges[cellKey] !== undefined;
                      const shiftVal = getEffectiveShift(u.user_id, d.date, pendingChanges, u.shifts);
                      const cellConflicts = conflictsByCell[cellKey] || [];
                      const approvedLeave = approvedLeavesLookup[cellKey];
                      const pendingLeave = pendingLeavesLookup[cellKey];

                      const isSelected =
                        activePopover?.userId === u.user_id && activePopover?.date === d.date;

                      // Shift Focus Mode (P2.4): Mutes other shifts if a specific shift is focused
                      const isShiftMuted = shiftFocus !== 'ALL' && shiftVal !== shiftFocus;

                      // Go-to-conflict highlight pulse (P2.6)
                      const isTargetPulse = targetConflictCellKey === cellKey;

                      return (
                        <RosterCell
                          key={d.date}
                          userId={u.user_id}
                          userName={u.full_name}
                          dateStr={d.date}
                          weekdayLabel={d.weekday_label}
                          shiftCode={shiftVal}
                          isModified={isModified}
                          conflicts={cellConflicts}
                          approvedLeave={approvedLeave}
                          pendingLeave={pendingLeave}
                          isSelected={isSelected}
                          isShiftMuted={isShiftMuted}
                          isTargetPulse={isTargetPulse}
                          onClick={(boundingRect) => {
                            onCellClick({
                              userId: u.user_id,
                              userName: u.full_name,
                              employeeCode: u.employee_code,
                              date: d.date,
                              weekdayLabel: d.weekday_label,
                              currentShift: shiftVal,
                              boundingRect,
                              approvedLeave,
                              pendingLeave,
                              conflicts: cellConflicts,
                            });
                          }}
                        />
                      );
                    })}

                    {/* Total Shifts & Hours Workload Cell (P2.7) */}
                    <td
                      style={{
                        textAlign: 'center',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '11px',
                        color: workload.isWorkloadHeavy ? '#B45309' : 'var(--sgp-ink)',
                        backgroundColor: workload.isWorkloadHeavy ? '#FEF3C7' : undefined,
                      }}
                      title={
                        workload.isWorkloadHeavy
                          ? `Cảnh báo tải lịch: ${workload.totalHours} giờ trong tuần (vượt định mức 48h)`
                          : `${workload.totalShifts} ca làm việc · ước tính ~${workload.totalHours} giờ`
                      }
                    >
                      <div style={{ fontWeight: 750 }}>
                        {workload.totalShifts} ca
                      </div>
                      <div style={{ fontSize: '10px', color: workload.isWorkloadHeavy ? '#B45309' : 'var(--sgp-ink-muted)' }}>
                        {workload.totalHours}h {workload.isWorkloadHeavy ? '⚠' : ''}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        )}

        {/* Shift-specific Coverage Rows (Always visible in table footer) */}
        <CoverageRows
          visibleDays={visibleDays}
          dayCoverage={dayCoverage}
          activeHoverCol={activeHoverCol}
        />
      </table>
    </div>
  );
};
