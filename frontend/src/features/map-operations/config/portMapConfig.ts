/**
 * ==============================================================================
 * SAIGON PORT MAP OPERATIONS CONSOLE — SCHEMATIC CONFIGURATION & ADAPTER
 * ==============================================================================
 *
 * Canonical Tan Thuan Port Scene Dimensions:
 * - 1664 x 932 px
 * - Aspect Ratio: 1664 / 932 (~1.7854)
 * - Single Unified Coordinate System
 */

import { NormalizedPoint, OperationalZoneConfig } from '../types';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  CANONICAL_ASPECT_RATIO,
  CANONICAL_12_METERS_AUDIT,
} from '../geometry/canonicalScene';
import { OPERATIONAL_ZONES_GEOMETRY } from '../geometry/operationalGeometry';

export interface MeterCoordinateAdapter {
  meterCode: string;
  zoneId: string;
  coordinates: NormalizedPoint;
  anchorDirection?: 'top' | 'bottom' | 'left' | 'right';
}

export const PORT_MAP_DIMENSIONS = {
  viewBoxWidth: CANONICAL_SCENE_WIDTH,
  viewBoxHeight: CANONICAL_SCENE_HEIGHT,
  aspectRatio: CANONICAL_ASPECT_RATIO,
};

/**
 * 4 Canonical Operational Zones of Saigon Port (Tân Thuận terminal)
 */
export const OPERATIONAL_ZONES_CONFIG: OperationalZoneConfig[] = OPERATIONAL_ZONES_GEOMETRY.map((g) => ({
  id: g.id,
  code: g.code,
  name: g.name,
  shortName: g.shortName,
  description: g.name,
  polygon: g.normalizedPolygon,
  labelPosition: g.centroidNormalized,
  primaryColor: g.primaryColor || g.accentColor || g.boundaryColor || '#0284C7',
  defaultAssignedUser: {
    id: `user-op-${g.id}`,
    fullName:
      g.id === 'zone-berth'
        ? 'Nguyễn Văn Hải'
        : g.id === 'zone-container'
        ? 'Trần Minh Tuấn'
        : g.id === 'zone-warehouse'
        ? 'Lê Hoàng Nam'
        : 'Phạm Đức Trọng',
    employeeCode:
      g.id === 'zone-berth'
        ? 'NV001'
        : g.id === 'zone-container'
        ? 'NV002'
        : g.id === 'zone-warehouse'
        ? 'NV003'
        : 'NV004',
    role: 'EMPLOYEE',
  },
}));

/**
 * Normalized coordinates for all 12 operational meters (canonical seed fallback).
 */
export const METER_COORDINATES_ADAPTER: Record<string, MeterCoordinateAdapter> = Object.fromEntries(
  CANONICAL_12_METERS_AUDIT.map((m) => [
    m.code,
    {
      meterCode: m.code,
      zoneId: m.businessZoneId,
      coordinates: { x: m.normalizedX, y: m.normalizedY },
      anchorDirection: m.anchorDirection,
    },
  ])
);
