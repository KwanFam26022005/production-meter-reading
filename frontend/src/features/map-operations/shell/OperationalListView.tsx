import React from 'react';
import { Eye, MapPin, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { MapMeterItem } from '../types';

interface OperationalListViewProps {
  meters: MapMeterItem[];
  selectedMeterId: string | null;
  onSelectMeter: (meterId: string) => void;
  onInspectReading?: (readingId: string) => void;
  onSwitchToMap: () => void;
}

/**
 * OperationalListView — Alternate View Mode of the Operational Console (Section 7)
 *
 * Displays the current filtered meter operations state in an operational list/table:
 * - Preserves date, round, zone, status, and search filters
 * - Shows semantic status badges, zone tags, and latest reading values
 * - Allows quick inspection and switching back to map
 */
export const OperationalListView: React.FC<OperationalListViewProps> = ({
  meters,
  selectedMeterId,
  onSelectMeter,
  onInspectReading,
  onSwitchToMap,
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

  return (
    <div className="sgp-operational-list-view" role="region" aria-label="Danh sách công tơ tác nghiệp">
      <div className="sgp-list-view-header">
        <div className="sgp-list-header-left">
          <span className="sgp-list-count-badge font-tabular">
            {meters.length} công tơ trong phạm vi lọc
          </span>
        </div>
        <div className="sgp-list-header-right">
          <button
            type="button"
            className="sgp-list-switch-map-btn"
            onClick={onSwitchToMap}
          >
            Xem trên bản đồ
          </button>
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
          <table className="sgp-list-table" aria-label="Bảng danh sách công tơ">
            <thead>
              <tr>
                <th scope="col">MÃ CÔNG TƠ</th>
                <th scope="col">TÊN CÔNG TƠ</th>
                <th scope="col">KHU VỰC</th>
                <th scope="col">TRẠNG THÁI</th>
                <th scope="col">CHỈ SỐ GẦN NHẤT</th>
                <th scope="col" className="text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {meters.map((meter) => {
                const isSelected = meter.id === selectedMeterId;
                return (
                  <tr
                    key={meter.id}
                    className={`sgp-list-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectMeter(meter.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectMeter(meter.id);
                      }
                    }}
                  >
                    <td className="font-tabular font-bold text-cyan-900">{meter.meterCode}</td>
                    <td>{meter.name}</td>
                    <td>
                      <span className="sgp-list-zone-tag">
                        <MapPin size={11} className="inline mr-1 text-slate-400" />
                        {meter.zoneName || meter.zoneId}
                      </span>
                    </td>
                    <td>{getStatusBadge(meter.semanticState, meter.stateLabel)}</td>
                    <td className="font-tabular">
                      {meter.latestReading?.readingValue ? (
                        <span className="font-semibold text-slate-800">
                          {meter.latestReading.readingValue} kWh
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="sgp-list-inspect-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (meter.latestReading?.readingId && onInspectReading) {
                            onInspectReading(meter.latestReading.readingId);
                          } else {
                            onSelectMeter(meter.id);
                          }
                        }}
                        title="Xem chi tiết"
                        aria-label={`Xem chi tiết ${meter.meterCode}`}
                      >
                        <Eye size={14} />
                        <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
