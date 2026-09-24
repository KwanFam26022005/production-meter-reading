import React, { useState } from 'react';
import type { ReportingOperationsResponse, ReportingTask } from '../../types';

interface Props {
  data: ReportingOperationsResponse;
  view: 'overview' | 'actions';
  integrityCount: number;
  onOpenActions: () => void;
  onSelectMeter: (meterId: string) => void;
  onInspectReading?: (readingId: string) => void;
}

const actionLabel: Record<string, string> = {
  UNASSIGNED_DUE: 'Chưa phân công',
  OVERDUE_MISSING: 'Chưa ghi',
  REVIEW: 'Cần kiểm tra',
  DATA_INTEGRITY: 'Toàn vẹn dữ liệu',
};

function localDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
}

function age(value: string): string {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3600000));
  return hours < 24 ? `${hours} giờ` : `${Math.floor(hours / 24)} ngày`;
}

function Responsibility({ task }: { task: ReportingTask }) {
  return <>
    <span>{task.assigned.length ? task.assigned.map(a => `${a.name} (${a.role})`).join(', ') : 'Chưa phân công'}</span>
    <small className="reporting-secondary">Đã ghi: {task.executor_name || '—'}</small>
  </>;
}

export function selectOperationalDrillTasks(tasks: ReportingTask[], filter: 'due' | 'confirmed'): ReportingTask[] {
  return tasks.filter(task => filter === 'confirmed' ? task.status === 'CONFIRMED' : task.status !== 'UPCOMING');
}

export const ReportingOperationsWorkspace: React.FC<Props> = ({ data, view, integrityCount, onOpenActions, onSelectMeter, onInspectReading }) => {
  const [expandedRound, setExpandedRound] = useState<string | null>(null);
  const [drillFilter, setDrillFilter] = useState<'due' | 'confirmed' | null>(null);
  const s = data.summary;
  if (view === 'actions') {
    return <div className="admin-tech-content">
      <div className="admin-surface-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Việc cần xử lý</h2>
          <span className="text-muted text-xs">Chưa phân công → Chưa ghi → Cần kiểm tra; cũ nhất trước</span>
        </div>
        {integrityCount > 0 && <p className="reporting-integrity-note" role="status">
          Toàn vẹn dữ liệu: {integrityCount} cảnh báo. Xem chi tiết kiểm tra tại Chất lượng OCR.
        </p>}
        {data.actions.length === 0 ? <p className="reporting-empty">Không có việc cần xử lý trong kỳ.</p> :
          <div className="admin-table-container">
            <table className="admin-table admin-tech-table" aria-label="Hàng đợi việc cần xử lý">
              <thead><tr><th scope="col">Loại</th><th scope="col">Lượt / Ca</th><th scope="col">Khu vực</th><th scope="col">Công tơ</th><th scope="col">Đã đến hạn</th><th scope="col">Phụ trách / Thực hiện</th><th scope="col">Chi tiết</th></tr></thead>
              <tbody>{data.actions.map((task, i) => <tr key={`${task.round_id}-${task.meter_code}-${i}`}>
                <td><span className="reporting-action-type">{actionLabel[task.type] || task.type}</span>
                  {task.type === 'UNASSIGNED_DUE' && <small className="reporting-secondary">{task.status === 'REVIEW' ? 'Chỉ số cần kiểm tra' : task.status === 'MISSING' ? 'Chưa ghi' : 'Đã ghi; thiếu phân công'}</small>}
                  {task.reason && <small className="reporting-secondary">{task.reason}</small>}</td>
                <td>{localDate(task.scheduled_at)}<small className="reporting-secondary">{task.shift_code || '—'} · {task.scope_mode === 'LEGACY_DYNAMIC' ? 'Phạm vi động' : 'Snapshot'}</small></td>
                <td>{task.zone_name}</td><td className="font-mono">{task.meter_code}</td>
                <td>{age(task.scheduled_at)}</td><td><Responsibility task={task} /></td>
                <td>{task.reading_id && onInspectReading ?
                  <button type="button" className="admin-btn-table-action" onClick={() => onInspectReading(task.reading_id!)}>Xem bản ghi</button> :
                  task.meter_id ? <button type="button" className="admin-btn-table-action" onClick={() => onSelectMeter(task.meter_id!)}>Xem công tơ</button> : '—'}</td>
              </tr>)}</tbody>
            </table>
          </div>}
      </div>
    </div>;
  }
  return <div className="admin-tech-content">
    <div className="admin-tech-metric-strip-4 reporting-kpis" aria-label="Tổng quan điều hành">
      <button type="button" className="admin-tech-kpi-card reporting-kpi-button" aria-expanded={drillFilter === 'due'} onClick={() => setDrillFilter(drillFilter === 'due' ? null : 'due')}>
        <span className="tech-kpi-label">Đến hạn</span><strong className="tech-kpi-val font-tabular">{s.due} / {s.scheduled}</strong>
        <span className="tech-kpi-sub">{s.scheduled_rounds} lượt ghi đã lên lịch</span>
      </button>
      <button type="button" className="admin-tech-kpi-card reporting-kpi-button" aria-expanded={drillFilter === 'confirmed'} onClick={() => setDrillFilter(drillFilter === 'confirmed' ? null : 'confirmed')}>
        <span className="tech-kpi-label">Hoàn tất</span><strong className="tech-kpi-val font-tabular">{s.confirmed} / {s.due}</strong>
        <span className="tech-kpi-sub">{s.completion_percent}% lượt đến hạn</span>
      </button>
      <button type="button" className="admin-tech-kpi-card reporting-kpi-button" onClick={onOpenActions}>
        <span className="tech-kpi-label">Chưa phân công</span><strong className="tech-kpi-val font-tabular">{s.unassigned_due}</strong>
        <span className="tech-kpi-sub">{s.unassigned_zone_count} khu vực · Coverage {s.coverage_percent}%</span>
      </button>
      <button type="button" className="admin-tech-kpi-card reporting-kpi-button" onClick={onOpenActions}>
        <span className="tech-kpi-label">Cần xử lý</span><strong className="tech-kpi-val font-tabular">{data.actions.length}</strong>
        <span className="tech-kpi-sub">{s.missing} chưa ghi · {s.review} cần kiểm tra</span>
      </button>
    </div>
    {drillFilter && <div className="admin-surface-card">
      <div className="admin-card-header"><h2 className="admin-card-title">{drillFilter === 'confirmed' ? 'Bản ghi đã hoàn tất' : 'Việc đã đến hạn'}</h2>
        <button type="button" className="admin-btn-table-action" onClick={() => setDrillFilter(null)}>Thu gọn</button></div>
      <div className="admin-table-container"><table className="admin-table admin-tech-table" aria-label={drillFilter === 'confirmed' ? 'Bản ghi đã hoàn tất' : 'Việc đã đến hạn'}>
        <thead><tr><th scope="col">Lượt</th><th scope="col">Khu vực</th><th scope="col">Công tơ</th><th scope="col">Trạng thái</th><th scope="col">Phụ trách / Thực hiện</th><th scope="col">Bằng chứng</th></tr></thead>
        <tbody>{selectOperationalDrillTasks(data.tasks, drillFilter).map(task =>
          <tr key={`${task.round_id}-${task.meter_code}`}><td>{localDate(task.scheduled_at)}</td><td>{task.zone_name}</td><td className="font-mono">{task.meter_code}</td>
            <td>{task.status === 'CONFIRMED' ? 'Đã hoàn tất' : task.status === 'REVIEW' ? 'Cần kiểm tra' : 'Chưa ghi'}</td>
            <td><Responsibility task={task} /></td><td>{task.reading_id && onInspectReading ?
              <button type="button" className="admin-btn-table-action" onClick={() => onInspectReading(task.reading_id!)}>Xem bản ghi</button> :
              task.meter_id ? <button type="button" className="admin-btn-table-action" onClick={() => onSelectMeter(task.meter_id!)}>Xem công tơ</button> : '—'}</td>
          </tr>)}</tbody>
      </table></div>
    </div>}
    {s.legacy_dynamic_count > 0 && <p className="reporting-note" role="status">{s.legacy_dynamic_count} meter-round dùng phạm vi động LEGACY_DYNAMIC; không có snapshot lịch sử.</p>}
    <div className="admin-surface-card">
      <div className="admin-card-header"><h2 className="admin-card-title">Tiến độ theo lượt · khu vực · ca</h2><span className="text-muted text-xs">Chọn hàng để xem công tơ trong phạm vi</span></div>
      {data.breakdown.length === 0 ? <p className="reporting-empty">Chưa có lượt ghi được lên lịch trong kỳ.</p> :
        <div className="admin-table-container"><table className="admin-table admin-tech-table" aria-label="Tiến độ lượt và khu vực">
          <thead><tr><th scope="col">Lượt</th><th scope="col">Khu vực</th><th scope="col">Ca</th><th scope="col">Phạm vi</th><th scope="col">Đến hạn</th><th scope="col">Hoàn tất</th><th scope="col">Chưa phân công</th><th scope="col">Chưa ghi / Kiểm tra</th><th scope="col">Công tơ</th></tr></thead>
          <tbody>{data.breakdown.map(row => {
            const key = `${row.round_id}:${row.zone_id}`;
            const tasks = data.tasks.filter(t => t.round_id === row.round_id && t.zone_id === row.zone_id);
            return <React.Fragment key={key}><tr>
              <td>{localDate(row.scheduled_at)}<small className="reporting-secondary">{row.scope_mode === 'LEGACY_DYNAMIC' ? 'Phạm vi động' : 'Snapshot'}</small></td>
              <td>{row.zone_name}</td><td>{row.shift_codes.join(' / ') || '—'}</td><td>{row.scheduled}</td><td>{row.due}</td>
              <td>{row.confirmed} / {row.due}</td><td>{row.unassigned_due}</td><td>{row.missing} / {row.review}</td>
              <td><button type="button" className="admin-btn-table-action" aria-expanded={expandedRound === key} onClick={() => setExpandedRound(expandedRound === key ? null : key)}>{expandedRound === key ? 'Thu gọn' : 'Xem việc'}</button></td>
            </tr>{expandedRound === key && <tr><td colSpan={9}><div className="reporting-task-list">{tasks.map(task => <div key={`${task.round_id}-${task.meter_code}`}>
              <strong>{task.meter_code}</strong> · {task.status === 'UPCOMING' ? 'Sắp đến hạn' : task.status === 'CONFIRMED' ? 'Đã hoàn tất' : task.status === 'REVIEW' ? 'Cần kiểm tra' : 'Chưa ghi'} · <Responsibility task={task} />
              {task.reading_id && onInspectReading && <button type="button" className="admin-btn-table-action" onClick={() => onInspectReading(task.reading_id!)}>Xem bản ghi</button>}
            </div>)}</div></td></tr>}</React.Fragment>;
          })}</tbody>
        </table></div>}
    </div>
  </div>;
};
