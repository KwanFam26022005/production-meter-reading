import React, { useRef, useState } from 'react';
import {
  MapMeterItem,
  MapOperationalZone,
  MapViewportState,
  OperationalLayerType,
} from '../types';
import { PORT_MAP_DIMENSIONS } from '../config/portMapConfig';
import { ZoneLayer } from './ZoneLayer';
import { MeterLayer } from './MeterLayer';

interface PortMapProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedZoneId: string | null;
  selectedMeterId: string | null;
  hoveredZoneId: string | null;
  hoveredMeterId: string | null;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  viewport: MapViewportState;
  onSelectZone: (zoneId: string) => void;
  onSelectMeter: (meterId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onHoverMeter: (meterId: string | null) => void;
  onClearSelection: () => void;
  onViewportChange: (nextViewport: MapViewportState) => void;
}

export const PortMap: React.FC<PortMapProps> = ({
  zones,
  meters,
  selectedZoneId,
  selectedMeterId,
  hoveredZoneId,
  hoveredMeterId,
  activeLayer,
  exceptionsOnly,
  viewport,
  onSelectZone,
  onSelectMeter,
  onHoverZone,
  onHoverMeter,
  onClearSelection,
  onViewportChange,
}) => {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pan / Drag Handling
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only drag with main button on the map canvas background
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    onViewportChange({
      ...viewport,
      panX: e.clientX - dragStart.x,
      panY: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const nextZoom = Math.min(Math.max(viewport.zoom + delta, 0.75), 2.5);
    onViewportChange({
      ...viewport,
      zoom: Number(nextZoom.toFixed(2)),
    });
  };

  return (
    <div className="sgp-map-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg
        ref={containerRef}
        viewBox={`0 0 ${PORT_MAP_DIMENSIONS.viewBoxWidth} ${PORT_MAP_DIMENSIONS.viewBoxHeight}`}
        className="sgp-map-svg"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isDragging ? 'grabbing' : 'default',
          backgroundColor: '#F5F7F9',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={(e) => {
          if (e.target === containerRef.current || (e.target as Element).id === 'map-backdrop') {
            onClearSelection();
          }
        }}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="sgpRiverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#245270" />
            <stop offset="40%" stop-color="#1B425A" />
            <stop offset="100%" stop-color="#123348" />
          </linearGradient>

          <linearGradient id="sgpQuayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#5A6D7A" />
            <stop offset="100%" stop-color="#34434D" />
          </linearGradient>

          <pattern id="sgpYardPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="18" height="18" fill="#E2EBF0" stroke="#CBD8DF" strokeWidth="0.75" />
          </pattern>
        </defs>

        {/* Scaled & Panned Group */}
        <g
          id="map-viewport-group"
          transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}
          style={{ transition: isDragging ? 'none' : 'transform 0.15s ease-out' }}
        >
          {/* 1. MAP BACKGROUND CANVAS */}
          <rect
            id="map-backdrop"
            x="0"
            y="0"
            width={PORT_MAP_DIMENSIONS.viewBoxWidth}
            height={PORT_MAP_DIMENSIONS.viewBoxHeight}
            fill="#EDF2F6"
          />

          {/* 2. SCHEMATIC GROUND FEATURES & ROADS */}
          {/* Main Terminal Asphalt Pad */}
          <rect x="50" y="50" width="790" height="560" rx="6" fill="#F4F8FA" stroke="#D7E1E7" strokeWidth="2" />

          {/* Internal Port Roadways */}
          {/* Primary Avenue East-West */}
          <rect x="50" y="295" width="785" height="28" fill="#E4ECF1" />
          <line x1="55" y1="309" x2="830" y2="309" stroke="#C3D3DE" strokeWidth="1.5" strokeDasharray="10 8" />

          {/* Secondary Avenue North-South */}
          <rect x="330" y="50" width="24" height="560" fill="#E4ECF1" />
          <line x1="342" y1="55" x2="342" y2="605" stroke="#C3D3DE" strokeWidth="1.5" strokeDasharray="10 8" />

          {/* 3. WAREHOUSES FOOTPRINT (Kho B, C, D) */}
          <g id="warehouse-structures">
            {/* Kho B */}
            <rect x="110" y="90" width="200" height="85" rx="3" fill="#DFE7EC" stroke="#BCCCD6" strokeWidth="1" />
            <text x="210" y="137" textAnchor="middle" fontSize="10" fontWeight="600" fill="#586E7E">KHO HÀNG B</text>

            {/* Kho C */}
            <rect x="110" y="200" width="200" height="85" rx="3" fill="#DFE7EC" stroke="#BCCCD6" strokeWidth="1" />
            <text x="210" y="247" textAnchor="middle" fontSize="10" fontWeight="600" fill="#586E7E">KHO HÀNG C</text>

            {/* Kho D */}
            <rect x="110" y="340" width="200" height="85" rx="3" fill="#DFE7EC" stroke="#BCCCD6" strokeWidth="1" />
            <text x="210" y="387" textAnchor="middle" fontSize="10" fontWeight="600" fill="#586E7E">KHO HÀNG D</text>
          </g>

          {/* 4. CONTAINER YARD BLOCKS */}
          <g id="container-yard-blocks">
            <rect x="365" y="220" width="230" height="260" rx="4" fill="url(#sgpYardPattern)" stroke="#B8C8D2" strokeWidth="1" />
            <text x="480" y="250" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4B6271" letterSpacing="1">
              BÃI CONTAINER (CY)
            </text>
          </g>

          {/* 5. TECHNICAL & SUBSTATIONS FOOTPRINT */}
          <g id="technical-structures">
            {/* Trạm điện A */}
            <rect x="100" y="460" width="140" height="120" rx="3" fill="#E2E9EE" stroke="#A8BCC8" strokeWidth="1" />
            <text x="170" y="525" textAnchor="middle" fontSize="10" fontWeight="600" fill="#4B6373">TRẠM ĐIỆN A</text>

            {/* Trạm điện B & Phụ trợ */}
            <rect x="270" y="500" width="180" height="80" rx="3" fill="#E2E9EE" stroke="#A8BCC8" strokeWidth="1" />
            <text x="360" y="545" textAnchor="middle" fontSize="10" fontWeight="600" fill="#4B6373">TRẠM ĐIỆN B</text>

            {/* Xưởng kỹ thuật */}
            <rect x="365" y="90" width="220" height="75" rx="3" fill="#E2E9EE" stroke="#A8BCC8" strokeWidth="1" />
            <text x="475" y="132" textAnchor="middle" fontSize="10" fontWeight="600" fill="#4B6373">XƯỞNG KỸ THUẬT & BẢO TRÌ</text>
          </g>

          {/* 6. QUAYSIDE WHARF & SAIGON RIVER */}
          {/* Quayside Pier Concrete Edge */}
          <rect x="825" y="50" width="20" height="560" fill="url(#sgpQuayGrad)" />
          {/* Mooring Bollards */}
          {[100, 180, 260, 340, 420, 500, 580].map((by) => (
            <circle key={by} cx="835" cy={by} r="3.5" fill="#CBD5DE" stroke="#22303A" strokeWidth="1" />
          ))}

          {/* Saigon River Waterway */}
          <rect x="845" y="0" width="155" height={PORT_MAP_DIMENSIONS.viewBoxHeight} fill="url(#sgpRiverGrad)" />
          {/* River Water Surface Ripples */}
          <path d="M 855,120 Q 890,115 925,120 T 995,115" stroke="#467699" strokeWidth="1.5" fill="none" opacity="0.4" />
          <path d="M 855,260 Q 890,255 925,260 T 995,255" stroke="#467699" strokeWidth="1.5" fill="none" opacity="0.4" />
          <path d="M 855,420 Q 890,415 925,420 T 995,415" stroke="#467699" strokeWidth="1.5" fill="none" opacity="0.4" />
          <path d="M 855,540 Q 890,535 925,540 T 995,535" stroke="#467699" strokeWidth="1.5" fill="none" opacity="0.4" />

          {/* River Label */}
          <text
            x="930"
            y="330"
            textAnchor="middle"
            transform="rotate(90, 930, 330)"
            fontSize="12"
            fontWeight="700"
            fill="#80A8C2"
            letterSpacing="3"
          >
            SÔNG SÀI GÒN
          </text>

          {/* Cargo Vessel Moored at Berth 1-2 */}
          <g transform="translate(860, 160)">
            <path d="M 0,0 L 50,20 L 50,140 L 0,160 Z" fill="#1C2E38" opacity="0.85" />
            <rect x="8" y="45" width="34" height="60" rx="2" fill="#E2EDF3" opacity="0.9" />
            <text x="25" y="80" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0C2534">TÀU CẬP</text>
          </g>

          {/* Main Port Gate */}
          <g transform="translate(45, 305)">
            <rect x="-12" y="-18" width="24" height="36" rx="2" fill="#073B5C" />
            <text x="-25" y="4" textAnchor="end" fontSize="9" fontWeight="700" fill="#073B5C">
              CỔNG CHÍNH
            </text>
          </g>

          {/* 7. OPERATIONAL ZONE LAYER */}
          <ZoneLayer
            zones={zones}
            selectedZoneId={selectedZoneId}
            hoveredZoneId={hoveredZoneId}
            activeLayer={activeLayer}
            onSelectZone={onSelectZone}
            onHoverZone={onHoverZone}
          />

          {/* 8. METER MARKER LAYER */}
          <MeterLayer
            meters={meters}
            selectedMeterId={selectedMeterId}
            hoveredMeterId={hoveredMeterId}
            activeLayer={activeLayer}
            exceptionsOnly={exceptionsOnly}
            onSelectMeter={onSelectMeter}
            onHoverMeter={onHoverMeter}
          />
        </g>
      </svg>
    </div>
  );
};
