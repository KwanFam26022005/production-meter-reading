import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X, MapPin, Gauge, Clock } from 'lucide-react';
import { MapMeterItem, MapViewportState } from '../types';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';
import {
  normalizedToCanonicalScene,
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../geometry/canonicalScene';

interface MeterQuickPopupProps {
  meter: MapMeterItem;
  onDetails: () => void;
  onClose: () => void;
  viewport?: MapViewportState;
}

/**
 * MeterQuickPopup — Level 2 Anchored Contextual Popup (Approved Design)
 *
 * Visual hierarchy matching approved design:
 * - Status badge on left (mint/green)
 * - Meter code on right (bold navy)
 * - Three clear rows with icons (MapPin, Gauge, Clock)
 * - Full-width navy CTA button: "Xem chi tiết →"
 * - Speech-bubble pointer attached to meter marker
 */
export const MeterQuickPopup: React.FC<MeterQuickPopupProps> = ({
  meter,
  onDetails,
  onClose,
  viewport,
}) => {
  const stateCfg = SEMANTIC_STATE_CONFIG[meter.semanticState] || SEMANTIC_STATE_CONFIG.PENDING;
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Position state in workspace container pixels
  const [stylePos, setStylePos] = useState<{ left: string; top: string }>(() => {
    const { x, y } = normalizedToCanonicalScene(meter.coordinates);
    return {
      left: `${((x / CANONICAL_SCENE_WIDTH) * 100).toFixed(1)}%`,
      top: `${((y / CANONICAL_SCENE_HEIGHT) * 100).toFixed(1)}%`,
    };
  });

  // Track marker DOM element to follow pan/zoom dynamically without drift
  useEffect(() => {
    const updatePosition = () => {
      const markerEl = document.getElementById(`meter-marker-${meter.id}`);
      const stageEl = (popupRef.current?.closest('.sgp-map-first-workspace') ||
        popupRef.current?.closest('.sgp-operational-map-container') ||
        popupRef.current?.parentElement) as HTMLElement | null;

      if (markerEl && stageEl) {
        const markerRect = markerEl.getBoundingClientRect();
        const stageRect = stageEl.getBoundingClientRect();

        const rawLeft = markerRect.left + markerRect.width / 2 - stageRect.left;
        const rawTop = markerRect.top - stageRect.top;

        // Clamp within stage bounds (popup width is ~290px, height is ~190px)
        const leftClamped = Math.max(150, Math.min(rawLeft, stageRect.width - 150));
        const topClamped = Math.max(210, Math.min(rawTop, stageRect.height - 30));

        setStylePos({
          left: `${leftClamped.toFixed(1)}px`,
          top: `${topClamped.toFixed(1)}px`,
        });
      } else {
        const { x, y } = normalizedToCanonicalScene(meter.coordinates);
        setStylePos({
          left: `clamp(150px, ${((x / CANONICAL_SCENE_WIDTH) * 100).toFixed(1)}%, calc(100% - 170px))`,
          top: `clamp(200px, ${((y / CANONICAL_SCENE_HEIGHT) * 100).toFixed(1)}%, calc(100% - 60px))`,
        });
      }
    };

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
    : '001225.69 kWh';

  const recordedTime = meter.latestReading?.serverTimestamp || meter.latestReading?.roundTime || '16:13:00 - 28/08/2026';

  return (
    <div
      ref={popupRef}
      className="sgp-meter-quick-popup"
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết ${meter.meterCode}`}
      style={{
        position: 'absolute',
        left: stylePos.left,
        top: stylePos.top,
        transform: 'translate(-50%, -100%) translateY(-18px)',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      {/* 1. Header: Status Badge on Left, Meter Code + Close on Right */}
      <div className="sgp-mqp-header">
        <span
          className="sgp-mqp-status-badge"
          style={{
            backgroundColor: stateCfg.style.bg,
            color: stateCfg.style.text,
            borderColor: stateCfg.style.stroke,
          }}
        >
          ● {meter.stateLabel || stateCfg.label}
        </span>
        <div className="sgp-mqp-header-right">
          <span className="sgp-mqp-code font-tabular">{meter.meterCode}</span>
          <button
            type="button"
            className="sgp-mqp-close-btn"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. Facts / Body with Icons & Proper Spacing */}
      <div className="sgp-mqp-body">
        <div className="sgp-mqp-fact-row">
          <MapPin size={14} className="sgp-mqp-fact-icon" />
          <span className="sgp-mqp-fact-val" style={{ marginLeft: 0 }}>
            {meter.zoneName || 'Khu vực Cầu cảng (Berths 1 - 3)'}
          </span>
        </div>
        <div className="sgp-mqp-fact-row">
          <Gauge size={14} className="sgp-mqp-fact-icon" />
          <span className="sgp-mqp-fact-label">Chỉ số gần nhất</span>
          <span className="sgp-mqp-fact-val font-tabular">{readingVal}</span>
        </div>
        <div className="sgp-mqp-fact-row">
          <Clock size={14} className="sgp-mqp-fact-icon" />
          <span className="sgp-mqp-fact-label">Thời điểm ghi</span>
          <span className="sgp-mqp-fact-val font-tabular">{recordedTime}</span>
        </div>
      </div>

      {/* 3. Footer Call-to-Action */}
      <div className="sgp-mqp-footer">
        <button
          type="button"
          className="sgp-mqp-action-btn"
          onClick={onDetails}
        >
          <span>Xem chi tiết</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 4. Speech-Bubble Downward Arrow Pointer */}
      <div className="sgp-mqp-arrow" />
    </div>
  );
};
