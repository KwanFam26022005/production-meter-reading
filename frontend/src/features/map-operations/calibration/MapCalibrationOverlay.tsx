import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CANONICAL_GEOMETRY_V10,
  V10RawZone,
  V10GeometryManifest,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  CANONICAL_LANDMARKS,
} from '../geometry/tanThuanPresentationGeometryV10';
import {
  CalibrationLandmark,
  CalibrationLandmarkCategory,
  ZONE_BOUNDARY_CONTRACTS,
} from '../geometry/canonicalLandmarks';
import {
  checkPolygonSimplicity,
  calculatePolygonArea,
  checkVerticesBounds,
  isPointInPolygon2D,
  Point2D,
} from './calibrationGeometryUtils';
import { CANONICAL_12_METERS_AUDIT } from '../geometry/canonicalScene';
import {
  Copy,
  Download,
  RotateCcw,
  X,
  Trash2,
  Compass,
  Undo2,
} from 'lucide-react';

export function isCalibrationModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (!import.meta.env.DEV) return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('mapCalibration') === '1' || sessionStorage.getItem('mapCalibration') === '1';
}

export type CalibrationEditorTab = 'vertices' | 'landmarks';

export interface CalibrationState {
  zones: V10RawZone[];
  landmarks: CalibrationLandmark[];
  selectedZoneId: string;
  selectedVertexIdx: number | null;
  selectedLandmarkId: string | null;
  activeTab: CalibrationEditorTab;
  selectedLandmarkCategory: CalibrationLandmarkCategory;
  referenceOpacity: number;
  showReference: boolean;
  showLandmarks: boolean;
  showMeters: boolean;
  showOperators: boolean;
  copySuccess: boolean;
  activeZone: V10RawZone;
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
  setSelectedLandmarkId: (id: string | null) => void;
  setActiveTab: (tab: CalibrationEditorTab) => void;
  setSelectedLandmarkCategory: (cat: CalibrationLandmarkCategory) => void;
  setReferenceOpacity: (op: number) => void;
  setShowReference: (show: boolean) => void;
  setShowLandmarks: (show: boolean) => void;
  setShowMeters: (show: boolean) => void;
  setShowOperators: (show: boolean) => void;
  setZones: React.Dispatch<React.SetStateAction<V10RawZone[]>>;
  handleEdgeClick: (edgeIndex: number, e: React.PointerEvent) => void;
  handleDeleteVertex: () => void;
  handleDeleteLandmark: () => void;
  handleUndo: () => void;
  handleCopyJson: () => void;
  handleDownloadJson: () => void;
  handleReset: () => void;
  handleExit: () => void;
  handlePointerDownVertex: (idx: number, e: React.PointerEvent) => void;
  handlePointerDownLabelAnchor: (e: React.PointerEvent) => void;
  handlePointerDownOperatorAnchor: (e: React.PointerEvent) => void;
  handlePointerDownLandmark: (id: string, e: React.PointerEvent) => void;
  handleCanvasClick: (e: React.PointerEvent) => void;
}

export function useMapCalibration(
  svgRef: React.RefObject<SVGSVGElement | null>,
  worldGroupRef: React.RefObject<SVGGElement | null>,
  onClose?: () => void
): CalibrationState {
  const [zones, setZones] = useState<V10RawZone[]>(() =>
    JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10.zones))
  );
  const [landmarks, setLandmarks] = useState<CalibrationLandmark[]>(() =>
    JSON.parse(JSON.stringify(CANONICAL_LANDMARKS))
  );
  const [history, setHistory] = useState<V10RawZone[][]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('pres-berth');
  const [selectedVertexIdx, setSelectedVertexIdx] = useState<number | null>(null);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CalibrationEditorTab>('vertices');
  const [selectedLandmarkCategory, setSelectedLandmarkCategory] =
    useState<CalibrationLandmarkCategory>('quay-edge');
  const [referenceOpacity, setReferenceOpacity] = useState<number>(0.5);
  const [showReference, setShowReference] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showMeters, setShowMeters] = useState<boolean>(true);
  const [showOperators, setShowOperators] = useState<boolean>(true);

  const [dragTarget, setDragTarget] = useState<
    | { type: 'vertex'; index: number }
    | { type: 'labelAnchor' }
    | { type: 'operatorAnchor' }
    | { type: 'landmark'; id: string }
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
    const poly = activeZone.polygonCanonical;
    const simplicity = checkPolygonSimplicity(poly);
    const boundsValid = checkVerticesBounds(poly, CANONICAL_WIDTH, CANONICAL_HEIGHT);
    const area = calculatePolygonArea(poly);
    const labelInside = isPointInPolygon2D(activeZone.labelAnchorCanonical, poly);
    const operatorInside = isPointInPolygon2D(activeZone.operatorAnchorCanonical, poly);

    const meterContainment = assignedMeters.map((m) => {
      const isInside = isPointInPolygon2D({ x: m.canonicalX, y: m.canonicalY }, poly);
      return {
        code: m.code,
        name: m.name,
        x: m.canonicalX,
        y: m.canonicalY,
        isInside,
      };
    });

    const allMetersInside =
      meterContainment.length === 0 || meterContainment.every((m) => m.isInside);

    return {
      isSimple: simplicity.isSimple,
      intersection: simplicity.intersection,
      boundsValid,
      area: Math.round(area),
      vertexCount: poly.length,
      labelInside,
      operatorInside,
      meterContainment,
      allMetersInside,
    };
  }, [activeZone, assignedMeters]);

  // CTM coordinate transform
  const screenToCanonical = useCallback(
    (clientX: number, clientY: number): Point2D | null => {
      if (!worldGroupRef.current || !svgRef.current) return null;
      const gEl = worldGroupRef.current;
      const svg = svgRef.current;

      const ctm = gEl.getScreenCTM();
      if (!ctm) return null;

      const inverse = ctm.inverse();
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const canonicalPt = pt.matrixTransform(inverse);

      return {
        x: Math.round(Math.max(0, Math.min(CANONICAL_WIDTH, canonicalPt.x))),
        y: Math.round(Math.max(0, Math.min(CANONICAL_HEIGHT, canonicalPt.y))),
      };
    },
    [worldGroupRef, svgRef]
  );

  // Push history before mutating zone geometry
  const recordHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-15), JSON.parse(JSON.stringify(zones))]);
  }, [zones]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setZones(previous);
  }, [history]);

  // Pointer drag listener
  useEffect(() => {
    if (!dragTarget) return;

    const handlePointerMove = (e: PointerEvent) => {
      const canonical = screenToCanonical(e.clientX, e.clientY);
      if (!canonical) return;

      if (dragTarget.type === 'vertex') {
        setZones((prevZones) =>
          prevZones.map((z) => {
            if (z.id !== selectedZoneId) return z;
            const nextPoly = [...z.polygonCanonical];
            nextPoly[dragTarget.index] = {
              ...nextPoly[dragTarget.index],
              x: canonical.x,
              y: canonical.y,
            };
            return { ...z, polygonCanonical: nextPoly };
          })
        );
      } else if (dragTarget.type === 'labelAnchor') {
        setZones((prevZones) =>
          prevZones.map((z) => {
            if (z.id !== selectedZoneId) return z;
            return { ...z, labelAnchorCanonical: canonical };
          })
        );
      } else if (dragTarget.type === 'operatorAnchor') {
        setZones((prevZones) =>
          prevZones.map((z) => {
            if (z.id !== selectedZoneId) return z;
            return { ...z, operatorAnchorCanonical: canonical };
          })
        );
      } else if (dragTarget.type === 'landmark') {
        setLandmarks((prev) =>
          prev.map((lm) => (lm.id === dragTarget.id ? { ...lm, canonical } : lm))
        );
      }
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
  }, [dragTarget, screenToCanonical, selectedZoneId]);

  // Keyboard Delete / Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeTab === 'vertices' && selectedVertexIdx !== null) {
          if (activeZone.polygonCanonical.length > 3) {
            recordHistory();
            setZones((prevZones) =>
              prevZones.map((z) => {
                if (z.id !== selectedZoneId) return z;
                const nextPoly = z.polygonCanonical.filter((_, idx) => idx !== selectedVertexIdx);
                return { ...z, polygonCanonical: nextPoly };
              })
            );
            setSelectedVertexIdx(null);
          }
        } else if (activeTab === 'landmarks' && selectedLandmarkId !== null) {
          setLandmarks((prev) => prev.filter((lm) => lm.id !== selectedLandmarkId));
          setSelectedLandmarkId(null);
        }
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedVertexIdx, selectedLandmarkId, activeZone, selectedZoneId, recordHistory, handleUndo]);

  const handleEdgeClick = (edgeIndex: number, e: React.PointerEvent) => {
    e.stopPropagation();
    const canonical = screenToCanonical(e.clientX, e.clientY);
    if (!canonical) return;

    recordHistory();
    setZones((prevZones) =>
      prevZones.map((z) => {
        if (z.id !== selectedZoneId) return z;
        const nextPoly = [...z.polygonCanonical];
        nextPoly.splice(edgeIndex + 1, 0, canonical);
        return { ...z, polygonCanonical: nextPoly };
      })
    );
    setSelectedVertexIdx(edgeIndex + 1);
  };

  const handleDeleteVertex = () => {
    if (selectedVertexIdx === null || activeZone.polygonCanonical.length <= 3) return;
    recordHistory();
    setZones((prevZones) =>
      prevZones.map((z) => {
        if (z.id !== selectedZoneId) return z;
        const nextPoly = z.polygonCanonical.filter((_, idx) => idx !== selectedVertexIdx);
        return { ...z, polygonCanonical: nextPoly };
      })
    );
    setSelectedVertexIdx(null);
  };

  const handleDeleteLandmark = () => {
    if (!selectedLandmarkId) return;
    setLandmarks((prev) => prev.filter((lm) => lm.id !== selectedLandmarkId));
    setSelectedLandmarkId(null);
  };

  const handleCanvasClick = (e: React.PointerEvent) => {
    if (activeTab === 'landmarks') {
      const canonical = screenToCanonical(e.clientX, e.clientY);
      if (!canonical) return;

      const newId = `${activeZone.id}-lm-${Date.now().toString().slice(-4)}`;
      const newLandmark: CalibrationLandmark = {
        id: newId,
        zoneId: activeZone.id,
        label: `Điểm ${landmarks.length + 1} (${selectedLandmarkCategory})`,
        category: selectedLandmarkCategory,
        canonical,
      };
      setLandmarks((prev) => [...prev, newLandmark]);
      setSelectedLandmarkId(newId);
    }
  };

  const generateExportJson = (): string => {
    const exportData: V10GeometryManifest = {
      schemaVersion: '1.0',
      mapVersion: 'tan-thuan-v10',
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
      landmarks,
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
    a.download = 'tanThuanPresentationGeometry.v10.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setZones(JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10.zones)));
    setLandmarks(JSON.parse(JSON.stringify(CANONICAL_LANDMARKS)));
    setSelectedVertexIdx(null);
    setSelectedLandmarkId(null);
    setHistory([]);
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
    recordHistory();
    setDragTarget({ type: 'vertex', index: idx });
  };

  const handlePointerDownLabelAnchor = (e: React.PointerEvent) => {
    e.stopPropagation();
    recordHistory();
    setDragTarget({ type: 'labelAnchor' });
  };

  const handlePointerDownOperatorAnchor = (e: React.PointerEvent) => {
    e.stopPropagation();
    recordHistory();
    setDragTarget({ type: 'operatorAnchor' });
  };

  const handlePointerDownLandmark = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedLandmarkId(id);
    setDragTarget({ type: 'landmark', id });
  };

  return {
    zones,
    landmarks,
    selectedZoneId,
    selectedVertexIdx,
    selectedLandmarkId,
    activeTab,
    selectedLandmarkCategory,
    referenceOpacity,
    showReference,
    showLandmarks,
    showMeters,
    showOperators,
    copySuccess,
    activeZone,
    validation,
    setSelectedZoneId,
    setSelectedVertexIdx,
    setSelectedLandmarkId,
    setActiveTab,
    setSelectedLandmarkCategory,
    setReferenceOpacity,
    setShowReference,
    setShowLandmarks,
    setShowMeters,
    setShowOperators,
    setZones,
    handleEdgeClick,
    handleDeleteVertex,
    handleDeleteLandmark,
    handleUndo,
    handleCopyJson,
    handleDownloadJson,
    handleReset,
    handleExit,
    handlePointerDownVertex,
    handlePointerDownLabelAnchor,
    handlePointerDownOperatorAnchor,
    handlePointerDownLandmark,
    handleCanvasClick,
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
    landmarks,
    selectedZoneId,
    selectedVertexIdx,
    selectedLandmarkId,
    activeTab,
    referenceOpacity,
    showReference,
    showLandmarks,
    showMeters,
    activeZone,
    setSelectedZoneId,
    setSelectedVertexIdx,
    setSelectedLandmarkId,
    handleEdgeClick,
    handlePointerDownVertex,
    handlePointerDownLabelAnchor,
    handlePointerDownOperatorAnchor,
    handlePointerDownLandmark,
    handleCanvasClick,
  } = calibration;

  const handleScaleR = Math.max(4, 7 / zoom);

  return (
    <g
      className="sgp-calibration-svg-overlay"
      style={{ userSelect: 'none' }}
      onPointerDown={(e) => {
        if (activeTab === 'landmarks' && e.target === e.currentTarget) {
          handleCanvasClick(e);
        }
      }}
    >
      {/* 1. Approved Zoning Reference Image Overlay */}
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

      {/* 2. Inactive Zones Polygons Outline */}
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

      {/* 3. Active Zone: High-Fidelity Polygon */}
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
          {activeTab === 'vertices' &&
            activeZone.polygonCanonical.map((v, i) => {
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
          {activeTab === 'vertices' &&
            activeZone.polygonCanonical.map((v, i) => {
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
                    fontSize={10 / zoom}
                    fontWeight="bold"
                    fill="#FFFFFF"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                    pointerEvents="none"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}

          {/* Label Anchor Pin [T] */}
          <g
            transform={`translate(${activeZone.labelAnchorCanonical.x}, ${activeZone.labelAnchorCanonical.y})`}
            cursor="grab"
            onPointerDown={handlePointerDownLabelAnchor}
          >
            <circle r={9 / zoom} fill="#0284C7" stroke="#FFFFFF" strokeWidth={2 / zoom} />
            <text
              textAnchor="middle"
              dy={3.5 / zoom}
              fontSize={9 / zoom}
              fontWeight="bold"
              fill="#FFFFFF"
              pointerEvents="none"
            >
              T
            </text>
            <text
              x={12 / zoom}
              y={4 / zoom}
              fontSize={10 / zoom}
              fill="#38BDF8"
              fontWeight="600"
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
              pointerEvents="none"
            >
              Nhãn
            </text>
          </g>

          {/* Operator Anchor Pin [O] */}
          <g
            transform={`translate(${activeZone.operatorAnchorCanonical.x}, ${activeZone.operatorAnchorCanonical.y})`}
            cursor="grab"
            onPointerDown={handlePointerDownOperatorAnchor}
          >
            <circle r={9 / zoom} fill="#D97706" stroke="#FFFFFF" strokeWidth={2 / zoom} />
            <text
              textAnchor="middle"
              dy={3.5 / zoom}
              fontSize={9 / zoom}
              fontWeight="bold"
              fill="#FFFFFF"
              pointerEvents="none"
            >
              O
            </text>
            <text
              x={12 / zoom}
              y={4 / zoom}
              fontSize={10 / zoom}
              fill="#F59E0B"
              fontWeight="600"
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
              pointerEvents="none"
            >
              NV
            </text>
          </g>
        </g>
      )}

      {/* 4. Physical Landmarks Overlay */}
      {showLandmarks &&
        landmarks.map((lm) => {
          const isSelected = selectedLandmarkId === lm.id;
          const isZoneLm = lm.zoneId === selectedZoneId;
          return (
            <g
              key={lm.id}
              transform={`translate(${lm.canonical.x}, ${lm.canonical.y})`}
              cursor="grab"
              opacity={isZoneLm ? 1 : 0.45}
              onPointerDown={(e) => handlePointerDownLandmark(lm.id, e)}
              onClick={() => setSelectedLandmarkId(lm.id)}
            >
              {/* Diamond Pin Marker */}
              <polygon
                points={`0,${-8 / zoom} ${6 / zoom},0 0,${8 / zoom} ${-6 / zoom},0`}
                fill={isSelected ? '#F59E0B' : isZoneLm ? '#10B981' : '#64748B'}
                stroke="#FFFFFF"
                strokeWidth={1.5 / zoom}
                filter="drop-shadow(0 1px 3px rgba(0,0,0,0.6))"
              />
              <text
                x={8 / zoom}
                y={3 / zoom}
                fontSize={9 / zoom}
                fontWeight="600"
                fill={isSelected ? '#FDE047' : isZoneLm ? '#A7F3D0' : '#CBD5E1'}
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                pointerEvents="none"
              >
                {lm.id}
              </text>
            </g>
          );
        })}

      {/* 5. Production Meters Overlay Preview */}
      {showMeters &&
        CANONICAL_12_METERS_AUDIT.map((m) => {
          const isAssigned = m.presentationRegionId === selectedZoneId;
          return (
            <g
              key={m.code}
              transform={`translate(${m.canonicalX}, ${m.canonicalY})`}
              pointerEvents="none"
              opacity={isAssigned ? 1 : 0.4}
            >
              <circle
                r={5 / zoom}
                fill={isAssigned ? '#10B981' : '#64748B'}
                stroke="#FFFFFF"
                strokeWidth={1.2 / zoom}
              />
              <text
                x={7 / zoom}
                y={3 / zoom}
                fontSize={8.5 / zoom}
                fontWeight="500"
                fill="#FFFFFF"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
              >
                {m.code}
              </text>
            </g>
          );
        })}
    </g>
  );
};

/**
 * Calibration HUD Drawer: Rendered outside SVG as floating UI
 */
export const MapCalibrationHUD: React.FC<{
  calibration: CalibrationState;
}> = ({ calibration }) => {
  const {
    zones,
    landmarks,
    selectedZoneId,
    selectedVertexIdx,
    selectedLandmarkId,
    activeTab,
    selectedLandmarkCategory,
    referenceOpacity,
    showReference,
    showLandmarks,
    showMeters,
    copySuccess,
    validation,
    setSelectedZoneId,
    setSelectedVertexIdx,
    setSelectedLandmarkId,
    setActiveTab,
    setSelectedLandmarkCategory,
    setReferenceOpacity,
    setShowReference,
    setShowLandmarks,
    setShowMeters,
    handleDeleteVertex,
    handleDeleteLandmark,
    handleUndo,
    handleCopyJson,
    handleDownloadJson,
    handleReset,
    handleExit,
  } = calibration;

  const boundaryContract = ZONE_BOUNDARY_CONTRACTS[selectedZoneId];

  return (
    <aside
      className="sgp-map-hud-surface"
      role="region"
      aria-label="V10 Landmark Calibration Drawer"
      style={{
        position: 'absolute',
        top: '72px',
        left: '20px',
        width: '360px',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        borderRadius: '12px',
        padding: '16px',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 1000,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={18} className="text-amber-400" />
          <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.04em' }}>
            V10 CALIBRATION (1915 x 821)
          </span>
        </div>
        <button
          type="button"
          onClick={handleExit}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
          }}
          title="Thoát chế độ hiệu chuẩn"
        >
          <X size={16} />
        </button>
      </div>

      {/* Zone Selector */}
      <div>
        <label
          htmlFor="calib-zone-select"
          style={{
            fontSize: '11px',
            color: '#94A3B8',
            marginBottom: '4px',
            display: 'block',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Phân khu hiển thị
        </label>
        <select
          id="calib-zone-select"
          value={selectedZoneId}
          onChange={(e) => {
            setSelectedZoneId(e.target.value);
            setSelectedVertexIdx(null);
            setSelectedLandmarkId(null);
          }}
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            padding: '7px 10px',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.displayIndex}. {z.displayLabel} ({z.id})
            </option>
          ))}
        </select>
      </div>

      {/* Physical Boundary Contract Summary */}
      {boundaryContract && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '8px 10px',
            fontSize: '11px',
            lineHeight: '1.4',
            color: '#CBD5E1',
          }}
        >
          <div style={{ fontWeight: 600, color: '#38BDF8', marginBottom: '4px' }}>
            Ranh giới vật lý: {boundaryContract.zoneName}
          </div>
          <div>• Bắc: {boundaryContract.north}</div>
          <div>• Nam: {boundaryContract.south}</div>
        </div>
      )}

      {/* Layer Toggles & Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '8px 0',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ color: '#94A3B8' }}>Ảnh đối chiếu (Approved Zoning)</span>
          <button
            type="button"
            onClick={() => setShowReference(!showReference)}
            style={{
              background: showReference ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: showReference ? '#38BDF8' : '#94A3B8',
              borderRadius: '4px',
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            {showReference ? 'Bật' : 'Tắt'}
          </button>
        </div>

        {showReference && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8', minWidth: '42px' }}>
              Độ mờ: {Math.round(referenceOpacity * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={referenceOpacity}
              aria-label="Độ mờ ảnh đối chiếu"
              onChange={(e) => setReferenceOpacity(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#38BDF8', cursor: 'pointer' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setShowLandmarks(!showLandmarks)}
            style={{
              flex: 1,
              background: showLandmarks ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.4)',
              border: `1px solid ${showLandmarks ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
              color: showLandmarks ? '#34D399' : '#94A3B8',
              padding: '5px 4px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Địa danh ({landmarks.filter((l) => l.zoneId === selectedZoneId).length})
          </button>
          <button
            type="button"
            onClick={() => setShowMeters(!showMeters)}
            style={{
              flex: 1,
              background: showMeters ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.4)',
              border: `1px solid ${showMeters ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)'}`,
              color: showMeters ? '#38BDF8' : '#94A3B8',
              padding: '5px 4px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Công tơ ({validation.meterContainment.length})
          </button>
        </div>
      </div>

      {/* Editor Tabs: Vertices vs Landmarks */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('vertices')}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            background: activeTab === 'vertices' ? '#0284C7' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${activeTab === 'vertices' ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)'}`,
            color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          Đỉnh Polygon ({validation.vertexCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('landmarks')}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            background: activeTab === 'landmarks' ? '#059669' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${activeTab === 'landmarks' ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
            color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          Địa danh vật lý
        </button>
      </div>

      {/* Tab Context Action */}
      {activeTab === 'vertices' ? (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={handleUndo}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#CBD5E1',
              cursor: 'pointer',
            }}
          >
            <Undo2 size={12} /> Hoàn tác
          </button>
          <button
            type="button"
            onClick={handleDeleteVertex}
            disabled={selectedVertexIdx === null || validation.vertexCount <= 3}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              background: selectedVertexIdx !== null ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.3)',
              border: `1px solid ${selectedVertexIdx !== null ? '#EF4444' : 'rgba(255, 255, 255, 0.08)'}`,
              color: selectedVertexIdx !== null ? '#FCA5A5' : '#64748B',
              cursor: selectedVertexIdx !== null ? 'pointer' : 'not-allowed',
            }}
          >
            <Trash2 size={12} /> Xóa đỉnh {selectedVertexIdx !== null ? `#${selectedVertexIdx + 1}` : ''}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', color: '#94A3B8' }}>
            Nhấp vào bản đồ để thêm địa danh. Chọn loại:
          </div>
          <select
            value={selectedLandmarkCategory}
            onChange={(e) => setSelectedLandmarkCategory(e.target.value as CalibrationLandmarkCategory)}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              padding: '5px 8px',
              borderRadius: '4px',
              fontSize: '11px',
            }}
          >
            <option value="quay-edge">Mép cầu tàu (quay-edge)</option>
            <option value="service-road">Đường công vụ (service-road)</option>
            <option value="internal-road">Đường nội bộ (internal-road)</option>
            <option value="perimeter-road">Đường bao quanh (perimeter-road)</option>
            <option value="fence">Hàng rào (fence)</option>
            <option value="warehouse-edge">Mép nhà kho (warehouse-edge)</option>
            <option value="yard-edge">Mép bãi (yard-edge)</option>
            <option value="gate">Cổng (gate)</option>
            <option value="security">An ninh / Bốt gác (security)</option>
            <option value="weigh-station">Trạm cân (weigh-station)</option>
            <option value="intersection">Giao lộ (intersection)</option>
            <option value="other">Khác (other)</option>
          </select>
          {selectedLandmarkId && (
            <button
              type="button"
              onClick={handleDeleteLandmark}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={12} /> Xóa địa danh đã chọn
            </button>
          )}
        </div>
      )}

      {/* Validation Status */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Hình học đơn giản (Simplicity):</span>
          <span style={{ color: validation.isSimple ? '#10B981' : '#EF4444', fontWeight: 600 }}>
            {validation.isSimple ? 'Hợp lệ' : 'Tự cắt nhau'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Trong tọa độ [1915 x 821]:</span>
          <span style={{ color: validation.boundsValid ? '#10B981' : '#EF4444', fontWeight: 600 }}>
            {validation.boundsValid ? 'Đúng' : 'Vượt biên'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Diện tích khép kín:</span>
          <span className="font-tabular" style={{ color: validation.area > 5000 ? '#10B981' : '#EF4444' }}>
            {validation.area.toLocaleString()} px²
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Công tơ thuộc phân khu:</span>
          <span
            className="font-tabular"
            style={{ color: validation.allMetersInside ? '#10B981' : '#EF4444', fontWeight: 600 }}
          >
            {validation.meterContainment.filter((m) => m.isInside).length}/
            {validation.meterContainment.length} bên trong
          </span>
        </div>
      </div>

      {/* Export & Reset Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
        <button
          type="button"
          onClick={handleCopyJson}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: copySuccess ? '#059669' : '#0284C7',
            border: 'none',
            color: '#FFFFFF',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 180ms ease',
          }}
        >
          <Copy size={14} /> {copySuccess ? 'Đã sao chép V10 JSON!' : 'Sao chép V10 JSON'}
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={handleDownloadJson}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#E2E8F0',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            <Download size={13} /> Tải tệp JSON
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94A3B8',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title="Khôi phục trạng thái ban đầu"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
};
