import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes,
  Gauge,
  Layers,
  Plus,
  MapPin,
  AlertTriangle,
  ChevronRight,
  X,
} from 'lucide-react';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';
import {
  Asset,
  AssetType,
  MeterAssetRelation,
  AssetConnection,
} from '../assets/types';
import { AdminMeterItem } from '../../types';
import {
  getAdminAssets,
  getAdminAssetById,
  createAdminAsset,
  retireAdminAsset,
  getAdminMeterAssetRelations,
  createAdminMeterAssetRelation,
  getAdminAssetConnections,
  getAdminMeters,
  createAdminMeter,
  deactivateAdminMeter,
  activateAdminMeter,
  getAdminMeterRelations,
  getAdminMeterLatestReading,
} from '../../services/api';
import { EntityDetailSurface } from './EntityDetailSurface';
import {
  SgpButton,
  SgpSearchField,
  SgpSelect,
  SgpSegmentedControl,
  SgpStatusBadge,
} from '../../components/ui/SgpPrimitives';

export const formatAssetTypeVn = (type?: string): string => {
  switch (type) {
    case 'SUBSTATION': return 'Trạm biến áp';
    case 'TRANSFORMER': return 'Máy biến áp';
    case 'FEEDER': return 'Xuất tuyến';
    case 'SWITCHBOARD': return 'Tủ phân phối';
    case 'QUAY_CRANE': return 'Cẩu bờ QC';
    case 'RTG': return 'Cẩu bãi RTG';
    case 'PUMP': return 'Trạm bơm';
    case 'COMPRESSOR': return 'Máy nén khí';
    case 'WATER_POINT': return 'Điểm cấp nước';
    case 'FIRE_WATER_POINT': return 'Trụ cứu hỏa';
    case 'SHORE_POWER_POINT': return 'Cấp điện tàu';
    case 'WAREHOUSE': return 'Kho hàng';
    case 'WORKSHOP': return 'Xưởng kỹ thuật';
    case 'OFFICE': return 'Văn phòng';
    case 'MACHINE': return 'Cơ điện';
    case 'VEHICLE': return 'Xe cảng';
    default: return type || 'Hạ tầng';
  }
};

const ZONES = [
  { id: 'zone-container', name: 'Bãi Container (CY)' },
  { id: 'zone-wharf', name: 'Cầu tàu & Bến cảng' },
  { id: 'zone-cfs', name: 'Kho CFS & Đóng gói' },
  { id: 'zone-substation', name: 'Trạm biến áp & Phân phối' },
  { id: 'zone-admin', name: 'Văn phòng Điều hành' },
];

export interface UnifiedDeviceRow {
  kind: 'ASSET' | 'METER';
  id: string;
  code: string;
  name: string;
  categoryBadge: string;
  categoryType: string;
  zoneName: string;
  zoneId?: string | null;
  status: string;
  statusLabel: string;
  coordinates: [number, number] | null;
  hasCoordinates: boolean;
  needsAttention: boolean;
  attentionReason?: string;
  relationSummary: string;
  rawAsset?: Asset;
  rawMeter?: AdminMeterItem;
}

export const DevicesWorkspacePage: React.FC = () => {
  const workspace = useOperationalWorkspace();
  const {
    deviceSegment,
    setDeviceSegment,
    locateOnMap,
  } = workspace;

  // Data state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [meters, setMeters] = useState<AdminMeterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState<boolean>(false);

  // Selected Entity for Detail Drawer
  const [selectedEntityRef, setSelectedEntityRef] = useState<{
    type: 'asset' | 'meter';
    id: string;
    code?: string;
  } | null>(null);

  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [activeAssetDetails, setActiveAssetDetails] = useState<Asset | null>(null);
  const [activeMeterDetails, setActiveMeterDetails] = useState<AdminMeterItem | null>(null);
  const [activeRelations, setActiveRelations] = useState<MeterAssetRelation[]>([]);
  const [activeConnections, setActiveConnections] = useState<AssetConnection[]>([]);
  const [activeLatestReading, setActiveLatestReading] = useState<{
    readingValue?: string | number | null;
    recordedAt?: string | null;
    readingId?: string | null;
  } | null>(null);

  // Add Action Menu & Modals
  const [isAddMenuOpen, setIsAddMenuOpen] = useState<boolean>(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const [isCreateAssetOpen, setIsCreateAssetOpen] = useState<boolean>(false);
  const [isCreateMeterOpen, setIsCreateMeterOpen] = useState<boolean>(false);
  const [isLinkMeterOpen, setIsLinkMeterOpen] = useState<boolean>(false);

  // Form states for Asset
  const [formAssetCode, setFormAssetCode] = useState('');
  const [formAssetName, setFormAssetName] = useState('');
  const [formAssetType, setFormAssetType] = useState<AssetType>('SWITCHBOARD');
  const [formAssetZoneId, setFormAssetZoneId] = useState('zone-container');
  const [formAssetLat, setFormAssetLat] = useState('10.7629');
  const [formAssetLng, setFormAssetLng] = useState('106.7705');
  const [createAssetSubmitting, setCreateAssetSubmitting] = useState(false);

  // Form states for Meter
  const [formMeterSerial, setFormMeterSerial] = useState('');
  const [formMeterCode, setFormMeterCode] = useState('');
  const [formMeterType, setFormMeterType] = useState<'MECHANICAL' | 'ELECTRONIC_LCD'>('ELECTRONIC_LCD');
  const [formMeterMultiplier, setFormMeterMultiplier] = useState(1);
  const [formMeterZoneId, setFormMeterZoneId] = useState('zone-container');
  const [createMeterSubmitting, setCreateMeterSubmitting] = useState(false);

  // Form states for Linking Meter
  const [selectedMeterToLink, setSelectedMeterToLink] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  // Click outside listener for Add menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    if (isAddMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddMenuOpen]);

  // Load Assets & Meters data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [assetsRes, metersRes] = await Promise.all([
        getAdminAssets({ limit: 100 }).catch((err) => {
          console.warn('[DevicesWorkspace] Failed to fetch assets:', err);
          return { assets: [], total: 0 };
        }),
        getAdminMeters().catch((err) => {
          console.warn('[DevicesWorkspace] Failed to fetch meters:', err);
          return { meters: [], total: 0 };
        }),
      ]);

      setAssets(assetsRes.assets || []);
      setMeters(metersRes.meters || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu danh mục thiết bị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch full details when an entity is selected
  useEffect(() => {
    if (!selectedEntityRef) {
      setActiveAssetDetails(null);
      setActiveMeterDetails(null);
      setActiveRelations([]);
      setActiveConnections([]);
      setActiveLatestReading(null);
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      setDetailLoading(true);
      try {
        if (selectedEntityRef.type === 'asset') {
          const [asset, relRes, connRes] = await Promise.all([
            getAdminAssetById(selectedEntityRef.id).catch(() => null),
            getAdminMeterAssetRelations({ asset_id: selectedEntityRef.id, active_only: false }).catch(() => ({ relations: [] })),
            getAdminAssetConnections({ source_asset_id: selectedEntityRef.id }).catch(() => ({ connections: [] })),
          ]);

          if (!isMounted) return;
          setActiveAssetDetails(asset);
          setActiveMeterDetails(null);
          setActiveRelations(relRes.relations || []);
          setActiveConnections(connRes.connections || []);
          setActiveLatestReading(null);
        } else {
          const foundMeter = meters.find((m) => m.id === selectedEntityRef.id);
          const [relRes, readingRes] = await Promise.all([
            getAdminMeterRelations(selectedEntityRef.id).catch(() => ({ relations: [] })),
            getAdminMeterLatestReading(selectedEntityRef.id).catch(() => null),
          ]);

          if (!isMounted) return;
          setActiveAssetDetails(null);
          setActiveMeterDetails(foundMeter || null);
          setActiveRelations(relRes.relations || []);
          setActiveConnections([]);
          setActiveLatestReading(
            readingRes
              ? {
                  readingValue: readingRes.reading_id ? 'Đã ghi' : null,
                  recordedAt: null,
                  readingId: readingRes.reading_id || null,
                }
              : null
          );
        }
      } catch (err) {
        console.warn('[DevicesWorkspace] Error loading entity details:', err);
      } finally {
        if (isMounted) setDetailLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedEntityRef, meters]);

  // Unified Data Joining
  const unifiedRows: UnifiedDeviceRow[] = useMemo(() => {
    const rows: UnifiedDeviceRow[] = [];

    // Map Assets
    assets.forEach((a) => {
      const isWater = a.asset_type === 'PUMP' || a.asset_type === 'WATER_POINT' || a.asset_type === 'FIRE_WATER_POINT';
      const coords: [number, number] | null =
        a.map_x !== null && a.map_x !== undefined && a.map_y !== null && a.map_y !== undefined
          ? [a.map_x, a.map_y]
          : null;

      const needsAttn =
        !coords ||
        a.lifecycle_status === 'RETIRED' ||
        (a.attached_meters_count !== undefined && a.attached_meters_count === 0 && ['SUBSTATION', 'SWITCHBOARD', 'TRANSFORMER'].includes(a.asset_type));

      let attnReason = '';
      if (!coords) attnReason = 'Chưa có tọa độ bản đồ';
      else if (a.lifecycle_status !== 'ACTIVE') attnReason = `Trạng thái: ${a.lifecycle_status}`;
      else if (a.attached_meters_count === 0) attnReason = 'Chưa gắn công tơ theo dõi';

      rows.push({
        kind: 'ASSET',
        id: a.id,
        code: a.code,
        name: a.name,
        categoryBadge: formatAssetTypeVn(a.asset_type),
        categoryType: isWater ? 'WATER' : 'ELECTRICITY',
        zoneName: a.zone_name || a.zone_id || 'Chưa gán khu vực',
        zoneId: a.zone_id,
        status: a.lifecycle_status || 'ACTIVE',
        statusLabel: a.lifecycle_status === 'ACTIVE' ? 'Hoạt động' : a.lifecycle_status === 'RETIRED' ? 'Đã thu hồi' : 'Tạm dừng',
        coordinates: coords,
        hasCoordinates: Boolean(coords),
        needsAttention: Boolean(needsAttn),
        attentionReason: attnReason,
        relationSummary:
          a.attached_meters_count !== undefined
            ? a.attached_meters_count > 0
              ? `${a.attached_meters_count} công tơ`
              : 'Chưa gắn công tơ'
            : '—',
        rawAsset: a,
      });
    });

    // Map Meters
    meters.forEach((m) => {
      const isWater = m.meter_code.startsWith('SIM-WM-') || (m as unknown as { utility_type?: string }).utility_type === 'WATER';
      const coords: [number, number] | null =
        m.map_x !== null && m.map_x !== undefined && m.map_y !== null && m.map_y !== undefined
          ? [m.map_x, m.map_y]
          : null;

      const needsAttn = !coords || !m.is_active || m.lifecycle_status === 'RETIRED';
      let attnReason = '';
      if (!coords) attnReason = 'Chưa có tọa độ bản đồ';
      else if (!m.is_active) attnReason = 'Công tơ đang ngưng hoạt động';

      rows.push({
        kind: 'METER',
        id: m.id,
        code: m.meter_code,
        name: m.name || m.meter_code,
        categoryBadge: isWater ? '💧 Nước' : '⚡ Điện',
        categoryType: isWater ? 'WATER' : 'ELECTRICITY',
        zoneName: m.zone_name || m.zone_id || 'Chưa gán khu vực',
        zoneId: m.zone_id,
        status: m.is_active ? 'ACTIVE' : 'INACTIVE',
        statusLabel: m.is_active ? 'Hoạt động' : 'Tạm dừng',
        coordinates: coords,
        hasCoordinates: Boolean(coords),
        needsAttention: Boolean(needsAttn),
        attentionReason: attnReason,
        relationSummary: m.latest_reading ? `${m.latest_reading} ${isWater ? 'm³' : 'kWh'}` : 'Chưa có chỉ số',
        rawMeter: m,
      });
    });

    return rows;
  }, [assets, meters]);

  // Filtered rows
  const filteredItems = useMemo(() => {
    return unifiedRows.filter((item) => {
      // Segment filter
      if (deviceSegment === 'ASSETS' && item.kind !== 'ASSET') return false;
      if (deviceSegment === 'METERS' && item.kind !== 'METER') return false;

      // Needs attention quick filter
      if (needsAttentionOnly && !item.needsAttention) return false;

      // Category / Type filter
      if (typeFilter !== 'ALL') {
        if (deviceSegment === 'ALL') {
          if (typeFilter === 'ASSET' && item.kind !== 'ASSET') return false;
          if (typeFilter === 'METER' && item.kind !== 'METER') return false;
        } else if (deviceSegment === 'ASSETS') {
          if (item.rawAsset?.asset_type !== typeFilter) return false;
        } else if (deviceSegment === 'METERS') {
          if (item.categoryType !== typeFilter) return false;
        }
      }

      // Zone filter
      if (zoneFilter !== 'ALL' && item.zoneId !== zoneFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ACTIVE' && item.status !== 'OPERATIONAL' && item.status !== 'ACTIVE') return false;
        if (statusFilter === 'INACTIVE' && item.status !== 'INACTIVE' && item.status !== 'OFFLINE') return false;
        if (statusFilter === 'RETIRED' && item.status !== 'RETIRED') return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = item.code.toLowerCase().includes(q);
        const nameMatch = item.name.toLowerCase().includes(q);
        const zoneMatch = item.zoneName.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !zoneMatch) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedRows, deviceSegment, needsAttentionOnly, typeFilter, zoneFilter, statusFilter, searchQuery]);

  // Counts
  const totalAllCount = unifiedRows.length;
  const totalAssetsCount = assets.length;
  const totalMetersCount = meters.length;
  const attentionCount = unifiedRows.filter((r) => r.needsAttention).length;

  // Handlers for Add forms
  const handleCreateAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAssetCode.trim() || !formAssetName.trim()) {
      alert('Vui lòng điền mã và tên thiết bị.');
      return;
    }
    try {
      setCreateAssetSubmitting(true);
      await createAdminAsset({
        code: formAssetCode.trim().toUpperCase(),
        name: formAssetName.trim(),
        asset_type: formAssetType,
        zone_id: formAssetZoneId,
        map_x: parseFloat(formAssetLat) || 0.5,
        map_y: parseFloat(formAssetLng) || 0.5,
      });
      setIsCreateAssetOpen(false);
      setFormAssetCode('');
      setFormAssetName('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể tạo thiết bị hạ tầng.');
    } finally {
      setCreateAssetSubmitting(false);
    }
  };

  const handleCreateMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMeterSerial.trim()) {
      alert('Vui lòng điền số serial công tơ.');
      return;
    }
    try {
      setCreateMeterSubmitting(true);
      await createAdminMeter({
        meter_code: formMeterCode.trim() ? formMeterCode.trim().toUpperCase() : `MTR-${formMeterSerial.trim()}`,
        name: formMeterCode.trim() || `Công tơ ${formMeterSerial.trim()}`,
        meter_type: formMeterType,
        zone_id: formMeterZoneId,
      });
      setIsCreateMeterOpen(false);
      setFormMeterSerial('');
      setFormMeterCode('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể tạo công tơ đo đếm.');
    } finally {
      setCreateMeterSubmitting(false);
    }
  };

  const handleLinkMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeterToLink || !activeAssetDetails) return;
    try {
      setLinkSubmitting(true);
      await createAdminMeterAssetRelation({
        meter_id: selectedMeterToLink,
        asset_id: activeAssetDetails.id,
        relation_type: 'MEASURES',
      });
      setIsLinkMeterOpen(false);
      setSelectedMeterToLink('');
      const relRes = await getAdminMeterAssetRelations({ asset_id: activeAssetDetails.id, active_only: false });
      setActiveRelations(relRes.relations || []);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể liên kết công tơ.');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleRetireOrDeactivate = async () => {
    if (!selectedEntityRef) return;
    if (selectedEntityRef.type === 'asset') {
      const reason = prompt('Lý do thu hồi thiết bị hạ tầng:', 'Thu hồi theo quy trình vận hành');
      if (reason === null) return;
      try {
        await retireAdminAsset(selectedEntityRef.id, reason);
        await loadData();
        setSelectedEntityRef(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Lỗi khi thu hồi thiết bị');
      }
    } else {
      if (!activeMeterDetails) return;
      try {
        if (activeMeterDetails.is_active) {
          await deactivateAdminMeter(activeMeterDetails.id);
        } else {
          await activateAdminMeter(activeMeterDetails.id);
        }
        await loadData();
        setSelectedEntityRef(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Lỗi khi thay đổi trạng thái công tơ');
      }
    }
  };

  return (
    <div className="sgp-devices-workspace flex flex-col w-full h-full bg-slate-50 overflow-hidden">
      {/* 1. WORKSPACE WORK SURFACE CONTAINER */}
      <div className="flex-1 overflow-y-auto">
        <div className="sgp-devices-page-container">
          {/* Header Row */}
          <div className="sgp-devices-header-row">
            <div className="sgp-devices-title-block">
              <h1>Thiết bị</h1>
              <p>Quản lý hạ tầng và công tơ đo đếm</p>
            </div>

            {/* Quick Metrics Strip */}
            <div className="sgp-devices-metrics-strip">
              <div className="sgp-devices-metric-chip">
                <span className="sgp-devices-metric-num">{totalAllCount}</span>
                <span>tổng</span>
              </div>
              <div className="sgp-devices-metric-chip">
                <span className="sgp-devices-metric-num">{totalAssetsCount}</span>
                <span>hạ tầng</span>
              </div>
              <div className="sgp-devices-metric-chip">
                <span className="sgp-devices-metric-num">{totalMetersCount}</span>
                <span>công tơ</span>
              </div>
            </div>
          </div>

          {/* Controls Card */}
          <div className="sgp-devices-controls-card">
            {/* Top row: Segmented control + Add button */}
            <div className="sgp-devices-controls-top">
              <SgpSegmentedControl<'ALL' | 'ASSETS' | 'METERS'>
                value={deviceSegment}
                onChange={(seg) => {
                  setDeviceSegment(seg);
                  setTypeFilter('ALL');
                }}
                options={[
                  { id: 'ALL', label: 'Tất cả', count: totalAllCount },
                  { id: 'ASSETS', label: 'Hạ tầng', count: totalAssetsCount },
                  { id: 'METERS', label: 'Công tơ', count: totalMetersCount },
                ]}
              />

              <div className="relative" ref={addMenuRef}>
                <SgpButton
                  variant="primary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => setIsAddMenuOpen((prev) => !prev)}
                  title="Thêm mới hạ tầng hoặc công tơ"
                >
                  Thêm
                </SgpButton>

                {isAddMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        setIsCreateAssetOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Boxes size={14} className="text-sky-700" />
                      <span>+ Thêm hạ tầng mới</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        setIsCreateMeterOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Gauge size={14} className="text-amber-700" />
                      <span>+ Thêm công tơ mới</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row: Search & Dropdown Filters */}
            <div className="sgp-devices-filter-row">
              <div className="flex-1 min-w-[200px] max-w-md">
                <SgpSearchField
                  sizeVariant="sm"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Tìm theo mã hoặc tên..."
                />
              </div>

              {/* Type Filter Dropdown */}
              <SgpSelect
                sizeVariant="sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={
                  deviceSegment === 'ALL'
                    ? [
                        { value: 'ALL', label: 'Tất cả loại' },
                        { value: 'ASSET', label: 'Hạ tầng' },
                        { value: 'METER', label: 'Công tơ' },
                      ]
                    : deviceSegment === 'ASSETS'
                    ? [
                        { value: 'ALL', label: 'Tất cả loại hạ tầng' },
                        { value: 'SWITCHBOARD', label: 'Tủ phân phối' },
                        { value: 'SUBSTATION', label: 'Trạm biến áp' },
                        { value: 'TRANSFORMER', label: 'Máy biến áp' },
                        { value: 'FEEDER', label: 'Xuất tuyến' },
                        { value: 'RTG', label: 'Cẩu bãi RTG' },
                        { value: 'QUAY_CRANE', label: 'Cẩu bờ QC' },
                        { value: 'PUMP', label: 'Trạm bơm' },
                        { value: 'WATER_POINT', label: 'Điểm cấp nước' },
                      ]
                    : [
                        { value: 'ALL', label: 'Tất cả nguồn năng lượng' },
                        { value: 'ELECTRICITY', label: '⚡ Điện' },
                        { value: 'WATER', label: '💧 Nước' },
                      ]
                }
              />

              {/* Zone Filter Dropdown */}
              <SgpSelect
                sizeVariant="sm"
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Tất cả phân khu' },
                  ...ZONES.map((z) => ({ value: z.id, label: z.name })),
                ]}
              />

              {/* Status Filter Dropdown */}
              <SgpSelect
                sizeVariant="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'ACTIVE', label: 'Hoạt động' },
                  { value: 'INACTIVE', label: 'Tạm dừng' },
                  { value: 'RETIRED', label: 'Đã thu hồi' },
                ]}
              />

              {/* Needs Attention Quick Filter */}
              <button
                type="button"
                onClick={() => setNeedsAttentionOnly((prev) => !prev)}
                className={`sgp-devices-attention-btn ${needsAttentionOnly ? 'active' : ''}`}
                title="Lọc các mục chưa chấm tọa độ bản đồ hoặc cần bảo trì"
              >
                <AlertTriangle size={13} className={needsAttentionOnly ? 'text-amber-800' : 'text-amber-500'} />
                <span>Cần chú ý ({attentionCount})</span>
              </button>
            </div>
          </div>

          {/* 2. DATA PRESENTATION */}
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs font-medium bg-white rounded-xl border border-slate-200">
              Đang tải danh mục thiết bị cảng...
            </div>
          ) : error ? (
            <div className="py-12 text-center bg-white rounded-xl border border-slate-200">
              <AlertTriangle size={32} className="mx-auto text-rose-500 mb-2" />
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-3 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Thử lại
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <Layers size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Không tìm thấy thiết bị phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (Section 9 & 10) - hidden on mobile */}
              <div className="hidden md:block sgp-devices-table-wrap">
                <table className="sgp-devices-table" aria-label="Danh sách thiết bị và công tơ">
                  <thead>
                    <tr>
                      <th style={{ width: '14%' }}>Mã</th>
                      <th style={{ width: '26%' }}>
                        {deviceSegment === 'ASSETS' ? 'Tên thiết bị' : deviceSegment === 'METERS' ? 'Tên công tơ' : 'Thiết bị'}
                      </th>
                      <th style={{ width: '14%' }}>
                        {deviceSegment === 'METERS' ? 'Năng lượng' : 'Phân loại'}
                      </th>
                      <th style={{ width: '18%' }}>Khu vực</th>
                      <th style={{ width: '14%' }}>
                        {deviceSegment === 'ASSETS' ? 'Công tơ liên kết' : deviceSegment === 'METERS' ? 'Chỉ số gần nhất' : 'Đo lường / Liên kết'}
                      </th>
                      <th style={{ width: '14%' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const isSelected = selectedEntityRef?.id === item.id;
                      const isWater = item.categoryType === 'WATER';

                      return (
                        <tr
                          key={`${item.kind}-${item.id}`}
                          onClick={() =>
                            setSelectedEntityRef({
                              type: item.kind === 'ASSET' ? 'asset' : 'meter',
                              id: item.id,
                              code: item.code,
                            })
                          }
                          className={isSelected ? 'selected' : ''}
                        >
                          {/* Mã */}
                          <td className="font-tabular font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{item.code}</span>
                              {item.needsAttention && (
                                <span
                                  className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                                  title={item.attentionReason || 'Cần chú ý'}
                                />
                              )}
                            </div>
                          </td>

                          {/* Tên */}
                          <td className="font-semibold text-slate-800">
                            <span className="truncate block max-w-xs">{item.name}</span>
                          </td>

                          {/* Phân loại / Năng lượng */}
                          <td>
                            {item.kind === 'ASSET' ? (
                              <span className="sgp-badge-asset-type">
                                {item.categoryBadge}
                              </span>
                            ) : (
                              <span className={isWater ? 'sgp-badge-meter-water' : 'sgp-badge-meter-elec'}>
                                {item.categoryBadge}
                              </span>
                            )}
                          </td>

                          {/* Khu vực */}
                          <td>
                            <div className="flex items-center gap-1 text-slate-600">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{item.zoneName}</span>
                            </div>
                          </td>

                          {/* Đo lường / Liên kết / Chỉ số */}
                          <td className="font-tabular text-slate-700">
                            {item.relationSummary}
                          </td>

                          {/* Trạng thái */}
                          <td>
                            <SgpStatusBadge status={item.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW (Section 11) - strictly no table on <= 768px */}
              <div className="block md:hidden space-y-2.5">
                {filteredItems.map((item) => {
                  const isWater = item.categoryType === 'WATER';

                  return (
                    <div
                      key={`card-${item.kind}-${item.id}`}
                      onClick={() =>
                        setSelectedEntityRef({
                          type: item.kind === 'ASSET' ? 'asset' : 'meter',
                          id: item.id,
                          code: item.code,
                        })
                      }
                      className="sgp-device-card"
                    >
                      {/* Card Header: Code & Type */}
                      <div className="sgp-device-card-header">
                        <div className="flex items-center gap-1.5">
                          <span className="sgp-device-card-code">{item.code}</span>
                          {item.needsAttention && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          )}
                        </div>
                        {item.kind === 'ASSET' ? (
                          <span className="sgp-badge-asset-type text-[10px]">
                            {item.categoryBadge}
                          </span>
                        ) : (
                          <span className={`${isWater ? 'sgp-badge-meter-water' : 'sgp-badge-meter-elec'} text-[10px]`}>
                            {item.categoryBadge}
                          </span>
                        )}
                      </div>

                      {/* Card Title */}
                      <div className="sgp-device-card-title">{item.name}</div>

                      {/* Card Meta: Zone & Relation */}
                      <div className="sgp-device-card-meta">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{item.zoneName}</span>
                        <span>·</span>
                        <span className="font-tabular">{item.relationSummary}</span>
                      </div>

                      {/* Card Footer: Status & Chevron */}
                      <div className="sgp-device-card-footer">
                        <SgpStatusBadge status={item.status} />
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. READ-FIRST DETAIL SURFACE DRAWER */}
      {selectedEntityRef && (
        <EntityDetailSurface
          type={selectedEntityRef.type}
          id={selectedEntityRef.id}
          code={selectedEntityRef.code}
          asset={activeAssetDetails}
          meter={activeMeterDetails}
          relations={activeRelations}
          connections={activeConnections}
          latestReading={activeLatestReading}
          loading={detailLoading}
          onClose={() => setSelectedEntityRef(null)}
          onLocateOnMap={(coords, id, type) => {
            locateOnMap({
              type: type || selectedEntityRef.type,
              id: id || selectedEntityRef.id,
              code: selectedEntityRef.code || '',
              coordinates: coords || undefined,
            });
          }}
          onOpenLinkMeter={() => setIsLinkMeterOpen(true)}
          onRetireOrDeactivate={handleRetireOrDeactivate}
        />
      )}

      {/* 4. CREATE ASSET MODAL */}
      {isCreateAssetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Boxes size={18} className="text-sky-700" />
                <span>Thêm Thiết Bị Hạ Tầng</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateAssetOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssetSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã thiết bị (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: TBA-02, TC-K2-01"
                  value={formAssetCode}
                  onChange={(e) => setFormAssetCode(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên thiết bị (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trạm biến áp trung thế TBA-02"
                  value={formAssetName}
                  onChange={(e) => setFormAssetName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phân loại</label>
                  <select
                    value={formAssetType}
                    onChange={(e) => setFormAssetType(e.target.value as AssetType)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                  >
                    <option value="SWITCHBOARD">Tủ phân phối</option>
                    <option value="SUBSTATION">Trạm biến áp</option>
                    <option value="TRANSFORMER">Máy biến áp</option>
                    <option value="FEEDER">Xuất tuyến</option>
                    <option value="RTG">Cẩu bãi RTG</option>
                    <option value="QUAY_CRANE">Cẩu bờ QC</option>
                    <option value="PUMP">Trạm bơm nước</option>
                    <option value="WATER_POINT">Điểm cấp nước</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khu vực</label>
                  <select
                    value={formAssetZoneId}
                    onChange={(e) => setFormAssetZoneId(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                  >
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vĩ độ (Lat)</label>
                  <input
                    type="text"
                    value={formAssetLat}
                    onChange={(e) => setFormAssetLat(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500 font-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kinh độ (Lng)</label>
                  <input
                    type="text"
                    value={formAssetLng}
                    onChange={(e) => setFormAssetLng(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500 font-tabular"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <SgpButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateAssetOpen(false)}
                >
                  Hủy
                </SgpButton>
                <SgpButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createAssetSubmitting}
                >
                  {createAssetSubmitting ? 'Đang tạo...' : 'Tạo thiết bị'}
                </SgpButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CREATE METER MODAL */}
      {isCreateMeterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Gauge size={18} className="text-amber-700" />
                <span>Thêm Công Tơ Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateMeterOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMeterSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số Serial (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: EM-2024-009"
                  value={formMeterSerial}
                  onChange={(e) => setFormMeterSerial(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500 font-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã công tơ (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="VD: PE-09 (để trống sẽ tự tạo)"
                  value={formMeterCode}
                  onChange={(e) => setFormMeterCode(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Công nghệ</label>
                  <select
                    value={formMeterType}
                    onChange={(e) => setFormMeterType(e.target.value as 'MECHANICAL' | 'ELECTRONIC_LCD')}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                  >
                    <option value="ELECTRONIC_LCD">Điện tử LCD</option>
                    <option value="MECHANICAL">Cơ khí</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hệ số nhân</label>
                  <input
                    type="number"
                    min="1"
                    value={formMeterMultiplier}
                    onChange={(e) => setFormMeterMultiplier(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500 font-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khu vực</label>
                <select
                  value={formMeterZoneId}
                  onChange={(e) => setFormMeterZoneId(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                >
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <SgpButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateMeterOpen(false)}
                >
                  Hủy
                </SgpButton>
                <SgpButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createMeterSubmitting}
                >
                  {createMeterSubmitting ? 'Đang tạo...' : 'Tạo công tơ'}
                </SgpButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. LINK METER MODAL */}
      {isLinkMeterOpen && activeAssetDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Boxes size={18} className="text-sky-700" />
                <span>Gán Công Tơ Vào Hạ Tầng</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkMeterOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLinkMeterSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700">
                <span className="font-semibold text-slate-900">{activeAssetDetails.code}</span> — {activeAssetDetails.name}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chọn công tơ đo đếm (*)</label>
                <select
                  required
                  value={selectedMeterToLink}
                  onChange={(e) => setSelectedMeterToLink(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Chọn công tơ trong kho --</option>
                  {meters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.meter_code} ({m.name || m.meter_type}) - {m.meter_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <SgpButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLinkMeterOpen(false)}
                >
                  Hủy
                </SgpButton>
                <SgpButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={linkSubmitting}
                >
                  {linkSubmitting ? 'Đang gán...' : 'Gán liên kết'}
                </SgpButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
