import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Save,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { MapCalibrationWorkspace } from './useMapCalibrationWorkspace';
import { formatExportTimestamp } from './useMapCalibrationWorkspace';

export function isCalibrationModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('mapCalibration') === '1' || sessionStorage.getItem('mapCalibration') === '1';
}

export type CalibrationMode = 'VERTEX' | 'LANDMARK' | 'ANCHOR';
export type CalibrationEditorTab = 'vertices' | 'landmarks' | 'anchors';

export interface CalibrationState {
  zones: V10RawZone[];
  landmarks: CalibrationLandmark[];
  selectedZoneId: string;
  selectedVertexIdx: number | null;
  selectedLandmarkId: string | null;
  mode: CalibrationMode;
  activeTab: CalibrationEditorTab;
  selectedLandmarkCategory: CalibrationLandmarkCategory;
  referenceOpacity: number;
  showReference: boolean;
  showOtherZones: boolean;
  showMeters: boolean;
  isPanelCollapsed: boolean;
  showTechDetails: boolean;
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
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  setSelectedZoneId: (id: string) => void;
  setSelectedVertexIdx: (idx: number | null) => void;
  setSelectedLandmarkId: (id: string | null) => void;
  setMode: (mode: CalibrationMode) => void;
  setActiveTab: (tab: CalibrationEditorTab) => void;
  setSelectedLandmarkCategory: (cat: CalibrationLandmarkCategory) => void;
  setReferenceOpacity: (op: number) => void;
  setShowReference: React.Dispatch<React.SetStateAction<boolean>>;
  setShowOtherZones: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMeters: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTechDetails: React.Dispatch<React.SetStateAction<boolean>>;
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
  workspace?: MapCalibrationWorkspace;
}

export function useMapCalibration(
  svgRef: React.RefObject<SVGSVGElement | null>,
  worldGroupRef: React.RefObject<SVGGElement | null>,
  onClose?: () => void,
  workspace?: MapCalibrationWorkspace
): CalibrationState {
  const [zones, setZones] = useState<V10RawZone[]>(() =>
    workspace
      ? JSON.parse(JSON.stringify(workspace.draftGeometry.zones))
      : JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10.zones))
  );
  const [landmarks, setLandmarks] = useState<CalibrationLandmark[]>(() =>
    workspace
      ? JSON.parse(JSON.stringify(workspace.draftGeometry.landmarks || []))
      : JSON.parse(JSON.stringify(CANONICAL_LANDMARKS))
  );
  const [history, setHistory] = useState<V10RawZone[][]>([]);

  // Bidirectional sync with workspace
  const isInternalUpdateRef = useRef(false);

  useEffect(() => {
    if (workspace?.draftGeometry && !isInternalUpdateRef.current) {
      setZones(workspace.draftGeometry.zones);
      if (workspace.draftGeometry.landmarks) {
        setLandmarks(workspace.draftGeometry.landmarks);
      }
    }
    isInternalUpdateRef.current = false;
  }, [workspace?.draftGeometry]);

  useEffect(() => {
    if (workspace) {
      isInternalUpdateRef.current = true;
      workspace.setDraftGeometry((prev) => {
        if (prev.zones === zones && prev.landmarks === landmarks) return prev;
        return {
          ...prev,
          zones,
          landmarks,
        };
      });
    }
  }, [zones, landmarks, workspace]);
  
  // Default startup state (Section 11)
  const [selectedZoneId, setSelectedZoneId] = useState<string>('pres-berth');
  const [mode, setModeState] = useState<CalibrationMode>('VERTEX');
  const [selectedVertexIdx, setSelectedVertexIdx] = useState<number | null>(null);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [selectedLandmarkCategory, setSelectedLandmarkCategory] =
    useState<CalibrationLandmarkCategory>('quay-edge');
  const [referenceOpacity, setReferenceOpacity] = useState<number>(0.25); // Default 25% (Section 3)
  const [showReference, setShowReference] = useState<boolean>(false);     // Default OFF (Section 3)
  const [showOtherZones, setShowOtherZones] = useState<boolean>(false);   // Default OFF (Section 2)
  const [showMeters, setShowMeters] = useState<boolean>(true);           // Default ON (Section 5)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);// Default expanded (Section 7)
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);  // Default collapsed (Section 6)

  const [dragTarget, setDragTarget] = useState<
    | { type: 'vertex'; index: number }
    | { type: 'labelAnchor' }
    | { type: 'operatorAnchor' }
    | { type: 'landmark'; id: string }
    | null
  >(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const activeTab: CalibrationEditorTab =
    mode === 'VERTEX' ? 'vertices' : mode === 'LANDMARK' ? 'landmarks' : 'anchors';

  const setMode = useCallback((newMode: CalibrationMode) => {
    setModeState(newMode);
    setSelectedVertexIdx(null);
    setSelectedLandmarkId(null);
  }, []);

  const setActiveTab = useCallback((tab: CalibrationEditorTab) => {
    if (tab === 'vertices') setMode('VERTEX');
    else if (tab === 'landmarks') setMode('LANDMARK');
    else setMode('ANCHOR');
  }, [setMode]);

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

  const bounds = useMemo(() => {
    const xs = activeZone.polygonCanonical.map((p) => p.x);
    const ys = activeZone.polygonCanonical.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [activeZone]);

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

  const handleDeleteVertex = useCallback(() => {
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
  }, [activeZone.polygonCanonical.length, recordHistory, selectedVertexIdx, selectedZoneId]);

  const handleDeleteLandmark = useCallback(() => {
    if (!selectedLandmarkId) return;
    setLandmarks((prev) => prev.filter((lm) => lm.id !== selectedLandmarkId));
    setSelectedLandmarkId(null);
  }, [selectedLandmarkId]);

  // Comprehensive Keyboard Shortcuts Listener (Section 9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }

      // 1–6 = Select Zone
      const zoneKeys = [
        'pres-berth',
        'pres-container-west',
        'pres-container-center',
        'pres-cfs-east',
        'pres-technical',
        'pres-gate',
      ];
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6) {
        setSelectedZoneId(zoneKeys[num - 1]);
        setSelectedVertexIdx(null);
        setSelectedLandmarkId(null);
        return;
      }

      // V = Vertex mode
      if (e.key === 'v' || e.key === 'V') {
        setMode('VERTEX');
        return;
      }

      // L = Landmark mode
      if (e.key === 'l' || e.key === 'L') {
        setMode('LANDMARK');
        return;
      }

      // A = Anchor mode
      if (e.key === 'a' || e.key === 'A') {
        setMode('ANCHOR');
        return;
      }

      // M = Toggle selected-zone meters
      if (e.key === 'm' || e.key === 'M') {
        setShowMeters((prev) => !prev);
        return;
      }

      // R = Toggle reference overlay
      if (e.key === 'r' || e.key === 'R') {
        setShowReference((prev) => !prev);
        return;
      }

      // Tab = Collapse / Expand Panel
      if (e.key === 'Tab') {
        e.preventDefault();
        setIsPanelCollapsed((prev) => !prev);
        return;
      }

      // Ctrl+Z = Undo
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Delete = Delete selected vertex/landmark
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (mode === 'VERTEX' && selectedVertexIdx !== null) {
          handleDeleteVertex();
        } else if (mode === 'LANDMARK' && selectedLandmarkId !== null) {
          handleDeleteLandmark();
        }
        return;
      }

      // Esc = Cancel current selection
      if (e.key === 'Escape') {
        setSelectedVertexIdx(null);
        setSelectedLandmarkId(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    selectedVertexIdx,
    selectedLandmarkId,
    setMode,
    handleDeleteVertex,
    handleDeleteLandmark,
    handleUndo,
  ]);

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

  const handleCanvasClick = (e: React.PointerEvent) => {
    if (mode === 'LANDMARK') {
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
    const timestamp = formatExportTimestamp();
    const filename = `tanThuanPresentationGeometry.v10.${timestamp}.json`;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (workspace) {
      workspace.resetToPublished();
    } else {
      setZones(JSON.parse(JSON.stringify(CANONICAL_GEOMETRY_V10.zones)));
      setLandmarks(JSON.parse(JSON.stringify(CANONICAL_LANDMARKS)));
    }
    setSelectedVertexIdx(null);
    setSelectedLandmarkId(null);
    setHistory([]);
  };

  const handleExit = () => {
    if (workspace) {
      workspace.closeMapCalibration();
    } else {
      sessionStorage.removeItem('mapCalibration');
      const url = new URL(window.location.href);
      url.searchParams.delete('mapCalibration');
      window.history.replaceState({}, '', url.toString());
      onClose?.();
    }
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
    mode,
    activeTab,
    selectedLandmarkCategory,
    referenceOpacity,
    showReference,
    showOtherZones,
    showMeters,
    isPanelCollapsed,
    showTechDetails,
    copySuccess,
    activeZone,
    validation,
    bounds,
    setSelectedZoneId,
    setSelectedVertexIdx,
    setSelectedLandmarkId,
    setMode,
    setActiveTab,
    setSelectedLandmarkCategory,
    setReferenceOpacity,
    setShowReference,
    setShowOtherZones,
    setShowMeters,
    setIsPanelCollapsed,
    setShowTechDetails,
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
    workspace,
  };
}

/**
 * Calibration SVG Layer: Rendered directly inside world <g> of OperationalScene
 *
 * Implements:
 * - Exclusive editing mode (VERTEX | LANDMARK | ANCHOR)
 * - Single selected zone visibility (other zones hidden or faint <= 15% stroke outline)
 * - Selected-zone assigned meters only (unrelated meters strictly hidden)
 * - Approved reference overlay default OFF (25% opacity when enabled)
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
    mode,
    referenceOpacity,
    showReference,
    showOtherZones,
    showMeters,
    activeZone,
    setSelectedZoneId,
    setSelectedLandmarkId,
    handleEdgeClick,
    handlePointerDownVertex,
    handlePointerDownLabelAnchor,
    handlePointerDownOperatorAnchor,
    handlePointerDownLandmark,
    handleCanvasClick,
  } = calibration;

  const handleScaleR = Math.max(4, 7 / zoom);

  // Selected-zone assigned meters only (Section 5)
  const assignedMeters = useMemo(() => {
    return CANONICAL_12_METERS_AUDIT.filter((m) => m.presentationRegionId === selectedZoneId);
  }, [selectedZoneId]);

  return (
    <g
      className="sgp-calibration-svg-overlay"
      style={{ userSelect: 'none' }}
      onPointerDown={(e) => {
        if (mode === 'LANDMARK' && e.target === e.currentTarget) {
          handleCanvasClick(e);
        }
      }}
    >
      {/* 1. Approved Zoning Reference Image Overlay (Section 3) */}
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

      {/* 2. Non-selected Presentation Zones Context (Section 2: <= 15% stroke opacity, no fills, no labels) */}
      {showOtherZones &&
        zones.map((zone) => {
          if (zone.id === selectedZoneId) return null;
          const pointsStr = zone.polygonCanonical.map((p) => `${p.x},${p.y}`).join(' ');
          return (
            <polygon
              key={zone.id}
              points={pointsStr}
              fill="none"
              stroke={zone.presentationColor}
              strokeWidth={1.2 / zoom}
              strokeOpacity={0.14}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSelectedZoneId(zone.id);
              }}
            >
              <title>{`${zone.displayLabel} (Nhấp để chọn)`}</title>
            </polygon>
          );
        })}

      {/* 3. Selected Active Zone Polygon */}
      {activeZone && (
        <g key={`active-${activeZone.id}`}>
          {/* Soft Halo */}
          <polygon
            points={activeZone.polygonCanonical.map((p) => `${p.x},${p.y}`).join(' ')}
            fill={activeZone.presentationColor}
            fillOpacity={mode === 'VERTEX' ? 0.16 : 0.08}
            stroke={activeZone.presentationColor}
            strokeWidth={4 / zoom}
            strokeOpacity={0.22}
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
            strokeOpacity={0.92}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* EXCLUSIVE MODE: VERTEX (Section 4) */}
          {mode === 'VERTEX' && (
            <>
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
                    <title>{`Nhấp để thêm đỉnh giữa #${i + 1} và #${
                      ((i + 1) % activeZone.polygonCanonical.length) + 1
                    }`}</title>
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
            </>
          )}

          {/* EXCLUSIVE MODE: ANCHOR (Section 4) */}
          {mode === 'ANCHOR' && (
            <>
              {/* Label Anchor Pin [T] */}
              <g
                transform={`translate(${activeZone.labelAnchorCanonical.x}, ${activeZone.labelAnchorCanonical.y})`}
                cursor="grab"
                onPointerDown={handlePointerDownLabelAnchor}
              >
                <circle r={10 / zoom} fill="#0284C7" stroke="#FFFFFF" strokeWidth={2 / zoom} />
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
                  x={13 / zoom}
                  y={4 / zoom}
                  fontSize={10 / zoom}
                  fill="#38BDF8"
                  fontWeight="700"
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.9))"
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
                <circle r={10 / zoom} fill="#D97706" stroke="#FFFFFF" strokeWidth={2 / zoom} />
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
                  x={13 / zoom}
                  y={4 / zoom}
                  fontSize={10 / zoom}
                  fill="#F59E0B"
                  fontWeight="700"
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.9))"
                  pointerEvents="none"
                >
                  NV
                </text>
              </g>
            </>
          )}
        </g>
      )}

      {/* EXCLUSIVE MODE: LANDMARK (Section 4: Only active zone landmarks) */}
      {mode === 'LANDMARK' &&
        landmarks
          .filter((lm) => lm.zoneId === selectedZoneId)
          .map((lm) => {
            const isSelected = selectedLandmarkId === lm.id;
            return (
              <g
                key={lm.id}
                transform={`translate(${lm.canonical.x}, ${lm.canonical.y})`}
                cursor="grab"
                onPointerDown={(e) => handlePointerDownLandmark(lm.id, e)}
                onClick={() => setSelectedLandmarkId(lm.id)}
              >
                <polygon
                  points={`0,${-9 / zoom} ${7 / zoom},0 0,${9 / zoom} ${-7 / zoom},0`}
                  fill={isSelected ? '#F59E0B' : '#10B981'}
                  stroke="#FFFFFF"
                  strokeWidth={1.6 / zoom}
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.7))"
                />
                <text
                  x={9 / zoom}
                  y={3.5 / zoom}
                  fontSize={9.5 / zoom}
                  fontWeight="700"
                  fill={isSelected ? '#FDE047' : '#A7F3D0'}
                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                  pointerEvents="none"
                >
                  {lm.label || lm.id}
                </text>
              </g>
            );
          })}

      {/* 5. Production Meters Overlay Preview: ONLY Assigned Meters of Selected Zone (Section 5) */}
      {showMeters &&
        assignedMeters.map((m) => {
          const isInside = isPointInPolygon2D(
            { x: m.canonicalX, y: m.canonicalY },
            activeZone.polygonCanonical
          );
          return (
            <g
              key={m.code}
              transform={`translate(${m.canonicalX}, ${m.canonicalY})`}
              pointerEvents="none"
            >
              <circle
                r={5.5 / zoom}
                fill={isInside ? '#10B981' : '#EF4444'}
                stroke="#FFFFFF"
                strokeWidth={1.5 / zoom}
                filter="drop-shadow(0 1px 3px rgba(0,0,0,0.7))"
              />
              <text
                x={8 / zoom}
                y={3.5 / zoom}
                fontSize={9 / zoom}
                fontWeight="700"
                fill="#FFFFFF"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
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
 * Simplified Calibration HUD: 280–320px Desktop Width with Collapsible State (Section 6 & 7)
 */
export const MapCalibrationHUD: React.FC<{
  calibration: CalibrationState;
}> = ({ calibration }) => {
  const {
    zones,
    selectedZoneId,
    selectedVertexIdx,
    selectedLandmarkId,
    mode,
    selectedLandmarkCategory,
    referenceOpacity,
    showReference,
    showOtherZones,
    showMeters,
    isPanelCollapsed,
    showTechDetails,
    copySuccess,
    activeZone,
    validation,
    bounds,
    setSelectedZoneId,
    setSelectedVertexIdx,
    setSelectedLandmarkId,
    setMode,
    setSelectedLandmarkCategory,
    setReferenceOpacity,
    setShowReference,
    setShowOtherZones,
    setShowMeters,
    setIsPanelCollapsed,
    setShowTechDetails,
    handleDeleteVertex,
    handleDeleteLandmark,
    handleUndo,
    handleCopyJson,
    handleDownloadJson,
    handleReset,
    handleExit,
    workspace,
  } = calibration;

  const boundaryContract = ZONE_BOUNDARY_CONTRACTS[selectedZoneId];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const handleApply = () => {
    if (!workspace) return;
    const res = workspace.applyGeometry();
    if (res.success) {
      setFeedback({ message: `✓ Đã áp dụng & tải ${res.filename}` });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ message: `⚠️ ${res.errors?.[0] || 'Lỗi kiểm tra hình học'}`, isError: true });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleSaveDraft = () => {
    if (!workspace) return;
    workspace.saveDraft();
    setFeedback({ message: '✓ Đã lưu bản nháp vào trình duyệt' });
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspace) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        const res = workspace.importGeometry(content);
        if (res.success) {
          setFeedback({ message: '✓ Đã nhập JSON thành công' });
          setTimeout(() => setFeedback(null), 2500);
        } else {
          setFeedback({ message: `⚠️ ${res.error || 'Lỗi đọc tệp JSON'}`, isError: true });
          setTimeout(() => setFeedback(null), 4000);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Collapsed State: Show small floating restore button (Section 7)
  if (isPanelCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsPanelCollapsed(false)}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          height: '38px',
          padding: '0 14px',
          borderRadius: '9999px',
          background: 'rgba(6, 29, 42, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          color: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        }}
        title="Mở bảng hiệu chuẩn (Phím Tab)"
      >
        <Compass size={16} className="text-amber-400" />
        <span>Hiệu chuẩn: {activeZone.displayLabel}</span>
        <span
          style={{
            fontSize: '10px',
            color: '#94A3B8',
            padding: '1px 5px',
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '4px',
          }}
        >
          Tab
        </span>
      </button>
    );
  }

  return (
    <>
      <aside
        className="sgp-map-hud-surface"
        role="region"
        aria-label="V10 Calibration Workspace"
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          width: '300px', // 280-320px per Section 6
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          borderRadius: '12px',
          padding: '14px',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 1000,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
          fontSize: '12px',
        }}
      >
        {/* 1. Header (Section 5 & 6) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <button
            type="button"
            onClick={handleExit}
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '6px',
              color: '#38BDF8',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              fontWeight: 600,
            }}
            title="Thoát và trở lại giao diện Bản đồ (Esc)"
          >
            <ArrowLeft size={13} />
            <span>← Trở lại bản đồ</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setIsPanelCollapsed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Thu gọn bảng (Tab)"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleExit}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Đóng hiệu chuẩn"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Sync Status Badge & Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={15} className="text-amber-400" />
            <span style={{ fontWeight: 700, fontSize: '11.5px', letterSpacing: '0.03em' }}>
              HIỆU CHUẨN 1915×821
            </span>
          </div>
          {workspace?.isGeometryDirty ? (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(234, 179, 8, 0.18)',
                color: '#FACC15',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                fontWeight: 600,
              }}
            >
              Bản nháp (Đã sửa)
            </span>
          ) : (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34D399',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontWeight: 500,
              }}
            >
              Đã đồng bộ
            </span>
          )}
        </div>

        {/* Human-Signoff Workflow Step Hints (Section 10) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: '#94A3B8',
          padding: '4px 6px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '6px',
        }}
      >
        <span style={{ color: mode === 'VERTEX' ? '#38BDF8' : '#64748B', fontWeight: mode === 'VERTEX' ? 700 : 400 }}>
          1. Đỉnh (V)
        </span>
        <span>›</span>
        <span style={{ color: mode === 'LANDMARK' ? '#38BDF8' : '#64748B', fontWeight: mode === 'LANDMARK' ? 700 : 400 }}>
          2. Địa danh (L)
        </span>
        <span>›</span>
        <span style={{ color: mode === 'ANCHOR' ? '#38BDF8' : '#64748B', fontWeight: mode === 'ANCHOR' ? 700 : 400 }}>
          3. Neo (A)
        </span>
      </div>

      {/* 2. Zone Selector Dropdown (Section 6) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <label htmlFor="calib-zone-select" style={{ fontSize: '10.5px', color: '#94A3B8', textTransform: 'uppercase' }}>
            Phân khu [1–6]
          </label>
        </div>
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
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#FFFFFF',
            padding: '6px 8px',
            borderRadius: '6px',
            fontSize: '11.5px',
            cursor: 'pointer',
          }}
        >
          {zones.map((z, idx) => (
            <option key={z.id} value={z.id}>
              {idx + 1}. {z.displayLabel}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Exclusive Mode Selector (Section 4 & 6) */}
      <div>
        <label style={{ fontSize: '10.5px', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
          Chế độ tác quyền
        </label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['VERTEX', 'LANDMARK', 'ANCHOR'] as CalibrationMode[]).map((m) => {
            const labels: Record<CalibrationMode, string> = {
              VERTEX: 'Đỉnh (V)',
              LANDMARK: 'Địa danh (L)',
              ANCHOR: 'Neo (A)',
            };
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '5px 4px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#0284C7' : 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${isActive ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                {labels[m]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contextual Action for Mode */}
      {mode === 'VERTEX' && (
        <div style={{ display: 'flex', gap: '6px' }}>
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
              padding: '5px 6px',
              borderRadius: '6px',
              fontSize: '10.5px',
              background: selectedVertexIdx !== null ? 'rgba(239, 68, 68, 0.25)' : 'rgba(15, 23, 42, 0.3)',
              border: `1px solid ${selectedVertexIdx !== null ? '#EF4444' : 'rgba(255, 255, 255, 0.08)'}`,
              color: selectedVertexIdx !== null ? '#FCA5A5' : '#64748B',
              cursor: selectedVertexIdx !== null ? 'pointer' : 'not-allowed',
            }}
          >
            <Trash2 size={11} /> Xóa đỉnh {selectedVertexIdx !== null ? `#${selectedVertexIdx + 1}` : ''}
          </button>
        </div>
      )}

      {mode === 'LANDMARK' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', color: '#94A3B8' }}>
            Click bản đồ để thêm mốc. Loại:
          </div>
          <select
            value={selectedLandmarkCategory}
            onChange={(e) => setSelectedLandmarkCategory(e.target.value as CalibrationLandmarkCategory)}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              padding: '4px 6px',
              borderRadius: '4px',
              fontSize: '10.5px',
            }}
          >
            <option value="quay-edge">Mép cầu tàu (quay-edge)</option>
            <option value="service-road">Đường công vụ (service-road)</option>
            <option value="internal-road">Đường nội bộ (internal-road)</option>
            <option value="perimeter-road">Đường bao quanh (perimeter-road)</option>
            <option value="fence">Hàng rào (fence)</option>
            <option value="warehouse-edge">Mép kho CFS (warehouse-edge)</option>
            <option value="yard-edge">Mép bãi cont (yard-edge)</option>
            <option value="gate">Cổng (gate)</option>
            <option value="security">An ninh (security)</option>
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
                padding: '4px 6px',
                borderRadius: '4px',
                fontSize: '10.5px',
                background: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={11} /> Xóa mốc đã chọn
            </button>
          )}
        </div>
      )}

      {/* 4. Quick Toggles: Reference, Meters, Other Zones (Section 3, 5, 2) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '6px 0',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Reference Toggle & Slider */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#CBD5E1' }}>Ảnh mẫu (R)</span>
          <button
            type="button"
            onClick={() => setShowReference((prev) => !prev)}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10.5px',
              fontWeight: 600,
              background: showReference ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${showReference ? '#38BDF8' : 'rgba(255, 255, 255, 0.12)'}`,
              color: showReference ? '#38BDF8' : '#94A3B8',
              cursor: 'pointer',
            }}
          >
            {showReference ? 'Bật' : 'Tắt'}
          </button>
        </div>

        {showReference && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px' }}>
            <span style={{ fontSize: '9.5px', color: '#94A3B8', minWidth: '40px' }}>
              {Math.round(referenceOpacity * 100)}%
            </span>
            <input
              type="range"
              min="0.10"
              max="0.50"
              step="0.05"
              value={referenceOpacity}
              aria-label="Độ mờ ảnh đối chiếu"
              onChange={(e) => setReferenceOpacity(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#38BDF8', cursor: 'pointer' }}
            />
          </div>
        )}

        {/* Meters & Other Zones Toggles */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setShowMeters((prev) => !prev)}
            style={{
              flex: 1,
              padding: '4px 6px',
              borderRadius: '4px',
              fontSize: '10.5px',
              fontWeight: 500,
              background: showMeters ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${showMeters ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
              color: showMeters ? '#34D399' : '#94A3B8',
              cursor: 'pointer',
            }}
            title="Bật/Tắt công tơ phân khu (M)"
          >
            Công tơ (M): {showMeters ? 'BẬT' : 'TẮT'}
          </button>
          <button
            type="button"
            onClick={() => setShowOtherZones((prev) => !prev)}
            style={{
              flex: 1,
              padding: '4px 6px',
              borderRadius: '4px',
              fontSize: '10.5px',
              fontWeight: 500,
              background: showOtherZones ? 'rgba(14, 116, 144, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${showOtherZones ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)'}`,
              color: showOtherZones ? '#38BDF8' : '#94A3B8',
              cursor: 'pointer',
            }}
            title="Hiện viền mờ các phân khu khác"
          >
            Vùng khác: {showOtherZones ? 'BẬT' : 'TẮT'}
          </button>
        </div>
      </div>

      {/* 5. Validation Summary (Section 6) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          borderRadius: '8px',
          padding: '8px 10px',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Hình học:</span>
          <span style={{ color: validation.isSimple ? '#10B981' : '#EF4444', fontWeight: 600 }}>
            {validation.isSimple ? '✓ Simple polygon' : '⚠️ Cắt cạnh'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Công tơ chỉ định:</span>
          <span
            className="font-tabular"
            style={{ color: validation.allMetersInside ? '#10B981' : '#EF4444', fontWeight: 600 }}
          >
            {validation.allMetersInside ? '✓' : '⚠️'}{' '}
            {validation.meterContainment.filter((m) => m.isInside).length}/{validation.meterContainment.length} bên trong
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Số đỉnh:</span>
          <span className="font-tabular" style={{ color: '#E2E8F0', fontWeight: 600 }}>
            {validation.vertexCount} đỉnh
          </span>
        </div>
      </div>

      {/* 6. Primary Actions (Section 6, 10, 11, 12, 13, 14) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {feedback && (
          <div
            style={{
              padding: '5px 8px',
              borderRadius: '5px',
              fontSize: '10.5px',
              background: feedback.isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${feedback.isError ? '#EF4444' : '#10B981'}`,
              color: feedback.isError ? '#F87171' : '#34D399',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {feedback.isError ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Apply Geometry Button (Section 13 & 14) */}
        {workspace && (
          <button
            type="button"
            onClick={handleApply}
            disabled={!workspace.validationGate.valid}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: workspace.validationGate.valid ? '#0284C7' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${workspace.validationGate.valid ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)'}`,
              color: workspace.validationGate.valid ? '#FFFFFF' : '#64748B',
              padding: '7px 10px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: workspace.validationGate.valid ? 'pointer' : 'not-allowed',
            }}
            title={
              workspace.validationGate.valid
                ? 'Áp dụng ranh giới vào phiên làm việc và xuất JSON'
                : `Không thể áp dụng: còn ${workspace.validationGate.errors.length} lỗi hình học`
            }
          >
            <CheckCircle2 size={13} />
            <span>
              {workspace.validationGate.valid
                ? 'Áp dụng geometry'
                : `Áp dụng (${workspace.validationGate.errors.length} lỗi)`}
            </span>
          </button>
        )}

        {/* Draft & Reset Row */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {workspace && (
            <button
              type="button"
              onClick={handleSaveDraft}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#CBD5E1',
                cursor: 'pointer',
              }}
              title="Lưu bản nháp vào trình duyệt (localStorage)"
            >
              <Save size={12} /> Lưu bản nháp
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#CBD5E1',
              cursor: 'pointer',
            }}
            title="Khôi phục trạng thái ban đầu"
          >
            <RotateCcw size={12} /> Khôi phục
          </button>
        </div>

        {/* Undo & Copy Row */}
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
              fontWeight: 500,
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#CBD5E1',
              cursor: 'pointer',
            }}
            title="Hoàn tác (Ctrl+Z)"
          >
            <Undo2 size={12} /> Hoàn tác
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: copySuccess ? '#059669' : 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: copySuccess ? '#FFFFFF' : '#CBD5E1',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title="Sao chép toàn bộ V10 JSON vào bộ nhớ tạm"
          >
            <Copy size={12} /> {copySuccess ? 'Đã sao chép' : 'Sao chép JSON'}
          </button>
        </div>

        {/* Import & Export Row (Section 12) */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {workspace && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#CBD5E1',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
                title="Nhập tệp geometry JSON vào bản nháp"
              >
                <Upload size={12} /> Nhập JSON
              </button>
            </>
          )}

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
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#CBD5E1',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title="Tải tệp JSON với dấu thời gian"
          >
            <Download size={12} /> Xuất JSON
          </button>
        </div>
      </div>

      {/* 7. Collapsible Advanced Section: "Chi tiết kỹ thuật" (Section 6) */}
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
        <button
          type="button"
          onClick={() => setShowTechDetails((prev) => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: '10.5px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '2px 0',
          }}
        >
          <span>Chi tiết kỹ thuật</span>
          {showTechDetails ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {showTechDetails && (
          <div
            style={{
              marginTop: '6px',
              padding: '8px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '6px',
              fontSize: '10px',
              lineHeight: '1.45',
              color: '#94A3B8',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {boundaryContract && (
              <div>
                <span style={{ color: '#38BDF8', fontWeight: 600 }}>Ranh giới: </span>
                {boundaryContract.zoneName}
              </div>
            )}
            <div>
              <span style={{ color: '#E2E8F0' }}>Diện tích: </span>
              {validation.area.toLocaleString()} px²
            </div>
            <div>
              <span style={{ color: '#E2E8F0' }}>Giới hạn: </span>
              X [{bounds.minX}, {bounds.maxX}] · Y [{bounds.minY}, {bounds.maxY}]
            </div>
            <div>
              <span style={{ color: '#E2E8F0' }}>Hệ tọa độ: </span>
              tan-thuan-canonical-image-pixel-space-v1
            </div>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '4px', marginTop: '2px' }}>
              <span style={{ color: '#FDE047' }}>Phím tắt: </span>
              1–6 (Vùng) · V (Đỉnh) · L (Mốc) · A (Neo) · M (Công tơ) · R (Mẫu) · Tab (Ẩn/Hiện) · Ctrl+Z · Del · Esc
            </div>
          </div>
        )}
      </div>
    </aside>

    {/* Unsaved Changes Confirmation Modal (Section 10) */}
    {workspace?.showUnsavedModal && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cảnh báo thay đổi chưa lưu"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <div
          style={{
            background: '#0B192C',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            color: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={20} className="text-amber-400" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
              Bạn có thay đổi chưa lưu.
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5, margin: '0 0 18px 0' }}>
            Ranh giới phân khu hoặc điểm mốc đã được điều chỉnh trong bản nháp. Bạn muốn xử lý thế nào trước khi thoát?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                workspace.saveDraft();
                workspace.closeMapCalibration(true);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#0284C7',
                border: 'none',
                color: '#FFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Lưu bản nháp
            </button>
            <button
              type="button"
              onClick={() => workspace.discardDraft()}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#F87171',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy thay đổi
            </button>
            <button
              type="button"
              onClick={() => workspace.setShowUnsavedModal(false)}
              style={{
                width: '100%',
                padding: '7px 12px',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#94A3B8',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Tiếp tục chỉnh
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

// Aliases for compatibility
export const MapCalibrationLayer = MapCalibrationSvgLayer;
export const MapCalibrationControlPanel = MapCalibrationHUD;
