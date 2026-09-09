import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapMeterItem, MapOperationalZone, OperationalLayerType } from '../types';
import { ThreePortScene } from './ThreePortScene';
import { CameraCommand } from './DigitalTwinCameraController';
import { PortMap } from '../components/PortMap';

interface DigitalTwinCanvasProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  selectedZoneId: string | null;
  selectedMeterId: string | null;
  hoveredZoneId: string | null;
  hoveredMeterId: string | null;
  activeLayer: OperationalLayerType;
  exceptionsOnly: boolean;
  is2D: boolean;
  cameraCommand: CameraCommand | null;
  onSelectZone: (zoneId: string) => void;
  onSelectMeter: (meterId: string) => void;
  onHoverZone: (zoneId: string | null) => void;
  onHoverMeter: (meterId: string | null) => void;
  onClearSelection: () => void;
  onCameraCommandFinished?: () => void;
  viewport: { zoom: number; panX: number; panY: number };
  onViewportChange: (viewport: { zoom: number; panX: number; panY: number }) => void;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[DigitalTwinCanvas] WebGL render error, falling back to SVG PortMap:', error, info);
    if (this.props.onError) this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const DigitalTwinCanvas: React.FC<DigitalTwinCanvasProps> = (props) => {
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);

  useEffect(() => {
    setWebGLSupported(checkWebGLSupport());
  }, []);

  // SVG Fallback renderer
  const svgFallback = (
    <div className="sgp-fallback-wrapper">
      <div className="sgp-fallback-notice">
        <span>Hiển thị chế độ sơ đồ số 2D (WebGL không khả dụng trên thiết bị này)</span>
      </div>
      <PortMap
        zones={props.zones}
        meters={props.meters}
        selectedZoneId={props.selectedZoneId}
        selectedMeterId={props.selectedMeterId}
        hoveredZoneId={props.hoveredZoneId}
        hoveredMeterId={props.hoveredMeterId}
        activeLayer={props.activeLayer}
        exceptionsOnly={props.exceptionsOnly}
        viewport={props.viewport}
        onSelectZone={props.onSelectZone}
        onSelectMeter={props.onSelectMeter}
        onHoverZone={props.onHoverZone}
        onHoverMeter={props.onHoverMeter}
        onClearSelection={props.onClearSelection}
        onViewportChange={props.onViewportChange}
      />
    </div>
  );

  if (!webGLSupported) {
    return svgFallback;
  }

  return (
    <WebGLErrorBoundary fallback={svgFallback}>
      <div className="sgp-digital-twin-viewport">
        <Canvas
          shadows
          camera={{
            position: props.is2D ? [0, 80, 0.001] : [-8, 48, 56],
            fov: 42,
            near: 0.5,
            far: 320,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 2]}
        >
          <ThreePortScene
            zones={props.zones}
            meters={props.meters}
            selectedZoneId={props.selectedZoneId}
            selectedMeterId={props.selectedMeterId}
            hoveredZoneId={props.hoveredZoneId}
            hoveredMeterId={props.hoveredMeterId}
            activeLayer={props.activeLayer}
            exceptionsOnly={props.exceptionsOnly}
            is2D={props.is2D}
            cameraCommand={props.cameraCommand}
            onSelectZone={props.onSelectZone}
            onSelectMeter={props.onSelectMeter}
            onHoverZone={props.onHoverZone}
            onHoverMeter={props.onHoverMeter}
            onClearSelection={props.onClearSelection}
            onCameraCommandFinished={props.onCameraCommandFinished}
          />
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
};
