import React, { useEffect, useRef, useState } from 'react';
import { X, Lock, AlertTriangle, Check, AlertCircle } from 'lucide-react';
import { ActiveCellPopoverState } from './types';
import { SHIFT_METADATA } from './rosterUtils';

interface RosterCellPopoverProps {
  state: ActiveCellPopoverState;
  onSelectShift: (shiftCode: string) => void;
  onClose: () => void;
}

export const RosterCellPopover: React.FC<RosterCellPopoverProps> = ({
  state,
  onSelectShift,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [overrideConfirmShift, setOverrideConfirmShift] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Calculate anchored coordinates ensuring within viewport
  const rect = state.boundingRect;
  const popoverWidth = 320;
  const popoverHeight = 380;

  let left = rect.left + rect.width / 2 - popoverWidth / 2;
  let top = rect.bottom + 8;

  // Viewport clamping
  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }
  if (left < 16) {
    left = 16;
  }

  // If overflowing bottom, flip to above the cell
  if (top + popoverHeight > window.innerHeight - 16) {
    top = Math.max(16, rect.top - popoverHeight - 8);
  }

  const shiftOptions = [
    SHIFT_METADATA.CA1,
    SHIFT_METADATA.CA2,
    SHIFT_METADATA.CA3,
    SHIFT_METADATA.HC,
    SHIFT_METADATA.OFF,
    SHIFT_METADATA.LEAVE,
  ];

  const handleShiftClick = (code: string) => {
    // If approved leave exists and attempting to assign a working shift, require explicit confirmation
    if (state.approvedLeave && ['CA1', 'CA2', 'CA3', 'HC'].includes(code)) {
      setOverrideConfirmShift(code);
    } else {
      onSelectShift(code);
    }
  };

  return (
    <>
      {/* Click outside backdrop */}
      <div className="roster-popover-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Popover Card */}
      <div
        ref={cardRef}
        className="roster-popover-card"
        style={{
          left: `${left}px`,
          top: `${top}px`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Đổi ca làm việc cho ${state.userName}`}
      >
        {/* Header */}
        <div className="roster-popover-header">
          <div>
            <div className="roster-popover-title">{state.userName}</div>
            <div className="roster-popover-sub">
              {state.employeeCode} · {state.weekdayLabel}, {state.date}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
            aria-label="Đóng bảng đổi ca"
          >
            <X size={16} />
          </button>
        </div>

        {/* Override Confirmation Barrier for Approved Leave */}
        {overrideConfirmShift ? (
          <div style={{ padding: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                color: '#991B1B',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Xác nhận ghi đè phép đã duyệt:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  {state.userName} đã có đơn nghỉ phép được phê duyệt ({state.approvedLeave?.leave_type_label}). Bạn có chắc chắn muốn xếp ca {overrideConfirmShift} vào ngày này?
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => setOverrideConfirmShift(null)}
                className="admin-btn-secondary"
                style={{ fontSize: '11.5px', padding: '5px 10px' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => onSelectShift(overrideConfirmShift)}
                className="admin-btn-primary"
                style={{ backgroundColor: '#DC2626', fontSize: '11.5px', padding: '5px 12px' }}
              >
                Ghi đè ca trực
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Warning if approved leave exists */}
            {state.approvedLeave && (
              <div className="roster-popover-leave-warning">
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, marginBottom: '2px' }}>
                  <Lock size={13} />
                  <span>Nghỉ phép đã được phê duyệt</span>
                </div>
                <span>
                  Loại phép: <strong>{state.approvedLeave.leave_type_label}</strong>. Lý do: &ldquo;{state.approvedLeave.reason}&rdquo;.
                </span>
              </div>
            )}

            {/* Shift Selection List */}
            <div className="roster-popover-options">
              {shiftOptions.map((opt) => {
                const isSelected = state.currentShift === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    className={`roster-popover-option-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleShiftClick(opt.code)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className={`admin-roster-cell-pill ${opt.tagClass}`}
                        style={{ minWidth: '42px', textAlign: 'center', padding: '2px 4px' }}
                      >
                        {opt.shortLabel}
                      </span>
                      <div>
                        <div style={{ color: 'var(--sgp-ink)', fontSize: '12px', fontWeight: 650 }}>
                          {opt.name}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--sgp-ink-muted)' }}>
                          {opt.timeRange}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={16} style={{ color: 'var(--sgp-brand-700)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Existing Conflicts Note */}
            {state.conflicts.length > 0 && (
              <div
                style={{
                  padding: '8px 12px',
                  background: '#FFFBEB',
                  borderTop: '1px solid #FDE68A',
                  fontSize: '11px',
                  color: '#92400E',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  {state.conflicts.map((c) => (
                    <div key={c.id}>{c.description}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
