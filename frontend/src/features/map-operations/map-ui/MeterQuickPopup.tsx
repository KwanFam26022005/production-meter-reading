import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
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
 * MeterQuickPopup — Level 2 Anchored Contextual Popup (Figma Frame 2:514)
 *
 * Anchoring System (Section 20):
 * - Derives screen coordinates dynamically from the transformed SVG marker element `#meter-marker-${meter.id}`.
 * - Stays firmly attached under 100%, 125%, 150% zoom and dynamic pan.
 * - Smooth fallback to canonical presentation coordinates if marker element is mounting.
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

        // Clamp within stage bounds (popup width is ~250px, height is ~170px)
        const leftClamped = Math.max(130, Math.min(rawLeft, stageRect.width - 130));
        const topClamped = Math.max(190, Math.min(rawTop, stageRect.height - 30));

        setStylePos({
          left: `${leftClamped.toFixed(1)}px`,
          top: `${topClamped.toFixed(1)}px`,
        });
      } else {
        const { x, y } = normalizedToCanonicalScene(meter.coordinates);
        setStylePos({
          left: `clamp(140px, ${((x / CANONICAL_SCENE_WIDTH) * 100).toFixed(1)}%, calc(100% - 160px))`,
          top: `clamp(180px, ${((y / CANONICAL_SCENE_HEIGHT) * 100).toFixed(1)}%, calc(100% - 60px))`,
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
    : '—';

  const recordedTime = meter.latestReading?.serverTimestamp || meter.latestReading?.roundTime;

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
        transform: 'translate(-50%, -100%) translateY(-14px)',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div className="sgp-mqp-header">
        <div className="sgp-mqp-title-group">
          <div className="sgp-mqp-code">{meter.meterCode}</div>
          <div className="sgp-mqp-subtitle">{meter.name}</div>
        </div>
        <button
          type="button"
          className="sgp-mqp-close-btn"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X size={15} />
        </button>
      </div>

      {/* Semantic Status Badge */}
      <div className="sgp-mqp-status-strip">
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
      </div>

      {/* Facts */}
      <div className="sgp-mqp-body">
        <div className="sgp-mqp-fact-row">
          <span className="sgp-mqp-fact-label">Khu vực</span>
          <span className="sgp-mqp-fact-val">{meter.zoneName}</span>
        </div>
        <div className="sgp-mqp-fact-row">
          <span className="sgp-mqp-fact-label">Chỉ số gần nhất</span>
          <span className="sgp-mqp-fact-val">{readingVal}</span>
        </div>
        {recordedTime && (
          <div className="sgp-mqp-fact-row">
            <span className="sgp-mqp-fact-label">Thời điểm ghi</span>
            <span className="sgp-mqp-fact-val">{recordedTime}</span>
          </div>
        )}
      </div>

      {/* Footer Call-to-Action */}
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

      {/* Speech-Bubble Downward Arrow Pointer */}
      <div className="sgp-mqp-arrow" />
    </div>
  );
};
