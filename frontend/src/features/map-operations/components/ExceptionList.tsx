import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, ExternalLink } from 'lucide-react';
import { MapMeterItem } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';

interface ExceptionListProps {
  meters: MapMeterItem[];
  selectedMeterId: string | null;
  onSelectMeter: (meterId: string) => void;
}

export const ExceptionList: React.FC<ExceptionListProps> = ({
  meters,
  selectedMeterId,
  onSelectMeter,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Filter meters that are in an exception state (REVIEW or OVERDUE)
  const exceptions = meters.filter(
    (m) => m.semanticState === 'REVIEW' || m.semanticState === 'OVERDUE'
  );

  if (exceptions.length === 0) {
    return null;
  }

  return (
    <div className={`sgp-exception-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Header bar */}
      <div
        className="sgp-exception-panel-header"
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
      >
        <div className="sgp-exc-title-row">
          <AlertTriangle size={16} className="sgp-exc-warn-icon" />
          <span className="sgp-exc-title">
            Danh sách ngoại lệ cần chú ý
          </span>
          <span className="sgp-exc-count-badge font-tabular">
            {exceptions.length}
          </span>
        </div>
        <button
          type="button"
          className="sgp-exc-toggle-btn"
          aria-label={isExpanded ? 'Thu gọn danh sách ngoại lệ' : 'Mở rộng danh sách ngoại lệ'}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Expanded List Items */}
      {isExpanded && (
        <div className="sgp-exception-items-container">
          {exceptions.map((meter) => {
            const stCfg = SEMANTIC_STATE_CONFIG[meter.semanticState];
            const isSelected = selectedMeterId === meter.id;

            return (
              <div
                key={meter.id}
                className={`sgp-exception-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectMeter(meter.id)}
                role="button"
                tabIndex={0}
              >
                <div className="sgp-exc-card-left">
                  <div className="sgp-exc-card-meta">
                    <span className="sgp-exc-meter-code">{meter.meterCode}</span>
                    <span className={`sgp-badge-tag ${stCfg.style.badgeClass}`}>
                      {stCfg.shortLabel}
                    </span>
                  </div>
                  <div className="sgp-exc-meter-name">{meter.name}</div>
                  <div className="sgp-exc-meter-loc">{meter.location}</div>
                </div>

                <div className="sgp-exc-card-right">
                  {meter.exceptionDetail?.scheduled_time && (
                    <div className="sgp-exc-time font-tabular">
                      <Clock size={12} />
                      <span>Ca {meter.exceptionDetail.scheduled_time}</span>
                    </div>
                  )}
                  {meter.latestReading?.readingValue && (
                    <div className="sgp-exc-val font-tabular">
                      Chỉ số: <strong>{meter.latestReading.readingValue}</strong>
                    </div>
                  )}
                  <div className="sgp-exc-action-hint">
                    <span>Xem vị trí</span>
                    <ExternalLink size={12} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
