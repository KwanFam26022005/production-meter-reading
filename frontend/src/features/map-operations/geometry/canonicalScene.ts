/**
 * Canonical Spatial Scene Geometry & Calibration — Cảng Tân Thuận
 * Phase H1: Authoritative Physical Map Base Scene + Vector Operational Overlay
 *
 * Canvas Properties:
 * - Version: "tan-thuan-v1"
 * - Master Scene ViewBox: "0 0 1664 932"
 * - Base Map Asset Dimensions: 1664 x 932 px
 * - Aspect Ratio: 1664 / 932 (~1.7854)
 * - Single Unified Coordinate System: SVG world group transforms both base map and overlays.
 */

import type { NormalizedPoint } from '../types';

export const CANONICAL_MAP_VERSION = 'tan-thuan-v2';
export const CANONICAL_SCENE_WIDTH = 1915;
export const CANONICAL_SCENE_HEIGHT = 821;
export const CANONICAL_VIEWBOX = '0 0 1915 821';
export const CANONICAL_ASPECT_RATIO = CANONICAL_SCENE_WIDTH / CANONICAL_SCENE_HEIGHT;

/**
 * Explicit Presentation Transform:
 * Projects normalized coordinates [0.0, 1.0] to canonical scene coordinates [0, 1915] x [0, 821].
 * Single helper used across all layers and contextual surfaces.
 */
export function normalizedToCanonicalScene(point: NormalizedPoint): { x: number; y: number } {
  return {
    x: Math.round(point.x * CANONICAL_SCENE_WIDTH),
    y: Math.round(point.y * CANONICAL_SCENE_HEIGHT),
  };
}

/**
 * Inverse Presentation Transform:
 * Projects canonical scene pixel coordinates to normalized coordinates [0.0, 1.0].
 */
export function canonicalSceneToNormalized(x: number, y: number): NormalizedPoint {
  return {
    x: Number((x / CANONICAL_SCENE_WIDTH).toFixed(4)),
    y: Number((y / CANONICAL_SCENE_HEIGHT).toFixed(4)),
  };
}

// Canonical Aliases for backward-compatibility
export const normalizedToSvg = normalizedToCanonicalScene;
export const svgToNormalized = canonicalSceneToNormalized;

/**
 * Calibration Gate: 12 Audited Meters with Physical Semantic Landmarks on V2
 * All coordinates match verified visual locations on the approved canonical port base map.
 */
export interface MeterCalibrationRecord {
  code: string;
  name: string;
  businessZoneId: string;
  presentationRegionId?: string;
  canonicalX: number;
  canonicalY: number;
  normalizedX: number;
  normalizedY: number;
  nearestLandmark: string;
  anchorDirection: 'top' | 'bottom' | 'left' | 'right';
}

export const CANONICAL_12_METERS_AUDIT: MeterCalibrationRecord[] = [
  {
    code: 'CT-001',
    name: 'Công tơ Trạm A',
    businessZoneId: 'zone-technical',
    presentationRegionId: 'pres-technical',
    canonicalX: 1148,
    canonicalY: 686,
    normalizedX: 0.5995,
    normalizedY: 0.8356,
    nearestLandmark: 'Trạm điện A / Trạm biến áp trung thế',
    anchorDirection: 'top',
  },
  {
    code: 'CT-002',
    name: 'Công tơ Kho B',
    businessZoneId: 'zone-warehouse',
    presentationRegionId: 'pres-container-west',
    canonicalX: 507,
    canonicalY: 465,
    normalizedX: 0.2648,
    normalizedY: 0.5664,
    nearestLandmark: 'Kho B (Gian kho tổng hợp phía Tây)',
    anchorDirection: 'right',
  },
  {
    code: 'CT-003',
    name: 'Công tơ Cầu cảng 1',
    businessZoneId: 'zone-berth',
    presentationRegionId: 'pres-berth',
    canonicalX: 337,
    canonicalY: 376,
    normalizedX: 0.1760,
    normalizedY: 0.4580,
    nearestLandmark: 'Cầu cảng 1 (Cần cẩu B.15–B.17)',
    anchorDirection: 'left',
  },
  {
    code: 'CT-004',
    name: 'Công tơ Cầu cảng 2',
    businessZoneId: 'zone-berth',
    presentationRegionId: 'pres-berth',
    canonicalX: 694,
    canonicalY: 370,
    normalizedX: 0.3624,
    normalizedY: 0.4507,
    nearestLandmark: 'Cầu cảng 2 (Cần cẩu B.19–B.21A)',
    anchorDirection: 'left',
  },
  {
    code: 'CT-005',
    name: 'Công tơ Kho C',
    businessZoneId: 'zone-warehouse',
    presentationRegionId: 'pres-container-west',
    canonicalX: 639,
    canonicalY: 475,
    normalizedX: 0.3337,
    normalizedY: 0.5786,
    nearestLandmark: 'Kho C (Gian kho hàng rời phía Tây)',
    anchorDirection: 'right',
  },
  {
    code: 'CT-006',
    name: 'Công tơ Kho D',
    businessZoneId: 'zone-warehouse',
    presentationRegionId: 'pres-cfs-east',
    canonicalX: 1680,
    canonicalY: 380,
    normalizedX: 0.8773,
    normalizedY: 0.4629,
    nearestLandmark: 'Kho D / Kho CFS phía Đông',
    anchorDirection: 'top',
  },
  {
    code: 'CT-007',
    name: 'Công tơ Trạm B',
    businessZoneId: 'zone-technical',
    presentationRegionId: 'pres-technical',
    canonicalX: 1068,
    canonicalY: 720,
    normalizedX: 0.5577,
    normalizedY: 0.8770,
    nearestLandmark: 'Trạm điện B (Phụ trợ kỹ thuật phía Nam)',
    anchorDirection: 'top',
  },
  {
    code: 'CT-008',
    name: 'Công tơ Cầu cảng 3',
    businessZoneId: 'zone-berth',
    presentationRegionId: 'pres-berth',
    canonicalX: 1400,
    canonicalY: 313,
    normalizedX: 0.7311,
    normalizedY: 0.3812,
    nearestLandmark: 'Cầu cảng 3 (Cần cẩu giàn B.21B–B.25A)',
    anchorDirection: 'left',
  },
  {
    code: 'CT-009',
    name: 'Công tơ Khu kỹ thuật 1',
    businessZoneId: 'zone-technical',
    presentationRegionId: 'pres-technical',
    canonicalX: 1229,
    canonicalY: 681,
    normalizedX: 0.6418,
    normalizedY: 0.8295,
    nearestLandmark: 'Khu kỹ thuật 1 (Trạm cân xe & xưởng cơ giới)',
    anchorDirection: 'bottom',
  },
  {
    code: 'CT-010',
    name: 'Công tơ Khu kỹ thuật 2',
    businessZoneId: 'zone-technical',
    presentationRegionId: 'pres-gate',
    canonicalX: 1640,
    canonicalY: 560,
    normalizedX: 0.8564,
    normalizedY: 0.6821,
    nearestLandmark: 'Khu kỹ thuật 2 (CỔNG CHÍNH vào cảng)',
    anchorDirection: 'bottom',
  },
  {
    code: 'CT-011',
    name: 'Công tơ Bãi Container 1',
    businessZoneId: 'zone-container',
    presentationRegionId: 'pres-container-center',
    canonicalX: 1171,
    canonicalY: 437,
    normalizedX: 0.6115,
    normalizedY: 0.5323,
    nearestLandmark: 'Bãi Container 1 (CY Block A Trung tâm)',
    anchorDirection: 'top',
  },
  {
    code: 'CT-012',
    name: 'Công tơ Bãi Container 2',
    businessZoneId: 'zone-container',
    presentationRegionId: 'pres-container-center',
    canonicalX: 1402,
    canonicalY: 424,
    normalizedX: 0.7321,
    normalizedY: 0.5164,
    nearestLandmark: 'Bãi Container 2 (CY Block B Trung tâm)',
    anchorDirection: 'top',
  },
];

/**
 * Calibrated Operator Anchors in visual whitespace inside operational areas:
 * - Avoids meter markers (> 40px clearance)
 * - Avoids major physical labels and building text
 * - Avoids arterial roads and vehicle traffic lanes
 * - Clearly belongs to the assigned zone
 */
export const CANONICAL_OPERATOR_ANCHORS: Record<string, { x: number; y: number }> = {
  'zone-berth': { x: 920, y: 330 },
  'zone-warehouse': { x: 440, y: 480 },
  'zone-container': { x: 1280, y: 440 },
  'zone-technical': { x: 1100, y: 770 },
};

/**
 * Clamps pan coordinates so the canonical scene stays fully within the viewport bounds.
 * Prevents "black void" exposure when zooming into or focusing on edge assets.
 */
export function clampPanForZoom(
  panX: number,
  panY: number,
  zoom: number,
  width: number = CANONICAL_SCENE_WIDTH,
  height: number = CANONICAL_SCENE_HEIGHT
): { panX: number; panY: number } {
  if (zoom <= 1) {
    const minX = (width * (1 - zoom)) / 2;
    const minY = (height * (1 - zoom)) / 2;
    return {
      panX: Math.round(minX),
      panY: Math.round(minY),
    };
  }

  const minX = width * (1 - zoom);
  const maxX = 0;
  const minY = height * (1 - zoom);
  const maxY = 0;

  return {
    panX: Math.round(Math.min(Math.max(panX, minX), maxX)),
    panY: Math.round(Math.min(Math.max(panY, minY), maxY)),
  };
}

