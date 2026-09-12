import React, { useState, useEffect, useRef } from 'react';
import { Filter, X, Check } from 'lucide-react';
import { MapFilterOptions, MapOperationalZone, MeterSemanticState } from '../types';
import { User } from '../../../types';

interface FilterPopoverProps {
  filters: MapFilterOptions;
  zones: MapOperationalZone[];
  operators?: User[];
  onApplyFilters: (nextFilters: MapFilterOptions) => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

const STATUS_OPTIONS: { id: MeterSemanticState; label: string; dotClass: string }[] = [
  { id: 'OVERDUE', label: 'Quá hạn lượt', dotClass: 'overdue' },
  { id: 'REVIEW', label: 'Cần kiểm tra', dotClass: 'review' },
  { id: 'DUE', label: 'Đến hạn ca trực', dotClass: 'due' },
  { id: 'PENDING', label: 'Chưa ghi (Chờ giờ)', dotClass: 'pending' },
  { id: 'CONFIRMED', label: 'Đã hoàn thành', dotClass: 'confirmed' },
];

export const FilterPopover: React.FC<FilterPopoverProps> = ({
  filters,
  zones,
  operators = [],
  onApplyFilters,
  isOpen: controlledIsOpen,
  onToggle,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isOpen) : val;
    if (onToggle) {
      onToggle(nextVal);
    } else {
      setInternalOpen(nextVal);
    }
  };
  const containerRef = useRef<HTMLDivElement>(null);

  // Local draft state while popover is open
  const [draftZoneId, setDraftZoneId] = useState(filters.zoneId || 'ALL');
  const [draftOperatorId, setDraftOperatorId] = useState(filters.operatorId || 'ALL');
  const [draftStatuses, setDraftStatuses] = useState<MeterSemanticState[]>(
    filters.statuses || (filters.status && filters.status !== 'ALL' ? [filters.status as MeterSemanticState] : [])
  );
  const [draftMeterType, setDraftMeterType] = useState(filters.meterType || 'ALL');

  // Sync draft when opened
  useEffect(() => {
    if (isOpen) {
      setDraftZoneId(filters.zoneId || 'ALL');
      setDraftOperatorId(filters.operatorId || 'ALL');
      setDraftStatuses(
        filters.statuses || (filters.status && filters.status !== 'ALL' ? [filters.status as MeterSemanticState] : [])
      );
      setDraftMeterType(filters.meterType || 'ALL');
    }
  }, [isOpen, filters]);

  // Handle ESC and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Active filter count
  const activeCount =
    (filters.zoneId && filters.zoneId !== 'ALL' ? 1 : 0) +
    (filters.operatorId && filters.operatorId !== 'ALL' ? 1 : 0) +
    (filters.meterType && filters.meterType !== 'ALL' ? 1 : 0) +
    (filters.statuses && filters.statuses.length > 0 ? filters.statuses.length : filters.status && filters.status !== 'ALL' ? 1 : 0);

  const toggleStatus = (st: MeterSemanticState) => {
    setDraftStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const handleClear = () => {
    setDraftZoneId('ALL');
    setDraftOperatorId('ALL');
    setDraftStatuses([]);
    setDraftMeterType('ALL');
    onApplyFilters({
      ...filters,
      zoneId: 'ALL',
      operatorId: 'ALL',
      status: 'ALL',
      statuses: [],
      meterType: 'ALL',
    });
    setIsOpen(false);
  };

  const handleApply = () => {
    onApplyFilters({
      ...filters,
      zoneId: draftZoneId,
      operatorId: draftOperatorId,
      status: draftStatuses.length === 1 ? draftStatuses[0] : 'ALL',
      statuses: draftStatuses,
      meterType: draftMeterType,
    });
    setIsOpen(false);
  };

  return (
    <div className="sgp-filter-popover-wrapper" ref={containerRef}>
      <button
        type="button"
        className={`sgp-filter-trigger-btn sgp-scene-action-pill ${activeCount > 0 ? 'has-active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Mở bộ lọc dữ liệu"
        aria-expanded={isOpen}
      >
        <Filter size={14} />
        <span>Bộ lọc</span>
        {activeCount > 0 && (
          <span className="sgp-filter-count-badge font-tabular">{activeCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="sgp-filter-popover" role="dialog" aria-label="Bộ lọc công tơ">
          <div className="sgp-fp-header">
            <span className="sgp-fp-title">Bộ lọc công tơ</span>
            <button
              type="button"
              className="sgp-fp-close"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng bộ lọc"
            >
              <X size={15} />
            </button>
          </div>

          <div className="sgp-fp-body">
            {/* 1. Zone filter */}
            <div className="sgp-fp-group">
              <label htmlFor="fp-zone-select" className="sgp-fp-label">Khu vực</label>
              <select
                id="fp-zone-select"
                value={draftZoneId}
                onChange={(e) => setDraftZoneId(e.target.value)}
                className="sgp-fp-select"
              >
                <option value="ALL">Tất cả khu vực ({zones.length})</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.metrics.totalMeters})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Statuses checkboxes */}
            <div className="sgp-fp-group">
              <span className="sgp-fp-label">Trạng thái</span>
              <div className="sgp-fp-checkbox-list">
                {STATUS_OPTIONS.map((opt) => {
                  const isChecked = draftStatuses.includes(opt.id);
                  return (
                    <label key={opt.id} className="sgp-fp-checkbox-item">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStatus(opt.id)}
                        className="sgp-fp-checkbox-input"
                      />
                      <span className={`sgp-css-dot ${opt.dotClass}`} />
                      <span className="sgp-fp-checkbox-label">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Meter type */}
            <div className="sgp-fp-group">
              <span className="sgp-fp-label">Loại công tơ</span>
              <div className="sgp-fp-radio-row">
                <label className="sgp-fp-radio-item">
                  <input
                    type="radio"
                    name="fp-meter-type"
                    checked={draftMeterType === 'ALL'}
                    onChange={() => setDraftMeterType('ALL')}
                  />
                  <span>Tất cả</span>
                </label>
                <label className="sgp-fp-radio-item">
                  <input
                    type="radio"
                    name="fp-meter-type"
                    checked={draftMeterType === 'LCD'}
                    onChange={() => setDraftMeterType('LCD')}
                  />
                  <span>Điện tử (LCD)</span>
                </label>
                <label className="sgp-fp-radio-item">
                  <input
                    type="radio"
                    name="fp-meter-type"
                    checked={draftMeterType === 'MECHANICAL'}
                    onChange={() => setDraftMeterType('MECHANICAL')}
                  />
                  <span>Cơ khí</span>
                </label>
              </div>
            </div>

            {/* 4. Operator */}
            {operators.length > 0 && (
              <div className="sgp-fp-group">
                <label htmlFor="fp-operator-select" className="sgp-fp-label">Người phụ trách</label>
                <select
                  id="fp-operator-select"
                  value={draftOperatorId}
                  onChange={(e) => setDraftOperatorId(e.target.value)}
                  className="sgp-fp-select"
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
          </div>

          <div className="sgp-fp-actions">
            <button
              type="button"
              className="sgp-fp-clear-btn"
              onClick={handleClear}
            >
              Xóa bộ lọc
            </button>
            <button
              type="button"
              className="sgp-fp-apply-btn"
              onClick={handleApply}
            >
              <Check size={14} />
              <span>Áp dụng</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
