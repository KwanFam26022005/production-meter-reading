import React, { useState, useRef, useEffect } from 'react';
import {
  Map,
  List,
  MoreVertical,
  RefreshCw,
  Download,
} from 'lucide-react';
import { VnDatePicker } from '../../../components/ui/VnDatePicker';

interface MapHeaderProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  viewMode: 'map' | 'legacy';
  onViewModeChange: (mode: 'map' | 'legacy') => void;
  onRefresh: () => void;
  isLoading: boolean;
  onExportCsv?: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  isLoading,
  onExportCsv,
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
      {/* Title & Port Label */}
      <div className="sgp-map-header-left">
        <h1 className="sgp-map-header-title">Bản đồ công tơ</h1>
        <span className="sgp-map-header-sub">Cảng Tân Thuận</span>
      </div>

      {/* Center Date Picker */}
      <div className="sgp-map-header-center">
        <VnDatePicker value={selectedDate} onChange={onDateChange} />
      </div>

      {/* Right Controls: [Bản đồ] [Danh sách] + Overflow Menu */}
      <div className="sgp-map-header-right">
        {/* Simplified View Switcher: ONLY [Bản đồ] [Danh sách] */}
        <div className="sgp-view-mode-toggle" role="group" aria-label="Chế độ hiển thị">
          <button
            type="button"
            className={`sgp-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onViewModeChange('map')}
            title="Chế độ bản đồ trực quan"
          >
            <Map size={14} />
            <span>Bản đồ</span>
          </button>
          <button
            type="button"
            className={`sgp-mode-btn ${viewMode === 'legacy' ? 'active' : ''}`}
            onClick={() => onViewModeChange('legacy')}
            title="Chế độ danh mục quản trị"
          >
            <List size={14} />
            <span>Danh sách</span>
          </button>
        </div>

        {/* Overflow Menu [⋯] */}
        <div className="sgp-overflow-wrapper" ref={menuRef}>
          <button
            type="button"
            className="sgp-overflow-btn"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="Thao tác khác"
            aria-label="Menu thao tác khác"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <div className="sgp-overflow-menu" role="menu">
              <button
                type="button"
                className="sgp-overflow-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  onRefresh();
                }}
                disabled={isLoading}
                role="menuitem"
              >
                <RefreshCw size={14} className={isLoading ? 'sgp-spin' : ''} />
                <span>Làm mới dữ liệu</span>
              </button>

              {onExportCsv && (
                <button
                  type="button"
                  className="sgp-overflow-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportCsv();
                  }}
                  role="menuitem"
                >
                  <Download size={14} />
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
