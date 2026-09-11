import React, { useMemo } from 'react';
import type { MapMeterItem, MapOperationalZone } from '../types';
import { getZoneOperatorAnchor } from '../geometry/operationalGeometry';
import { deriveOperatorShiftSummary, OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';
import { OperatorMapMarker } from '../operational-map/OperatorMapMarker';

interface OperatorLayerProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedOperatorId?: string | null;
  currentRoundTime?: string;
  onSelectOperator: (operatorId: string) => void;
}

/**
 * OperatorLayer — Spatial Shift Progress Overlay for Port Operators
 *
 * Renders spatial operator markers at calibrated whitespace anchors:
 * - Circular avatar disc with initials (e.g. "NH", "TT", "LN", "PT")
 * - Outer circular progress ring representing current shift completion (0-100%)
 * - Exception count badge (overdue/review)
 * - Zero permanent name clutter (hover tooltip reveals name and progress)
 */
export const OperatorLayer: React.FC<OperatorLayerProps> = ({
  zones,
  meters,
  selectedOperatorId,
  currentRoundTime,
  onSelectOperator,
}) => {
  // Derive operator summary for each zone's assigned operator at its zone anchor
  const operatorSummaries = useMemo(() => {
    const summaries: {
      key: string;
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
            summary,
            anchor,
          });
        }
      }
    }

    return summaries;
  }, [zones, meters, currentRoundTime]);

  return (
    <g className="sgp-operator-layer" aria-label="Lớp nhân viên vận hành">
      {operatorSummaries.map(({ key, summary, anchor }) => (
        <OperatorMapMarker
          key={key}
          summary={summary}
          x={anchor.x}
          y={anchor.y}
          isSelected={selectedOperatorId === summary.operatorId}
          onClick={onSelectOperator}
        />
      ))}
    </g>
  );
};
