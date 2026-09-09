import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { RosterConflict } from './types';

interface RosterConflictPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: RosterConflict[];
  onGoToConflict: (conflict: RosterConflict) => void;
}

export const RosterConflictPanel: React.FC<RosterConflictPanelProps> = ({
  isOpen,
  onClose,
  conflicts,
  onGoToConflict,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="roster-popover-backdrop" onClick={onClose} aria-hidden="true" />

      <div
        className="roster-conflict-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách vấn đề cần xử lý trong lịch"
      >
        {/* Header */}
        <div className="roster-conflict-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} style={{ color: conflicts.length > 0 ? '#F59E0B' : '#10B981' }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 750, color: '#FFFFFF' }}>
                {conflicts.length > 0 ? `${conflicts.length} vấn đề cần xử lý` : 'Kiểm tra lịch phân ca'}
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#B2D1E0' }}>
                Hệ thống tự động rà soát kíp trực, nghỉ phép và thời gian chuyển ca
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
            aria-label="Đóng bảng xung đột"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="roster-conflict-drawer-body">
          {conflicts.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#15803D' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 12px', display: 'block', color: '#16A34A' }} />
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--sgp-ink)' }}>
                Không phát hiện xung đột
              </div>
              <p style={{ fontSize: '12px', color: 'var(--sgp-ink-secondary)', margin: '6px 0 0' }}>
                Toàn bộ lịch trực đảm bảo đủ định biên tối thiểu, không trùng lịch nghỉ phép và đáp ứng thời gian nghỉ chuyển ca.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {conflicts.map((item) => {
                const isError = item.severity === 'error';
                return (
                  <div
                    key={item.id}
                    className={`roster-conflict-item ${isError ? 'conflict-error' : 'conflict-warning'}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <AlertTriangle
                        size={15}
                        style={{
                          color: isError ? '#DC2626' : '#D97706',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sgp-ink)' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--sgp-ink-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                          {item.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => onGoToConflict(item)}
                        className="roster-conflict-goto-btn"
                        title={`Đi tới ô lịch ngày ${item.date}`}
                      >
                        <span>Đi tới</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
