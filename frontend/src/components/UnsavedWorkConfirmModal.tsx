import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface UnsavedWorkConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UnsavedWorkConfirmModal: React.FC<UnsavedWorkConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="logout-modal-card"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        aria-describedby="unsaved-desc"
      >
        <div className="logout-modal-header">
          <div
            className="logout-modal-icon-wrap"
            style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}
          >
            <AlertTriangle size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 id="unsaved-title" className="logout-modal-title">
              Hủy kết quả chưa lưu?
            </h2>
            <p id="unsaved-desc" className="logout-modal-desc">
              Bạn đang có kết quả đọc công tơ chưa xác nhận. Dữ liệu này sẽ bị hủy nếu quay lại danh sách.
            </p>
          </div>
        </div>

        <div className="logout-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            aria-label="Tiếp tục ghi chỉ số công tơ này"
          >
            Tiếp tục ghi
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            style={{ backgroundColor: '#ea580c', borderColor: '#c2410c' }}
            aria-label="Thoát và hủy kết quả tạm thời"
          >
            Thoát
          </button>
        </div>
      </div>
    </div>
  );
};
