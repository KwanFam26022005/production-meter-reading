import React, { useRef } from 'react';
import { Lock, AlertTriangle, Clock } from 'lucide-react';
import { LeaveRequestItem } from '../../../types';
import { RosterConflict } from './types';
import { SHIFT_METADATA } from './rosterUtils';

interface RosterCellProps {
  userId: string;
  userName: string;
  dateStr: string;
  weekdayLabel: string;
  shiftCode: string;
  isModified: boolean;
  conflicts: RosterConflict[];
  approvedLeave?: LeaveRequestItem;
  pendingLeave?: LeaveRequestItem;
  isSelected: boolean;
  isShiftMuted?: boolean;
  isTargetPulse?: boolean;
  onClick: (boundingRect: DOMRect) => void;
}

export const RosterCell: React.FC<RosterCellProps> = ({
  userName,
  dateStr,
  weekdayLabel,
  shiftCode,
  isModified,
  conflicts,
  approvedLeave,
  pendingLeave,
  isSelected,
  isShiftMuted = false,
  isTargetPulse = false,
  onClick,
}) => {
  const cellRef = useRef<HTMLTableCellElement>(null);

  const hasConflict = conflicts.length > 0;
  const isApprovedLeave = !!approvedLeave;
  const isPendingLeave = !!pendingLeave;

  const shiftInfo = SHIFT_METADATA[shiftCode] || {
    code: shiftCode,
    shortLabel: shiftCode,
    name: shiftCode,
    timeRange: '',
    tagClass: 'shift-tag-off',
    isWork: false,
    standardHours: 0,
  };

  const handleClick = () => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      onClick(rect);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Build highly informative accessible description
  const accessibleParts: string[] = [
    userName,
    `${weekdayLabel}, ${dateStr}`,
    `Ca: ${shiftInfo.name} (${shiftInfo.timeRange || 'Không xác định'})`,
  ];
  if (isApprovedLeave) {
    accessibleParts.push(`Nghỉ phép đã duyệt: ${approvedLeave.leave_type_label}`);
  } else if (isPendingLeave) {
    accessibleParts.push('Có đơn nghỉ phép đang chờ duyệt');
  }
  if (hasConflict) {
    accessibleParts.push(`Cảnh báo: ${conflicts.map((c) => c.description).join('. ')}`);
  }
  if (isModified) {
    accessibleParts.push('Thay đổi nháp chưa lưu');
  }

  const fullAriaLabel = accessibleParts.join('. ');

  // Class precedence: conflict > selected > modified > leave > muted
  let cellClasses = 'admin-roster-cell';
  if (hasConflict) cellClasses += ' has-conflict';
  if (isSelected) cellClasses += ' is-selected';
  if (isModified) cellClasses += ' is-modified';
  if (isApprovedLeave) cellClasses += ' is-leave';
  if (isShiftMuted && !hasConflict && !isSelected) cellClasses += ' is-shift-muted';
  if (isTargetPulse) cellClasses += ' target-cell-pulse';

  return (
    <td
      ref={cellRef}
      id={`roster-cell-${cellRef.current ? '' : ''}${dateStr}-${userName.replace(/\s+/g, '_')}`}
      data-cell-date={dateStr}
      data-user-name={userName}
      className={cellClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="gridcell"
      aria-label={fullAriaLabel}
      title={fullAriaLabel}
    >
      <span className={`admin-roster-cell-pill ${shiftInfo.tagClass}`}>
        {isApprovedLeave ? (
          <>
            <Lock size={10} style={{ color: '#BE185D', flexShrink: 0 }} />
            <span>PHÉP</span>
          </>
        ) : (
          <span>{shiftInfo.shortLabel}</span>
        )}

        {hasConflict && (
          <AlertTriangle
            size={11}
            style={{
              color: '#DC2626',
              flexShrink: 0,
              marginLeft: '1px',
            }}
          />
        )}

        {!isApprovedLeave && isPendingLeave && (
          <Clock
            size={10}
            style={{
              color: '#B45309',
              flexShrink: 0,
              marginLeft: '1px',
            }}
          />
        )}
      </span>
    </td>
  );
};
