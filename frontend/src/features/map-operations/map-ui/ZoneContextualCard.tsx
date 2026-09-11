import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowRight, Plus, AlertTriangle, CheckCircle2, Shield, Gauge } from 'lucide-react';
import { MapOperationalZone, MapViewportState } from '../types';
import {
  SpatialZonePresentation,
  SPATIAL_ZONE_PRESENTATIONS,
  resolveToBusinessZoneId,
} from '../geometry/operationalGeometry';
import {
  CANONICAL_SCENE_WIDTH,
  CANONICAL_SCENE_HEIGHT,
} from '../geometry/canonicalScene';
import { ZoneOperationalState } from '../state/operationalProjection';

export interface ZoneContextualCardProps {
  zone: MapOperationalZone | SpatialZonePresentation;
  operationalState?: ZoneOperationalState;
  viewport?: MapViewportState;
  onOpenDrawer: () => void;
  onAddMeter?: (zoneId: string) => void;
  onClose: () => void;
}

/**
 * ZoneContextualCard — V7 Visual Contract Implementation (tan-thuan-interaction-reference.png)
 *
 * Requirements:
 * - ONE compact contextual glass card floating right above the zone with down-pointing arrow tip.
 * - Header: Zone icon + Name, "Phụ trách: [User] ([Initials])", [×] Close button.
 * - Body: Circular progress %, Meter count, Issues count.
 * - Actions: [Xem công tơ] (opens detailed drawer) and [+ Thêm công tơ] (triggers placement).
 * - DO NOT immediately open a giant dashboard drawer.
 */
export const ZoneContextualCard: React.FC<ZoneContextualCardProps> = ({
  zone,
  operationalState,
  viewport,
  onOpenDrawer,
  onAddMeter,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Match presentation zone visual info if available
  const zoneKey = 'presentationId' in zone ? zone.presentationId : zone.id;
  const presZone =
    SPATIAL_ZONE_PRESENTATIONS.find(
      (p) => p.presentationId === zoneKey || p.businessZoneId === zoneKey
    ) || SPATIAL_ZONE_PRESENTATIONS[0];

  const zoneName = zone.name || presZone.name;
  const accentColor = presZone.primaryColor || presZone.boundaryColor || '#0284C7';
  const glowColor = presZone.glowColor || '#38BDF8';

  // Metrics
  const totalMeters = operationalState?.totalMeters ?? 0;
  const progressPct = operationalState?.progressPct ?? 0;
  const overdueCount = operationalState?.overdue ?? 0;
  const reviewCount = operationalState?.review ?? 0;
  const issueCount = overdueCount + reviewCount;
  const completedCount = operationalState?.completed ?? 0;

  // Assigned Operator
  const operatorName =
    operationalState?.operator?.fullName ||
    ('assignedUser' in zone && zone.assignedUser?.fullName) ||
    'Chưa phân công';

  const nameParts = operatorName.trim().split(/\s+/);
  const operatorInitials =
    nameParts.length >= 2
      ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase()
      : operatorName.charAt(0).toUpperCase();

  // Progress ring math (r=18)
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~113.1px
  const strokeOffset = ringCircumference - (Math.min(100, Math.max(0, progressPct)) / 100) * ringCircumference;

  // Positioning: track zone DOM element or anchor to zone centroid
  const [stylePos, setStylePos] = useState<{ left: string; top: string }>(() => {
    const cx = presZone.centroidSvg?.x ?? 958;
    const cy = presZone.centroidSvg?.y ?? 411;
    return {
      left: `${((cx / CANONICAL_SCENE_WIDTH) * 100).toFixed(1)}%`,
      top: `${((cy / CANONICAL_SCENE_HEIGHT) * 100).toFixed(1)}%`,
    };
  });

  useEffect(() => {
    const updatePosition = () => {
      // Find zone element or identity pill
      const targetEl =
        document.querySelector(`[data-zone-id="${zoneKey}"] .sgp-zone-identity-pill`) ||
        document.querySelector(`[data-zone-id="${zoneKey}"]`) ||
        document.querySelector(`[data-zone-id="${presZone.presentationId}"]`);

      const stageEl = (cardRef.current?.closest('.sgp-map-first-workspace') ||
        cardRef.current?.closest('.sgp-operational-map-container') ||
        cardRef.current?.parentElement) as HTMLElement | null;

      if (targetEl && stageEl) {
        const targetRect = targetEl.getBoundingClientRect();
        const stageRect = stageEl.getBoundingClientRect();

        const rawLeft = targetRect.left + targetRect.width / 2 - stageRect.left;
        const rawTop = targetRect.top - stageRect.top - 12; // 12px above target

        // Card dimensions ~320px wide, ~210px tall
        const leftClamped = Math.max(170, Math.min(rawLeft, stageRect.width - 170));
        const topClamped = Math.max(220, Math.min(rawTop, stageRect.height - 40));

        setStylePos({
          left: `${leftClamped.toFixed(1)}px`,
          top: `${topClamped.toFixed(1)}px`,
        });
      } else {
        const cx = presZone.centroidSvg?.x ?? 958;
        const cy = presZone.centroidSvg?.y ?? 411;
        setStylePos({
          left: `clamp(170px, ${((cx / CANONICAL_SCENE_WIDTH) * 100).toFixed(1)}%, calc(100% - 170px))`,
          top: `clamp(220px, ${((cy / CANONICAL_SCENE_HEIGHT) * 100).toFixed(1)}%, calc(100% - 40px))`,
        });
      }
    };

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePosition);
    };
  }, [zoneKey, presZone, viewport]);

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Thông tin khu vực ${zoneName}`}
      className="sgp-zone-contextual-card"
      style={{
        position: 'absolute',
        left: stylePos.left,
        top: stylePos.top,
        transform: 'translate(-50%, -100%)',
        zIndex: 45,
        width: 330,
        pointerEvents: 'auto',
        animation: 'sgp-pop-enter 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Speech-bubble Container */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'rgba(11, 25, 44, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1.5px solid ${accentColor}`,
          borderRadius: 14,
          padding: '16px 18px',
          boxShadow: `0 12px 32px -4px rgba(0, 0, 0, 0.65), 0 0 16px ${accentColor}33`,
          color: '#F8FAFC',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Downward pointing arrow tip */}
        <div
          style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `8px solid ${accentColor}`,
            filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.4))',
          }}
        />

        {/* 1. HEADER: Zone Icon, Name, Close Button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Zone Emblem */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: `${accentColor}22`,
                border: `1px solid ${accentColor}66`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: glowColor,
                flexShrink: 0,
              }}
            >
              <Shield size={18} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  lineHeight: '1.25',
                  letterSpacing: '0.01em',
                }}
              >
                {zoneName}
              </div>
              {/* Operator info row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 3,
                  fontSize: 11.5,
                  color: '#94A3B8',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8.5,
                    fontWeight: 800,
                    color: '#FFFFFF',
                  }}
                >
                  {operatorInitials}
                </div>
                <span>
                  Phụ trách: <strong style={{ color: '#E2E8F0', fontWeight: 600 }}>{operatorName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng thông tin khu vực"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 150ms ease, background-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94A3B8';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. BODY METRICS: Circular Progress + Meter Count + Issues */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 14,
            alignItems: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 14,
          }}
        >
          {/* Circular Progress Meter */}
          <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={22}
                cy={22}
                r={ringRadius}
                fill="none"
                stroke="#334155"
                strokeWidth={3}
              />
              <circle
                cx={22}
                cy={22}
                r={ringRadius}
                fill="none"
                stroke={accentColor}
                strokeWidth={3.4}
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeOffset}
                style={{ transition: 'stroke-dashoffset 400ms ease' }}
              />
            </svg>
            <span
              style={{
                position: 'absolute',
                fontSize: 10.5,
                fontWeight: 800,
                color: '#FFFFFF',
              }}
            >
              {progressPct}%
            </span>
          </div>

          {/* Counts & Status Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Gauge size={13} color="#38BDF8" /> Tổng công tơ:
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>
                {completedCount}/{totalMeters}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5 }}>
                {issueCount > 0 ? (
                  <AlertTriangle size={13} color="#F59E0B" />
                ) : (
                  <CheckCircle2 size={13} color="#10B981" />
                )}
                Vấn đề:
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: issueCount > 0 ? '#EF4444' : '#10B981',
                }}
              >
                {issueCount > 0 ? `${issueCount} ngoại lệ` : 'Hoạt động tốt'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. ACTIONS: [Xem công tơ] (primary) & [+ Thêm công tơ] (secondary) */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onOpenDrawer}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 34,
              backgroundColor: '#0284C7',
              border: '1px solid #38BDF8',
              borderRadius: 8,
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 150ms ease, transform 100ms ease',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0369A1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0284C7';
            }}
          >
            <span>Xem công tơ</span>
            <ArrowRight size={14} />
          </button>

          {onAddMeter && (
            <button
              type="button"
              onClick={() => {
                const bZoneId = resolveToBusinessZoneId(zoneKey) || zoneKey;
                onAddMeter(bZoneId);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                height: 34,
                padding: '0 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                color: '#E2E8F0',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#E2E8F0';
              }}
            >
              <Plus size={14} />
              <span>Thêm công tơ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
