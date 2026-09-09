/**
 * ==============================================================================
 * SAIGON PORT MAP OPERATIONS CONSOLE — SCHEMATIC CONFIGURATION & ADAPTER
 * ==============================================================================
 *
 * NOTE FOR PHASE 2 MIGRATION:
 * The meter coordinates and operational zone polygons defined below serve as the
 * Phase 1 schematic adapter. In Phase 2, this metadata will be migrated into the
 * database tables `operational_zones` and `meters` (columns `map_x`, `map_y`, `zone_id`),
 * and this file will act as the canonical fallback / default seed configuration.
 *
 * Coordinate system: Normalized [0.0, 1.0] x [0.0, 1.0].
 * - X: 0.0 (West / Inland / Main Gate) -> 1.0 (East / Saigon River quayside)
 * - Y: 0.0 (North / Upstream) -> 1.0 (South / Downstream)
 */

import { NormalizedPoint, OperationalZoneConfig } from '../types';

export interface MeterCoordinateAdapter {
  meterCode: string;
  zoneId: string;
  coordinates: NormalizedPoint;
  anchorDirection?: 'top' | 'bottom' | 'left' | 'right';
}

export const PORT_MAP_DIMENSIONS = {
  viewBoxWidth: 1000,
  viewBoxHeight: 650,
  aspectRatio: 1000 / 650,
};

/**
 * 4 Operational Zones of Saigon Port (Tân Thuận / Khánh Hội terminal)
 */
export const OPERATIONAL_ZONES_CONFIG: OperationalZoneConfig[] = [
  {
    id: 'zone-berth',
    code: 'ZONE-BERTH',
    name: 'Khu vực Cầu cảng (Berths 1 - 3)',
    shortName: 'Cầu cảng',
    description: 'Tuyến bến cầu tàu tiếp nhận tàu hàng tổng hợp và container dọc sông Sài Gòn.',
    polygon: [
      { x: 0.62, y: 0.10 },
      { x: 0.82, y: 0.10 },
      { x: 0.84, y: 0.92 },
      { x: 0.64, y: 0.92 },
      { x: 0.62, y: 0.58 },
    ],
    labelPosition: { x: 0.74, y: 0.14 },
    primaryColor: '#0B4F75',
    defaultAssignedUser: {
      id: 'user-op-1',
      fullName: 'Nguyễn Văn Hải',
      employeeCode: 'NV001',
      role: 'EMPLOYEE',
    },
  },
  {
    id: 'zone-container',
    code: 'ZONE-CONTAINER',
    name: 'Khu vực Bãi Container (CY)',
    shortName: 'Bãi Container',
    description: 'Bãi tập kết, bốc dỡ container tiền phương và hậu phương phục vụ tàu cập cảng.',
    polygon: [
      { x: 0.35, y: 0.32 },
      { x: 0.60, y: 0.32 },
      { x: 0.61, y: 0.75 },
      { x: 0.34, y: 0.75 },
    ],
    labelPosition: { x: 0.47, y: 0.35 },
    primaryColor: '#12658F',
    defaultAssignedUser: {
      id: 'user-op-2',
      fullName: 'Trần Minh Tuấn',
      employeeCode: 'NV002',
      role: 'EMPLOYEE',
    },
  },
  {
    id: 'zone-warehouse',
    code: 'ZONE-WAREHOUSE',
    name: 'Khu vực Kho hàng Tổng hợp (B, C, D)',
    shortName: 'Kho bãi',
    description: 'Hệ thống kho hàng tổng hợp kín và bãi đệm bốc xếp hàng rời, bao kiện.',
    polygon: [
      { x: 0.10, y: 0.12 },
      { x: 0.32, y: 0.12 },
      { x: 0.32, y: 0.60 },
      { x: 0.08, y: 0.60 },
    ],
    labelPosition: { x: 0.20, y: 0.15 },
    primaryColor: '#245270',
    defaultAssignedUser: {
      id: 'user-op-3',
      fullName: 'Lê Hoàng Nam',
      employeeCode: 'NV003',
      role: 'EMPLOYEE',
    },
  },
  {
    id: 'zone-technical',
    code: 'ZONE-TECHNICAL',
    name: 'Khu Kỹ thuật & Trạm Phụ trợ Điện',
    shortName: 'Trạm & Kỹ thuật',
    description: 'Trạm biến áp trung/hạ thế, xưởng sửa chữa cơ giới và trung tâm kỹ thuật năng lượng.',
    polygon: [
      { x: 0.08, y: 0.64 },
      { x: 0.60, y: 0.78 },
      { x: 0.60, y: 0.94 },
      { x: 0.08, y: 0.94 },
    ],
    labelPosition: { x: 0.22, y: 0.88 },
    primaryColor: '#476375',
    defaultAssignedUser: {
      id: 'user-op-4',
      fullName: 'Phạm Đức Trọng',
      employeeCode: 'NV004',
      role: 'EMPLOYEE',
    },
  },
];

/**
 * Normalized coordinates for all 12 operational meters.
 * [TEMPORARY METADATA FOR PHASE 2 MIGRATION]
 */
export const METER_COORDINATES_ADAPTER: Record<string, MeterCoordinateAdapter> = {
  'CT-001': {
    meterCode: 'CT-001',
    zoneId: 'zone-technical',
    coordinates: { x: 0.18, y: 0.74 },
    anchorDirection: 'top',
  },
  'CT-002': {
    meterCode: 'CT-002',
    zoneId: 'zone-warehouse',
    coordinates: { x: 0.20, y: 0.24 },
    anchorDirection: 'right',
  },
  'CT-003': {
    meterCode: 'CT-003',
    zoneId: 'zone-berth',
    coordinates: { x: 0.72, y: 0.24 },
    anchorDirection: 'left',
  },
  'CT-004': {
    meterCode: 'CT-004',
    zoneId: 'zone-berth',
    coordinates: { x: 0.73, y: 0.50 },
    anchorDirection: 'left',
  },
  'CT-005': {
    meterCode: 'CT-005',
    zoneId: 'zone-warehouse',
    coordinates: { x: 0.21, y: 0.38 },
    anchorDirection: 'right',
  },
  'CT-006': {
    meterCode: 'CT-006',
    zoneId: 'zone-warehouse',
    coordinates: { x: 0.22, y: 0.52 },
    anchorDirection: 'right',
  },
  'CT-007': {
    meterCode: 'CT-007',
    zoneId: 'zone-technical',
    coordinates: { x: 0.36, y: 0.84 },
    anchorDirection: 'top',
  },
  'CT-008': {
    meterCode: 'CT-008',
    zoneId: 'zone-berth',
    coordinates: { x: 0.74, y: 0.78 },
    anchorDirection: 'left',
  },
  'CT-009': {
    meterCode: 'CT-009',
    zoneId: 'zone-technical',
    coordinates: { x: 0.40, y: 0.20 },
    anchorDirection: 'bottom',
  },
  'CT-010': {
    meterCode: 'CT-010',
    zoneId: 'zone-technical',
    coordinates: { x: 0.52, y: 0.20 },
    anchorDirection: 'bottom',
  },
  'CT-011': {
    meterCode: 'CT-011',
    zoneId: 'zone-container',
    coordinates: { x: 0.44, y: 0.46 },
    anchorDirection: 'top',
  },
  'CT-012': {
    meterCode: 'CT-012',
    zoneId: 'zone-container',
    coordinates: { x: 0.49, y: 0.62 },
    anchorDirection: 'top',
  },
};

/**
 * Port schematic landmark lines and river features for background visual context
 */
export const PORT_SCHEMATIC_FEATURES = {
  // River quayside line along Saigon River
  quaysidePath: 'M 830,60 L 845,260 L 850,420 L 855,600',
  riverWaterRect: { x: 840, y: 0, width: 160, height: 650 },
  // Main port perimeter fence
  perimeterPath: 'M 60,60 L 830,60 L 855,610 L 60,610 Z',
  // Main gate position
  mainGate: { x: 60, y: 340, label: 'CỔNG CHÍNH CẢNG SÀI GÒN' },
};
