import React, { useState } from 'react';
import { Filter, Check, X } from 'lucide-react';
import { LeaveRequestItem } from '../../../types';
import { LoadingState } from '../../ui/LoadingState';

interface LeaveRequestsPanelProps {
  leaveRequests: LeaveRequestItem[];
  leaveFilter: string;
  onFilterChange: (filter: string) => void;
  onReview: (requestId: string, action: 'APPROVED' | 'REJECTED', note?: string) => Promise<void>;
  loading: boolean;
  reviewingId: string | null;
}

export const LeaveRequestsPanel: React.FC<LeaveRequestsPanelProps> = ({
  leaveRequests,
  leaveFilter,
  onFilterChange,
  onReview,
  loading,
  reviewingId,
}) => {
  const [reviewNoteModal, setReviewNoteModal] = useState<{ id: string; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const handleConfirmReject = async () => {
    if (!reviewNoteModal) return;
    await onReview(reviewNoteModal.id, 'REJECTED', rejectReason);
    setReviewNoteModal(null);
    setRejectReason('');
  };

  return (
    <div className="admin-leaves-card">
      {/* Filters Bar */}
      <div className="admin-leaves-filter-bar">
        <div className="admin-filter-chips">
          <Filter size={15} style={{ color: 'var(--sgp-ink-muted)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sgp-ink-secondary)' }}>
            Lọc theo trạng thái:
          </span>
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onFilterChange(st)}
              className={`admin-filter-chip ${leaveFilter === st ? 'active' : ''}`}
            >
              {st === 'ALL' ? 'Tất cả' : st === 'PENDING' ? 'Chờ duyệt' : st === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState message="Đang tải danh sách đơn xin nghỉ phép..." />
      ) : leaveRequests.length === 0 ? (
        <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--sgp-ink-muted)', fontSize: '13px' }}>
          Không tìm thấy đơn xin nghỉ phép nào theo tiêu chí lọc.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--sgp-border)' }}>
          <table className="admin-leaves-table">
            <thead>
              <tr>
                <th>Nhân viên gửi</th>
                <th>Thời gian xin nghỉ</th>
                <th>Ca làm việc</th>
                <th>Loại phép & Lý do</th>
                <th>Người trực thay</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center', width: '160px' }}>Thao tác duyệt</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((req) => {
                let statusBadge = (
                  <span className="status-badge status-badge-pending">
                    Chờ Admin duyệt
                  </span>
                );
                if (req.status === 'APPROVED') {
                  statusBadge = (
                    <span className="status-badge status-badge-approved">
                      <Check size={12} /> Đã duyệt
                    </span>
                  );
                } else if (req.status === 'REJECTED') {
                  statusBadge = (
                    <span className="status-badge status-badge-rejected">
                      <X size={12} /> Từ chối
                    </span>
                  );
                } else if (req.status === 'CANCELLED') {
                  statusBadge = (
                    <span className="status-badge status-badge-cancelled">
                      Đã hủy
                    </span>
                  );
                }

                return (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--sgp-ink)' }}>
                        {req.user?.full_name || 'Nhân viên'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--sgp-ink-muted)' }}>
                        {req.user?.employee_code} · {req.user?.role}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--sgp-ink)' }}>
                      {req.start_date === req.end_date ? req.start_date : `${req.start_date} → ${req.end_date}`}
                    </td>
                    <td>
                      <span className="admin-roster-cell-pill shift-tag-hc">
                        {req.shift_code === 'ALL' ? 'Cả ngày' : req.shift_code}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <span className="admin-legend-pill shift-tag-ca1" style={{ marginBottom: '4px' }}>
                        {req.leave_type_label}
                      </span>
                      <p style={{ color: 'var(--sgp-ink-secondary)', margin: '4px 0 0', fontSize: '12px' }}>
                        {req.reason}
                      </p>
                    </td>
                    <td>
                      {req.substitute_user ? (
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--sgp-ink)' }}>
                            {req.substitute_user.full_name}
                          </span>
                          <div style={{ fontSize: '10px', color: 'var(--sgp-ink-muted)' }}>
                            {req.substitute_user.employee_code}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--sgp-ink-muted)', fontStyle: 'italic' }}>Không chỉ định</span>
                      )}
                    </td>
                    <td>{statusBadge}</td>
                    <td style={{ textAlign: 'center' }}>
                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => onReview(req.id, 'APPROVED')}
                            disabled={reviewingId === req.id}
                            className="btn-approve-sm"
                          >
                            <Check size={14} /> Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewNoteModal({ id: req.id, action: 'REJECTED' })}
                            disabled={reviewingId === req.id}
                            className="btn-reject-sm"
                          >
                            <X size={14} /> Từ chối
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--sgp-ink-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                          Đã xử lý
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Reason Modal */}
      {reviewNoteModal && (
        <div className="roster-modal-backdrop">
          <div className="roster-modal-content" style={{ maxWidth: '400px' }}>
            <div className="roster-modal-header" style={{ backgroundColor: 'var(--sgp-danger)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Từ chối đơn xin nghỉ phép</h4>
              <button
                type="button"
                onClick={() => setReviewNoteModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="roster-modal-body">
              <p style={{ fontSize: '12.5px', color: 'var(--sgp-ink-secondary)' }}>
                Vui lòng nhập lý do từ chối để phản hồi lại cho nhân viên:
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Ca trực thiếu nhân sự đối soát chỉ số công tơ..."
                className="admin-form-input"
                style={{ height: 'auto', minHeight: '80px', padding: '8px' }}
              />
            </div>
            <div className="roster-modal-footer">
              <button
                type="button"
                onClick={() => setReviewNoteModal(null)}
                className="admin-btn-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="admin-btn-primary"
                style={{ backgroundColor: 'var(--sgp-danger)' }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
