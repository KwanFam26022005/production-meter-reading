import React, { useState } from 'react';
import { Sparkles, X, AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import { AdminAutoPatternPreviewResponse } from '../../../types';
import { previewAutoPatternAdminRoster } from '../../../services/api';
import { formatVietnameseMonth } from './rosterUtils';

interface AutoPatternDialogProps {
  currentMonth: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: (patternType: string) => Promise<void>;
  applying: boolean;
}

export const AutoPatternDialog: React.FC<AutoPatternDialogProps> = ({
  currentMonth,
  isOpen,
  onClose,
  onApply,
  applying,
}) => {
  const [step, setStep] = useState<'SELECT' | 'PREVIEW'>('SELECT');
  const [patternType, setPatternType] = useState<string>('THREE_SHIFT_FOUR_TEAM');
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<AdminAutoPatternPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchPreview = async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const data = await previewAutoPatternAdminRoster(currentMonth, [], patternType);
      setPreviewData(data);
      setStep('PREVIEW');
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : 'Không thể tải bản xem trước tác động.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmApply = async () => {
    await onApply(patternType);
    setStep('SELECT');
    setPreviewData(null);
  };

  return (
    <div className="roster-modal-backdrop">
      <div className="roster-modal-content" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div className="roster-modal-header">
          <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} />
            <span>Phân ca kíp tự động — {formatVietnameseMonth(currentMonth)}</span>
          </h4>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
            aria-label="Đóng hộp thoại"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="roster-modal-body">
          {previewError && (
            <div className="admin-alert-banner alert-danger" style={{ marginBottom: '12px' }}>
              <AlertTriangle size={15} />
              <span>{previewError}</span>
            </div>
          )}

          {step === 'SELECT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '12.5px', color: 'var(--sgp-ink-secondary)', margin: 0 }}>
                Chọn chu kỳ kíp trực chuẩn để tính toán trước tác động phân ca cho toàn bộ nhân sự trong{' '}
                <strong>{formatVietnameseMonth(currentMonth)}</strong>:
              </p>

              {/* 3 Ca 4 Kíp Choice */}
              <div
                className={`roster-pattern-choice ${patternType === 'THREE_SHIFT_FOUR_TEAM' ? 'selected' : ''}`}
                onClick={() => setPatternType('THREE_SHIFT_FOUR_TEAM')}
                style={{ cursor: 'pointer', padding: '12px', border: '1px solid var(--sgp-border)', borderRadius: 'var(--radius-sm)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="pattern"
                    value="THREE_SHIFT_FOUR_TEAM"
                    checked={patternType === 'THREE_SHIFT_FOUR_TEAM'}
                    onChange={() => setPatternType('THREE_SHIFT_FOUR_TEAM')}
                  />
                  <strong style={{ color: 'var(--sgp-brand-800)', fontSize: '13px' }}>
                    Chu kỳ Cảng biển: 3 ca 4 kíp
                  </strong>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--sgp-ink-secondary)', margin: '6px 0 0 24px' }}>
                  Luân phiên: Ca 1 → Ca 2 → Ca 3 → Nghỉ OFF. Lệch kíp theo nhân sự để duy trì trạm trực 24/7.
                </p>
              </div>

              {/* Hành chính Choice */}
              <div
                className={`roster-pattern-choice ${patternType === 'STANDARD_WEEKDAY' ? 'selected' : ''}`}
                onClick={() => setPatternType('STANDARD_WEEKDAY')}
                style={{ cursor: 'pointer', padding: '12px', border: '1px solid var(--sgp-border)', borderRadius: 'var(--radius-sm)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="pattern"
                    value="STANDARD_WEEKDAY"
                    checked={patternType === 'STANDARD_WEEKDAY'}
                    onChange={() => setPatternType('STANDARD_WEEKDAY')}
                  />
                  <strong style={{ color: 'var(--sgp-brand-800)', fontSize: '13px' }}>
                    Chu kỳ Hành chính: Thứ 2 – Thứ 6
                  </strong>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--sgp-ink-secondary)', margin: '6px 0 0 24px' }}>
                  Ca Hành chính (07:30 – 16:30) từ Thứ 2 đến Thứ 6; Thứ 7 & CN nghỉ OFF.
                </p>
              </div>
            </div>
          )}

          {step === 'PREVIEW' && previewData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--sgp-ink)' }}>
                Dự báo tác động khi áp dụng chu kỳ{' '}
                <strong>{patternType === 'THREE_SHIFT_FOUR_TEAM' ? '3 ca 4 kíp' : 'Hành chính'}</strong>:
              </div>

              {/* Statistics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  background: '#F8FAFC',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--sgp-border)',
                }}
              >
                <div style={{ fontSize: '11.5px' }}>
                  <div style={{ color: 'var(--sgp-ink-muted)' }}>Lượt ca thay đổi:</div>
                  <strong style={{ fontSize: '14px', color: 'var(--sgp-brand-800)' }}>
                    {previewData.changed_count}
                  </strong>{' '}
                  / {previewData.total_assignments}
                </div>

                <div style={{ fontSize: '11.5px' }}>
                  <div style={{ color: 'var(--sgp-ink-muted)' }}>Lượt ca giữ nguyên:</div>
                  <strong style={{ fontSize: '14px', color: '#15803D' }}>
                    {previewData.unchanged_count}
                  </strong>
                </div>

                <div style={{ fontSize: '11.5px' }}>
                  <div style={{ color: 'var(--sgp-ink-muted)' }}>Xung đột phép đã duyệt:</div>
                  <strong
                    style={{
                      fontSize: '14px',
                      color: previewData.leave_conflicts_count > 0 ? '#DC2626' : '#15803D',
                    }}
                  >
                    {previewData.leave_conflicts_count}
                  </strong>
                </div>

                <div style={{ fontSize: '11.5px' }}>
                  <div style={{ color: 'var(--sgp-ink-muted)' }}>Cảnh báo nghỉ chuyển ca:</div>
                  <strong
                    style={{
                      fontSize: '14px',
                      color: previewData.insufficient_rest_count > 0 ? '#B45309' : '#15803D',
                    }}
                  >
                    {previewData.insufficient_rest_count}
                  </strong>
                </div>
              </div>

              {(previewData.assignment_impact_count || 0) > 0 && <p role="status">
                {previewData.assignment_impact_count} phân khu tác nghiệp sẽ được hủy vì đổi ca. Cần phân khu lại sau khi áp dụng.
              </p>}

              {/* Alert if conflicts exist */}
              {previewData.leave_conflicts_count > 0 && (
                <div
                  style={{
                    padding: '8px 10px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    color: '#991B1B',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    <strong>Cảnh báo:</strong> Có {previewData.leave_conflicts_count} ngày nhân viên đã được duyệt nghỉ phép nhưng chu kỳ này vẫn xếp ca trực.
                  </span>
                </div>
              )}

              {/* Sample Changes */}
              {previewData.sample_changes.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 650, color: 'var(--sgp-ink-muted)', marginBottom: '4px' }}>
                    Ví dụ các ca sẽ thay đổi:
                  </div>
                  <div
                    style={{
                      maxHeight: '110px',
                      overflowY: 'auto',
                      fontSize: '11px',
                      border: '1px solid var(--sgp-border)',
                      borderRadius: 'var(--radius-sm)',
                      background: '#FFFFFF',
                    }}
                  >
                    {previewData.sample_changes.slice(0, 5).map((s, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '4px 8px',
                          borderBottom: '1px solid #F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>
                          {s.full_name} ({s.work_date})
                        </span>
                        <span style={{ fontWeight: 650 }}>
                          {s.old_shift} → <strong style={{ color: 'var(--sgp-brand-800)' }}>{s.new_shift}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="roster-modal-footer">
          {step === 'SELECT' ? (
            <>
              <button type="button" onClick={onClose} className="admin-btn-secondary">
                Hủy
              </button>
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={loadingPreview}
                className="admin-btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {loadingPreview ? (
                  <span>Đang tính toán...</span>
                ) : (
                  <>
                    <span>Xem trước tác động</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('SELECT')}
                className="admin-btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ChevronLeft size={14} />
                <span>Quay lại</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                disabled={applying}
                className="admin-btn-primary"
                style={{ backgroundColor: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {applying ? (
                  <span>Đang áp dụng...</span>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Xác nhận áp dụng</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
