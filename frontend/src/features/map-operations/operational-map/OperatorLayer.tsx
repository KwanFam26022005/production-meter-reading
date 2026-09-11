import React, { useMemo } from 'react';
import type { MapMeterItem, MapOperationalZone } from '../types';
import { getZoneOperatorAnchor } from '../geometry/operationalGeometry';
import {
  deriveOperatorShiftSummary,
  type OperatorShiftSummary,
} from '../utils/deriveOperatorShiftSummary';
import { OperatorMapMarker } from './OperatorMapMarker';

export interface OperatorLayerProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedOperatorId?: string | null;
  currentRoundTime?: string;
  onSelectOperator: (operatorId: string) => void;
}

/**
 * OperatorLayer — Spatial layer rendering responsible operators directly on the operational map.
 *
 * Rules:
 * - 1 marker per unique active operator across all operational zones.
 * - Multi-zone assignments are aggregated into a single unified shift summary.
 * - Marker anchor is placed deterministically at the primary zone's operatorAnchorSvg.
 * - Circular progress ring indicates current shift progress (0-100%).
 * - Separate exception badges for overdue / review meters.
 */
export const OperatorLayer: React.FC<OperatorLayerProps> = ({
  zones,
  meters,
  selectedOperatorId,
  currentRoundTime,
  onSelectOperator,
}) => {
  const operatorMarkers = useMemo(() => {
    // Map unique operators to their primary assigned zone
    const operatorMap = new Map<
      string,
      {
        operator: { id: string; fullName: string; employeeCode?: string };
        primaryZoneId: string;
      }
    >();

    for (const zone of zones) {
      if (zone.assignedUser?.id) {
        if (!operatorMap.has(zone.assignedUser.id)) {
          operatorMap.set(zone.assignedUser.id, {
            operator: zone.assignedUser,
            primaryZoneId: zone.id,
          });
        }
      }
    }

    const items: Array<{
      summary: OperatorShiftSummary;
      anchor: { x: number; y: number };
    }> = [];

    for (const { operator, primaryZoneId } of operatorMap.values()) {
      const summary = deriveOperatorShiftSummary(
        operator,
        zones,
        meters,
        currentRoundTime
      );
      if (summary) {
        const anchor = getZoneOperatorAnchor(primaryZoneId);
        items.push({ summary, anchor });
      }
    }

    return items;
  }, [zones, meters, currentRoundTime]);

  if (operatorMarkers.length === 0) {
    return null;
  }

  return (
    <g className="sgp-operator-layer" aria-label="Lớp nhân sự phụ trách tác nghiệp">
      {operatorMarkers.map(({ summary, anchor }) => (
        <OperatorMapMarker
          key={summary.operatorId}
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
