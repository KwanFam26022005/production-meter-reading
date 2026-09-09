import React from 'react';
import { Plus, Minus, Maximize2 } from 'lucide-react';

interface MapViewportControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const MapViewportControls: React.FC<MapViewportControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  return (
    <div
      className="sgp-viewport-controls"
      role="toolbar"
      aria-label="Điều khiển thu phóng sơ đồ cảng"
    >
      <button
        type="button"
        className="sgp-vctrl-btn"
        onClick={onZoomIn}
        title="Phóng to sơ đồ (+)"
        aria-label="Phóng to"
      >
        <Plus size={16} />
      </button>

      <button
        type="button"
        className="sgp-vctrl-btn"
        onClick={onZoomOut}
        title="Thu nhỏ sơ đồ (-)"
        aria-label="Thu nhỏ"
      >
        <Minus size={16} />
      </button>

      <div className="sgp-vctrl-divider" />

      <button
        type="button"
        className="sgp-vctrl-btn reset"
        onClick={onResetView}
        title="Xem toàn cảnh Cảng Tân Thuận"
        aria-label="Vừa khung nhìn"
      >
        <Maximize2 size={14} />
        <span className="sgp-vctrl-tag font-tabular">{Math.round(zoom * 100)}%</span>
      </button>
    </div>
  );
};
