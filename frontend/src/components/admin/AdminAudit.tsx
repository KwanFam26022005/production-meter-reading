import React, { useEffect, useState } from 'react';
import {
  ScrollText,
  RefreshCw,
  Info,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { AdminAuditLogItem, AdminAuditLogListResponse } from '../../types';
import { getAdminAuditLogs } from '../../services/api';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';

export const AdminAudit: React.FC = () => {
  const [data, setData] = useState<AdminAuditLogListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('ALL');

  // Selected Log Modal for deep payload inspection
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogItem | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyJson = () => {
    if (!selectedLog) return;
    try {
      const payload = {
        id: selectedLog.id,
        timestamp: selectedLog.created_at_local,
        actor: `${selectedLog.actor_full_name} (${selectedLog.actor_employee_code || ''})`,
        action: selectedLog.action,
        resource: `${selectedLog.resource_type} (${selectedLog.resource_id || ''})`,
        before: selectedLog.before_json ? JSON.parse(selectedLog.before_json) : null,
        after: selectedLog.after_json ? JSON.parse(selectedLog.after_json) : null,
      };
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminAuditLogs(
        selectedAction === 'ALL' ? undefined : selectedAction,
        selectedResourceType === 'ALL' ? undefined : selectedResourceType,
        100,
        0
      );
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải nhật ký quản trị.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [selectedAction, selectedResourceType]);

  const formatActionLabel = (action: string) => {
    switch (action) {
      case 'METER_CREATED':
        return <span className="admin-badge badge-active">Tạo công tơ</span>;
      case 'METER_UPDATED':
        return <span className="admin-badge badge-info">Sửa công tơ</span>;
      case 'METER_DEACTIVATED':
        return <span className="admin-badge badge-warning">Ngừng dùng công tơ</span>;
      case 'METER_ACTIVATED':
        return <span className="admin-badge badge-active">Kích hoạt lại</span>;
      case 'METER_RELOCATED':
        return <span className="admin-badge badge-info">Di chuyển công tơ</span>;
      case 'METER_ZONE_CHANGED':
        return <span className="admin-badge badge-info">Đổi khu vực công tơ</span>;
      case 'METER_RETIRED':
        return <span className="admin-badge badge-warning">Ngừng sử dụng công tơ</span>;
      case 'METER_HARD_DELETED':
        return <span className="admin-badge badge-danger">Xóa công tơ</span>;
      case 'READING_ROUNDS_CREATED':
        return <span className="admin-badge badge-active">Tạo lịch ghi</span>;
      case 'READING_ROUND_CANCELLED':
        return <span className="admin-badge badge-warning">Hủy lượt ghi</span>;
      case 'READING_ROUND_DELETED':
        return <span className="admin-badge badge-danger">Xóa lượt ghi</span>;
      case 'READING_ROUNDS_BATCH_CLEANED':
        return <span className="admin-badge badge-warning">Dọn đợt lịch ghi</span>;
      case 'WORK_SCHEDULE_CREATED':
      case 'SCHEDULE_CREATED':
        return <span className="admin-badge badge-active">Tạo lịch ca</span>;
      case 'WORK_SCHEDULE_MODIFIED':
      case 'SCHEDULE_MODIFIED':
      case 'UPDATE_SCHEDULE':
        return <span className="admin-badge badge-info">Sửa lịch ca</span>;
      case 'ASSIGNMENT_CREATED':
      case 'OPERATIONAL_ASSIGNMENT_CREATED':
        return <span className="admin-badge badge-active">Phân công</span>;
      case 'ASSIGNMENT_UPDATED':
        return <span className="admin-badge badge-info">Sửa phân công</span>;
      case 'ASSIGNMENT_CANCELLED':
      case 'OPERATIONAL_ASSIGNMENT_CANCELLED':
        return <span className="admin-badge badge-warning">Hủy phân công</span>;
      case 'LEAVE_APPROVED':
        return <span className="admin-badge badge-active">Duyệt phép</span>;
      case 'LEAVE_REJECTED':
        return <span className="admin-badge badge-danger">Từ chối phép</span>;
      default:
        return <span className="admin-badge badge-info">{action}</span>;
    }
  };

  const FIELD_LABELS: Record<string, string> = {
    name: 'Tên',
    location: 'Vị trí',
    meter_type: 'Loại',
    is_active: 'Trạng thái',
    status: 'Trạng thái',
    shift_code: 'Ca',
    zone_id: 'Khu vực',
    work_date: 'Ngày',
    role: 'Vai trò',
    notes: 'Ghi chú',
    measurement_unit: 'Đơn vị',
    utility_type: 'Tiện ích',
    register_semantics: 'Kiểu ghi',
  };

  const renderJsonSummary = (beforeStr?: string | null, afterStr?: string | null) => {
    try {
      if (!beforeStr && !afterStr) return <span className="text-muted">—</span>;
      const after = afterStr ? JSON.parse(afterStr) : null;
      const before = beforeStr ? JSON.parse(beforeStr) : null;

      if (after && !before) {
        if (after.meter_code) {
          return <span>Tạo mới: <strong className="font-mono font-semibold">{after.meter_code}</strong> ({after.name})</span>;
        }
        if (after.date && after.count) {
          return <span>Tạo <strong className="font-tabular">{after.count} lượt</strong> ngày {after.date}</span>;
        }
        if (after.user_id && after.role && after.zone_id) {
          return <span>Phân công <strong>{after.role}</strong>: {after.zone_id} · {after.shift_code || '—'} · {after.work_date || '—'}</span>;
        }
        if (after.employee_code) {
          return <span>Phân công: <strong className="font-mono">{after.employee_code}</strong> ({after.shift_code || ''})</span>;
        }
        return <span className="text-muted">Khởi tạo dữ liệu</span>;
      }

      if (before && !after && before.round_id && before.date) {
        return <span>Xóa lượt ngày <strong>{before.date}</strong> lúc {before.scheduled_time || '—'}</span>;
      }

      if (before && after) {
        const changes: string[] = [];
        for (const k of Object.keys(after)) {
          if (before[k] !== after[k]) {
            const label = FIELD_LABELS[k] || k;
            const bVal = String(before[k] ?? '—');
            const aVal = String(after[k] ?? '—');
            changes.push(`${label}: ${bVal} → ${aVal}`);
          }
        }
        if (changes.length > 0) {
          return <span className="font-mono text-xs">{changes.join('; ')}</span>;
        }
      }

      return <span className="text-muted">Cập nhật dữ liệu</span>;
    } catch {
      return <span className="text-muted">Chi tiết thay đổi</span>;
    }
  };

  return (
    <div className="admin-page-container">
      {/* PAGE HEADER */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 className="admin-page-title">Nhật ký quản trị</h1>
          <p className="admin-page-subtitle">
            Ghi nhận toàn bộ thao tác thay đổi dữ liệu danh mục và lịch trình của quản trị viên
          </p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="admin-toolbar-card">
        <div className="admin-toolbar-filters">
          <select
            className="admin-select"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            aria-label="Lọc theo loại hành động"
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="METER_CREATED">Tạo mới công tơ (METER_CREATED)</option>
            <option value="METER_UPDATED">Cập nhật công tơ (METER_UPDATED)</option>
            <option value="METER_DEACTIVATED">Ngừng sử dụng công tơ (METER_DEACTIVATED)</option>
            <option value="METER_ACTIVATED">Kích hoạt lại công tơ (METER_ACTIVATED)</option>
            <option value="READING_ROUNDS_CREATED">Tạo lịch đọc (READING_ROUNDS_CREATED)</option>
          </select>

          <select
            className="admin-select"
            value={selectedResourceType}
            onChange={(e) => setSelectedResourceType(e.target.value)}
            aria-label="Lọc theo đối tượng"
          >
            <option value="ALL">Tất cả đối tượng</option>
            <option value="METER">Công tơ (METER)</option>
            <option value="READING_ROUNDS">Lượt ghi (READING_ROUNDS)</option>
          </select>

          <button
            type="button"
            className="admin-btn-secondary btn-icon-only"
            onClick={loadAuditLogs}
            disabled={loading}
            title="Làm mới"
            aria-label="Làm mới danh sách"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="admin-toolbar-meta">
          <span className="text-sm text-muted">Tổng cộng {data?.total || 0} bản ghi</span>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      {loading ? (
        <LoadingState message="Đang tải nhật ký quản trị..." />
      ) : error ? (
        <ErrorState
          title="Không thể tải nhật ký"
          message={error}
          onRetry={loadAuditLogs}
        />
      ) : !data || data.logs.length === 0 ? (
        <EmptyState
          title="Chưa có nhật ký nào"
          message="Chưa có thao tác quản trị nào được ghi nhận phù hợp với bộ lọc."
        />
      ) : (
        <div className="admin-surface-card table-card">
          <div className="admin-table-container">
            <table className="admin-table admin-table-compact" aria-label="Bảng nhật ký thao tác quản trị">
              <thead>
                <tr>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Người thực hiện</th>
                  <th scope="col">Hành động</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">Nội dung thay đổi</th>
                  <th scope="col" className="text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-sm font-tabular">{log.created_at_local}</td>
                    <td>
                      <div className="admin-user-cell">
                        <span className="font-medium">{log.actor_full_name}</span>
                        {log.actor_employee_code && (
                          <span className="text-xs text-muted">({log.actor_employee_code})</span>
                        )}
                      </div>
                    </td>
                    <td>{formatActionLabel(log.action)}</td>
                    <td>
                      <span className="admin-type-badge font-mono">{log.resource_type}</span>
                    </td>
                    <td className="text-sm">{renderJsonSummary(log.before_json, log.after_json)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="admin-btn-secondary btn-sm"
                        onClick={() => setSelectedLog(log)}
                        aria-label="Xem chi tiết bản ghi"
                      >
                        <Info size={13} />
                        <span>Xem</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON INSPECTION MODAL */}
      {selectedLog && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-box modal-wide">
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <ScrollText size={20} className="text-brand" />
                <h2 className="admin-modal-title">Chi tiết bản ghi nhật ký</h2>
              </div>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={() => setSelectedLog(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-audit-meta-grid">
                <div>
                  <span className="meta-label">Thời gian:</span>
                  <span className="meta-value">{selectedLog.created_at_local}</span>
                </div>
                <div>
                  <span className="meta-label">Người thực hiện:</span>
                  <span className="meta-value">{selectedLog.actor_full_name} ({selectedLog.actor_employee_code || '---'})</span>
                </div>
                <div>
                  <span className="meta-label">Hành động:</span>
                  <span className="meta-value">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="meta-label">Đối tượng:</span>
                  <span className="meta-value">{selectedLog.resource_type} (ID: {selectedLog.resource_id || '---'})</span>
                </div>
              </div>

              {selectedLog.before_json && (
                <div className="admin-json-viewer-box">
                  <span className="json-box-title">Dữ liệu trước thay đổi (Before):</span>
                  <pre className="admin-json-code">
                    {JSON.stringify(JSON.parse(selectedLog.before_json), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_json && (
                <div className="admin-json-viewer-box" style={{ marginTop: '12px' }}>
                  <span className="json-box-title">Dữ liệu sau thay đổi (After):</span>
                  <pre className="admin-json-code">
                    {JSON.stringify(JSON.parse(selectedLog.after_json), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="admin-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="admin-btn-secondary btn-sm"
                onClick={handleCopyJson}
                title="Sao chép toàn bộ payload nhật ký"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSelectedLog(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
