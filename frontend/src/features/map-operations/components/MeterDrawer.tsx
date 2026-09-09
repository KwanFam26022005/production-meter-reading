import React from 'react';
import {
  X,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  FileCheck,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { MapMeterItem } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';

interface MeterDrawerProps {
  meter: MapMeterItem;
  onClose: () => void;
  onInspectReading?: (readingId: string) => void;
}

export const MeterDrawer: React.FC<MeterDrawerProps> = ({
  meter,
  onClose,
  onInspectReading,
}) => {
  const stateCfg = SEMANTIC_STATE_CONFIG[meter.semanticState];
  const reading = meter.latestReading;

  return (
    <aside className="sgp-side-drawer sgp-meter-drawer" aria-label={`Chi tiết công tơ ${meter.meterCode}`}>
      {/* Header */}
      <div className="sgp-drawer-header">
        <div className="sgp-drawer-title-group">
          <div className="sgp-meter-header-badges">
            <span className="sgp-drawer-tag">{meter.meterCode}</span>
            <span className={`sgp-badge-tag ${stateCfg.style.badgeClass}`}>
              {stateCfg.label}
            </span>
          </div>
          <h2 className="sgp-drawer-title">{meter.name}</h2>
        </div>
        <button
          type="button"
          className="sgp-drawer-close-btn"
          onClick={onClose}
          aria-label="Đóng bảng thông tin"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="sgp-drawer-body">
        {/* Exception Notice Banner if applicable */}
        {meter.exceptionDetail && (
          <div className="sgp-drawer-exception-banner">
            <AlertTriangle size={18} className="sgp-exc-banner-icon" />
            <div className="sgp-exc-banner-content">
              <div className="sgp-exc-banner-title">
                {meter.exceptionDetail.exception_label}
              </div>
              <div className="sgp-exc-banner-desc">
                Ca ghi: {meter.exceptionDetail.scheduled_time || 'Chưa xác định'} · Vị trí: {meter.location}
              </div>
            </div>
          </div>
        )}

        {/* Specifications & Location */}
        <div className="sgp-detail-group">
          <h3 className="sgp-group-title">Thông tin thiết bị</h3>
          <div className="sgp-info-grid">
            <div className="sgp-info-row">
              <span className="sgp-info-label">Vị trí lắp đặt:</span>
              <span className="sgp-info-val">
                <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                {meter.location}
              </span>
            </div>
            <div className="sgp-info-row">
              <span className="sgp-info-label">Khu vực tác nghiệp:</span>
              <span className="sgp-info-val">{meter.zoneName}</span>
            </div>
            <div className="sgp-info-row">
              <span className="sgp-info-label">Loại công tơ:</span>
              <span className="sgp-info-val">
                {meter.meterType === 'LCD' ? 'Điện tử (Màn hình LCD)' : 'Cơ khí (Đồng hồ số cơ)'}
              </span>
            </div>
            <div className="sgp-info-row">
              <span className="sgp-info-label">Trạng thái vận hành:</span>
              <span className="sgp-info-val">
                {meter.isActive ? (
                  <span className="sgp-text-success font-medium">Đang hoạt động</span>
                ) : (
                  <span className="sgp-text-muted">Tạm ngưng</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Latest Reading Detail */}
        <div className="sgp-detail-group">
          <h3 className="sgp-group-title">Chỉ số ghi nhận gần nhất</h3>
          {reading && reading.readingValue ? (
            <div className="sgp-reading-card">
              <div className="sgp-reading-primary-val">
                <span className="sgp-reading-number font-tabular">
                  {reading.readingValue}
                </span>
                <span className="sgp-reading-unit">kWh</span>
              </div>

              <div className="sgp-reading-meta-list">
                {reading.roundTime && (
                  <div className="sgp-meta-item">
                    <Clock size={13} />
                    <span>Lượt ghi: {reading.roundTime}</span>
                  </div>
                )}
                {reading.serverTimestamp && (
                  <div className="sgp-meta-item">
                    <Clock size={13} />
                    <span>Thời gian: {reading.serverTimestamp}</span>
                  </div>
                )}
                {reading.recordedBy && (
                  <div className="sgp-meta-item">
                    <User size={13} />
                    <span>Người ghi: {reading.recordedBy}</span>
                  </div>
                )}
                {reading.confirmationSource && (
                  <div className="sgp-meta-item">
                    <ShieldCheck size={13} />
                    <span>
                      Xác thực:{' '}
                      {reading.confirmationSource === 'OCR_CONFIRMED'
                        ? 'AI Nhận diện (OCR)'
                        : reading.confirmationSource === 'USER_CORRECTED'
                        ? 'Hiệu chỉnh thủ công'
                        : 'Nhập tay'}
                    </span>
                  </div>
                )}
              </div>

              {/* Action: Quick Inspection Jump */}
              {reading.readingId && onInspectReading && (
                <button
                  type="button"
                  className="sgp-inspect-reading-btn"
                  onClick={() => onInspectReading(reading.readingId!)}
                >
                  <FileCheck size={15} />
                  <span>Kiểm tra phiếu đọc & ảnh gốc</span>
                  <ExternalLink size={13} style={{ marginLeft: 'auto' }} />
                </button>
              )}
            </div>
          ) : (
            <div className="sgp-reading-empty">
              <span>Chưa có dữ liệu chỉ số trong lượt ghi này.</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
