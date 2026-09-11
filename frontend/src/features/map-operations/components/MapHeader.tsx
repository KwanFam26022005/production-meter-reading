import React, { useState, useRef, useEffect } from 'react';
import {
  Map,
  List,
  MoreVertical,
  RefreshCw,
  Download,
  Menu,
} from 'lucide-react';
import { VnDatePicker } from '../../../components/ui/VnDatePicker';

export interface MapHeaderProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  viewMode: 'map' | 'legacy';
  onViewModeChange: (mode: 'map' | 'legacy') => void;
  onRefresh: () => void;
  isLoading: boolean;
  onExportCsv?: () => void;
  onToggleMenu?: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  isLoading,
  onExportCsv,
  onToggleMenu,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close overflow menu on outside click or ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="sgp-map-header" role="banner" aria-label="Đầu trang bản đồ công tơ">
      {/* LEFT: Menu button + Title + Port name */}
      <div className="sgp-mh-title-wrap">
        <button
          type="button"
          className="sgp-mh-menu-nav-btn"
          onClick={() => {
            if (onToggleMenu) {
              onToggleMenu();
            } else {
              window.dispatchEvent(new CustomEvent('sgp-toggle-admin-sidebar'));
            }
          }}
          title="Mở menu điều hướng quản trị"
          aria-label="Mở menu quản trị"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="sgp-mh-title">Bản đồ công tơ</h1>
          <span className="sgp-mh-subtitle">Cảng Tân Thuận</span>
        </div>
      </div>

      {/* CENTER: Date picker — auto width */}
      <div className="sgp-mh-date-picker-wrap">
        <VnDatePicker value={selectedDate} onChange={onDateChange} />
      </div>

      {/* RIGHT: View toggle + overflow — auto width, never wraps */}
      <div className="sgp-mh-right-cluster">
        {/* [Bản đồ] [Danh sách] segmented toggle */}
        <div className="sgp-mh-view-toggle" role="group" aria-label="Chế độ hiển thị">
          <button
            type="button"
            className={`sgp-mh-view-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onViewModeChange('map')}
            title="Chế độ bản đồ trực quan"
          >
            <Map size={13} />
            <span>Bản đồ</span>
          </button>
          <button
            type="button"
            className={`sgp-mh-view-btn ${viewMode === 'legacy' ? 'active' : ''}`}
            onClick={() => onViewModeChange('legacy')}
            title="Chế độ danh mục quản trị"
          >
            <List size={13} />
            <span>Danh sách</span>
          </button>
        </div>

        {/* ⋮ Overflow — inline with toggle */}
        <div className="sgp-mh-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="sgp-mh-menu-btn"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="Thao tác khác"
            aria-label="Menu thao tác khác"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical size={15} />
          </button>

          {isMenuOpen && (
            <div className="sgp-mh-menu-dropdown" role="menu">
              <button
                type="button"
                className="sgp-mh-menu-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  onRefresh();
                }}
                disabled={isLoading}
                role="menuitem"
              >
                <RefreshCw size={13} className={isLoading ? 'sgp-spin' : ''} />
                <span>Làm mới dữ liệu</span>
              </button>

              {onExportCsv && (
                <button
                  type="button"
                  className="sgp-mh-menu-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportCsv();
                  }}
                  role="menuitem"
                >
                  <Download size={13} />
                  <span>Xuất báo cáo CSV</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
