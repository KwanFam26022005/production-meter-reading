import React, { useEffect } from 'react';
import { Layers, Check, X } from 'lucide-react';
import { MapV2LayerVisibility, MapV2ToneMode } from './types';

interface MapV2LayersProps {
  visibility: MapV2LayerVisibility;
  onChange: (nextVisibility: MapV2LayerVisibility) => void;
  onClose: () => void;
  toneMode?: MapV2ToneMode;
}

export const MapV2Layers: React.FC<MapV2LayersProps> = ({
  visibility,
  onChange,
  onClose,
  toneMode = 'technical',
}) => {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggle = (key: keyof MapV2LayerVisibility) => {
    onChange({
      ...visibility,
      [key]: !visibility[key],
    });
  };

  const operationalLayers: { key: keyof MapV2LayerVisibility; label: string; color: string; desc: string }[] = [
    {
      key: 'zones',
      label: 'Phân khu vận hành',
      color: '#3D8DD1',
      desc: 'Bãi tổng hợp, Cảng sà lan, Container',
    },
    {
      key: 'employees',
      label: 'Nhân sự phụ trách',
      color: '#003875',
      desc: 'Người phụ trách thường trực tại điểm neo khu vực (Không phải GPS)',
    },
    {
      key: 'meters',
      label: 'Điểm đo công tơ',
      color: '#10B981',
      desc: 'Công tơ có tọa độ không gian xác thực',
    },
    {
      key: 'exceptionsOnly',
      label: 'Tín hiệu ngoại lệ',
      color: '#FCC959',
      desc: 'Nhấn mạnh điểm đo cần kiểm tra hoặc trễ hạn',
    },
  ];

  const technicalNetworkLayers: { key: keyof MapV2LayerVisibility; label: string; color: string; desc: string; badgeLabel: string }[] = [
    {
      key: 'powerNetwork',
      label: '⚡ Mạng điện',
      color: '#FFB703',
      desc: 'Tuyến cáp hạ thế & trạm phân phối (Mô phỏng B2)',
      badgeLabel: 'MÔ PHỎNG',
    },
    {
      key: 'waterNetwork',
      label: '💧 Mạng nước',
      color: '#0068FF',
      desc: 'Đường ống cấp nước cảng (Mô phỏng B2)',
      badgeLabel: 'MÔ PHỎNG',
    },
  ];

  const animationLayers: { key: keyof MapV2LayerVisibility; label: string; color: string; desc: string; badgeLabel: string }[] = [
    {
      key: 'demoEmployees',
      label: 'Nhân sự di chuyển',
      color: '#8B5CF6',
      desc: 'Chuyển động minh họa — không phải vị trí GPS',
      badgeLabel: 'DEMO',
    },
  ];

  const baseMapLayers: { key: keyof MapV2LayerVisibility; label: string; color: string; desc: string }[] = [
    {
      key: 'baseMap',
      label: 'Bản đồ nền kỹ thuật',
      color: '#475569',
      desc: 'Ảnh kỹ thuật gốc 1536×1024 px',
    },
    {
      key: 'buildings',
      label: 'Kho tàng & Hành chính',
      color: '#E8CE7E',
      desc: 'Kho 1, Kho 2, Kho 4, VP Hành chính',
    },
    {
      key: 'roadsAndBoundaries',
      label: 'Ranh giới & Tuyến nội bộ',
      color: '#D95456',
      desc: 'Ranh giới cảng & các tuyến giao thông',
    },
    {
      key: 'gates',
      label: 'Điểm kiểm soát',
      color: '#059669',
      desc: 'Cổng A & Cổng B',
    },
    {
      key: 'anchors',
      label: 'Điểm neo phân khu',
      color: '#0284C7',
      desc: 'Điểm neo nhãn và hiển thị phân khu',
    },
  ];

  const isNeon = toneMode === 'neon';

  const renderLayerItem = (l: { key: keyof MapV2LayerVisibility; label: string; color: string; desc: string; badgeLabel?: string }) => {
    const active = !!visibility[l.key];
    return (
      <div
        key={l.key}
        className="map-v2-layer-item"
        onClick={() => toggle(l.key)}
        role="checkbox"
        aria-checked={active}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggle(l.key);
          }
        }}
      >
        <div className="map-v2-layer-label">
          <span
            className="map-v2-color-dot"
            style={{ backgroundColor: l.color }}
          />
          <div>
            <div className={`map-v2-layer-name ${active ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{l.label}</span>
              {l.badgeLabel && (
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 3,
                    backgroundColor: isNeon ? 'rgba(255, 183, 3, 0.2)' : '#FEF3C7',
                    color: isNeon ? '#FCC959' : '#D97706',
                    border: '1px solid rgba(217, 119, 6, 0.3)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {l.badgeLabel}
                </span>
              )}
            </div>
            <div className="map-v2-layer-desc">
              {l.desc}
            </div>
          </div>
        </div>

        <div className={`map-v2-layer-checkbox ${active ? 'checked' : ''}`}>
          {active && <Check size={12} strokeWidth={3} />}
        </div>
      </div>
    );
  };

  return (
    <div className={`map-v2-layers-popover ${isNeon ? 'tone-neon' : ''}`} role="dialog" aria-label="Quản lý lớp bản đồ">
      <div className="map-v2-layers-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={16} className="map-v2-layers-icon" />
          <span className="map-v2-layers-title">Lớp hiển thị</span>
        </div>
        <button
          type="button"
          className="map-v2-btn map-v2-btn-icon-only"
          onClick={onClose}
          aria-label="Đóng bảng lớp"
          style={{ padding: '2px 4px' }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '420px', overflowY: 'auto' }}>
        {/* Nhóm 1: LỚP TÁC NGHIỆP */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: isNeon ? '#00f0ff' : '#003875', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            LỚP TÁC NGHIỆP
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {operationalLayers.map(renderLayerItem)}
          </div>
        </div>

        {/* Nhóm 2: MẠNG KỸ THUẬT */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: isNeon ? '#FCC959' : '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            MẠNG KỸ THUẬT
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {technicalNetworkLayers.map(renderLayerItem)}
          </div>
        </div>

        {/* Nhóm 3: HOẠT HỌA */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: isNeon ? '#A78BFA' : '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            HOẠT HỌA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {animationLayers.map(renderLayerItem)}
          </div>
        </div>

        {/* Nhóm 4: BẢN ĐỒ NỀN */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: isNeon ? '#94A3B8' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            BẢN ĐỒ NỀN
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {baseMapLayers.map(renderLayerItem)}
          </div>
        </div>
      </div>
    </div>
  );
};
export default MapV2Layers;
