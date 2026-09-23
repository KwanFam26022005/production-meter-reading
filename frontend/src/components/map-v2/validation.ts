import { MapV2Manifest, MapV2Polygon, MapV2Polyline, MapV2Marker } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest: MapV2Manifest | null;
}

export const EXPECTED_POLYGON_IDS = [
  'ZONE_QUAY',
  'ZONE_GENERAL',
  'ZONE_CONTAINER',
  'BLDG_KHO_1',
  'BLDG_KHO_2',
  'BLDG_KHO_4',
  'ZONE_ADMIN',
];

export const EXPECTED_POLYLINE_IDS = [
  'PORT_BOUNDARY',
  'DIVIDER_QUAY_BACKLAND',
  'DIVIDER_GENERAL_CONTAINER',
  'ROAD_BACKLAND',
  'ROAD_CENTRAL_ACCESS',
  'ROAD_EAST_ACCESS',
];

export const EXPECTED_MARKER_IDS = ['GATE_A', 'GATE_B'];

export function validateMapV2Manifest(rawData: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawData || typeof rawData !== 'object') {
    return {
      valid: false,
      errors: ['Invalid manifest: payload is null or not an object.'],
      warnings: [],
      manifest: null,
    };
  }

  const data = rawData as Record<string, unknown>;

  // 1. Schema check
  if (data.schema !== 'port-zoning-image-pixels/v1') {
    errors.push(`Unexpected schema: expected "port-zoning-image-pixels/v1", got "${data.schema}"`);
  }

  // 2. Image metadata check
  const img = data.image as Record<string, unknown> | undefined;
  if (!img) {
    errors.push('Missing "image" metadata block.');
  } else {
    if (img.width !== 1536 || img.height !== 1024) {
      errors.push(`Image dimensions mismatch: expected 1536x1024, got ${img.width}x${img.height}`);
    }
    if (img.coordinate_system !== 'image-pixels') {
      warnings.push(`Image coordinate system is "${img.coordinate_system}", expected "image-pixels"`);
    }
  }

  const width = typeof img?.width === 'number' ? img.width : 1536;
  const height = typeof img?.height === 'number' ? img.height : 1024;

  // 3. Polygons check
  const polygons = (data.polygons || []) as MapV2Polygon[];
  if (!Array.isArray(polygons)) {
    errors.push('"polygons" must be an array.');
  } else {
    const polyIdSet = new Set<string>();
    for (const p of polygons) {
      if (polyIdSet.has(p.id)) {
        errors.push(`Duplicate polygon ID: ${p.id}`);
      }
      polyIdSet.add(p.id);

      // Check vertices
      if (!Array.isArray(p.vertices) || p.vertices.length < 3) {
        errors.push(`Polygon ${p.id} must have at least 3 vertices.`);
      } else {
        p.vertices.forEach(([x, y], idx) => {
          if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
            errors.push(`Polygon ${p.id} vertex [${idx}] contains invalid coordinate: [${x}, ${y}]`);
          }
        });

        // Check normalized vertices if present
        if (Array.isArray(p.normalized_vertices)) {
          p.normalized_vertices.forEach(([nx, ny], idx) => {
            const [x, y] = p.vertices[idx] || [0, 0];
            const expNx = x / width;
            const expNy = y / height;
            if (Math.abs(nx - expNx) > 0.0001 || Math.abs(ny - expNy) > 0.0001) {
              warnings.push(
                `Polygon ${p.id} normalized vertex [${idx}] discrepancy: given [${nx}, ${ny}], calculated [${expNx.toFixed(5)}, ${expNy.toFixed(5)}]`
              );
            }
          });
        }

        // Check edges
        if (Array.isArray(p.edges)) {
          p.edges.forEach(([u, v], idx) => {
            if (u < 0 || u >= p.vertices.length || v < 0 || v >= p.vertices.length) {
              errors.push(`Polygon ${p.id} edge [${idx}] references out-of-bounds vertex indices [${u}, ${v}]`);
            }
          });
        }
      }
    }

    for (const expId of EXPECTED_POLYGON_IDS) {
      if (!polyIdSet.has(expId)) {
        errors.push(`Missing expected canonical polygon: ${expId}`);
      }
    }
  }

  // 4. Polylines check
  const polylines = (data.polylines || []) as MapV2Polyline[];
  if (!Array.isArray(polylines)) {
    errors.push('"polylines" must be an array.');
  } else {
    const lineIdSet = new Set<string>();
    for (const pl of polylines) {
      if (lineIdSet.has(pl.id)) {
        errors.push(`Duplicate polyline ID: ${pl.id}`);
      }
      lineIdSet.add(pl.id);

      if (!Array.isArray(pl.vertices) || pl.vertices.length < 2) {
        errors.push(`Polyline ${pl.id} must have at least 2 vertices.`);
      } else {
        pl.vertices.forEach(([x, y], idx) => {
          if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
            errors.push(`Polyline ${pl.id} vertex [${idx}] contains invalid coordinate: [${x}, ${y}]`);
          }
        });
      }

      // Check ROAD_BACKLAND inflection specifically
      if (pl.id === 'ROAD_BACKLAND' && pl.vertices.length >= 6) {
        const p3 = pl.vertices[3];
        const p4 = pl.vertices[4];
        const p5 = pl.vertices[5];
        if (p3 && p4 && p5 && p3[0] > p4[0] && p5[0] > p4[0]) {
          warnings.push(
            `ROAD_BACKLAND inflection detected: Vertex [3] x=${p3[0]} moves left to Vertex [4] x=${p4[0]} before continuing to Vertex [5] x=${p5[0]}. Preserving as authored.`
          );
        }
      }
    }

    for (const expId of EXPECTED_POLYLINE_IDS) {
      if (!lineIdSet.has(expId)) {
        errors.push(`Missing expected canonical polyline: ${expId}`);
      }
    }
  }

  // 5. Markers check
  const markers = (data.markers || []) as MapV2Marker[];
  if (!Array.isArray(markers)) {
    errors.push('"markers" must be an array.');
  } else {
    const markerIdSet = new Set<string>();
    for (const m of markers) {
      if (markerIdSet.has(m.id)) {
        errors.push(`Duplicate marker ID: ${m.id}`);
      }
      markerIdSet.add(m.id);

      if (!Array.isArray(m.point) || m.point.length !== 2) {
        errors.push(`Marker ${m.id} point must be a 2-element array.`);
      } else {
        const [x, y] = m.point;
        if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
          errors.push(`Marker ${m.id} point coordinates are invalid: [${x}, ${y}]`);
        }
      }
    }

    for (const expId of EXPECTED_MARKER_IDS) {
      if (!markerIdSet.has(expId)) {
        errors.push(`Missing expected canonical marker: ${expId}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest: errors.length === 0 ? (data as unknown as MapV2Manifest) : null,
  };
}
