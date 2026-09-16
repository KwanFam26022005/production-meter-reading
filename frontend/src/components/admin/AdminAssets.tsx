import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Network,
  Gauge,
  ChevronRight,
  X,
  Info,
  MapPin,
  ClipboardCheck,
  ExternalLink,
} from 'lucide-react';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';
import { OperationalWorkspaceHeader } from '../../features/workspace/OperationalWorkspaceHeader';
import {
  Asset,
  AssetType,
  AssetLifecycleStatus,
  AssetVerificationStatus,
  MeterAssetRelation,
  AssetConnection,
} from '../../features/assets/types';
import {
  getAdminAssets,
  getAdminAssetById,
  createAdminAsset,
  retireAdminAsset,
  getAdminMeterAssetRelations,
  createAdminMeterAssetRelation,
  closeAdminMeterAssetRelation,
  verifyAdminMeterAssetRelation,
  getAdminAssetConnections,
} from '../../services/api';

const ASSET_TYPES: AssetType[] = [
  'SUBSTATION',
  'TRANSFORMER',
  'FEEDER',
  'SWITCHBOARD',
  'QUAY_CRANE',
  'RTG',
  'VEHICLE',
  'PUMP',
  'COMPRESSOR',
  'MACHINE',
  'WAREHOUSE',
  'WORKSHOP',
  'OFFICE',
  'WATER_POINT',
  'FIRE_WATER_POINT',
  'SHORE_POWER_POINT',
  'OTHER',
];

export const AdminAssets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('ALL');
  const [verifFilter, setVerifFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ACTIVE_SCENARIO' | 'LEGACY_TEST' | 'ALL'>('ACTIVE_SCENARIO');

  // Selected asset for detail drawer
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetRelations, setAssetRelations] = useState<MeterAssetRelation[]>([]);
  const [assetConnections, setAssetConnections] = useState<AssetConnection[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  let workspace: ReturnType<typeof useOperationalWorkspace> | null = null;
  try {
    workspace = useOperationalWorkspace();
  } catch {
    workspace = null;
  }

  // Auto-focus asset if navigated from another workspace view (e.g. Map or Verification)
  useEffect(() => {
    if (!workspace?.focusedEntity) return;
    const fe = workspace.focusedEntity;
    if (fe.type === 'asset' && assets.length > 0) {
      const match = assets.find((a) => a.id === fe.id || a.code === fe.code);
      if (match && selectedAsset?.id !== match.id) {
        handleSelectAsset(match);
      }
    }
  }, [workspace?.focusedEntity, assets]);

  // Create / Edit modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<AssetType>('OTHER');
  const [formZone, setFormZone] = useState<string>('');
  const [formParent, setFormParent] = useState<string>('');
  const [formMobility, setFormMobility] = useState<'FIXED' | 'MOBILE'>('FIXED');
  const [formPosSource, setFormPosSource] = useState<string>('STATIC_MAP');
  const [formMapX, setFormMapX] = useState<string>('');
  const [formMapY, setFormMapY] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Link Meter modal
  const [isLinkMeterOpen, setIsLinkMeterOpen] = useState<boolean>(false);
  const [linkMeterId, setLinkMeterId] = useState<string>('');
  const [linkRelationType, setLinkRelationType] = useState<'INSTALLED_AT' | 'MEASURES'>('MEASURES');
  const [linkMountPoint, setLinkMountPoint] = useState<string>('');
  const [linkSubmitting, setLinkSubmitting] = useState<boolean>(false);

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminAssets({
        search: searchQuery || undefined,
        asset_type: typeFilter === 'ALL' ? undefined : typeFilter,
        lifecycle_status: lifecycleFilter === 'ALL' ? undefined : lifecycleFilter,
        verification_status: verifFilter === 'ALL' ? undefined : verifFilter,
        scenario_id: scopeFilter === 'ACTIVE_SCENARIO' ? 'tan-thuan-demo-v1' : scopeFilter === 'ALL' ? 'ALL' : undefined,
        data_origin: scopeFilter === 'LEGACY_TEST' ? 'LEGACY_TEST_DATA' : undefined,
      });
      setAssets(res.assets);
      setTotal(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách thiết bị.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [searchQuery, typeFilter, lifecycleFilter, verifFilter, scopeFilter]);

  const handleSelectAsset = async (asset: Asset) => {
    setSelectedAsset(asset);
    setDetailLoading(true);
    try {
      const [freshAsset, relRes, connRes] = await Promise.all([
        getAdminAssetById(asset.id),
        getAdminMeterAssetRelations({ asset_id: asset.id, active_only: false }),
        getAdminAssetConnections({ source_asset_id: asset.id, active_only: false }),
      ]);
      setSelectedAsset(freshAsset);
      setAssetRelations(relRes.relations);
      setAssetConnections(connRes.connections);
    } catch (err) {
      console.error('Failed to load asset details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const mx = formMapX.trim() ? parseFloat(formMapX.trim()) : null;
    const my = formMapY.trim() ? parseFloat(formMapY.trim()) : null;

    try {
      await createAdminAsset({
        code: formCode.trim(),
        name: formName.trim(),
        asset_type: formType,
        zone_id: formZone.trim() || null,
        parent_asset_id: formParent.trim() || null,
        mobility_type: formMobility,
        position_source: formPosSource,
        map_x: mx,
        map_y: my,
        verification_status: 'SIMULATION_APPROVED',
        data_origin: 'SIMULATED',
        scenario_id: 'tan-thuan-demo-v1',
      });
      setIsCreateOpen(false);
      resetForm();
      loadAssets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo thiết bị.';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormCode('');
    setFormName('');
    setFormType('OTHER');
    setFormZone('');
    setFormParent('');
    setFormMobility('FIXED');
    setFormPosSource('STATIC_MAP');
    setFormMapX('');
    setFormMapY('');
    setFormError(null);
  };

  const handleRetireAsset = async (asset: Asset) => {
    const reason = prompt('Lý do thu hồi / ngừng hoạt động thiết bị:', 'Thu hồi theo quy trình vận hành');
    if (reason === null) return;
    try {
      await retireAdminAsset(asset.id, reason);
      loadAssets();
      if (selectedAsset?.id === asset.id) {
        handleSelectAsset(asset);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể thu hồi thiết bị');
    }
  };

  const handleLinkMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !linkMeterId.trim()) return;
    setLinkSubmitting(true);
    try {
      await createAdminMeterAssetRelation({
        meter_id: linkMeterId.trim(),
        asset_id: selectedAsset.id,
        relation_type: linkRelationType,
        mount_point: linkMountPoint.trim() || undefined,
        verification_status: 'SIMULATION_APPROVED',
      });
      setIsLinkMeterOpen(false);
      setLinkMeterId('');
      setLinkMountPoint('');
      handleSelectAsset(selectedAsset);
      loadAssets();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể liên kết công tơ.');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleCloseRelation = async (relId: string) => {
    if (!confirm('Xác nhận đóng liên kết này? Lịch sử vẫn được lưu trữ.')) return;
    try {
      await closeAdminMeterAssetRelation(relId);
      if (selectedAsset) handleSelectAsset(selectedAsset);
      loadAssets();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể đóng liên kết');
    }
  };

  const handleVerifyRelation = async (relId: string) => {
    try {
      await verifyAdminMeterAssetRelation(relId);
      if (selectedAsset) handleSelectAsset(selectedAsset);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể xác minh liên kết');
    }
  };

  const renderDataOriginBadge = (origin?: string, scenarioId?: string | null) => {
    if (origin === 'SIMULATED') {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300"
          title={`Kịch bản: ${scenarioId || 'tan-thuan-demo-v1'}`}
        >
          Mô phỏng
        </span>
      );
    }
    if (origin === 'LEGACY_TEST_DATA') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Dữ liệu cũ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        Thực tế
      </span>
    );
  };

  const renderVerificationBadge = (status: AssetVerificationStatus) => {
    if (status === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} />
          Đã xác minh
        </span>
      );
    }
    if (status === 'SIMULATION_APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 size={12} />
          Mô phỏng duyệt
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={12} />
          Từ chối
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle size={12} />
        Chưa xác minh
      </span>
    );
  };

  const renderLifecycleBadge = (status: AssetLifecycleStatus) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Hoạt động
        </span>
      );
    }
    if (status === 'RETIRED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
          Thu hồi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
        Ngừng
      </span>
    );
  };

  const activeCount = assets.filter((a) => a.lifecycle_status === 'ACTIVE').length;
  const attentionCount = assets.filter(
    (a) => a.verification_status === 'UNVERIFIED' || a.verification_status === 'REJECTED'
  ).length;
  const inactiveCount = assets.filter((a) => a.lifecycle_status === 'INACTIVE' || a.lifecycle_status === 'RETIRED').length;

  return (
    <div className="admin-assets-page p-6 max-w-7xl mx-auto space-y-6">
      {/* UNIFIED WORKSPACE HEADER */}
      <OperationalWorkspaceHeader
        currentTab="assets"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* HEADER (Section 15: Production Polish) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Boxes className="text-sky-600" size={26} />
              Thiết bị & hạ tầng
            </h1>
            <span
              className="sgp-sim-badge"
              title="Dữ liệu thiết bị và mạng lưới trong môi trường này được tạo để mô phỏng và không phải dữ liệu hạ tầng thực tế của doanh nghiệp."
              style={{
                padding: '2px 8px',
                backgroundColor: '#F1F5F9',
                color: '#334155',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: '1px solid #CBD5E1',
                cursor: 'help',
              }}
            >
              Dữ liệu mô phỏng
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý thiết bị, công trình và các điểm hạ tầng trong kịch bản hiện tại.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus size={16} />
          Thêm thiết bị
        </button>
      </div>

      {/* SUMMARY STRIP (Section 17) */}
      <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
        <span className="font-semibold text-slate-900">{total} Thiết bị</span>
        <span className="text-slate-300">|</span>
        <span className="text-emerald-700 font-medium">{activeCount} Đang sử dụng</span>
        <span className="text-slate-300">|</span>
        <span className="text-amber-700 font-medium">{attentionCount} Cần chú ý</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 font-medium">{inactiveCount} Đã ngừng</span>
      </div>

      {/* LEGACY QUARANTINE BANNER (Section 18: Quiet, informational banner when looking at legacy data) */}
      {scopeFilter === 'LEGACY_TEST' && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-center gap-2.5">
          <Info size={16} className="text-slate-400 shrink-0" />
          <span>
            Dữ liệu này được giữ để phục vụ kiểm thử và lịch sử kỹ thuật; không tham gia vận hành của kịch bản hiện tại.
          </span>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm theo mã hoặc tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as 'ACTIVE_SCENARIO' | 'LEGACY_TEST' | 'ALL')}
            className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          >
            <option value="ACTIVE_SCENARIO">Mô phỏng (tan-thuan-demo-v1)</option>
            <option value="LEGACY_TEST">Dữ liệu thử nghiệm cũ</option>
            <option value="ALL">Tất cả nguồn dữ liệu</option>
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">Tất cả loại thiết bị</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value)}
            className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động (Active)</option>
            <option value="INACTIVE">Ngừng sử dụng</option>
            <option value="RETIRED">Đã thu hồi (Retired)</option>
          </select>
        </div>

        <div>
          <select
            value={verifFilter}
            onChange={(e) => setVerifFilter(e.target.value)}
            className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">Tất cả xác minh</option>
            <option value="VERIFIED">Đã xác minh</option>
            <option value="SIMULATION_APPROVED">Mô phỏng duyệt</option>
            <option value="UNVERIFIED">Chưa xác minh</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Đang tải danh sách thiết bị...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Không tìm thấy thiết bị nào. Bấm "Thêm thiết bị mới" để bắt đầu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã thiết bị</th>
                  <th className="py-3 px-4">Tên thiết bị</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Khu vực</th>
                  <th className="py-3 px-4">Nguồn dữ liệu</th>
                  <th className="py-3 px-4">Công tơ</th>
                  <th className="py-3 px-4">Vòng đời</th>
                  <th className="py-3 px-4">Xác minh</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => handleSelectAsset(a)}
                    className={`cursor-pointer transition hover:bg-slate-50 ${
                      selectedAsset?.id === a.id ? 'bg-sky-50/60' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{a.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{a.name}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">{a.asset_type}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{a.zone_name || a.zone_code || '—'}</td>
                    <td className="py-3 px-4">{renderDataOriginBadge(a.data_origin, a.scenario_id)}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {a.attached_meters_count > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                          <Gauge size={12} />
                          {a.attached_meters_count}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-4">{renderLifecycleBadge(a.lifecycle_status)}</td>
                    <td className="py-3 px-4">{renderVerificationBadge(a.verification_status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {a.map_x !== null && a.map_y !== null && workspace && (
                          <button
                            type="button"
                            onClick={() =>
                              workspace.locateOnMap({
                                type: 'asset',
                                id: a.id,
                                code: a.code,
                                name: a.name,
                                coordinates: [a.map_x!, a.map_y!],
                              })
                            }
                            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition"
                            title="Định vị thiết bị trên Bản đồ tác nghiệp"
                            aria-label={`Định vị ${a.code} trên Bản đồ`}
                          >
                            <MapPin size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSelectAsset(a)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                          title="Xem chi tiết thiết bị"
                          aria-label={`Xem chi tiết ${a.code}`}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selectedAsset && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex justify-end transition-opacity"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Drawer Top */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {selectedAsset.code}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedAsset.name}</h2>
                  <div className="flex items-center gap-2 mt-3">
                    {selectedAsset.map_x !== null && selectedAsset.map_y !== null && workspace && (
                      <button
                        type="button"
                        onClick={() =>
                          workspace.locateOnMap({
                            type: 'asset',
                            id: selectedAsset.id,
                            code: selectedAsset.code,
                            name: selectedAsset.name,
                            coordinates: [selectedAsset.map_x!, selectedAsset.map_y!],
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#073B5C] hover:bg-[#0a4d78] text-white text-xs font-semibold rounded-lg shadow-sm transition"
                        title="Định vị và thu phóng trên Bản đồ tác nghiệp"
                      >
                        <MapPin size={13} />
                        <span>Định vị trên Bản đồ</span>
                      </button>
                    )}
                    {workspace && (
                      <button
                        type="button"
                        onClick={() => workspace.openVerification(selectedAsset.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-lg transition"
                        title="Mở hồ sơ đối soát và minh chứng kỹ thuật"
                      >
                        <ClipboardCheck size={13} />
                        <span>Đối soát hồ sơ</span>
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              {detailLoading ? (
                <div className="p-12 text-center text-slate-400 text-sm">Đang tải thông tin chi tiết...</div>
              ) : (
                <>
                  {/* Identity & Status */}
                  <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 block">Loại thiết bị:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedAsset.asset_type}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Khu vực vận hành:</span>
                  <span className="font-medium text-slate-800">
                    {selectedAsset.zone_name || selectedAsset.zone_code || 'Chưa gán'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Tính di động:</span>
                  <span className="text-slate-800">{selectedAsset.mobility_type}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Nguồn vị trí:</span>
                  <span className="text-slate-800">{selectedAsset.position_source}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Trạng thái vòng đời:</span>
                  <div className="mt-0.5">{renderLifecycleBadge(selectedAsset.lifecycle_status)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Tình trạng xác minh:</span>
                  <div className="mt-0.5">{renderVerificationBadge(selectedAsset.verification_status)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Nguồn dữ liệu / Kịch bản:</span>
                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {renderDataOriginBadge(selectedAsset.data_origin, selectedAsset.scenario_id)}
                    {selectedAsset.scenario_id && (
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {selectedAsset.scenario_id}
                      </span>
                    )}
                  </div>
                </div>
                {selectedAsset.parent_asset && (
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 block">Trực thuộc thiết bị cha:</span>
                    <span className="font-medium text-slate-800">
                      {selectedAsset.parent_asset.name} ({selectedAsset.parent_asset.code})
                    </span>
                  </div>
                )}
                {selectedAsset.map_x !== null && selectedAsset.map_y !== null && (
                  <div className="col-span-2 font-mono text-xs text-slate-500">
                    Tọa độ chuẩn hóa: [{selectedAsset.map_x.toFixed(4)}, {selectedAsset.map_y.toFixed(4)}]
                  </div>
                )}
              </div>

              {/* Visual SVG Mini-Map Preview Widget */}
              {selectedAsset.map_x !== null && selectedAsset.map_y !== null && (
                <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2 font-medium">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-sky-400" />
                      Vị trí không gian trên sơ đồ cảng
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      X: {(selectedAsset.map_x * 100).toFixed(1)}% · Y: {(selectedAsset.map_y * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="relative w-full rounded-lg overflow-hidden bg-[#0c1828] border border-slate-700/60 cursor-pointer group"
                    style={{ aspectRatio: '1915 / 821' }}
                    onClick={() => {
                      if (workspace) {
                        workspace.locateOnMap({
                          type: 'asset',
                          id: selectedAsset.id,
                          code: selectedAsset.code,
                          name: selectedAsset.name,
                          coordinates: [selectedAsset.map_x!, selectedAsset.map_y!],
                        });
                      }
                    }}
                    title="Bấm để mở và phóng to trên bản đồ lớn"
                  >
                    <svg className="w-full h-full" viewBox="0 0 1915 821" preserveAspectRatio="none">
                      <path d="M 0 0 L 1915 0 L 1915 320 Q 1400 360 1000 450 Q 500 580 0 620 Z" fill="#0c2340" opacity="0.6" />
                      <line x1="320" y1="480" x2="1680" y2="340" stroke="#38bdf8" strokeWidth="8" strokeDasharray="16 8" opacity="0.4" />
                      <rect x="250" y="520" width="380" height="240" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" opacity="0.5" />
                      <rect x="680" y="460" width="450" height="280" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" opacity="0.5" />
                      <rect x="1180" y="380" width="480" height="340" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" opacity="0.5" />
                    </svg>
                    <div
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                      style={{
                        left: `${selectedAsset.map_x * 100}%`,
                        top: `${selectedAsset.map_y * 100}%`,
                      }}
                    >
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-sky-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500 border-2 border-white shadow-lg" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-sm text-[10px] text-sky-300 font-semibold px-2 py-0.5 rounded border border-sky-500/30 flex items-center gap-1 group-hover:bg-sky-600 group-hover:text-white transition">
                      <span>Mở bản đồ lớn</span>
                      <ExternalLink size={10} />
                    </div>
                  </div>
                </div>
              )}

              {/* Attached Meters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Gauge size={16} className="text-sky-600" />
                    Công tơ liên kết ({assetRelations.length})
                  </h3>
                  {selectedAsset.lifecycle_status !== 'RETIRED' && (
                    <button
                      type="button"
                      onClick={() => setIsLinkMeterOpen(true)}
                      className="text-xs text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
                    >
                      <Plus size={13} />
                      Gán công tơ
                    </button>
                  )}
                </div>

                {assetRelations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                    Chưa có công tơ nào liên kết với thiết bị này.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assetRelations.map((rel) => (
                      <div
                        key={rel.id}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                          rel.valid_to ? 'bg-slate-100/70 border-slate-200 opacity-60' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">{rel.meter_code}</span>
                            <span className="text-slate-500">— {rel.meter_name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-slate-500">
                            <span className="px-1.5 py-0.2 bg-slate-100 rounded font-semibold text-[10px]">
                              {rel.relation_type}
                            </span>
                            {renderVerificationBadge(rel.verification_status)}
                            {rel.valid_to && <span className="text-slate-400 font-mono">(Lịch sử đã đóng)</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {rel.verification_status !== 'VERIFIED' && !rel.valid_to && (
                            <button
                              type="button"
                              onClick={() => handleVerifyRelation(rel.id)}
                              className="px-2 py-1 text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200"
                            >
                              Xác minh
                            </button>
                          )}
                          {!rel.valid_to && (
                            <button
                              type="button"
                              onClick={() => handleCloseRelation(rel.id)}
                              className="px-2 py-1 text-[11px] bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 rounded border border-slate-200"
                            >
                              Đóng
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Topology Connections */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Network size={16} className="text-sky-600" />
                  Mạng lưới tiện ích kết nối ({assetConnections.length})
                </h3>
                {assetConnections.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                    Chưa có kết nối mạng lưới nào được thiết lập.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assetConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-slate-800">
                            {conn.source_asset_name} → {conn.target_asset_name}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-slate-500">
                            <span className="font-mono text-[10px]">{conn.utility_type}</span>
                            <span className="text-[10px]">({conn.connection_type})</span>
                            {renderVerificationBadge(conn.verification_status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              {selectedAsset.lifecycle_status !== 'RETIRED' ? (
                <button
                  type="button"
                  onClick={() => handleRetireAsset(selectedAsset)}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium transition"
                >
                  Thu hồi thiết bị
                </button>
              ) : (
                <span className="text-xs text-slate-400 italic">Thiết bị đã thu hồi (Chỉ xem lịch sử)</span>
              )}
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ASSET MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-800">Thêm thiết bị mới</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {formError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{formError}</div>}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã thiết bị *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: RTG-01, TBA-02"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên thiết bị *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cẩu khung RTG số 1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phân loại *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as AssetType)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    {ASSET_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tính di động</label>
                  <select
                    value={formMobility}
                    onChange={(e) => setFormMobility(e.target.value as 'FIXED' | 'MOBILE')}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="FIXED">Cố định (Fixed)</option>
                    <option value="MOBILE">Di động (Mobile)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tọa độ X [0, 1]</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    placeholder="Tùy chọn"
                    value={formMapX}
                    onChange={(e) => setFormMapX(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tọa độ Y [0, 1]</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    placeholder="Tùy chọn"
                    value={formMapY}
                    onChange={(e) => setFormMapY(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Chấm vị trí trên sơ đồ</span>
                  <span className="text-[11px] text-slate-400">Nhấp chuột vào bản đồ để chọn tọa độ</span>
                </div>
                <div
                  className="relative w-full rounded-lg overflow-hidden bg-[#0c1828] border border-slate-300 cursor-crosshair"
                  style={{ aspectRatio: '1915 / 821' }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                    setFormMapX(nx.toFixed(4));
                    setFormMapY(ny.toFixed(4));
                  }}
                  title="Nhấp chuột vào vị trí bất kỳ để gán tọa độ"
                >
                  <svg className="w-full h-full" viewBox="0 0 1915 821" preserveAspectRatio="none">
                    <path d="M 0 0 L 1915 0 L 1915 320 Q 1400 360 1000 450 Q 500 580 0 620 Z" fill="#0c2340" opacity="0.6" />
                    <line x1="320" y1="480" x2="1680" y2="340" stroke="#38bdf8" strokeWidth="8" strokeDasharray="16 8" opacity="0.4" />
                    <rect x="250" y="520" width="380" height="240" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" opacity="0.5" />
                    <rect x="680" y="460" width="450" height="280" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" opacity="0.5" />
                    <rect x="1180" y="380" width="480" height="340" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" opacity="0.5" />
                  </svg>
                  {parseFloat(formMapX) >= 0 && parseFloat(formMapY) >= 0 && (
                    <div
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                      style={{
                        left: `${parseFloat(formMapX) * 100}%`,
                        top: `${parseFloat(formMapY) * 100}%`,
                      }}
                    >
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500 border-2 border-white shadow" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {formSubmitting ? 'Đang tạo...' : 'Xác nhận tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINK METER MODAL */}
      {isLinkMeterOpen && selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-800">Liên kết công tơ với {selectedAsset.name}</h2>
              <button
                type="button"
                onClick={() => setIsLinkMeterOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLinkMeterSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ID công tơ *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập ID công tơ trong hệ thống"
                  value={linkMeterId}
                  onChange={(e) => setLinkMeterId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại quan hệ *</label>
                <select
                  value={linkRelationType}
                  onChange={(e) => setLinkRelationType(e.target.value as 'INSTALLED_AT' | 'MEASURES')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="MEASURES">Đo lường phụ tải (MEASURES)</option>
                  <option value="INSTALLED_AT">Lắp đặt tại tủ/chassis (INSTALLED_AT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm lắp đặt cụ thể</label>
                <input
                  type="text"
                  placeholder="VD: Cửa tủ hạ thế ngăn 3"
                  value={linkMountPoint}
                  onChange={(e) => setLinkMountPoint(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLinkMeterOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={linkSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {linkSubmitting ? 'Đang liên kết...' : 'Tạo liên kết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
