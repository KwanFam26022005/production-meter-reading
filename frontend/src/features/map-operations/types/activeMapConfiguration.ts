/**
 * Active Map Configuration Contract (V16A)
 *
 * Authoritative frontend contract for the spatial scene geometry.
 * Consumed by MapConfigurationProvider, ZoneLayer, MeterLayer, and spatial tools.
 */

export interface ActiveMapZoneGeometry {
  id: string;
  mapVersionId?: string;
  zoneId: string;
  presentationId: string;
  businessZoneId: string;
  displayIndex: number;
  displayLabel: string;
  businessName: string;
  presentationColor: string;
  icon: 'ship' | 'container' | 'warehouse' | 'gear' | 'gate' | string;
  polygonCanonical: Array<{ x: number; y: number; landmarkId?: string }>;
  labelAnchorCanonical: { x: number; y: number };
  operatorAnchorCanonical: { x: number; y: number };
  landmarks?: Array<{
    id: string;
    code?: string;
    name: string;
    zoneId?: string;
    canonicalX?: number;
    canonicalY?: number;
    x?: number;
    y?: number;
    type?: string;
    semanticRole?: string;
  }>;
  revision: number;
}

export interface ActiveMapLandmark {
  id: string;
  code?: string;
  name: string;
  zoneId?: string;
  canonicalX?: number;
  canonicalY?: number;
  x?: number;
  y?: number;
  type?: string;
  semanticRole?: string;
}

export interface ActiveMapConfiguration {
  mapId: string;
  versionId: string;
  versionNumber: string;
  coordinateSystem: string;
  canonicalWidth: number;
  canonicalHeight: number;
  sourceAsset: string;
  sourceChecksum?: string | null;
  geometrySchemaVersion: string;
  status: string;
  revision: number;
  publishedAt?: string | null;
  zones: ActiveMapZoneGeometry[];
  landmarks: ActiveMapLandmark[];
  source: 'db' | 'fallback';
  authoritative: boolean;
}
