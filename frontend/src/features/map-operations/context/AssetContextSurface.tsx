/**
 * AssetContextSurface — Unified Context Surface Variant for Infrastructure Assets (Phase V16E)
 *
 * Answers the product question:
 * "Thiết bị này đang có những Meter, trạng thái và dữ liệu gì?"
 *
 * Implements:
 * 1. Asset Identity: Code, Name, Type, Verification Status, Lifecycle Status.
 * 2. Spatial Context: Zone, Coordinates, or truthful "Chưa xác minh vị trí thiết bị".
 * 3. Meter Relationships: Grouped by MEASURES vs INSTALLED_AT with latest recorded readings.
 * 4. Topology Connections: Upstream sources & Downstream targets with 1-click cross-navigation.
 * 5. Quick Actions: "Xem trên bản đồ", "Xem mạng lưới", "Đối soát thiết bị".
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Share2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Layers,
  Gauge,
} from 'lucide-react';
import type {
  Asset,
  AssetOperationalContextResponse,
} from '../../assets/types';
import { getAdminAssetOperationalContext } from '../../../services/api';

export interface AssetContextSurfaceProps {
  assetId: string;
  initialAsset?: Asset | null;
  onClose: () => void;
  onSelectMeter?: (meterId: string) => void;
  onSelectAsset?: (assetId: string) => void;
  onSwitchToMapAndCenter?: (asset: Asset) => void;
  onSwitchToNetworkAndFocus?: (assetId: string) => void;
  onOpenVerificationReview?: (assetId: string) => void;
  canManageVerification?: boolean;
}

export const AssetContextSurface: React.FC<AssetContextSurfaceProps> = ({
  assetId,
  initialAsset,
  onClose,
  onSelectMeter,
  onSelectAsset,
  onSwitchToMapAndCenter,
  onSwitchToNetworkAndFocus,
  onOpenVerificationReview,
  canManageVerification = false,
}) => {
  const [contextData, setContextData] = useState<AssetOperationalContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full operational context
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    getAdminAssetOperationalContext(assetId)
      .then((data) => {
        if (!isCancelled) {
          setContextData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || 'Không thể tải thông tin chi tiết thiết bị.');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [assetId]);

  const asset = contextData?.asset || initialAsset;

  if (!asset && loading) {
    return (
      <aside
        className="sgp-unified-context-surface"
        role="complementary"
        aria-label="Thông tin thiết bị kỹ thuật"
        style={{
          width: 360,
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #D7E0E5',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
        }}
      >
        <div style={{ color: '#64748B', fontSize: 13 }}>Đang tải thông tin thiết bị...</div>
      </aside>
    );
  }

  if (!asset) {
    return (
      <aside
        className="sgp-unified-context-surface"
        role="complementary"
        style={{
          width: 360,
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #D7E0E5',
          height: '100%',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, color: '#073B5C' }}>Lỗi</span>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ color: '#EF4444', fontSize: 13 }}>{error || 'Không tìm thấy thiết bị.'}</div>
      </aside>
    );
  }

  const isApproved = asset.verification_status === 'VERIFIED' || asset.verification_status === 'SIMULATION_APPROVED';
  const hasCoordinates = asset.map_x !== null && asset.map_y !== null;

  // Group attached meters
  const measuresMeters = (contextData?.meters || []).filter((m) => m.relation_type === 'MEASURES');
  const installedMeters = (contextData?.meters || []).filter((m) => m.relation_type === 'INSTALLED_AT');

  return (
    <aside
      className="sgp-unified-context-surface"
      role="complementary"
      aria-label={`Chi tiết thiết bị ${asset.code}`}
      style={{
        width: 360,
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #D7E0E5',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 16px rgba(7, 59, 92, 0.04)',
        zIndex: 30,
        overflowY: 'auto',
      }}
    >
      {/* ============================================================ */}
      {/* 1. HEADER                                                    */}
      {/* ============================================================ */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#F8FAFC',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#073B5C',
                letterSpacing: '-0.01em',
              }}
            >
              {asset.code}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: '#E6ECEF',
                color: '#073B5C',
              }}
            >
              {asset.asset_type}
            </span>
          </div>

          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1E293B',
              margin: '0 0 8px 0',
              lineHeight: 1.4,
            }}
          >
            {asset.name}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* Verification Status */}
            {asset.verification_status === 'VERIFIED' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: '#E2F4E9',
                  color: '#0D9488',
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                <CheckCircle2 size={12} />
                Đã xác minh
              </span>
            ) : asset.verification_status === 'SIMULATION_APPROVED' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                <CheckCircle2 size={12} />
                Mô phỏng duyệt
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                <AlertCircle size={12} />
                Chờ xác minh
              </span>
            )}

            {/* Simulation Badge */}
            {asset.data_origin === 'SIMULATED' && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  padding: '2px 6px',
                  borderRadius: 4,
                  border: '1px solid #E2E8F0',
                }}
                title="Dữ liệu thiết bị và mạng lưới trong môi trường này được tạo để mô phỏng và không phải dữ liệu hạ tầng thực tế của doanh nghiệp."
              >
                Mô phỏng
              </span>
            )}

            {/* Lifecycle Status */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: '#F1F5F9',
                color: '#475569',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {asset.lifecycle_status === 'ACTIVE' ? 'Hoạt động' : asset.lifecycle_status}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            color: '#64748B',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
          }}
          title="Đóng bảng chi tiết (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* ============================================================ */}
      {/* 2. NAVIGATION ACTIONS STRIP                                  */}
      {/* ============================================================ */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          gap: 8,
          backgroundColor: '#FFFFFF',
        }}
      >
        <button
          type="button"
          disabled={!hasCoordinates}
          onClick={() => onSwitchToMapAndCenter && onSwitchToMapAndCenter(asset)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            backgroundColor: hasCoordinates ? '#073B5C' : '#F1F5F9',
            color: hasCoordinates ? '#FFFFFF' : '#94A3B8',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: hasCoordinates ? 'pointer' : 'not-allowed',
          }}
          title={hasCoordinates ? 'Định vị thiết bị trên Bản đồ tác nghiệp' : 'Thiết bị chưa có tọa độ trên bản đồ'}
        >
          <MapPin size={14} />
          <span>Xem trên bản đồ</span>
        </button>

        <button
          type="button"
          onClick={() => onSwitchToNetworkAndFocus && onSwitchToNetworkAndFocus(asset.id)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #073B5C',
            color: '#073B5C',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Mở sơ đồ mạng lưới và làm nổi bật thiết bị này"
        >
          <Share2 size={14} />
          <span>Xem mạng lưới</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3. SPATIAL POSITION STATUS                                   */}
      {/* ============================================================ */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
          Vị trí không gian
        </div>

        {hasCoordinates ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>Phân vùng:</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
                {contextData?.presentation_zone_name || asset.zone_name || 'Chưa phân vùng'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>Tọa độ chuẩn hóa:</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#073B5C' }}>
                X: {asset.map_x?.toFixed(4)}, Y: {asset.map_y?.toFixed(4)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#475569' }}>Trạng thái tọa độ:</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: asset.position_verification_status === 'VERIFIED' ? '#0D9488' : '#D97706',
                }}
              >
                {asset.position_verification_status === 'VERIFIED' ? 'Đã xác minh thực địa' : 'Tọa độ ước lượng'}
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              backgroundColor: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              color: '#64748B',
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            Chưa xác minh vị trí thiết bị trên bản đồ tọa độ cảng.
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. ATTACHED METERS (MEASURES vs INSTALLED_AT)                */}
      {/* ============================================================ */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>
          Công tơ gắn kết ({contextData?.meters.length || 0})
        </div>

        {/* 4.1. Meters MEASURING this asset */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#073B5C', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Gauge size={13} />
            <span>Đo lường điện năng / môi chất (MEASURES)</span>
          </div>

          {measuresMeters.length > 0 ? (
            measuresMeters.map((m) => (
              <div
                key={`measures-${m.relation_id}`}
                onClick={() => onSelectMeter && onSelectMeter(m.meter_id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  marginBottom: 6,
                  backgroundColor: '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#073B5C' }}>{m.meter_code}</span>
                  {m.is_primary && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#0D9488', backgroundColor: '#E2F4E9', padding: '1px 5px', borderRadius: 3 }}>
                      Chính
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{m.meter_name}</div>
                {m.latest_reading_value ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#64748B' }}>Chỉ số gần nhất:</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{m.latest_reading_value}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>Chưa có lượt ghi</div>
                )}
              </div>
            ))
          ) : (
            <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', paddingLeft: 4 }}>
              Chưa có công tơ đo lường cho thiết bị này.
            </div>
          )}
        </div>

        {/* 4.2. Meters INSTALLED AT this asset */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#073B5C', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Layers size={13} />
            <span>Lắp đặt vật lý tại đây (INSTALLED_AT)</span>
          </div>

          {installedMeters.length > 0 ? (
            installedMeters.map((m) => (
              <div
                key={`installed-${m.relation_id}`}
                onClick={() => onSelectMeter && onSelectMeter(m.meter_id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  marginBottom: 6,
                  backgroundColor: '#F8FAFC',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#073B5C' }}>{m.meter_code}</span>
                  <ChevronRight size={14} color="#94A3B8" />
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>{m.meter_name}</div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', paddingLeft: 4 }}>
              Không có công tơ nào được lắp đặt tại vỏ tủ thiết bị này.
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. TOPOLOGY CONNECTIONS                                      */}
      {/* ============================================================ */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>
          Kết nối mạng lưới tiện ích
        </div>

        {/* Upstream Sources */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpRight size={13} />
            <span>Nguồn cấp (Upstream):</span>
          </div>
          {contextData && contextData.upstream_connections.length > 0 ? (
            contextData.upstream_connections.map((c) => (
              <div
                key={`up-${c.id}`}
                onClick={() => onSelectAsset && onSelectAsset(c.source_asset_id)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  backgroundColor: '#F1F5F9',
                  marginBottom: 4,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontWeight: 600, color: '#073B5C' }}>{c.source_asset_code}</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>{c.source_asset_name}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', paddingLeft: 4 }}>
              Là điểm nguồn đầu nguồn hoặc chưa kết nối.
            </div>
          )}
        </div>

        {/* Downstream Targets */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowDownRight size={13} />
            <span>Cấp điện/nước đến (Downstream):</span>
          </div>
          {contextData && contextData.downstream_connections.length > 0 ? (
            contextData.downstream_connections.map((c) => (
              <div
                key={`down-${c.id}`}
                onClick={() => onSelectAsset && onSelectAsset(c.target_asset_id)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  backgroundColor: '#F1F5F9',
                  marginBottom: 4,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontWeight: 600, color: '#073B5C' }}>{c.target_asset_code}</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>{c.target_asset_name}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', paddingLeft: 4 }}>
              Là điểm tiêu thụ cuối hoặc chưa có liên kết phụ tải.
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. ADMIN VERIFICATION SHORTCUT                               */}
      {/* ============================================================ */}
      {!isApproved && canManageVerification && onOpenVerificationReview && (
        <div style={{ padding: '16px 20px', backgroundColor: '#FFFBEB' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <ShieldCheck size={16} color="#D97706" style={{ marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>
                Hồ sơ thiết bị đang chờ đối soát
              </div>
              <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                Yêu cầu minh chứng thực địa hoặc bản vẽ kỹ thuật để xác thực thiết bị này vào hạ tầng chính thức.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenVerificationReview(asset.id)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <ShieldCheck size={14} />
            <span>Mở bàn đối soát thiết bị</span>
          </button>
        </div>
      )}
    </aside>
  );
};
