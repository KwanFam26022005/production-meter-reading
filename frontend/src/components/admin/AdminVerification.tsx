import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  DownloadCloud,
  MapPin,
  Gauge,
  X,
  ShieldCheck,
  Boxes,
  Eye,
  Calendar,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  Asset,
  MeterAssetRelation,
  AssetVerificationSummary,
  MeterReviewMatrixItem,
  EvidenceType,
  VerificationEvidence,
} from '../../features/assets/types';
import type { AdminDashboardExceptionItem } from '../../types';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';
import { OperationalWorkspaceHeader } from '../../features/workspace/OperationalWorkspaceHeader';
import {
  getAssetVerificationOverview,
  getMeterReviewMatrix,
  getAdminAssets,
  getAdminMeterAssetRelations,
  verifyAdminAsset,
  rejectAdminAssetVerification,
  reopenAdminAssetReview,
  verifyAdminAssetPosition,
  verifyAdminMeterAssetRelation,
  rejectAdminMeterAssetRelation,
  importAdminCandidateProposals,
  getEntityEvidences,
  getAdminDashboard,
} from '../../services/api';

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  FIELD_INSPECTION: 'Khảo sát hiện trường (Field Inspection)',
  MENTOR_CONFIRMATION: 'Xác nhận của chuyên gia / Cán bộ cảng (Mentor Confirmation)',
  PORT_DOCUMENT: 'Hồ sơ kỹ thuật cảng (Port Document)',
  EQUIPMENT_NAMEPLATE: 'Biển tên thiết bị / Nameplate (Equipment Nameplate)',
  METER_PHOTO: 'Ảnh chụp công tơ & tủ điện (Meter Photo)',
  ELECTRICAL_DRAWING: 'Bản vẽ sơ đồ đơn tuyến (Electrical Single-line)',
  WATER_DRAWING: 'Bản vẽ cấp thoát nước (Water Drawing)',
  SCADA_CONFIG: 'Cấu hình hệ thống SCADA / Telemetry',
  OTHER: 'Nguồn chứng thực khác (Other)',
};

export const AdminVerification: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected' | 'matrix'>('verified');
  const [summary, setSummary] = useState<AssetVerificationSummary | null>(null);
  const [matrix, setMatrix] = useState<MeterReviewMatrixItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [relations, setRelations] = useState<MeterAssetRelation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  let workspace: ReturnType<typeof useOperationalWorkspace> | null = null;
  try {
    workspace = useOperationalWorkspace();
  } catch {
    workspace = null;
  }

  const [hubScope, setHubScope] = useState<'infrastructure' | 'readings'>('infrastructure');
  const [readingExceptions, setReadingExceptions] = useState<AdminDashboardExceptionItem[]>([]);
  const [readingsLoading, setReadingsLoading] = useState<boolean>(false);
  const [selectedShiftDate, setSelectedShiftDate] = useState<string>(() => {
    return workspace?.selectedDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  });

  // Auto-focus asset if navigated from another workspace view (e.g. Map or Asset Inventory)
  useEffect(() => {
    if (!workspace?.focusedEntity) return;
    const fe = workspace.focusedEntity;
    if (fe.type === 'asset') {
      setHubScope('infrastructure');
      if (fe.code) {
        setSearch(fe.code);
      }
    }
  }, [workspace?.focusedEntity]);

  const loadShiftReadings = async (dateStr: string) => {
    setReadingsLoading(true);
    try {
      const dash = await getAdminDashboard(dateStr);
      setReadingExceptions(dash.exceptions || []);
    } catch (err: any) {
      console.error('Failed to load shift exceptions', err);
    } finally {
      setReadingsLoading(false);
    }
  };

  useEffect(() => {
    if (hubScope === 'readings') {
      loadShiftReadings(selectedShiftDate);
    }
  }, [hubScope, selectedShiftDate]);

  // Review Modal state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<MeterAssetRelation | null>(null);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('FIELD_INSPECTION');
  const [evidenceReference, setEvidenceReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pastEvidences, setPastEvidences] = useState<VerificationEvidence[]>([]);

  // Position Modal state
  const [positionAsset, setPositionAsset] = useState<Asset | null>(null);
  const [posX, setPosX] = useState<string>('');
  const [posY, setPosY] = useState<string>('');
  const [posWarning, setPosWarning] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, matRes] = await Promise.all([
        getAssetVerificationOverview(),
        getMeterReviewMatrix(),
      ]);
      setSummary(sumRes);
      setMatrix(matRes);

      // Load Assets according to current tab
      let vStatus: string | undefined = undefined;
      if (activeTab === 'pending') vStatus = 'UNVERIFIED';
      else if (activeTab === 'verified') vStatus = 'VERIFIED';
      else if (activeTab === 'rejected') vStatus = 'REJECTED';

      const [assetList, relList] = await Promise.all([
        getAdminAssets({ verification_status: vStatus, search: search.trim() || undefined, limit: 100 }),
        getAdminMeterAssetRelations({ verification_status: vStatus, active_only: true }),
      ]);
      setAssets(assetList.assets);
      setRelations(relList.relations);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu đối soát.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, search]);

  const handleImport = async () => {
    if (!window.confirm('Nạp toàn bộ đề xuất ứng viên từ hồ sơ khám phá (Discovery Proposals)? Quá trình này hoàn toàn bảo toàn dữ liệu và tạo bản ghi Chưa xác minh (UNVERIFIED).')) {
      return;
    }
    setIsImporting(true);
    try {
      const res = await importAdminCandidateProposals();
      setActionSuccess(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Lỗi nạp ứng viên.');
    } finally {
      setIsImporting(false);
    }
  };

  const openAssetReview = async (asset: Asset) => {
    setSelectedAsset(asset);
    setSelectedRelation(null);
    setEvidenceType('FIELD_INSPECTION');
    setEvidenceReference('');
    setNotes('');
    setRejectionReason('');
    try {
      const evs = await getEntityEvidences('ASSET', asset.id);
      setPastEvidences(evs);
    } catch {
      setPastEvidences([]);
    }
  };

  const openRelationReview = async (rel: MeterAssetRelation) => {
    setSelectedRelation(rel);
    setSelectedAsset(null);
    setEvidenceType('PORT_DOCUMENT');
    setEvidenceReference('');
    setNotes('');
    setRejectionReason('');
    try {
      const evs = await getEntityEvidences('METER_ASSET_RELATION', rel.id);
      setPastEvidences(evs);
    } catch {
      setPastEvidences([]);
    }
  };

  const handleVerifyAsset = async () => {
    if (!selectedAsset) return;
    if (!evidenceReference.trim()) {
      alert('Vui lòng nhập định danh / số hiệu tài liệu bằng chứng.');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyAdminAsset(selectedAsset.id, {
        evidence_type: evidenceType,
        evidence_reference: evidenceReference.trim(),
        notes: notes.trim() || undefined,
      });
      setActionSuccess(`Thiết bị ${selectedAsset.code} đã được xác minh thành công.`);
      setSelectedAsset(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi xác minh thiết bị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAsset = async () => {
    if (!selectedAsset) return;
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối thiết bị.');
      return;
    }
    setIsSubmitting(true);
    try {
      await rejectAdminAssetVerification(selectedAsset.id, {
        reason: rejectionReason.trim(),
        notes: notes.trim() || undefined,
      });
      setActionSuccess(`Thiết bị ${selectedAsset.code} đã bị từ chối.`);
      setSelectedAsset(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi từ chối thiết bị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenAsset = async (asset: Asset) => {
    if (!window.confirm(`Mở lại quy trình rà soát cho thiết bị ${asset.code}?`)) return;
    try {
      await reopenAdminAssetReview(asset.id);
      setActionSuccess(`Thiết bị ${asset.code} đã chuyển về trạng thái Chờ xác minh.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi mở lại rà soát.');
    }
  };

  const handleVerifyRelation = async () => {
    if (!selectedRelation) return;
    if (!evidenceReference.trim()) {
      alert('Vui lòng nhập số hiệu bằng chứng xác minh quan hệ.');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyAdminMeterAssetRelation(selectedRelation.id, {
        evidence_type: evidenceType,
        evidence_reference: evidenceReference.trim(),
        notes: notes.trim() || undefined,
        is_primary: true,
      });
      setActionSuccess(`Quan hệ ${selectedRelation.meter_code} ↔ ${selectedRelation.asset_code} đã được xác minh.`);
      setSelectedRelation(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi xác minh quan hệ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRelation = async () => {
    if (!selectedRelation) return;
    setIsSubmitting(true);
    try {
      await rejectAdminMeterAssetRelation(selectedRelation.id, {
        reason: rejectionReason.trim() || 'Từ chối quan hệ qua bảng đối soát',
      });
      setActionSuccess(`Quan hệ ${selectedRelation.meter_code} ↔ ${selectedRelation.asset_code} đã bị từ chối.`);
      setSelectedRelation(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi từ chối quan hệ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPositionModal = (asset: Asset) => {
    setPositionAsset(asset);
    setPosX(asset.map_x !== null ? String(asset.map_x) : '');
    setPosY(asset.map_y !== null ? String(asset.map_y) : '');
    setPosWarning(null);
    setEvidenceReference('');
  };

  const handleSavePosition = async () => {
    if (!positionAsset) return;
    const xNum = parseFloat(posX);
    const yNum = parseFloat(posY);
    if (isNaN(xNum) || isNaN(yNum) || xNum < 0 || xNum > 1 || yNum < 0 || yNum > 1) {
      alert('Tọa độ chuẩn hóa phải nằm trong khoảng [0.0, 1.0]');
      return;
    }
    if (!evidenceReference.trim()) {
      alert('Vui lòng nhập tài liệu / bằng chứng định vị.');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyAdminAssetPosition(positionAsset.id, {
        map_x: xNum,
        map_y: yNum,
        evidence_type: evidenceType,
        evidence_reference: evidenceReference.trim(),
      });
      setActionSuccess(`Đã định vị thiết bị ${positionAsset.code} tại (${xNum.toFixed(4)}, ${yNum.toFixed(4)}).`);
      setPositionAsset(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu tọa độ thiết bị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-verification-wrapper flex flex-col w-full h-full min-h-0 flex-1 overflow-hidden bg-slate-50">
      {/* UNIFIED WORKSPACE HEADER (FULL BLEED) */}
      <OperationalWorkspaceHeader currentTab="verification" />

      <div className="admin-verification-scroll-area flex-1 overflow-y-auto w-full">
        <div className="admin-page-container w-full mx-auto space-y-6 py-6 px-4 sm:px-6 lg:px-8">

      {/* HEADER (Section 15: Production Polish — Synchronized with AdminAssets) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="text-sky-600" size={26} />
              Trung tâm đối soát
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
            Đối soát liên thông hồ sơ kỹ thuật hạ tầng và chỉ số đo đếm ca kíp bảo toàn minh chứng.
          </p>
        </div>

        {/* DUAL SCOPE SEGMENTED CONTROL */}
        <div className="sgp-segmented-scope flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setHubScope('infrastructure')}
            className={`sgp-scope-btn ${hubScope === 'infrastructure' ? 'active' : ''}`}
          >
            <Boxes size={14} className={hubScope === 'infrastructure' ? 'text-sky-600' : 'text-slate-400'} />
            <span>Hồ sơ hạ tầng & thiết bị</span>
            {summary && summary.unverifiedAssets > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {summary.unverifiedAssets}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setHubScope('readings')}
            className={`sgp-scope-btn ${hubScope === 'readings' ? 'active' : ''}`}
          >
            <ClipboardCheck size={14} className={hubScope === 'readings' ? 'text-sky-600' : 'text-slate-400'} />
            <span>Chỉ số & ca ghi</span>
            {readingExceptions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {readingExceptions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {hubScope === 'readings' ? (
        <div className="space-y-4">
          {/* Controls Bar: Date, Refresh, KPI Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-sky-600" />
                <span className="text-xs font-semibold text-slate-600">Ngày ghi nhận:</span>
                <input
                  type="date"
                  value={selectedShiftDate}
                  onChange={(e) => setSelectedShiftDate(e.target.value)}
                  className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={() => loadShiftReadings(selectedShiftDate)}
                disabled={readingsLoading}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                title="Làm mới danh sách bất thường"
              >
                <RefreshCw size={15} className={readingsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600">Cần kiểm tra:</span>
                <span className="font-bold text-amber-700">
                  {readingExceptions.filter((e) => e.exception_state === 'REVIEW').length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">Chưa ghi / Bỏ sót:</span>
                <span className="font-bold text-rose-700">
                  {readingExceptions.filter((e) => e.exception_state === 'MISSING').length}
                </span>
              </div>
            </div>
          </div>

          {/* Shift Reading Anomaly List */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {readingsLoading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Đang tải dữ liệu đối soát ca ghi...</div>
            ) : readingExceptions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Toàn bộ chỉ số ca ghi đã hoàn tất đối soát</h4>
                <p className="text-xs text-slate-500">
                  Không phát hiện bất thường vượt ngưỡng hoặc yêu cầu kiểm tra thực địa trong ca này.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="py-3 px-4">Công tơ</th>
                      <th className="py-3 px-4">Khu vực / Điểm đo</th>
                      <th className="py-3 px-4">Lượt ghi & Ca</th>
                      <th className="py-3 px-4">Tình trạng đối soát</th>
                      <th className="py-3 px-4">Chỉ số OCR ghi nhận</th>
                      <th className="py-3 px-4">Nhân viên ghi</th>
                      <th className="py-3 px-4 text-right">Thao tác xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {readingExceptions.map((exc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 text-xs block">{exc.meter_code}</span>
                          <span className="text-slate-500 text-[11px]">{exc.meter_name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{exc.location}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800 block">{exc.scheduled_local}</span>
                          <span className="text-[10px] text-slate-400">Mã lượt: {exc.round_id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              exc.exception_state === 'REVIEW'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <AlertTriangle size={10} />
                            {exc.exception_label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sm text-slate-900">
                          {exc.ocr_reading || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span>{exc.recorded_by || 'Chưa ghi'}</span>
                          {exc.server_timestamp && (
                            <span className="text-[10px] text-slate-400 block">{exc.server_timestamp}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {workspace && (
                              <button
                                type="button"
                                onClick={() =>
                                  workspace.locateOnMap({
                                    type: 'meter',
                                    id: exc.meter_id,
                                    code: exc.meter_code,
                                    name: exc.meter_name,
                                  })
                                }
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="Định vị công tơ trên Bản đồ"
                              >
                                <MapPin size={15} />
                              </button>
                            )}

                            {exc.reading_id && workspace && (
                              <button
                                type="button"
                                onClick={() => workspace.openReadingInspection(exc.reading_id!)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                                title="Mở đối soát ảnh chụp và chỉ số"
                              >
                                <Eye size={13} />
                                <span>Đối soát ảnh & số</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* SUMMARY STRIP (Section 17 — Synchronized with AdminAssets.tsx) */}
          {summary && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-900">{summary.verifiedAssets} Đã xác minh</span>
              <span className="text-slate-300">|</span>
              <span className="text-amber-700 font-medium">{summary.unverifiedAssets} Chờ xác minh</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-700 font-medium">{summary.verifiedMeterRelations}/{summary.meterRelations} Liên kết công tơ</span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-700 font-medium">{summary.verifiedTopologyConnections}/{summary.topologyConnections} Kết nối mạng lưới</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-medium">{summary.spatialReviewMeters.length} Rà soát vị trí</span>
            </div>
          )}

          {actionSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {actionSuccess}
              </span>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:underline">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-rose-700 hover:underline">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* SUB-TABS & SEARCH CONTROLS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('verified')}
                className={`sgp-subtab-btn ${activeTab === 'verified' ? 'active verified' : ''}`}
              >
                <CheckCircle2 size={13} className={activeTab === 'verified' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Đã xác minh ({summary?.verifiedAssets || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`sgp-subtab-btn ${activeTab === 'pending' ? 'active pending' : ''}`}
              >
                <AlertTriangle size={13} className={activeTab === 'pending' ? 'text-amber-600' : 'text-slate-400'} />
                <span>Chờ xác minh ({summary?.unverifiedAssets || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rejected')}
                className={`sgp-subtab-btn ${activeTab === 'rejected' ? 'active rejected' : ''}`}
              >
                <XCircle size={13} className={activeTab === 'rejected' ? 'text-rose-600' : 'text-slate-400'} />
                <span>Bị từ chối ({summary?.rejectedAssets || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className={`sgp-subtab-btn ${activeTab === 'matrix' ? 'active matrix' : ''}`}
              >
                <Gauge size={13} className={activeTab === 'matrix' ? 'text-sky-600' : 'text-slate-400'} />
                <span>Ma trận 12 công tơ</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab !== 'matrix' && (
                <div className="relative w-full sm:w-60">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm mã hoặc tên thiết bị..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-300 transition"
                title="Nạp đề xuất ứng viên từ hồ sơ khám phá"
              >
                <DownloadCloud size={13} className="text-slate-600" />
                <span>{isImporting ? 'Đang nạp...' : 'Nạp đề xuất'}</span>
              </button>
            </div>
          </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="p-8 text-center text-[#53636D]">Đang tải danh sách đối soát...</div>
      ) : activeTab === 'matrix' ? (
        /* 12-METER REVIEW MATRIX */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Ma Trận Đối Soát 12 Công Tơ Hiện Hữu (authoritative baseline)
            </h3>
            <span className="text-xs text-slate-500">12 công tơ cố định, bảo toàn vị trí chuẩn hóa</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Công tơ</th>
                  <th className="px-4 py-3">Tên hiện hữu</th>
                  <th className="px-4 py-3">Môi chất</th>
                  <th className="px-4 py-3">Đo phụ tải (MEASURES)</th>
                  <th className="px-4 py-3">Độ tin cậy</th>
                  <th className="px-4 py-3">Trạng thái đo</th>
                  <th className="px-4 py-3">Lắp đặt (INSTALLED_AT)</th>
                  <th className="px-4 py-3">Vị trí TB</th>
                  <th className="px-4 py-3">Thông tin còn thiếu</th>
                  <th className="px-4 py-3">Rà soát vị trí</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrix.map((row) => (
                  <tr key={row.meter_code} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {row.meter_code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[11px] font-semibold">
                        {row.utility}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.proposed_measures || <span className="text-slate-400">Chưa có</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.measures_confidence ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            row.measures_confidence === 'HIGH'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : row.measures_confidence === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {row.measures_confidence}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          row.measures_verification === 'VERIFIED' || row.measures_verification === 'SIMULATION_APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : row.measures_verification === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {row.measures_verification === 'SIMULATION_APPROVED' ? 'Đã duyệt MP' : row.measures_verification}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.proposed_installed_at ? (
                        <span>{row.proposed_installed_at}</span>
                      ) : (
                        <span className="text-slate-400">Chưa liên kết</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.asset_position_known ? (
                        <span className="text-emerald-700 font-semibold">Đã có</span>
                      ) : (
                        <span className="text-amber-700">Chưa có</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.missing_info.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.missing_info.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-emerald-700 text-xs font-medium">Đầy đủ</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.is_spatial_review_required ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                          SPATIAL REVIEW
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Bình thường</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {workspace && (
                          <button
                            type="button"
                            onClick={() =>
                              workspace.locateOnMap({
                                type: 'meter',
                                id: row.meter_code,
                                code: row.meter_code,
                                name: row.name,
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Định vị công tơ trên Bản đồ"
                          >
                            <MapPin size={14} />
                          </button>
                        )}
                        {row.proposed_measures && workspace && (
                          <button
                            type="button"
                            onClick={() =>
                              workspace.openAssetDetails(
                                row.proposed_measures!,
                                row.proposed_measures || undefined
                              )
                            }
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Mở trong Danh mục Thiết bị"
                          >
                            <Boxes size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ASSET CANDIDATES QUEUE */
        <div className="sgp-candidate-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              Không có thiết bị nào trong trạng thái này.
            </div>
          ) : (
            assets.map((asset) => {
              const rel = relations.find((r) => r.asset_id === asset.id);
              const isVerified = asset.verification_status === 'VERIFIED' || asset.verification_status === 'SIMULATION_APPROVED';
              const isRejected = asset.verification_status === 'REJECTED';

              return (
                <div
                  key={asset.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {asset.code}
                        </span>
                        <h4 className="font-bold text-slate-800 mt-1 text-sm">{asset.name}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isVerified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {asset.verification_status === 'SIMULATION_APPROVED'
                          ? 'Mô phỏng duyệt'
                          : isVerified
                          ? 'Đã xác minh'
                          : isRejected
                          ? 'Bị từ chối'
                          : 'Chờ xác minh'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phân loại:</span>
                        <span className="font-semibold text-slate-800">{asset.asset_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vị trí bản đồ:</span>
                        <span className="font-mono text-slate-700">
                          {asset.map_x !== null && asset.map_y !== null
                            ? `(${asset.map_x.toFixed(4)}, ${asset.map_y.toFixed(4)})`
                            : 'Chưa có'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tính di động:</span>
                        <span className="text-slate-700">{asset.mobility_type === 'MOBILE' ? 'Di động' : 'Cố định'}</span>
                      </div>
                      {rel && (
                        <div className="pt-2 border-t border-slate-200">
                          <div className="flex justify-between items-center text-slate-800 font-semibold">
                            <span>Đo bởi:</span>
                            <span className="font-mono text-sky-600">{rel.meter_code}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-500">
                            <span>Quan hệ:</span>
                            <span>{rel.relation_type} ({rel.confidence || 'MEDIUM'})</span>
                          </div>
                          {rel.verification_status !== 'VERIFIED' && rel.verification_status !== 'SIMULATION_APPROVED' && (
                            <div className="mt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => openRelationReview(rel)}
                                className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold"
                              >
                                Đối soát liên kết
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPositionModal(asset)}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {asset.map_x !== null ? 'Đổi tọa độ' : 'Đặt vị trí'}
                      </button>

                      {asset.map_x !== null && asset.map_y !== null && workspace && (
                        <button
                          type="button"
                          onClick={() =>
                            workspace.locateOnMap({
                              type: 'asset',
                              id: asset.id,
                              code: asset.code,
                              name: asset.name,
                              coordinates: [asset.map_x!, asset.map_y!],
                            })
                          }
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
                          title="Định vị trên Bản đồ tác nghiệp"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Bản đồ</span>
                        </button>
                      )}

                      {workspace && (
                        <button
                          type="button"
                          onClick={() => workspace.openAssetDetails(asset.id, asset.code)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
                          title="Mở trong Danh mục Thiết bị"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>Thiết bị</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {asset.verification_status === 'REJECTED' ? (
                        <button
                          onClick={() => handleReopenAsset(asset)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition"
                        >
                          Mở lại rà soát
                        </button>
                      ) : (
                        <button
                          onClick={() => openAssetReview(asset)}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition inline-flex items-center gap-1"
                        >
                          <ShieldCheck size={13} />
                          <span>{isVerified ? 'Hồ sơ đối soát' : 'Xác minh'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
        </>
      )}

      {/* MODAL: ASSET REVIEW & EVIDENCE */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
                Đối Soát Thiết Bị: {selectedAsset.code}
              </h3>
              <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* 1. THIẾT BỊ */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px]">1. Thông tin Thiết Bị</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Tên thiết bị:</span>
                    <p className="font-semibold text-slate-900">{selectedAsset.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Loại tài sản:</span>
                    <p className="font-semibold text-slate-900">{selectedAsset.asset_type}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Tính di động:</span>
                    <p>{selectedAsset.mobility_type === 'MOBILE' ? 'Thiết bị di động' : 'Thiết bị cố định'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Tọa độ bản đồ:</span>
                    <p className="font-mono text-slate-800">
                      {selectedAsset.map_x !== null
                        ? `(${selectedAsset.map_x.toFixed(4)}, ${selectedAsset.map_y?.toFixed(4)})`
                        : 'Chưa có tọa độ'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. BẰNG CHỨNG XÁC MINH */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase text-[11px]">2. Căn cứ & Bằng chứng Xác minh</h4>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">
                    Loại bằng chứng thực tế <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700">
                    Số hiệu / Định danh tài liệu <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={evidenceReference}
                    onChange={(e) => setEvidenceReference(e.target.value)}
                    placeholder="Ví dụ: BB-KSTT-2026-09-16 / Sơ đồ bản vẽ TTA-01 / Ảnh nameplate"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Ghi chú đối soát:</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Chi tiết kết luận kỹ thuật..."
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {pastEvidences.length > 0 && (
                  <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="font-semibold text-slate-800 block mb-1 text-[11px]">
                      Lịch sử bằng chứng đã ghi nhận ({pastEvidences.length}):
                    </span>
                    <ul className="space-y-1 text-[11px]">
                      {pastEvidences.map((ev) => (
                        <li key={ev.id} className="text-slate-600">
                          • <span className="font-semibold text-slate-800">{ev.evidence_type}</span>:{' '}
                          {ev.evidence_reference} ({new Date(ev.verified_at).toLocaleDateString('vi-VN')})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 3. TỪ CHỐI (OPTIONAL REASON) */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block font-semibold mb-1 text-slate-600">
                  Lý do từ chối (chỉ điền khi bấm Từ chối):
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Không tồn tại thực tế / sai lệch danh mục"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={handleRejectAsset}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs rounded-lg transition-colors"
              >
                Từ chối thiết bị
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAsset}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Xác minh Thiết Bị'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RELATION REVIEW & EVIDENCE */}
      {selectedRelation && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
                Đối Soát Quan Hệ: {selectedRelation.meter_code} ↔ {selectedRelation.asset_code}
              </h3>
              <button onClick={() => setSelectedRelation(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Công tơ:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRelation.meter_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thiết bị:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRelation.asset_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Loại liên kết:</span>
                  <span className="font-medium text-slate-800">{selectedRelation.relation_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Độ tin cậy đề xuất:</span>
                  <span className="font-semibold text-slate-800">{selectedRelation.confidence || 'MEDIUM'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">
                    Loại bằng chứng thực tế <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700">
                    Số hiệu / Căn cứ tài liệu <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={evidenceReference}
                    onChange={(e) => setEvidenceReference(e.target.value)}
                    placeholder="VD: BB-KT-2026-03 hoặc Sơ đồ tủ điện"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Ghi chú kỹ thuật:</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Ghi chú xác minh..."
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {pastEvidences.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="font-semibold text-slate-800 block mb-1 text-[11px]">
                      Lịch sử bằng chứng ({pastEvidences.length}):
                    </span>
                    <ul className="space-y-1 text-[11px]">
                      {pastEvidences.map((ev) => (
                        <li key={ev.id} className="text-slate-600">
                          • <span className="font-semibold text-slate-800">{ev.evidence_type}</span>: {ev.evidence_reference}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="block font-semibold mb-1 text-slate-600">Lý do từ chối (nếu từ chối):</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Sai lệch đấu nối / không cấp nguồn thiết bị này"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={handleRejectRelation}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs rounded-lg transition-colors"
              >
                Từ chối liên kết
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRelation(null)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleVerifyRelation}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Xác minh Liên kết'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MAP POSITION PLACEMENT */}
      {positionAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                Đặt vị trí: {positionAsset.code}
              </h3>
              <button onClick={() => setPositionAsset(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Tọa độ X [0, 1]:</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={posX}
                    onChange={(e) => setPosX(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Tọa độ Y [0, 1]:</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={posY}
                    onChange={(e) => setPosY(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Bằng chứng định vị:</label>
                <input
                  type="text"
                  value={evidenceReference}
                  onChange={(e) => setEvidenceReference(e.target.value)}
                  placeholder="Ví dụ: Tọa độ GPS thực địa / Mặt bằng cảng"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {posWarning && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{posWarning}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPositionAsset(null)}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSavePosition}
                disabled={isSubmitting}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                {isSubmitting ? 'Đang lưu...' : 'Xác nhận tọa độ'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
