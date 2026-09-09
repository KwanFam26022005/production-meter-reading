import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { MapMeterItem } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';

interface MeterQuickPopupProps {
  meter: MapMeterItem;
  onDetails: () => void;
  onClose: () => void;
}

export const MeterQuickPopup: React.FC<MeterQuickPopupProps> = ({ meter, onDetails, onClose }) => {
  const state = SEMANTIC_STATE_CONFIG[meter.semanticState];
  return (
    <aside className="sgp-meter-quick-popup" role="dialog" aria-label={`Thông tin nhanh ${meter.meterCode}`}>
      <button type="button" className="sgp-context-close" onClick={onClose} aria-label="Đóng thông tin nhanh">
        <X size={14} />
      </button>
      <div className="sgp-quick-code">{meter.meterCode}</div>
      <div className="sgp-quick-name">{meter.name}</div>
      <span className={`sgp-quick-status ${state.style.badgeClass}`}>{state.label}</span>
      <dl className="sgp-quick-facts">
        <div><dt>Lượt</dt><dd>{meter.latestReading?.roundTime || '11:00'}</dd></div>
        <div><dt>Chỉ số</dt><dd>{meter.latestReading?.readingValue ? `${meter.latestReading.readingValue} kWh` : 'Chưa ghi'}</dd></div>
      </dl>
      <button type="button" className="sgp-quick-detail-btn" onClick={onDetails}>
        <span>Xem chi tiết</span><ArrowRight size={14} />
      </button>
    </aside>
  );
};
