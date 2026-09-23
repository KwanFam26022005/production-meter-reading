import React, { useEffect, useState } from 'react';
import { OperationalAssignmentBoard as Board, OperationalAssignmentCandidate, OperationalAssignmentPreview } from '../../types';
import { applyOperationalAssignments, cancelOperationalAssignment, getOperationalAssignmentBoard, previewOperationalAssignments } from '../../services/api';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const availabilityLabel: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng', PENDING_LEAVE: 'Đang chờ duyệt phép', UNASSIGNED_SHIFT: 'Chưa phân ca',
  OFF: 'Nghỉ', APPROVED_LEAVE: 'Nghỉ phép', SHIFT_MISMATCH: 'Khác ca', INACTIVE_USER: 'Ngừng hoạt động',
};

export const OperationalAssignmentBoard: React.FC = () => {
  const [date, setDate] = useState(today);
  const [shift, setShift] = useState('CA1');
  const [board, setBoard] = useState<Board | null>(null);
  const [candidate, setCandidate] = useState<OperationalAssignmentCandidate | null>(null);
  const [preview, setPreview] = useState<OperationalAssignmentPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try { setBoard(await getOperationalAssignmentBoard(date, shift)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể tải phân khu.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setCandidate(null); setPreview(null); void refresh(); }, [date, shift]);

  const inspect = async () => {
    if (!candidate) return;
    setError(null);
    setNotice(null);
    try { setPreview(await previewOperationalAssignments(date, shift, [candidate])); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể xem trước.'); }
  };

  const apply = async () => {
    if (!candidate || !preview || preview.conflict_count) return;
    setSaving(true);
    setError(null);
    try {
      await applyOperationalAssignments(date, shift, [candidate]);
      setCandidate(null);
      setPreview(null);
      setNotice('Đã lưu phân khu tác nghiệp.');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu phân khu.'); }
    finally { setSaving(false); }
  };

  const cancel = async (id: string) => {
    if (!window.confirm('Hủy phân khu này? Lịch sử sẽ được giữ lại.')) return;
    setSaving(true);
    try { await cancelOperationalAssignment(id, 'ADMIN_CANCELLED'); setNotice('Đã hủy phân khu.'); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể hủy phân khu.'); }
    finally { setSaving(false); }
  };

  return <section className="admin-surface-card operational-assignment-board" aria-label="Phân khu tác nghiệp">
    <h3>Phân khu tác nghiệp</h3>
    <p>Chọn ngày bắt đầu ca và ca làm việc. Chỉ nhân viên có lịch ca phù hợp mới được phân khu.</p>
    <div className="assignment-toolbar">
      <label>Ngày bắt đầu ca <input aria-label="Ngày phân khu" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>Ca làm việc <select aria-label="Ca phân khu" value={shift} onChange={e => setShift(e.target.value)}>
        <option value="CA1">CA1 · 06:00–14:00</option><option value="CA2">CA2 · 14:00–22:00</option>
        <option value="CA3">CA3 · 22:00–06:00</option><option value="HC">HC · 07:30–16:30</option>
      </select></label>
    </div>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <LoadingState message="Đang tải phân khu..." /> : board ? <>
      <p>Khung ca: {new Date(board.shift_start).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} – {new Date(board.shift_end).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      <div className="assignment-panel" aria-label="Nhân sự trong ca">
        <h4>Nhân sự và tình trạng</h4>
        <ul className="assignment-staff-list">{board.staff.map(person => <li key={person.id}>
          <strong>{person.full_name}</strong><span className={`assignment-state ${person.assignable ? 'is-available' : 'is-blocked'}`}>{availabilityLabel[person.state] || person.state}</span>
          {person.warning && <span className="assignment-warning">{person.warning}</span>}
        </li>)}</ul>
      </div>
      <div className="assignment-panel" aria-label="Danh sách khu vực">
        <h4>Khu vực</h4>
        {board.zones.map(zone => <article key={zone.id} className="assignment-zone-row">
          <h5>{zone.name}{!zone.is_active ? ' · Ngừng hoạt động' : ''}</h5>
          <p>Chính: {zone.assignments.find(item => item.assignment_role === 'PRIMARY')?.employee_name || 'Chưa phân công'}</p>
          <p>Hỗ trợ: {zone.assignments.filter(item => item.assignment_role === 'SUPPORT').map(item => item.employee_name).join(', ') || 'Chưa phân công'}</p>
          {zone.assignments.map(item => <div className="assignment-active-row" key={item.id}>{item.employee_name} · {item.assignment_role === 'PRIMARY' ? 'Chính' : 'Hỗ trợ'}{!item.actionable && <span className="assignment-warning">Không khả dụng trong ca này</span>}
            <button type="button" className="admin-btn-secondary" disabled={saving} onClick={() => void cancel(item.id)} aria-label={`Hủy phân khu ${item.employee_name} tại ${zone.name}`}>Hủy</button>
          </div>)}
          {zone.is_active && <div className="assignment-controls">
            <label>Vai trò <select aria-label={`Vai trò tại ${zone.name}`} value={candidate?.zone_id === zone.id ? candidate.assignment_role : 'PRIMARY'} onChange={e => { setPreview(null); setCandidate({ user_id: candidate?.zone_id === zone.id ? candidate.user_id : '', zone_id: zone.id, assignment_role: e.target.value as 'PRIMARY' | 'SUPPORT' }); }}>
              <option value="PRIMARY">Chính</option><option value="SUPPORT">Hỗ trợ</option>
            </select></label>
            <label>Nhân viên <select aria-label={`Nhân viên tại ${zone.name}`} value={candidate?.zone_id === zone.id ? candidate.user_id : ''} onChange={e => { setPreview(null); setCandidate({ user_id: e.target.value, zone_id: zone.id, assignment_role: candidate?.zone_id === zone.id ? candidate.assignment_role : 'PRIMARY' }); }}>
              <option value="">Chọn nhân viên</option>{board.staff.map(person => <option key={person.id} value={person.id} disabled={!person.assignable}>{person.full_name} · {availabilityLabel[person.state] || person.state}</option>)}
            </select></label>
            {candidate?.zone_id === zone.id && candidate.user_id && <button type="button" className="admin-btn-secondary" onClick={() => void inspect()}>Xem trước</button>}
          </div>}
        </article>)}
      </div>
      {preview && <div className="assignment-panel" role="status" aria-label="Xem trước phân khu">
        <h4>Xem trước phân khu</h4>
        {preview.items.map((item, index) => <p key={index}>{item.errors.join(' ') || 'Có thể phân khu.'} {item.warnings.join(' ')}</p>)}
        <button type="button" className="admin-btn-primary" disabled={saving || preview.conflict_count > 0} onClick={() => void apply()}>Xác nhận phân khu</button>
      </div>}
      {board.cancelled.length > 0 && <details><summary>Phân khu đã hủy ({board.cancelled.length})</summary><ul>{board.cancelled.map(item => <li key={item.id}>{item.zone_name} · {item.employee_name} · {item.cancel_reason}</li>)}</ul></details>}
    </> : <ErrorState message="Chưa tải được phân khu." onRetry={() => void refresh()} />}
  </section>;
};
