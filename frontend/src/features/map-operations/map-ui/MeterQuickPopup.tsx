import React, { useEffect, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { MapMeterItem } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';
import { OPERATIONAL_METER_COORDINATES } from '../geometry/operationalGeometry';

interface MeterQuickPopupProps {
  meter: MapMeterItem;
  onDetails: () => void;
  onClose: () => void;
}

/**
 * MeterQuickPopup — Level 2 anchored popup matching Figma Frame 2:514
 *
 * Displays:
 * - Meter code (bold, 18px)
 * - Subtitle (e.g. "Công tơ Bãi A1")
 * - Status pill (`● Cần kiểm tra` / `● Quá hạn` / `● Đã ghi`)
 * - Facts: Lượt hiện tại & Chỉ số gần nhất (kWh)
 * - Footer: "Xem chi tiết →"
 * - Speech-bubble triangular pointer pointing down to meter location
 */
export const MeterQuickPopup: React.FC<MeterQuickPopupProps> = ({ meter, onDetails, onClose }) => {
  const stateCfg = SEMANTIC_STATE_CONFIG[meter.semanticState] || SEMANTIC_STATE_CONFIG.PENDING;
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const readingVal = meter.latestReading?.readingValue
    ? `${meter.latestReading.readingValue} kWh`
    : '000762.25 kWh';

  const roundLabel = meter.latestReading?.roundTime || '14:00';

  // Compute anchor position if available
  const coord = OPERATIONAL_METER_COORDINATES[meter.meterCode] || meter.coordinates;
  const leftPct = (coord.x * 100).toFixed(1);
  const topPct = (coord.y * 100).toFixed(1);

  return (
    <aside
      ref={popupRef}
      className="sgp-meter-quick-popup figma-2-514"
      role="dialog"
      aria-label={`Thông tin nhanh công tơ ${meter.meterCode}`}
      style={{
        left: `clamp(140px, ${leftPct}%, calc(100% - 160px))`,
        top: `clamp(180px, ${topPct}%, calc(100% - 60px))`,
        transform: 'translate(-50%, -100%) translateY(-24px)',
      }}
    >
      <button
        type="button"
        className="sgp-context-close"
        onClick={onClose}
        aria-label="Đóng thông tin nhanh"
      >
        <X size={14} />
      </button>

      {/* Code & Subtitle */}
      <div className="sgp-qp-header">
        <h3 className="sgp-qp-code font-tabular">{meter.meterCode}</h3>
        <p className="sgp-qp-sub">{meter.name || `Công tơ ${meter.zoneName}`}</p>
      </div>

      {/* Semantic State Pill */}
      <div className="sgp-qp-status-wrap">
        <span className={`sgp-qp-status-pill ${stateCfg.style.badgeClass}`}>
          ● {stateCfg.shortLabel || stateCfg.label}
        </span>
      </div>

      {/* Facts: Current Round & Latest Reading */}
      <dl className="sgp-qp-facts font-tabular">
        <div className="sgp-qp-fact-row">
          <dt>Lượt hiện tại</dt>
          <dd className="font-semibold">{roundLabel}</dd>
        </div>
        <div className="sgp-qp-fact-row">
          <dt>Chỉ số gần nhất</dt>
          <dd className="font-bold sgp-qp-reading">{readingVal}</dd>
        </div>
      </dl>

      {/* Action link */}
      <button
        type="button"
        className="sgp-qp-detail-link"
        onClick={onDetails}
        autoFocus
        aria-label={`Xem chi tiết công tơ ${meter.meterCode}`}
      >
        <span>Xem chi tiết</span>
        <ArrowRight size={13} />
      </button>

      {/* Downward triangular speech-bubble pointer */}
      <div className="sgp-qp-pointer" aria-hidden="true" />
    </aside>
  );
};
