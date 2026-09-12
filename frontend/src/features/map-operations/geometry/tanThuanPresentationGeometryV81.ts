/**
 * Tan Thuan Presentation Geometry V8.1 (Deprecated Compatibility Layer)
 * All geometry is now derived strictly from tanThuanPresentationGeometry.v9.json
 * via tanThuanPresentationGeometryV9.ts.
 *
 * This re-export preserves backwards compatibility while ensuring ZERO array duplication.
 */

export {
  CANONICAL_GEOMETRY_V9,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  canonicalPointToNormalized,
  pointsToSvgPath,
  computeCentroid,
  derivePresentationZones,
  V9_PRESENTATION_ZONES,
  V81_PRESENTATION_ZONES,
} from './tanThuanPresentationGeometryV9';

export type {
  CanonicalPoint,
  NormalizedPoint,
  V9RawZone,
  V9GeometryManifest,
  PresentationZoneV9,
  PresentationZoneV81,
} from './tanThuanPresentationGeometryV9';
