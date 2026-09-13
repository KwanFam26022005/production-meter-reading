import React, { useMemo } from 'react';
import type { MapMeterItem, MapOperationalZone } from '../types';
import { getZoneOperatorAnchor, resolveToBusinessZoneId } from '../geometry/operationalGeometry';
import { deriveOperatorShiftSummary, OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';
import { OperatorMapMarker } from '../operational-map/OperatorMapMarker';
import { calculateSpatialEmphasis } from '../state/spatialVisualEmphasis';
import type { SelectedEntity, MapMode } from '../state/useMapStateMachine';

interface OperatorLayerProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedZoneId?: string | null;
  selectedOperatorId?: string | null;
  currentRoundTime?: string;
  zoomLevel?: number;
  mode?: MapMode;
  selectedEntity?: SelectedEntity;
  targetPlacementZoneId?: string;
  filterTier?: 'all' | 'normal' | 'issue' | 'selected';
  activeWorkflowState?: string;
  operatorActivity?: {
    state?: 'idle' | 'moving' | 'arriving' | 'reading' | 'completed' | string;
    targetMeterId?: string;
  } | null;
  onSelectOperator: (operatorId: string) => void;
}

/**
 * OperatorLayer — Spatial Shift Progress Overlay for Port Operators (V13.4)
 *
 * Renders spatial operator markers at calibrated whitespace anchors:
 * - Circular avatar disc with initials (e.g. "NH", "TT", "LN", "PT")
 * - Outer circular progress ring representing current shift completion (0-100%)
 * - Exception count badge (overdue/review) ONLY when issue count > 0
 * - Screen-size normalization and >= 44px hit target
 * - Supports filterTier ('all' | 'normal' | 'issue' | 'selected') for strict Z-order priority
 */
export const OperatorLayer: React.FC<OperatorLayerProps> = ({
  zones,
  meters,
  selectedZoneId,
  selectedOperatorId,
  currentRoundTime,
  zoomLevel = 1,
  mode = 'browse',
  selectedEntity = null,
  targetPlacementZoneId,
  filterTier = 'all',
  activeWorkflowState,
  operatorActivity,
  onSelectOperator,
}) => {
  // Derive operator summary for each zone's assigned operator at its zone anchor
  const operatorSummaries = useMemo(() => {
    const summaries: {
      key: string;
      zoneId: string;
      summary: OperatorShiftSummary;
      anchor: { x: number; y: number };
    }[] = [];

    for (const z of zones) {
      if (z.assignedUser?.id) {
        const summary = deriveOperatorShiftSummary(
          z.assignedUser,
          zones,
          meters,
          currentRoundTime
        );

        if (summary) {
          const anchor = getZoneOperatorAnchor(z.id);
          summaries.push({
            key: `${z.id}-${z.assignedUser.id}`,
            zoneId: z.id,
            summary,
            anchor,
          });
        }
      }
    }

    return summaries;
  }, [zones, meters, currentRoundTime]);

  const targetBusinessZoneId = resolveToBusinessZoneId(selectedZoneId);

  // Active entity for emphasis resolution
  const activeSelectedEntity = selectedEntity || (
    selectedOperatorId
      ? { type: 'operator' as const, id: selectedOperatorId }
      : selectedZoneId
      ? { type: 'zone' as const, id: selectedZoneId }
      : null
  );

  const zoneMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of zones) {
      map.set(z.id, z.name);
    }
    return map;
  }, [zones]);

  // Filter & sort operators by Z-order render priority:
  // Normal operators -> Issue operators -> Selected operator
  const filteredSummaries = useMemo(() => {
    let list = operatorSummaries.slice();

    if (filterTier !== 'all') {
      list = list.filter(({ summary }) => {
        const isSelected =
          selectedOperatorId === summary.operatorId ||
          activeSelectedEntity?.id === summary.operatorId;
        const hasIssues = summary.overdueMeters + summary.reviewMeters > 0;

        if (filterTier === 'normal') return !isSelected && !hasIssues;
        if (filterTier === 'issue') return hasIssues && !isSelected;
        if (filterTier === 'selected') return isSelected;
        return true;
      });
    } else {
      // Sort so normal < issue < selected (selected always renders on top)
      list.sort((a, b) => {
        const aSelected =
          selectedOperatorId === a.summary.operatorId ||
          activeSelectedEntity?.id === a.summary.operatorId
            ? 2
            : 0;
        const bSelected =
          selectedOperatorId === b.summary.operatorId ||
          activeSelectedEntity?.id === b.summary.operatorId
            ? 2
            : 0;
        const aIssue =
          a.summary.overdueMeters + a.summary.reviewMeters > 0 ? 1 : 0;
        const bIssue =
          b.summary.overdueMeters + b.summary.reviewMeters > 0 ? 1 : 0;
        return aSelected + aIssue - (bSelected + bIssue);
      });
    }

    return list;
  }, [operatorSummaries, filterTier, selectedOperatorId, activeSelectedEntity]);

  return (
    <g className="sgp-operator-layer" aria-label="Lớp nhân viên vận hành">
      {filteredSummaries.map(({ key, zoneId, summary, anchor }) => {
        const isAssigned =
          !selectedZoneId ||
          zoneId === selectedZoneId ||
          zoneId === targetBusinessZoneId;
        const isDimmed = Boolean(selectedZoneId && !isAssigned);
        const isZoneFocused = Boolean(
          selectedZoneId &&
            (selectedZoneId === zoneId || targetBusinessZoneId === zoneId)
        );

        const emphasis = calculateSpatialEmphasis({
          mode,
          selectedEntity: activeSelectedEntity,
          targetPlacementZoneId,
          entityType: 'operator',
          entityId: summary.operatorId,
          zoneId,
          assignedZoneIds: summary.activeZoneIds,
        });

        return (
          <OperatorMapMarker
            key={key}
            summary={summary}
            x={anchor.x}
            y={anchor.y}
            isSelected={
              selectedOperatorId === summary.operatorId ||
              activeSelectedEntity?.id === summary.operatorId
            }
            isDimmed={isDimmed}
            emphasis={emphasis}
            zoomLevel={zoomLevel}
            zoneName={zoneMap.get(zoneId)}
            isZoneFocused={isZoneFocused}
            activeWorkflowState={activeWorkflowState}
            operatorActivity={operatorActivity}
            onClick={onSelectOperator}
          />
        );
      })}
    </g>
  );
};
