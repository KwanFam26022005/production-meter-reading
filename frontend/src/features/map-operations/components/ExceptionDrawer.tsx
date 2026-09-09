import React from 'react';
import {
  X,
  AlertTriangle,
  ArrowRight,
  Box,
} from 'lucide-react';
import { MapMeterItem } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';

interface ExceptionDrawerProps {
  isOpen: boolean;
  meters: MapMeterItem[];
  onClose: () => void;
  onNavigateToMeter: (meterId: string) => void;
  onNavigateTo3DMeter?: (meterId: string) => void;
}

export const ExceptionDrawer: React.FC<ExceptionDrawerProps> = ({
  isOpen,
  meters,
  onClose,
  onNavigateToMeter,
  onNavigateTo3DMeter,
}) => {
  if (!isOpen) return null;

  const exceptionMeters = meters.filter(
    (m) => m.semanticState === 'REVIEW' || m.semanticState === 'OVERDUE'
  );

  return (
    <aside
      className="sgp-side-drawer sgp-exception-drawer"
      aria-label="Danh sách công tơ ngoại lệ cần xử lý"
    >
      {/* Header */}
      <div className="sgp-drawer-header">
        <div className="sgp-drawer-title-group">
          <div className="sgp-drawer-tag alert">
            <AlertTriangle size={13} />
            <span>NGOẠI LỆ</span>
          </div>
          <h2 className="sgp-drawer-title">
            Cảnh báo tác nghiệp ({exceptionMeters.length})
          </h2>
        </div>
        <button
          type="button"
          className="sgp-drawer-close-btn"
          onClick={onClose}
          aria-label="Đóng danh sách ngoại lệ"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body List */}
      <div className="sgp-drawer-body">
        {exceptionMeters.length === 0 ? (
          <div className="sgp-empty-notice">
            <span>Không có công tơ nào trong trạng thái ngoại lệ. Ca tác nghiệp vận hành chuẩn xác.</span>
          </div>
        ) : (
          <div className="sgp-exception-drawer-list">
            {exceptionMeters.map((m) => {
              const isReview = m.semanticState === 'REVIEW';
              const stCfg = SEMANTIC_STATE_CONFIG[m.semanticState];

              return (
                <div
                  key={m.id}
                  className={`sgp-exception-drawer-card ${isReview ? 'review' : 'overdue'}`}
                >
                  <div className="sgp-edc-header">
                    <div className="sgp-edc-title-row">
                      <span className="sgp-edc-code font-tabular font-semibold">
                        {m.meterCode}
                      </span>
                      <span className={`sgp-badge-tag ${stCfg.style.badgeClass}`}>
                        {stCfg.shortLabel}
                      </span>
                    </div>
                    <span className="sgp-edc-name">{m.name}</span>
                  </div>

                  <div className="sgp-edc-meta-grid">
                    <div className="sgp-edc-meta-item">
                      <span className="sgp-edc-lbl">Khu vực:</span>
                      <span className="sgp-edc-val">{m.zoneName}</span>
                    </div>
                    <div className="sgp-edc-meta-item">
                      <span className="sgp-edc-lbl">Vị trí:</span>
                      <span className="sgp-edc-val">{m.location}</span>
                    </div>
                    {m.latestReading?.readingValue && (
                      <div className="sgp-edc-meta-item">
                        <span className="sgp-edc-lbl">Chỉ số:</span>
                        <span className="sgp-edc-val font-tabular font-semibold">
                          {m.latestReading.readingValue} kWh
                        </span>
                      </div>
                    )}
                    {m.latestReading?.serverTimestamp && (
                      <div className="sgp-edc-meta-item">
                        <span className="sgp-edc-lbl">Thời gian:</span>
                        <span className="sgp-edc-val font-tabular">
                          {m.latestReading.serverTimestamp}
                        </span>
                      </div>
                    )}
                  </div>

                  {m.exceptionDetail?.exception_label && (
                    <div className="sgp-edc-reason">
                      <span>{m.exceptionDetail.exception_label}</span>
                    </div>
                  )}

                  {/* Actions: "Đi tới 2D" & "Xem trong 3D" */}
                  <div className="sgp-edc-actions">
                    {onNavigateTo3DMeter && (
                      <button
                        type="button"
                        className="sgp-goto-3d-btn"
                        onClick={() => onNavigateTo3DMeter(m.id)}
                        title="Chuyển sang chế độ 3D và định vị công tơ"
                      >
                        <Box size={13} />
                        <span>Xem 3D</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="sgp-goto-meter-btn"
                      onClick={() => onNavigateToMeter(m.id)}
                      title="Định vị công tơ trên bản đồ vận hành"
                    >
                      <span>Đi tới</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
