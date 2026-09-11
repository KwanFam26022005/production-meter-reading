import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeft,
  Search,
  Plus,
  Move,
  AlertTriangle,
  RotateCcw,
  Check,
  MapPin,
} from 'lucide-react';
import { MAP_Z_INDEX } from '../tokens/mapDesignTokens';
import type { MapMeterItem, MapOperationalZone } from '../types';
import type { User } from '../../../types';
import type { ZoneOperationalState } from '../state/operationalProjection';
import type { OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';
import { SPATIAL_ZONE_PRESENTATIONS } from '../geometry/operationalGeometry';

export type MapContextRailVariant =
  | 'zone-detail'
  | 'operator-detail'
  | 'meter-detail'
  | 'meter-placement';

export interface MapContextRailProps {
  variant: MapContextRailVariant;
  // Entity data
  zone?: MapOperationalZone;
  allMeters?: MapMeterItem[];
  zoneState?: ZoneOperationalState;
  operator?: User | null;
  operatorSummary?: OperatorShiftSummary | null;
  meter?: MapMeterItem;
  // Placement data
  placementContext?: {
    targetZoneId: string;
    targetZoneName: string;
    isRelocating: boolean;
    meterId?: string;
    meterCode: string;
    meterName: string;
    meterType: string;
    pinnedCoords: { x: number; y: number; normX: number; normY: number } | null;
  } | null;
  zones?: MapOperationalZone[];
  isSubmittingPlacement?: boolean;
  placementError?: string | null;
  // Actions
  onBack: () => void;
  onClose: () => void;
  onSelectMeter?: (meterId: string) => void;
  onInspectReading?: (meterId: string) => void;
  onStartPlacement?: (zoneId: string) => void;
  onStartRelocation?: (meter: MapMeterItem) => void;
  onUpdatePlacement?: (updates: {
    meterCode?: string;
    meterName?: string;
    meterType?: string;
    targetZoneId?: string;
    targetZoneName?: string;
  }) => void;
  onResetPin?: () => void;
  onConfirmPlacement?: () => void;
  onCancelPlacement?: () => void;
}

export const MapContextRail: React.FC<MapContextRailProps> = ({
  variant,
  zone,
  allMeters = [],
  zoneState,
  operator,
  operatorSummary,
  meter,
  placementContext,
  zones = [],
  isSubmittingPlacement = false,
  placementError,
  onBack,
  onClose,
  onSelectMeter,
  onInspectReading: _onInspectReading,
  onStartPlacement,
  onStartRelocation,
  onUpdatePlacement,
  onResetPin,
  onConfirmPlacement,
  onCancelPlacement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Resolve presentation zone
  const presZone =
    zone &&
    SPATIAL_ZONE_PRESENTATIONS.find(
      (p) => p.presentationId === zone.id || p.businessZoneId === zone.id
    );

  // Filter meters in zone
  const zoneMeters = useMemo(() => {
    if (!zone) return [];
    let list = allMeters.filter((m) => m.zoneId === zone.id);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.meterCode.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allMeters, zone, searchQuery]);

  return (
    <aside
      className="sgp-map-context-rail"
      role="complementary"
      aria-label={`Context Rail: ${variant}`}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'var(--sgp-rail-width, 360px)',
        maxWidth: '100vw',
        background: '#FFFFFF',
        borderLeft: '1px solid #CBD5E1',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
        zIndex: MAP_Z_INDEX.detailRail,
        display: 'flex',
        flexDirection: 'column',
        animation: 'sgpRailSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* 1. SHARED RAIL HEADER */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại bảng thanh tra"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#475569',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Quay lại"
          >
            <ArrowLeft size={17} />
          </button>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#0284C7', letterSpacing: '0.05em' }}>
              {variant === 'zone-detail' && 'CHI TIẾT KHU VỰC'}
              {variant === 'operator-detail' && 'HỒ SƠ CA TRỰC'}
              {variant === 'meter-detail' && 'THÔNG SỐ THIẾT BỊ'}
              {variant === 'meter-placement' && (placementContext?.isRelocating ? 'CHỈNH SỬA TỌA ĐỘ' : 'THÊM CÔNG TƠ MỚI')}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>
              {variant === 'zone-detail' && (presZone?.businessName || zone?.name || 'Khu vực')}
              {variant === 'operator-detail' && (operator?.full_name || operatorSummary?.fullName || 'Nhân viên')}
              {variant === 'meter-detail' && (meter?.meterCode || 'Công tơ')}
              {variant === 'meter-placement' && (placementContext?.isRelocating ? `Chuyển vị trí ${placementContext.meterCode}` : 'Đặt vị trí không gian')}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#94A3B8',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. RAIL BODY */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* ============================================================ */}
        {/* 2A. ZONE DETAIL VARIANT */}
        {/* ============================================================ */}
        {variant === 'zone-detail' && (
          <>
            {/* Operator summary row */}
            <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '10px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Nhân sự phụ trách:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>
                  {zoneState?.operator?.fullName || 'Chưa phân công'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Tiến độ ca:</span>
                <span style={{ fontWeight: 700, color: '#0284C7' }}>
                  {zoneState?.progressPct ?? 0}% ({zoneState?.completed ?? 0}/{zoneState?.totalMeters ?? zoneMeters.length})
                </span>
              </div>
            </div>

            {/* Meter search in zone */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Tìm mã công tơ trong khu vực..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  paddingLeft: '32px',
                  paddingRight: '12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Meter list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                <span>DANH SÁCH CÔNG TƠ ({zoneMeters.length})</span>
                {onStartPlacement && zone && (
                  <button
                    type="button"
                    onClick={() => onStartPlacement(zone.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0284C7',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={13} />
                    <span>Thêm</span>
                  </button>
                )}
              </div>

              {zoneMeters.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  Không có công tơ nào phù hợp
                </div>
              ) : (
                zoneMeters.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onSelectMeter?.(m.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0284C7';
                      e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.background = '#FFFFFF';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{m.meterCode}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>{m.name}</div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background:
                            m.semanticState === 'OVERDUE'
                              ? '#FEE2E2'
                              : m.semanticState === 'REVIEW'
                              ? '#FEF3C7'
                              : '#DCFCE7',
                          color:
                            m.semanticState === 'OVERDUE'
                              ? '#DC2626'
                              : m.semanticState === 'REVIEW'
                              ? '#D97706'
                              : '#16A34A',
                        }}
                      >
                        {m.stateLabel}
                      </span>
                      {m.latestReading?.readingValue != null && (
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 600 }}>
                          {m.latestReading.readingValue.toLocaleString()} kWh
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* 2B. OPERATOR DETAIL VARIANT */}
        {/* ============================================================ */}
        {variant === 'operator-detail' && (
          <>
            <div style={{ background: '#F1F5F9', padding: '14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Thông tin ca trực
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Mã NV: </span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {operator?.employee_code || operatorSummary?.employeeCode || '—'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Ca trực: </span>
                  <span style={{ fontWeight: 600 }}>{operatorSummary?.shiftLabel || '08:00 - 16:00'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>KHU VỰC PHÂN CÔNG</div>
              {operatorSummary?.activeZoneIds?.map((zid) => {
                const p = SPATIAL_ZONE_PRESENTATIONS.find((pz) => pz.presentationId === zid || pz.businessZoneId === zid);
                return (
                  <div key={zid} style={{ padding: '10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}>
                    {p?.businessName || zid}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* 2C. METER DETAIL VARIANT */}
        {/* ============================================================ */}
        {variant === 'meter-detail' && meter && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: '#F1F5F9', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Mã công tơ:</span>
                  <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>{meter.meterCode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Tên thiết bị:</span>
                  <span style={{ fontWeight: 600 }}>{meter.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Loại công tơ:</span>
                  <span style={{ fontWeight: 600 }}>{meter.meterType || 'LCD'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Khu vực:</span>
                  <span style={{ fontWeight: 600, color: '#0284C7' }}>{meter.zoneName || meter.zoneId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Chỉ số:</span>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>
                    {meter.latestReading?.readingValue != null ? `${meter.latestReading.readingValue.toLocaleString()} kWh` : 'Chưa có'}
                  </span>
                </div>
              </div>

              {onStartRelocation && (
                <button
                  type="button"
                  onClick={() => onStartRelocation(meter)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#0284C7',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <Move size={15} />
                  <span>Di chuyển vị trí trên bản đồ</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* 2D. METER PLACEMENT & RELOCATION VARIANT */}
        {/* ============================================================ */}
        {variant === 'meter-placement' && placementContext && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Step 1: Pinning Status Indicator */}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: placementContext.pinnedCoords ? '1px solid #86EFAC' : '1px dashed #0284C7',
                background: placementContext.pinnedCoords ? '#F0FDF4' : '#F0F9FF',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MapPin size={17} color={placementContext.pinnedCoords ? '#16A34A' : '#0284C7'} />
              <div>
                <div style={{ fontWeight: 700, color: placementContext.pinnedCoords ? '#16A34A' : '#0284C7' }}>
                  {placementContext.pinnedCoords ? 'Đã ghim tọa độ không gian' : 'Nhấp trên bản đồ để chọn tọa độ'}
                </div>
                {placementContext.pinnedCoords && (
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    X: {placementContext.pinnedCoords.normX.toFixed(4)}, Y: {placementContext.pinnedCoords.normY.toFixed(4)}
                  </div>
                )}
              </div>
            </div>

            {/* Error banner if any */}
            {placementError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#FEF2F2',
                  border: '1px solid #F87171',
                  color: '#991B1B',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={15} />
                <span>{placementError}</span>
              </div>
            )}

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Khu vực chỉ định
                </label>
                <select
                  value={placementContext.targetZoneId}
                  onChange={(e) => {
                    const zid = e.target.value;
                    const zObj = zones.find((z) => z.id === zid);
                    onUpdatePlacement?.({ targetZoneId: zid, targetZoneName: zObj ? zObj.name : zid });
                  }}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    background: '#FFFFFF',
                  }}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Mã công tơ
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: CT-013"
                  value={placementContext.meterCode}
                  onChange={(e) => onUpdatePlacement?.({ meterCode: e.target.value })}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Tên công tơ
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Công tơ Bãi Container 3"
                  value={placementContext.meterName}
                  onChange={(e) => onUpdatePlacement?.({ meterName: e.target.value })}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Loại thiết bị
                </label>
                <select
                  value={placementContext.meterType}
                  onChange={(e) => onUpdatePlacement?.({ meterType: e.target.value })}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="LCD">Điện tử LCD</option>
                  <option value="MECHANICAL">Cơ khí truyền thống</option>
                  <option value="SMART">Công tơ thông minh (IoT)</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {placementContext.pinnedCoords && onResetPin && (
                <button
                  type="button"
                  onClick={onResetPin}
                  style={{
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Chọn lại vị trí trên bản đồ</span>
                </button>
              )}

              <button
                type="button"
                onClick={onConfirmPlacement}
                disabled={!placementContext.pinnedCoords || isSubmittingPlacement}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  background: placementContext.pinnedCoords ? '#0284C7' : '#94A3B8',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: placementContext.pinnedCoords ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Check size={16} />
                <span>{isSubmittingPlacement ? 'Đang lưu...' : 'Xác nhận vị trí công tơ'}</span>
              </button>

              <button
                type="button"
                onClick={onCancelPlacement}
                style={{
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: 'transparent',
                  color: '#64748B',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy thao tác
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
