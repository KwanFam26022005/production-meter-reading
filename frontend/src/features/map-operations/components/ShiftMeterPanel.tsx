import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronRight,
  Layers,
  MapPin,
  Zap,
  Droplets,
} from 'lucide-react';
import type { MapMeterItem } from '../types';
import {
  SgpSearchField,
  SgpSegmentedControl,
  SgpStatusBadge,
  SgpBadge,
} from '../../../components/ui/SgpPrimitives';

export interface ShiftMeterPanelProps {
  meters: MapMeterItem[];
  selectedMeterId: string | null;
  onSelectMeter: (meterId: string) => void;
  onInspectReading?: (readingId: string) => void;
  onClose: () => void;
  shiftTitle?: string;
  shiftTime?: string;
}

type FilterTab = 'ALL' | 'PENDING' | 'CONFIRMED' | 'REVIEW';

export const ShiftMeterPanel: React.FC<ShiftMeterPanelProps> = ({
  meters,
  selectedMeterId,
  onSelectMeter,
  onInspectReading: _onInspectReading,
  onClose,
  shiftTitle = 'Ca 1',
  shiftTime = '06:00–14:00',
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Counts
  const confirmedCount = useMemo(
    () => meters.filter((m) => m.semanticState === 'CONFIRMED').length,
    [meters]
  );
  const pendingCount = useMemo(
    () => meters.filter((m) => m.semanticState === 'PENDING' || m.semanticState === 'DUE').length,
    [meters]
  );
  const reviewCount = useMemo(
    () => meters.filter((m) => m.semanticState === 'REVIEW' || m.semanticState === 'OVERDUE').length,
    [meters]
  );
  const totalCount = meters.length;
  const progressPercent = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

  // Filtered meters
  const filteredMeters = useMemo(() => {
    return meters.filter((meter) => {
      // Tab filter
      if (activeTab === 'CONFIRMED' && meter.semanticState !== 'CONFIRMED') return false;
      if (activeTab === 'REVIEW' && meter.semanticState !== 'REVIEW' && meter.semanticState !== 'OVERDUE') return false;
      if (activeTab === 'PENDING' && meter.semanticState !== 'PENDING' && meter.semanticState !== 'DUE') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = meter.meterCode.toLowerCase();
        const name = (meter.name || '').toLowerCase();
        const zone = (meter.presentationZoneName || meter.zoneName || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !zone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [meters, activeTab, searchQuery]);

  return (
    <aside
      className="sgp-shift-panel-root"
      role="dialog"
      aria-label="Sổ ca ghi nhận công tơ"
      aria-modal="true"
    >
      {/* 1. FIXED PANEL HEADER */}
      <div className="sgp-shift-panel-header">
        <div>
          <h2 className="sgp-shift-panel-title">Sổ ca</h2>
          <p className="sgp-shift-panel-subtitle">
            {shiftTitle} · {shiftTime}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title="Đóng sổ ca (Esc)"
          aria-label="Đóng sổ ca"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. PROGRESS GAUGE */}
      <div className="sgp-shift-panel-progress-wrap">
        <div className="sgp-shift-panel-prog-meta">
          <span>{confirmedCount} / {totalCount} hoàn tất</span>
          <span className="font-tabular text-slate-500">{progressPercent}%</span>
        </div>
        <div className="sgp-shift-panel-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="sgp-shift-panel-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. FILTER BAR & SEARCH */}
      <div className="sgp-shift-panel-filter-bar">
        <SgpSegmentedControl<FilterTab>
          size="sm"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { id: 'ALL', label: 'Tất cả', count: totalCount },
            { id: 'PENDING', label: 'Chưa ghi', count: pendingCount },
            { id: 'CONFIRMED', label: 'Đã ghi', count: confirmedCount },
            ...(reviewCount > 0 ? [{ id: 'REVIEW' as FilterTab, label: 'Cần chú ý', count: reviewCount }] : []),
          ]}
        />

        <SgpSearchField
          sizeVariant="sm"
          placeholder="Tìm công tơ..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* 4. SCROLLABLE METER LIST CONTAINER */}
      <div className="sgp-shift-panel-list" role="list">
        {filteredMeters.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Layers size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">Không có công tơ nào khớp bộ lọc</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Thử đổi từ khóa hoặc tab trạng thái</p>
          </div>
        ) : (
          filteredMeters.map((meter) => {
            const isSelected = meter.id === selectedMeterId;
            const isWater = meter.utilityType === 'WATER' || meter.meterCode.startsWith('SIM-WM-');
            const zone = meter.presentationZoneName || meter.zoneName || meter.zoneId || 'Khu kỹ thuật';

            return (
              <div
                key={meter.id}
                onClick={() => onSelectMeter(meter.id)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMeter(meter.id);
                  }
                }}
                className={`sgp-shift-meter-card ${isSelected ? 'selected' : ''}`}
              >
                {/* Top Row: Code & Status */}
                <div className="sgp-shift-card-top">
                  <div className="flex items-center gap-1.5">
                    <span className="sgp-shift-card-code">{meter.meterCode}</span>
                    <SgpBadge variant={isWater ? 'cyan' : 'amber'} className="text-[10px] px-1.5 py-0.5">
                      {isWater ? <Droplets size={10} /> : <Zap size={10} />}
                      {isWater ? 'Nước' : 'Điện'}
                    </SgpBadge>
                  </div>
                  <SgpStatusBadge status={meter.semanticState} />
                </div>

                {/* Middle Row: Name */}
                <div className="sgp-shift-card-name truncate" title={meter.name}>
                  {meter.name}
                </div>

                {/* Bottom Row: Zone & Chevron */}
                <div className="sgp-shift-card-bottom">
                  <div className="flex items-center gap-1 truncate max-w-[80%]">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    <span className="truncate">{zone}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. FOOTER TIP */}
      <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center text-[11px] text-slate-400 shrink-0">
        Nhấp công tơ để định vị trên bản đồ
      </div>
    </aside>
  );
};
