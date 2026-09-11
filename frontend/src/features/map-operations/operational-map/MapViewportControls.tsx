import React from 'react';
import { Maximize2 } from 'lucide-react';

interface MapViewportControlsProps {
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView: () => void;
}

export const MapViewportControls: React.FC<MapViewportControlsProps> = ({
  onResetView,
}) => {
  return (
    <div className="sgp-viewport-controls-cluster">
      <button
        type="button"
        className="sgp-vctrl-gps-btn"
        onClick={onResetView}
        title="Toàn cảnh Cảng Tân Thuận (Mặc định)"
        aria-label="Vừa khung nhìn"
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
};
