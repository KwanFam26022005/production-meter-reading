import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type {
  ActiveMapConfiguration,
  ActiveMapLandmark,
} from '../types/activeMapConfiguration';
import {
  adaptMapConfiguration,
  createDegradedFallbackConfiguration,
  AdaptedMapConfiguration,
} from '../adapters/mapConfigurationAdapter';
import { fetchActiveMapConfiguration } from '../../../services/api';
import type { SpatialZonePresentation } from '../geometry/operationalGeometry';
import { CANONICAL_SCENE_WIDTH, CANONICAL_SCENE_HEIGHT } from '../geometry/canonicalScene';

export interface MapConfigurationContextValue {
  config: ActiveMapConfiguration | null;
  presentationZones: SpatialZonePresentation[];
  operatorAnchors: Record<string, { x: number; y: number }>;
  landmarks: ActiveMapLandmark[];
  versionId: string | null;
  versionNumber: string | null;
  canonicalWidth: number;
  canonicalHeight: number;
  loading: boolean;
  error: Error | null;
  authoritative: boolean;
  source: 'db' | 'fallback';
  refetch: () => Promise<void>;
}

const MapConfigurationContext = createContext<MapConfigurationContextValue | null>(null);

interface MapConfigurationProviderProps {
  children: React.ReactNode;
  initialConfig?: ActiveMapConfiguration;
  onConfigChange?: (config: ActiveMapConfiguration) => void;
}

export const MapConfigurationProvider: React.FC<MapConfigurationProviderProps> = ({
  children,
  initialConfig,
  onConfigChange,
}) => {
  const [config, setConfig] = useState<ActiveMapConfiguration | null>(initialConfig || null);
  const [loading, setLoading] = useState<boolean>(!initialConfig);
  const [error, setError] = useState<Error | null>(null);

  const loadActiveConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const active = await fetchActiveMapConfiguration();

      // Normalize snake_case / camelCase fields if received from FastAPI
      const raw = active as any;
      const normalizedConfig: ActiveMapConfiguration = {
        mapId: raw.mapId || raw.map_id || 'tan-thuan',
        versionId: raw.versionId || raw.version_id || raw.id,
        versionNumber: raw.versionNumber || raw.version_number || raw.map_version || 'unknown',
        coordinateSystem: raw.coordinateSystem || raw.coordinate_system || 'tan-thuan-canonical-image-pixel-space-v1',
        canonicalWidth: raw.canonicalWidth || raw.canonical_width || CANONICAL_SCENE_WIDTH,
        canonicalHeight: raw.canonicalHeight || raw.canonical_height || CANONICAL_SCENE_HEIGHT,
        sourceAsset: raw.sourceAsset || raw.source_asset || 'tan-thuan-canonical-base.png',
        sourceChecksum: raw.sourceChecksum || raw.source_checksum || null,
        geometrySchemaVersion: raw.geometrySchemaVersion || raw.geometry_schema_version || '1.0',
        status: raw.status || 'PUBLISHED',
        revision: raw.revision || 1,
        publishedAt: raw.publishedAt || raw.published_at || null,
        zones: (raw.zones || []).map((z: any) => ({
          id: z.id || z.zone_id,
          mapVersionId: z.mapVersionId || z.map_version_id,
          zoneId: z.zoneId || z.zone_id,
          presentationId: z.presentationId || z.presentation_id || z.zone_id,
          businessZoneId: z.businessZoneId || z.business_zone_id,
          displayIndex: z.displayIndex ?? z.display_index ?? 1,
          displayLabel: z.displayLabel || z.display_label || '',
          businessName: z.businessName || z.business_name || '',
          presentationColor: z.presentationColor || z.presentation_color || '#0284C7',
          icon: z.icon || 'container',
          polygonCanonical: z.polygonCanonical || z.polygon_canonical || [],
          labelAnchorCanonical: z.labelAnchorCanonical || z.label_anchor_canonical || { x: 0, y: 0 },
          operatorAnchorCanonical: z.operatorAnchorCanonical || z.operator_anchor_canonical || { x: 0, y: 0 },
          landmarks: z.landmarks || [],
          revision: z.revision || 1,
        })),
        landmarks: raw.landmarks || [],
        source: 'db',
        authoritative: true,
      };

      // Validation Gate: Check canonical dimensions & zones
      if (normalizedConfig.canonicalWidth <= 0 || normalizedConfig.canonicalHeight <= 0) {
        throw new Error(`Invalid canonical dimensions: ${normalizedConfig.canonicalWidth}x${normalizedConfig.canonicalHeight}`);
      }
      if (!normalizedConfig.zones || normalizedConfig.zones.length === 0) {
        throw new Error('Active map configuration contains 0 zones');
      }

      setConfig(normalizedConfig);
      if (onConfigChange) {
        onConfigChange(normalizedConfig);
      }
    } catch (err: any) {
      console.error('[MapConfigurationProvider] Error fetching active map configuration:', err);
      const fallback = createDegradedFallbackConfiguration();
      setConfig(fallback);
      setError(err instanceof Error ? err : new Error(String(err)));
      if (onConfigChange) {
        onConfigChange(fallback);
      }
    } finally {
      setLoading(false);
    }
  }, [onConfigChange]);

  useEffect(() => {
    if (!initialConfig) {
      loadActiveConfig();
    }
  }, [loadActiveConfig, initialConfig]);

  const adapted: AdaptedMapConfiguration = useMemo(() => {
    if (config) {
      return adaptMapConfiguration(config);
    }
    const fallback = createDegradedFallbackConfiguration();
    return adaptMapConfiguration(fallback);
  }, [config]);

  const value: MapConfigurationContextValue = useMemo(() => ({
    config,
    presentationZones: adapted.presentationZones,
    operatorAnchors: adapted.operatorAnchors,
    landmarks: adapted.landmarks,
    versionId: config?.versionId || null,
    versionNumber: config?.versionNumber || null,
    canonicalWidth: config?.canonicalWidth || CANONICAL_SCENE_WIDTH,
    canonicalHeight: config?.canonicalHeight || CANONICAL_SCENE_HEIGHT,
    loading,
    error,
    authoritative: config?.authoritative ?? false,
    source: config?.source ?? 'fallback',
    refetch: loadActiveConfig,
  }), [config, adapted, loading, error, loadActiveConfig]);

  return (
    <MapConfigurationContext.Provider value={value}>
      {children}
    </MapConfigurationContext.Provider>
  );
};

export function useMapConfiguration(): MapConfigurationContextValue {
  const ctx = useContext(MapConfigurationContext);
  if (!ctx) {
    throw new Error('useMapConfiguration must be used within a MapConfigurationProvider');
  }
  return ctx;
}
