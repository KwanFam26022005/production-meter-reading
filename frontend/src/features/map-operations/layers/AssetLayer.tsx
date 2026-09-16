/**
 * AssetLayer — Spatial Asset Overlay for Cảng Tân Thuận (Phase V16E)
 *
 * Implements the V16E Visual & Domain Contract:
 * 1. Plots VERIFIED assets at canonical coordinates (map_x * 1915, map_y * 821).
 * 2. Does NOT plot assets without coordinates (map_x or map_y is null).
 * 3. Does NOT plot UNVERIFIED assets unless showUnverified is explicitly enabled.
 * 4. When showUnverified is enabled, renders unverified assets with neutral amber dashed styling (NEVER error red).
 * 5. Distinct 2D maritime glyphs for infrastructure types (SUBSTATION, TRANSFORMER, SWITCHBOARD, QUAY_CRANE, RTG, PUMP, WATER_POINT, etc.).
 * 6. High contrast Maritime Operational Minimalism: Crisp navy borders, off-white background, subtle selection halo.
 */

import React from 'react';
import type { Asset, AssetType } from '../../assets/types';
import { CANONICAL_SCENE_WIDTH, CANONICAL_SCENE_HEIGHT } from '../geometry/canonicalScene';

export interface AssetLayerProps {
  assets: Asset[];
  selectedAssetId?: string | null;
  hoveredAssetId?: string | null;
  onSelectAsset?: (assetId: string) => void;
  onHoverAsset?: (assetId: string | null) => void;
  showUnverified?: boolean;
  canonicalWidth?: number;
  canonicalHeight?: number;
  zoomLevel?: number;
}

/**
 * 2D Maritime Infrastructure Glyph Renderer
 */
const renderAssetGlyph = (type: AssetType, isVerified: boolean, isSelected: boolean) => {
  const strokeColor = isVerified ? (isSelected ? '#0B4F75' : '#073B5C') : '#D97706';
  const fillColor = isVerified ? '#FFFFFF' : 'rgba(217, 119, 6, 0.06)';
  const strokeDash = isVerified ? 'none' : '3,2';

  switch (type) {
    case 'SUBSTATION':
      // Square substation enclosure with high-voltage symbol
      return (
        <g>
          <rect
            x={-11}
            y={-11}
            width={22}
            height={22}
            rx={3}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray={strokeDash}
          />
          <path
            d="M 1 -6 L -3 1 L 1 1 L -1 6"
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'TRANSFORMER':
      // Dual intersecting circles (Schematic transformer)
      return (
        <g>
          <circle
            cx={-4}
            cy={0}
            r={7}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeDasharray={strokeDash}
          />
          <circle
            cx={4}
            cy={0}
            r={7}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeDasharray={strokeDash}
          />
        </g>
      );

    case 'SWITCHBOARD':
    case 'FEEDER':
      // Distribution cabinet with busbar lines
      return (
        <g>
          <rect
            x={-10}
            y={-9}
            width={20}
            height={18}
            rx={2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeDasharray={strokeDash}
          />
          <line x1={-6} y1={-4} x2={6} y2={-4} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={-6} y1={1} x2={6} y2={1} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={-6} y1={5} x2={6} y2={5} stroke={strokeColor} strokeWidth={1.5} />
        </g>
      );

    case 'QUAY_CRANE':
      // Gantry quay crane outline
      return (
        <g>
          <path
            d="M -9 9 L -6 -6 L 8 -6 L 11 9 M -6 -6 L -9 -9 M 8 -6 L 11 -9 M -4 0 L 6 0"
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={strokeDash}
          />
        </g>
      );

    case 'RTG':
      // RTG Container Gantry arch
      return (
        <g>
          <path
            d="M -9 9 L -9 -6 L 9 -6 L 9 9 M -9 -1 L 9 -1 M -5 4 L 5 4"
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={strokeDash}
          />
        </g>
      );

    case 'PUMP':
    case 'FIRE_PUMP_SYSTEM':
      // Centrifugal pump casing with tangent nozzle
      return (
        <g>
          <circle
            cx={0}
            cy={0}
            r={8}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeDasharray={strokeDash}
          />
          <path
            d="M 6 -6 L 11 -6 L 11 0"
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={0} cy={0} r={2.5} fill={strokeColor} />
        </g>
      );

    case 'WATER_POINT':
    case 'FIRE_WATER_POINT':
      // Water droplet outline
      return (
        <g>
          <path
            d="M 0 -9 C -5 -2 -7 2 -7 5 C -7 9 -3 11 0 11 C 3 11 7 9 7 5 C 7 2 5 -2 0 -9 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeDasharray={strokeDash}
          />
        </g>
      );

    case 'SHORE_POWER_POINT':
      // Shore power point plug
      return (
        <g>
          <circle
            cx={0}
            cy={0}
            r={9}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeDasharray={strokeDash}
          />
          <circle cx={-3} cy={-1} r={1.5} fill={strokeColor} />
          <circle cx={3} cy={-1} r={1.5} fill={strokeColor} />
          <path d="M 0 3 L 0 7" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" />
        </g>
      );

    case 'WAREHOUSE':
    case 'BUILDING':
    case 'WORKSHOP':
    case 'FACILITY':
      // Industrial building with pitched roof
      return (
        <g>
          <path
            d="M -10 2 L 0 -7 L 10 2 L 10 9 L -10 9 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeDasharray={strokeDash}
          />
          <rect x={-3} y={4} width={6} height={5} fill={strokeColor} />
        </g>
      );

    default:
      // Diamond node for generic maritime infrastructure
      return (
        <g>
          <polygon
            points="0,-10 10,0 0,10 -10,0"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeDasharray={strokeDash}
          />
          <circle cx={0} cy={0} r={2} fill={strokeColor} />
        </g>
      );
  }
};

export const AssetLayer: React.FC<AssetLayerProps> = ({
  assets,
  selectedAssetId,
  hoveredAssetId,
  onSelectAsset,
  onHoverAsset,
  showUnverified = false,
  canonicalWidth = CANONICAL_SCENE_WIDTH,
  canonicalHeight = CANONICAL_SCENE_HEIGHT,
  zoomLevel = 1,
}) => {
  // Filter assets to render:
  // 1. Must have valid numeric coordinates
  // 2. Must not be RETIRED
  // 3. Must be VERIFIED, unless showUnverified is true (in which case UNVERIFIED are also rendered)
  // 4. REJECTED assets are never rendered on the active map
  const plottableAssets = React.useMemo(() => {
    return assets.filter((a) => {
      if (a.map_x === null || a.map_y === null || isNaN(a.map_x) || isNaN(a.map_y)) {
        return false;
      }
      if (a.lifecycle_status === 'RETIRED' || a.verification_status === 'REJECTED') {
        return false;
      }
      if (a.verification_status === 'UNVERIFIED' && !showUnverified) {
        return false;
      }
      return true;
    });
  }, [assets, showUnverified]);

  if (plottableAssets.length === 0) {
    return null;
  }

  // Scale compensation so glyphs remain crisp and readable at different zoom levels
  const scale = 1 / Math.max(0.6, Math.min(zoomLevel, 2.5));

  return (
    <g className="sgp-map-asset-layer" aria-label="Lớp thiết bị kỹ thuật cảng">
      {plottableAssets.map((asset) => {
        const cx = (asset.map_x ?? 0) * canonicalWidth;
        const cy = (asset.map_y ?? 0) * canonicalHeight;
        const isSelected = selectedAssetId === asset.id;
        const isHovered = hoveredAssetId === asset.id;
        const isVerified = asset.verification_status === 'VERIFIED';

        return (
          <g
            key={`asset-marker-${asset.id}`}
            className="sgp-asset-glyph"
            transform={`translate(${cx}, ${cy}) scale(${scale})`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectAsset) onSelectAsset(asset.id);
            }}
            onMouseEnter={() => {
              if (onHoverAsset) onHoverAsset(asset.id);
            }}
            onMouseLeave={() => {
              if (onHoverAsset) onHoverAsset(null);
            }}
            role="button"
            tabIndex={0}
            aria-label={`${asset.code}: ${asset.name} (${asset.asset_type}, ${asset.verification_status})`}
          >
            {/* Selection Halo */}
            {isSelected && (
              <circle
                r={20}
                fill="none"
                stroke="#073B5C"
                strokeWidth={2.5}
                strokeDasharray="none"
                opacity={0.85}
              />
            )}

            {/* Hover Ring */}
            {isHovered && !isSelected && (
              <circle
                r={18}
                fill="none"
                stroke={isVerified ? '#12658F' : '#D97706'}
                strokeWidth={1.5}
                opacity={0.6}
              />
            )}

            {/* Glyph */}
            {renderAssetGlyph(asset.asset_type, isVerified, isSelected)}

            {/* Verification Indicator Badge if unverified preview */}
            {!isVerified && (
              <circle
                cx={9}
                cy={-9}
                r={4}
                fill="#D97706"
                stroke="#FFFFFF"
                strokeWidth={1.2}
              />
            )}

            {/* Callout Pill: Shown on Select or Hover */}
            {(isSelected || isHovered) && (
              <g transform="translate(0, -26)" pointerEvents="none">
                <rect
                  x={-Math.max(40, asset.code.length * 4.5 + 14)}
                  y={-12}
                  width={Math.max(80, asset.code.length * 9 + 28)}
                  height={22}
                  rx={4}
                  fill="#073B5C"
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                />
                <text
                  x={0}
                  y={3}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {asset.code}
                </text>
                {!isVerified && (
                  <text
                    x={0}
                    y={18}
                    textAnchor="middle"
                    fill="#D97706"
                    fontSize={9.5}
                    fontWeight={600}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    Chờ xác minh
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
