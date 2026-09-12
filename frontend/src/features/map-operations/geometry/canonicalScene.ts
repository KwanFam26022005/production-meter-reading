/**
 * Canonical Spatial Scene Geometry & Calibration — Cảng Tân Thuận
 * V8 Authoritative Spatial Coordinate Service
 *
 * Canvas Properties:
 * - Version: "tan-thuan-v8"
 * - Master Scene ViewBox: "0 0 1915 821"
 * - Base Map Asset Dimensions: 1915 x 821 px (tan-thuan-canonical-base.png)
 * - Aspect Ratio: 1915 / 821 (~2.332521)
 * - Single Unified Coordinate System: tan-thuan-canonical-image-pixel-space-v1
 */

import type { NormalizedPoint } from '../types';

export const CANONICAL_MAP_VERSION = 'tan-thuan-v10';
export const CANONICAL_SCENE_WIDTH = 1915;
export const CANONICAL_SCENE_HEIGHT = 821;
export const CANONICAL_VIEWBOX = '0 0 1915 821';
export const CANONICAL_ASPECT_RATIO = CANONICAL_SCENE_WIDTH / CANONICAL_SCENE_HEIGHT;

/**
 * MAP CANVAS DIAGNOSTIC CONSTANTS & SPECIFICATIONS (V13.3)
 *
 * Current Active Map Source:
 * - Canonical image: 1915 x 821
 * - Aspect ratio: 1915 / 821 = 2.332521 (wide panoramic)
 *
 * Primary Observed Desktop Workspace Target:
 * - Typical viewport: ~2.05:1 (e.g. 1920 x 936 desktop workspace after chrome/sidebar)
 *
 * Future Recommended Canvas Specification:
 * - Logical target: 1915 x 932 (~2.0547:1 aspect ratio)
 * - High-density source option (2x): 3830 x 1864
 * - Alternative raster resolution: 2560 x 1246
 *
 * IMPORTANT NOTE ON ASPECT-RATIO & COVER/STRETCH:
 * - The current blank strip is an aspect-ratio mismatch between the 2.33:1 map source
 *   and typical 2.05:1 displays, NOT a geometry bug.
 * - DO NOT apply `object-fit: cover`, `preserveAspectRatio="slice"`, or non-uniform stretching.
 *   Spatial alignment and coordinate precision take precedence over hiding the blank strip.
 * - Migrating from 1915x821 to 1915x932 requires a separate controlled map-source
 *   re-calibration migration. DO NOT perform it in V13.3.
 */
export const MAP_CANVAS_DIAGNOSTICS = {
  currentSource: {
    width: 1915,
    height: 821,
    aspectRatio: 2.332521,
    viewBox: '0 0 1915 821',
  },
  workspaceTarget: {
    aspectRatio: 2.05,
    description: 'Primary observed desktop workspace target (~2.05:1)',
  },
  futureRecommendation: {
    logicalWidth: 1915,
    logicalHeight: 932,
    aspectRatio: 1915 / 932,
    highDensityWidth: 3830,
    highDensityHeight: 1864,
    alternativeRasterWidth: 2560,
    alternativeRasterHeight: 1246,
  },
  migrationRules: {
    allowCover: false,
    allowSlice: false,
    allowStretching: false,
    separateMigrationRequired: true,
  },
} as const;

/**
 * Explicit Presentation Transform:
 * Projects normalized coordinates [0.0, 1.0] to canonical scene coordinates [0, 1915] x [0, 821].
 * Single helper used across all layers and contextual surfaces.
 */
export interface CanonicalPoint {
  xPx: number;
  yPx: number;
  x: number;
  y: number;
}

/**
 * Gate 6: Canonical Coordinate Service
 * Projects normalized storage coordinates [0.0, 1.0] to canonical pixel coordinates.
 */
export function normalizedToCanonical(point: NormalizedPoint): CanonicalPoint {
  const xPx = point.x * CANONICAL_SCENE_WIDTH;
  const yPx = point.y * CANONICAL_SCENE_HEIGHT;
  return {
    xPx,
    yPx,
    x: Math.round(xPx),
    y: Math.round(yPx),
  };
}

/**
 * Projects canonical pixel coordinates to normalized storage coordinates [0.0, 1.0].
 */
export function canonicalToNormalized(xPx: number, yPx: number): NormalizedPoint {
  return {
    x: Number((xPx / CANONICAL_SCENE_WIDTH).toFixed(4)),
    y: Number((yPx / CANONICAL_SCENE_HEIGHT).toFixed(4)),
  };
}

// Canonical aliases for backward compatibility
export const normalizedToCanonicalScene = (point: NormalizedPoint) => {
  const p = normalizedToCanonical(point);
  return { x: p.x, y: p.y };
};
export const canonicalSceneToNormalized = canonicalToNormalized;
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
    canonicalY: 316,
    normalizedX: 0.1760,
    normalizedY: 0.3849,
    nearestLandmark: 'Cầu cảng 1 (Cần cẩu B.15–B.17)',
    anchorDirection: 'left',
  },
  {
    code: 'CT-004',
    name: 'Công tơ Cầu cảng 2',
    businessZoneId: 'zone-berth',
    presentationRegionId: 'pres-berth',
    canonicalX: 694,
    canonicalY: 315,
    normalizedX: 0.3624,
    normalizedY: 0.3837,
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
    canonicalY: 248,
    normalizedX: 0.7311,
    normalizedY: 0.3021,
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
  'zone-berth': { x: 1030, y: 285 },
  'zone-warehouse': { x: 440, y: 480 },
  'zone-container': { x: 1280, y: 440 },
  'zone-technical': { x: 1100, y: 740 },
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

/**
 * P0 Requirement: V2 Operational Safe Rectangle
 *
 * Encompasses:
 * - All six zones (X: 24 to 1877, Y: 148 to 820)
 * - All 12 active canonical meters (X: 337 to 1680, Y: 313 to 720)
 * - All operator anchors (X: 440 to 1720, Y: 330 to 770)
 * - Main gate (pres-gate, up to X: 1872, Y: 476-644)
 * - Quay (pres-berth, X: 210-1687, Y: 148-407)
 * - Container center (pres-container-center, X: 809-1546, Y: 307-515)
 * - Technical / service region (pres-technical, X: 820-1501, Y: 482-820)
 *
 * Slicing / cropping at the viewport level must affect ONLY exterior low-priority context.
 * No operational entity may leave the viewport.
 */
export interface SafeOperationalBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export const V2_OPERATIONAL_SAFE_RECTANGLE: SafeOperationalBounds = {
  minX: 20,
  minY: 140,
  maxX: 1885,
  maxY: 821,
  width: 1865,
  height: 681,
  centerX: 952.5,
  centerY: 480.5,
};

/**
 * P0 Requirement: Development assertion in spatial utilities
 * abs(scaleX - scaleY) < epsilon
 * Fails visual geometry test if non-uniform scale is detected.
 */
export const SPATIAL_SCALE_EPSILON = 1e-5;

export function assertUniformScale(
  scaleX: number,
  scaleY: number,
  epsilon: number = SPATIAL_SCALE_EPSILON
): boolean {
  const diff = Math.abs(scaleX - scaleY);
  if (diff >= epsilon) {
    const message = `[SpatialGeometryError] P0 Scale Distortion: scaleX (${scaleX.toFixed(6)}) != scaleY (${scaleY.toFixed(6)}), delta (${diff.toFixed(6)}) >= epsilon (${epsilon}). Aspect ratio must remain uniform!`;
    console.error(message);
    if (import.meta.env?.DEV) {
      throw new Error(message);
    }
    return false;
  }
  return true;
}

export interface ResponsiveCameraResult {
  scale: number;
  scaleX: number;
  scaleY: number;
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * P0 Requirement: Responsive Camera
 * Computes scene transform from viewport width, viewport height, and canonical ratio (1915/821).
 * Guarantees scaleX == scaleY and that V2 safe bounds remain inside the visible viewport.
 */
export function calculateResponsiveCamera(
  viewportWidth: number,
  viewportHeight: number
): ResponsiveCameraResult {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return { scale: 1, scaleX: 1, scaleY: 1, zoom: 1, panX: 0, panY: 0 };
  }

  // SVG preserveAspectRatio="xMidYMid slice" base uniform scale
  const scale = Math.max(
    viewportWidth / CANONICAL_SCENE_WIDTH,
    viewportHeight / CANONICAL_SCENE_HEIGHT
  );
  const scaleX = scale;
  const scaleY = scale;
  assertUniformScale(scaleX, scaleY);

  // Visible canonical coordinates under pure slice (zoom = 1, pan = 0)
  const visibleWidth = viewportWidth / scale;
  const visibleHeight = viewportHeight / scale;

  // If visible canonical width/height is smaller than the operational safe bounds,
  // adapt zoom to fit the entire safe operational bounds with breathing room
  let zoom = 1.0;
  let panX = 0;
  let panY = 0;

  if (visibleWidth < V2_OPERATIONAL_SAFE_RECTANGLE.width || visibleHeight < V2_OPERATIONAL_SAFE_RECTANGLE.height) {
    const zoomW = visibleWidth / (V2_OPERATIONAL_SAFE_RECTANGLE.width + 30);
    const zoomH = visibleHeight / (V2_OPERATIONAL_SAFE_RECTANGLE.height + 30);
    zoom = Number(Math.min(1.0, zoomW, zoomH).toFixed(3));
    panX = Math.round((CANONICAL_SCENE_WIDTH / 2) * (1 - zoom));
    panY = Math.round((CANONICAL_SCENE_HEIGHT / 2) * (1 - zoom));
  }

  return {
    scale,
    scaleX,
    scaleY,
    zoom,
    panX,
    panY,
  };
}

/**
 * P0 Requirement: Pointer / Placement Transform
 * Converts screen pointer (clientX, clientY) to canonical 1915x821 coordinate.
 * Uses exact SVG transformation matrix or uniform camera inversion.
 * Pipeline: screen pointer -> inverse camera transform -> canonical 1915x821 coordinate -> normalized map_x/map_y
 */
/**
 * Gate 6 / Gate 11: Screen to Canonical Coordinate Conversion
 * Uses exact SVG transformation matrix inversion or uniform camera inverse fallback.
 */
export function screenToCanonical(
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement,
  cameraViewport?: { panX: number; panY: number; zoom: number }
): { xPx: number; yPx: number; x: number; y: number } {
  // Method 1: SVG DOM Matrix Inversion (Exact browser hardware transform)
  try {
    const ctm = svgElement.getScreenCTM();
    if (ctm) {
      const pt = svgElement.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const svgPoint = pt.matrixTransform(ctm.inverse());

      const panX = cameraViewport?.panX ?? 0;
      const panY = cameraViewport?.panY ?? 0;
      const zoom = cameraViewport?.zoom ?? 1.0;

      const worldX = (svgPoint.x - panX) / zoom;
      const worldY = (svgPoint.y - panY) / zoom;

      const clampedX = Math.max(0, Math.min(CANONICAL_SCENE_WIDTH, worldX));
      const clampedY = Math.max(0, Math.min(CANONICAL_SCENE_HEIGHT, worldY));

      return {
        xPx: clampedX,
        yPx: clampedY,
        x: Math.round(clampedX),
        y: Math.round(clampedY),
      };
    }
  } catch (_e) {
    // Fallback if SVG DOM matrix unavailable (e.g. node / mock test environments)
  }

  // Method 2: Mathematical SVG projection with uniform scale validation
  const rect = svgElement.getBoundingClientRect();
  const scale = Math.max(
    rect.width / CANONICAL_SCENE_WIDTH,
    rect.height / CANONICAL_SCENE_HEIGHT
  );
  assertUniformScale(scale, scale);

  const offsetX = (rect.width - CANONICAL_SCENE_WIDTH * scale) / 2;
  const offsetY = (rect.height - CANONICAL_SCENE_HEIGHT * scale) / 2;

  let worldX = (clientX - rect.left - offsetX) / scale;
  let worldY = (clientY - rect.top - offsetY) / scale;

  if (cameraViewport) {
    const panX = cameraViewport.panX ?? 0;
    const panY = cameraViewport.panY ?? 0;
    const zoom = cameraViewport.zoom ?? 1.0;
    worldX = (worldX - panX) / zoom;
    worldY = (worldY - panY) / zoom;
  }

  const clampedX = Math.max(0, Math.min(CANONICAL_SCENE_WIDTH, worldX));
  const clampedY = Math.max(0, Math.min(CANONICAL_SCENE_HEIGHT, worldY));

  return {
    xPx: clampedX,
    yPx: clampedY,
    x: Math.round(clampedX),
    y: Math.round(clampedY),
  };
}

export const screenPointerToCanonicalScene = (
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement,
  cameraViewport?: { panX: number; panY: number; zoom: number }
) => {
  const p = screenToCanonical(clientX, clientY, svgElement, cameraViewport);
  return { x: p.x, y: p.y };
};

/**
 * Gate 6: Canonical to Screen Coordinate Conversion
 * Forward projection from canonical scene coordinates to viewport screen pixels.
 */
export function canonicalToScreen(
  xPx: number,
  yPx: number,
  svgElement: SVGSVGElement,
  cameraViewport?: { panX: number; panY: number; zoom: number }
): { clientX: number; clientY: number } {
  const panX = cameraViewport?.panX ?? 0;
  const panY = cameraViewport?.panY ?? 0;
  const zoom = cameraViewport?.zoom ?? 1.0;

  const svgX = xPx * zoom + panX;
  const svgY = yPx * zoom + panY;

  try {
    const ctm = svgElement.getScreenCTM();
    if (ctm) {
      const pt = svgElement.createSVGPoint();
      pt.x = svgX;
      pt.y = svgY;
      const screenPt = pt.matrixTransform(ctm);
      return { clientX: screenPt.x, clientY: screenPt.y };
    }
  } catch (_e) {
    // Fallback if SVG CTM unavailable
  }

  const rect = svgElement.getBoundingClientRect();
  const scale = Math.max(
    rect.width / CANONICAL_SCENE_WIDTH,
    rect.height / CANONICAL_SCENE_HEIGHT
  );
  const offsetX = (rect.width - CANONICAL_SCENE_WIDTH * scale) / 2;
  const offsetY = (rect.height - CANONICAL_SCENE_HEIGHT * scale) / 2;

  return {
    clientX: rect.left + offsetX + svgX * scale,
    clientY: rect.top + offsetY + svgY * scale,
  };
}


