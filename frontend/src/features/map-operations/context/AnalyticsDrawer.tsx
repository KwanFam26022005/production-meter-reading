import React from 'react';
import { X, Sparkles, AlertTriangle, BarChart3, ChevronRight, MapPin } from 'lucide-react';
import type { AdminDashboardResponse } from '../../../types';
import type { MapOperationalZone } from '../types';

interface AnalyticsDrawerProps {
  dashboardData: AdminDashboardResponse | null;
  zones: MapOperationalZone[];
  onClose: () => void;
  onInspectReading?: (readingId: string) => void;
  onSelectZone?: (zoneId: string) => void;
}

/**
 * @deprecated V13.1 — Deactivated from active Map Operations runtime.
 * Analytics is now exclusively provided by UnifiedContextSurface (variant='analytics').
 * This component is retained for backward-compatibility test exports only.
 */
export const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({
  dashboardData,
  zones,
  onClose,
  onInspectReading,
  onSelectZone,
}) => {
  const provenance = dashboardData?.provenance;
  const exceptions = dashboardData?.exceptions || [];

  return (
    <aside
      className="sgp-side-drawer sgp-analytics-drawer"
      role="dialog"
      aria-label="Phân tích chất lượng vận hành và tiến độ chi tiết"
      aria-modal="true"
    >
      {/* 1. DRAWER HEADER */}
      <div className="sgp-drawer-header">
        <div className="flex items-center gap-2.5">
          <div className="sgp-drawer-icon-badge">
            <BarChart3 size={16} className="text-sky-600" />
          </div>
          <div className="sgp-drawer-title-group">
            <span className="sgp-drawer-eyebrow">PHÂN TÍCH VẬN HÀNH</span>
            <h2 className="sgp-drawer-title">Chất lượng & Tiến độ</h2>
          </div>
        </div>
        <button
          type="button"
          className="sgp-drawer-close-btn"
          onClick={onClose}
          aria-label="Đóng bảng phân tích"
          title="Đóng bảng phân tích (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. DRAWER BODY */}
      <div className="sgp-drawer-content">
        {/* QUALITY STATS GRID */}
        <section className="sgp-analytics-section" aria-labelledby="analytics-quality-heading">
          <h3 id="analytics-quality-heading" className="sgp-section-heading">
            <Sparkles size={14} className="text-cyan-600 inline mr-1" />
            ĐỘ CHÍNH XÁC NHẬN DIỆN AI
          </h3>

          <div className="sgp-quality-grid">
            <div className="sgp-quality-card">
              <span className="sgp-q-label">Tỷ lệ tự động OCR</span>
              <span className="sgp-q-val text-cyan-700 font-tabular">
                {provenance ? `${Math.round(provenance.ocr_confirmed_percent)}%` : '96%'}
              </span>
              <span className="sgp-q-sub">Tự động nhận diện</span>
            </div>

            <div className="sgp-quality-card">
              <span className="sgp-q-label">Chỉnh sửa sau OCR</span>
              <span className="sgp-q-val text-amber-600 font-tabular">
                {provenance ? `${Math.round(provenance.user_corrected_percent)}%` : '4%'}
              </span>
              <span className="sgp-q-sub">Kiểm tra & xác nhận lại</span>
            </div>

            <div className="sgp-quality-card">
              <span className="sgp-q-label">Xác nhận tự động</span>
              <span className="sgp-q-val text-emerald-600 font-tabular">
                {provenance?.ocr_confirmed_count ?? 12}
              </span>
              <span className="sgp-q-sub">Khớp ngưỡng OCR cao</span>
            </div>

            <div className="sgp-quality-card">
              <span className="sgp-q-label">Nhập thủ công</span>
              <span className="sgp-q-val text-slate-600 font-tabular">
                {provenance?.manual_entry_count ?? 0}
              </span>
              <span className="sgp-q-sub">Ghi nhận trực tiếp</span>
            </div>
          </div>
        </section>

        {/* LOCATION / ZONE PROGRESS */}
        <section className="sgp-analytics-section" aria-labelledby="analytics-progress-heading">
          <h3 id="analytics-progress-heading" className="sgp-section-heading">
            <BarChart3 size={14} className="text-cyan-600 inline mr-1" />
            TIẾN ĐỘ THEO KHU VỰC
          </h3>

          <div className="sgp-zone-progress-list">
            {zones.map((zone) => {
              const total = zone.metrics?.totalMeters ?? 0;
              const confirmed = zone.metrics?.confirmedCount || 0;
              const hasMeters = total > 0;
              const pct = hasMeters ? Math.round((confirmed / total) * 100) : null;
              const statusText = hasMeters ? `${confirmed}/${total} · ${pct}%` : 'Không có công tơ';

              return (
                <div
                  key={zone.id}
                  className="sgp-zone-progress-item"
                  onClick={() => onSelectZone?.(zone.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="sgp-zp-header">
                    <span className="sgp-zp-name">
                      <MapPin size={12} className="inline mr-1 text-slate-400" />
                      {zone.name}
                    </span>
                    <span className="sgp-zp-count font-tabular">
                      {statusText}
                    </span>
                  </div>
                  <div className="sgp-zp-bar-track">
                    {hasMeters ? (
                      <div
                        className="sgp-zp-bar-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: zone.primaryColor || '#0284c7',
                        }}
                      />
                    ) : (
                      <div className="sgp-zp-bar-empty" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* EXCEPTIONS SHORTCUT LIST */}
        {exceptions.length > 0 && (
          <section className="sgp-analytics-section" aria-labelledby="analytics-exceptions-heading">
            <h3 id="analytics-exceptions-heading" className="sgp-section-heading">
              <AlertTriangle size={14} className="text-amber-500 inline mr-1" />
              DANH SÁCH NGOẠI LỆ ({exceptions.length})
            </h3>

            <div className="sgp-exceptions-mini-list">
              {exceptions.map((exc) => (
                <div
                  key={`${exc.meter_id}-${exc.round_id}`}
                  className="sgp-exception-mini-card"
                  onClick={() => exc.reading_id && onInspectReading?.(exc.reading_id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="sgp-emc-left">
                    <span className="sgp-emc-code font-tabular">{exc.meter_code}</span>
                    <span className="sgp-emc-reason">{exc.exception_label}</span>
                  </div>
                  <div className="sgp-emc-right">
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
