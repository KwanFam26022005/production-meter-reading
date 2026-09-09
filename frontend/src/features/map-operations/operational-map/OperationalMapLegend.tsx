import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface OperationalMapLegendProps {
  activeLayer?: string;
}

export const OperationalMapLegend: React.FC<OperationalMapLegendProps> = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sgp-map-legend-wrapper">
      {isOpen && (
        <div className="sgp-legend-popover shadow-xl" role="region" aria-label="Chú giải trạng thái">
          <div className="sgp-legend-popover-header">
            <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
              <Info size={13} className="text-sgp-teal" /> Chú giải bản đồ
            </span>
            <button
              type="button"
              className="sgp-legend-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng chú giải"
            >
              <X size={13} />
            </button>
          </div>

          <div className="sgp-legend-section">
            <div className="sgp-legend-section-title">Trạng thái công tơ</div>
            <div className="sgp-legend-items">
              <div className="sgp-legend-item">
                <span className="sgp-legend-dot confirmed" />
                <span>Đã ghi hoàn tất</span>
              </div>
              <div className="sgp-legend-item">
                <span className="sgp-legend-dot review" />
                <span>Cần kiểm tra</span>
              </div>
              <div className="sgp-legend-item">
                <span className="sgp-legend-dot overdue" />
                <span>Quá hạn</span>
              </div>
              <div className="sgp-legend-item">
                <span className="sgp-legend-dot due" />
                <span>Đến hạn ghi ca</span>
              </div>
              <div className="sgp-legend-item">
                <span className="sgp-legend-dot pending" />
                <span>Chờ đến giờ</span>
              </div>
            </div>
          </div>

          <div className="sgp-legend-divider" />

          <div className="sgp-legend-section">
            <div className="sgp-legend-section-title">Sức khỏe phân khu</div>
            <div className="sgp-legend-items">
              <div className="sgp-legend-item">
                <span className="sgp-legend-zone-bar healthy" />
                <span>Ổn định (đúng tiến độ)</span>
              </div>
              <div className="sgp-legend-item">
                <span className="sgp-legend-zone-bar attention" />
                <span>Cần chú ý (có ảnh review)</span>
              </div>
              <div className="sgp-legend-item">
                <span className="sgp-legend-zone-bar critical" />
                <span>Khẩn cấp (có công tơ quá hạn)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`sgp-legend-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <Info size={13} />
        <span>Chú giải</span>
      </button>
    </div>
  );
};
