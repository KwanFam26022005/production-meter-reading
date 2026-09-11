import React from 'react';
import {
  X,
  ArrowRight,
  Plus,
  Move,
  Gauge,
  User as UserIcon,
  Layers,
} from 'lucide-react';
import { MAP_TOKENS, MAP_Z_INDEX } from '../tokens/mapDesignTokens';
import type { MapMeterItem, MapOperationalZone } from '../types';
import type { User } from '../../../types';
import type { ZoneOperationalState } from '../state/operationalProjection';
import {
  SPATIAL_ZONE_PRESENTATIONS,
  SpatialZonePresentation,
} from '../geometry/operationalGeometry';
import type { OperatorShiftSummary } from '../utils/deriveOperatorShiftSummary';

export type SpatialInspectorVariant = 'zone' | 'operator' | 'meter';

export interface SpatialInspectorProps {
  variant: SpatialInspectorVariant;
  // Entity data
  zone?: MapOperationalZone | SpatialZonePresentation;
  zoneState?: ZoneOperationalState;
  operator?: User;
  operatorSummary?: OperatorShiftSummary | null;
  meter?: MapMeterItem;
  // Actions
  onClose: () => void;
  onOpenDetails: () => void;
  onAddMeter?: (zoneId: string) => void;
  onRelocateMeter?: (meter: MapMeterItem) => void;
}

export const SpatialInspector: React.FC<SpatialInspectorProps> = ({
  variant,
  zone,
  zoneState,
  operator,
  operatorSummary,
  meter,
  onClose,
  onOpenDetails,
  onAddMeter,
  onRelocateMeter,
}) => {
  // Resolve presentation zone for rich styling
  const presZone =
    zone &&
    SPATIAL_ZONE_PRESENTATIONS.find(
      (p) =>
        p.presentationId === ('presentationId' in zone ? zone.presentationId : ('id' in zone ? (zone as any).id : '')) ||
        p.businessZoneId === ('businessZoneId' in zone ? zone.businessZoneId : ('id' in zone ? (zone as any).id : ''))
    );

  const accentColor = presZone?.boundaryColor || '#0284C7';
  const glowColor = presZone?.glowColor || '#38BDF8';

  return (
    <div
      className="sgp-spatial-inspector"
      role="region"
      aria-label={`Spatial Inspector: ${variant}`}
      style={{
        position: 'absolute',
        top: '96px',
        right: '24px',
        width: `${MAP_TOKENS.inspectorWidth}px`,
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
        background: 'rgba(7, 26, 43, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: `${MAP_TOKENS.surfaceRadius}px`,
        boxShadow: MAP_TOKENS.shadow,
        zIndex: MAP_Z_INDEX.spatialInspector,
        padding: '16px',
        color: '#E0F2FE',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        animation: 'sgpInspectorIn 240ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* 1. SHARED HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '10px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `rgba(${variant === 'zone' ? '2, 132, 199' : variant === 'operator' ? '14, 165, 233' : '234, 88, 12'}, 0.2)`,
              border: `1px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: glowColor,
            }}
          >
            {variant === 'zone' && <Layers size={17} />}
            {variant === 'operator' && <UserIcon size={17} />}
            {variant === 'meter' && <Gauge size={17} />}
          </div>

          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: glowColor,
              }}
            >
              {variant === 'zone' && 'KHU VỰC CẢNG'}
              {variant === 'operator' && 'NHÂN VIÊN CA TRỰC'}
              {variant === 'meter' && 'THIẾT BỊ ĐO'}
            </div>

            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.25,
                marginTop: '2px',
              }}
            >
              {variant === 'zone' && (presZone?.displayLabel || zone?.name || 'Khu vực')}
              {variant === 'operator' && (operatorSummary?.fullName || (operator ? ('full_name' in operator ? operator.full_name : (operator as any).fullName) : 'Nhân viên'))}
              {variant === 'meter' && (meter?.meterCode || 'Công tơ')}
            </div>
            {variant === 'zone' && presZone?.businessName && (
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                {presZone.businessName}
              </div>
            )}
            {variant === 'meter' && meter?.name && (
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                {meter.name}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng thanh tra"
          style={{
            background: 'rgba(15, 43, 62, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '6px',
            color: '#94A3B8',
            width: '26px',
            height: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.borderColor = glowColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94A3B8';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.2)';
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* 2. VARIANT CONTENT BODY */}
      {/* 2A. ZONE VARIANT */}
      {variant === 'zone' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Operator Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(11, 37, 56, 0.6)',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#94A3B8' }}>Phụ trách:</span>
            <span style={{ fontWeight: 600, color: '#F1F5F9' }}>
              {zoneState?.operator?.fullName ||
                ('assignedUser' in (zone || {}) && (zone as any).assignedUser?.fullName) ||
                'Chưa phân công'}
            </span>
          </div>

          {/* Progress bar */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                marginBottom: '5px',
              }}
            >
              <span style={{ color: '#94A3B8' }}>Tiến độ ghi:</span>
              <span style={{ fontWeight: 700, color: glowColor }}>
                {zoneState?.progressPct ?? 0}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(15, 43, 62, 0.8)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${zoneState?.progressPct ?? 0}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${accentColor}, ${glowColor})`,
                  borderRadius: '3px',
                  transition: 'width 300ms ease',
                }}
              />
            </div>
          </div>

          {/* Metric Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                background: 'rgba(11, 37, 56, 0.6)',
                padding: '8px 4px',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.12)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>Tổng số</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                {zoneState?.totalMeters ?? (zone as any)?.metrics?.totalMeters ?? 0}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '8px 4px',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#6EE7B7' }}>Hoàn thành</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                {zoneState?.completed ?? 0}
              </div>
            </div>

            <div
              style={{
                background: (zoneState?.overdue ?? 0) + (zoneState?.review ?? 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(11, 37, 56, 0.6)',
                padding: '8px 4px',
                borderRadius: '8px',
                border: (zoneState?.overdue ?? 0) + (zoneState?.review ?? 0) > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(56, 189, 248, 0.12)',
              }}
            >
              <div style={{ fontSize: '10px', color: (zoneState?.overdue ?? 0) + (zoneState?.review ?? 0) > 0 ? '#FCA5A5' : '#94A3B8' }}>
                Vấn đề
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: (zoneState?.overdue ?? 0) + (zoneState?.review ?? 0) > 0 ? '#EF4444' : '#FFFFFF', marginTop: '2px' }}>
                {(zoneState?.overdue ?? 0) + (zoneState?.review ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2B. OPERATOR VARIANT */}
      {variant === 'operator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(11, 37, 56, 0.6)',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#94A3B8' }}>Mã nhân viên:</span>
            <span style={{ fontWeight: 700, color: '#38BDF8', fontFamily: 'monospace' }}>
              {operatorSummary?.employeeCode || (operator ? ('employee_code' in operator ? operator.employee_code : (operator as any).employeeCode) : '—')}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(11, 37, 56, 0.6)',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#94A3B8' }}>Ca phân công:</span>
            <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{operatorSummary?.shiftLabel || 'Ca 1 (08:00 - 16:00)'}</span>
          </div>

          {/* Progress bar */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                marginBottom: '5px',
              }}
            >
              <span style={{ color: '#94A3B8' }}>Tiến độ ca trực:</span>
              <span style={{ fontWeight: 700, color: '#38BDF8' }}>
                {operatorSummary?.progressPct ?? 0}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(15, 43, 62, 0.8)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${operatorSummary?.progressPct ?? 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0284C7, #38BDF8)',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>

          {/* Metric Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                background: 'rgba(11, 37, 56, 0.6)',
                padding: '8px 4px',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.12)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>Phân công</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                {operatorSummary?.totalAssignedMeters ?? 0}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '8px 4px',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#6EE7B7' }}>Đã ghi</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                {operatorSummary?.completedMeters ?? 0}
              </div>
            </div>

            <div
              style={{
                background: (operatorSummary?.overdueMeters ?? 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(11, 37, 56, 0.6)',
                padding: '8px 4px',
                borderRadius: '8px',
                border: (operatorSummary?.overdueMeters ?? 0) > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(56, 189, 248, 0.12)',
              }}
            >
              <div style={{ fontSize: '10px', color: (operatorSummary?.overdueMeters ?? 0) > 0 ? '#FCA5A5' : '#94A3B8' }}>
                Quá hạn
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: (operatorSummary?.overdueMeters ?? 0) > 0 ? '#EF4444' : '#FFFFFF', marginTop: '2px' }}>
                {operatorSummary?.overdueMeters ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2C. METER VARIANT */}
      {variant === 'meter' && meter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Status badge & Reading */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(11, 37, 56, 0.6)',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#94A3B8' }}>Trạng thái:</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background:
                  meter.semanticState === 'OVERDUE'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : meter.semanticState === 'REVIEW'
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                color:
                  meter.semanticState === 'OVERDUE'
                    ? '#F87171'
                    : meter.semanticState === 'REVIEW'
                    ? '#FBBF24'
                    : '#34D399',
                border: `1px solid ${
                  meter.semanticState === 'OVERDUE'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : meter.semanticState === 'REVIEW'
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'rgba(16, 185, 129, 0.3)'
                }`,
              }}
            >
              {meter.stateLabel}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(11, 37, 56, 0.6)',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#94A3B8' }}>Chỉ số gần nhất:</span>
            <span style={{ fontWeight: 800, color: '#F1F5F9', fontSize: '13px' }}>
              {meter.latestReading?.readingValue != null ? `${meter.latestReading.readingValue.toLocaleString()} kWh` : 'Chưa có dữ liệu'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(11, 37, 56, 0.6)',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#94A3B8' }}>Thời điểm:</span>
            <span style={{ color: '#CBD5E1', fontSize: '11.5px' }}>
              {meter.latestReading?.serverTimestamp || 'Chưa ghi lượt này'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(11, 37, 56, 0.6)',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#94A3B8' }}>Khu vực:</span>
            <span style={{ fontWeight: 600, color: '#38BDF8' }}>{meter.zoneName || meter.zoneId}</span>
          </div>
        </div>
      )}

      {/* 3. SHARED ACTION FOOTER */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '2px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(56, 189, 248, 0.15)',
        }}
      >
        {variant === 'zone' && (
          <>
            <button
              type="button"
              onClick={onOpenDetails}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(2, 132, 199, 0.3)',
                border: '1px solid #0284C7',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0284C7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(2, 132, 199, 0.3)';
              }}
            >
              <span>Xem công tơ</span>
              <ArrowRight size={13} />
            </button>

            {onAddMeter && (
              <button
                type="button"
                onClick={() => {
                  const zid = zone ? ('presentationId' in zone ? (zone as any).presentationId : (zone as any).id) : null;
                  if (zid) onAddMeter(zid);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  background: 'rgba(15, 43, 62, 0.8)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38BDF8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#38BDF8';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                  e.currentTarget.style.color = '#38BDF8';
                }}
              >
                <Plus size={14} />
                <span>Thêm</span>
              </button>
            )}
          </>
        )}

        {variant === 'operator' && (
          <button
            type="button"
            onClick={onOpenDetails}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(2, 132, 199, 0.3)',
              border: '1px solid #0284C7',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0284C7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(2, 132, 199, 0.3)';
            }}
          >
            <span>Xem chi tiết ca</span>
            <ArrowRight size={13} />
          </button>
        )}

        {variant === 'meter' && (
          <>
            <button
              type="button"
              onClick={onOpenDetails}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(2, 132, 199, 0.3)',
                border: '1px solid #0284C7',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0284C7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(2, 132, 199, 0.3)';
              }}
            >
              <span>Xem chi tiết</span>
              <ArrowRight size={13} />
            </button>

            {onRelocateMeter && meter && (
              <button
                type="button"
                onClick={() => onRelocateMeter(meter)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  height: '34px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  background: 'rgba(15, 43, 62, 0.8)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38BDF8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#38BDF8';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                  e.currentTarget.style.color = '#38BDF8';
                }}
              >
                <Move size={13} />
                <span>Chỉnh vị trí</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
