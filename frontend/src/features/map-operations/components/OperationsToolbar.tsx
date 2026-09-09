import React from 'react';
import {
  Map,
  List,
  RefreshCw,
  AlertTriangle,
  Layers,
  Clock,
  Table as TableIcon,
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
  is2D?: boolean;
  onToggle2D?: () => void;
  onOpenExceptions?: () => void;
  onToggleTable?: () => void;
  isTableOpen?: boolean;
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
  is2D = false,
  onToggle2D,
  onOpenExceptions,
  onToggleTable,
  isTableOpen = false,
}) => {
  return (
    <div className="sgp-operations-toolbar">
      {/* LEFT: View Mode Switcher + 2D/3D Dimension Toggle + Date Selector */}
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

        {/* 2D / 3D DIMENSION TOGGLE (Tan Thuan Port Digital Twin) */}
        {viewMode === 'map' && onToggle2D && (
          <div className="sgp-dimension-toggle" role="group" aria-label="Chế độ không gian">
            <button
              type="button"
              className={`sgp-dim-btn ${is2D ? 'active' : ''}`}
              onClick={() => {
                if (!is2D) onToggle2D();
              }}
              title="Góc nhìn 2D thẳng đứng (Top-down)"
            >
              2D
            </button>
            <button
              type="button"
              className={`sgp-dim-btn ${!is2D ? 'active' : ''}`}
              onClick={() => {
                if (is2D) onToggle2D();
              }}
              title="Góc nhìn 3D không gian Cảng (Isometric)"
            >
              3D
            </button>
          </div>
        )}

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

      {/* RIGHT: Layer Selection + Exception Drawer / Mode + Table Drawer + Refresh */}
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

        {/* EXCEPTION DRAWER BUTTON */}
        <button
          type="button"
          className={`sgp-exception-btn ${exceptionsCount > 0 ? 'has-alerts' : ''} ${exceptionsOnly ? 'active' : ''}`}
          onClick={onOpenExceptions || onToggleExceptionsOnly}
          title={onOpenExceptions ? 'Mở danh sách cảnh báo ngoại lệ' : 'Lọc chỉ hiện ngoại lệ'}
          aria-label="Cảnh báo ngoại lệ"
        >
          <AlertTriangle size={15} />
          <span>Ngoại lệ</span>
          {exceptionsCount > 0 && (
            <span className="sgp-exception-badge">{exceptionsCount}</span>
          )}
        </button>

        {/* ON-DEMAND TABLE TOGGLE BUTTON */}
        {onToggleTable && (
          <button
            type="button"
            className={`sgp-table-toggle-btn ${isTableOpen ? 'active' : ''}`}
            onClick={onToggleTable}
            title="Mở bảng dữ liệu công tơ theo yêu cầu"
            aria-label="Mở bảng dữ liệu công tơ"
          >
            <TableIcon size={15} />
            <span>Bảng số liệu</span>
          </button>
        )}

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
