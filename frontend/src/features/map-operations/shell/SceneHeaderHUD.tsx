import React from 'react';
import { Anchor } from 'lucide-react';

interface SceneHeaderHUDProps {
  title?: string;
  subtitle?: string;
  onToggleMenu?: () => void;
}

/**
 * SceneHeaderHUD — Top-Left Maritime Title Cluster (Approved Design)
 *
 * Floating contextual header embedded cleanly into the unified top bar:
 * - Anchor icon logo in maritime teal badge
 * - Title: "Bản đồ công tơ"
 * - Subtitle: "Cảng Tân Thuận"
 */
export const SceneHeaderHUD: React.FC<SceneHeaderHUDProps> = ({
  title = 'Bản đồ công tơ',
  subtitle = 'Cảng Tân Thuận',
}) => {
  return (
    <div className="sgp-scene-header-hud" role="region" aria-label="Tiêu đề bảng điều khiển">
      <div className="sgp-header-anchor-badge" title="Cảng Tân Thuận" aria-hidden="true">
        <Anchor size={22} className="sgp-header-anchor-icon" />
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
