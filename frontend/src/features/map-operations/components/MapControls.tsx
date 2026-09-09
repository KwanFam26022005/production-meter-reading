import React from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface MapControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  return (
    <div
      className="sgp-map-controls"
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: '4px',
        boxShadow: '0 4px 12px rgba(24, 36, 44, 0.12)',
        border: '1px solid #D7E0E5',
      }}
    >
      <button
        type="button"
        onClick={onZoomIn}
        title="Phóng to (Zoom in)"
        aria-label="Phóng to"
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#073B5C',
        }}
      >
        <Plus size={16} />
      </button>

      <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

      <button
        type="button"
        onClick={onZoomOut}
        title="Thu nhỏ (Zoom out)"
        aria-label="Thu nhỏ"
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#073B5C',
        }}
      >
        <Minus size={16} />
      </button>

      <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

      <button
        type="button"
        onClick={onResetView}
        title={`Khôi phục chế độ xem ban đầu (Hiện tại: ${Math.round(zoom * 100)}%)`}
        aria-label="Khôi phục góc nhìn"
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#53636D',
        }}
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
};
