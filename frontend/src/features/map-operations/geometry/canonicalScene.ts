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

export const CANONICAL_MAP_VERSION = 'tan-thuan-v1';
export const CANONICAL_SCENE_WIDTH = 1664;
export const CANONICAL_SCENE_HEIGHT = 932;
export const CANONICAL_VIEWBOX = '0 0 1664 932';
export const CANONICAL_ASPECT_RATIO = CANONICAL_SCENE_WIDTH / CANONICAL_SCENE_HEIGHT;

/**
 * Explicit Presentation Transform:
 * Projects normalized coordinates [0.0, 1.0] to canonical scene coordinates [0, 1664] x [0, 932].
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
 * Calibration Gate: 12 Audited Meters with Physical Semantic Landmarks
 * All coordinates match verified visual locations on the approved physical port map.
 */
export interface MeterCalibrationRecord {
  code: string;
  name: string;
  businessZoneId: string;
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
    canonicalX: 998,
    canonicalY: 714,
    normalizedX: 0.5998,
    normalizedY: 0.7661,
    nearestLandmark: 'TRẠM ĐIỆN',
    anchorDirection: 'top',
  },
  {
    code: 'CT-002',
    name: 'Công tơ Kho B',
    businessZoneId: 'zone-warehouse',
    canonicalX: 438,
    canonicalY: 500,
    normalizedX: 0.2632,
    normalizedY: 0.5365,
    nearestLandmark: 'Kho B',
    anchorDirection: 'right',
  },
  {
    code: 'CT-003',
    name: 'Công tơ Cầu cảng 1',
    businessZoneId: 'zone-berth',
    canonicalX: 290,
    canonicalY: 415,
    normalizedX: 0.1743,
    normalizedY: 0.4453,
    nearestLandmark: 'Cầu cảng 1 (B.15–B.17)',
    anchorDirection: 'left',
  },
  {
    code: 'CT-004',
    name: 'Công tơ Cầu cảng 2',
    businessZoneId: 'zone-berth',
    canonicalX: 600,
    canonicalY: 440,
    normalizedX: 0.3606,
    normalizedY: 0.4721,
    nearestLandmark: 'Cầu cảng 2 (B.19–B.21A)',
    anchorDirection: 'left',
  },
  {
    code: 'CT-005',
    name: 'Công tơ Kho C',
    businessZoneId: 'zone-warehouse',
    canonicalX: 552,
    canonicalY: 510,
    normalizedX: 0.3317,
    normalizedY: 0.5472,
    nearestLandmark: 'Kho C',
    anchorDirection: 'right',
  },
  {
    code: 'CT-006',
    name: 'Công tơ Kho D',
    businessZoneId: 'zone-warehouse',
    canonicalX: 1018,
    canonicalY: 590,
    normalizedX: 0.6118,
    normalizedY: 0.633,
    nearestLandmark: 'Kho D (KHO)',
    anchorDirection: 'top',
  },
  {
    code: 'CT-007',
    name: 'Công tơ Trạm B',
    businessZoneId: 'zone-technical',
    canonicalX: 928,
    canonicalY: 745,
    normalizedX: 0.5577,
    normalizedY: 0.7994,
    nearestLandmark: 'Trạm điện B',
    anchorDirection: 'top',
  },
  {
    code: 'CT-008',
    name: 'Công tơ Cầu cảng 3',
    businessZoneId: 'zone-berth',
    canonicalX: 1220,
    canonicalY: 365,
    normalizedX: 0.7332,
    normalizedY: 0.3916,
    nearestLandmark: 'Cầu cảng 3 (B.21B–B.25A)',
    anchorDirection: 'left',
  },
  {
    code: 'CT-009',
    name: 'Công tơ Khu kỹ thuật 1',
    businessZoneId: 'zone-technical',
    canonicalX: 1070,
    canonicalY: 710,
    normalizedX: 0.643,
    normalizedY: 0.7618,
    nearestLandmark: 'Khu kỹ thuật 1 (CÂN XE)',
    anchorDirection: 'bottom',
  },
  {
    code: 'CT-010',
    name: 'Công tơ Khu kỹ thuật 2',
    businessZoneId: 'zone-technical',
    canonicalX: 980,
    canonicalY: 840,
    normalizedX: 0.5889,
    normalizedY: 0.9013,
    nearestLandmark: 'Khu kỹ thuật 2 (CỔNG CHÍNH)',
    anchorDirection: 'bottom',
  },
  {
    code: 'CT-011',
    name: 'Công tơ Bãi Container 1',
    businessZoneId: 'zone-container',
    canonicalX: 1018,
    canonicalY: 480,
    normalizedX: 0.6118,
    normalizedY: 0.515,
    nearestLandmark: 'Bãi Container 1 (CY 1)',
    anchorDirection: 'top',
  },
  {
    code: 'CT-012',
    name: 'Công tơ Bãi Container 2',
    businessZoneId: 'zone-container',
    canonicalX: 1222,
    canonicalY: 470,
    normalizedX: 0.7344,
    normalizedY: 0.5043,
    nearestLandmark: 'Bãi Container 2 (CY 2)',
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
  'zone-berth': { x: 800, y: 445 },     // Quayside apron whitespace between crane and B.19
  'zone-warehouse': { x: 495, y: 535 }, // Open asphalt corridor between Kho B and Kho C
  'zone-container': { x: 1140, y: 525 },// Staging apron corridor south of container block 2
  'zone-technical': { x: 1000, y: 775 },// Open courtyard green lawn between Substation and Gate
};
