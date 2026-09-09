import React from 'react';
import { Search, Eye, AlertCircle, X, RotateCcw } from 'lucide-react';
import { RosterFilterState } from './types';

interface RosterFiltersProps {
  filterState: RosterFilterState;
  onChange: (next: RosterFilterState) => void;
  availableRoles: string[];
  totalUsersCount: number;
  filteredUsersCount: number;
  onResetFilters: () => void;
}

export const RosterFilters: React.FC<RosterFiltersProps> = ({
  filterState,
  onChange,
  availableRoles,
  totalUsersCount,
  filteredUsersCount,
  onResetFilters,
}) => {
  const hasActiveFilters =
    filterState.searchQuery.trim() !== '' ||
    filterState.shiftFocus !== 'ALL' ||
    filterState.roleFilter !== 'ALL' ||
    filterState.onlyConflicts;

  return (
    <div className="roster-filters-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Search Input */}
        <div className="roster-search-input-wrap">
          <Search size={14} style={{ color: 'var(--sgp-ink-muted)' }} />
          <input
            type="text"
            className="roster-search-input"
            placeholder="Tìm theo tên hoặc mã NV..."
            value={filterState.searchQuery}
            onChange={(e) => onChange({ ...filterState, searchQuery: e.target.value })}
            aria-label="Tìm kiếm nhân sự"
          />
          {filterState.searchQuery && (
            <button
              type="button"
              onClick={() => onChange({ ...filterState, searchQuery: '' })}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sgp-ink-muted)' }}
              aria-label="Xóa tìm kiếm"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Shift Focus / Highlight Mode (P2.4: Does not hide rows, visually emphasizes shift) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Eye size={13} style={{ color: 'var(--sgp-brand-600)' }} />
          <select
            className="roster-filter-select"
            value={filterState.shiftFocus}
            onChange={(e) => onChange({ ...filterState, shiftFocus: e.target.value })}
            aria-label="Nhấn mạnh ca trực"
            title="Làm nổi bật ca được chọn và làm mờ các ca khác mà không ẩn dòng nhân sự"
          >
            <option value="ALL">Nhấn mạnh: Tất cả ca</option>
            <option value="CA1">Nhấn mạnh: Ca 1 (06:00 – 14:00)</option>
            <option value="CA2">Nhấn mạnh: Ca 2 (14:00 – 22:00)</option>
            <option value="CA3">Nhấn mạnh: Ca 3 (22:00 – 06:00)</option>
            <option value="HC">Nhấn mạnh: Ca HC (07:30 – 16:30)</option>
            <option value="OFF">Nhấn mạnh: Nghỉ tuần (OFF)</option>
            <option value="LEAVE">Nhấn mạnh: Nghỉ phép (PHÉP)</option>
          </select>
        </div>

        {/* Role Filter */}
        <select
          className="roster-filter-select"
          value={filterState.roleFilter}
          onChange={(e) => onChange({ ...filterState, roleFilter: e.target.value })}
          aria-label="Lọc theo vai trò"
        >
          <option value="ALL">Tất cả vai trò</option>
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        {/* Only Conflicts Toggle */}
        <button
          type="button"
          onClick={() => onChange({ ...filterState, onlyConflicts: !filterState.onlyConflicts })}
          className={`admin-filter-chip ${filterState.onlyConflicts ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <AlertCircle size={13} />
          <span>Chỉ xem có xung đột</span>
        </button>

        {/* Quick Reset Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="admin-btn-secondary"
            style={{ fontSize: '11px', height: '28px', padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Xóa toàn bộ tiêu chí lọc"
          >
            <RotateCcw size={12} />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {/* Counter */}
      <div style={{ fontSize: '11.5px', color: 'var(--sgp-ink-muted)', fontVariantNumeric: 'tabular-nums' }}>
        Hiển thị <strong>{filteredUsersCount}</strong> / {totalUsersCount} nhân sự
      </div>
    </div>
  );
};
