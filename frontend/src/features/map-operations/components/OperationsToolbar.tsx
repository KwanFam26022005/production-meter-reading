import React from 'react';
import {
  Map,
  List,
  RefreshCw,
  AlertTriangle,
  Layers,
  Clock,
} from 'lucide-react';
import { OperationalLayerType } from '../types';
import { VnDatePicker } from '../../../components/ui/VnDatePicker';

interface OperationsToolbarProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  viewMode: 'map' | 'legacy';
  onViewModeChange: (mode: 'map' | 'legacy') => void;
  activeLayer: OperationalLayerType;
  onLayerChange: (layer: OperationalLayerType) => void;
  exceptionsOnly: boolean;
  onToggleExceptionsOnly: () => void;
  exceptionsCount: number;
  currentRoundTime?: string | null;
  currentRoundStatus?: string | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const OperationsToolbar: React.FC<OperationsToolbarProps> = ({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  activeLayer,
  onLayerChange,
  exceptionsOnly,
  onToggleExceptionsOnly,
  exceptionsCount,
  currentRoundTime,
  currentRoundStatus,
  onRefresh,
  isLoading,
}) => {
  return (
    <div className="sgp-operations-toolbar">
      {/* LEFT: View Mode Switcher + Date Selector */}
      <div className="sgp-toolbar-group-left">
        {/* PRESENTATION SWITCH: [Bản đồ] [Danh sách] */}
        <div className="sgp-view-mode-toggle" role="group" aria-label="Chế độ hiển thị">
          <button
            type="button"
            className={`sgp-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onViewModeChange('map')}
          >
            <Map size={15} />
            <span>Bản đồ</span>
          </button>
          <button
            type="button"
            className={`sgp-mode-btn ${viewMode === 'legacy' ? 'active' : ''}`}
            onClick={() => onViewModeChange('legacy')}
          >
            <List size={15} />
            <span>Danh sách</span>
          </button>
        </div>

        {/* Date Picker */}
        <div className="sgp-toolbar-date">
          <VnDatePicker value={selectedDate} onChange={onDateChange} />
        </div>

        {/* Current Round Badge */}
        {currentRoundTime && (
          <div className="sgp-round-badge">
            <Clock size={14} color="#0B4F75" />
            <span className="sgp-round-time">Ca {currentRoundTime}</span>
            {currentRoundStatus && (
              <span className="sgp-round-status">{currentRoundStatus}</span>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Layer Selection + Exception Mode + Refresh */}
      <div className="sgp-toolbar-group-right">
        {/* Layer Selector */}
        <div className="sgp-layer-selector">
          <div className="sgp-layer-label">
            <Layers size={14} />
            <span>Lớp:</span>
          </div>
          <select
            value={activeLayer}
            onChange={(e) => onLayerChange(e.target.value as OperationalLayerType)}
            className="sgp-layer-select"
            aria-label="Chọn lớp hiển thị"
          >
            <option value="STATUS">Trạng thái công tơ</option>
            <option value="PROGRESS">Tiến độ khu vực</option>
            <option value="OWNERSHIP">Phụ trách nhân sự</option>
            <option value="EXCEPTIONS">Cảnh báo ngoại lệ</option>
            <option value="WORKLOAD">Khối lượng tác nghiệp</option>
          </select>
        </div>

        {/* EXCEPTION MODE TOGGLE */}
        <button
          type="button"
          className={`sgp-exception-btn ${exceptionsOnly ? 'active' : ''}`}
          onClick={onToggleExceptionsOnly}
          title="Lọc chỉ hiển thị các công tơ có ngoại lệ hoặc cần duyệt"
        >
          <AlertTriangle size={15} />
          <span>Chỉ hiện ngoại lệ</span>
          {exceptionsCount > 0 && (
            <span className="sgp-exception-badge">{exceptionsCount}</span>
          )}
        </button>

        {/* REFRESH BUTTON */}
        <button
          type="button"
          className="sgp-refresh-btn"
          onClick={onRefresh}
          disabled={isLoading}
          title="Làm mới dữ liệu"
          aria-label="Làm mới dữ liệu"
        >
          <RefreshCw size={15} className={isLoading ? 'sgp-spin' : ''} />
        </button>
      </div>
    </div>
  );
};
