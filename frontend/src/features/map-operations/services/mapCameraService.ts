/**
 * V7.1 Map Camera & Safe Viewport Service (Sections 9 & 10)
 *
 * Provides centralized 2D camera framing that respects contextual UI overlays:
 * - Desktop Browse: right padding 32px
 * - Desktop Inspect: right padding 352px (SpatialInspector 312px + 40px margin)
 * - Desktop Details/Placement: right padding 392px (MapContextRail 360px + 32px margin)
 * - Transitions: 280-320ms
 */

import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  clampPanForZoom,
  assertUniformScale,
} from '../geometry/canonicalScene';
import { getZoneBoundingBox } from '../geometry/operationalGeometry';
import { SelectedEntity, MapMode } from '../state/useMapStateMachine';
import { MAP_TOKENS } from '../tokens/mapDesignTokens';

export interface SafeViewportPadding {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface CameraFraming {
  zoom: number;
  panX: number;
  panY: number;
}

export function getSafeViewportPadding(mode: MapMode, viewportWidth: number): SafeViewportPadding {
  // Mobile / small tablet (bottom sheet or compact card): overlays are at the bottom
  if (viewportWidth < 768) {
    return {
      top: 80,
      left: 16,
      bottom: mode === 'browse' ? 48 : 280,
      right: 16,
    };
  }

  // Tablet (768 - 1024): 320px right rail
  if (viewportWidth < 1200) {
    let right = 24;
    if (mode === 'inspect') right = 336;
    if (mode === 'details' || mode === 'placement') right = 344;
    return {
      top: 88,
      left: 24,
      bottom: 56,
      right,
    };
  }

  // Desktop (>= 1200px)
  let right: number = MAP_TOKENS.safePadding.rightBrowse; // 32
  if (mode === 'inspect') {
    right = MAP_TOKENS.safePadding.rightInspect; // 352
  } else if (mode === 'details' || mode === 'placement') {
    right = MAP_TOKENS.safePadding.rightDetails; // 392
  }

  return {
    top: MAP_TOKENS.safePadding.top,       // 96
    left: MAP_TOKENS.safePadding.left,     // 32
    bottom: MAP_TOKENS.safePadding.bottom, // 64
    right,
  };
}

export interface FocusEntityOptions {
  entity: SelectedEntity;
  mode: MapMode;
  viewportWidth?: number;
  viewportHeight?: number;
  // Optional coordinates for meter or operator
  entityCoords?: { x: number; y: number };
  // Assigned entities for operator center
  assignedPoints?: { x: number; y: number }[];
}

/**
 * Focuses the 2D orthographic camera on a spatial entity while strictly keeping it
 * within the safe viewport area (never hidden under panels).
 */
export function focusEntity(options: FocusEntityOptions): CameraFraming {
  const {
    entity,
    mode,
    viewportWidth = 1440,
    viewportHeight = 900,
    entityCoords,
    assignedPoints = [],
  } = options;

  if (!entity || mode === 'browse') {
    return { zoom: 1.0, panX: 0, panY: 0 };
  }

  const padding = getSafeViewportPadding(mode, viewportWidth);

  // SVG uniform scale
  const svgScale = Math.max(
    viewportWidth / CANONICAL_SCENE_WIDTH,
    viewportHeight / CANONICAL_SCENE_HEIGHT
  );
  assertUniformScale(svgScale, svgScale);

  // Canonical safe viewport dimensions
  const canonicalSafeWidth = Math.max(
    200,
    (viewportWidth - padding.left - padding.right) / svgScale
  );
  const canonicalSafeHeight = Math.max(
    200,
    (viewportHeight - padding.top - padding.bottom) / svgScale
  );

  // Center of safe viewport in canonical offset
  const safeCenterX = (padding.left + (viewportWidth - padding.left - padding.right) / 2) / svgScale;
  const safeCenterY = (padding.top + (viewportHeight - padding.top - padding.bottom) / 2) / svgScale;

  // 1. ZONE FOCUS: Fit bounding box inside safe canonical dimensions
  if (entity.type === 'zone') {
    const bbox = getZoneBoundingBox(entity.id);
    const zoomX = canonicalSafeWidth / Math.max(bbox.width * 1.35, 260);
    const zoomY = canonicalSafeHeight / Math.max(bbox.height * 1.35, 180);
    const targetZoom = Number(Math.min(1.85, Math.max(1.15, Math.min(zoomX, zoomY))).toFixed(2));

    const panX = Math.round(safeCenterX - bbox.centerX * targetZoom);
    const panY = Math.round(safeCenterY - bbox.centerY * targetZoom);

    const clamped = clampPanForZoom(panX, panY, targetZoom);
    return { zoom: targetZoom, panX: clamped.panX, panY: clamped.panY };
  }

  // 2. METER FOCUS: Center meter marker with local contextual padding
  if (entity.type === 'meter') {
    const mx = entityCoords?.x ?? CANONICAL_SCENE_WIDTH / 2;
    const my = entityCoords?.y ?? CANONICAL_SCENE_HEIGHT / 2;
    const targetZoom = 1.45;

    const panX = Math.round(safeCenterX - mx * targetZoom);
    const panY = Math.round(safeCenterY - my * targetZoom);

    const clamped = clampPanForZoom(panX, panY, targetZoom);
    return { zoom: targetZoom, panX: clamped.panX, panY: clamped.panY };
  }

  // 3. OPERATOR FOCUS: Center operator anchor + assigned entities
  if (entity.type === 'operator') {
    let ox = entityCoords?.x ?? CANONICAL_SCENE_WIDTH / 2;
    let oy = entityCoords?.y ?? CANONICAL_SCENE_HEIGHT / 2;

    if (assignedPoints.length > 0) {
      const allX = [ox, ...assignedPoints.map((p) => p.x)];
      const allY = [oy, ...assignedPoints.map((p) => p.y)];
      ox = (Math.min(...allX) + Math.max(...allX)) / 2;
      oy = (Math.min(...allY) + Math.max(...allY)) / 2;
    }

    const targetZoom = 1.35;
    const panX = Math.round(safeCenterX - ox * targetZoom);
    const panY = Math.round(safeCenterY - oy * targetZoom);

    const clamped = clampPanForZoom(panX, panY, targetZoom);
    return { zoom: targetZoom, panX: clamped.panX, panY: clamped.panY };
  }

  return { zoom: 1.0, panX: 0, panY: 0 };
}


/**
 * Gate 12: Programmatic Camera Intents Specification
 */
export type CameraIntent =
  | 'PORT_OVERVIEW'
  | 'ZONE_FOCUS'
  | 'OPERATOR_FOCUS'
  | 'METER_FOCUS'
  | 'PLACEMENT_FOCUS';

export interface CameraIntentPayload {
  intent: CameraIntent;
  targetId?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  entityCoords?: { x: number; y: number };
  assignedPoints?: { x: number; y: number }[];
}

export function applyCameraIntent(payload: CameraIntentPayload): CameraFraming {
  switch (payload.intent) {
    case 'PORT_OVERVIEW':
      return { zoom: 1.0, panX: 0, panY: 0 };
    case 'ZONE_FOCUS':
      return focusEntity({
        entity: payload.targetId ? { type: 'zone', id: payload.targetId } : null,
        mode: 'inspect',
        viewportWidth: payload.viewportWidth,
        viewportHeight: payload.viewportHeight,
      });
    case 'OPERATOR_FOCUS':
      return focusEntity({
        entity: payload.targetId ? { type: 'operator', id: payload.targetId } : null,
        mode: 'inspect',
        viewportWidth: payload.viewportWidth,
        viewportHeight: payload.viewportHeight,
        entityCoords: payload.entityCoords,
        assignedPoints: payload.assignedPoints,
      });
    case 'METER_FOCUS':
      return focusEntity({
        entity: payload.targetId ? { type: 'meter', id: payload.targetId } : null,
        mode: 'inspect',
        viewportWidth: payload.viewportWidth,
        viewportHeight: payload.viewportHeight,
        entityCoords: payload.entityCoords,
      });
    case 'PLACEMENT_FOCUS':
      return focusEntity({
        entity: payload.targetId ? { type: 'zone', id: payload.targetId } : null,
        mode: 'placement',
        viewportWidth: payload.viewportWidth,
        viewportHeight: payload.viewportHeight,
      });
    default:
      return { zoom: 1.0, panX: 0, panY: 0 };
  }
}
