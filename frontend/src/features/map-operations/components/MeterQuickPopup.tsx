import React, { useEffect, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { MapMeterItem } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';

interface MeterQuickPopupProps {
  meter: MapMeterItem;
  onDetails: () => void;
  onClose: () => void;
}

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
    : 'Chưa ghi';

  const roundLabel = meter.latestReading?.roundTime || '11:00';

  return (
    <aside
      ref={popupRef}
      className="sgp-meter-quick-popup"
      role="dialog"
      aria-label={`Thông tin nhanh công tơ ${meter.meterCode}`}
    >
      <button
        type="button"
        className="sgp-context-close"
        onClick={onClose}
        aria-label="Đóng thông tin nhanh"
      >
        <X size={14} />
      </button>

      <div className="sgp-quick-header">
        <span className="sgp-quick-code font-tabular">{meter.meterCode}</span>
        <span className={`sgp-quick-status ${stateCfg.style.badgeClass}`}>
          {stateCfg.shortLabel || stateCfg.label}
        </span>
      </div>

      <div className="sgp-quick-name">{meter.name}</div>
      <div className="sgp-quick-zone-sub">{meter.zoneName} · {meter.location}</div>

      <dl className="sgp-quick-facts font-tabular">
        <div className="sgp-quick-fact-row">
          <dt>Lượt ghi</dt>
          <dd>{roundLabel}</dd>
        </div>
        <div className="sgp-quick-fact-row">
          <dt>Chỉ số mới nhất</dt>
          <dd className="font-semibold">{readingVal}</dd>
        </div>
      </dl>

      <button
        type="button"
        className="sgp-quick-detail-btn"
        onClick={onDetails}
        autoFocus
        aria-label={`Xem chi tiết công tơ ${meter.meterCode}`}
      >
        <span>Xem chi tiết</span>
        <ArrowRight size={14} />
      </button>
    </aside>
  );
};
