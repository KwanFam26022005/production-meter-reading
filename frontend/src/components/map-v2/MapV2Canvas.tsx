import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
} from 'lucide-react';
import baseMapImage from './assets/map-verison3.png';
import {
  MapV2Manifest,
  MapV2LayerVisibility,
  MapV2SelectedEntity,
  MapV2Polygon,
  MapV2Polyline,
  MapV2Marker,
  MapV2ViewMode,
  MapV2InteractionMode,
  MapV2ToneMode,
  MapV2ZoneAnchor,
  MapV2CameraState,
} from './types';
import {
  ZONE_ANCHORS,
  getZoneAnchor,
  computeZoneBoundingRadius,
} from './zoneAnchors';
import { MapV2UtilityLayer, UtilityOverlayMode, UtilityStatusInfo } from './MapV2UtilityLayer';
import { getUtilityLayout, UtilityLayoutKey } from './utilityDemoLayout';
import { MapV2EmployeeLayer } from './MapV2EmployeeLayer';
import { MapV2Employee, MAP_V2_EMPLOYEE_DISCLOSURE_TEXT } from './employeeDataAdapter';
import { MapV2MeterLayer } from './MapV2MeterLayer';
import type { MapMeterOut, OperationalZoneOut } from '../../types';
import { computeZoneOperationalStatus, CANONICAL_MAP_V2_ZONE_MAPPING } from './zoneMapping';

interface MapV2CanvasProps {
  manifest: MapV2Manifest;
  visibility: MapV2LayerVisibility;
  selectedEntity: MapV2SelectedEntity;
  onSelectEntity: (entity: MapV2SelectedEntity) => void;
  viewMode: MapV2ViewMode;
  interactionMode?: MapV2InteractionMode;
  toneMode?: MapV2ToneMode;
  utilityMode?: UtilityOverlayMode;
  utilityLayoutKey?: UtilityLayoutKey;
  onUtilityStatusChange?: (status: UtilityStatusInfo) => void;
  onAnchorScreenPosChange?: (pos: { x: number; y: number } | null) => void;
  onCameraChange?: (state: { zoom: number; pan: { x: number; y: number }; cameraState: MapV2CameraState }) => void;
  employees?: MapV2Employee[];
  meters?: MapMeterOut[];
  liveOperationalZones?: OperationalZoneOut[];
  utilityFilter?: 'ALL' | 'ELECTRICITY' | 'WATER';
  exceptionsOnly?: boolean;
  demoEmployees?: MapV2Employee[];
  centerOnCoord?: [number, number] | null;
  selectedMeterCode?: string | null;
  tracedMeterCode?: string | null;
  onSelectMeterHost?: (nodeId: string, meterCode: string) => void;
  isMotionPaused?: boolean;
  onToggleMotionPause?: () => void;
  forcedReducedMotion?: boolean;
}

const CANVAS_WIDTH = 1536;
const CANVAS_HEIGHT = 1024;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6.0;

// Operational focus bounding box in canonical 1536x1024 map space:
// - Top: ZONE_QUAY upper edge at Y=211 (buffered at Y=200 to keep river context)
// - Bottom: GATE_B (Y=725, label to Y=758), ZONE_ADMIN (Y=721), ROAD_BACKLAND (Y=770)
const OPERATIONAL_Y_TOP = 200;
const OPERATIONAL_Y_BOTTOM = 770;
const OPERATIONAL_HEIGHT = OPERATIONAL_Y_BOTTOM - OPERATIONAL_Y_TOP; // 570

export const MapV2Canvas: React.FC<MapV2CanvasProps> = ({
  manifest,
  visibility,
  selectedEntity,
  onSelectEntity,
  viewMode,
  interactionMode = 'operational',
  toneMode = 'technical',
  utilityMode = 'off',
  utilityLayoutKey = 'B2',
  onUtilityStatusChange,
  onAnchorScreenPosChange,
  onCameraChange,
  employees,
  meters,
  liveOperationalZones,
  utilityFilter = 'ALL',
  exceptionsOnly = false,
  demoEmployees,
  centerOnCoord,
  selectedMeterCode = null,
  tracedMeterCode = null,
  onSelectMeterHost,
  isMotionPaused = false,
  onToggleMotionPause,
  forcedReducedMotion = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [cameraState, setCameraState] = useState<MapV2CameraState>('AUTO_FIT');
  const prevDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [focusedZoneId, setFocusedZoneId] = useState<string | null>(null);
  const glowIdPrefix = useId().replace(/:/g, '_');

  // Center camera smoothly on requested coordinates (Search, Focus, locateOnMap)
  useEffect(() => {
    if (!centerOnCoord || !containerRef.current) return;
    const [targetX, targetY] = centerOnCoord;
    const w = containerRef.current.clientWidth || CANVAS_WIDTH;
    const h = containerRef.current.clientHeight || CANVAS_HEIGHT;
    const targetZoom = Math.max(zoom, 1.8);
    const targetPanX = w / 2 - targetX * targetZoom;
    const targetPanY = h / 2 - targetY * targetZoom;
    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
    setCameraState('MANUAL_VIEW');
  }, [centerOnCoord]);

  const utilityLayoutConfig = React.useMemo(() => {
    return getUtilityLayout(utilityLayoutKey);
  }, [utilityLayoutKey]);

  // INITIAL_OPERATIONAL_FRAME: Responsive camera framing calculation
  // Computes deterministic zoom and pan based on actual canvas dimensions and viewMode
  const calculateFit = useCallback((mode: MapV2ViewMode, width: number, height: number) => {
    if (width <= 0 || height <= 0) return { zoom: 1, pan: { x: 0, y: 0 } };

    if (mode === 'width') {
      // Tràn chiều rộng: Map width fills 100% of container width
      const targetZoom = width / CANVAS_WIDTH;
      const scaledHeight = CANVAS_HEIGHT * targetZoom;
      const targetPanX = 0;

      let targetPanY = 0;
      if (scaledHeight <= height) {
        // If scaled map is shorter than canvas, center vertically
        targetPanY = (height - scaledHeight) / 2;
      } else {
        // Map extends beyond viewport vertically:
        // Position camera to frame the operational focus region (Quay -> Yards -> Admin -> Gates)
        // rather than wasting screen space on unused river water above the port.
        const scaledOpHeight = OPERATIONAL_HEIGHT * targetZoom;
        const spareHeight = height - scaledOpHeight;

        if (spareHeight > 0) {
          // Operational area fits within canvas height: allocate controlled river buffer above Quay
          // (~32% of spare height, clamped between 25px and 85px) and leave remaining room for Gate B / Admin at bottom
          const topRiverMargin = Math.max(25, Math.min(85, spareHeight * 0.32));
          targetPanY = topRiverMargin - OPERATIONAL_Y_TOP * targetZoom;
        } else {
          // Extremely short canvas: preserve operational top with minimal padding
          targetPanY = 20 - OPERATIONAL_Y_TOP * targetZoom;
        }

        // Clamp pan.y so canvas never scrolls past image bounds:
        // maximum pan.y is 0 (top of image at top of canvas)
        // minimum pan.y is height - scaledHeight (bottom of image at bottom of canvas)
        targetPanY = Math.max(height - scaledHeight, Math.min(0, targetPanY));
      }

      return {
        zoom: targetZoom,
        pan: { x: targetPanX, y: targetPanY },
      };
    } else {
      // Fit toàn bộ: Contain entire map inside viewport without cropping
      const scaleX = width / CANVAS_WIDTH;
      const scaleY = height / CANVAS_HEIGHT;
      const targetZoom = Math.min(scaleX, scaleY);
      const targetPanX = (width - CANVAS_WIDTH * targetZoom) / 2;
      const targetPanY = (height - CANVAS_HEIGHT * targetZoom) / 2;
      return {
        zoom: targetZoom,
        pan: { x: targetPanX, y: targetPanY },
      };
    }
  }, []);

  // Apply current fit mode to screen (resets cameraState to AUTO_FIT)
  const applyCurrentFit = useCallback(() => {
    if (!containerRef.current) return;
    setCameraState('AUTO_FIT');
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth > 0 && clientHeight > 0) {
      prevDimensionsRef.current = { width: clientWidth, height: clientHeight };
      const fit = calculateFit(viewMode, clientWidth, clientHeight);
      setZoom(fit.zoom);
      setPan(fit.pan);
    }
  }, [calculateFit, viewMode]);

  // When viewMode changes, immediately recalculate and apply
  useEffect(() => {
    applyCurrentFit();
  }, [applyCurrentFit]);

  // Notify parent on camera changes
  useEffect(() => {
    onCameraChange?.({ zoom, pan, cameraState });
  }, [zoom, pan, cameraState, onCameraChange]);

  // Recalculate fit on container resize (sidebar collapse/expand, window resize, inspector toggle)
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const handleResize = () => {
      const { clientWidth: newWidth, clientHeight: newHeight } = container;
      if (newWidth <= 0 || newHeight <= 0) return;

      const { width: prevWidth, height: prevHeight } = prevDimensionsRef.current;
      prevDimensionsRef.current = { width: newWidth, height: newHeight };

      if (prevWidth === 0 || prevHeight === 0) {
        // Initial layout
        const fit = calculateFit(viewMode, newWidth, newHeight);
        setZoom(fit.zoom);
        setPan(fit.pan);
        setCameraState('AUTO_FIT');
        return;
      }

      if (cameraState === 'AUTO_FIT') {
        const fit = calculateFit(viewMode, newWidth, newHeight);
        setZoom(fit.zoom);
        setPan(fit.pan);
      } else {
        // MANUAL_VIEW: Preserve focal point under previous viewport center
        setPan((currentPan) => {
          const centerMapX = (prevWidth / 2 - currentPan.x) / zoom;
          const centerMapY = (prevHeight / 2 - currentPan.y) / zoom;
          const nextPanX = newWidth / 2 - centerMapX * zoom;
          const nextPanY = newHeight / 2 - centerMapY * zoom;
          return { x: nextPanX, y: nextPanY };
        });
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    window.addEventListener('resize', handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateFit, viewMode, cameraState, zoom]);

  const handleZoomIn = () => {
    setCameraState('MANUAL_VIEW');
    setZoom((prev) => Math.min(prev * 1.25, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setCameraState('MANUAL_VIEW');
    setZoom((prev) => Math.max(prev / 1.25, MIN_ZOOM));
  };

  // Mouse wheel zoom around mouse pointer
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    setCameraState('MANUAL_VIEW');

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nextZoom = Math.min(Math.max(zoom * zoomFactor, MIN_ZOOM), MAX_ZOOM);

    // Keep point under cursor invariant
    const nextPanX = mouseX - ((mouseX - pan.x) / zoom) * nextZoom;
    const nextPanY = mouseY - ((mouseY - pan.y) / zoom) * nextZoom;

    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  };

  // Mouse drag pan
  // Phase 2.1: Use a mousedown ref instead of immediately setting isDragging state.
  // Setting isDragging=true on mousedown caused the SVG to immediately get pointer-events:none,
  // which dropped the subsequent 'click' event on utility nodes before it could fire.
  // We now only transition to DRAGGING state once the cursor actually moves past the threshold.
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const mouseIsDownRef = useRef<boolean>(false); // track mousedown without re-render

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouseIsDownRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    // Note: do NOT setIsDragging(true) here — only after movement threshold
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseIsDownRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      if (!isDragging) setIsDragging(true); // only now mark as dragging
      hasMovedRef.current = true;
      setCameraState('MANUAL_VIEW');
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    mouseIsDownRef.current = false;
    setIsDragging(false);
  };

  const handleCanvasClick = () => {
    if (hasMovedRef.current) return;
    // Clicking empty canvas in operational or technical mode deselects
    if (selectedEntity) {
      onSelectEntity(null);
    }
  };


  const handleEntityClick = (entity: MapV2SelectedEntity, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasMovedRef.current) return;
    onSelectEntity(entity);
  };

  const handleAnchorClick = (zoneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasMovedRef.current) return;
    if (
      selectedEntity &&
      ((selectedEntity.type === 'polygon' && selectedEntity.data.id === zoneId) ||
        (selectedEntity.type === 'zone_operational' &&
          (selectedEntity.data.zone.id === zoneId || selectedEntity.data.anchor?.zoneId === zoneId)))
    ) {
      // Toggle off when clicking already selected anchor in operational mode
      onSelectEntity(null);
      return;
    }
    const targetPoly = manifest.polygons.find((p) => p.id === zoneId);
    const bizZoneId = CANONICAL_MAP_V2_ZONE_MAPPING[zoneId] || zoneId;
    const opZone = (liveOperationalZones || []).find((z) => z.id === bizZoneId || z.id === zoneId || z.code === zoneId);
    const anchor = getZoneAnchor(zoneId);

    if (opZone && isOperational) {
      onSelectEntity({
        type: 'zone_operational',
        data: {
          zone: opZone,
          anchor,
          polygon: targetPoly,
        },
      });
    } else if (targetPoly) {
      onSelectEntity({ type: 'polygon', data: targetPoly });
    }
  };

  // Categorize polygons for layered architecture
  const operationalZones = manifest.polygons.filter(
    (p) => p.category === 'operational_zone'
  );
  const buildingsAndAdmin = manifest.polygons.filter(
    (p) => p.category === 'warehouse' || p.category === 'administration'
  );

  const isSelected = (entityId: string): boolean => {
    if (!selectedEntity) return false;
    if (selectedEntity.type === 'employee') {
      return selectedEntity.data.id === entityId || selectedEntity.data.zoneId === entityId;
    }
    if (selectedEntity.type === 'meter') {
      return selectedEntity.data.id === entityId;
    }
    if (selectedEntity.type === 'zone_operational') {
      return (
        selectedEntity.data.zone.id === entityId ||
        selectedEntity.data.anchor?.zoneId === entityId ||
        selectedEntity.data.polygon?.id === entityId
      );
    }
    return Boolean(selectedEntity.data.id === entityId);
  };

  const isOperational = interactionMode === 'operational';
  const isNeon = toneMode === 'neon';
  const showAnchors = visibility.anchors !== false;

  // Find currently active zone polygon (if any) for reveal
  const activeRevealedPolygon = selectedEntity
    ? (selectedEntity.type === 'polygon' 
        ? manifest.polygons.find((p) => p.id === selectedEntity.data.id) 
        : (selectedEntity.type === 'employee'
            ? manifest.polygons.find((p) => p.id === selectedEntity.data.zoneId)
            : (selectedEntity.type === 'zone_operational'
                ? selectedEntity.data.polygon || manifest.polygons.find((p) => p.id === selectedEntity.data.anchor?.zoneId)
                : null)))
    : null;

  const activeAnchor = activeRevealedPolygon ? getZoneAnchor(activeRevealedPolygon.id) : null;
  const activeRadius = activeRevealedPolygon && activeAnchor
    ? computeZoneBoundingRadius(activeRevealedPolygon.vertices, activeAnchor.point)
    : 800;

  // Notify parent of active anchor screen position for contextual card placement
  useEffect(() => {
    if (activeAnchor && onAnchorScreenPosChange) {
      const screenX = pan.x + activeAnchor.point[0] * zoom;
      const screenY = pan.y + activeAnchor.point[1] * zoom;
      onAnchorScreenPosChange({ x: screenX, y: screenY });
    } else if (onAnchorScreenPosChange) {
      onAnchorScreenPosChange(null);
    }
  }, [activeAnchor, pan, zoom, onAnchorScreenPosChange]);

  // Render SVG Category Icon Path inside 20x20 bounding box
  const renderCategoryIcon = (iconType: MapV2ZoneAnchor['iconType'], strokeColor: string) => {
    switch (iconType) {
      case 'quay':
        // Anchor icon
        return (
          <path
            d="M 0,-6 L 0,6 M -5,-1 L 0,-6 L 5,-1 M -6,3 C -6,7.5 6,7.5 6,3"
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'yard':
        // Grid icon
        return (
          <g fill="none" stroke={strokeColor} strokeWidth={1.6}>
            <rect x={-6} y={-6} width={5} height={5} rx={1} />
            <rect x={1} y={-6} width={5} height={5} rx={1} />
            <rect x={-6} y={1} width={5} height={5} rx={1} />
            <rect x={1} y={1} width={5} height={5} rx={1} />
          </g>
        );
      case 'container':
        // Box / Container icon
        return (
          <g fill="none" stroke={strokeColor} strokeWidth={1.6} strokeLinecap="round">
            <rect x={-7} y={-5} width={14} height={10} rx={1.5} />
            <line x1={-2} y1={-5} x2={-2} y2={5} />
            <line x1={2} y1={-5} x2={2} y2={5} />
          </g>
        );
      case 'warehouse':
        // Pitched roof warehouse icon
        return (
          <path
            d="M 0,-7 L -7,-1 L -7,6 L 7,6 L 7,-1 Z M -2,6 V 2 H 2 V 6"
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'admin':
        // Port Authority building icon
        return (
          <g fill="none" stroke={strokeColor} strokeWidth={1.6} strokeLinecap="round">
            <path d="M -7,-3 L 0,-7 L 7,-3 V -1 H -7 Z" />
            <line x1={-5} y1={-1} x2={-5} y2={5} />
            <line x1={0} y1={-1} x2={0} y2={5} />
            <line x1={5} y1={-1} x2={5} y2={5} />
            <line x1={-7} y1={5} x2={7} y2={5} strokeWidth={2} />
          </g>
        );
      default:
        return <circle r={4} fill={strokeColor} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`map-v2-canvas-wrapper ${isDragging ? 'is-dragging' : ''} ${isNeon ? 'tone-neon' : 'tone-technical'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      role="region"
      aria-label="Khung vẽ bản đồ kỹ thuật Cảng Tân Thuận 1"
    >
      <svg
        width="100%"
        height="100%"
        style={{ display: 'block', pointerEvents: isDragging ? 'none' : 'auto' }}
      >
        <defs>
          {/* Neon glow filters for Digital Twin tone mode */}
          <filter id={`${glowIdPrefix}-neon-cyan`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`${glowIdPrefix}-neon-magenta`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Dynamic Radial Reveal ClipPath and Polygon Boundary ClipPath */}
          {isOperational && activeRevealedPolygon && activeAnchor && (
            <>
              <clipPath id={`v2-poly-clip-${activeRevealedPolygon.id}`}>
                <polygon points={activeRevealedPolygon.vertices.map(([x, y]) => `${x},${y}`).join(' ')} />
              </clipPath>
              <clipPath id={`v2-reveal-clip-${activeRevealedPolygon.id}`}>
                <circle
                  key={`reveal-circle-${activeRevealedPolygon.id}`}
                  cx={activeAnchor.point[0]}
                  cy={activeAnchor.point[1]}
                  r={activeRadius}
                  className="map-v2-reveal-circle"
                  style={{
                    transformOrigin: `${activeAnchor.point[0]}px ${activeAnchor.point[1]}px`,
                  }}
                />
              </clipPath>
            </>
          )}
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* LAYER 1: Canonical Base Map Technical Image */}
          {visibility.baseMap && (
            <image
              href={baseMapImage}
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              preserveAspectRatio="none"
              className={isNeon ? 'map-v2-basemap-neon' : 'map-v2-basemap-standard'}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* In Neon mode: Dark backdrop overlay to deepen contrast */}
          {isNeon && visibility.baseMap && (
            <rect
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              fill="#030919"
              opacity={0.32}
              style={{ mixBlendMode: 'multiply', pointerEvents: 'none' }}
            />
          )}

          {/* ==================================================================== */}
          {/* OPERATIONAL MODE: ZONE REVEAL LAYER (Only active selected polygon)   */}
          {/* ==================================================================== */}
          {isOperational && activeRevealedPolygon && activeAnchor && (
            <g
              id="layer-operational-reveal"
              clipPath={`url(#v2-poly-clip-${activeRevealedPolygon.id})`}
            >
              {/* Radiating energy spread wavefront ripple strictly inside polygon boundary */}
              <circle
                key={`reveal-wave-${activeRevealedPolygon.id}`}
                cx={activeAnchor.point[0]}
                cy={activeAnchor.point[1]}
                r={activeRadius}
                className={`map-v2-reveal-wave ${isNeon ? 'wave-neon' : 'wave-standard'}`}
                style={{
                  transformOrigin: `${activeAnchor.point[0]}px ${activeAnchor.point[1]}px`,
                }}
              />

              {/* The Revealed Polygon with Radial Reveal Mask */}
              <g clipPath={`url(#v2-reveal-clip-${activeRevealedPolygon.id})`}>
                <polygon
                  id={`v2-poly-${activeRevealedPolygon.id}`}
                  points={activeRevealedPolygon.vertices.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill={
                    isNeon
                      ? 'rgba(0, 240, 255, 0.22)'
                      : activeRevealedPolygon.style.fill || '#003875'
                  }
                  fillOpacity={isNeon ? 0.45 : 0.42}
                  stroke={isNeon ? '#00f0ff' : '#0068FF'}
                  strokeWidth={isNeon ? 4.0 : 3.5}
                  filter={isNeon ? `url(#${glowIdPrefix}-neon-cyan)` : undefined}
                  className="map-v2-poly-operational map-v2-poly-selected map-v2-poly-revealed"
                  onClick={(e) =>
                    handleEntityClick({ type: 'polygon', data: activeRevealedPolygon }, e)
                  }
                >
                  <title>{`${activeRevealedPolygon.label} (${activeRevealedPolygon.id})`}</title>
                </polygon>
              </g>
            </g>
          )}


          {/* ==================================================================== */}
          {/* TECHNICAL MODE: FULL GEOMETRY POLYGONS (All 7 zones visible)         */}
          {/* ==================================================================== */}
          {!isOperational && visibility.zones && (
            <g id="layer-operational-zones">
              {operationalZones.map((zone: MapV2Polygon) => {
                const selected = isSelected(zone.id);
                const pts = zone.vertices.map(([x, y]) => `${x},${y}`).join(' ');
                const strokeColor = isNeon
                  ? selected ? '#ff2a85' : '#00f0ff'
                  : selected ? '#0068FF' : zone.style.stroke;

                return (
                  <polygon
                    key={zone.id}
                    id={`v2-poly-${zone.id}`}
                    points={pts}
                    fill={isNeon ? 'rgba(0, 240, 255, 0.12)' : zone.style.fill}
                    fillOpacity={selected ? (isNeon ? 0.4 : 0.45) : (isNeon ? 0.18 : zone.style.fill_opacity)}
                    stroke={strokeColor}
                    strokeWidth={selected ? 4.0 : (isNeon ? 2.5 : zone.style.stroke_width)}
                    filter={isNeon && selected ? `url(#${glowIdPrefix}-neon-magenta)` : (isNeon ? `url(#${glowIdPrefix}-neon-cyan)` : undefined)}
                    className={`map-v2-poly-operational ${selected ? 'map-v2-poly-selected' : ''}`}
                    onClick={(e) => handleEntityClick({ type: 'polygon', data: zone }, e)}
                  >
                    <title>{`${zone.label} (${zone.id})`}</title>
                  </polygon>
                );
              })}
            </g>
          )}

          {!isOperational && visibility.buildings && (
            <g id="layer-buildings-admin">
              {buildingsAndAdmin.map((bldg: MapV2Polygon) => {
                const selected = isSelected(bldg.id);
                const pts = bldg.vertices.map(([x, y]) => `${x},${y}`).join(' ');
                const strokeColor = isNeon
                  ? selected ? '#ff2a85' : '#00e5ff'
                  : selected ? '#0068FF' : bldg.style.stroke;

                return (
                  <polygon
                    key={bldg.id}
                    id={`v2-poly-${bldg.id}`}
                    points={pts}
                    fill={isNeon ? 'rgba(255, 42, 133, 0.15)' : bldg.style.fill}
                    fillOpacity={selected ? (isNeon ? 0.5 : 0.55) : (isNeon ? 0.22 : bldg.style.fill_opacity)}
                    stroke={strokeColor}
                    strokeWidth={selected ? 4.0 : (isNeon ? 2.5 : bldg.style.stroke_width)}
                    filter={isNeon && selected ? `url(#${glowIdPrefix}-neon-magenta)` : undefined}
                    className={`map-v2-poly-operational ${selected ? 'map-v2-poly-selected' : ''}`}
                    onClick={(e) => handleEntityClick({ type: 'polygon', data: bldg }, e)}
                  >
                    <title>{`${bldg.label} (${bldg.id})`}</title>
                  </polygon>
                );
              })}
            </g>
          )}

          {/* ==================================================================== */}
          {/* LAYER 4: Boundary & Road Polylines (Subtle in Ops, Full in Tech)      */}
          {/* ==================================================================== */}
          {visibility.roadsAndBoundaries && (
            <g id="layer-boundary-roads" className={isOperational ? 'roads-operational-mode' : 'roads-technical-mode'}>
              {manifest.polylines.map((pl: MapV2Polyline) => {
                const selected = isSelected(pl.id);
                const pts = pl.vertices.map(([x, y]) => `${x},${y}`).join(' ');
                const strokeDasharray = pl.style.dash ? pl.style.dash.join(' ') : undefined;

                // Color calculation based on mode and selection
                let strokeColor = pl.style.stroke;
                let strokeWidth = pl.style.stroke_width;

                if (isNeon) {
                  if (selected) {
                    strokeColor = '#ff2a85';
                    strokeWidth = 4.0;
                  } else if (pl.id === 'PORT_BOUNDARY') {
                    strokeColor = '#00f0ff';
                    strokeWidth = isOperational ? 2.5 : 3.5;
                  } else {
                    strokeColor = '#00a8ff';
                    strokeWidth = isOperational ? 1.5 : 2.5;
                  }
                } else {
                  if (selected) {
                    strokeColor = '#0068FF';
                    strokeWidth = 3.5;
                  } else if (isOperational) {
                    strokeColor = pl.id === 'PORT_BOUNDARY' ? '#415C94' : '#8E8B8B';
                    strokeWidth = pl.id === 'PORT_BOUNDARY' ? 2.0 : 1.5;
                  }
                }

                const lineFilter = isNeon && selected
                  ? `url(#${glowIdPrefix}-neon-magenta)`
                  : isNeon && pl.id === 'PORT_BOUNDARY'
                  ? `url(#${glowIdPrefix}-neon-cyan)`
                  : undefined;

                if (pl.closed) {
                  return (
                    <polygon
                      key={pl.id}
                      id={`v2-line-${pl.id}`}
                      points={pts}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      filter={lineFilter}
                      className={`map-v2-polyline ${selected ? 'map-v2-polyline-selected' : ''}`}
                      onClick={(e) => handleEntityClick({ type: 'polyline', data: pl }, e)}
                    >
                      <title>{`${pl.label} (${pl.id})`}</title>
                    </polygon>
                  );
                }

                return (
                  <polyline
                    key={pl.id}
                    id={`v2-line-${pl.id}`}
                    points={pts}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={lineFilter}
                    className={`map-v2-polyline ${selected ? 'map-v2-polyline-selected' : ''}`}
                    onClick={(e) => handleEntityClick({ type: 'polyline', data: pl }, e)}
                  >
                    <title>{`${pl.label} (${pl.id})`}</title>
                  </polyline>
                );
              })}
            </g>
          )}

          {/* ==================================================================== */}
          {/* LAYER 4.5: Utility Network Demo Layer (Electricity / Water / Both)   */}
          {/* ==================================================================== */}
          <MapV2UtilityLayer
            layout={utilityLayoutConfig}
            utilityMode={utilityMode}
            toneMode={toneMode}
            zoom={zoom}
            selectedMeterCode={selectedMeterCode}
            externalTracedMeterCode={tracedMeterCode}
            onSelectMeterHost={onSelectMeterHost}
            onStatusChange={onUtilityStatusChange}
          />

          {/* ==================================================================== */}
          {/* LAYER 5: Gate Markers (Gate A & Gate B)                              */}
          {/* ==================================================================== */}
          {visibility.gates && (
            <g id="layer-gate-markers">
              {manifest.markers.map((m: MapV2Marker) => {
                const selected = isSelected(m.id);
                const [x, y] = m.point;

                return (
                  <g
                    key={m.id}
                    id={`v2-marker-${m.id}`}
                    transform={`translate(${x}, ${y})`}
                    className={`map-v2-marker ${isNeon ? 'marker-neon' : 'marker-standard'}`}
                    onClick={(e) => handleEntityClick({ type: 'marker', data: m }, e)}
                  >
                    <g className="map-v2-marker-inner" style={{ transformOrigin: '0px 0px' }}>
                      {/* Outer indicator circle */}
                      <circle
                        r={selected ? 22 : 18}
                        fill={
                          isNeon
                            ? selected ? 'rgba(255, 42, 133, 0.3)' : 'rgba(0, 240, 255, 0.15)'
                            : selected ? 'rgba(0, 104, 255, 0.25)' : 'rgba(0, 56, 117, 0.15)'
                        }
                        stroke={
                          isNeon
                            ? selected ? '#ff2a85' : '#00f0ff'
                            : selected ? '#0068FF' : '#003875'
                        }
                        strokeWidth={2}
                        filter={isNeon ? `url(#${glowIdPrefix}-neon-cyan)` : undefined}
                      />

                      {/* Inner core badge */}
                      <circle
                        r={11}
                        fill={
                          isNeon
                            ? selected ? '#ff2a85' : '#081734'
                            : selected ? '#0068FF' : '#003875'
                        }
                        stroke={isNeon ? (selected ? '#FFFFFF' : '#00f0ff') : '#FFFFFF'}
                        strokeWidth={2}
                      />

                      {/* Letter badge: A or B */}
                      <text
                        className="map-v2-gate-badge"
                        y={1}
                        fill={isNeon && !selected ? '#00f0ff' : '#FFFFFF'}
                      >
                        {m.id === 'GATE_A' ? 'A' : 'B'}
                      </text>

                      {/* Label badge underneath */}
                      <g transform="translate(0, 24)">
                        <rect
                          x={-32}
                          y={-9}
                          width={64}
                          height={18}
                          rx={4}
                          fill={isNeon ? '#050f24' : '#003875'}
                          stroke={isNeon ? '#00f0ff' : '#002247'}
                          strokeWidth={1}
                        />
                        <text
                          fill={isNeon ? '#00f0ff' : '#FFFFFF'}
                          fontSize={10}
                          fontWeight={600}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {m.label}
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================================================================== */}
          {/* LAYER 6: Zone Anchors / Hotspots (Central Interactive Hotspots)       */}
          {/* ==================================================================== */}
          {showAnchors && (
            <g id="layer-zone-anchors">
              {ZONE_ANCHORS.map((anchor) => {
                const [ax, ay] = anchor.point;
                const isZoneSelected = isSelected(anchor.zoneId);

                // Badge colors
                let badgeFill = '#FFFFFF';
                let badgeStroke = '#003875';
                let iconStroke = '#003875';
                let pillFill = 'rgba(0, 56, 117, 0.9)';
                let pillText = '#FFFFFF';

                if (isNeon) {
                  if (isZoneSelected) {
                    badgeFill = 'rgba(255, 42, 133, 0.25)';
                    badgeStroke = '#ff2a85';
                    iconStroke = '#ff2a85';
                    pillFill = 'rgba(10, 20, 44, 0.95)';
                    pillText = '#ff2a85';
                  } else {
                    badgeFill = 'rgba(6, 18, 42, 0.9)';
                    badgeStroke = '#00f0ff';
                    iconStroke = '#00f0ff';
                    pillFill = 'rgba(6, 18, 42, 0.9)';
                    pillText = '#00f0ff';
                  }
                } else {
                  if (isZoneSelected) {
                    badgeFill = '#003875';
                    badgeStroke = '#0068FF';
                    iconStroke = '#FFFFFF';
                    pillFill = '#0068FF';
                    pillText = '#FFFFFF';
                  }
                }

                const isCompactScale = zoom < 0.72;
                const isHovered = hoveredZoneId === anchor.zoneId;
                const isFocused = focusedZoneId === anchor.zoneId;
                const showFullLabel = !isCompactScale || isZoneSelected || isHovered || isFocused;

                const bizZoneId = CANONICAL_MAP_V2_ZONE_MAPPING[anchor.zoneId] || anchor.zoneId;
                const opZone = (liveOperationalZones || []).find(
                  (z) => z.id === bizZoneId || z.id === anchor.zoneId || z.code === anchor.zoneId
                );
                const zoneMetrics = computeZoneOperationalStatus(opZone);

                const displayText = showFullLabel ? anchor.label : anchor.code;
                const pillWidth = showFullLabel
                  ? Math.max(anchor.label.length * 7.5 + 16, 54)
                  : Math.max(anchor.code.length * 8 + 14, 34);

                return (
                  <g
                    key={anchor.zoneId}
                    id={`v2-anchor-${anchor.zoneId}`}
                    transform={`translate(${ax}, ${ay})`}
                    className={`map-v2-anchor-group ${isZoneSelected ? 'active' : ''} ${isNeon ? 'tone-neon' : ''} ${!showFullLabel ? 'compact-label' : ''}`}
                    onClick={(e) => handleAnchorClick(anchor.zoneId, e)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Phân khu ${anchor.label} (${anchor.code}) - ${zoneMetrics.statusLabel}`}
                    aria-pressed={isZoneSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAnchorClick(anchor.zoneId, e as any);
                      }
                    }}
                    onFocus={() => setFocusedZoneId(anchor.zoneId)}
                    onBlur={() => setFocusedZoneId(null)}
                    onMouseEnter={() => setHoveredZoneId(anchor.zoneId)}
                    onMouseLeave={() => setHoveredZoneId(null)}
                  >
                    {/* Generous hit area (min 52x52px touch area) */}
                    <circle r={28} fill="transparent" style={{ cursor: 'pointer' }} />

                    <g className="map-v2-anchor-inner" style={{ transformOrigin: '0px 0px' }}>
                      {/* Anchor beacon pulse only rendered when zone is selected to avoid floating clutter */}
                      {isZoneSelected && (
                        <circle
                          cx={0}
                          cy={0}
                          r={20}
                          fill="none"
                          stroke={isNeon ? '#ff2a85' : '#0068FF'}
                          strokeWidth={1.8}
                          className="map-v2-anchor-radar active"
                        />
                      )}

                      {/* Core icon badge */}
                      <circle
                        r={14}
                        fill={badgeFill}
                        stroke={badgeStroke}
                        strokeWidth={2}
                        filter={isNeon ? (isZoneSelected ? `url(#${glowIdPrefix}-neon-magenta)` : `url(#${glowIdPrefix}-neon-cyan)`) : undefined}
                        className="map-v2-anchor-badge"
                      />

                      {/* Category Vector Icon */}
                      <g style={{ pointerEvents: 'none' }}>
                        {renderCategoryIcon(anchor.iconType, iconStroke)}
                      </g>

                      {/* Attention Signals: Exception indicators (Section 12) */}
                      {zoneMetrics.status === 'OVERDUE' && (
                        <g transform="translate(13, -13)" style={{ pointerEvents: 'none' }}>
                          <circle r={8} fill="#B43A3A" stroke="#FFFFFF" strokeWidth={1.5} />
                          <text fill="#FFFFFF" fontSize={8} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                            !
                          </text>
                        </g>
                      )}
                      {zoneMetrics.status === 'REVIEW' && (
                        <g transform="translate(13, -13)" style={{ pointerEvents: 'none' }}>
                          <circle r={8} fill="#FCC959" stroke="#181818" strokeWidth={1.5} />
                          <text fill="#181818" fontSize={8} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                            ?
                          </text>
                        </g>
                      )}

                      {/* Text Label Pill */}
                      <g transform="translate(0, 22)" style={{ pointerEvents: 'none' }}>
                        <rect
                          x={-pillWidth / 2}
                          y={-9}
                          width={pillWidth}
                          height={18}
                          rx={4}
                          fill={pillFill}
                          stroke={badgeStroke}
                          strokeWidth={1}
                          filter={isNeon && isZoneSelected ? `url(#${glowIdPrefix}-neon-magenta)` : undefined}
                        />
                        <text
                          fill={pillText}
                          fontSize={10.5}
                          fontWeight={600}
                          textAnchor="middle"
                          dominantBaseline="central"
                          letterSpacing="0.02em"
                        >
                          {displayText}
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}

            </g>
          )}

          {/* ==================================================================== */}
          {/* LAYER 6.5: Live Operational Meter Pins (Section 21, 22)               */}
          {/* ==================================================================== */}
          <MapV2MeterLayer
            meters={meters || []}
            selectedMeterId={selectedEntity?.type === 'meter' ? selectedEntity.data.id : null}
            onSelectMeter={(m, evt) => handleEntityClick({ type: 'meter', data: m }, evt as any)}
            isLayerVisible={visibility.meters !== false}
            utilityFilter={utilityFilter}
            exceptionsOnly={exceptionsOnly || !!visibility.exceptionsOnly}
            toneMode={toneMode}
            zoom={zoom}
          />

          {/* ==================================================================== */}
          {/* LAYER 7: Real Assigned-Zone Employee Markers (Stationary Anchors)    */}
          {/* ==================================================================== */}
          <MapV2EmployeeLayer
            manifest={manifest}
            employees={employees}
            selectedEmployeeId={selectedEntity?.type === 'employee' ? selectedEntity.data.id : null}
            onSelectEmployee={(emp, evt) => handleEntityClick({ type: 'employee', data: emp }, evt as any)}
            isManuallyPaused={isMotionPaused}
            isLayerVisible={visibility.employees !== false}
            isTechnicalMode={utilityMode !== 'off'}
            toneMode={toneMode}
            zoom={zoom}
            forcedReducedMotion={forcedReducedMotion}
          />

          {/* ==================================================================== */}
          {/* LAYER 7.5: Demo Simulated Employee Markers (Optional Simulation)     */}
          {/* ==================================================================== */}
          {visibility.demoEmployees && (
            <MapV2EmployeeLayer
              manifest={manifest}
              employees={demoEmployees}
              selectedEmployeeId={selectedEntity?.type === 'employee' ? selectedEntity.data.id : null}
              onSelectEmployee={(emp, evt) => handleEntityClick({ type: 'employee', data: emp }, evt as any)}
              isManuallyPaused={isMotionPaused}
              isLayerVisible={true}
              isTechnicalMode={utilityMode !== 'off'}
              toneMode={toneMode}
              zoom={zoom}
              forcedReducedMotion={forcedReducedMotion}
            />
          )}
        </g>
      </svg>

      {/* FLOATING HUD CONTROLS */}
      <div className={`map-v2-floating-hud ${isNeon ? 'tone-neon' : ''}`} role="toolbar" aria-label="Điều khiển bản đồ">
        <button
          type="button"
          className="map-v2-hud-btn"
          onClick={handleZoomIn}
          title="Phóng to (+)"
          aria-label="Phóng to"
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          className="map-v2-hud-btn"
          onClick={handleZoomOut}
          title="Thu nhỏ (-)"
          aria-label="Thu nhỏ"
        >
          <ZoomOut size={18} />
        </button>
        <button
          type="button"
          className="map-v2-hud-btn"
          onClick={applyCurrentFit}
          title={`Đặt lại góc nhìn (${viewMode === 'width' ? 'Tràn chiều rộng' : 'Fit toàn bộ'})`}
          aria-label="Đặt lại góc nhìn"
        >
          <RotateCcw size={16} />
        </button>

        {onToggleMotionPause && visibility.demoEmployees && (
          <button
            type="button"
            className={`map-v2-hud-btn map-v2-motion-toggle ${isMotionPaused ? 'active' : ''}`}
            onClick={onToggleMotionPause}
            title={isMotionPaused ? "Tiếp tục hoạt họa nhân sự (Play)" : "Tạm dừng hoạt họa nhân sự (Pause)"}
            aria-label={isMotionPaused ? "Tiếp tục hoạt họa nhân sự" : "Tạm dừng hoạt họa nhân sự"}
          >
            {isMotionPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        )}

        <div
          style={{
            height: 1,
            backgroundColor: isNeon ? '#1c3252' : '#334155',
            margin: '2px 0',
          }}
        />
        <div
          title={`Độ phóng đại hiện tại: ${Math.round(zoom * 100)}%`}
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: isNeon ? '#00f0ff' : '#94a3b8',
            textAlign: 'center',
            padding: '2px 0',
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Illustrative Marker / Real Staff Disclosure Banner (Section 17, 18) */}
      {visibility.demoEmployees ? (
        <div className={`map-v2-employee-disclosure-banner ${isNeon ? 'tone-neon' : ''}`}>
          <span>📍 {MAP_V2_EMPLOYEE_DISCLOSURE_TEXT}</span>
        </div>
      ) : (
        visibility.employees !== false && (
          <div className={`map-v2-employee-disclosure-banner ${isNeon ? 'tone-neon' : ''}`}>
            <span>📍 Người phụ trách phân khu — Vị trí cố định tại điểm neo, không phải vị trí GPS.</span>
          </div>
        )
      )}
    </div>
  );
};
