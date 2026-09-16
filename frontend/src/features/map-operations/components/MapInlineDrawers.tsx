import React, { useState } from 'react';
import {
  X,
  Search,
  Boxes,
  ClipboardCheck,
  MapPin,
  ExternalLink,
  Zap,
  Droplets,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Asset } from '../../assets/types';
import { useOperationalWorkspace } from '../../../context/OperationalWorkspaceContext';

interface MapInlineDrawersProps {
  assets: Asset[];
  activeDrawer: 'assets' | 'verification' | null;
  onClose: () => void;
  onLocateAsset: (asset: Asset) => void;
}

export const MapInlineDrawers: React.FC<MapInlineDrawersProps> = ({
  assets,
  activeDrawer,
  onClose,
  onLocateAsset,
}) => {
  const { openAssetDetails, openVerification, utilityFilter } = useOperationalWorkspace();
  const [filterQuery, setFilterQuery] = useState('');

  if (!activeDrawer) return null;

  // Filter assets by utility and query
  const filteredAssets = assets.filter((a) => {
    if (utilityFilter === 'ELECTRICITY') {
      const isElec = a.asset_type !== 'WATER_POINT' && a.asset_type !== 'PUMP';
      if (!isElec) return false;
    } else if (utilityFilter === 'WATER') {
      const isWater = a.asset_type === 'WATER_POINT' || a.asset_type === 'PUMP';
      if (!isWater) return false;
    }
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.zone_id && a.zone_id.toLowerCase().includes(q))
    );
  });

  return (
    <aside
      className="sgp-map-inline-drawer"
      role="dialog"
      aria-label={activeDrawer === 'assets' ? 'Danh mục Thiết bị Hạ tầng' : 'Trung tâm Đối soát Nhanh'}
    >
      {/* Header */}
      <div className="sgp-mid-header">
        <div className="sgp-mid-title-wrap">
          {activeDrawer === 'assets' ? (
            <>
              <div className="sgp-mid-icon-box assets">
                <Boxes size={18} />
              </div>
              <div>
                <h3 className="sgp-mid-title">Danh mục Thiết bị ({filteredAssets.length})</h3>
                <span className="sgp-mid-subtitle">Hạ tầng Cảng Tân Thuận</span>
              </div>
            </>
          ) : (
            <>
              <div className="sgp-mid-icon-box verification">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h3 className="sgp-mid-title">Đối soát Hồ sơ & Ca ghi</h3>
                <span className="sgp-mid-subtitle">2 mục đang chờ thẩm định</span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="sgp-mid-close-btn"
          onClick={onClose}
          aria-label="Đóng bảng"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search Input for Assets */}
      {activeDrawer === 'assets' && (
        <div className="sgp-mid-search-bar">
          <Search size={14} className="sgp-mid-search-icon" />
          <input
            type="text"
            placeholder="Lọc mã thiết bị, tên, khu vực..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="sgp-mid-input"
          />
          {filterQuery && (
            <button
              type="button"
              className="sgp-mid-clear-btn"
              onClick={() => setFilterQuery('')}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Drawer Content */}
      <div className="sgp-mid-content">
        {activeDrawer === 'assets' ? (
          <div className="sgp-mid-asset-list">
            {filteredAssets.length === 0 ? (
              <div className="sgp-mid-empty">
                Không tìm thấy thiết bị phù hợp bộ lọc.
              </div>
            ) : (
              filteredAssets.map((asset) => {
                const isWater = asset.asset_type === 'WATER_POINT' || asset.asset_type === 'PUMP';
                return (
                  <div key={asset.id} className="sgp-mid-asset-card">
                    <div className="sgp-mid-card-top">
                      <div className="sgp-mid-code-wrap">
                        {isWater ? (
                          <Droplets size={13} className="sgp-text-cyan" />
                        ) : (
                          <Zap size={13} className="sgp-text-amber" />
                        )}
                        <span className="sgp-mid-code">{asset.code}</span>
                      </div>
                      <span className={`sgp-mid-status-tag ${asset.verification_status.toLowerCase()}`}>
                        {asset.verification_status === 'VERIFIED' ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    </div>

                    <div className="sgp-mid-name">{asset.name}</div>

                    <div className="sgp-mid-card-footer">
                      <span className="sgp-mid-type-badge">{asset.asset_type}</span>
                      <div className="sgp-mid-card-actions">
                        <button
                          type="button"
                          className="sgp-mid-action-btn primary"
                          onClick={() => {
                            onLocateAsset(asset);
                            onClose();
                          }}
                          title="Bay đến vị trí tài sản trên bản đồ"
                        >
                          <MapPin size={13} />
                          <span>Định vị</span>
                        </button>
                        <button
                          type="button"
                          className="sgp-mid-action-btn secondary"
                          onClick={() => {
                            openAssetDetails(asset.id, asset.code);
                          }}
                          title="Mở hồ sơ chi tiết trong tab Thiết bị"
                        >
                          <ExternalLink size={13} />
                          <span>Thiết bị</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Verification Quick Panel */
          <div className="sgp-mid-verification-list">
            <div className="sgp-mid-notice">
              <AlertTriangle size={15} className="sgp-text-amber" />
              <span>Phát hiện 1 đề xuất tài sản mới và 1 chỉ số ca ghi cần đối soát.</span>
            </div>

            {/* Proposal Card */}
            <div className="sgp-mid-verify-card">
              <div className="sgp-mid-verify-tag proposal">Đề xuất hạ tầng mới</div>
              <div className="sgp-mid-verify-title">Trạm Biến Áp Bổ Sung Cầu Cảng (SIM-SUB-PROP-01)</div>
              <div className="sgp-mid-verify-meta">Nguồn phát hiện: Khảo sát thực địa · Khu vực: pres-berth</div>
              <div className="sgp-mid-verify-actions">
                <button
                  type="button"
                  className="sgp-mid-btn-verify-nav"
                  onClick={() => openVerification('prop-01')}
                >
                  <span>Mở Trung tâm Đối soát</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Reading Anomaly Card */}
            <div className="sgp-mid-verify-card">
              <div className="sgp-mid-verify-tag reading">Bất thường chỉ số ca ghi</div>
              <div className="sgp-mid-verify-title">Công tơ PE-01 (Máy biến áp chính TR-01)</div>
              <div className="sgp-mid-verify-meta">Chỉ số OCR: 1,485,200 kWh · Lệch ngưỡng tiêu thụ định mức (+18%)</div>
              <div className="sgp-mid-verify-actions">
                <button
                  type="button"
                  className="sgp-mid-btn-verify-nav"
                  onClick={() => openVerification()}
                >
                  <span>Hậu kiểm trong Đối soát</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
