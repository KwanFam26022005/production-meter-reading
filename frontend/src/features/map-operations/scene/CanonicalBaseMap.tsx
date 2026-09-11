import React, { useState, useEffect } from 'react';
import tanThuanMapWebp from '../../../assets/maps/tan-thuan-canonical-v2.webp';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../geometry/canonicalScene';

interface CanonicalBaseMapProps {
  isDimmed?: boolean;
  onLoaded?: () => void;
}

/**
 * CanonicalBaseMap — Physical Base Scene for Cảng Tân Thuận
 *
 * Renders the approved physical port map image inside the unified SVG scene.
 * Replaces static schematic geometry (PortFootprint, synthetic warehouses, river, roads).
 *
 * Visual Treatment (Industrial Spatial Control Room):
 * - Default: saturate(0.86) brightness(0.96) contrast(0.98) - calm, physically grounded
 * - Dimmed (Alert Mode / Selection): saturate(0.68) brightness(0.78) - operational overlays pop
 * - Graceful loading: neutral blueprint backdrop while WebP asset decodes.
 */
export const CanonicalBaseMap: React.FC<CanonicalBaseMapProps> = ({
  isDimmed = false,
  onLoaded,
}) => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Preload map image asset
    const img = new Image();
    img.src = tanThuanMapWebp;
    img.onload = () => {
      setImageLoaded(true);
      onLoaded?.();
    };
  }, [onLoaded]);

  // CSS Filter Treatment
  const filterStyle = isDimmed
    ? 'saturate(0.68) brightness(0.78) contrast(0.95)'
    : 'saturate(0.86) brightness(0.96) contrast(0.98)';

  return (
    <g className="sgp-canonical-base-map" aria-label="Bản đồ không gian Cảng Tân Thuận">
      <defs>
        {/* Extended Atmospheric Maritime-to-Forest Gradient */}
        <linearGradient id="sgp-maritime-scene-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B486B" />
          <stop offset="30%" stopColor="#0D3B56" />
          <stop offset="65%" stopColor="#0F2B3E" />
          <stop offset="88%" stopColor="#142C24" />
          <stop offset="100%" stopColor="#11241C" />
        </linearGradient>

        {/* Soft edge blend mask for map image */}
        <linearGradient id="sgp-edge-fade-x" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="99%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 0. Extended Continuous Scene Backdrop (Eliminates harsh cuts on pan/zoom/wide viewports) */}
      <rect
        x={-1200}
        y={-800}
        width={CANONICAL_SCENE_WIDTH + 2400}
        height={CANONICAL_SCENE_HEIGHT + 1600}
        fill="url(#sgp-maritime-scene-gradient)"
      />

      {/* 1. Neutral Port Canvas Fallback (Shown while loading or decoding) */}
      <rect
        x={0}
        y={0}
        width={CANONICAL_SCENE_WIDTH}
        height={CANONICAL_SCENE_HEIGHT}
        fill="#1E293B"
        opacity={imageLoaded ? 0 : 1}
        style={{ transition: 'opacity 300ms ease' }}
      />

      {/* Industrial subtle grid fallback */}
      {!imageLoaded && (
        <g opacity={0.15}>
          {Array.from({ length: 17 }).map((_, i) => (
            <line
              key={`grid-v-${i}`}
              x1={i * 104}
              y1={0}
              x2={i * 104}
              y2={CANONICAL_SCENE_HEIGHT}
              stroke="#94A3B8"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`grid-h-${i}`}
              x1={0}
              y1={i * 104}
              x2={CANONICAL_SCENE_WIDTH}
              y2={i * 104}
              stroke="#94A3B8"
              strokeWidth={1}
            />
          ))}
          <text
            x={CANONICAL_SCENE_WIDTH / 2}
            y={CANONICAL_SCENE_HEIGHT / 2}
            fill="#94A3B8"
            fontSize={14}
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight={600}
          >
            Đang tải sơ đồ cơ sở Cảng Tân Thuận...
          </text>
        </g>
      )}

      {/* 2. Master Canonical Physical Map Image (1915x821 Canonical Aspect Ratio Lock) */}
      <image
        href={tanThuanMapWebp}
        x={0}
        y={0}
        width={CANONICAL_SCENE_WIDTH}
        height={CANONICAL_SCENE_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
        style={{
          filter: filterStyle,
          opacity: imageLoaded ? 1 : 0,
          transition: 'filter 320ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease',
        }}
      />
    </g>
  );
};
