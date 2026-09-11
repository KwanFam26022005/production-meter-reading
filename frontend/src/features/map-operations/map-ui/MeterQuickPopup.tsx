import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { MapMeterItem, MapViewportState } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';
import { normalizedToOperationalSvg } from '../geometry/operationalGeometry';

interface MeterQuickPopupProps {
  meter: MapMeterItem;
  onDetails: () => void;
  onClose: () => void;
  viewport?: MapViewportState;
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
 *
 * Anchoring:
 * - Tracks the actual DOM position of `#meter-marker-${meter.id}` on pan/zoom
 * - Fallbacks safely to canonical normalizedToOperationalSvg transform
 */
export const MeterQuickPopup: React.FC<MeterQuickPopupProps> = ({
  meter,
  onDetails,
  onClose,
  viewport,
}) => {
  const stateCfg = SEMANTIC_STATE_CONFIG[meter.semanticState] || SEMANTIC_STATE_CONFIG.PENDING;
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Position in container pixels or percentages
  const [stylePos, setStylePos] = useState<{ left: string; top: string }>(() => {
    const { x, y } = normalizedToOperationalSvg(meter.coordinates);
    return {
      left: `${((x / 1300) * 100).toFixed(1)}%`,
      top: `${((y / 520) * 100).toFixed(1)}%`,
    };
  });

  // Track marker DOM element to follow pan/zoom dynamically
  useEffect(() => {
    const updatePosition = () => {
      const markerEl = document.getElementById(`meter-marker-${meter.id}`);
      const stageEl = popupRef.current?.closest('.sgp-map-stage') as HTMLElement | null;

      if (markerEl && stageEl) {
        const markerRect = markerEl.getBoundingClientRect();
        const stageRect = stageEl.getBoundingClientRect();

        const rawLeft = markerRect.left + markerRect.width / 2 - stageRect.left;
        const rawTop = markerRect.top - stageRect.top;

        // Clamp within stage bounds to prevent clipping (popup is 250px wide)
        const leftClamped = Math.max(130, Math.min(rawLeft, stageRect.width - 130));
        const topClamped = Math.max(190, Math.min(rawTop, stageRect.height - 30));

        setStylePos({
          left: `${leftClamped.toFixed(1)}px`,
          top: `${topClamped.toFixed(1)}px`,
        });
      } else {
        const { x, y } = normalizedToOperationalSvg(meter.coordinates);
        setStylePos({
          left: `clamp(140px, ${((x / 1300) * 100).toFixed(1)}%, calc(100% - 160px))`,
          top: `clamp(180px, ${((y / 520) * 100).toFixed(1)}%, calc(100% - 60px))`,
        });
      }
    };

    // Run on mount, on next animation frame (after SVG paint), and on resize/pan/zoom
    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePosition);
    };
  }, [meter.id, meter.coordinates, viewport]);

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

  return (
    <aside
      ref={popupRef}
      className="sgp-meter-quick-popup figma-2-514"
      role="dialog"
      aria-label={`Thông tin nhanh công tơ ${meter.meterCode}`}
      style={{
        left: stylePos.left,
        top: stylePos.top,
        transform: 'translate(-50%, -100%) translateY(-14px)',
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
