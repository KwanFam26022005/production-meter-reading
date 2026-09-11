import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
} from 'lucide-react';
import type {
  AdminDashboardRoundProgress,
  User,
} from '../../../types';
import type {
  MapMeterItem,
  MapOperationalZone,
  MapFilterOptions,
  OperationalLayerType,
} from '../types';
import { SceneSearch, SceneFilter } from '../map-ui';
import { OperationalMapLegend } from '../operational-map/OperationalMapLegend';
import { MapViewportControls } from '../operational-map/MapViewportControls';

interface SceneHudProps {
  // Top-Left Cluster: Search & Filter
  meters: MapMeterItem[];
  zones: MapOperationalZone[];
  operators: User[];
  filters: MapFilterOptions;
  onApplyFilters: (filters: MapFilterOptions) => void;
  onSelectMeter: (meterId: string) => void;
  onSelectZone: (zoneId: string) => void;
  onSelectOperator: (operatorId: string) => void;

  // Top-Right: Exception Summary HUD
  issueCount: number;
  exceptionFocus: boolean;
  onToggleExceptionFocus: () => void;

  // Bottom-Left: Round HUD
  rounds: AdminDashboardRoundProgress[];
  currentRoundTime?: string;
  selectedRoundId?: string;
  completionPercent?: number;
  onSelectRound: (roundId: string) => void;

  // Bottom-Right: Viewport Controls & Legend
  zoom: number;
  activeLayer: OperationalLayerType;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

/**
 * SceneHud — Restrained HighTopo Operational Controls (Sections 15 & 16)
 *
 * Placed outside the SVG viewport so controls never transform during pan/zoom.
 * - Top-left: Unified Search & Filter triggers
 * - Top-right: Exception summary capsule ("N vấn đề" / "Không có ngoại lệ")
 * - Bottom-left: Compact Round HUD `‹ 08:00 · 75% ›` (click opens round popover)
 * - Bottom-right: Legend & Zoom / Fit navigation controls
 */
export const SceneHud: React.FC<SceneHudProps> = ({
  meters,
  zones,
  operators,
  filters,
  onApplyFilters,
  onSelectMeter,
  onSelectZone,
  onSelectOperator,
  issueCount,
  exceptionFocus,
  onToggleExceptionFocus,
  rounds,
  currentRoundTime = '08:00',
  selectedRoundId,
  completionPercent = 0,
  onSelectRound,
  zoom,
  activeLayer,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  const [utilitySurface, setUtilitySurface] = useState<'search' | 'filter' | null>(null);
  const [roundMenuOpen, setRoundMenuOpen] = useState<boolean>(false);
  const roundPickerRef = useRef<HTMLDivElement | null>(null);

  // Close round picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roundPickerRef.current && !roundPickerRef.current.contains(e.target as Node)) {
        setRoundMenuOpen(false);
      }
    };
    if (roundMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [roundMenuOpen]);

  // Find active round index for prev/next chevrons
  const currentIdx = rounds.findIndex(
    (r) => r.round_id === selectedRoundId || r.scheduled_time === currentRoundTime
  );

  const handlePrevRound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIdx > 0) {
      onSelectRound(rounds[currentIdx - 1].round_id);
    }
  };

  const handleNextRound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIdx >= 0 && currentIdx < rounds.length - 1) {
      onSelectRound(rounds[currentIdx + 1].round_id);
    }
  };

  const activeRound = rounds[currentIdx] || null;
  const displayTime = activeRound?.scheduled_time || currentRoundTime;
  const displayPct = activeRound ? Math.round(activeRound.completion_percent) : Math.round(completionPercent);

  return (
    <div className="sgp-scene-hud-container" style={{ pointerEvents: 'none' }}>
      {/* 1. TOP-LEFT CLUSTER: Search & Filter */}
      <div className="sgp-map-top-hud" style={{ pointerEvents: 'none' }}>
        <div className="sgp-map-action-cluster" style={{ pointerEvents: 'auto' }}>
          <SceneSearch
            meters={meters}
            zones={zones}
            operators={operators}
            isOpen={utilitySurface === 'search'}
            onToggle={(open) => setUtilitySurface(open ? 'search' : null)}
            onSelectMeter={onSelectMeter}
            onSelectZone={onSelectZone}
            onSelectOperator={onSelectOperator}
          />

          <SceneFilter
            filters={filters}
            zones={zones}
            operators={operators}
            onApplyFilters={onApplyFilters}
            isOpen={utilitySurface === 'filter'}
            onToggle={(open) => setUtilitySurface(open ? 'filter' : null)}
          />
        </div>

        {/* 2. TOP-RIGHT: Exception Summary HUD */}
        <button
          type="button"
          className={`sgp-exception-hud ${exceptionFocus ? 'active' : ''}`}
          onClick={onToggleExceptionFocus}
          aria-pressed={exceptionFocus}
          style={{ pointerEvents: 'auto' }}
        >
          {issueCount > 0 ? (
            <>
              <AlertTriangle size={15} />
              <span>{issueCount} vấn đề cần xử lý</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={15} />
              <span>Không có ngoại lệ</span>
            </>
          )}
        </button>
      </div>

      {/* 3. BOTTOM-LEFT: Compact Round HUD (Section 16) */}
      <div
        ref={roundPickerRef}
        className="sgp-round-hud-wrapper"
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 40,
          pointerEvents: 'auto',
        }}
      >
        <div
          className="sgp-compact-round-hud"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: '9999px',
            padding: '4px 10px',
            fontSize: '12.5px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.28)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setRoundMenuOpen((prev) => !prev)}
          title="Chọn lượt ghi chỉ số"
        >
          {/* Prev chevron */}
          {rounds.length > 1 && (
            <button
              type="button"
              onClick={handlePrevRound}
              disabled={currentIdx <= 0}
              style={{
                background: 'none',
                border: 'none',
                color: currentIdx <= 0 ? 'rgba(255,255,255,0.25)' : '#94A3B8',
                cursor: currentIdx <= 0 ? 'default' : 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Lượt trước"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          <Clock size={13} style={{ color: '#38BDF8' }} />
          <span>
            {displayTime} · {displayPct}%
          </span>

          {/* Next chevron */}
          {rounds.length > 1 && (
            <button
              type="button"
              onClick={handleNextRound}
              disabled={currentIdx >= rounds.length - 1}
              style={{
                background: 'none',
                border: 'none',
                color: currentIdx >= rounds.length - 1 ? 'rgba(255,255,255,0.25)' : '#94A3B8',
                cursor: currentIdx >= rounds.length - 1 ? 'default' : 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Lượt kế tiếp"
            >
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Expandable Round Selection Popover */}
        {roundMenuOpen && rounds.length > 0 && (
          <div
            className="sgp-round-picker-popover"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '0',
              width: '220px',
              backgroundColor: '#0F172A',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              padding: '6px',
              zIndex: 50,
            }}
          >
            <div
              style={{
                padding: '4px 8px 6px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '4px',
              }}
            >
              Lượt tác nghiệp trong ngày
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {rounds.map((r) => {
                const isSelected = r.round_id === selectedRoundId || r.scheduled_time === currentRoundTime;
                return (
                  <button
                    key={r.round_id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRound(r.round_id);
                      setRoundMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: isSelected ? 'rgba(14, 116, 144, 0.35)' : 'transparent',
                      color: isSelected ? '#38BDF8' : '#F1F5F9',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{r.scheduled_time}</span>
                    <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                      {Math.round(r.completion_percent)}%
                    </span>
                    {isSelected && <Check size={14} style={{ marginLeft: '4px' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM-RIGHT: Legend & Viewport Controls */}
      <div style={{ pointerEvents: 'auto' }}>
        <OperationalMapLegend activeLayer={activeLayer} />
        <MapViewportControls
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onResetView={onResetView}
        />
      </div>
    </div>
  );
};
