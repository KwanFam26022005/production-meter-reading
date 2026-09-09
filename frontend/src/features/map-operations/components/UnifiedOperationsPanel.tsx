import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  AlertTriangle,
  FileCheck,
  UserCheck,
  Check,
  Loader2,
} from 'lucide-react';
import {
  MapMeterItem,
  MapOperationalZone,
  MapFilterOptions,
} from '../types';
import { User as UserType, AdminDashboardRoundProgress } from '../../../types';
import { FilterPopover } from './FilterPopover';
import { CurrentRoundControl } from './CurrentRoundControl';
import { projectAllZonesOperationalState } from '../state/operationalProjection';
import { SEMANTIC_STATE_CONFIG } from '../utils/mapStatus';

interface UnifiedOperationsPanelProps {
  zones: MapOperationalZone[];
  meters: MapMeterItem[];
  filteredMeters: MapMeterItem[];
  selectedZoneId: string | null;
  selectedMeterId: string | null;
  filters: MapFilterOptions;
  operators: UserType[];
  rounds: AdminDashboardRoundProgress[];
  currentRoundTime?: string | null;
  currentRoundStatus?: string | null;
  selectedRoundId?: string;
  onSelectZone: (zoneId: string | null) => void;
  onSelectMeter: (meterId: string | null) => void;
  onFilterChange: (nextFilters: MapFilterOptions) => void;
  onSelectRound: (roundId: string) => void;
  onInspectReading?: (readingId: string) => void;
  onReassignOperator?: (zoneId: string, userId: string, note?: string) => Promise<void>;
}

export const UnifiedOperationsPanel: React.FC<UnifiedOperationsPanelProps> = ({
  zones,
  meters,
  filteredMeters,
  selectedZoneId,
  selectedMeterId,
  filters,
  operators,
  rounds,
  currentRoundTime,
  currentRoundStatus,
  selectedRoundId,
  onSelectZone,
  onSelectMeter,
  onFilterChange,
  onSelectRound,
  onInspectReading,
  onReassignOperator,
}) => {
  // Reassign state in zone context
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassignSaving, setReassignSaving] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState<string | null>(null);

  // Operational states for all zones
  const zoneStates = useMemo(() => {
    return projectAllZonesOperationalState(zones, meters);
  }, [zones, meters]);

  // Active Zone & Meter objects
  const activeZone = useMemo(() => {
    if (!selectedZoneId) return null;
    return zones.find((z) => z.id === selectedZoneId) || null;
  }, [zones, selectedZoneId]);

  const activeMeter = useMemo(() => {
    if (!selectedMeterId) return null;
    return meters.find((m) => m.id === selectedMeterId) || null;
  }, [meters, selectedMeterId]);

  // Meters for active zone
  const activeZoneMeters = useMemo(() => {
    if (!selectedZoneId) return [];
    return filteredMeters.filter((m) => m.zoneId === selectedZoneId);
  }, [filteredMeters, selectedZoneId]);

  const handleExecuteReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZoneId || !reassignUserId || !onReassignOperator) return;
    setReassignSaving(true);
    try {
      await onReassignOperator(selectedZoneId, reassignUserId);
      setReassignSuccess('Đã cập nhật phụ trách!');
      setIsReassigning(false);
      setTimeout(() => setReassignSuccess(null), 3000);
    } catch {
      // error handled in hook
    } finally {
      setReassignSaving(false);
    }
  };

  // =========================================================================
  // VIEW 3: METER CONTEXT (Merged Operational + Asset Inspection)
  // =========================================================================
  if (activeMeter) {
    const stCfg = SEMANTIC_STATE_CONFIG[activeMeter.semanticState];
    const reading = activeMeter.latestReading;
    const parentZone = zones.find((z) => z.id === activeMeter.zoneId);

    return (
      <aside className="sgp-unified-panel meter-context" aria-label="Chi tiết công tơ">
        {/* Navigation header */}
        <div className="sgp-up-header">
          <button
            type="button"
            className="sgp-up-back-btn"
            onClick={() => onSelectMeter(null)}
            title="Quay lại khu vực"
          >
            <ChevronLeft size={16} />
            <span>{parentZone?.shortName || parentZone?.name || 'Khu vực'}</span>
          </button>
        </div>

        <div className="sgp-up-body">
          {/* Meter Code & Name */}
          <div className="sgp-up-title-block">
            <div className="sgp-up-badge-row">
              <span className="sgp-up-code font-tabular font-bold">{activeMeter.meterCode}</span>
              <span className={`sgp-badge-tag ${stCfg.style.badgeClass}`}>
                {stCfg.label}
              </span>
            </div>
            <h2 className="sgp-up-meter-name">{activeMeter.name}</h2>
          </div>

          {/* Exception Notice if present */}
          {activeMeter.exceptionDetail && (
            <div className="sgp-up-exception-box">
              <AlertTriangle size={14} color="#D97706" />
              <span>{activeMeter.exceptionDetail.exception_label}</span>
            </div>
          )}

          {/* SECTION 1: VẬN HÀNH (OPERATIONAL DATA) */}
          <div className="sgp-up-section">
            <div className="sgp-up-section-title">VẬN HÀNH</div>
            <div className="sgp-up-kv-grid">
              <div className="sgp-up-kv">
                <span className="sgp-up-k">Trạng thái</span>
                <span className="sgp-up-v font-semibold" style={{ color: stCfg.style.stroke }}>
                  {stCfg.label}
                </span>
              </div>
              <div className="sgp-up-kv">
                <span className="sgp-up-k">Ca trực</span>
                <span className="sgp-up-v font-tabular font-semibold">
                  {currentRoundTime ? `Ca ${currentRoundTime}` : 'Đang mở'}
                </span>
              </div>
              <div className="sgp-up-kv">
                <span className="sgp-up-k">Người phụ trách</span>
                <span className="sgp-up-v">
                  {parentZone?.assignedUser?.fullName || 'Chưa phân công'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: TÀI SẢN (ASSET DATA) */}
          <div className="sgp-up-section">
            <div className="sgp-up-section-title">TÀI SẢN THIẾT BỊ</div>
            <div className="sgp-up-kv-grid">
              <div className="sgp-up-kv">
                <span className="sgp-up-k">Loại</span>
                <span className="sgp-up-v font-semibold">
                  {activeMeter.meterType === 'LCD' ? 'Điện tử (LCD)' : 'Cơ khí'}
                </span>
              </div>
              <div className="sgp-up-kv">
                <span className="sgp-up-k">Vị trí</span>
                <span className="sgp-up-v">{activeMeter.location}</span>
              </div>
              <div className="sgp-up-kv">
                <span className="sgp-up-k">Chỉ số gần nhất</span>
                <span className="sgp-up-v font-tabular font-bold text-brand">
                  {reading?.readingValue ? `${reading.readingValue} kWh` : '—'}
                </span>
              </div>
              {reading?.serverTimestamp && (
                <div className="sgp-up-kv">
                  <span className="sgp-up-k">Ghi nhận lúc</span>
                  <span className="sgp-up-v font-tabular">{reading.serverTimestamp}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action: Xem bản ghi */}
          {reading?.readingId && onInspectReading && (
            <div className="sgp-up-actions">
              <button
                type="button"
                className="sgp-up-inspect-btn"
                onClick={() => onInspectReading(reading.readingId!)}
              >
                <FileCheck size={14} />
                <span>Xem bản ghi / Minh chứng OCR</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // =========================================================================
  // VIEW 2: ZONE CONTEXT (Drill-down into specific zone)
  // =========================================================================
  if (activeZone) {
    const opState = zoneStates[activeZone.id];

    return (
      <aside className="sgp-unified-panel zone-context" aria-label="Chi tiết khu vực">
        {/* Navigation header */}
        <div className="sgp-up-header">
          <button
            type="button"
            className="sgp-up-back-btn"
            onClick={() => onSelectZone(null)}
            title="Quay lại tất cả khu vực"
          >
            <ChevronLeft size={16} />
            <span>Tất cả khu vực</span>
          </button>
        </div>

        <div className="sgp-up-body">
          {/* Zone Title & Metrics */}
          <div className="sgp-up-title-block">
            <span className="sgp-up-tag">{activeZone.code}</span>
            <h2 className="sgp-up-zone-name">{activeZone.name}</h2>
          </div>

          {/* Progress & Health Bar */}
          {opState && (
            <div className="sgp-up-progress-box">
              <div className="sgp-up-pb-header">
                <span className="font-tabular font-bold text-brand">{opState.progressPct}%</span>
                <span className="font-tabular text-muted">
                  {opState.completed}/{opState.totalMeters} hoàn tất
                </span>
                {opState.health === 'CRITICAL' && (
                  <span className="sgp-up-alert-chip critical">⚠ {opState.overdue} quá hạn</span>
                )}
                {opState.health === 'ATTENTION' && (
                  <span className="sgp-up-alert-chip attention">⚠ {opState.review} cần duyệt</span>
                )}
                {opState.health === 'HEALTHY' && (
                  <span className="sgp-up-alert-chip healthy">✓ Bình thường</span>
                )}
              </div>
              <div className="sgp-up-track">
                <div
                  className="sgp-up-fill"
                  style={{
                    width: `${opState.progressPct}%`,
                    backgroundColor: opState.progressPct === 100 ? '#10B981' : '#0B4F75',
                  }}
                />
              </div>
            </div>
          )}

          {/* Responsible Operator Block */}
          <div className="sgp-up-operator-box">
            <div className="sgp-up-ob-header">
              <div className="sgp-up-ob-left">
                <UserCheck size={14} color="#0B4F75" />
                <span className="sgp-up-ob-lbl">Người phụ trách</span>
              </div>
              {onReassignOperator && !isReassigning && (
                <button
                  type="button"
                  className="sgp-up-reassign-trigger"
                  onClick={() => {
                    setReassignUserId(activeZone.assignedUser?.id || '');
                    setIsReassigning(true);
                  }}
                >
                  Đổi
                </button>
              )}
            </div>

            {!isReassigning ? (
              <div className="sgp-up-ob-val font-semibold">
                {activeZone.assignedUser?.fullName || 'Chưa phân công nhân sự'}
              </div>
            ) : (
              <form onSubmit={handleExecuteReassign} className="sgp-up-reassign-form">
                <select
                  value={reassignUserId}
                  onChange={(e) => setReassignUserId(e.target.value)}
                  className="sgp-up-reassign-select"
                  autoFocus
                >
                  <option value="">-- Chọn nhân sự điều hành --</option>
                  {operators.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.employee_code || u.role})
                    </option>
                  ))}
                </select>
                <div className="sgp-up-reassign-actions">
                  <button
                    type="button"
                    className="sgp-up-ra-cancel"
                    onClick={() => setIsReassigning(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="sgp-up-ra-submit"
                    disabled={reassignSaving || !reassignUserId}
                  >
                    {reassignSaving ? <Loader2 size={12} className="sgp-spin" /> : <Check size={12} />}
                    <span>Lưu</span>
                  </button>
                </div>
              </form>
            )}

            {reassignSuccess && (
              <div className="sgp-up-success-note">
                <span>{reassignSuccess}</span>
              </div>
            )}
          </div>

          {/* Meter List in this Zone */}
          <div className="sgp-up-meter-list-box">
            <div className="sgp-up-mlb-header">
              <span>CÔNG TƠ ({activeZoneMeters.length})</span>
            </div>

            <div className="sgp-up-meter-items">
              {activeZoneMeters.map((m) => {
                const stCfg = SEMANTIC_STATE_CONFIG[m.semanticState];
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="sgp-up-meter-row"
                    onClick={() => onSelectMeter(m.id)}
                  >
                    <div className="sgp-up-mr-left">
                      <span className="font-tabular font-bold text-brand">{m.meterCode}</span>
                      <span className="sgp-up-mr-name">{m.name}</span>
                    </div>
                    <div className="sgp-up-mr-right font-tabular">
                      <span className={`sgp-badge-tag ${stCfg.style.badgeClass}`}>
                        {stCfg.shortLabel}
                      </span>
                      {m.latestReading?.readingValue && (
                        <span className="sgp-up-mr-val">{m.latestReading.readingValue} kWh</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // VIEW 1: ROOT STATE (Vận hành & tài sản)
  // =========================================================================
  return (
    <aside className="sgp-unified-panel root-state" aria-label="Bảng điều hành và danh mục khu vực">
      {/* Search & Filter Bar */}
      <div className="sgp-up-search-row">
        <div className="sgp-up-search-box">
          <Search size={14} className="sgp-up-search-icon" />
          <input
            type="text"
            placeholder="Tìm công tơ, vị trí, khu vực..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="sgp-up-search-input"
          />
          {filters.searchQuery && (
            <button
              type="button"
              className="sgp-up-clear-search"
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              aria-label="Xóa tìm kiếm"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <FilterPopover
          filters={filters}
          zones={zones}
          operators={operators}
          onApplyFilters={onFilterChange}
        />
      </div>

      {/* Current Round Control */}
      <CurrentRoundControl
        rounds={rounds}
        currentRoundTime={currentRoundTime}
        currentRoundStatus={currentRoundStatus}
        selectedRoundId={selectedRoundId}
        onSelectRound={onSelectRound}
      />

      {/* Section: Khu Vực */}
      <div className="sgp-up-zones-section">
        <div className="sgp-up-zs-header">
          <span>KHU VỰC TÁC NGHIỆP ({zones.length})</span>
        </div>

        <div className="sgp-up-zones-list">
          {zones.map((z) => {
            const opState = zoneStates[z.id];
            if (!opState) return null;

            return (
              <button
                key={z.id}
                type="button"
                className={`sgp-up-zone-row ${opState.health.toLowerCase()}`}
                onClick={() => onSelectZone(z.id)}
              >
                <div className="sgp-up-zr-top">
                  <span className="sgp-up-zr-name font-bold">{z.shortName || z.name}</span>
                  {opState.health === 'CRITICAL' && (
                    <span className="sgp-up-health-pill critical">⚠ {opState.overdue} quá hạn</span>
                  )}
                  {opState.health === 'ATTENTION' && (
                    <span className="sgp-up-health-pill attention">⚠ {opState.review} cần duyệt</span>
                  )}
                  {opState.health === 'HEALTHY' && (
                    <span className="sgp-up-health-pill healthy">✓ Bình thường</span>
                  )}
                </div>

                {/* Progress bar + fraction */}
                <div className="sgp-up-zr-bottom">
                  <div className="sgp-up-zr-track">
                    <div
                      className="sgp-up-zr-fill"
                      style={{
                        width: `${opState.progressPct}%`,
                        backgroundColor: opState.progressPct === 100 ? '#10B981' : '#0B4F75',
                      }}
                    />
                  </div>
                  <span className="sgp-up-zr-stats font-tabular">
                    <strong>{opState.progressPct}%</strong> · {opState.completed}/{opState.totalMeters}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
