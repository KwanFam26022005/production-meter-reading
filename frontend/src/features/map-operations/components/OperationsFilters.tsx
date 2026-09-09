import React from 'react';
import { Search, X } from 'lucide-react';
import { MapFilterOptions, MapOperationalZone } from '../types';
import { User } from '../../../types';

interface OperationsFiltersProps {
  filters: MapFilterOptions;
  zones: MapOperationalZone[];
  operators?: User[];
  selectedOperatorId?: string;
  onOperatorChange?: (operatorId: string) => void;
  onFilterChange: (nextFilters: MapFilterOptions) => void;
  filteredCount: number;
  totalCount: number;
}

export const OperationsFilters: React.FC<OperationsFiltersProps> = ({
  filters,
  zones,
  operators = [],
  selectedOperatorId = 'ALL',
  onOperatorChange,
  onFilterChange,
  filteredCount,
  totalCount,
}) => {
  return (
    <div className="sgp-map-filters-bar">
      {/* 1. Search Query Input */}
      <div className="sgp-filter-search">
        <Search size={15} className="sgp-search-icon" />
        <input
          type="text"
          placeholder="Tìm mã công tơ, vị trí, khu vực..."
          value={filters.searchQuery}
          onChange={(e) =>
            onFilterChange({ ...filters, searchQuery: e.target.value })
          }
          className="sgp-search-input"
        />
        {filters.searchQuery && (
          <button
            type="button"
            className="sgp-search-clear"
            onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
            title="Xóa tìm kiếm"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 2. Zone Filter Dropdown */}
      <div className="sgp-filter-select-group">
        <label htmlFor="filter-zone-select" className="sgp-filter-label">Khu vực:</label>
        <select
          id="filter-zone-select"
          value={filters.zoneId}
          onChange={(e) => onFilterChange({ ...filters, zoneId: e.target.value })}
          className="sgp-filter-select"
        >
          <option value="ALL">Tất cả khu vực ({zones.length})</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name} ({z.metrics.totalMeters})
            </option>
          ))}
        </select>
      </div>

      {/* 3. Operator Filter Dropdown */}
      {operators.length > 0 && onOperatorChange && (
        <div className="sgp-filter-select-group">
          <label htmlFor="filter-operator-select" className="sgp-filter-label">Phụ trách:</label>
          <select
            id="filter-operator-select"
            value={selectedOperatorId}
            onChange={(e) => onOperatorChange(e.target.value)}
            className="sgp-filter-select"
          >
            <option value="ALL">Tất cả nhân sự ({operators.length})</option>
            {operators.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.employee_code || u.role})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 4. Status Filter Dropdown */}
      <div className="sgp-filter-select-group">
        <label htmlFor="filter-status-select" className="sgp-filter-label">Trạng thái:</label>
        <select
          id="filter-status-select"
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="sgp-filter-select"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="CONFIRMED">Đã hoàn thành</option>
          <option value="REVIEW">Cần kiểm tra lại</option>
          <option value="OVERDUE">Quá hạn lượt</option>
          <option value="DUE">Đến hạn ca trực</option>
          <option value="PENDING">Chờ đến giờ ghi</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>
      </div>

      {/* 5. Meter Type Filter */}
      <div className="sgp-filter-select-group">
        <label htmlFor="filter-type-select" className="sgp-filter-label">Loại:</label>
        <select
          id="filter-type-select"
          value={filters.meterType}
          onChange={(e) => onFilterChange({ ...filters, meterType: e.target.value })}
          className="sgp-filter-select"
        >
          <option value="ALL">Tất cả loại</option>
          <option value="LCD">Điện tử (LCD)</option>
          <option value="MECHANICAL">Cơ khí</option>
        </select>
      </div>

      {/* Filter result counter */}
      <div className="sgp-filter-counter font-tabular">
        Hiển thị <strong>{filteredCount}</strong>/{totalCount}
      </div>
    </div>
  );
};
