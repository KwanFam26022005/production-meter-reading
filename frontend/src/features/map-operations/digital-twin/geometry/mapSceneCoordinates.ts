import * as THREE from 'three';
import { NormalizedPoint } from '../../types';

export const SCENE_WORLD_SIZE = {
  width: 120, // X-axis (West to East: Inland -> River)
  depth: 80,  // Z-axis (North to South: Upstream -> Downstream)
  groundElevation: 0,
  waterElevation: -0.6,
  quayElevation: 0.15,
  zoneBaseElevation: 0.04,
  zoneHoverElevation: 0.14,
  zoneSelectedElevation: 0.24,
  meterElevation: 0.35,
};

/**
 * Converts 2D normalized coordinates [0..1, 0..1] to 3D scene world coordinates [X, Y, Z].
 * Normalized:
 * - x: 0.0 (West/Gate) -> 1.0 (East/River)
 * - y: 0.0 (North/Upstream) -> 1.0 (South/Downstream)
 * Scene:
 * - X: [-width/2, +width/2]
 * - Y: elevation
 * - Z: [-depth/2, +depth/2]
 */
export function normalizedToScene(
  point: NormalizedPoint,
  elevation: number = SCENE_WORLD_SIZE.groundElevation
): [number, number, number] {
  const x = (point.x - 0.5) * SCENE_WORLD_SIZE.width;
  const z = (point.y - 0.5) * SCENE_WORLD_SIZE.depth;
  return [x, elevation, z];
}

/**
 * Converts 3D scene world coordinates [X, Y, Z] back to 2D normalized coordinates [0..1, 0..1].
 */
export function sceneToNormalized(pos: [number, number, number] | THREE.Vector3): NormalizedPoint {
  const xVal = Array.isArray(pos) ? pos[0] : pos.x;
  const zVal = Array.isArray(pos) ? pos[2] : pos.z;
  return {
    x: Math.min(1, Math.max(0, xVal / SCENE_WORLD_SIZE.width + 0.5)),
    y: Math.min(1, Math.max(0, zVal / SCENE_WORLD_SIZE.depth + 0.5)),
  };
}

/**
 * Creates a THREE.Shape from an array of normalized points projected onto X-Z.
 * (Three.js Shapes operate in 2D X-Y; we map X -> shape.x and Z -> -shape.y)
 */
export function createShapeFromNormalizedPolygon(polygon: NormalizedPoint[]): THREE.Shape {
  const shape = new THREE.Shape();
  if (polygon.length === 0) return shape;

  const first = normalizedToScene(polygon[0]);
  shape.moveTo(first[0], -first[2]);

  for (let i = 1; i < polygon.length; i++) {
    const pt = normalizedToScene(polygon[i]);
    shape.lineTo(pt[0], -pt[2]);
  }
  shape.closePath();
  return shape;
}

/**
 * Computes polygon centroid in 3D scene coordinates.
 */
export function getPolygonSceneCentroid(
  polygon: NormalizedPoint[],
  elevation: number = SCENE_WORLD_SIZE.zoneBaseElevation
): [number, number, number] {
  if (polygon.length === 0) return [0, elevation, 0];
  let sumX = 0;
  let sumZ = 0;
  for (const pt of polygon) {
    const sc = normalizedToScene(pt);
    sumX += sc[0];
    sumZ += sc[2];
  }
  return [sumX / polygon.length, elevation, sumZ / polygon.length];
}
