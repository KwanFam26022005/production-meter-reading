import React from 'react';

interface SceneHeaderHUDProps {
  title?: string;
  subtitle?: string;
  onToggleMenu?: () => void;
}

/**
 * SceneHeaderHUD — Top-Left Maritime Title Cluster (Approved Design)
 *
 * Floating contextual header embedded cleanly into the unified top bar:
 * - Official Saigon Port emblem badge
 * - Title: "Bản đồ công tơ"
 * - Subtitle: "Cảng Tân Thuận"
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
        </div>
        <span className="sgp-header-sub-title">{subtitle}</span>
      </div>
    </div>
  );
};
