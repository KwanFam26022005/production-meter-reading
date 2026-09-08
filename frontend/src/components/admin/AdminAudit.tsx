import React, { useEffect, useState } from 'react';
import {
  ScrollText,
  RefreshCw,
  Info,
  X,
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
        return <span className="admin-badge badge-active">Kích hoạt lại công tơ</span>;
      case 'READING_ROUNDS_CREATED':
        return <span className="admin-badge badge-active">Tạo lịch đọc</span>;
      default:
        return <span className="admin-badge">{action}</span>;
    }
  };

  const renderJsonSummary = (beforeStr?: string | null, afterStr?: string | null) => {
    try {
      if (!beforeStr && !afterStr) return <span className="text-muted">—</span>;
      const after = afterStr ? JSON.parse(afterStr) : null;
      const before = beforeStr ? JSON.parse(beforeStr) : null;

      if (after && !before) {
        // Created item
        if (after.meter_code) {
          return <span>Tạo mới: <strong>{after.meter_code}</strong> ({after.name})</span>;
        }
        if (after.date && after.count) {
          return <span>Tạo <strong>{after.count} lượt</strong> ngày {after.date}</span>;
        }
      }

      if (before && after) {
        // Updated item
        const changes: string[] = [];
        for (const k of Object.keys(after)) {
          if (before[k] !== after[k]) {
            changes.push(`${k}: ${before[k]} → ${after[k]}`);
          }
        }
        if (changes.length > 0) {
          return <span className="font-mono text-xs">{changes.join(', ')}</span>;
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
            <table className="admin-table" aria-label="Bảng nhật ký thao tác quản trị">
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
                    <td className="font-mono text-sm">{log.created_at_local}</td>
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

            <div className="admin-modal-footer">
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
