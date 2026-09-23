import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Info,
  Lock,
  Zap,
  Droplets,
  ExternalLink,
  Search,
  AlertTriangle,
  Calendar,
  Users,
  FileText,
} from 'lucide-react';
import type { MapMeterOut } from '../../types';
import type { MapV2SelectedEntity, MapV2ToneMode } from './types';
import { MAP_V2_EMPLOYEE_DISCLOSURE_TEXT, MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT } from './employeeDataAdapter';
import { computeZoneOperationalStatus, formatZoneProgressText } from './zoneMapping';
import {
  getSimulationMeter,
  getMeterHostNodeId,
  getMeterNetworkId,
  getMeterZone,
  ELECTRICITY_NETWORK_ID,
} from './simulation';

interface MapV2InspectionPanelProps {
  selected: MapV2SelectedEntity;
  onClose: () => void;
  toneMode?: MapV2ToneMode;
  presentation?: 'docked' | 'drawer';
  onInspectReading?: (readingId: string) => void;
  onOpenMeterDetails?: (meterId: string, meterCode?: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onTraceMeter?: (meterCode: string) => void;
  isMeterTraced?: boolean;
  selectedDate?: string;
  selectedRoundId?: string | null;
}

export const MapV2InspectionPanel: React.FC<MapV2InspectionPanelProps> = ({
  selected,
  onClose,
  toneMode = 'technical',
  presentation = 'docked',
  onInspectReading,
  onOpenMeterDetails,
  onNavigateToTab,
  onTraceMeter,
  isMeterTraced = false,
  selectedDate,
  selectedRoundId,
}) => {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selected) return null;

  const { type, data } = selected;
  const isNeon = toneMode === 'neon';

  // ==========================================================================
  // CASE 1: REAL OR DEMO EMPLOYEE INSPECTION DOCK (Section 20)
  // ==========================================================================
  if (type === 'employee') {
    const emp = data;
    const isDemo = emp.isDemo;

    return (
      <aside
        className={`map-v2-inspector-panel ${isNeon ? 'tone-neon' : ''} ${presentation === 'drawer' ? 'mode-drawer' : 'mode-docked'}`}
        aria-label="Thông tin nhân sự phân khu"
        role={presentation === 'drawer' ? 'dialog' : 'complementary'}
        aria-modal={presentation === 'drawer' ? 'true' : undefined}
      >
        <div className="map-v2-inspector-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color={isNeon ? '#00f0ff' : '#003875'} />
            <h3 className="map-v2-inspector-title">
              {isDemo ? 'Nhân sự (Mô phỏng)' : 'Nhân sự phân khu'}
            </h3>
          </div>
          <button
            type="button"
            className="map-v2-btn map-v2-btn-icon-only"
            onClick={onClose}
            aria-label="Đóng thanh kiểm tra"
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="map-v2-inspector-body">
          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Mã nhân viên</span>
            <span className="map-v2-id-badge font-mono">{emp.code}</span>
          </div>

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Họ và tên</span>
            <span className="map-v2-prop-value font-semibold">{emp.name}</span>
          </div>

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Khu vực phụ trách</span>
            <span className="map-v2-prop-value">{emp.zoneLabel}</span>
          </div>

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Vai trò</span>
            <span className="map-v2-prop-value">{emp.roleTitle}</span>
          </div>

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Trách nhiệm</span>
            <span className="map-v2-prop-value" style={{ color: isNeon ? '#00f0ff' : '#0068FF', fontWeight: 600 }}>
              {emp.dutyLabel}
            </span>
          </div>

          {/* Zone-Level Progress only — strictly NOT personal quota */}
          {emp.zoneMeterSummary && (
            <div className="map-v2-prop-row">
              <span className="map-v2-prop-label">Tiến độ khu vực</span>
              <span className="map-v2-prop-value font-semibold" style={{ color: isNeon ? '#ff2a85' : '#003875' }}>
                {emp.zoneMeterSummary}
              </span>
            </div>
          )}

          {/* Mandatory Disclosure Banner */}
          <div className="map-v2-readonly-banner" style={{ marginTop: 14 }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: 2, color: isNeon ? '#00f0ff' : '#0284C7' }} />
            <div className="map-v2-readonly-text" style={{ color: isNeon ? '#94a3b8' : '#0369A1' }}>
              <strong>{isDemo ? 'Chuyển động minh họa:' : 'Điểm neo trách nhiệm:'}</strong>{' '}
              {isDemo ? MAP_V2_EMPLOYEE_DISCLOSURE_TEXT : MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT}
            </div>
          </div>

          {/* Cross-Screen CTA: Staff Roster */}
          {onNavigateToTab && (
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                className="map-v2-btn"
                style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                onClick={() => onNavigateToTab('staff_roster')}
                title="Mở màn hình Phân công nhân sự & Roster"
              >
                <Users size={14} />
                <span>Xem trong Phân ca</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // ==========================================================================
  // CASE 2: REAL METER INSPECTION DOCK (Section 23, 24, 25)
  // ==========================================================================
  if (type === 'meter') {
    const meter = data as MapMeterOut;
    const isElectricity = meter.utility_type === 'ELECTRICITY';

    let stateLabel = 'Chưa mở lượt';
    let stateColor = '#94A3B8';
    if (meter.semantic_state === 'CONFIRMED') {
      stateLabel = 'Đã xác nhận';
      stateColor = '#10B981';
    } else if (meter.semantic_state === 'REVIEW') {
      stateLabel = 'Cần kiểm tra';
      stateColor = '#FCC959';
    } else if (meter.semantic_state === 'OVERDUE') {
      stateLabel = 'Trễ hạn';
      stateColor = '#B43A3A';
    } else if (meter.semantic_state === 'DUE') {
      stateLabel = 'Đến hạn ghi';
      stateColor = '#0068FF';
    }

    return (
      <aside
        className={`map-v2-inspector-panel ${isNeon ? 'tone-neon' : ''} ${presentation === 'drawer' ? 'mode-drawer' : 'mode-docked'}`}
        aria-label="Thông tin chi tiết điểm đo"
        role={presentation === 'drawer' ? 'dialog' : 'complementary'}
        aria-modal={presentation === 'drawer' ? 'true' : undefined}
      >
        <div className="map-v2-inspector-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isElectricity ? (
              <Zap size={16} color="#FFB703" />
            ) : (
              <Droplets size={16} color="#0068FF" />
            )}
            <h3 className="map-v2-inspector-title">Điểm đo công tơ</h3>
          </div>
          <button
            type="button"
            className="map-v2-btn map-v2-btn-icon-only"
            onClick={onClose}
            aria-label="Đóng thanh kiểm tra"
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="map-v2-inspector-body">
          {/* Identity & Utility */}
          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Mã công tơ</span>
            <span className="map-v2-id-badge font-mono">{meter.meter_code}</span>
          </div>

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Tên thiết bị</span>
            <span className="map-v2-prop-value font-semibold">{meter.name}</span>
          </div>

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Loại năng lượng</span>
            <span className="map-v2-prop-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isElectricity ? '⚡ Điện lực' : '💧 Nước sạch'}
            </span>
          </div>

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Công nghệ mặt số</span>
            <span className="map-v2-prop-value font-mono" style={{ fontSize: '0.8rem' }}>
              {meter.meter_type || 'Cơ khí / LCD'}
            </span>
          </div>

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Khu vực / Vị trí</span>
            <span className="map-v2-prop-value">
              {meter.zone_name || meter.location || 'Khu vực cảng'}
            </span>
          </div>

          {selectedDate && (
            <div className="map-v2-prop-row">
              <span className="map-v2-prop-label">Lịch ngày</span>
              <span className="map-v2-prop-value">{selectedDate}{selectedRoundId ? ` (Lượt: ${selectedRoundId})` : ''}</span>
            </div>
          )}

          {/* Reading Hero Card — Honors MEASUREMENT_UNIT_DATA_GAP (Raw tabular, NO hardcoded kWh/m³) */}
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 8,
              backgroundColor: isNeon ? '#061730' : '#F8FAFC',
              border: `1px solid ${isNeon ? '#1c3252' : '#E2E8F0'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.75rem', color: isNeon ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                SỐ ĐỌC TRONG LƯỢT
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: stateColor,
                  padding: '2px 8px',
                  borderRadius: 4,
                  backgroundColor: `${stateColor}18`,
                  border: `1px solid ${stateColor}40`,
                }}
              >
                {stateLabel}
              </span>
            </div>

            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                fontVariantNumeric: 'tabular-nums lining-nums',
                letterSpacing: '0.02em',
                color: isNeon ? '#00f0ff' : '#003875',
                marginBottom: 4,
              }}
            >
              {meter.latest_reading_value ? meter.latest_reading_value : '—'}
            </div>

            <div style={{ fontSize: '0.75rem', color: isNeon ? '#64748b' : '#94a3b8' }}>
              {meter.latest_reading_time
                ? `Ghi nhận lúc: ${meter.latest_reading_time}`
                : 'Chưa có dữ liệu ghi trong lượt này'}
            </div>
          </div>

          {/* Exception Warning Banner if REVIEW or OVERDUE */}
          {(meter.semantic_state === 'REVIEW' || meter.semantic_state === 'OVERDUE') && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 6,
                backgroundColor: meter.semantic_state === 'OVERDUE' ? 'rgba(180, 58, 58, 0.08)' : 'rgba(252, 201, 89, 0.12)',
                border: `1px solid ${meter.semantic_state === 'OVERDUE' ? '#B43A3A' : '#FCC959'}`,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle
                size={16}
                color={meter.semantic_state === 'OVERDUE' ? '#B43A3A' : '#D97706'}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ fontSize: '0.78rem', color: isNeon ? '#CBD5E1' : '#334155' }}>
                <strong>
                  {meter.semantic_state === 'OVERDUE' ? 'Trễ hạn ghi chỉ số:' : 'Yêu cầu hậu kiểm:'}
                </strong>{' '}
                {meter.exception_label || 'Số đọc cần người kiểm toán xác nhận hoặc chụp lại.'}
              </div>
            </div>
          )}

          {/* SIMULATION INFRASTRUCTURE CONTEXT (Section 25, 26) */}
          {(() => {
            const hostNodeId = getMeterHostNodeId(meter.meter_code);
            const networkId = getMeterNetworkId(meter.meter_code);
            const zoneRel = getMeterZone(meter.meter_code);
            const simMeter = getSimulationMeter(meter.meter_code);

            if (hostNodeId) {
              const zoneLabel = zoneRel?.presentationZoneId === 'ZONE_QUAY'
                ? 'Khu cảng sà lan'
                : zoneRel?.presentationZoneId === 'ZONE_CONTAINER'
                ? 'Bãi container'
                : zoneRel?.presentationZoneId === 'ZONE_GENERAL'
                ? 'Bãi tổng hợp'
                : 'Khu vực cảng';

              return (
                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 6,
                    backgroundColor: isNeon ? 'rgba(255, 183, 3, 0.08)' : '#FEF3C7',
                    border: `1px solid ${isNeon ? 'rgba(255, 183, 3, 0.25)' : '#FDE68A'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isNeon ? '#FCC959' : '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Hạ tầng mạng lưới (Mô phỏng B2)
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 3,
                        backgroundColor: isNeon ? 'rgba(255, 183, 3, 0.2)' : '#F59E0B',
                        color: isNeon ? '#FCC959' : '#FFFFFF',
                      }}
                    >
                      MÔ PHỎNG
                    </span>
                  </div>

                  <div className="map-v2-prop-row" style={{ padding: '2px 0' }}>
                    <span className="map-v2-prop-label">Mạng</span>
                    <span className="map-v2-prop-value font-semibold">
                      {networkId === ELECTRICITY_NETWORK_ID ? '⚡ Mạng điện B2' : '💧 Mạng nước B2'}
                    </span>
                  </div>

                  <div className="map-v2-prop-row" style={{ padding: '2px 0' }}>
                    <span className="map-v2-prop-label">Node chủ quản</span>
                    <span className="map-v2-id-badge font-mono">{hostNodeId}</span>
                  </div>

                  <div className="map-v2-prop-row" style={{ padding: '2px 0' }}>
                    <span className="map-v2-prop-label">Phân khu</span>
                    <span className="map-v2-prop-value">{zoneLabel}</span>
                  </div>

                  <div className="map-v2-prop-row" style={{ padding: '2px 0' }}>
                    <span className="map-v2-prop-label">Nguồn dữ liệu</span>
                    <span className="map-v2-prop-value">Mô phỏng (B2 Frozen)</span>
                  </div>

                  {onTraceMeter && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="map-v2-btn"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          gap: 6,
                          backgroundColor: isMeterTraced ? (isNeon ? '#ff2a85' : '#003875') : undefined,
                          color: isMeterTraced ? '#FFFFFF' : undefined,
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                        }}
                        onClick={() => onTraceMeter(meter.meter_code)}
                        title={isMeterTraced ? 'Hủy truy vết tuyến nguồn' : 'Truy vết tuyến nguồn từ trạm cấp đến công tơ'}
                      >
                        {isElectricity ? <Zap size={13} /> : <Droplets size={13} />}
                        <span>{isMeterTraced ? 'Hủy truy vết tuyến nguồn' : 'Truy vết tuyến nguồn'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            if (simMeter?.lifecycle === 'LEGACY_SIMULATION') {
              return (
                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 6,
                    backgroundColor: isNeon ? 'rgba(100, 116, 139, 0.15)' : '#F1F5F9',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Công tơ kế thừa (Legacy Simulation)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                    Dữ liệu công tơ lịch sử Map V1. Không tham gia mạng lưới B2 Map V2.
                  </p>
                </div>
              );
            }

            return null;
          })()}

          {/* Cross-Screen Action CTAs */}
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {meter.reading_id && onInspectReading && (
              <button
                type="button"
                className="map-v2-btn map-v2-btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                onClick={() => onInspectReading(meter.reading_id!)}
                title="Mở hộp thoại kiểm tra ảnh chụp chỉ số và kết quả OCR"
              >
                <Search size={14} />
                <span>Kiểm tra ảnh chỉ số</span>
              </button>
            )}

            {onOpenMeterDetails && (
              <button
                type="button"
                className="map-v2-btn"
                style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                onClick={() => onOpenMeterDetails(meter.id, meter.meter_code)}
                title="Mở hồ sơ thiết bị công tơ trong danh mục thiết bị"
              >
                <ExternalLink size={14} />
                <span>Xem hồ sơ thiết bị</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // ==========================================================================
  // CASE 3: OPERATIONAL ZONE INSPECTION DOCK (Section 26, 27)
  // ==========================================================================
  if (type === 'zone_operational') {
    const { zone, anchor } = data;
    const metrics = computeZoneOperationalStatus(zone);
    const assignedUser = zone.assigned_user;

    return (
      <aside
        className={`map-v2-inspector-panel ${isNeon ? 'tone-neon' : ''} ${presentation === 'drawer' ? 'mode-drawer' : 'mode-docked'}`}
        aria-label="Thông tin vận hành phân khu"
        role={presentation === 'drawer' ? 'dialog' : 'complementary'}
        aria-modal={presentation === 'drawer' ? 'true' : undefined}
      >
        <div className="map-v2-inspector-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color={isNeon ? '#00f0ff' : '#003875'} />
            <h3 className="map-v2-inspector-title">Vận hành phân khu</h3>
          </div>
          <button
            type="button"
            className="map-v2-btn map-v2-btn-icon-only"
            onClick={onClose}
            aria-label="Đóng thanh kiểm tra"
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="map-v2-inspector-body">
          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Phân khu</span>
            <span className="map-v2-prop-value font-semibold">
              {zone.name} ({anchor?.code || zone.code})
            </span>
          </div>

          {selectedDate && (
            <div className="map-v2-prop-row">
              <span className="map-v2-prop-label">Lịch ngày</span>
              <span className="map-v2-prop-value">{selectedDate}{selectedRoundId ? ` (Lượt: ${selectedRoundId})` : ''}</span>
            </div>
          )}

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Trạng thái lượt</span>
            <span className="map-v2-prop-value font-semibold">
              {metrics.statusLabel}
            </span>
          </div>

          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Tiến độ lượt</span>
            <span className="map-v2-prop-value">
              {formatZoneProgressText(metrics)}
            </span>
          </div>

          {/* Counts Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
              marginTop: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ padding: 8, borderRadius: 6, backgroundColor: isNeon ? '#061730' : '#F1F5F9', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Đã ghi</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10B981' }}>{metrics.confirmedCount}</div>
            </div>
            <div style={{ padding: 8, borderRadius: 6, backgroundColor: isNeon ? '#061730' : '#F1F5F9', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Cần kiểm tra</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FCC959' }}>{metrics.reviewCount}</div>
            </div>
            <div style={{ padding: 8, borderRadius: 6, backgroundColor: isNeon ? '#061730' : '#F1F5F9', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Trễ hạn</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#B43A3A' }}>{metrics.overdueCount}</div>
            </div>
          </div>

          {/* Standing Assignee Summary */}
          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Người phụ trách</span>
            <span className="map-v2-prop-value font-semibold">
              {assignedUser ? `${assignedUser.full_name} (${assignedUser.employee_code})` : 'Chưa phân công'}
            </span>
          </div>

          {/* Navigation CTAs */}
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onNavigateToTab && (
              <>
                <button
                  type="button"
                  className="map-v2-btn"
                  style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                  onClick={() => onNavigateToTab('schedules')}
                  title="Xem lịch trình ghi và sổ ca đọc"
                >
                  <Calendar size={14} />
                  <span>Xem trong Lịch ghi</span>
                </button>

                <button
                  type="button"
                  className="map-v2-btn"
                  style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                  onClick={() => onNavigateToTab('reports')}
                  title="Mở Báo cáo vận hành sản lượng"
                >
                  <FileText size={14} />
                  <span>Mở Báo cáo</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // ==========================================================================
  // CASE 4: TECHNICAL GEOMETRY INSPECTION (POLYGON, POLYLINE, MARKER)
  // Preserved 100% byte-for-byte in technical mode.
  // ==========================================================================
  const handleCopy = () => {
    let textToCopy = '';
    if (type === 'polygon' || type === 'polyline') {
      textToCopy = JSON.stringify(data.vertices, null, 2);
    } else if (type === 'marker') {
      textToCopy = JSON.stringify(data.point);
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const vertices = type === 'polygon' || type === 'polyline' ? data.vertices : [data.point];
  const normalizedVertices = 
    type === 'polygon' || type === 'polyline' 
      ? data.normalized_vertices 
      : [data.normalized_point];

  return (
    <aside
      className={`map-v2-inspector-panel ${isNeon ? 'tone-neon' : ''} ${presentation === 'drawer' ? 'mode-drawer' : 'mode-docked'}`}
      aria-label="Thông tin hình học đối tượng"
      role={presentation === 'drawer' ? 'dialog' : 'complementary'}
      aria-modal={presentation === 'drawer' ? 'true' : undefined}
    >
      <div className="map-v2-inspector-header">
        <h3 className="map-v2-inspector-title">Kiểm tra tọa độ đối tượng</h3>
        <button
          type="button"
          className="map-v2-btn map-v2-btn-icon-only"
          onClick={onClose}
          aria-label="Đóng thanh kiểm tra"
          style={{ padding: '4px' }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="map-v2-inspector-body">
        {/* Core Attributes */}
        <div className="map-v2-prop-row">
          <span className="map-v2-prop-label">Mã định danh (ID)</span>
          <span className="map-v2-id-badge font-mono">
            {data.id}
          </span>
        </div>

        <div className="map-v2-prop-row">
          <span className="map-v2-prop-label">Tên hiển thị</span>
          <span className="map-v2-prop-value font-semibold">
            {data.label}
          </span>
        </div>

        <div className="map-v2-prop-row">
          <span className="map-v2-prop-label">Phân loại (Category)</span>
          <span className="map-v2-prop-value font-mono" style={{ fontSize: '0.8rem' }}>
            {data.category}
          </span>
        </div>

        {type === 'polygon' && (
          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Khu vực cha (Parent ID)</span>
            <span className="map-v2-prop-value font-mono" style={{ fontSize: '0.8rem' }}>
              {data.parent_id || '(Không có - Cấp 1)'}
            </span>
          </div>
        )}

        {type === 'polyline' && (
          <div className="map-v2-prop-row">
            <span className="map-v2-prop-label">Khép kín (Closed)</span>
            <span className="map-v2-prop-value">
              {data.closed ? 'Có (Vòng kín)' : 'Không (Đoạn thẳng / Tuyến)'}
            </span>
          </div>
        )}

        {/* Read-Only Invariant Notice */}
        <div className="map-v2-readonly-banner">
          <Lock size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="map-v2-readonly-text">
            <strong>Chế độ kiểm tra hình học (Read-only):</strong> Dữ liệu được bảo toàn nguyên bản từ tập tin người dùng hiệu chỉnh. Không gửi đột biến lên cơ sở dữ liệu V1.
          </div>
        </div>

        {/* Geometry Vertices List */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <span className="map-v2-prop-label">
              Tọa độ đỉnh ({vertices.length} điểm)
            </span>
            <button
              type="button"
              className="map-v2-btn"
              onClick={handleCopy}
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
              title="Sao chép danh sách tọa độ"
            >
              {copied ? <Check size={12} color="#167a5a" /> : <Copy size={12} />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>

          <div className="map-v2-coord-container">
            <table className="map-v2-coord-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Pixel [X, Y]</th>
                  <th>Chuẩn hóa [nx, ny]</th>
                </tr>
              </thead>
              <tbody>
                {vertices.map(([x, y], idx) => {
                  const [nx, ny] = normalizedVertices[idx] || [x / 1536, y / 1024];
                  return (
                    <tr key={idx}>
                      <td className="map-v2-coord-idx">{idx}</td>
                      <td className="map-v2-coord-pixel font-mono">
                        [{x}, {y}]
                      </td>
                      <td className="map-v2-coord-norm font-mono">
                        [{nx.toFixed(4)}, {ny.toFixed(4)}]
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Special geometry notice if ROAD_BACKLAND */}
        {data.id === 'ROAD_BACKLAND' && (
          <div className="map-v2-inflection-callout">
            <Info size={16} className="map-v2-inflection-icon" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="map-v2-inflection-text">
              <strong>Lưu ý điểm uốn:</strong> Đỉnh [3] (382, 574) di chuyển ngược sang Đỉnh [4] (356, 577) trước khi tới Đỉnh [5] (540, 581). Được giữ nguyên theo thiết kế người dùng.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
export default MapV2InspectionPanel;
