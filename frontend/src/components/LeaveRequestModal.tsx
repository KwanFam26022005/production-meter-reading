import React, { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { createLeaveRequest } from '../services/api';
import { LeaveRequestCreatePayload } from '../types';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}) => {
  const getTodayStr = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  };

  const [leaveType, setLeaveType] = useState<string>('ANNUAL');
  const [startDate, setStartDate] = useState<string>(initialDate || getTodayStr());
  const [endDate, setEndDate] = useState<string>(initialDate || getTodayStr());
  const [shiftCode, setShiftCode] = useState<string>('ALL');
  const [reason, setReason] = useState<string>('');
  const [substituteId, setSubstituteId] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      setErrorMsg('Vui lòng chọn ngày bắt đầu nghỉ.');
      return;
    }
    if (endDate && endDate < startDate) {
      setErrorMsg('Ngày kết thúc không được nhỏ hơn ngày bắt đầu.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do xin nghỉ phép.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload: LeaveRequestCreatePayload = {
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate || startDate,
      shift_code: shiftCode,
      reason: reason.trim(),
      substitute_user_id: substituteId.trim() ? substituteId.trim() : null,
    };

    try {
      await createLeaveRequest(payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi đơn xin nghỉ phép.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="roster-modal-backdrop">
      <div
        className="roster-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-modal-title"
      >
        {/* Header */}
        <div className="roster-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} />
            <h3 id="leave-modal-title" style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              Tạo đơn xin nghỉ phép / đổi ca
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="roster-modal-body">
            {errorMsg && (
              <div className="admin-alert-banner alert-danger" style={{ margin: 0 }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Loại phép */}
            <div className="admin-form-group">
              <label className="admin-form-label">
                Loại nghỉ phép <span className="required-star">*</span>
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="admin-form-select"
              >
                <option value="ANNUAL">Phép năm (Nghỉ hưởng lương định kỳ)</option>
                <option value="COMPENSATORY">Nghỉ bù (Trực tăng ca, tàu hàng cập cảng)</option>
                <option value="PERSONAL_PAID">Việc riêng có hưởng lương (Hiếu, hỉ)</option>
                <option value="PERSONAL_UNPAID">Việc riêng không hưởng lương</option>
                <option value="SICK">Nghỉ ốm / Khám chữa bệnh</option>
              </select>
            </div>

            {/* Ngày bắt đầu - Ngày kết thúc */}
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Từ ngày <span className="required-star">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  required
                  className="admin-form-input font-tabular"
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Đến ngày <span className="required-star">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="admin-form-input font-tabular"
                />
              </div>
            </div>

            {/* Ca làm việc xin nghỉ */}
            <div className="admin-form-group">
              <label className="admin-form-label">
                Ca làm việc xin nghỉ
              </label>
              <select
                value={shiftCode}
                onChange={(e) => setShiftCode(e.target.value)}
                className="admin-form-select"
              >
                <option value="ALL">Cả ngày (Toàn bộ ca làm trong ngày)</option>
                <option value="CA1">Chỉ Ca 1 (Sáng: 06:00 - 14:00)</option>
                <option value="CA2">Chỉ Ca 2 (Chiều: 14:00 - 22:00)</option>
                <option value="CA3">Chỉ Ca 3 (Đêm: 22:00 - 06:00)</option>
                <option value="HC">Ca Hành chính (07:30 - 16:30)</option>
              </select>
            </div>

            {/* Lý do xin nghỉ */}
            <div className="admin-form-group">
              <label className="admin-form-label">
                Lý do xin nghỉ phép <span className="required-star">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ghi rõ lý do xin nghỉ để gửi Ban Điều hành / Tổ trưởng duyệt..."
                required
                className="admin-form-input"
                style={{ height: 'auto', minHeight: '75px', padding: '8px 10px', resize: 'vertical' }}
              />
            </div>

            {/* Người trực thay (tùy chọn) */}
            <div className="admin-form-group">
              <label className="admin-form-label">
                Mã / Tên đồng nghiệp trực thay (tùy chọn)
              </label>
              <input
                type="text"
                value={substituteId}
                onChange={(e) => setSubstituteId(e.target.value)}
                placeholder="Nhập mã nhân viên hoặc tên đồng nghiệp hỗ trợ trực ca..."
                className="admin-form-input"
              />
            </div>

            {/* Ghi chú */}
            <div style={{ padding: '10px 12px', background: 'var(--sgp-brand-050)', border: '1px solid var(--sgp-border)', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', color: 'var(--sgp-brand-800)', lineHeight: '1.4' }}>
              💡 <strong>Quy định:</strong> Đơn xin phép thông thường nên gửi trước ca trực ít nhất 24 giờ để Tổ điều hành sắp xếp người trực thay thế.
            </div>
          </div>

          {/* Actions */}
          <div className="roster-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="admin-btn-secondary"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="admin-btn-primary"
            >
              {submitting ? 'Đang gửi...' : 'Gửi đơn phê duyệt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
