import React from 'react';
import { MapMeterItem } from '../types';
import { normalizedToCanonicalScene } from '../geometry/canonicalScene';
import {
  isPointInPresentationZone,
  resolveToBusinessZoneId,
} from '../geometry/operationalGeometry';
import { calculateSpatialEmphasis } from '../state/spatialVisualEmphasis';
import type { SelectedEntity, MapMode } from '../state/useMapStateMachine';

interface MeterLayerProps {
  meters: MapMeterItem[];
  selectedZoneId?: string | null;
  selectedMeterId: string | null;
  hoveredMeterId: string | null;
  exceptionsOnly: boolean;
  zoomLevel: number;
  isAssetMode?: boolean;
  mode?: MapMode;
  selectedEntity?: SelectedEntity;
  targetPlacementZoneId?: string;
  onSelectMeter: (meterId: string) => void;
  onHoverMeter: (meterId: string | null) => void;
  exceptionFocus?: boolean;
  filterTier?: 'all' | 'normal' | 'issue' | 'selected';
}

/**
 * MeterLayer — V7 Visual Contract Implementation
 *
 * Visual Rules:
 * - Footprint: ROUNDED HEXAGON (compact 18-22px footprint)
 * - Center gauge dial glyph with needle
 * - NO permanent CT-code label. Label appears ONLY on hover or when selected.
 * - Selected state: Crisp white halo (r=15, stroke=2px) + CT-code callout pill.
 * - Alerts: Small triangle warning badge (red overdue, amber review).
 *   NO giant pulsing red circles wrapping meters.
 * - Zone Selection Dimming:
 *   Meters in selected zone: 100% opacity.
 *   Outside meters: 25% opacity.
 */
export const MeterLayer: React.FC<MeterLayerProps> = ({
  meters,
  selectedZoneId,
  selectedMeterId,
  hoveredMeterId,
  exceptionsOnly,
  zoomLevel = 1,
  mode = 'browse',
  selectedEntity = null,
  targetPlacementZoneId,
  onSelectMeter,
  onHoverMeter,
  exceptionFocus = false,
  filterTier = 'all',
}) => {
  const targetBusinessZoneId = resolveToBusinessZoneId(selectedZoneId);

  // Active entity for emphasis resolution
  const activeSelectedEntity = selectedEntity || (
    selectedMeterId
      ? { type: 'meter' as const, id: selectedMeterId }
      : selectedZoneId
      ? { type: 'zone' as const, id: selectedZoneId }
      : null
  );

  // Filter & sort meters by Z-order render priority:
  // Normal meters -> Issue meters -> Selected meters
  const processedMeters = React.useMemo(() => {
    let list = meters.slice();

    if (exceptionsOnly) {
      list = list.filter((m) => m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW');
    }

    if (filterTier !== 'all') {
      list = list.filter((m) => {
        const isSelected = m.id === selectedMeterId || activeSelectedEntity?.id === m.id;
        const isException = m.semanticState === 'OVERDUE' || m.semanticState === 'REVIEW';

        if (filterTier === 'normal') return !isSelected && !isException;
        if (filterTier === 'issue') return isException && !isSelected;
        if (filterTier === 'selected') return isSelected;
        return true;
      });
    } else {
      // Sort so normal < issue < selected (selected always renders on top)
      list.sort((a, b) => {
        const aSelected = a.id === selectedMeterId || activeSelectedEntity?.id === a.id ? 2 : 0;
        const bSelected = b.id === selectedMeterId || activeSelectedEntity?.id === b.id ? 2 : 0;
        const aException = a.semanticState === 'OVERDUE' || a.semanticState === 'REVIEW' ? 1 : 0;
        const bException = b.semanticState === 'OVERDUE' || b.semanticState === 'REVIEW' ? 1 : 0;
        return (aSelected + aException) - (bSelected + bException);
      });
    }

    return list;
  }, [meters, exceptionsOnly, filterTier, selectedMeterId, activeSelectedEntity]);

  return (
    <g className="sgp-meter-layer" aria-label="Lớp điểm công tơ tác nghiệp">
      {processedMeters.map((m) => {
        const isSelected = m.id === selectedMeterId || activeSelectedEntity?.id === m.id;
        const isHovered = m.id === hoveredMeterId;
        const isOverdue = m.semanticState === 'OVERDUE';
        const isReview = m.semanticState === 'REVIEW';
        const isException = isOverdue || isReview;

        // Coordinates resolution: explicit presentation transform
        const sceneCoord = normalizedToCanonicalScene(m.coordinates);
        const { x, y } = sceneCoord;

        // Zone selection dimming logic per V7 Visual Contract:
        let isInsideSelectedZone = true;
        const effectiveZoneId = targetPlacementZoneId || (activeSelectedEntity?.type === 'zone' ? activeSelectedEntity.id : selectedZoneId);
        if (effectiveZoneId) {
          if (isPointInPresentationZone(sceneCoord, effectiveZoneId)) {
            isInsideSelectedZone = true;
          } else if (m.zoneId === effectiveZoneId || m.zoneId === targetBusinessZoneId) {
            isInsideSelectedZone = true;
          } else {
            isInsideSelectedZone = false;
          }
        }

        // Semantic Colors per V13.4 Spec:
        // Normal: subtle cyan/green operational core (#10B981)
        // Pending: neutral/blue-grey (#64748B)
        // Overdue/review: red (#EF4444) / amber (#F59E0B)
        // Inactive: muted slate (#94A3B8)
        let coreFill = '#10B981'; // CONFIRMED: Emerald Green
        if (isOverdue) {
          coreFill = '#EF4444'; // OVERDUE: Critical Red
        } else if (isReview) {
          coreFill = '#F59E0B'; // REVIEW: Amber Warning
        } else if (m.semanticState === 'DUE') {
          coreFill = '#0284C7'; // DUE: Operational Blue
        } else if (m.semanticState === 'PENDING') {
          coreFill = '#64748B'; // PENDING: Neutral Slate
        } else if (m.semanticState === 'INACTIVE') {
          coreFill = '#94A3B8'; // INACTIVE: Muted Slate
        }

        // CT-code label visibility rule: ONLY show code when selected or hovered (no permanent labels at overview)
        const showCodePill = isSelected || isHovered;

        // Calculate centralized spatial emphasis
        let emphasis = calculateSpatialEmphasis({
          mode,
          selectedEntity: activeSelectedEntity,
          targetPlacementZoneId,
          entityType: 'meter',
          entityId: m.id,
          zoneId: m.zoneId,
        });

        // If inside selected zone was false and entity is zone, ensure dimmed
        if (effectiveZoneId && !isInsideSelectedZone && activeSelectedEntity?.type === 'zone') {
          emphasis = Math.min(emphasis, 0.25);
        }

        if (exceptionFocus && !isException && !isSelected) {
          emphasis = Math.min(emphasis, 0.20);
        }

        // Accessible label per Section 19:
        const stateDesc = isOverdue
          ? 'quá hạn lượt ghi'
          : isReview
          ? 'cần kiểm tra xác nhận'
          : m.stateLabel || m.semanticState;
        const accessibleLabel = `Công tơ ${m.meterCode}, ${m.zoneName || 'Khu vực tác nghiệp'}, ${stateDesc}`;

        // V13.4 Level-of-Detail (LOD) & Sizing:
        // OVERVIEW: 15–17px (target ~16px, lodScale = 0.80)
        // ZONE_FOCUS: 18–20px (target ~19px, lodScale = 0.95)
        // ENTITY_FOCUS: 22–24px (target ~23px, lodScale = 1.15)
        const isSelectedMeter = m.id === selectedMeterId || activeSelectedEntity?.id === m.id;
        const isZoneFocused = Boolean(selectedZoneId || activeSelectedEntity?.type === 'zone');
        const meterLod: 'OVERVIEW' | 'ZONE_FOCUS' | 'ENTITY_FOCUS' = isSelectedMeter
          ? 'ENTITY_FOCUS'
          : isZoneFocused
          ? 'ZONE_FOCUS'
          : 'OVERVIEW';

        const lodScale = meterLod === 'OVERVIEW' ? 0.80 : meterLod === 'ZONE_FOCUS' ? 0.95 : 1.15;

        // Screen-size normalization:
        // screenMarkerScale = lodScale / cameraZoom
        // The spatial anchor (x, y) remains strictly canonical.
        const safeZoom = Math.max(0.1, zoomLevel);
        const presentationScale = lodScale / safeZoom;

        return (
          <g
            key={m.id}
            id={`meter-marker-${m.id}`}
            data-meter-code={m.meterCode}
            data-meter-lod={meterLod}
            className={`sgp-meter-point ${isSelected ? 'selected' : ''} ${
              isException ? 'exception' : ''
            } ${isHovered ? 'hovered' : ''} lod-${meterLod.toLowerCase()}`}
            transform={`translate(${x}, ${y}) scale(${presentationScale})`}
            cursor="pointer"
            opacity={emphasis}
            style={{ transition: 'opacity 280ms ease' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectMeter(m.id);
            }}
            onMouseEnter={() => onHoverMeter(m.id)}
            onMouseLeave={() => onHoverMeter(null)}
            tabIndex={0}
            role="button"
            aria-label={accessibleLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMeter(m.id);
              }
            }}
          >
            {/* 0. Invisible Touch Target Area (Guarantees >= 44px hit target across all LOD scales and zoom levels) */}
            <circle cx={0} cy={0} r={22 / lodScale} fill="transparent" pointerEvents="all" />

            {/* Visual Content Group (Enables isolated hover scale & selection one-shot motion) */}
            <g className="sgp-meter-visual-content">
              {/* 1. SELECTION FOCUS RING (Section 9: zone-independent cyan/white focus ring) */}
              {isSelected && (
                <>
                  <circle
                    cx={0}
                    cy={0}
                    r={14}
                    fill="none"
                    stroke="#00E5FF"
                    strokeWidth={2}
                    className="sgp-marker-selected-ring"
                  />
                  <circle
                    cx={0}
                    cy={0}
                    r={16.5}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                    opacity={0.9}
                    filter="drop-shadow(0 0 6px rgba(0, 229, 255, 0.75))"
                  />
                </>
              )}

              {/* 2. METER SEPARATION HALO & BODY (Section 8: outer stroke rgba(255,255,255,0.90) 1.8px, dark navy body) */}
              <path
                d="M 0 -10 L 8.66 -5 L 8.66 5 L 0 10 L -8.66 5 L -8.66 -5 Z"
                fill="#0B192C"
                stroke="rgba(255, 255, 255, 0.90)"
                strokeWidth={1.8}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 15, 25, 0.40))' }}
              />

              {/* 3. SEMANTIC STATUS CORE PLATE (Section 9) */}
              <path
                d="M 0 -7 L 6.06 -3.5 L 6.06 3.5 L 0 7 L -6.06 3.5 L -6.06 -3.5 Z"
                fill={coreFill}
                stroke={coreFill}
                strokeWidth={0.8}
                strokeLinejoin="round"
              />

              {/* 4. ANALOG GAUGE GLYPH */}
              <g pointerEvents="none">
                <path
                  d="M -2.8 1.4 A 3 3 0 1 1 2.8 1.4"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={1.1}
                  strokeLinecap="round"
                />
                <circle cx={0} cy={0.4} r={0.7} fill="#FFFFFF" />
                {isOverdue ? (
                  <line x1={0} y1={0.4} x2={2.2} y2={-2.0} stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
                ) : isReview ? (
                  <line x1={0} y1={0.4} x2={1.8} y2={-1.8} stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
                ) : (
                  <line x1={0} y1={0.4} x2={1.6} y2={-1.6} stroke="#FFFFFF" strokeWidth={1.1} strokeLinecap="round" />
                )}
              </g>

              {/* 5. ISSUE BADGE: Small badge top-right with optional subtle breathing (Section 11) */}
              {isException && (
                <g transform="translate(7, -7)" className="sgp-meter-issue-badge" pointerEvents="none">
                  <circle
                    cx={0}
                    cy={0}
                    r={4.5}
                    fill={isOverdue ? '#EF4444' : '#F59E0B'}
                    stroke="#FFFFFF"
                    strokeWidth={1}
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
                  />
                  <text
                    x={0}
                    y={2.5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={6}
                    fontWeight={900}
                    fontFamily="system-ui, sans-serif"
                  >
                    !
                  </text>
                </g>
              )}
            </g>

            {/* 6. CT-CODE CALLOUT BADGE (Pill Anchored Above Marker, ONLY on hover/select) */}
            {showCodePill && (
              <g
                transform="translate(0, -22)"
                pointerEvents="none"
                className="sgp-meter-callout-pill"
              >
                <rect
                  x={-28}
                  y={-10}
                  width={56}
                  height={18}
                  rx={5}
                  fill={isOverdue ? '#EF4444' : isReview ? '#F59E0B' : '#073B5C'}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                  filter="drop-shadow(0 2px 6px rgba(0,0,0,0.35))"
                />
                <polygon
                  points="-4,8 4,8 0,12"
                  fill={isOverdue ? '#EF4444' : isReview ? '#F59E0B' : '#073B5C'}
                />
                <text
                  x={0}
                  y={3}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={9}
                  fontWeight={800}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  letterSpacing="0.02em"
                >
                  {m.meterCode}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
