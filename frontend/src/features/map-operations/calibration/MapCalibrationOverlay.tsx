import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CANONICAL_GEOMETRY_V9,
  V9RawZone,
  V9GeometryManifest,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
} from '../geometry/tanThuanPresentationGeometryV9';
import {
  checkPolygonSimplicity,
  calculatePolygonArea,
  checkVerticesBounds,
  isPointInPolygon2D,
  Point2D,
} from './calibrationGeometryUtils';
import { CANONICAL_12_METERS_AUDIT } from '../geometry/canonicalScene';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  RotateCcw,
  X,
  Trash2,
  Compass,
} from 'lucide-react';

export function isCalibrationModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (!import.meta.env.DEV) return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('mapCalibration') === '1' || sessionStorage.getItem('mapCalibration') === '1';
}

export interface CalibrationState {
  zones: V9RawZone[];
  selectedZoneId: string;
  selectedVertexIdx: number | null;
  referenceOpacity: number;
  showReference: boolean;
  copySuccess: boolean;
  activeZone: V9RawZone;
  validation: {
    isSimple: boolean;
    intersection?: { edge1: number; edge2: number };
    boundsValid: boolean;
    area: number;
    vertexCount: number;
    labelInside: boolean;
    operatorInside: boolean;
    meterContainment: Array<{ code: string; name: string; x: number; y: number; isInside: boolean }>;
    allMetersInside: boolean;
  };
  setSelectedZoneId: (id: string) => void;
  setSelectedVertexIdx: (idx: number | null) => void;
  setReferenceOpacity: (op: number) => void;
  setShowReference: (show: boolean) => void;
  setZones: React.Dispatch<React.SetStateAction<V9RawZone[]>>;
  handleEdgeClick: (edgeIndex: number, e: React.PointerEvent) => void;
  handleDeleteVertex: () => void;
  handleCopyJson: () => void;
  handleDownloadJson: () => void;
  handleReset: () => void;
  handleExit: () => void;
  handlePointerDownVertex: (idx: number, e: React.PointerEvent) => void;
  handlePointerDownLabelAnchor: (e: React.PointerEvent) => void;
  handlePointerDownOperatorAnchor: (e: React.PointerEvent) => void;
}

export function useMapCalibration(
  svgRef: React.RefObject<SVGSVGElement | null>,
  worldGroupRef: React.RefObject<SVGGElement | null>,
  onClose?: () => void
): CalibrationState {
  const [zones, setZones] = useState<V9RawZone[]>(() =>
    JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V9.zones))
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string>('pres-berth');
  const [selectedVertexIdx, setSelectedVertexIdx] = useState<number | null>(null);
  const [referenceOpacity, setReferenceOpacity] = useState<number>(0.5);
  const [showReference, setShowReference] = useState<boolean>(true);
  const [dragTarget, setDragTarget] = useState<
    | { type: 'vertex'; index: number }
    | { type: 'labelAnchor' }
    | { type: 'operatorAnchor' }
    | null
  >(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const activeZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || zones[0],
    [zones, selectedZoneId]
  );

  const assignedMeters = useMemo(() => {
    return CANONICAL_12_METERS_AUDIT.filter((m) => m.presentationRegionId === activeZone.id);
  }, [activeZone.id]);

  const validation = useMemo(() => {
    const vertices = activeZone.polygonCanonical;
    const simplicity = checkPolygonSimplicity(vertices);
    const boundsValid = checkVerticesBounds(vertices, CANONICAL_WIDTH, CANONICAL_HEIGHT);
    const area = Math.round(calculatePolygonArea(vertices));
    const labelInside = isPointInPolygon2D(activeZone.labelAnchorCanonical, vertices);
    const operatorInside = isPointInPolygon2D(activeZone.operatorAnchorCanonical, vertices);

    const meterContainment = assignedMeters.map((m) => ({
      code: m.code,
      name: m.name,
      x: m.canonicalX,
      y: m.canonicalY,
      isInside: isPointInPolygon2D({ x: m.canonicalX, y: m.canonicalY }, vertices),
    }));

    const allMetersInside = meterContainment.every((m) => m.isInside);

    return {
      isSimple: simplicity.isSimple,
      intersection: simplicity.intersection,
      boundsValid,
      area,
      vertexCount: vertices.length,
      labelInside,
      operatorInside,
      meterContainment,
      allMetersInside,
    };
  }, [activeZone, assignedMeters]);

  const getCanonicalPoint = useCallback(
    (e: React.PointerEvent | PointerEvent): Point2D | null => {
      const gEl = worldGroupRef.current;
      const svgEl = svgRef.current;
      if (!gEl || !svgEl) return null;

      const ctm = gEl.getScreenCTM();
      if (!ctm) return null;

      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const transformed = pt.matrixTransform(ctm.inverse());

      return {
        x: Math.round(Math.max(0, Math.min(CANONICAL_WIDTH, transformed.x))),
        y: Math.round(Math.max(0, Math.min(CANONICAL_HEIGHT, transformed.y))),
      };
    },
    [worldGroupRef, svgRef]
  );

  useEffect(() => {
    if (!dragTarget) return;

    const handlePointerMove = (e: PointerEvent) => {
      const pt = getCanonicalPoint(e);
      if (!pt) return;

      setZones((prevZones) =>
        prevZones.map((z) => {
          if (z.id !== selectedZoneId) return z;

          if (dragTarget.type === 'vertex') {
            const nextPoly = [...z.polygonCanonical];
            nextPoly[dragTarget.index] = pt;
            return { ...z, polygonCanonical: nextPoly };
          } else if (dragTarget.type === 'labelAnchor') {
            return { ...z, labelAnchorCanonical: pt };
          } else if (dragTarget.type === 'operatorAnchor') {
            return { ...z, operatorAnchorCanonical: pt };
          }
          return z;
        })
      );
    };

    const handlePointerUp = () => {
      setDragTarget(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragTarget, selectedZoneId, getCanonicalPoint]);

  const handleEdgeClick = (edgeIndex: number, e: React.PointerEvent) => {
    e.stopPropagation();
    const pt = getCanonicalPoint(e);
    if (!pt) return;

    setZones((prevZones) =>
      prevZones.map((z) => {
        if (z.id !== selectedZoneId) return z;
        const nextPoly = [...z.polygonCanonical];
        nextPoly.splice(edgeIndex + 1, 0, pt);
        return { ...z, polygonCanonical: nextPoly };
      })
    );
    setSelectedVertexIdx(edgeIndex + 1);
  };

  const handleDeleteVertex = () => {
    if (selectedVertexIdx === null || activeZone.polygonCanonical.length <= 3) return;

    setZones((prevZones) =>
      prevZones.map((z) => {
        if (z.id !== selectedZoneId) return z;
        const nextPoly = z.polygonCanonical.filter((_, idx) => idx !== selectedVertexIdx);
        return { ...z, polygonCanonical: nextPoly };
      })
    );
    setSelectedVertexIdx(null);
  };

  const generateExportJson = (): string => {
    const exportData: V9GeometryManifest = {
      schemaVersion: '1.0',
      mapVersion: 'tan-thuan-v9',
      coordinateSystem: 'tan-thuan-canonical-image-pixel-space-v1',
      canonicalWidth: CANONICAL_WIDTH,
      canonicalHeight: CANONICAL_HEIGHT,
      zones: zones.map((z) => ({
        id: z.id,
        displayIndex: z.displayIndex,
        displayLabel: z.displayLabel,
        businessName: z.businessName,
        businessZoneIds: z.businessZoneIds,
        presentationColor: z.presentationColor,
        icon: z.icon,
        polygonCanonical: z.polygonCanonical,
        labelAnchorCanonical: z.labelAnchorCanonical,
        operatorAnchorCanonical: z.operatorAnchorCanonical,
      })),
    };
    return JSON.stringify(exportData, null, 2);
  };

  const handleCopyJson = () => {
    const jsonStr = generateExportJson();
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  const handleDownloadJson = () => {
    const jsonStr = generateExportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tanThuanPresentationGeometry.v9.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setZones(JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V9.zones)));
    setSelectedVertexIdx(null);
  };

  const handleExit = () => {
    sessionStorage.removeItem('mapCalibration');
    const url = new URL(window.location.href);
    url.searchParams.delete('mapCalibration');
    window.history.replaceState({}, '', url.toString());
    onClose?.();
  };

  const handlePointerDownVertex = (idx: number, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedVertexIdx(idx);
    setDragTarget({ type: 'vertex', index: idx });
  };

  const handlePointerDownLabelAnchor = (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragTarget({ type: 'labelAnchor' });
  };

  const handlePointerDownOperatorAnchor = (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragTarget({ type: 'operatorAnchor' });
  };

  return {
    zones,
    selectedZoneId,
    selectedVertexIdx,
    referenceOpacity,
    showReference,
    copySuccess,
    activeZone,
    validation,
    setSelectedZoneId,
    setSelectedVertexIdx,
    setReferenceOpacity,
    setShowReference,
    setZones,
    handleEdgeClick,
    handleDeleteVertex,
    handleCopyJson,
    handleDownloadJson,
    handleReset,
    handleExit,
    handlePointerDownVertex,
    handlePointerDownLabelAnchor,
    handlePointerDownOperatorAnchor,
  };
}

/**
 * Calibration SVG Layer: Rendered directly inside world <g> of OperationalScene
 */
export const MapCalibrationSvgLayer: React.FC<{
  calibration: CalibrationState;
  zoom?: number;
}> = ({ calibration, zoom = 1 }) => {
  const {
    zones,
    selectedZoneId,
    selectedVertexIdx,
    referenceOpacity,
    showReference,
    activeZone,
    validation,
    setSelectedZoneId,
    setSelectedVertexIdx,
    handleEdgeClick,
    handlePointerDownVertex,
    handlePointerDownLabelAnchor,
    handlePointerDownOperatorAnchor,
  } = calibration;

  const handleScaleR = Math.max(4, 7 / zoom);

  return (
    <g className="sgp-calibration-svg-overlay" style={{ userSelect: 'none' }}>
      {/* Approved Zoning Reference Image Overlay */}
      {showReference && (
        <image
          href="/reference/tan-thuan-approved-zoning.png"
          x="0"
          y="0"
          width={CANONICAL_WIDTH}
          height={CANONICAL_HEIGHT}
          preserveAspectRatio="none"
          opacity={referenceOpacity}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Inactive Zones Polygons Outline */}
      {zones.map((zone) => {
        if (zone.id === selectedZoneId) return null;
        const pointsStr = zone.polygonCanonical.map((p) => `${p.x},${p.y}`).join(' ');
        return (
          <polygon
            key={zone.id}
            points={pointsStr}
            fill={zone.presentationColor}
            fillOpacity={0.05}
            stroke={zone.presentationColor}
            strokeWidth={1 / zoom}
            strokeOpacity={0.4}
            strokeDasharray="4 2"
            vectorEffect="non-scaling-stroke"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setSelectedZoneId(zone.id);
              setSelectedVertexIdx(null);
            }}
          />
        );
      })}

      {/* Active Zone: High-Fidelity Polygon */}
      {activeZone && (
        <g key={`active-${activeZone.id}`}>
          {/* Soft Halo & Fill */}
          <polygon
            points={activeZone.polygonCanonical.map((p) => `${p.x},${p.y}`).join(' ')}
            fill={activeZone.presentationColor}
            fillOpacity={0.16}
            stroke={activeZone.presentationColor}
            strokeWidth={4 / zoom}
            strokeOpacity={0.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Structural Edge */}
          <polygon
            points={activeZone.polygonCanonical.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={activeZone.presentationColor}
            strokeWidth={2 / zoom}
            strokeOpacity={0.9}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Clickable Edge Segments to Insert Vertex */}
          {activeZone.polygonCanonical.map((v, i) => {
            const next = activeZone.polygonCanonical[(i + 1) % activeZone.polygonCanonical.length];
            return (
              <line
                key={`edge-${i}`}
                x1={v.x}
                y1={v.y}
                x2={next.x}
                y2={next.y}
                stroke="transparent"
                strokeWidth={14 / zoom}
                cursor="crosshair"
                onPointerDown={(e) => handleEdgeClick(i, e)}
              >
                <title>{`Nhấp để thêm đỉnh giữa đỉnh ${i + 1} và ${((i + 1) % activeZone.polygonCanonical.length) + 1}`}</title>
              </line>
            );
          })}

          {/* Draggable Vertex Handles */}
          {activeZone.polygonCanonical.map((v, i) => {
            const isSelected = selectedVertexIdx === i;
            return (
              <g key={`vertex-${i}`} transform={`translate(${v.x}, ${v.y})`}>
                <circle
                  r={handleScaleR * 1.5}
                  fill="transparent"
                  cursor="grab"
                  onPointerDown={(e) => handlePointerDownVertex(i, e)}
                />
                <circle
                  r={handleScaleR}
                  fill={isSelected ? '#F59E0B' : activeZone.presentationColor}
                  stroke="#FFFFFF"
                  strokeWidth={2 / zoom}
                  cursor="grab"
                  vectorEffect="non-scaling-stroke"
                  onPointerDown={(e) => handlePointerDownVertex(i, e)}
                />
                <text
                  x={handleScaleR + 3}
                  y={-handleScaleR}
                  fill="#FFFFFF"
                  fontSize={11 / zoom}
                  fontWeight="bold"
                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                  pointerEvents="none"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}

          {/* Draggable Label Anchor */}
          <g
            transform={`translate(${activeZone.labelAnchorCanonical.x}, ${activeZone.labelAnchorCanonical.y})`}
            cursor="move"
            onPointerDown={handlePointerDownLabelAnchor}
          >
            <circle
              r={handleScaleR * 1.3}
              fill="#38BDF8"
              stroke="#0369A1"
              strokeWidth={2 / zoom}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x="0"
              y={4 / zoom}
              fill="#082F49"
              fontSize={10 / zoom}
              fontWeight="900"
              textAnchor="middle"
              pointerEvents="none"
            >
              L
            </text>
            <text
              x={handleScaleR + 4}
              y={4 / zoom}
              fill="#38BDF8"
              fontSize={10 / zoom}
              fontWeight="bold"
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
              pointerEvents="none"
            >
              Nhãn ({activeZone.labelAnchorCanonical.x}, {activeZone.labelAnchorCanonical.y})
            </text>
          </g>

          {/* Draggable Operator Anchor */}
          <g
            transform={`translate(${activeZone.operatorAnchorCanonical.x}, ${activeZone.operatorAnchorCanonical.y})`}
            cursor="move"
            onPointerDown={handlePointerDownOperatorAnchor}
          >
            <circle
              r={handleScaleR * 1.3}
              fill="#10B981"
              stroke="#065F46"
              strokeWidth={2 / zoom}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x="0"
              y={4 / zoom}
              fill="#022C22"
              fontSize={10 / zoom}
              fontWeight="900"
              textAnchor="middle"
              pointerEvents="none"
            >
              OP
            </text>
            <text
              x={handleScaleR + 4}
              y={4 / zoom}
              fill="#10B981"
              fontSize={10 / zoom}
              fontWeight="bold"
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
              pointerEvents="none"
            >
              Nhân sự ({activeZone.operatorAnchorCanonical.x}, {activeZone.operatorAnchorCanonical.y})
            </text>
          </g>

          {/* Assigned Meters Markers */}
          {validation.meterContainment.map((m) => (
            <g key={m.code} transform={`translate(${m.x}, ${m.y})`} pointerEvents="none">
              <circle
                r={handleScaleR * 0.9}
                fill={m.isInside ? '#10B981' : '#EF4444'}
                stroke="#FFFFFF"
                strokeWidth={1.5 / zoom}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x="0"
                y={-handleScaleR - 2}
                fill={m.isInside ? '#A7F3D0' : '#FECACA'}
                fontSize={10 / zoom}
                fontWeight="bold"
                textAnchor="middle"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
              >
                {m.code}
              </text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
};

/**
 * Calibration HUD Panel: Rendered floating over the map inside the HTML container
 */
export const MapCalibrationHUD: React.FC<{
  calibration: CalibrationState;
}> = ({ calibration }) => {
  const {
    zones,
    selectedZoneId,
    selectedVertexIdx,
    referenceOpacity,
    showReference,
    copySuccess,
    activeZone,
    validation,
    setSelectedZoneId,
    setSelectedVertexIdx,
    setReferenceOpacity,
    setShowReference,
    setZones,
    handleDeleteVertex,
    handleCopyJson,
    handleDownloadJson,
    handleReset,
    handleExit,
  } = calibration;

  return (
    <div
      className="sgp-calibration-hud-panel"
      style={{
        position: 'absolute',
        top: '76px',
        right: '16px',
        width: '360px',
        maxHeight: 'calc(100vh - 96px)',
        overflowY: 'auto',
        background: 'rgba(6, 29, 42, 0.88)',
        backdropFilter: 'blur(16px) saturate(115%)',
        WebkitBackdropFilter: 'blur(16px) saturate(115%)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '14px',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
        color: '#F8FAFC',
        padding: '16px',
        zIndex: 9999,
        pointerEvents: 'auto',
        fontSize: '13px',
        lineHeight: 1.4,
      }}
    >
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={16} color="#38BDF8" />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#38BDF8' }}>
              HIỆU CHỈNH KHÔNG GIAN (V9)
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.7)', marginTop: '2px' }}>
            Tọa độ chuẩn: 0..1915 × 0..821 px
          </div>
        </div>
        <button
          type="button"
          onClick={handleExit}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '6px',
            color: '#94A3B8',
            padding: '4px',
            cursor: 'pointer',
          }}
          title="Thoát hiệu chỉnh"
        >
          <X size={16} />
        </button>
      </div>

      {/* 1. Zone Selector */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(203, 213, 225, 0.8)', display: 'block', marginBottom: '6px' }}>
          CHỌN PHÂN VÙNG HIỂN THỊ (6 VÙNG)
        </label>
        <select
          value={selectedZoneId}
          onChange={(e) => {
            setSelectedZoneId(e.target.value);
            setSelectedVertexIdx(null);
          }}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '8px',
            color: '#F8FAFC',
            fontSize: '13px',
            outline: 'none',
          }}
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.displayIndex}. {z.displayLabel} ({z.id})
            </option>
          ))}
        </select>
      </div>

      {/* 2. Reference Layer Controls */}
      <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px', borderRadius: '8px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} color="#F59E0B" /> Lớp tham chiếu đối chiếu
          </span>
          <input
            type="checkbox"
            checked={showReference}
            onChange={(e) => setShowReference(e.target.checked)}
            id="cb-ref"
            style={{ cursor: 'pointer' }}
          />
        </div>
        {showReference && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(203, 213, 225, 0.7)', marginBottom: '4px' }}>
              <span>Độ mờ: {Math.round(referenceOpacity * 100)}%</span>
              <span style={{ fontStyle: 'italic' }}>tan-thuan-approved-zoning.png</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 0.25, 0.5, 0.75, 1.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setReferenceOpacity(val)}
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    fontSize: '11px',
                    background: referenceOpacity === val ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                    border: referenceOpacity === val ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '4px',
                    color: referenceOpacity === val ? '#38BDF8' : '#CBD5E1',
                    cursor: 'pointer',
                  }}
                >
                  {Math.round(val * 100)}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Live Geometry Validation */}
      <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px', borderRadius: '8px', marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(203, 213, 225, 0.8)', marginBottom: '8px' }}>
          KIỂM TRA CHẤT LƯỢNG HÌNH HỌC TRỰC TIẾP
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
          <div>
            <span style={{ color: 'rgba(203, 213, 225, 0.7)' }}>Số đỉnh:</span>{' '}
            <strong style={{ color: '#F8FAFC' }}>{validation.vertexCount} đỉnh</strong>
          </div>
          <div>
            <span style={{ color: 'rgba(203, 213, 225, 0.7)' }}>Diện tích:</span>{' '}
            <strong style={{ color: '#F8FAFC' }}>{validation.area.toLocaleString()} px²</strong>
          </div>
        </div>

        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            {validation.isSimple ? (
              <CheckCircle2 size={14} color="#10B981" />
            ) : (
              <AlertCircle size={14} color="#EF4444" />
            )}
            <span>
              Đa giác đơn (không tự cắt):{' '}
              <strong style={{ color: validation.isSimple ? '#10B981' : '#EF4444' }}>
                {validation.isSimple ? 'HỢP LỆ' : 'TỰ CẮT NHAU'}
              </strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            {validation.boundsValid ? (
              <CheckCircle2 size={14} color="#10B981" />
            ) : (
              <AlertCircle size={14} color="#EF4444" />
            )}
            <span>
              Nằm trong khung hình [1915×821]:{' '}
              <strong style={{ color: validation.boundsValid ? '#10B981' : '#EF4444' }}>
                {validation.boundsValid ? 'HỢP LỆ' : 'VƯỢT BIÊN'}
              </strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            {validation.allMetersInside ? (
              <CheckCircle2 size={14} color="#10B981" />
            ) : (
              <AlertCircle size={14} color="#EF4444" />
            )}
            <span>
              Bao trọn công tơ:{' '}
              <strong style={{ color: validation.allMetersInside ? '#10B981' : '#EF4444' }}>
                {validation.meterContainment.filter((m) => m.isInside).length}/{validation.meterContainment.length} công tơ
              </strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            {validation.labelInside && validation.operatorInside ? (
              <CheckCircle2 size={14} color="#10B981" />
            ) : (
              <AlertCircle size={14} color="#EF4444" />
            )}
            <span>
              Neo nhãn & Nhân sự:{' '}
              <strong style={{ color: validation.labelInside && validation.operatorInside ? '#10B981' : '#EF4444' }}>
                {validation.labelInside && validation.operatorInside ? 'BÊN TRONG' : 'NGOÀI VÙNG'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Selected Vertex Inspector & Actions */}
      <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px', borderRadius: '8px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(203, 213, 225, 0.8)' }}>
            ĐIỀU CHỈNH ĐỈNH ĐÃ CHỌN
          </span>
          {selectedVertexIdx !== null && (
            <button
              type="button"
              onClick={handleDeleteVertex}
              disabled={activeZone.polygonCanonical.length <= 3}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '4px',
                color: '#EF4444',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: activeZone.polygonCanonical.length <= 3 ? 'not-allowed' : 'pointer',
              }}
            >
              <Trash2 size={12} /> Xóa đỉnh
            </button>
          )}
        </div>
        {selectedVertexIdx !== null ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#F59E0B' }}>Đỉnh #{selectedVertexIdx + 1}:</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: 'rgba(203, 213, 225, 0.7)' }}>X:</span>
              <input
                type="number"
                value={activeZone.polygonCanonical[selectedVertexIdx]?.x ?? 0}
                onChange={(e) => {
                  const nextX = parseInt(e.target.value, 10) || 0;
                  setZones((prev) =>
                    prev.map((z) => {
                      if (z.id !== selectedZoneId) return z;
                      const nextPoly = [...z.polygonCanonical];
                      nextPoly[selectedVertexIdx] = { ...nextPoly[selectedVertexIdx], x: nextX };
                      return { ...z, polygonCanonical: nextPoly };
                    })
                  );
                }}
                style={{
                  width: '64px',
                  padding: '3px 6px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                }}
              />
              <span style={{ color: 'rgba(203, 213, 225, 0.7)' }}>Y:</span>
              <input
                type="number"
                value={activeZone.polygonCanonical[selectedVertexIdx]?.y ?? 0}
                onChange={(e) => {
                  const nextY = parseInt(e.target.value, 10) || 0;
                  setZones((prev) =>
                    prev.map((z) => {
                      if (z.id !== selectedZoneId) return z;
                      const nextPoly = [...z.polygonCanonical];
                      nextPoly[selectedVertexIdx] = { ...nextPoly[selectedVertexIdx], y: nextY };
                      return { ...z, polygonCanonical: nextPoly };
                    })
                  );
                }}
                style={{
                  width: '64px',
                  padding: '3px 6px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.6)' }}>
            Nhấp vào một đỉnh để kéo, hoặc nhấp vào cạnh đa giác để thêm đỉnh mới.
          </div>
        )}
      </div>

      {/* 5. Export and Reset Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopyJson}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: copySuccess ? '#059669' : 'rgba(14, 116, 144, 0.3)',
              border: '1px solid rgba(14, 116, 144, 0.6)',
              borderRadius: '8px',
              color: '#F8FAFC',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background 200ms ease',
            }}
          >
            <Copy size={14} /> {copySuccess ? 'Đã sao chép!' : 'Sao chép JSON'}
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '8px',
              color: '#F8FAFC',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Tải tệp JSON
          </button>
        </div>

        <button
          type="button"
          onClick={handleReset}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: 'rgba(203, 213, 225, 0.7)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={12} /> Đặt lại về cấu hình gốc
        </button>
      </div>
    </div>
  );
};
