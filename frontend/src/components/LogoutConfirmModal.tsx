import React, { useEffect, useRef } from 'react';
import { LogOut, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  hasUnsavedWork: boolean;
  isLoggingOut: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  hasUnsavedWork,
  isLoggingOut,
  error,
  onConfirm,
  onCancel,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoggingOut) {
        onCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoggingOut, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!isLoggingOut) onCancel();
      }}
      role="presentation"
    >
      <div
        className="logout-modal-card"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-desc"
      >
        <div className="logout-modal-header">
          <div className="logout-modal-icon-wrap" aria-hidden="true">
            <LogOut size={20} strokeWidth={2.2} />
          </div>
          <div className="logout-modal-title-group">
            <h2 id="logout-title" className="logout-modal-title">
              Đăng xuất?
            </h2>
            <p id="logout-desc" className="logout-modal-desc">
              Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng hệ thống.
            </p>
          </div>
        </div>

        {/* Network or General Error Notice */}
        {error && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Unsaved Meter Reading Warning */}
        {hasUnsavedWork && !error && (
          <div className="logout-unsaved-warning" role="alert">
            <AlertTriangle size={18} strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Bạn đang có kết quả đọc công tơ chưa xác nhận. Dữ liệu này sẽ bị hủy khi đăng xuất.
            </span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="logout-modal-actions">
          <button
            type="button"
            className="btn btn-secondary logout-btn-cancel"
            onClick={onCancel}
            disabled={isLoggingOut}
            aria-label={hasUnsavedWork ? 'Quay lại làm việc' : 'Hủy đăng xuất'}
          >
            {hasUnsavedWork ? 'Quay lại' : 'Hủy'}
          </button>

          <button
            type="button"
            className="btn btn-primary logout-btn-confirm"
            onClick={onConfirm}
            disabled={isLoggingOut}
            aria-label={error ? 'Thử lại đăng xuất' : 'Xác nhận đăng xuất'}
          >
            {isLoggingOut ? (
              <>
                <div className="maritime-spinner-sm" aria-hidden="true" />
                <span>Đang đăng xuất...</span>
              </>
            ) : error ? (
              <>
                <RefreshCw size={16} strokeWidth={2} />
                <span>Thử lại</span>
              </>
            ) : (
              <span>Đăng xuất</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
