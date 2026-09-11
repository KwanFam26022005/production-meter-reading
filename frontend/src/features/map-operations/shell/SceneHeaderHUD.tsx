import React from 'react';
import { Menu } from 'lucide-react';

interface SceneHeaderHUDProps {
  title?: string;
  subtitle?: string;
  onToggleMenu?: () => void;
}

/**
 * SceneHeaderHUD — Top-Left Title Cluster (Section 5 & 9)
 *
 * Floating contextual header embedded cleanly into the map canvas:
 * - Title: "Bản đồ công tơ" / "Trung tâm vận hành"
 * - Subtitle: "Cảng Tân Thuận"
 * - Live operational pulse dot
 * - Menu button to trigger admin sidebar navigation
 */
export const SceneHeaderHUD: React.FC<SceneHeaderHUDProps> = ({
  title = 'Bản đồ công tơ',
  subtitle = 'Cảng Tân Thuận',
  onToggleMenu,
}) => {
  const handleMenuClick = () => {
    if (onToggleMenu) {
      onToggleMenu();
    } else {
      window.dispatchEvent(new CustomEvent('sgp-toggle-admin-sidebar'));
    }
  };

  return (
    <div className="sgp-scene-header-hud" role="region" aria-label="Tiêu đề bảng điều khiển">
      <button
        type="button"
        className="sgp-hud-menu-btn"
        onClick={handleMenuClick}
        aria-label="Mở danh mục quản trị"
        title="Mở danh mục quản trị"
      >
        <Menu size={18} strokeWidth={2.2} />
      </button>

      <div className="sgp-header-title-wrap">
        <div className="sgp-header-title-row">
          <span className="sgp-live-indicator" title="Hệ thống vận hành thời gian thực" aria-hidden="true" />
          <h1 className="sgp-header-main-title">{title}</h1>
        </div>
        <span className="sgp-header-sub-title">{subtitle}</span>
      </div>
    </div>
  );
};
