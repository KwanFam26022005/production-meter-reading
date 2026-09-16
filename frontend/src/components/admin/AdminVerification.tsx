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
} from 'lucide-react';
import {
  Asset,
  MeterAssetRelation,
  AssetVerificationSummary,
  MeterReviewMatrixItem,
  EvidenceType,
  VerificationEvidence,
} from '../../features/assets/types';
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
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected' | 'matrix'>('pending');
  const [summary, setSummary] = useState<AssetVerificationSummary | null>(null);
  const [matrix, setMatrix] = useState<MeterReviewMatrixItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [relations, setRelations] = useState<MeterAssetRelation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);

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
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="bg-white border border-[#D7E0E5] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D7E0E5] pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#073B5C] flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-[#12658F]" />
              Đối soát & Xác minh Hạ tầng (V16D)
            </h2>
            <p className="text-sm text-[#53636D]">
              Quy trình chuyển đổi đề xuất ứng viên thành dữ liệu hạ tầng chính thức. Mọi quyết định xác minh bắt buộc đính kèm căn cứ thực tế.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8F1F5] hover:bg-[#D7E0E5] text-[#073B5C] font-semibold text-sm rounded-lg transition-colors border border-[#B8C6CE]"
            >
              <DownloadCloud className="w-4 h-4 text-[#12658F]" />
              {isImporting ? 'Đang nạp đề xuất...' : 'Nạp đề xuất ứng viên (Import)'}
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-[#F6F8F9] rounded-lg border border-[#D7E0E5]">
              <div className="text-xs text-[#53636D]">Ứng viên khám phá</div>
              <div className="text-xl font-bold text-[#073B5C]">{summary.assetCandidates}</div>
              <div className="text-[11px] text-[#74838C]">Đề xuất từ hồ sơ sơ bộ</div>
            </div>
            <div className="p-3 bg-[#EAF6F1] rounded-lg border border-[#B8DEC9]">
              <div className="text-xs text-[#167A5A]">Thiết bị đã xác minh</div>
              <div className="text-xl font-bold text-[#167A5A]">{summary.verifiedAssets}</div>
              <div className="text-[11px] text-[#167A5A]">Có đầy đủ chứng thực</div>
            </div>
            <div className="p-3 bg-[#FFF4DF] rounded-lg border border-[#FFE0A3]">
              <div className="text-xs text-[#A86200]">Chờ xác minh</div>
              <div className="text-xl font-bold text-[#A86200]">{summary.unverifiedAssets}</div>
              <div className="text-[11px] text-[#A86200]">Chưa đưa vào vận hành</div>
            </div>
            <div className="p-3 bg-[#F6F8F9] rounded-lg border border-[#D7E0E5]">
              <div className="text-xs text-[#53636D]">Liên kết công tơ</div>
              <div className="text-xl font-bold text-[#073B5C]">
                {summary.verifiedMeterRelations} <span className="text-xs text-[#74838C]">/ {summary.meterRelations}</span>
              </div>
              <div className="text-[11px] text-[#74838C]">{summary.unverifiedMeterRelations} liên kết chờ duyệt</div>
            </div>
            <div className="p-3 bg-[#FCECEC] rounded-lg border border-[#F5B5B5]">
              <div className="text-xs text-[#B43A3A]">Công tơ xem xét vị trí</div>
              <div className="text-xl font-bold text-[#B43A3A]">{summary.spatialReviewMeters.length}</div>
              <div className="text-[11px] text-[#B43A3A]">CT-001, 007, 008, 009, 010</div>
            </div>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="bg-[#EAF6F1] border border-[#167A5A] text-[#167A5A] px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {actionSuccess}
          </span>
          <button onClick={() => setActionSuccess(null)} className="text-[#167A5A] hover:underline">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-[#FCECEC] border border-[#B43A3A] text-[#B43A3A] px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[#B43A3A] hover:underline">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Workspace Tabs & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 border-b border-[#D7E0E5] pb-px">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'border-[#073B5C] text-[#073B5C]'
                : 'border-transparent text-[#53636D] hover:text-[#073B5C]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-[#A86200]" />
            Chờ xác minh
            {summary && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#FFF4DF] text-[#A86200] font-bold">
                {summary.unverifiedAssets}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('verified')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'verified'
                ? 'border-[#167A5A] text-[#167A5A]'
                : 'border-transparent text-[#53636D] hover:text-[#167A5A]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-[#167A5A]" />
            Đã xác minh
            {summary && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#EAF6F1] text-[#167A5A] font-bold">
                {summary.verifiedAssets}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'rejected'
                ? 'border-[#B43A3A] text-[#B43A3A]'
                : 'border-transparent text-[#53636D] hover:text-[#B43A3A]'
            }`}
          >
            <XCircle className="w-4 h-4 text-[#B43A3A]" />
            Bị từ chối
            {summary && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#FCECEC] text-[#B43A3A] font-bold">
                {summary.rejectedAssets}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'border-[#12658F] text-[#12658F]'
                : 'border-transparent text-[#53636D] hover:text-[#12658F]'
            }`}
          >
            <Gauge className="w-4 h-4 text-[#12658F]" />
            Ma trận 12 công tơ
          </button>
        </div>

        {activeTab !== 'matrix' && (
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#74838C]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã hoặc tên thiết bị..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-[#D7E0E5] rounded-lg focus:outline-none focus:border-[#073B5C]"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="p-8 text-center text-[#53636D]">Đang tải danh sách đối soát...</div>
      ) : activeTab === 'matrix' ? (
        /* 12-METER REVIEW MATRIX */
        <div className="bg-white border border-[#D7E0E5] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#D7E0E5] bg-[#F6F8F9] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#073B5C]">
              Ma Trận Đối Soát 12 Công Tơ Hiện Hữu (authoritative baseline)
            </h3>
            <span className="text-xs text-[#53636D]">12 công tơ cố định, tọa độ không đổi</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#18242C]">
              <thead className="bg-[#F2F7F9] text-[#073B5C] font-semibold border-b border-[#D7E0E5]">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7E0E5]">
                {matrix.map((row) => (
                  <tr key={row.meter_code} className="hover:bg-[#F6F8F9]">
                    <td className="px-4 py-3 font-mono font-bold text-[#073B5C]">{row.meter_code}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-[#E8F1F5] rounded text-[11px] font-semibold text-[#073B5C]">
                        {row.utility}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#18242C]">
                      {row.proposed_measures || <span className="text-[#74838C]">Chưa có</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.measures_confidence ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.measures_confidence === 'HIGH'
                              ? 'bg-[#EAF6F1] text-[#167A5A]'
                              : row.measures_confidence === 'MEDIUM'
                              ? 'bg-[#FFF4DF] text-[#A86200]'
                              : 'bg-[#F2F7F9] text-[#53636D]'
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
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.measures_verification === 'VERIFIED'
                            ? 'bg-[#EAF6F1] text-[#167A5A]'
                            : row.measures_verification === 'REJECTED'
                            ? 'bg-[#FCECEC] text-[#B43A3A]'
                            : 'bg-[#FFF4DF] text-[#A86200]'
                        }`}
                      >
                        {row.measures_verification}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.proposed_installed_at ? (
                        <span>{row.proposed_installed_at}</span>
                      ) : (
                        <span className="text-[#74838C]">Chưa liên kết</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.asset_position_known ? (
                        <span className="text-[#167A5A] font-semibold">Đã có</span>
                      ) : (
                        <span className="text-[#A86200]">Chưa có</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.missing_info.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.missing_info.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-[#FFF4DF] text-[#A86200] rounded text-[10px]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#167A5A] text-xs">Đầy đủ</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.is_spatial_review_required ? (
                        <span className="px-2 py-0.5 bg-[#FFF4DF] text-[#A86200] border border-[#FFE0A3] rounded text-[10px] font-bold">
                          SPATIAL REVIEW
                        </span>
                      ) : (
                        <span className="text-[#74838C] text-[10px]">Bình thường</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ASSET CANDIDATES QUEUE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.length === 0 ? (
            <div className="col-span-full bg-white border border-[#D7E0E5] rounded-xl p-8 text-center text-[#53636D]">
              Không có thiết bị nào trong trạng thái này.
            </div>
          ) : (
            assets.map((asset) => {
              const rel = relations.find((r) => r.asset_id === asset.id);
              return (
                <div
                  key={asset.id}
                  className="bg-white border border-[#D7E0E5] rounded-xl p-4 shadow-sm hover:border-[#073B5C] transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#12658F] bg-[#E8F1F5] px-2 py-0.5 rounded">
                          {asset.code}
                        </span>
                        <h4 className="font-bold text-[#073B5C] mt-1 text-sm">{asset.name}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          asset.verification_status === 'VERIFIED'
                            ? 'bg-[#EAF6F1] text-[#167A5A]'
                            : asset.verification_status === 'REJECTED'
                            ? 'bg-[#FCECEC] text-[#B43A3A]'
                            : 'bg-[#FFF4DF] text-[#A86200]'
                        }`}
                      >
                        {asset.verification_status === 'VERIFIED'
                          ? 'Đã xác minh'
                          : asset.verification_status === 'REJECTED'
                          ? 'Bị từ chối'
                          : 'Chờ xác minh'}
                      </span>
                    </div>

                    <div className="text-xs text-[#53636D] space-y-1">
                      <div className="flex justify-between">
                        <span>Phân loại:</span>
                        <span className="font-semibold text-[#18242C]">{asset.asset_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vị trí bản đồ:</span>
                        <span className="font-mono">
                          {asset.map_x !== null && asset.map_y !== null
                            ? `(${asset.map_x.toFixed(4)}, ${asset.map_y.toFixed(4)})`
                            : 'Chưa có'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tính di động:</span>
                        <span>{asset.mobility_type === 'MOBILE' ? 'Di động' : 'Cố định'}</span>
                      </div>
                      {rel && (
                        <div className="pt-2 border-t border-[#D7E0E5]">
                          <div className="flex justify-between items-center text-[#073B5C] font-semibold">
                            <span>Đo bởi:</span>
                            <span className="font-mono text-[#12658F]">{rel.meter_code}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-[#74838C]">
                            <span>Quan hệ:</span>
                            <span>{rel.relation_type} ({rel.confidence || 'MEDIUM'})</span>
                          </div>
                          {rel.verification_status !== 'VERIFIED' && (
                            <div className="mt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => openRelationReview(rel)}
                                className="text-[11px] text-[#12658F] hover:underline font-semibold"
                              >
                                Đối soát liên kết
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#D7E0E5] flex items-center justify-between gap-2">
                    <button
                      onClick={() => openPositionModal(asset)}
                      className="text-xs font-semibold text-[#12658F] hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {asset.map_x !== null ? 'Đổi tọa độ' : 'Đặt vị trí'}
                    </button>

                    <div className="flex items-center gap-2">
                      {asset.verification_status === 'REJECTED' ? (
                        <button
                          onClick={() => handleReopenAsset(asset)}
                          className="px-3 py-1.5 bg-[#F2F7F9] hover:bg-[#E8F1F5] text-[#073B5C] text-xs font-semibold rounded-lg border border-[#B8C6CE]"
                        >
                          Mở lại rà soát
                        </button>
                      ) : (
                        <button
                          onClick={() => openAssetReview(asset)}
                          className="px-3 py-1.5 bg-[#073B5C] hover:bg-[#0B4F75] text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Đối soát & Xác minh
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

      {/* MODAL: ASSET REVIEW & EVIDENCE */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-[#D7E0E5] max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#D7E0E5] flex items-center justify-between">
              <h3 className="font-bold text-[#073B5C] text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#12658F]" />
                Đối Soát Thiết Bị: {selectedAsset.code}
              </h3>
              <button onClick={() => setSelectedAsset(null)} className="text-[#74838C] hover:text-[#18242C]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#18242C]">
              {/* 1. THIẾT BỊ */}
              <div className="p-3 bg-[#F6F8F9] rounded-lg border border-[#D7E0E5] space-y-2">
                <h4 className="font-bold text-[#073B5C] uppercase text-[11px]">1. Thông tin Thiết Bị</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#53636D]">Tên thiết bị:</span>
                    <p className="font-semibold text-[#073B5C]">{selectedAsset.name}</p>
                  </div>
                  <div>
                    <span className="text-[#53636D]">Loại tài sản:</span>
                    <p className="font-semibold text-[#073B5C]">{selectedAsset.asset_type}</p>
                  </div>
                  <div>
                    <span className="text-[#53636D]">Tính di động:</span>
                    <p>{selectedAsset.mobility_type === 'MOBILE' ? 'Thiết bị di động' : 'Thiết bị cố định'}</p>
                  </div>
                  <div>
                    <span className="text-[#53636D]">Tọa độ bản đồ:</span>
                    <p className="font-mono">
                      {selectedAsset.map_x !== null
                        ? `(${selectedAsset.map_x.toFixed(4)}, ${selectedAsset.map_y?.toFixed(4)})`
                        : 'Chưa có tọa độ'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. BẰNG CHỨNG XÁC MINH */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#073B5C] uppercase text-[11px]">2. Căn cứ & Bằng chứng Xác minh</h4>
                <div>
                  <label className="block font-semibold mb-1 text-[#073B5C]">
                    Loại bằng chứng thực tế <span className="text-red-500">*</span>:
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                    className="w-full p-2 border border-[#D7E0E5] rounded-lg bg-white text-xs focus:outline-none focus:border-[#073B5C]"
                  >
                    {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#073B5C]">
                    Số hiệu / Định danh tài liệu <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={evidenceReference}
                    onChange={(e) => setEvidenceReference(e.target.value)}
                    placeholder="Ví dụ: BB-KSTT-2026-09-16 / Sơ đồ bản vẽ TTA-01 / Ảnh nameplate"
                    className="w-full p-2 border border-[#D7E0E5] rounded-lg text-xs focus:outline-none focus:border-[#073B5C]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#073B5C]">Ghi chú đối soát:</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Chi tiết kết luận kỹ thuật..."
                    className="w-full p-2 border border-[#D7E0E5] rounded-lg text-xs focus:outline-none focus:border-[#073B5C]"
                  />
                </div>

                {pastEvidences.length > 0 && (
                  <div className="mt-3 p-3 bg-[#F2F7F9] rounded border border-[#D7E0E5]">
                    <span className="font-semibold text-[#073B5C] block mb-1 text-[11px]">
                      Lịch sử bằng chứng đã ghi nhận ({pastEvidences.length}):
                    </span>
                    <ul className="space-y-1 text-[11px]">
                      {pastEvidences.map((ev) => (
                        <li key={ev.id} className="text-[#53636D]">
                          • <span className="font-semibold text-[#073B5C]">{ev.evidence_type}</span>:{' '}
                          {ev.evidence_reference} ({new Date(ev.verified_at).toLocaleDateString('vi-VN')})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 3. TỪ CHỐI (OPTIONAL REASON) */}
              <div className="pt-2 border-t border-[#D7E0E5]">
                <label className="block font-semibold mb-1 text-[#53636D]">
                  Lý do từ chối (chỉ điền khi bấm Từ chối):
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Không tồn tại thực tế / sai lệch danh mục"
                  className="w-full p-2 border border-[#D7E0E5] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#D7E0E5] flex items-center justify-between bg-[#F6F8F9]">
              <button
                type="button"
                onClick={handleRejectAsset}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white hover:bg-[#FCECEC] text-[#B43A3A] border border-[#F5B5B5] font-semibold text-xs rounded-lg transition-colors"
              >
                Từ chối thiết bị
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="px-4 py-2 bg-white border border-[#D7E0E5] text-[#53636D] text-xs font-semibold rounded-lg hover:bg-[#F6F8F9]"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAsset}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#167A5A] hover:bg-[#0E5B42] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-[#D7E0E5] max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#D7E0E5] flex items-center justify-between">
              <h3 className="font-bold text-[#073B5C] text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#12658F]" />
                Đối Soát Quan Hệ: {selectedRelation.meter_code} ↔ {selectedRelation.asset_code}
              </h3>
              <button onClick={() => setSelectedRelation(null)} className="text-[#74838C] hover:text-[#18242C]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#18242C]">
              <div className="p-3 bg-[#F6F8F9] rounded-lg border border-[#D7E0E5] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#53636D]">Công tơ:</span>
                  <span className="font-mono font-bold text-[#073B5C]">{selectedRelation.meter_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#53636D]">Thiết bị:</span>
                  <span className="font-mono font-bold text-[#073B5C]">{selectedRelation.asset_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#53636D]">Loại liên kết:</span>
                  <span>{selectedRelation.relation_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#53636D]">Độ tin cậy đề xuất:</span>
                  <span className="font-semibold">{selectedRelation.confidence || 'MEDIUM'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#073B5C]">
                    Loại bằng chứng thực tế <span className="text-red-500">*</span>:
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                    className="w-full p-2 border border-[#D7E0E5] rounded-lg bg-white text-xs"
                  >
                    {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#073B5C]">
                    Số hiệu / Căn cứ tài liệu <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={evidenceReference}
                    onChange={(e) => setEvidenceReference(e.target.value)}
                    placeholder="VD: BB-KT-2026-03 hoặc Sơ đồ tủ điện"
                    className="w-full p-2 border border-[#D7E0E5] rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#073B5C]">Ghi chú kỹ thuật:</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Ghi chú xác minh..."
                    className="w-full p-2 border border-[#D7E0E5] rounded-lg text-xs"
                  />
                </div>

                {pastEvidences.length > 0 && (
                  <div className="p-3 bg-[#F2F7F9] rounded border border-[#D7E0E5]">
                    <span className="font-semibold text-[#073B5C] block mb-1 text-[11px]">
                      Lịch sử bằng chứng ({pastEvidences.length}):
                    </span>
                    <ul className="space-y-1 text-[11px]">
                      {pastEvidences.map((ev) => (
                        <li key={ev.id} className="text-[#53636D]">
                          • <span className="font-semibold">{ev.evidence_type}</span>: {ev.evidence_reference}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#D7E0E5]">
                <label className="block font-semibold mb-1 text-[#53636D]">Lý do từ chối (nếu từ chối):</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Sai lệch đấu nối / không cấp nguồn thiết bị này"
                  className="w-full p-2 border border-[#D7E0E5] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#D7E0E5] flex items-center justify-between bg-[#F6F8F9]">
              <button
                type="button"
                onClick={handleRejectRelation}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white hover:bg-[#FCECEC] text-[#B43A3A] border border-[#F5B5B5] font-semibold text-xs rounded-lg transition-colors"
              >
                Từ chối liên kết
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRelation(null)}
                  className="px-4 py-2 bg-white border border-[#D7E0E5] text-[#53636D] text-xs font-semibold rounded-lg"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleVerifyRelation}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#167A5A] hover:bg-[#0E5B42] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-[#D7E0E5] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D7E0E5] pb-3">
              <h3 className="font-bold text-[#073B5C] text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#12658F]" />
                Đặt vị trí: {positionAsset.code}
              </h3>
              <button onClick={() => setPositionAsset(null)} className="text-[#74838C]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#073B5C]">Tọa độ X [0, 1]:</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={posX}
                    onChange={(e) => setPosX(e.target.value)}
                    className="w-full p-2 border border-[#D7E0E5] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#073B5C]">Tọa độ Y [0, 1]:</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={posY}
                    onChange={(e) => setPosY(e.target.value)}
                    className="w-full p-2 border border-[#D7E0E5] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#073B5C]">Bằng chứng định vị:</label>
                <input
                  type="text"
                  value={evidenceReference}
                  onChange={(e) => setEvidenceReference(e.target.value)}
                  placeholder="Ví dụ: Tọa độ GPS thực địa / Mặt bằng cảng"
                  className="w-full p-2 border border-[#D7E0E5] rounded-lg text-xs"
                />
              </div>

              {posWarning && (
                <div className="p-2.5 bg-[#FFF4DF] border border-[#FFE0A3] text-[#A86200] rounded text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{posWarning}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D7E0E5]">
              <button
                type="button"
                onClick={() => setPositionAsset(null)}
                className="px-4 py-2 border border-[#D7E0E5] text-xs font-semibold rounded-lg text-[#53636D]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSavePosition}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#073B5C] hover:bg-[#0B4F75] text-white text-xs font-bold rounded-lg"
              >
                {isSubmitting ? 'Đang lưu...' : 'Xác nhận tọa độ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
