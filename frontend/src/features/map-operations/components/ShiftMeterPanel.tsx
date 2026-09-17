import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Zap,
  Droplets,
  Layers,
} from 'lucide-react';
import type { MapMeterItem } from '../types';

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
  shiftTime = '06:00 - 14:00',
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
  const reviewCount = useMemo(
    () => meters.filter((m) => m.semanticState === 'REVIEW' || m.semanticState === 'OVERDUE').length,
    [meters]
  );
  const pendingCount = useMemo(
    () => meters.filter((m) => m.semanticState === 'PENDING' || m.semanticState === 'DUE').length,
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

  const getStatusBadge = (state: MapMeterItem['semanticState'], label?: string) => {
    switch (state) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 size={11} className="text-emerald-600" />
            {label || 'Đã ghi'}
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <AlertTriangle size={11} className="text-rose-600" />
            {label || 'Quá hạn'}
          </span>
        );
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <AlertTriangle size={11} className="text-amber-600" />
            {label || 'Cần kiểm tra'}
          </span>
        );
      case 'DUE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            <Clock size={11} className="text-sky-600" />
            {label || 'Đến hạn'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {label || 'Chưa ghi'}
          </span>
        );
    }
  };

  const getUtilityBadge = (meter: MapMeterItem) => {
    const isWater = meter.utilityType === 'WATER' || meter.meterCode.startsWith('SIM-WM-');
    if (isWater) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
          <Droplets size={10} className="text-sky-600" />
          Nước
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
        <Zap size={10} className="text-amber-600" />
        Điện
      </span>
    );
  };

  const getMeterUnit = (meter: MapMeterItem) => {
    const isWater = meter.utilityType === 'WATER' || meter.meterCode.startsWith('SIM-WM-');
    return isWater ? 'm³' : 'kWh';
  };

  return (
    <div
      className="sgp-shift-meter-panel-container fixed inset-y-0 right-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label="Sổ ca ghi tác nghiệp công tơ"
    >
      {/* Backdrop for click outside */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Slide-over Panel */}
      <div className="sgp-shift-meter-panel relative ml-auto w-full max-w-[420px] bg-white shadow-2xl flex flex-col h-full z-10 border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-800">
                <Clock size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Sổ Ca Ghi Tác Nghiệp</h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{shiftTitle}</span>
                  <span>·</span>
                  <span>{shiftTime}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              aria-label="Đóng sổ ca ghi"
              title="Đóng (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">Tiến độ ca trực</span>
              <span className="font-tabular font-bold text-slate-800">
                {confirmedCount}/{totalCount} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mt-3">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã hoặc tên công tơ..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              className={`px-2 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-cyan-900 text-white shadow-sm'
                  : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => setActiveTab('ALL')}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              className={`px-2 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'PENDING'
                  ? 'bg-cyan-900 text-white shadow-sm'
                  : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => setActiveTab('PENDING')}
            >
              Chưa ghi ({pendingCount})
            </button>
            <button
              type="button"
              className={`px-2 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === 'CONFIRMED'
                  ? 'bg-cyan-900 text-white shadow-sm'
                  : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => setActiveTab('CONFIRMED')}
            >
              Đã ghi ({confirmedCount})
            </button>
            {reviewCount > 0 && (
              <button
                type="button"
                className={`px-2 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'REVIEW'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
                onClick={() => setActiveTab('REVIEW')}
              >
                Cần kiểm tra ({reviewCount})
              </button>
            )}
          </div>
        </div>

        {/* Meter List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredMeters.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Layers size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Không có công tơ nào khớp bộ lọc</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Thử đổi từ khóa hoặc tab trạng thái</p>
            </div>
          ) : (
            filteredMeters.map((meter) => {
              const isSelected = meter.id === selectedMeterId;
              const unit = getMeterUnit(meter);
              return (
                <div
                  key={meter.id}
                  onClick={() => onSelectMeter(meter.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMeter(meter.id);
                    }
                  }}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-cyan-50/90 border-cyan-400 shadow-sm ring-1 ring-cyan-400'
                      : 'bg-white border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-tabular font-bold text-xs text-slate-900">
                        {meter.meterCode}
                      </span>
                      {getUtilityBadge(meter)}
                    </div>
                    {getStatusBadge(meter.semanticState, meter.stateLabel)}
                  </div>

                  <div className="mt-1 text-xs text-slate-700 font-medium truncate">
                    {meter.name}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-1 truncate max-w-[65%]">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        {meter.presentationZoneName || meter.zoneName || meter.zoneId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {meter.latestReading?.readingValue ? (
                        <span className="font-tabular font-bold text-slate-800">
                          {meter.latestReading.readingValue} {unit}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có chỉ số</span>
                      )}
                      <ChevronRight size={13} className="text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500 shrink-0">
          Chọn công tơ để tự động phóng to vị trí trên bản đồ
        </div>
      </div>
    </div>
  );
};
