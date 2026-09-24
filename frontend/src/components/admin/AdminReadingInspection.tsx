import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ImageOff,
  AlertCircle,
  Zap,
  RotateCcw,
  Crop,
  Layers,
} from 'lucide-react';
import {
  AdminMeterReadingInspectionResponse,
  AdminInspectionBBox,
} from '../../types';
import {
  getAdminMeterReadingInspection,
  getAdminMeterReadingEvidenceUrl,
} from '../../services/api';
import { ImageViewerModal } from '../ImageViewerModal';
import { formatMeterTypeLabel } from '../../utils/meterMetadata';

interface AdminReadingInspectionProps {
  readingId: string;
  onBack: () => void;
  onSelectReading?: (readingId: string) => void;
}

// Robust client-side recognition crop generator
function generateRecognitionCropDataUrl(
  imageUrl: string,
  bbox: AdminInspectionBBox
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        // Use canonical normalized coordinates
        const sx = Math.max(0, Math.floor(bbox.norm_x1 * naturalW));
        const sy = Math.max(0, Math.floor(bbox.norm_y1 * naturalH));
        const sw = Math.min(naturalW - sx, Math.ceil(bbox.norm_width * naturalW));
        const sh = Math.min(naturalH - sy, Math.ceil(bbox.norm_height * naturalH));

        if (sw <= 0 || sh <= 0) {
          resolve(imageUrl);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(dataUrl);
      } catch {
        resolve(imageUrl);
      }
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

export const AdminReadingInspection: React.FC<AdminReadingInspectionProps> = ({
  readingId,
  onBack,
  onSelectReading,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminMeterReadingInspectionResponse | null>(null);
  const [activeView, setActiveView] = useState<'original' | 'roi'>('original');
  const [imageError, setImageError] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Recognition crop data URL
  const [cropDataUrl, setCropDataUrl] = useState<string | null>(null);
  const [cropLoading, setCropLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setImageError(false);
    setActiveView('original');
    setCropDataUrl(null);

    getAdminMeterReadingInspection(readingId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.detail || err?.message || 'Không thể tải thông tin bản ghi kiểm tra.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [readingId]);

  // Generate recognition crop when evidence is loaded
  useEffect(() => {
    if (!data?.evidence_available) return;
    const evidenceUrl = getAdminMeterReadingEvidenceUrl(data.reading_id);
    const recBbox = data.evidence?.recognition_bbox;

    if (recBbox) {
      setCropLoading(true);
      generateRecognitionCropDataUrl(evidenceUrl, recBbox)
        .then((url) => {
          setCropDataUrl(url);
          setCropLoading(false);
        })
        .catch(() => {
          setCropDataUrl(null);
          setCropLoading(false);
        });
    }
  }, [data]);

  // Keyboard navigation: Left Arrow (prev reading), Right Arrow (next reading)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft' && data?.prev_reading_id && onSelectReading) {
        e.preventDefault();
        onSelectReading(data.prev_reading_id);
      } else if (e.key === 'ArrowRight' && data?.next_reading_id && onSelectReading) {
        e.preventDefault();
        onSelectReading(data.next_reading_id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data?.prev_reading_id, data?.next_reading_id, onSelectReading]);

  if (loading) {
    return (
      <div className="admin-inspection-container">
        <div className="admin-inspection-header">
          <button type="button" className="admin-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          <div className="admin-inspection-title-group">
            <h2 className="admin-inspection-title">Kiểm tra bản ghi công tơ</h2>
            <span className="admin-inspection-subtitle">Đang tải dữ liệu kiểm tra...</span>
          </div>
        </div>
        <div className="admin-inspection-loading">
          <div className="admin-spinner" />
          <span>Đang tải thông tin bản ghi & ảnh nghiệp vụ...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-inspection-container">
        <div className="admin-inspection-header">
          <button type="button" className="admin-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          <div className="admin-inspection-title-group">
            <h2 className="admin-inspection-title">Kiểm tra bản ghi công tơ</h2>
          </div>
        </div>
        <div className="admin-inspection-error-card">
          <AlertCircle size={32} className="text-warning" />
          <h3 className="admin-error-heading">Không thể tải bản ghi</h3>
          <p className="admin-error-desc">{error || 'Không tìm thấy dữ liệu kiểm tra.'}</p>
          <button type="button" className="admin-btn-secondary" onClick={onBack}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const evidenceUrl = getAdminMeterReadingEvidenceUrl(data.reading_id);
  const recBbox = data.evidence?.recognition_bbox;
  const hasBbox = Boolean(recBbox || data.evidence?.localization_bbox || (data.roi_bbox && data.roi_bbox.length === 4));

  const formatConfirmationSource = (src?: string | null) => {
    if (src === 'USER_CORRECTED') return 'Đã hiệu chỉnh từ OCR';
    if (src === 'MANUAL_ENTRY') return 'Nhập thủ công';
    if (src === 'OCR_CONFIRMED') return 'Xác nhận từ OCR';
    return 'Chưa xác định';
  };

  const getSourceBadgeClass = (src?: string | null) => {
    if (src === 'USER_CORRECTED') return 'badge-corrected';
    if (src === 'MANUAL_ENTRY') return 'badge-manual';
    if (src === 'OCR_CONFIRMED') return 'badge-ocr';
    return 'badge-neutral';
  };

  const handlePrev = () => {
    if (data.prev_reading_id && onSelectReading) {
      onSelectReading(data.prev_reading_id);
    }
  };

  const handleNext = () => {
    if (data.next_reading_id && onSelectReading) {
      onSelectReading(data.next_reading_id);
    }
  };

  const getUnitDisplay = () => {
    const m = data?.meter;
    if (!m) return 'kWh';
    const unit = (m as any).measurement_unit;
    if (unit === 'KWH') return 'kWh';
    if (unit === 'M3') return 'm³';
    if (unit === 'UNKNOWN') return '';
    return '';
  };

  return (
    <div className="admin-inspection-container">
      {/* HEADER BAR */}
      <header className="admin-inspection-header">
        <div className="admin-inspection-header-left">
          <button
            type="button"
            className="admin-back-btn"
            onClick={onBack}
            aria-label="Quay lại"
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          <div className="admin-inspection-title-group">
            <div className="admin-inspection-title-row">
              <h2 className="admin-inspection-title">Kiểm tra bản ghi công tơ</h2>
              <span className={`admin-status-badge ${data.status === 'CONFIRMED' ? 'status-confirmed' : 'status-review'}`}>
                {data.status === 'CONFIRMED' ? 'ĐÃ XÁC NHẬN' : 'CẦN KIỂM TRA'}
              </span>
            </div>
            <div className="admin-inspection-context-line">
              <span className="context-meter-code">{data.meter.meter_code}</span>
              <span className="context-dot">·</span>
              <span className="context-meter-name">{data.meter.name}</span>
              <span className="context-dot">·</span>
              <span className="context-round">{data.round.scheduled_at_vn} · Lượt {data.round.scheduled_time}</span>
            </div>
          </div>
        </div>

        {/* TOP STEPPER ACTIONS */}
        <div className="admin-inspection-stepper-top">
          <button
            type="button"
            className="admin-stepper-btn"
            onClick={handlePrev}
            disabled={!data.prev_reading_id || !onSelectReading}
            title={data.prev_reading_id ? 'Xem lượt trước của công tơ này' : 'Không có lượt trước'}
          >
            <ChevronLeft size={16} />
            <span>Lượt trước</span>
          </button>
          <button
            type="button"
            className="admin-stepper-btn"
            onClick={handleNext}
            disabled={!data.next_reading_id || !onSelectReading}
            title={data.next_reading_id ? 'Xem lượt sau của công tơ này' : 'Không có lượt sau'}
          >
            <span>Lượt sau</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* DESKTOP SPLIT LAYOUT (65% IMAGE / 35% METADATA) */}
      <div className="admin-inspection-grid">
        {/* LEFT COLUMN: EVIDENCE IMAGE VIEW */}
        <section className="admin-inspect-image-card" aria-label="Ảnh nghiệp vụ thực tế">
          <div className="admin-inspect-image-header">
            <div className="image-header-title-row">
              <span className="image-header-title">ẢNH THỰC TẾ (CHỤP HIỆN TRƯỜNG)</span>
              {data.evidence_available && (
                <span className="image-evidence-tag">Đã lưu trữ an toàn</span>
              )}
            </div>

            <div className="image-header-controls">
              {data.evidence_available && hasBbox && (
                <div className="image-view-toggle-group">
                  <button
                    type="button"
                    className={`image-toggle-btn ${activeView === 'original' ? 'active' : ''}`}
                    onClick={() => setActiveView('original')}
                    title="Xem toàn bộ ảnh nghiệp vụ gốc"
                  >
                    <Layers size={13} style={{ marginRight: 4 }} />
                    <span>Ảnh gốc</span>
                  </button>
                  <button
                    type="button"
                    className={`image-toggle-btn ${activeView === 'roi' ? 'active' : ''}`}
                    onClick={() => setActiveView('roi')}
                    title="Xem vùng ảnh nhận dạng (crop)"
                  >
                    <Crop size={13} style={{ marginRight: 4 }} />
                    <span>Vùng đọc</span>
                  </button>
                </div>
              )}

              {data.evidence_available && !imageError && (
                <button
                  type="button"
                  className="admin-btn-fullscreen"
                  onClick={() => setIsModalOpen(true)}
                  title={activeView === 'roi' ? 'Phóng to vùng đọc nhận dạng' : 'Phóng to ảnh toàn màn hình'}
                >
                  <Maximize2 size={15} />
                  <span>Phóng to</span>
                </button>
              )}
            </div>
          </div>

          <div className="admin-inspect-image-canvas">
            {!data.evidence_available ? (
              <div className="admin-no-evidence-state">
                <div className="no-evidence-icon-wrap">
                  <ImageOff size={40} className="icon-muted" />
                </div>
                <h4 className="no-evidence-title">Không có ảnh nghiệp vụ cho bản ghi này.</h4>
                <p className="no-evidence-desc">
                  Bản ghi được tạo trước khi tính năng lưu ảnh kiểm tra được bật hoặc không kèm ảnh khi xác nhận.
                </p>
              </div>
            ) : imageError ? (
              <div className="admin-image-error-state">
                <AlertCircle size={36} className="text-warning" />
                <h4 className="image-error-title">Không thể tải ảnh kiểm tra.</h4>
                <p className="image-error-desc">Vui lòng kiểm tra lại quyền truy cập hoặc kết nối mạng.</p>
                <button
                  type="button"
                  className="admin-btn-retry"
                  onClick={() => setImageError(false)}
                >
                  <RotateCcw size={14} />
                  <span>Thử lại</span>
                </button>
              </div>
            ) : activeView === 'roi' ? (
              /* VÙNG ĐỌC MODE: ACTUAL RECOGNITION CROP ONLY */
              <div
                className="inspect-crop-wrapper"
                onClick={() => setIsModalOpen(true)}
                title="Nhấn để phóng to vùng đọc toàn màn hình"
              >
                {cropLoading ? (
                  <div className="admin-spinner" />
                ) : cropDataUrl ? (
                  <>
                    <div className="inspect-crop-frame">
                      <img
                        src={cropDataUrl}
                        alt="Vùng cắt nhận dạng chính thức"
                        className="inspect-crop-img"
                      />
                    </div>
                    <div className="inspect-crop-info-card">
                      {recBbox && (
                        <span className="inspect-crop-dims-badge">
                          {recBbox.width} × {recBbox.height} px
                        </span>
                      )}
                      <p className="inspect-crop-desc">
                        Vùng ảnh thực tế đưa vào mô hình nhận dạng PP-OCRv6-Medium (đã áp dụng đệm +5% và dịch ngang +2.5%).
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="admin-no-evidence-state">
                    <p className="no-evidence-desc">
                      Không có thông tin vùng đọc đáng tin cậy cho bản ghi này.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* ẢNH GỐC MODE: FULL ORIGINAL STORED EVIDENCE IMAGE ONLY (COMPLETELY UNTOUCHED) */
              <div
                className="inspect-img-wrapper"
                onClick={() => setIsModalOpen(true)}
                title="Nhấn để phóng to toàn màn hình"
              >
                <img
                  src={evidenceUrl}
                  alt={`Ảnh công tơ ${data.meter.meter_code} tại lượt ${data.round.scheduled_time} ngày ${data.round.scheduled_at_vn}`}
                  className="inspect-main-img"
                  onError={() => setImageError(true)}
                />
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: RECORD METADATA */}
        <section className="admin-inspect-meta-panel" aria-label="Thông tin chi tiết bản ghi">
          {/* 1. CHỈ SỐ CÔNG TƠ */}
          <div className="inspect-meta-card highlight-card">
            <div className="meta-card-header">
              <Zap size={16} className="icon-brand" />
              <h3 className="meta-card-title">Chỉ số công tơ</h3>
              <span className={`admin-source-pill ${getSourceBadgeClass(data.confirmation_source)}`}>
                {formatConfirmationSource(data.confirmation_source)}
              </span>
            </div>

            <div className="meta-card-body">
              {data.confirmation_source === 'USER_CORRECTED' ? (
                <div className="reading-comparison-box">
                  <div className="ocr-reading-row">
                    <span className="reading-label">OCR ban đầu:</span>
                    <span className="ocr-reading-val">{data.ocr_reading || '—'}</span>
                  </div>
                  <div className="reading-arrow-divider">
                    <span className="arrow-badge">↓ Đã hiệu chỉnh</span>
                  </div>
                  <div className="official-reading-row">
                    <span className="reading-label">Chính thức:</span>
                    <span className="official-reading-val font-mono">
                      {data.reading || '—'}{' '}
                      {getUnitDisplay() ? (
                        <span className="reading-unit">{getUnitDisplay()}</span>
                      ) : (
                        <span className="text-warning text-xs font-normal ml-1" title="Đơn vị chưa cấu hình">(Chưa cấu hình ĐV)</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : data.confirmation_source === 'MANUAL_ENTRY' ? (
                <div className="reading-comparison-box">
                  <div className="official-reading-row">
                    <span className="reading-label">Chỉ số chính thức:</span>
                    <span className="official-reading-val font-mono">
                      {data.reading || '—'}{' '}
                      {getUnitDisplay() ? (
                        <span className="reading-unit">{getUnitDisplay()}</span>
                      ) : (
                        <span className="text-warning text-xs font-normal ml-1" title="Đơn vị chưa cấu hình">(Chưa cấu hình ĐV)</span>
                      )}
                    </span>
                  </div>
                  <div className="ocr-reading-row mt-2">
                    <span className="reading-label">OCR ban đầu:</span>
                    <span className="ocr-reading-none">Không có (Nhập tay)</span>
                  </div>
                </div>
              ) : (
                <div className="reading-comparison-box">
                  <div className="official-reading-row">
                    <span className="reading-label">Chỉ số chính thức:</span>
                    <span className="official-reading-val font-mono">
                      {data.reading || '—'}{' '}
                      {getUnitDisplay() ? (
                        <span className="reading-unit">{getUnitDisplay()}</span>
                      ) : (
                        <span className="text-warning text-xs font-normal ml-1" title="Đơn vị chưa cấu hình">(Chưa cấu hình ĐV)</span>
                      )}
                    </span>
                  </div>
                  {data.ocr_reading && (
                    <div className="ocr-reading-row mt-2">
                      <span className="reading-label">OCR ban đầu:</span>
                      <span className="ocr-reading-val">{data.ocr_reading}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. THÔNG SỐ CÔNG TƠ & VẬN HÀNH */}
          <div className="inspect-meta-card">
            <div className="meta-card-header">
              <h3 className="meta-card-title">Thông số công tơ</h3>
            </div>
            <div className="meta-card-body">
              <dl className="inspect-dl-grid">
                <dt>Mã công tơ:</dt>
                <dd className="font-mono font-bold text-navy">{data.meter.meter_code}</dd>
                <dt>Tên tài sản:</dt>
                <dd>{data.meter.name}</dd>
                <dt>Vị trí:</dt>
                <dd>{data.meter.location}</dd>
                <dt>Chủng loại:</dt>
                <dd>{formatMeterTypeLabel(data.meter.meter_type, true)}</dd>
                <dt>Tiện ích & Đơn vị:</dt>
                <dd>
                  {(data.meter as any).utility_type === 'WATER'
                    ? 'Nước · m³'
                    : (data.meter as any).utility_type === 'ELECTRICITY'
                    ? 'Điện · kWh'
                    : (data.meter as any).measurement_unit === 'UNKNOWN'
                    ? <span className="text-warning text-xs font-semibold">(Chưa cấu hình ĐV)</span>
                    : (data.meter as any).measurement_unit || 'Chưa xác định'}
                </dd>
                {(data.meter as any).register_semantics && (
                  <>
                    <dt>Kiểu ghi:</dt>
                    <dd>
                      {(data.meter as any).register_semantics === 'CUMULATIVE'
                        ? 'Lũy kế (CUMULATIVE)'
                        : (data.meter as any).register_semantics === 'INTERVAL'
                        ? 'Khoảng (INTERVAL)'
                        : (data.meter as any).register_semantics}
                    </dd>
                  </>
                )}
                <dt>Trạng thái thiết bị:</dt>
                <dd>
                  <span className={`status-pill ${data.meter.is_active ? 'active' : 'inactive'}`}>
                    {data.meter.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </span>
                </dd>
              </dl>
            </div>
          </div>

          {/* 3. LỊCH TRÌNH & KIỂM TOÁN TÁC NGHIỆP */}
          <div className="inspect-meta-card">
            <div className="meta-card-header">
              <h3 className="meta-card-title">Lịch trình & Tác nghiệp</h3>
            </div>
            <div className="meta-card-body">
              <dl className="inspect-dl-grid">
                <dt>Lịch ghi:</dt>
                <dd className="font-medium">{data.round.scheduled_at_vn} · Lượt {data.round.scheduled_time}</dd>
                <dt>Ghi nhận lúc:</dt>
                <dd className="text-slate-700">{data.recorded_at_vn || 'Chưa ghi nhận'}</dd>
                <dt>Nhân viên:</dt>
                <dd>
                  {data.operator ? (
                    <span>
                      {data.operator.full_name}{' '}
                      <span className="text-muted font-mono text-xs">({data.operator.employee_code})</span>
                    </span>
                  ) : (
                    <span className="text-muted italic">Chưa xác định</span>
                  )}
                </dd>
                {data.pipeline_version && (
                  <>
                    <dt>Phiên bản AI:</dt>
                    <dd className="font-mono text-xs text-slate-500">{data.pipeline_version}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          {/* 4. ĐIỀU HƯỚNG LƯỢT TRƯỚC / LƯỢT SAU */}
          <div className="inspect-stepper-card">
            <span className="stepper-card-title">Điều hướng bản ghi cùng công tơ</span>
            <div className="stepper-btn-group">
              <button
                type="button"
                className="admin-stepper-btn-lg"
                onClick={handlePrev}
                disabled={!data.prev_reading_id || !onSelectReading}
              >
                <ChevronLeft size={16} />
                <span>Lượt trước</span>
              </button>
              <button
                type="button"
                className="admin-stepper-btn-lg"
                onClick={handleNext}
                disabled={!data.next_reading_id || !onSelectReading}
              >
                <span>Lượt sau</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* FULLSCREEN IMAGE MODAL WITH PAN/ZOOM */}
      {data.evidence_available && (
        <ImageViewerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={activeView === 'roi' && cropDataUrl ? cropDataUrl : evidenceUrl}
          title={
            activeView === 'roi'
              ? `VÙNG ĐỌC NHẬN DẠNG: ${data.meter.meter_code} (${data.round.scheduled_time} ${data.round.scheduled_at_vn})`
              : `ẢNH THỰC TẾ (CHỤP HIỆN TRƯỜNG): ${data.meter.meter_code} (${data.round.scheduled_time} ${data.round.scheduled_at_vn})`
          }
          subtitle={
            activeView === 'roi'
              ? `Vùng cắt thực tế chuyển vào mô hình nhận dạng PP-OCRv6-Medium (${recBbox ? `${recBbox.width} × ${recBbox.height} px` : ''})`
              : `Chỉ số chính thức: ${data.reading || '—'} ${getUnitDisplay()} · Nguồn: ${formatConfirmationSource(data.confirmation_source)}`
          }
        />
      )}
    </div>
  );
};
