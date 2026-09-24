import React, { useState } from 'react';
import type { ReportingOperationsResponse, UsageMeterResponse, UsageOverviewResponse } from '../../types';

export function unitLabel(unit: string): string {
  return unit === 'KWH' ? 'kWh' : unit === 'M3' ? 'm³' : 'Đơn vị chưa cấu hình';
}
export function rateLabel(unit: string): string {
  return unit === 'KW' ? 'kW' : unit === 'M3/H' ? 'm³/h' : 'Đơn vị chưa cấu hình';
}
const number = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const time = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
const qualityLabel: Record<string, string> = {
  INSUFFICIENT_DATA: 'Chưa đủ chỉ số', NON_NUMERIC_READING: 'Chỉ số không phải số',
  UNKNOWN_REGISTER_SEMANTICS: 'Chưa cấu hình ngữ nghĩa thanh ghi', UNKNOWN_UNIT: 'Đơn vị chưa cấu hình',
  INTERVAL_REGISTER_NOT_DERIVED: 'Thanh ghi theo khoảng chưa được tính như chỉ số tích lũy',
  RESET_OR_ROLLOVER_SUSPECTED: 'Nghi đặt lại hoặc vòng số; cần đối soát',
  INVALID_INTERVAL: 'Khoảng thời gian không hợp lệ', INCOMPATIBLE_METADATA: 'Đơn vị không khớp tiện ích lịch sử',
};

interface Props {
  data: UsageOverviewResponse | null;
  loading: boolean;
  error: string | null;
  operations: ReportingOperationsResponse | null;
  utilityType: string;
  zoneId: string;
  meterId: string;
  onUtility: (value: string) => void;
  onZone: (value: string) => void;
  onMeter: (value: string) => void;
  onPreset: (preset: 'today' | '7days' | '30days') => void;
  onSelectMeter: (meterId: string) => void;
}

export const ReportingUsageWorkspace: React.FC<Props> = ({ data, loading, error, operations, utilityType, zoneId, meterId, onUtility, onZone, onMeter, onPreset, onSelectMeter }) => {
  const [mode, setMode] = useState<'interval' | 'baseline' | 'heatmap'>('interval');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const zones = operations?.available_zones || [];
  const meters = data?.available_meters || [];
  const group = data?.groups.find(g => g.utility_type === utilityType && g.measurement_unit === selectedUnit) || data?.groups.find(g => g.utility_type === utilityType);
  const unit = group?.measurement_unit || 'UNKNOWN';
  const physical = unit !== 'UNKNOWN' && group?.total_delta !== null && group?.total_delta !== undefined;
  const rows = (data?.series || []).filter(row => row.utility_type === utilityType && row.measurement_unit === unit);
  const intervals = (data?.intervals || []).filter(row => row.utility_type === utilityType && row.measurement_unit === unit && row.quality_status === 'VALID');
  const max = Math.max(1, ...rows.map(row => row.delta));
  const days = [...new Set(rows.map(row => row.date))];
  const slots = [...new Set(rows.map(row => row.slot))].sort();
  const slotMap = new Map(rows.map(row => [`${row.date}|${row.slot}`, row]));
  const highest = group?.highest_interval;
  return <div className="admin-tech-content">
    <div className="admin-toolbar-card reporting-usage-controls" role="search" aria-label="Bộ lọc tiêu thụ">
      <div className="admin-date-presets" role="group" aria-label="Khoảng phân tích tiêu thụ">
        <button type="button" className="admin-preset-btn" onClick={() => onPreset('today')}>Hôm nay</button>
        <button type="button" className="admin-preset-btn" onClick={() => onPreset('7days')}>7 ngày</button>
        <button type="button" className="admin-preset-btn" onClick={() => onPreset('30days')}>30 ngày</button>
      </div>
      <label>Tiện ích <select className="admin-select admin-select-sm" value={utilityType} onChange={e => { onUtility(e.target.value); onMeter(''); setSelectedUnit(''); }}>
        <option value="ELECTRICITY">Điện</option><option value="WATER">Nước</option>
      </select></label>
      <label>Khu vực <select className="admin-select admin-select-sm" value={zoneId} onChange={e => { onZone(e.target.value); onMeter(''); }}>
        <option value="ALL">Tất cả khu vực</option>{zones.map(zone => <option value={zone.id} key={zone.id}>{zone.name}</option>)}
      </select></label>
      <label>Công tơ <select className="admin-select admin-select-sm" value={meterId} onChange={e => onMeter(e.target.value)}>
        <option value="">Tất cả công tơ</option>{meters.map(meter => <option value={meter.id} key={meter.id}>{meter.code}</option>)}
      </select></label>
      {data && data.groups.filter(g => g.utility_type === utilityType).length > 1 && <label>Đơn vị <select className="admin-select admin-select-sm" value={unit} onChange={e => setSelectedUnit(e.target.value)}>
        {data.groups.filter(g => g.utility_type === utilityType).map(g => <option key={g.measurement_unit} value={g.measurement_unit}>{unitLabel(g.measurement_unit)}</option>)}
      </select></label>}
    </div>
    {loading && <p className="reporting-note" role="status">Đang tải phân tích tiêu thụ…</p>}
    {error && <p className="reporting-error" role="alert">{error}</p>}
    {data && <>
      <p className="reporting-note">Độ phân giải: {data.resolution} Các khoảng được tính giữa hai chỉ số đã xác nhận.</p>
      {!physical ? (
        <div className="admin-surface-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--sgp-warning-bg, #FFF4DF)', color: 'var(--sgp-warning, #A86200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              ℹ
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--sgp-corporate-navy, #003875)' }}>
                Mức độ sẵn sàng dữ liệu tiêu thụ &amp; dao động
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--sgp-corporate-gray, #5E5B5B)' }}>
                Cần tối thiểu 2 chỉ số xác nhận liên tiếp và cấu hình đơn vị đo chuẩn để phân tích tiêu thụ vật lý.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', padding: '12px', background: 'var(--sgp-canvas, #F8F9FA)', borderRadius: '6px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--sgp-corporate-gray, #5E5B5B)', display: 'block' }}>Công tơ cấu hình hợp lệ</span>
              <strong style={{ fontSize: '15px', fontWeight: 600 }}>{group ? `${group.coverage.meters_with_valid_interval} / ${group.coverage.eligible_meters}` : '0 công tơ'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--sgp-corporate-gray, #5E5B5B)', display: 'block' }}>Trạng thái đơn vị đo</span>
              <strong style={{ fontSize: '13px', fontWeight: 600, color: unit === 'UNKNOWN' ? 'var(--sgp-warning, #A86200)' : 'var(--sgp-success, #167A5A)' }}>
                {unit === 'UNKNOWN' ? 'Đơn vị chưa cấu hình · Chưa đủ dữ liệu' : unitLabel(unit)}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--sgp-corporate-gray, #5E5B5B)', display: 'block' }}>Độ phủ khoảng hợp lệ</span>
              <strong style={{ fontSize: '15px', fontWeight: 600 }}>{group?.coverage.coverage_percent ?? 0}%</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--sgp-corporate-gray, #5E5B5B)', display: 'block' }}>Lịch sử so sánh nền</span>
              <strong style={{ fontSize: '12px', fontWeight: 500, color: 'var(--sgp-corporate-gray, #5E5B5B)' }}>Cần tối thiểu 3 khoảng cùng khung giờ</strong>
            </div>
          </div>
          {unit === 'UNKNOWN' && (
            <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--sgp-warning, #A86200)' }}>
              ⚠️ Lưu ý: Một số công tơ chưa được cấu hình đơn vị đo (measurement_unit = UNKNOWN). Chênh lệch chỉ số gốc không được tính thành tiêu thụ vật lý cho đến khi xác nhận đơn vị.
            </p>
          )}
        </div>
      ) : (
        <div className="admin-tech-metric-strip-4 reporting-kpis" aria-label="Tổng quan tiêu thụ">
          <div className="admin-tech-kpi-card"><span className="tech-kpi-label">Tiêu thụ / Delta</span>
            <strong className="tech-kpi-val font-tabular">{number(group!.total_delta!)} {unitLabel(unit)}</strong>
            <span className="tech-kpi-sub">{group.coverage.meters_with_valid_interval}/{group.coverage.eligible_meters} công tơ có khoảng hợp lệ</span></div>
          <div className="admin-tech-kpi-card"><span className="tech-kpi-label">Khoảng cao nhất</span>
            <strong className="tech-kpi-val font-tabular">{highest?.delta != null ? `${number(highest.delta)} ${unitLabel(unit)}` : '—'}</strong>
            <span className="tech-kpi-sub">{highest ? `${time(highest.from_scheduled_at)} – ${time(highest.to_scheduled_at)}` : 'Chưa có khoảng hợp lệ'}</span></div>
          <div className="admin-tech-kpi-card"><span className="tech-kpi-label">So với nền</span>
            <strong className="tech-kpi-val font-tabular">{group?.deviation_percent != null ? `${group.deviation_percent > 0 ? '+' : ''}${group.deviation_percent}%` : 'Chưa đủ lịch sử'}</strong>
            <span className="tech-kpi-sub">Trung vị tối thiểu 3 khoảng cùng khung giờ trong 7 ngày trước</span></div>
          <div className="admin-tech-kpi-card"><span className="tech-kpi-label">Chất lượng dữ liệu</span>
            <strong className="tech-kpi-val font-tabular">{group.coverage.meters_with_valid_interval} / {group.coverage.eligible_meters}</strong>
            <span className="tech-kpi-sub">Coverage {group.coverage.coverage_percent ?? 0}% · {data.data_quality.RESET_OR_ROLLOVER_SUSPECTED || 0} cần kiểm tra</span></div>
        </div>
      )}
      {Object.entries(data.data_quality).some(([status, count]) => status !== 'VALID' && count > 0) && <p className="reporting-note" role="status">
        Chất lượng khoảng: {Object.entries(data.data_quality).filter(([status, count]) => status !== 'VALID' && count > 0).map(([status, count]) => `${count} ${qualityLabel[status] || status}`).join(' · ')}.
      </p>}
      <div className="admin-surface-card">
        <div className="admin-card-header"><h2 className="admin-card-title">Tiêu thụ và dao động theo lượt ghi</h2>
          <div className="reporting-view-switch" role="group" aria-label="Kiểu phân tích tiêu thụ">
            {([['interval', 'Tiêu thụ theo khoảng'], ['baseline', 'So với nền'], ['heatmap', '7/30 ngày']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} className={`admin-tech-tab ${mode === id ? 'active' : ''}`} onClick={() => setMode(id)}>{label}</button>)}
          </div></div>
        <div className="admin-card-body">
          {!physical || rows.length === 0 ? <p className="reporting-empty">Chưa có khoảng tiêu thụ hợp lệ cho tiện ích và đơn vị đã chọn.</p> :
            mode === 'interval' ? <div className="reporting-bars" role="list" aria-label="Tiêu thụ theo khoảng">
              {rows.map(row => <div className="reporting-bar-row" role="listitem" key={`${row.date}-${row.slot}`}>
                <span>{row.date} · {row.slot}</span><div className="reporting-bar-track" aria-hidden="true"><div style={{ width: `${Math.max(2, row.delta / max * 100)}%` }} /></div>
                <strong>{number(row.delta)} {unitLabel(unit)}</strong><small>{row.contributor_count} công tơ</small>
              </div>)}</div> : mode === 'baseline' ? <div className="admin-table-container"><table className="admin-table admin-tech-table" aria-label="Dao động so với nền">
              <thead><tr><th scope="col">Khoảng</th><th scope="col">Thực tế</th><th scope="col">Nền trung vị</th><th scope="col">Chênh lệch</th><th scope="col">Dao động</th></tr></thead>
              <tbody>{intervals.map(row => <tr key={row.to_reading_id}><td>{time(row.from_scheduled_at)} – {time(row.to_scheduled_at)}</td><td>{number(row.delta!)} {unitLabel(unit)}</td><td>{row.baseline_delta == null ? 'Chưa đủ lịch sử' : `${number(row.baseline_delta)} ${unitLabel(unit)}`}</td><td>{row.difference == null ? '—' : number(row.difference)}</td><td>{row.deviation_percent == null ? '—' : `${row.deviation_percent > 0 ? '+' : ''}${row.deviation_percent}%`}</td></tr>)}</tbody>
            </table></div> : <div className="reporting-heatmap-scroll"><table className="reporting-heatmap" aria-label="Bảng nhiệt tiêu thụ theo ngày và khung ghi">
              <thead><tr><th scope="col">Ngày</th>{slots.map(slot => <th scope="col" key={slot}>{slot}</th>)}</tr></thead>
              <tbody>{days.map(day => <tr key={day}><th scope="row">{day}</th>{slots.map(slot => { const row = slotMap.get(`${day}|${slot}`); return <td key={slot} className={row ? 'has-value' : ''} title={row ? `${number(row.delta)} ${unitLabel(unit)} · ${row.contributor_count} công tơ` : 'Không có dữ liệu'}>{row ? number(row.delta) : '—'}</td>; })}</tr>)}</tbody>
            </table></div>}
        </div>
      </div>
      <div className="admin-surface-card"><div className="admin-card-header"><h2 className="admin-card-title">Công tơ đóng góp</h2><span className="text-muted text-xs">Cùng tiện ích và đơn vị; chỉ khoảng hợp lệ</span></div>
        {data.zone_breakdown.filter(row => row.utility_type === utilityType && row.measurement_unit === unit).length > 0 &&
          <div className="admin-table-container"><table className="admin-table admin-tech-table" aria-label="Tiêu thụ theo khu vực và coverage">
            <thead><tr><th scope="col">Khu vực</th><th scope="col">Tiêu thụ</th><th scope="col">Công tơ đủ dữ liệu</th><th scope="col">Coverage</th></tr></thead>
            <tbody>{data.zone_breakdown.filter(row => row.utility_type === utilityType && row.measurement_unit === unit).map(row => <tr key={`${row.zone_id}-${row.measurement_unit}`}>
              <td>{row.zone_name}</td><td>{row.total_delta == null ? '—' : `${number(row.total_delta)} ${unitLabel(unit)}`}</td>
              <td>{row.coverage.meters_with_valid_interval} / {row.coverage.eligible_meters}</td><td>{row.coverage.coverage_percent}%</td>
            </tr>)}</tbody>
          </table></div>}
        {data.top_contributors.filter(row => row.utility_type === utilityType && row.measurement_unit === unit).length ? <div className="admin-table-container"><table className="admin-table admin-tech-table" aria-label="Công tơ đóng góp tiêu thụ"><thead><tr><th scope="col">Công tơ</th><th scope="col">Khu vực</th><th scope="col">Tiêu thụ</th><th scope="col">Chi tiết</th></tr></thead><tbody>
          {data.top_contributors.filter(row => row.utility_type === utilityType && row.measurement_unit === unit).map(row => <tr key={row.meter_id}><td>{row.meter_code}</td><td>{row.zone_name}</td><td>{number(row.delta)} {unitLabel(unit)}</td><td><button type="button" className="admin-btn-table-action" onClick={() => onSelectMeter(row.meter_id)}>Xem công tơ</button></td></tr>)}
        </tbody></table></div> : <p className="reporting-empty">Chưa có công tơ đủ dữ liệu.</p>}
      </div>
    </>}
  </div>;
};

export const ReportingMeterUsage: React.FC<{ data: UsageMeterResponse | null; onInspectReading?: (id: string) => void }> = ({ data, onInspectReading }) => {
  const [view, setView] = useState<'consumption' | 'rate' | 'raw'>('consumption');
  if (!data) return null;
  const valid = data.intervals.filter(row => row.quality_status === 'VALID');
  const display = view === 'raw' ? data.points : valid;
  return <div className="admin-surface-card">
    <div className="admin-card-header"><h2 className="admin-card-title">Chỉ số và tiêu thụ theo công tơ</h2><span className="text-muted text-xs">{data.register_semantics === 'CUMULATIVE' ? 'Chỉ số tích lũy' : data.register_semantics === 'INTERVAL' ? 'Thanh ghi theo khoảng' : 'Ngữ nghĩa thanh ghi chưa cấu hình'} · {unitLabel(data.measurement_unit)}</span></div>
    <div className="reporting-view-switch" role="group" aria-label="Góc nhìn công tơ">
      {([['consumption', 'Tiêu thụ'], ['rate', 'Tốc độ'], ['raw', 'Chỉ số gốc']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={view === id} className={`admin-tech-tab ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>{label}</button>)}
    </div>
    {data.measurement_unit === 'UNKNOWN' && <p className="reporting-note">Đơn vị chưa cấu hình; chỉ số gốc vẫn có thể xem và kiểm toán.</p>}
    {display.length === 0 ? <p className="reporting-empty">{data.points.length < 2 ? 'Cần ít nhất hai chỉ số đã xác nhận để tính khoảng.' : 'Chưa có khoảng hợp lệ với cấu hình hiện tại.'}</p> :
      <div className="admin-table-container"><table className="admin-table admin-tech-table" aria-label={view === 'raw' ? 'Chỉ số gốc' : 'Khoảng sử dụng công tơ'}>
        <thead><tr><th scope="col">Thời điểm</th><th scope="col">{view === 'raw' ? 'Chỉ số gốc' : view === 'rate' ? data.measurement_unit === 'KWH' ? 'Công suất trung bình trong khoảng' : 'Lưu lượng trung bình' : 'Tiêu thụ theo khoảng'}</th><th scope="col">Chất lượng</th><th scope="col">Bản ghi</th></tr></thead>
        <tbody>{view === 'raw' ? data.points.map(point => <tr key={point.reading_id}><td>{time(point.scheduled_at)}</td><td>{point.value} {data.measurement_unit !== 'UNKNOWN' ? unitLabel(data.measurement_unit) : ''}</td><td>{point.confirmation_source}</td><td>{onInspectReading && <button type="button" className="admin-btn-table-action" onClick={() => onInspectReading(point.reading_id)}>Xem bản ghi</button>}</td></tr>) : valid.map(row => <tr key={row.to_reading_id}><td>{time(row.from_scheduled_at)} – {time(row.to_scheduled_at)}</td><td>{view === 'rate' ? row.normalized_rate == null ? 'Đơn vị chưa cấu hình' : `${number(row.normalized_rate)} ${rateLabel(row.rate_unit || '')}` : `${number(row.delta!)} ${unitLabel(row.measurement_unit)}`}</td><td>Hợp lệ</td><td>{onInspectReading && <><button type="button" className="admin-btn-table-action" onClick={() => onInspectReading(row.from_reading_id)}>Chỉ số đầu</button> <button type="button" className="admin-btn-table-action" onClick={() => onInspectReading(row.to_reading_id)}>Chỉ số cuối</button></>}</td></tr>)}</tbody>
      </table></div>}
    {data.intervals.some(row => row.quality_status !== 'VALID') && <p className="reporting-note" role="status">Khoảng cần xem xét: {[...new Set(data.intervals.filter(row => row.quality_status !== 'VALID').map(row => qualityLabel[row.quality_status] || row.quality_status))].join(', ')}. Hai chỉ số gốc được giữ để kiểm toán.</p>}
  </div>;
};
