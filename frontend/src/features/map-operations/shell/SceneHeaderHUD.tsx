import React from 'react';

interface SceneHeaderHUDProps {
  title?: string;
  subtitle?: string;
  onToggleMenu?: () => void;
}

/**
 * SceneHeaderHUD — Top-Left Minimal Maritime Header (V10)
 *
 * Streamlined horizontal brand mark and identity:
 * - Official Saigon Port emblem badge (compact 26px)
 * - Single-line quiet brand text: "Bản đồ công tơ · Cảng Tân Thuận"
 */
export const SceneHeaderHUD: React.FC<SceneHeaderHUDProps> = ({
  title = 'Bản đồ công tơ',
  subtitle = 'Cảng Tân Thuận',
}) => {
  return (
    <div className="sgp-scene-header-hud" role="region" aria-label="Tiêu đề bảng điều khiển">
      <div className="sgp-header-brand-badge" title="Cảng Sài Gòn — Cảng Tân Thuận" aria-hidden="true">
        <img src="/icon-192.png" alt="Cảng Sài Gòn" className="sgp-header-brand-logo" />
      </div>

      <div className="sgp-header-title-wrap">
        <div className="sgp-header-title-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h1 className="sgp-header-main-title">{title}</h1>
          <span className="sgp-header-divider" aria-hidden="true">·</span>
          <span className="sgp-header-sub-title">{subtitle}</span>
          <span
            className="sgp-sim-badge"
            title="Dữ liệu thiết bị và mạng lưới trong môi trường này được tạo để mô phỏng và không phải dữ liệu hạ tầng thực tế của doanh nghiệp."
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              backgroundColor: '#F1F5F9',
              color: '#334155',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4,
              border: '1px solid #CBD5E1',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'help',
              letterSpacing: '0.02em',
            }}
          >
            Dữ liệu mô phỏng
          </span>
        </div>
      </div>
    </div>
  );
};
