import React, { useState, useMemo, useCallback } from 'react';
import { Crosshair, Check, AlertTriangle, X, RefreshCw } from 'lucide-react';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
  canonicalSceneToNormalized,
  screenPointerToCanonicalScene,
} from '../geometry/canonicalScene';
import {
  isPointInBusinessZone,
  SPATIAL_ZONE_PRESENTATIONS,
  BUSINESS_ZONES_GEOMETRY,
} from '../geometry/operationalGeometry';

export interface SpatialPlacementCoords {
  x: number;
  y: number;
  normX: number;
  normY: number;
}

export interface UseSpatialPlacementOptions {
  isActive: boolean;
  targetZoneId: string;
  targetZoneName: string;
  meterCode?: string;
  meterName?: string;
  meterType?: string;
  isRelocating?: boolean;
  existingMeterId?: string;
  onConfirmPlacement: (
    coords: SpatialPlacementCoords,
    details?: { meterCode: string; name: string; meterType: string }
  ) => Promise<void>;
  onCancel: () => void;
  onZoneChange?: (zoneId: string) => void;
}

const COLS = 32;
const ROWS = 18;
const COL_W = CANONICAL_SCENE_WIDTH / COLS; // ~59.84px
const ROW_H = CANONICAL_SCENE_HEIGHT / ROWS; // ~45.61px

/**
 * Hook to manage placement & candidate state
 */
export function useSpatialPlacement(options: UseSpatialPlacementOptions) {
  const {
    isActive,
    targetZoneId,
    targetZoneName,
    meterCode: initialCode = '',
    meterName: initialName = '',
    meterType: initialType = 'LCD',
    isRelocating = false,
    onConfirmPlacement,
    onCancel,
  } = options;

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [pinnedCoords, setPinnedCoords] = useState<SpatialPlacementCoords | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState(initialCode || (isRelocating ? '' : 'CT-013'));
  const [name, setName] = useState(initialName || (isRelocating ? '' : 'Công tơ mới'));
  const [meterType, setMeterType] = useState(initialType || 'LCD');

  const activeCanonical = pinnedCoords
    ? { x: pinnedCoords.x, y: pinnedCoords.y }
    : cursorPos || { x: 958, y: 411 };

  const isCurrentInside = isPointInBusinessZone(activeCanonical, targetZoneId);

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isActive || pinnedCoords) return;
      const svgEl = e.currentTarget;
      const coords = screenPointerToCanonicalScene(e.clientX, e.clientY, svgEl);
      setCursorPos(coords);
    },
    [isActive, pinnedCoords]
  );

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isActive || pinnedCoords) return;
      const svgEl = e.currentTarget;
      const { x, y } = screenPointerToCanonicalScene(e.clientX, e.clientY, svgEl);

      const norm = canonicalSceneToNormalized(x, y);
      setPinnedCoords({
        x,
        y,
        normX: norm.x,
        normY: norm.y,
      });
      setError(null);
    },
    [isActive, pinnedCoords]
  );

  const handleResetPin = useCallback(() => {
    setPinnedCoords(null);
    setError(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pinnedCoords) {
      setError('Vui lòng nhấp trên bản đồ để chọn tọa độ.');
      return;
    }
    const isInside = isPointInBusinessZone(pinnedCoords, targetZoneId);
    if (!isInside) {
      setError('Vị trí đang nằm ngoài khu vực đã chọn. Vui lòng chọn lại.');
      return;
    }

    if (!code.trim()) {
      setError('Mã công tơ không được để trống.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirmPlacement(pinnedCoords, {
        meterCode: code.trim(),
        name: name.trim() || code.trim(),
        meterType,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu vị trí công tơ.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [pinnedCoords, targetZoneId, code, name, meterType, onConfirmPlacement]);

  return {
    cursorPos,
    pinnedCoords,
    activeCanonical,
    isCurrentInside,
    isSubmitting,
    error,
    code,
    name,
    meterType,
    setCode,
    setName,
    setMeterType,
    handleSvgMouseMove,
    handleSvgClick,
    handleResetPin,
    handleConfirm,
    onCancel,
    targetZoneId,
    targetZoneName,
    isRelocating,
  };
}

export interface SpatialPlacementSvgLayerProps {
  isActive: boolean;
  targetZoneId: string;
  targetZoneName: string;
  pinnedCoords: SpatialPlacementCoords | null;
  activeCanonical: { x: number; y: number };
  isCurrentInside: boolean;
  onSvgMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onSvgClick: (e: React.MouseEvent<SVGSVGElement>) => void;
}

/**
 * SVG Layer: 32x18 Matrix Grid and Candidate Reticle
 */
export const SpatialPlacementSvgLayer: React.FC<SpatialPlacementSvgLayerProps> = ({
  isActive,
  targetZoneId,
  targetZoneName,
  pinnedCoords,
  activeCanonical,
  isCurrentInside,
  onSvgMouseMove,
  onSvgClick,
}) => {
  const gridLines = useMemo(() => {
    const vLines: number[] = [];
    for (let i = 1; i < COLS; i++) {
      vLines.push(Math.round(i * COL_W));
    }
    const hLines: number[] = [];
    for (let j = 1; j < ROWS; j++) {
      hLines.push(Math.round(j * ROW_H));
    }
    return { vLines, hLines };
  }, []);

  const targetZonePolygons = useMemo(() => {
    const presList = SPATIAL_ZONE_PRESENTATIONS.filter(
      (p) => p.presentationId === targetZoneId || p.businessZoneId === targetZoneId
    );
    if (presList.length > 0) {
      return presList.map((p) => p.polygonSvg);
    }
    const biz = BUSINESS_ZONES_GEOMETRY.find((b) => b.id === targetZoneId);
    return biz ? [biz.polygonSvg] : [];
  }, [targetZoneId]);

  if (!isActive) return null;

  const reticleColor = isCurrentInside ? '#10B981' : '#EF4444';

  return (
    <g
      className="sgp-spatial-placement-svg-layer"
      aria-label="Lớp lưới thiết lập vị trí công tơ"
      onMouseMove={onSvgMouseMove}
      onClick={onSvgClick}
      style={{ cursor: pinnedCoords ? 'default' : 'crosshair' }}
    >
      <defs>
        <clipPath id="placement-zone-clip">
          {targetZonePolygons.map((p, idx) => (
            <path key={idx} d={p} />
          ))}
        </clipPath>
      </defs>

      {/* 1A. Transparent full-size event catcher */}
      <rect
        x={0}
        y={0}
        width={CANONICAL_SCENE_WIDTH}
        height={CANONICAL_SCENE_HEIGHT}
        fill="transparent"
        pointerEvents="all"
      />

      {/* 1B. Global 32x18 Matrix Grid Lines (Subtle Slate) */}
      <g opacity={0.16} stroke="#38BDF8" strokeWidth={0.8} pointerEvents="none">
        {gridLines.vLines.map((vx) => (
          <line key={`gv-${vx}`} x1={vx} y1={0} x2={vx} y2={CANONICAL_SCENE_HEIGHT} />
        ))}
        {gridLines.hLines.map((hy) => (
          <line key={`gh-${hy}`} x1={0} y1={hy} x2={CANONICAL_SCENE_WIDTH} y2={hy} />
        ))}
      </g>

      {/* 1C. Prominent Matrix Grid Lines Clipped strictly to Target Zone */}
      <g clipPath="url(#placement-zone-clip)" pointerEvents="none">
        <g stroke="#0284C7" strokeWidth={1.4} opacity={0.45}>
          {gridLines.vLines.map((vx) => (
            <line key={`clv-${vx}`} x1={vx} y1={0} x2={vx} y2={CANONICAL_SCENE_HEIGHT} />
          ))}
          {gridLines.hLines.map((hy) => (
            <line key={`clh-${hy}`} x1={0} y1={hy} x2={CANONICAL_SCENE_WIDTH} y2={hy} />
          ))}
        </g>
      </g>

      {/* 1D. Targeting Reticle / Cursor (when tracking or pinned) */}
      {activeCanonical && (
        <g
          transform={`translate(${activeCanonical.x}, ${activeCanonical.y})`}
          pointerEvents="none"
          style={{ transition: pinnedCoords ? 'none' : 'transform 40ms linear' }}
        >
          {/* Concentric outer alignment ring */}
          <circle
            cx={0}
            cy={0}
            r={18}
            fill="none"
            stroke={reticleColor}
            strokeWidth={2}
            strokeDasharray={pinnedCoords ? 'none' : '4 3'}
            className={pinnedCoords ? 'sgp-pulse-ring' : ''}
            opacity={0.9}
          />

          {/* Inner center disc */}
          <circle cx={0} cy={0} r={4.5} fill={reticleColor} stroke="#FFFFFF" strokeWidth={1.5} />

          {/* Crosshair ticks */}
          <line x1={-26} y1={0} x2={-19} y2={0} stroke={reticleColor} strokeWidth={2} />
          <line x1={19} y1={0} x2={26} y2={0} stroke={reticleColor} strokeWidth={2} />
          <line x1={0} y1={-26} x2={0} y2={-19} stroke={reticleColor} strokeWidth={2} />
          <line x1={0} y1={19} x2={0} y2={26} stroke={reticleColor} strokeWidth={2} />

          {/* Candidate Hexagon Marker Preview when pinned */}
          {pinnedCoords && (
            <g transform="translate(0, 0)">
              <path
                d="M 0 -11 L 9.5 -5.5 L 9.5 5.5 L 0 11 L -9.5 5.5 L -9.5 -5.5 Z"
                fill="#073B5C"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              <path
                d="M 0 -8 L 6.8 -4 L 6.8 4 L 0 8 L -6.8 4 L -6.8 -4 Z"
                fill={isCurrentInside ? '#10B981' : '#EF4444'}
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Floating Contextual Pill above reticle */}
          <g transform="translate(0, -32)">
            <rect
              x={-95}
              y={-12}
              width={190}
              height={24}
              rx={6}
              fill="#0F172A"
              fillOpacity={0.94}
              stroke={isCurrentInside ? '#10B981' : '#EF4444'}
              strokeWidth={1.2}
              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.4))"
            />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize={10}
              fontWeight={700}
              fontFamily="system-ui, sans-serif"
            >
              {isCurrentInside
                ? `✓ Tọa độ: ${canonicalSceneToNormalized(activeCanonical.x, activeCanonical.y).x.toFixed(4)}, ${canonicalSceneToNormalized(activeCanonical.x, activeCanonical.y).y.toFixed(4)}`
                : `⚠️ Ngoài khu vực: ${targetZoneName}`}
            </text>
          </g>
        </g>
      )}
    </g>
  );
};

export interface SpatialPlacementCardProps {
  isActive: boolean;
  targetZoneId: string;
  targetZoneName: string;
  code: string;
  name: string;
  meterType: string;
  isRelocating: boolean;
  pinnedCoords: SpatialPlacementCoords | null;
  activeCanonical: { x: number; y: number };
  isCurrentInside: boolean;
  isSubmitting: boolean;
  error: string | null;
  setCode: (v: string) => void;
  setName: (v: string) => void;
  setMeterType: (v: string) => void;
  onZoneChange?: (zoneId: string) => void;
  onResetPin: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * HTML Card Overlay: Confirmation Form & Coordinates Readout
 */
export const SpatialPlacementCard: React.FC<SpatialPlacementCardProps> = ({
  isActive,
  targetZoneId,
  targetZoneName,
  code,
  name,
  meterType,
  isRelocating,
  pinnedCoords,
  activeCanonical,
  isCurrentInside,
  isSubmitting,
  error,
  setCode,
  setName,
  setMeterType,
  onZoneChange,
  onResetPin,
  onCancel,
  onConfirm,
}) => {
  if (!isActive) return null;

  return (
    <div
      className="sgp-placement-floating-card"
      role="dialog"
      aria-label="Bảng xác nhận vị trí công tơ"
      style={{
        position: 'absolute',
        top: 86,
        right: 20,
        width: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.20)',
        border: '1px solid #E2E8F0',
        padding: 16,
        zIndex: 60,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(14, 116, 144, 0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0E7490',
            }}
          >
            <Crosshair size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              {isRelocating ? 'Chỉnh vị trí công tơ' : 'Thiết lập vị trí công tơ'}
            </h3>
            <span style={{ fontSize: 11, color: '#64748B' }}>Chế độ định vị không gian V7</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#94A3B8',
            padding: 4,
          }}
          aria-label="Hủy"
        >
          <X size={18} />
        </button>
      </div>

      {/* Validation Status Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 8,
          backgroundColor: isCurrentInside ? 'rgba(16, 185, 129, 0.10)' : 'rgba(239, 68, 68, 0.10)',
          border: `1px solid ${isCurrentInside ? '#10B981' : '#EF4444'}`,
          marginBottom: 14,
        }}
      >
        {isCurrentInside ? (
          <Check size={16} color="#10B981" />
        ) : (
          <AlertTriangle size={16} color="#EF4444" />
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isCurrentInside ? '#065F46' : '#991B1B',
          }}
        >
          {isCurrentInside
            ? `Vị trí hợp lệ (${targetZoneName})`
            : `Vị trí đang nằm ngoài khu vực ${targetZoneName}`}
        </span>
      </div>

      {/* Form Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            Mã công tơ
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isRelocating}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: 13,
              fontWeight: 700,
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              backgroundColor: isRelocating ? '#F1F5F9' : '#FFFFFF',
              color: '#0F172A',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            Tên công tơ
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: 13,
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              color: '#0F172A',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            Loại công tơ
          </label>
          <select
            value={meterType}
            onChange={(e) => setMeterType(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: 12,
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              boxSizing: 'border-box',
            }}
          >
            <option value="LCD">Công tơ điện tử LCD</option>
            <option value="MECHANICAL">Công tơ cơ khí (Cơ)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
            Khu vực chỉ định
          </label>
          {onZoneChange ? (
            <select
              value={targetZoneId}
              onChange={(e) => onZoneChange(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: 12,
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                boxSizing: 'border-box',
              }}
            >
              {BUSINESS_ZONES_GEOMETRY.map((bz) => (
                <option key={bz.id} value={bz.id}>
                  {bz.name}
                </option>
              ))}
            </select>
          ) : (
            <div
              style={{
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                color: '#334155',
              }}
            >
              {targetZoneName}
            </div>
          )}
        </div>

        {/* Coordinates readout */}
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: '#F8FAFC',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            fontSize: 11,
            color: '#334155',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Tọa độ chuẩn hóa:</span>
            <strong style={{ fontFamily: 'monospace' }}>
              x={canonicalSceneToNormalized(activeCanonical.x, activeCanonical.y).x.toFixed(4)}, y={canonicalSceneToNormalized(activeCanonical.x, activeCanonical.y).y.toFixed(4)}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tọa độ khung V2:</span>
            <strong style={{ fontFamily: 'monospace' }}>
              ({activeCanonical.x}, {activeCanonical.y}) px
            </strong>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 10, fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {pinnedCoords ? (
          <button
            type="button"
            onClick={onResetPin}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={13} />
            Chọn lại
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Hủy
          </button>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting || !isCurrentInside || !pinnedCoords}
          style={{
            flex: 1.5,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            borderRadius: 8,
            backgroundColor: isCurrentInside && pinnedCoords ? '#0284C7' : '#94A3B8',
            color: '#FFFFFF',
            cursor: isCurrentInside && pinnedCoords ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Check size={14} />
          {isSubmitting ? 'Đang lưu...' : 'Xác nhận vị trí'}
        </button>
      </div>
    </div>
  );
};
