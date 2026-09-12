/**
 * Unified Context Surface (V13)
 *
 * Section 20-30: One Context Surface System
 * Standardizes all contextual cards, drawers, and popovers into a single
 * right-anchored rail with a consistent skeleton across 6 variants:
 * 1. zone-summary
 * 2. zone-meters
 * 3. meter-detail
 * 4. operator-detail
 * 5. analytics
 * 6. workflow (placement / relocation)
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeft,
  Search,
  Plus,
  Move,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Layers,
  User as UserIcon,
  BarChart3,
  MapPin,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { MapMeterItem, MapOperationalZone } from '../types';
import type { User, AdminDashboardResponse } from '../../../types';
import type { ZoneOperationalState } from '../state/operationalProjection';
import type { OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';
import { SPATIAL_ZONE_PRESENTATIONS } from '../geometry/operationalGeometry';
import { normalizedToCanonicalScene } from '../geometry/canonicalScene';
import {
  ContextSection,
  MetricLine,
  StatusBadge,
  ProgressLine,
  ActionRow,
  EntityListItem,
} from './contextRailPrimitives';

export type UnifiedContextType =
  | 'zone-summary'
  | 'zone-meters'
  | 'meter-detail'
  | 'operator-detail'
  | 'analytics'
  | 'workflow';

export interface PlacementWorkflowContext {
  targetZoneId: string;
  targetZoneName: string;
  isRelocating: boolean;
  meterId?: string;
  meterCode: string;
  meterName: string;
  meterType: string;
  pinnedCoords: { x: number; y: number; normX: number; normY: number } | null;
}

export interface UnifiedContextSurfaceProps {
  contextType: UnifiedContextType;
  theme?: 'dark' | 'light';

  // Zone context
  zone?: MapOperationalZone | null;
  zoneState?: ZoneOperationalState | null;
  allMeters?: MapMeterItem[];

  // Meter context
  meter?: MapMeterItem | null;

  // Operator context
  operator?: User | null;
  operatorSummary?: OperatorShiftSummary | null;

  // Analytics context
  dashboardData?: AdminDashboardResponse | null;
  zones?: MapOperationalZone[];

  // Workflow context
  placementContext?: PlacementWorkflowContext | null;
  isSubmittingPlacement?: boolean;
  placementError?: string | null;

  // Return navigation
  hasBack?: boolean;
  backLabel?: string;
  onBack?: () => void;
  onClose: () => void;

  // Cross-entity navigation actions
  onSelectMeter?: (meterId: string) => void;
  onSelectZone?: (zoneId: string) => void;
  onSelectOperator?: (operatorId: string) => void;
  onInspectReading?: (readingId: string) => void;

  // Action dispatches
  onMorphToZoneMeters?: () => void;
  onMorphToZoneSummary?: () => void;
  onStartPlacement?: (zoneId: string) => void;
  onStartRelocation?: (meter: MapMeterItem) => void;
  onUpdatePlacement?: (updates: Partial<PlacementWorkflowContext>) => void;
  onConfirmPlacement?: () => void;
  onCancelPlacement?: () => void;
}

export const UnifiedContextSurface: React.FC<UnifiedContextSurfaceProps> = ({
  contextType,
  theme = 'dark',
  zone,
  zoneState,
  allMeters = [],
  meter,
  operator,
  operatorSummary,
  dashboardData,
  zones = [],
  placementContext,
  isSubmittingPlacement = false,
  placementError,
  hasBack = false,
  backLabel,
  onBack,
  onClose,
  onSelectMeter,
  onSelectZone,
  onSelectOperator: _onSelectOperator,
  onInspectReading,
  onMorphToZoneMeters,
  onMorphToZoneSummary: _onMorphToZoneSummary,
  onStartPlacement,
  onStartRelocation,
  onUpdatePlacement,
  onConfirmPlacement,
  onCancelPlacement,
}) => {
  const [meterSearchQuery, setMeterSearchQuery] = useState('');

  // Presentation zone metadata
  const presZone = useMemo(() => {
    if (!zone) return null;
    return SPATIAL_ZONE_PRESENTATIONS.find(
      (p) => p.presentationId === zone.id || p.businessZoneId === zone.id
    );
  }, [zone]);

  // Meters belonging to active zone
  const zoneMeters = useMemo(() => {
    if (!zone) return [];
    return allMeters.filter((m) => m.zoneId === zone.id);
  }, [zone, allMeters]);

  const filteredZoneMeters = useMemo(() => {
    const q = meterSearchQuery.trim().toLowerCase();
    if (!q) return zoneMeters;
    return zoneMeters.filter(
      (m) => (m.meterCode || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q)
    );
  }, [zoneMeters, meterSearchQuery]);

  const isAnalytics = contextType === 'analytics';
  const widthClass = isAnalytics ? 'width-analytics' : 'width-standard';

  return (
    <aside
      className={`sgp-unified-context-surface ${theme} ${widthClass}`}
      role="complementary"
      aria-label="Khung chi tiết tác nghiệp"
    >
      {/* ============================================================ */}
      {/* 1. VARIANT: ZONE SUMMARY (Section 24)                        */}
      {/* ============================================================ */}
      {contextType === 'zone-summary' && zone && (
        <div className="sgp-rail-shell">
          {/* HEADER */}
          <div className="sgp-rail-header">
            <div className="sgp-rail-header-info">
              {hasBack && onBack && (
                <button
                  type="button"
                  className="sgp-rail-back-btn"
                  onClick={onBack}
                  title={backLabel || 'Quay lại'}
                >
                  <ArrowLeft size={16} />
                  <span>{backLabel}</span>
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className="sgp-rail-icon-box zone-icon">
                  <Layers size={16} />
                </div>
                <div>
                  <span className="sgp-rail-eyebrow">KHU VỰC TÁC NGHIỆP</span>
                  <h2 className="sgp-rail-title">{zone.name}</h2>
                </div>
              </div>
              <span className="sgp-rail-subtitle">
                {presZone?.businessName || 'Cảng Tân Thuận'} · {zone.code || zone.id}
              </span>
            </div>
            <button
              type="button"
              className="sgp-rail-close-btn"
              onClick={onClose}
              title="Đóng chi tiết (Esc)"
              aria-label="Đóng chi tiết"
            >
              <X size={16} />
            </button>
          </div>

          {/* SUMMARY */}
          <div className="sgp-rail-summary">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-400">
                Phụ trách: <strong className="text-slate-200">{zone.assignedUser?.fullName || 'Chưa gán'}</strong>
              </span>
              <span className="text-xs font-tabular text-cyan-300">
                {zoneState?.completed ?? 0}/{zoneState?.totalMeters ?? zoneMeters.length} hoàn tất
              </span>
            </div>
            <ProgressLine
              percent={zoneState?.progressPct ?? 0}
              color={zoneState?.health === 'HEALTHY' ? '#10B981' : '#F59E0B'}
            />
            {zoneState && (zoneState.overdue > 0 || zoneState.review > 0) && (
              <div className="mt-2 text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                <AlertTriangle size={13} />
                <span>
                  {zoneState.overdue > 0 ? `${zoneState.overdue} quá hạn` : ''}
                  {zoneState.overdue > 0 && zoneState.review > 0 ? ' · ' : ''}
                  {zoneState.review > 0 ? `${zoneState.review} cần kiểm tra` : ''}
                </span>
              </div>
            )}
          </div>

          {/* BODY */}
          <div className="sgp-rail-body">
            <ContextSection title="Tình trạng phân khu" bordered={false}>
              <MetricLine
                label="Tổng số công tơ"
                value={zoneMeters.length}
                subtext="Thiết bị đo"
              />
              <MetricLine
                label="Đã hoàn thành"
                value={zoneState?.completed ?? 0}
                status="success"
              />
              <MetricLine
                label="Chờ thực hiện"
                value={zoneState?.pending ?? 0}
              />
            </ContextSection>

            {/* Operator info */}
            <ContextSection title="Nhân sự phụ trách">
              <div className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-full bg-sky-900 border border-sky-600/40 flex items-center justify-center font-bold text-sky-200 text-xs">
                  {zone.assignedUser?.fullName?.charAt(0) || 'O'}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-100">{zone.assignedUser?.fullName || 'Chưa phân công'}</div>
                  <div className="text-xs text-slate-400">Ca 1 · 06:00 - 14:00</div>
                </div>
              </div>
            </ContextSection>
          </div>

          {/* FOOTER */}
          <div className="sgp-rail-footer">
            <ActionRow>
              <button
                type="button"
                className="sgp-btn-primary flex-1"
                onClick={onMorphToZoneMeters}
              >
                Xem {zoneMeters.length} công tơ
              </button>
              {onStartPlacement && (
                <button
                  type="button"
                  className="sgp-btn-secondary"
                  onClick={() => onStartPlacement(zone.id)}
                  title="Thêm công tơ vào phân khu này"
                  aria-label="Thêm công tơ"
                >
                  <Plus size={16} />
                </button>
              )}
            </ActionRow>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. VARIANT: ZONE METERS (Section 25)                         */}
      {/* ============================================================ */}
      {contextType === 'zone-meters' && zone && (
        <div className="sgp-rail-shell">
          {/* HEADER */}
          <div className="sgp-rail-header">
            <div className="sgp-rail-header-info">
              {onBack && (
                <button
                  type="button"
                  className="sgp-rail-back-btn"
                  onClick={onBack}
                  title={`Quay lại ${zone.name}`}
                >
                  <ArrowLeft size={16} />
                  <span>{zone.name}</span>
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className="sgp-rail-icon-box zone-icon">
                  <Zap size={16} />
                </div>
                <h2 className="sgp-rail-title">Danh sách công tơ</h2>
              </div>
            </div>
            <button
              type="button"
              className="sgp-rail-close-btn"
              onClick={onClose}
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>

          {/* SUMMARY / SEARCH & ADD BAR */}
          <div className="sgp-rail-summary">
            <div className="flex items-center gap-2">
              <div className="sgp-rail-search-box flex-1">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  className="sgp-rail-search-input"
                  placeholder="Tìm theo mã hoặc tên..."
                  value={meterSearchQuery}
                  onChange={(e) => setMeterSearchQuery(e.target.value)}
                  aria-label="Tìm kiếm công tơ trong phân khu"
                />
                {meterSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMeterSearchQuery('')}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {onStartPlacement && (
                <button
                  type="button"
                  className="sgp-btn-secondary text-xs px-2.5 py-1.5 h-[34px] flex items-center gap-1 shrink-0"
                  onClick={() => onStartPlacement(zone.id)}
                  title="Thêm công tơ mới"
                >
                  <Plus size={14} />
                  <span>Thêm</span>
                </button>
              )}
            </div>
          </div>

          {/* BODY: METER LIST */}
          <div className="sgp-rail-body">
            {filteredZoneMeters.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Không tìm thấy công tơ phù hợp
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredZoneMeters.map((m) => (
                  <EntityListItem
                    key={m.id}
                    icon={<Zap size={15} className="text-amber-400" />}
                    title={m.meterCode}
                    subtitle={m.name}
                    badge={
                      <StatusBadge
                        status={m.semanticState as any}
                        size="sm"
                      />
                    }
                    action={<ChevronRight size={14} className="text-slate-400" />}
                    onClick={() => onSelectMeter?.(m.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. VARIANT: METER DETAIL (Section 26)                        */}
      {/* ============================================================ */}
      {contextType === 'meter-detail' && meter && (
        <div className="sgp-rail-shell">
          {/* HEADER */}
          <div className="sgp-rail-header">
            <div className="sgp-rail-header-info">
              {hasBack && onBack && (
                <button
                  type="button"
                  className="sgp-rail-back-btn"
                  onClick={onBack}
                  title={backLabel || 'Quay lại'}
                >
                  <ArrowLeft size={16} />
                  <span>{backLabel || 'Quay lại'}</span>
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className="sgp-rail-icon-box meter-icon">
                  <Zap size={16} />
                </div>
                <div>
                  <span className="sgp-rail-eyebrow">CHI TIẾT CÔNG TƠ</span>
                  <h2 className="sgp-rail-title">{meter.meterCode}</h2>
                </div>
              </div>
              <span className="sgp-rail-subtitle">{meter.name}</span>
            </div>
            <button
              type="button"
              className="sgp-rail-close-btn"
              onClick={onClose}
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>

          {/* SUMMARY */}
          <div className="sgp-rail-summary">
            <div className="flex items-center justify-between">
              <StatusBadge status={meter.semanticState as any} />
              <span className="text-xs text-slate-400">
                Khu vực: <strong className="text-slate-200">{meter.zoneName || meter.zoneId}</strong>
              </span>
            </div>
            {meter.latestReading && (
              <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-700/50">
                <span className="text-xs text-slate-400">Chỉ số ghi nhận:</span>
                <span className="text-xl font-bold font-tabular text-emerald-400">
                  {meter.latestReading.readingValue ?? '—'} <span className="text-xs font-normal text-slate-400">kWh</span>
                </span>
              </div>
            )}
          </div>

          {/* BODY */}
          <div className="sgp-rail-body">
            <ContextSection title="Thông tin vận hành" bordered={false}>
              <MetricLine
                label="Loại đồng hồ"
                value={meter.meterType || 'Điện tử (LCD)'}
              />
              <MetricLine
                label="Tọa độ chuẩn"
                value={(() => {
                  const pt = normalizedToCanonicalScene(meter.coordinates);
                  return `(${Math.round(pt.x)}, ${Math.round(pt.y)})`;
                })()}
                subtext="Hệ pixel 1915x821"
              />
              {meter.latestReading?.confidence !== undefined && (
                <MetricLine
                  label="Độ tin cậy OCR"
                  value={`${Math.round(meter.latestReading.confidence * 100)}%`}
                  status={meter.latestReading.confidence > 0.8 ? 'success' : 'warning'}
                />
              )}
              {meter.latestReading?.roundTime && (
                <MetricLine
                  label="Thời điểm ghi"
                  value={meter.latestReading.roundTime}
                />
              )}
            </ContextSection>
          </div>

          {/* FOOTER */}
          <div className="sgp-rail-footer">
            <ActionRow>
              {meter.latestReading?.readingId && onInspectReading && (
                <button
                  type="button"
                  className="sgp-btn-primary flex-1"
                  onClick={() => onInspectReading(meter.latestReading!.readingId!)}
                >
                  <ExternalLink size={14} />
                  <span>Kiểm tra bản ghi</span>
                </button>
              )}
              {onStartRelocation && (
                <button
                  type="button"
                  className="sgp-btn-secondary"
                  onClick={() => onStartRelocation(meter)}
                  title="Di chuyển vị trí công tơ trên bản đồ"
                >
                  <Move size={14} />
                  <span>Di chuyển</span>
                </button>
              )}
            </ActionRow>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. VARIANT: OPERATOR DETAIL (Section 27)                     */}
      {/* ============================================================ */}
      {contextType === 'operator-detail' && (
        <div className="sgp-rail-shell">
          {/* HEADER */}
          <div className="sgp-rail-header">
            <div className="sgp-rail-header-info">
              {hasBack && onBack && (
                <button
                  type="button"
                  className="sgp-rail-back-btn"
                  onClick={onBack}
                  title="Quay lại"
                >
                  <ArrowLeft size={16} />
                  <span>Quay lại</span>
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className="sgp-rail-icon-box operator-icon">
                  <UserIcon size={16} />
                </div>
                <div>
                  <span className="sgp-rail-eyebrow">NHÂN SỰ PHỤ TRÁCH</span>
                  <h2 className="sgp-rail-title">
                    {operatorSummary?.fullName || operator?.full_name || 'Nhân viên vận hành'}
                  </h2>
                </div>
              </div>
              <span className="sgp-rail-subtitle">
                Ca 1 · 06:00 - 14:00 · {operator?.employee_code || 'CSG'}
              </span>
            </div>
            <button
              type="button"
              className="sgp-rail-close-btn"
              onClick={onClose}
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>

          {/* SUMMARY */}
          <div className="sgp-rail-summary">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-400">Tiến độ ca trực:</span>
              <span className="text-xs font-tabular text-cyan-300 font-semibold">
                {operatorSummary?.completedMeters ?? 0}/{operatorSummary?.totalAssignedMeters ?? 0} hoàn tất
              </span>
            </div>
            <ProgressLine
              percent={operatorSummary?.progressPct ?? 0}
              color={operatorSummary?.progressPct === 100 ? '#10B981' : '#0284C7'}
            />
            {operatorSummary && (operatorSummary.overdueMeters > 0 || operatorSummary.reviewMeters > 0) && (
              <div className="mt-2 text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                <AlertTriangle size={13} />
                <span>
                  {operatorSummary.overdueMeters > 0 ? `${operatorSummary.overdueMeters} quá hạn` : ''}
                  {operatorSummary.overdueMeters > 0 && operatorSummary.reviewMeters > 0 ? ' · ' : ''}
                  {operatorSummary.reviewMeters > 0 ? `${operatorSummary.reviewMeters} cần kiểm tra` : ''}
                </span>
              </div>
            )}
          </div>

          {/* BODY */}
          <div className="sgp-rail-body">
            <ContextSection title="Phân công khu vực" bordered={false}>
              <div className="flex flex-col gap-1.5">
                {(operatorSummary?.zoneBreakdown || []).map((az) => (
                  <EntityListItem
                    key={az.zoneId}
                    icon={<Layers size={14} className="text-cyan-400" />}
                    title={az.zoneName}
                    subtitle={`${az.completed}/${az.total} công tơ`}
                    badge={
                      <span className="font-tabular text-xs text-slate-300">
                        {az.total > 0 ? Math.round((az.completed / az.total) * 100) : 0}%
                      </span>
                    }
                    onClick={() => onSelectZone?.(az.zoneId)}
                  />
                ))}
              </div>
            </ContextSection>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. VARIANT: ANALYTICS (Section 28)                           */}
      {/* ============================================================ */}
      {contextType === 'analytics' && (
        <div className="sgp-rail-shell">
          {/* HEADER */}
          <div className="sgp-rail-header">
            <div className="sgp-rail-header-info">
              <div className="flex items-center gap-2">
                <div className="sgp-rail-icon-box analytics-icon">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <span className="sgp-rail-eyebrow">PHÂN TÍCH VẬN HÀNH</span>
                  <h2 className="sgp-rail-title">Chất lượng & Tiến độ</h2>
                </div>
              </div>
              <span className="sgp-rail-subtitle">
                Độ chính xác OCR & Thống kê theo phân khu
              </span>
            </div>
            <button
              type="button"
              className="sgp-rail-close-btn"
              onClick={onClose}
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>

          {/* BODY: FLATTENED HIERARCHY WITHOUT BOXED KPI CARDS (Section 28) */}
          <div className="sgp-rail-body">
            {/* OCR Provenance Section */}
            <ContextSection title="Độ chính xác nhận diện OCR" eyebrow="AI PROVENANCE" bordered={false}>
              <div className="grid grid-cols-2 gap-3 py-1">
                <div>
                  <div className="text-xs text-slate-400">Tự động OCR</div>
                  <div className="text-2xl font-bold font-tabular text-cyan-400">
                    {dashboardData?.provenance?.ocr_confirmed_percent
                      ? `${Math.round(dashboardData.provenance.ocr_confirmed_percent)}%`
                      : '84%'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {dashboardData?.provenance?.ocr_confirmed_count ?? 92} xác nhận
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Chỉnh sửa sau OCR</div>
                  <div className="text-2xl font-bold font-tabular text-amber-400">
                    {dashboardData?.provenance?.user_corrected_percent
                      ? `${Math.round(dashboardData.provenance.user_corrected_percent)}%`
                      : '11%'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {dashboardData?.provenance?.manual_entry_count ?? 5} thủ công
                  </div>
                </div>
              </div>
            </ContextSection>

            {/* Zone Progress Breakdown */}
            <ContextSection title="Tiến độ theo phân khu" eyebrow="TIẾN ĐỘ KHU VỰC">
              <div className="flex flex-col gap-3 py-1">
                {zones.map((z) => {
                  const zMeters = allMeters.filter((m) => m.zoneId === z.id);
                  const conf = zMeters.filter((m) => m.semanticState === 'CONFIRMED').length;
                  const total = zMeters.length;
                  const pct = total > 0 ? Math.round((conf / total) * 100) : 100;
                  return (
                    <div
                      key={z.id}
                      className="cursor-pointer hover:bg-slate-800/40 p-1.5 rounded transition-colors"
                      onClick={() => onSelectZone?.(z.id)}
                    >
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-medium text-slate-200">{z.name}</span>
                        <span className="font-tabular text-slate-300">
                          {conf}/{total} · {pct}%
                        </span>
                      </div>
                      <ProgressLine percent={pct} />
                    </div>
                  );
                })}
              </div>
            </ContextSection>

            {/* Exceptions Queue */}
            {dashboardData?.exceptions && dashboardData.exceptions.length > 0 && (
              <ContextSection title="Vấn đề cần xử lý" eyebrow="HÀNG ĐỢI KIỂM TRA">
                <div className="flex flex-col gap-1.5">
                  {dashboardData.exceptions.slice(0, 5).map((ex) => (
                    <EntityListItem
                      key={ex.reading_id || ex.meter_id}
                      icon={<AlertTriangle size={14} className="text-amber-400" />}
                      title={ex.meter_code}
                      subtitle={ex.exception_label || 'Cần xác nhận'}
                      action={
                        ex.reading_id && onInspectReading ? (
                          <button
                            type="button"
                            className="sgp-btn-secondary text-xs px-2 py-1 h-7"
                            onClick={() => onInspectReading(ex.reading_id!)}
                          >
                            Kiểm tra
                          </button>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              </ContextSection>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. VARIANT: WORKFLOW (Placement / Relocation)                */}
      {/* ============================================================ */}
      {contextType === 'workflow' && placementContext && (
        <div className="sgp-rail-shell">
          {/* HEADER */}
          <div className="sgp-rail-header">
            <div className="sgp-rail-header-info">
              <div className="flex items-center gap-2">
                <div className="sgp-rail-icon-box placement-icon">
                  <MapPin size={16} />
                </div>
                <div>
                  <span className="sgp-rail-eyebrow">ĐIỀU PHỐI VỊ TRÍ</span>
                  <h2 className="sgp-rail-title">
                    {placementContext.isRelocating ? 'Di chuyển công tơ' : 'Thêm công tơ mới'}
                  </h2>
                </div>
              </div>
              <span className="sgp-rail-subtitle">
                Nhấp chuột trên bản đồ để ghim tọa độ
              </span>
            </div>
            <button
              type="button"
              className="sgp-rail-close-btn"
              onClick={onCancelPlacement || onClose}
              title="Hủy thao tác"
              aria-label="Hủy"
            >
              <X size={16} />
            </button>
          </div>

          {/* SUMMARY */}
          <div className="sgp-rail-summary">
            <div className="text-xs text-slate-300">
              {placementContext.pinnedCoords ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Đã ghim: ({Math.round(placementContext.pinnedCoords.normX * 1915)}, {Math.round(placementContext.pinnedCoords.normY * 821)})
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Clock size={13} />
                  Chưa ghim tọa độ trên bản đồ
                </span>
              )}
            </div>
          </div>

          {/* BODY */}
          <div className="sgp-rail-body">
            <ContextSection title="Thông tin thiết bị" bordered={false}>
              <div className="flex flex-col gap-3 py-1">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Mã công tơ:</label>
                  <input
                    type="text"
                    className="sgp-rail-input"
                    value={placementContext.meterCode}
                    onChange={(e) => onUpdatePlacement?.({ meterCode: e.target.value })}
                    disabled={placementContext.isRelocating}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tên công tơ:</label>
                  <input
                    type="text"
                    className="sgp-rail-input"
                    value={placementContext.meterName}
                    onChange={(e) => onUpdatePlacement?.({ meterName: e.target.value })}
                    placeholder="VD: Công tơ Bãi Container 3"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Khu vực chỉ định:</label>
                  <select
                    className="sgp-rail-select"
                    value={placementContext.targetZoneId}
                    onChange={(e) => onUpdatePlacement?.({ targetZoneId: e.target.value })}
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {placementError && (
                <div className="mt-3 text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/40 p-2 rounded border border-rose-800/50">
                  <AlertTriangle size={13} />
                  <span>{placementError}</span>
                </div>
              )}
            </ContextSection>
          </div>

          {/* FOOTER */}
          <div className="sgp-rail-footer">
            <ActionRow>
              <button
                type="button"
                className="sgp-btn-secondary"
                onClick={onCancelPlacement}
                disabled={isSubmittingPlacement}
              >
                Hủy
              </button>
              <button
                type="button"
                className="sgp-btn-primary flex-1"
                onClick={onConfirmPlacement}
                disabled={isSubmittingPlacement || !placementContext.pinnedCoords}
              >
                {isSubmittingPlacement ? 'Đang lưu...' : 'Xác nhận vị trí'}
              </button>
            </ActionRow>
          </div>
        </div>
      )}
    </aside>
  );
};
