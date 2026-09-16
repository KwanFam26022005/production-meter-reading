import React from 'react';
import { MapPin, AlertTriangle, CheckCircle2, Clock, ChevronRight, Zap, Droplets } from 'lucide-react';
import type { MapMeterItem } from '../types';

export interface OperationalListViewProps {
  meters: MapMeterItem[];
  selectedMeterId: string | null;
  onSelectMeter: (meterId: string) => void;
  onInspectReading?: (readingId: string) => void;
  onSwitchToMap?: () => void;
  activeFilterCount?: number;
}

/**
 * OperationalListView — Alternate View Mode of the Operational Console (V13.1 + V16E-S1-R1)
 *
 * Implements:
 * - Authoritative zone labels from presentation zone mapping.
 * - Dynamic units: kWh for electricity, m³ for water.
 * - Utility visual indicators (Zap / Droplets icons).
 * - Mobile card view: replaces horizontal scrolling on narrow screens with ergonomic touch cards.
 */
export const OperationalListView: React.FC<OperationalListViewProps> = ({
  meters,
  selectedMeterId,
  onSelectMeter,
  onInspectReading: _onInspectReading,
  onSwitchToMap: _onSwitchToMap,
  activeFilterCount = 0,
}) => {
  const getStatusBadge = (state: MapMeterItem['semanticState'], label?: string) => {
    switch (state) {
      case 'CONFIRMED':
        return (
          <span className="sgp-list-badge badge-confirmed">
            <CheckCircle2 size={12} className="inline mr-1" />
            {label || 'Đã ghi'}
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="sgp-list-badge badge-overdue">
            <AlertTriangle size={12} className="inline mr-1" />
            {label || 'Quá hạn'}
          </span>
        );
      case 'REVIEW':
        return (
          <span className="sgp-list-badge badge-review">
            <AlertTriangle size={12} className="inline mr-1" />
            {label || 'Cần kiểm tra'}
          </span>
        );
      case 'DUE':
        return (
          <span className="sgp-list-badge badge-due">
            <Clock size={12} className="inline mr-1" />
            {label || 'Đến hạn'}
          </span>
        );
      default:
        return (
          <span className="sgp-list-badge badge-pending">
            {label || 'Chưa ghi'}
          </span>
        );
    }
  };

  const getMeterUnit = (meter: MapMeterItem) => {
    const isWater = meter.utilityType === 'WATER' || meter.meterCode.startsWith('SIM-WM-');
    return isWater ? 'm³' : 'kWh';
  };

  const getUtilityBadge = (meter: MapMeterItem) => {
    const isWater = meter.utilityType === 'WATER' || meter.meterCode.startsWith('SIM-WM-');
    if (isWater) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
          <Droplets size={11} className="text-sky-600" />
          Nước
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
        <Zap size={11} className="text-amber-600" />
        Điện
      </span>
    );
  };

  const countSummaryText =
    activeFilterCount > 0
      ? `${meters.length} công tơ · ${activeFilterCount} bộ lọc`
      : `${meters.length} công tơ`;

  return (
    <div className="sgp-operational-list-view" role="region" aria-label="Danh sách công tơ tác nghiệp">
      {/* Section 14: Compact table heading replacing elevated summary card */}
      <div className="sgp-list-view-header">
        <div className="sgp-list-header-left flex items-center gap-2.5">
          <h2 className="sgp-list-title font-semibold text-slate-800 text-sm">Công tơ</h2>
          <span className="sgp-list-count-badge font-tabular text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {countSummaryText}
          </span>
        </div>
      </div>

      <div className="sgp-list-table-container">
        {meters.length === 0 ? (
          <div className="sgp-list-empty-state">
            <AlertTriangle size={28} className="text-amber-500 mb-2" />
            <p className="font-semibold text-slate-700">Không có công tơ nào khớp với bộ lọc</p>
            <p className="text-sm text-slate-500 mt-1">Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile < md) */}
            <div className="sgp-list-desktop-table overflow-x-auto">
              <table className="sgp-list-table" aria-label="Bảng danh sách công tơ">
                <thead>
                  <tr>
                    <th scope="col">MÃ CÔNG TƠ</th>
                    <th scope="col">LOẠI</th>
                    <th scope="col">TÊN CÔNG TƠ</th>
                    <th scope="col">KHU VỰC</th>
                    <th scope="col">TRẠNG THÁI</th>
                    <th scope="col">CHỈ SỐ GẦN NHẤT</th>
                    <th scope="col" className="w-8 text-right" aria-label="Hành động"></th>
                  </tr>
                </thead>
                <tbody>
                  {meters.map((meter) => {
                    const isSelected = meter.id === selectedMeterId;
                    const unit = getMeterUnit(meter);
                    return (
                      <tr
                        key={meter.id}
                        className={`sgp-list-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => onSelectMeter(meter.id)}
                        tabIndex={0}
                        role="row"
                        aria-selected={isSelected}
                        aria-label={`Công tơ ${meter.meterCode}, ${meter.name}, trạng thái ${meter.stateLabel || meter.semanticState}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectMeter(meter.id);
                          }
                        }}
                      >
                        <td className="font-tabular font-bold text-cyan-900">{meter.meterCode}</td>
                        <td>{getUtilityBadge(meter)}</td>
                        <td>{meter.name}</td>
                        <td>
                          <span className="sgp-list-zone-tag">
                            <MapPin size={11} className="inline mr-1 text-slate-400" />
                            {meter.presentationZoneName || meter.zoneName || meter.zoneId}
                          </span>
                        </td>
                        <td>{getStatusBadge(meter.semanticState, meter.stateLabel)}</td>
                        <td className="font-tabular">
                          {meter.latestReading?.readingValue ? (
                            <span className="font-semibold text-slate-800">
                              {meter.latestReading.readingValue} {unit}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="text-right w-8">
                          <ChevronRight
                            size={16}
                            className="sgp-list-row-chevron text-slate-400 inline-block transition-transform"
                            aria-hidden="true"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Section 21: Clean Cards for small screens) */}
            <div className="sgp-list-mobile-cards">
              {meters.map((meter) => {
                const isSelected = meter.id === selectedMeterId;
                const unit = getMeterUnit(meter);
                return (
                  <div
                    key={meter.id}
                    onClick={() => onSelectMeter(meter.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-400 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {meter.meterCode}
                        </span>
                        {getUtilityBadge(meter)}
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>

                    <div className="text-xs font-medium text-slate-700">
                      {meter.name}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        {meter.presentationZoneName || meter.zoneName || meter.zoneId}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>{getStatusBadge(meter.semanticState, meter.stateLabel)}</div>
                      <div className="text-xs font-tabular">
                        {meter.latestReading?.readingValue ? (
                          <span className="font-bold text-slate-900">
                            {meter.latestReading.readingValue} {unit}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Chưa ghi</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
