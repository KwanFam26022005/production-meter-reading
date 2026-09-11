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
  mode?: MapMode;
  selectedEntity?: SelectedEntity;
  targetPlacementZoneId?: string;
  onSelectOperator: (operatorId: string) => void;
}

/**
 * OperatorLayer — Spatial Shift Progress Overlay for Port Operators
 *
 * Renders spatial operator markers at calibrated whitespace anchors:
 * - Circular avatar disc with initials (e.g. "NH", "TT", "LN", "PT")
 * - Outer circular progress ring representing current shift completion (0-100%)
 * - Exception count badge (overdue/review) ONLY when issue count > 0
 * - When a zone is selected: assigned operator 100%, other operators 25% opacity
 */
export const OperatorLayer: React.FC<OperatorLayerProps> = ({
  zones,
  meters,
  selectedZoneId,
  selectedOperatorId,
  currentRoundTime,
  mode = 'browse',
  selectedEntity = null,
  targetPlacementZoneId,
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

  return (
    <g className="sgp-operator-layer" aria-label="Lớp nhân viên vận hành">
      {operatorSummaries.map(({ key, zoneId, summary, anchor }) => {
        const isAssigned =
          !selectedZoneId ||
          zoneId === selectedZoneId ||
          zoneId === targetBusinessZoneId;
        const isDimmed = Boolean(selectedZoneId && !isAssigned);

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
            isSelected={selectedOperatorId === summary.operatorId || activeSelectedEntity?.id === summary.operatorId}
            isDimmed={isDimmed}
            emphasis={emphasis}
            onClick={onSelectOperator}
          />
        );
      })}
    </g>
  );
};
