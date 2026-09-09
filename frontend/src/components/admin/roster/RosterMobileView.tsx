import React from 'react';
import { AdminRosterDayHeader, AdminRosterUserRow } from '../../../types';
import { ActiveCellPopoverState, RosterConflict } from './types';
import { RosterCell } from './RosterCell';
import { getEffectiveShift } from './rosterUtils';
import { RotateCcw } from 'lucide-react';

interface RosterMobileViewProps {
  users: AdminRosterUserRow[];
  visibleDays: AdminRosterDayHeader[];
  pendingChanges: Record<string, string>;
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

export const RosterMobileView: React.FC<RosterMobileViewProps> = ({
  users,
  visibleDays,
  pendingChanges,
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
  if (users.length === 0) {
    return (
      <div style={{ padding: '36px 16px', textAlign: 'center', background: '#FFFFFF', borderRadius: 'var(--radius-sm)' }}>
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
      </div>
    );
  }

  return (
    <div className="roster-mobile-card-list">
      {users.map((u) => (
        <div key={u.user_id} className="roster-mobile-employee-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--sgp-ink)' }}>
                {u.full_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--sgp-ink-muted)' }}>
                {u.employee_code} · {u.role}
              </div>
            </div>
          </div>

          <div className="roster-mobile-days-grid">
            {visibleDays.map((d) => {
              const cellKey = `${u.user_id}_${d.date}`;
              const isModified = pendingChanges[cellKey] !== undefined;
              const shiftVal = getEffectiveShift(u.user_id, d.date, pendingChanges, u.shifts);
              const cellConflicts = conflictsByCell[cellKey] || [];
              const approvedLeave = approvedLeavesLookup[cellKey];
              const pendingLeave = pendingLeavesLookup[cellKey];
              const isSelected = activePopover?.userId === u.user_id && activePopover?.date === d.date;
              const isShiftMuted = shiftFocus !== 'ALL' && shiftVal !== shiftFocus;
              const isTargetPulse = targetConflictCellKey === cellKey;

              return (
                <div key={d.date} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--sgp-ink-muted)', marginBottom: '2px' }}>
                    {d.weekday_label} {d.day}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <RosterCell
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
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
