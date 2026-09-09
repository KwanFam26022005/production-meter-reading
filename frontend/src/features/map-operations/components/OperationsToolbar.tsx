import React from 'react';
import {
  Map,
  List,
  RefreshCw,
  AlertTriangle,
  Layers,
  Table as TableIcon,
  Activity,
  Cpu,
  Box,
} from 'lucide-react';
import { OperationalLayerType } from '../types';
import { OperationalProductMode } from '../state/mapOperationsState';
import { VnDatePicker } from '../../../components/ui/VnDatePicker';

interface OperationsToolbarProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  viewMode: 'map' | 'legacy';
  onViewModeChange: (mode: 'map' | 'legacy') => void;
  productMode: OperationalProductMode;
  onProductModeChange: (mode: OperationalProductMode) => void;
  activeLayer: OperationalLayerType;
  onLayerChange: (layer: OperationalLayerType) => void;
  exceptionsOnly: boolean;
  onToggleExceptionsOnly: () => void;
  exceptionsCount: number;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenExceptions?: () => void;
  onToggleTable?: () => void;
  isTableOpen?: boolean;
}

export const OperationsToolbar: React.FC<OperationsToolbarProps> = ({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  productMode,
  onProductModeChange,
  activeLayer,
  onLayerChange,
  exceptionsOnly,
  onToggleExceptionsOnly,
  exceptionsCount,
  onRefresh,
  isLoading,
  onOpenExceptions,
  onToggleTable,
  isTableOpen = false,
}) => {
  return (
    <div className="sgp-operations-toolbar">
      {/* LEFT: Presentation Switch + Primary Product Modes [Vận hành] [Tài sản] [Không gian 3D] + Date */}
      <div className="sgp-toolbar-group-left">
        {/* PRESENTATION SWITCH: [Bản đồ] [Danh sách] */}
        <div className="sgp-view-mode-toggle" role="group" aria-label="Chế độ hiển thị">
          <button
            type="button"
            className={`sgp-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onViewModeChange('map')}
            title="Chế độ trực quan bản đồ"
          >
            <Map size={15} />
            <span>Bản đồ</span>
          </button>
          <button
            type="button"
            className={`sgp-mode-btn ${viewMode === 'legacy' ? 'active' : ''}`}
            onClick={() => onViewModeChange('legacy')}
            title="Chế độ bảng danh mục quản trị"
          >
            <List size={15} />
            <span>Danh sách</span>
          </button>
        </div>

        {/* PRIMARY PRODUCT MODES: [ Vận hành ] [ Tài sản ] [ Không gian 3D ] */}
        {viewMode === 'map' && (
          <div className="sgp-product-mode-toggle" role="group" aria-label="Chế độ tác nghiệp bản đồ">
            <button
              type="button"
              className={`sgp-pm-btn ${productMode === 'operational' ? 'active' : ''}`}
              onClick={() => onProductModeChange('operational')}
              title="Bản đồ điều hành phân khu và tiến độ (Mặc định)"
            >
              <Activity size={14} />
              <span>Vận hành</span>
            </button>
            <button
              type="button"
              className={`sgp-pm-btn ${productMode === 'asset' ? 'active' : ''}`}
              onClick={() => onProductModeChange('asset')}
              title="Bản đồ định vị tài sản công tơ"
            >
              <Cpu size={14} />
              <span>Tài sản</span>
            </button>
            <button
              type="button"
              className={`sgp-pm-btn ${productMode === '3d' ? 'active' : ''}`}
              onClick={() => onProductModeChange('3d')}
              title="Mô hình không gian 3D số Cảng Tân Thuận"
            >
              <Box size={14} />
              <span>Không gian 3D</span>
            </button>
          </div>
        )}

        {/* Date Picker */}
        <div className="sgp-toolbar-date">
          <VnDatePicker value={selectedDate} onChange={onDateChange} />
        </div>
      </div>

      {/* RIGHT: Layer Selection + Exception Drawer + Table Drawer + Refresh */}
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
            aria-label="Chọn lớp hiển thị dữ liệu"
          >
            <option value="STATUS">Trạng thái công tơ</option>
            <option value="PROGRESS">Tiến độ khu vực</option>
            <option value="OWNERSHIP">Phụ trách nhân sự</option>
            <option value="EXCEPTIONS">Cảnh báo ngoại lệ</option>
          </select>
        </div>

        {/* EXCEPTION DRAWER BUTTON */}
        <button
          type="button"
          className={`sgp-exception-btn ${exceptionsCount > 0 ? 'has-alerts' : ''} ${
            exceptionsOnly ? 'active' : ''
          }`}
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
            title="Mở bảng số liệu công tơ theo yêu cầu"
            aria-label="Mở bảng số liệu công tơ"
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
