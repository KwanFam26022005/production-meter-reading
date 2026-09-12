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
        <div className="sgp-header-title-row">
          <h1 className="sgp-header-main-title">{title}</h1>
          <span className="sgp-header-divider" aria-hidden="true">·</span>
          <span className="sgp-header-sub-title">{subtitle}</span>
        </div>
      </div>
    </div>
  );
};
