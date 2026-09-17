import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  MoreVertical,
  Edit2,
  Navigation,
  Power,
  Link as LinkIcon,
  Zap,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  ChevronRight,
  Database,
} from 'lucide-react';
import type { Asset, MeterAssetRelation, AssetConnection } from '../assets/types';
import type { AdminMeterItem } from '../../types';

export interface EntityDetailSurfaceProps {
  entityType: 'asset' | 'meter';
  asset?: Asset | null;
  meter?: AdminMeterItem | null;
  relations?: MeterAssetRelation[];
  connections?: AssetConnection[];
  latestReading?: {
    readingValue?: string | number | null;
    recordedAt?: string | null;
    readingId?: string | null;
  } | null;
  isLoading?: boolean;
  onClose: () => void;
  onLocateOnMap?: () => void;
  onEdit?: () => void;
  onRelocate?: () => void;
  onRetireOrDeactivate?: () => void;
  onLinkMeter?: () => void;
  onSelectRelatedEntity?: (type: 'asset' | 'meter', id: string, code?: string) => void;
  onInspectReading?: (readingId: string) => void;
}

export const EntityDetailSurface: React.FC<EntityDetailSurfaceProps> = ({
  entityType,
  asset,
  meter,
  relations = [],
  connections = [],
  latestReading,
  isLoading = false,
  onClose,
  onLocateOnMap,
  onEdit,
  onRelocate,
  onRetireOrDeactivate,
  onLinkMeter,
  onSelectRelatedEntity,
  onInspectReading,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RELATIONS'>('OVERVIEW');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMenuOpen) {
          setIsMenuOpen(false);
          e.stopPropagation();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isMenuOpen]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Derived values
  const code = entityType === 'asset' ? asset?.code : meter?.meter_code;
  const name = entityType === 'asset' ? asset?.name : meter?.name;
  const zoneName = entityType === 'asset' ? (asset?.zone_name || asset?.zone_id) : (meter?.location || meter?.zone_name || meter?.zone_id || 'Chưa gán phân khu');
  const hasCoordinates = entityType === 'asset'
    ? (asset?.map_x !== null && asset?.map_x !== undefined && asset?.map_y !== null && asset?.map_y !== undefined)
    : (meter?.map_x !== null && meter?.map_x !== undefined && meter?.map_y !== null && meter?.map_y !== undefined);
  const coordsText = entityType === 'asset'
    ? hasCoordinates ? `X: ${asset?.map_x?.toFixed(4)}, Y: ${asset?.map_y?.toFixed(4)}` : null
    : hasCoordinates ? `X: ${meter?.map_x?.toFixed(4)}, Y: ${meter?.map_y?.toFixed(4)}` : null;

  const isWater = entityType === 'meter'
    ? (meter?.utility_type === 'WATER' || meter?.meter_code?.startsWith('SIM-WM-'))
    : (asset?.asset_type?.includes('WATER') || asset?.asset_type === 'PUMP');

  const unit = isWater ? 'm³' : 'kWh';

  const lifecycleStatus = entityType === 'asset'
    ? (asset?.lifecycle_status || 'ACTIVE')
    : (meter?.lifecycle_status || (meter?.is_active ? 'ACTIVE' : 'INACTIVE'));

  const isVerified = entityType === 'asset'
    ? (asset?.verification_status === 'SIMULATION_APPROVED' || asset?.verification_status === 'VERIFIED')
    : true;

  return (
    <div
      className="sgp-entity-detail-surface-container fixed inset-y-0 right-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết ${entityType === 'asset' ? 'thiết bị' : 'công tơ'} ${code}`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over surface */}
      <div className="sgp-entity-detail-surface relative ml-auto w-full max-w-[460px] bg-white shadow-2xl flex flex-col h-full z-10 border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* 1. Header (Read-First) */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-tabular font-bold text-sm text-cyan-950 bg-cyan-100/80 px-2 py-0.5 rounded border border-cyan-200">
                  {code}
                </span>
                {entityType === 'asset' ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 border border-slate-300/80 uppercase">
                    {asset?.asset_type || 'HẠ TẦNG'}
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      isWater
                        ? 'text-sky-700 bg-sky-50 border-sky-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200'
                    }`}
                  >
                    {isWater ? <Droplets size={11} /> : <Zap size={11} />}
                    {isWater ? 'Công tơ Nước' : 'Công tơ Điện'}
                  </span>
                )}
                {lifecycleStatus === 'ACTIVE' ? (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Hoạt động
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    {lifecycleStatus === 'RETIRED' ? 'Đã thu hồi' : 'Tạm ngừng'}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 truncate leading-snug">
                {name || 'Chưa đặt tên'}
              </h2>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">{zoneName}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              aria-label="Đóng chi tiết"
              title="Đóng (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2. Action Bar: Primary [Xem trên bản đồ] + [⋮ Quản trị] Menu */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/80">
            <button
              type="button"
              onClick={onLocateOnMap}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-900 bg-cyan-50 hover:bg-cyan-100/80 border border-cyan-300 rounded-lg transition-colors shadow-sm"
              title="Xem và phóng to vị trí trên bản đồ không gian"
            >
              <Navigation size={13} className="text-cyan-700" />
              <span>Xem trên bản đồ</span>
            </button>

            {/* Quản trị Overflow Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isMenuOpen
                    ? 'bg-slate-200 border-slate-400 text-slate-900'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
                title="Tùy chọn quản trị"
                aria-label="Tùy chọn quản trị"
                aria-expanded={isMenuOpen}
              >
                <MoreVertical size={16} />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                  role="menu"
                >
                  {onRelocate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRelocate();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left"
                      role="menuitem"
                    >
                      <MapPin size={13} className="text-cyan-600" />
                      <span>Đặt lại vị trí bản đồ</span>
                    </button>
                  )}

                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onEdit();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left"
                      role="menuitem"
                    >
                      <Edit2 size={13} className="text-slate-600" />
                      <span>Chỉnh sửa thông tin</span>
                    </button>
                  )}

                  {entityType === 'asset' && onLinkMeter && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLinkMeter();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left"
                      role="menuitem"
                    >
                      <LinkIcon size={13} className="text-blue-600" />
                      <span>Liên kết công tơ</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" />

                  {onRetireOrDeactivate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRetireOrDeactivate();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left"
                      role="menuitem"
                    >
                      <Power size={13} />
                      <span>
                        {entityType === 'asset'
                          ? 'Thu hồi thiết bị'
                          : lifecycleStatus === 'ACTIVE'
                          ? 'Tạm ngừng sử dụng'
                          : 'Kích hoạt lại'}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'OVERVIEW'
                  ? 'bg-cyan-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              onClick={() => setActiveTab('OVERVIEW')}
            >
              Tổng quan
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'RELATIONS'
                  ? 'bg-cyan-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              onClick={() => setActiveTab('RELATIONS')}
            >
              Quan hệ & Đo lường
              {relations.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800">
                  {relations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Surface Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Đang tải dữ liệu thực thể...
            </div>
          ) : activeTab === 'OVERVIEW' ? (
            /* TAB 1: TỔNG QUAN */
            <div className="space-y-4">
              {/* Technical Attributes Card */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={13} className="text-cyan-700" />
                  Thuộc tính kỹ thuật
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Trạng thái vòng đời</span>
                    <span className="font-semibold text-slate-800">
                      {lifecycleStatus === 'ACTIVE' ? 'Đang vận hành' : lifecycleStatus === 'RETIRED' ? 'Đã thu hồi' : 'Tạm dừng'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Trạng thái xác minh</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {isVerified ? 'Mô phỏng chuẩn' : 'Chờ đối soát'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phân loại</span>
                    <span className="font-semibold text-slate-800">
                      {entityType === 'asset' ? asset?.asset_type : meter?.meter_type || 'LCD'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phân khu</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {zoneName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Spatial Location Card */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} className="text-cyan-700" />
                  Định vị không gian GIS
                </h3>
                {hasCoordinates ? (
                  <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Tọa độ chuẩn hóa</span>
                      <span className="font-tabular font-bold text-cyan-900">{coordsText}</span>
                    </div>
                    <button
                      type="button"
                      onClick={onLocateOnMap}
                      className="text-cyan-700 hover:text-cyan-900 font-semibold text-xs flex items-center gap-1"
                    >
                      <span>Mở bản đồ</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <span>Thiết bị chưa được chấm điểm định vị trên sơ đồ GIS cảng.</span>
                  </div>
                )}
              </div>

              {/* Latest Telemetry Card (For Meter or Asset with Meter) */}
              {(latestReading?.readingValue !== undefined || entityType === 'meter') && (
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={13} className="text-cyan-700" />
                    Chỉ số ghi nhận gần nhất
                  </h3>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Giá trị đo đếm</span>
                      <span className="font-tabular font-extrabold text-base text-slate-900">
                        {latestReading?.readingValue ? `${latestReading.readingValue} ${unit}` : meter?.latest_reading ? `${meter.latest_reading} ${unit}` : 'Chưa có chỉ số'}
                      </span>
                      {(latestReading?.recordedAt || meter?.latest_reading_time) && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          <span>{latestReading?.recordedAt || meter?.latest_reading_time}</span>
                        </div>
                      )}
                    </div>
                    {latestReading?.readingId && onInspectReading && (
                      <button
                        type="button"
                        onClick={() => onInspectReading(latestReading.readingId!)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                      >
                        Hồ sơ ảnh
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: QUAN HỆ & ĐO LƯỜNG */
            <div className="space-y-4">
              {entityType === 'asset' ? (
                /* ASSET: ATTACHED METERS & NETWORK EDGES */
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Công tơ gắn kết ({relations.length})
                      </h4>
                      {onLinkMeter && (
                        <button
                          type="button"
                          onClick={onLinkMeter}
                          className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
                        >
                          <LinkIcon size={11} />
                          <span>Thêm liên kết</span>
                        </button>
                      )}
                    </div>

                    {relations.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 text-center py-6">
                        Chưa có công tơ nào được liên kết với thiết bị này
                      </div>
                    ) : (
                      relations.map((rel) => (
                        <div
                          key={rel.id}
                          className="p-3 rounded-lg border border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50/50 transition-colors flex items-center justify-between cursor-pointer"
                          onClick={() => onSelectRelatedEntity?.('meter', rel.meter_id, rel.meter_code)}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-tabular font-bold text-xs text-cyan-900">
                                {rel.meter_code || rel.meter_id}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {rel.relation_type === 'MEASURES' ? 'Đo lường' : 'Vị trí lắp'}
                              </span>
                            </div>
                            <span className="text-xs text-slate-600 mt-0.5 block">
                              {rel.meter_name || 'Công tơ đo phụ tải'}
                            </span>
                          </div>
                          <ChevronRight size={14} className="text-slate-400" />
                        </div>
                      ))
                    )}
                  </div>

                  {connections.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Đấu nối mạng lưới ({connections.length})
                      </h4>
                      <div className="space-y-1.5">
                        {connections.map((conn) => (
                          <div
                            key={conn.id}
                            className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between"
                          >
                            <span className="font-medium text-slate-700">
                              {conn.source_asset_id === asset?.id ? `Đến ${conn.target_asset_code || conn.target_asset_id}` : `Từ ${conn.source_asset_code || conn.source_asset_id}`}
                            </span>
                            <span className="font-semibold text-slate-500 uppercase text-[10px]">
                              {conn.utility_type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* METER: ATTACHED ASSET & MEASURED LOAD */
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Đối tượng phụ tải & Điểm lắp đặt
                  </h4>
                  {relations.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 text-center py-6">
                      Chưa có dữ liệu liên kết thiết bị hạ tầng cho công tơ này
                    </div>
                  ) : (
                    relations.map((rel) => (
                      <div
                        key={rel.id}
                        className="p-3 rounded-lg border border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50/50 transition-colors flex items-center justify-between cursor-pointer"
                        onClick={() => onSelectRelatedEntity?.('asset', rel.asset_id, rel.asset_code)}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-tabular font-bold text-xs text-slate-900">
                              {rel.asset_code || rel.asset_id}
                            </span>
                            <span className="text-[10px] font-semibold text-cyan-800 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                              {rel.relation_type === 'MEASURES' ? 'Phụ tải đo lường' : 'Vị trí lắp đặt'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-600 mt-0.5 block">
                            {rel.asset_name || 'Thiết bị hạ tầng cảng'}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>Kịch bản: tan-thuan-demo-v1</span>
          <span>Dữ liệu mô phỏng chuẩn</span>
        </div>
      </div>
    </div>
  );
};
