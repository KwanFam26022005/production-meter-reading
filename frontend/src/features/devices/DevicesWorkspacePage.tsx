import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes,
  Gauge,
  Layers,
  Search,
  Plus,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Navigation,
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
    focusedEntity,
    locateOnMap,
    inspectingReadingId: _inspectingReadingId,
    setInspectingReadingId,
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
  const [formAssetType, setFormAssetType] = useState<AssetType>('OTHER');
  const [formAssetZone, setFormAssetZone] = useState('');
  const [formAssetMapX, setFormAssetMapX] = useState('');
  const [formAssetMapY, setFormAssetMapY] = useState('');
  const [formAssetSubmitting, setFormAssetSubmitting] = useState(false);
  const [formAssetError, setFormAssetError] = useState<string | null>(null);

  // Form states for Meter
  const [formMeterCode, setFormMeterCode] = useState('');
  const [formMeterName, setFormMeterName] = useState('');
  const [formMeterLocation, setFormMeterLocation] = useState('');
  const [formMeterType, setFormMeterType] = useState('LCD');
  const [formMeterUtility, setFormMeterUtility] = useState('ELECTRICITY');
  const [formMeterSubmitting, setFormMeterSubmitting] = useState(false);
  const [formMeterError, setFormMeterError] = useState<string | null>(null);

  // Form states for Link Meter
  const [linkMeterId, setLinkMeterId] = useState('');
  const [linkRelationType, setLinkRelationType] = useState<'INSTALLED_AT' | 'MEASURES'>('MEASURES');
  const [linkMountPoint, setLinkMountPoint] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  // Load Assets and Meters
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetRes, meterRes] = await Promise.all([
        getAdminAssets({ limit: 100 }),
        getAdminMeters('', undefined, undefined),
      ]);
      setAssets(assetRes.assets || []);
      setMeters(meterRes.meters || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh mục thiết bị & công tơ.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen for focusedEntity from workspace context (cross-workspace link)
  useEffect(() => {
    if (focusedEntity) {
      setSelectedEntityRef({
        type: focusedEntity.type,
        id: focusedEntity.id,
        code: focusedEntity.code,
      });
      if (focusedEntity.type === 'meter' && deviceSegment === 'ASSETS') {
        setDeviceSegment('METERS');
      } else if (focusedEntity.type === 'asset' && deviceSegment === 'METERS') {
        setDeviceSegment('ASSETS');
      }
    }
  }, [focusedEntity]);

  // Load details when selectedEntityRef changes
  useEffect(() => {
    if (!selectedEntityRef) {
      setActiveAssetDetails(null);
      setActiveMeterDetails(null);
      setActiveRelations([]);
      setActiveConnections([]);
      setActiveLatestReading(null);
      return;
    }

    let isCancelled = false;
    const fetchEntityDetails = async () => {
      setDetailLoading(true);
      try {
        if (selectedEntityRef.type === 'asset') {
          const [freshAsset, relRes, connRes] = await Promise.all([
            getAdminAssetById(selectedEntityRef.id),
            getAdminMeterAssetRelations({ asset_id: selectedEntityRef.id, active_only: false }),
            getAdminAssetConnections({ source_asset_id: selectedEntityRef.id, active_only: false }),
          ]);
          if (isCancelled) return;
          setActiveAssetDetails(freshAsset);
          setActiveMeterDetails(null);
          setActiveRelations(relRes.relations || []);
          setActiveConnections(connRes.connections || []);

          // Find first attached meter's latest reading if any
          if (relRes.relations && relRes.relations.length > 0) {
            try {
              const reading = await getAdminMeterLatestReading(relRes.relations[0].meter_id);
              if (!isCancelled && reading) {
                setActiveLatestReading({
                  readingId: reading.reading_id,
                });
              }
            } catch {
              // ignore
            }
          } else {
            setActiveLatestReading(null);
          }
        } else {
          // Meter details
          const currentMeter = meters.find((m) => m.id === selectedEntityRef.id);
          setActiveMeterDetails(currentMeter || null);
          setActiveAssetDetails(null);

          const [relRes, readingRes] = await Promise.allSettled([
            getAdminMeterRelations(selectedEntityRef.id),
            getAdminMeterLatestReading(selectedEntityRef.id),
          ]);
          if (isCancelled) return;

          if (relRes.status === 'fulfilled') {
            setActiveRelations(relRes.value.relations || []);
          } else {
            setActiveRelations([]);
          }

          if (readingRes.status === 'fulfilled' && readingRes.value) {
            setActiveLatestReading({
              readingValue: currentMeter?.latest_reading,
              recordedAt: currentMeter?.latest_reading_time,
              readingId: readingRes.value.reading_id,
            });
          } else {
            setActiveLatestReading({
              readingValue: currentMeter?.latest_reading,
              recordedAt: currentMeter?.latest_reading_time,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load entity details', err);
      } finally {
        if (!isCancelled) setDetailLoading(false);
      }
    };

    fetchEntityDetails();
    return () => {
      isCancelled = true;
    };
  }, [selectedEntityRef, meters]);

  // Handle Add Menu Outside Click
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

  // Unified items list
  const unifiedItems = useMemo<UnifiedDeviceRow[]>(() => {
    const assetRows: UnifiedDeviceRow[] = assets.map((a) => {
      const hasCoords = a.map_x !== null && a.map_x !== undefined && a.map_y !== null && a.map_y !== undefined;
      const isUnverified = a.verification_status === 'UNVERIFIED';
      const needsAtt = !hasCoords || isUnverified;
      const attReason = !hasCoords ? 'Chưa chấm định vị GIS' : isUnverified ? 'Chờ đối soát hồ sơ' : undefined;
      return {
        kind: 'ASSET',
        id: a.id,
        code: a.code,
        name: a.name,
        categoryBadge: a.asset_type,
        categoryType: a.asset_type,
        zoneName: a.zone_name || a.zone_id || 'Bãi Container (CY)',
        zoneId: a.zone_id,
        status: a.lifecycle_status,
        statusLabel: a.lifecycle_status === 'ACTIVE' ? 'Hoạt động' : a.lifecycle_status === 'RETIRED' ? 'Đã thu hồi' : 'Tạm ngừng',
        coordinates: hasCoords ? [a.map_x!, a.map_y!] : null,
        hasCoordinates: hasCoords,
        needsAttention: needsAtt,
        attentionReason: attReason,
        relationSummary: a.attached_meters_count && a.attached_meters_count > 0 ? `${a.attached_meters_count} công tơ đo` : 'Chưa gắn công tơ',
        rawAsset: a,
      };
    });

    const meterRows: UnifiedDeviceRow[] = meters.map((m) => {
      const isWater = m.utility_type === 'WATER' || m.meter_code.startsWith('SIM-WM-');
      const hasCoords = m.map_x !== null && m.map_x !== undefined && m.map_y !== null && m.map_y !== undefined;
      const isRetired = m.lifecycle_status === 'RETIRED';
      const isActive = m.is_active && !isRetired;
      const needsAtt = !hasCoords || !isActive;
      const attReason = !hasCoords ? 'Chưa chấm định vị GIS' : isRetired ? 'Đã thu hồi' : !m.is_active ? 'Đang tạm dừng' : undefined;
      const unit = isWater ? 'm³' : 'kWh';
      const readingText = m.latest_reading ? `${m.latest_reading} ${unit}` : 'Chưa có chỉ số';
      return {
        kind: 'METER',
        id: m.id,
        code: m.meter_code,
        name: m.name,
        categoryBadge: isWater ? '💧 Nước' : '⚡ Điện',
        categoryType: isWater ? 'WATER' : 'ELECTRICITY',
        zoneName: m.location || m.zone_name || m.zone_id || 'Bãi Container (CY)',
        zoneId: m.zone_id,
        status: m.lifecycle_status || (m.is_active ? 'ACTIVE' : 'INACTIVE'),
        statusLabel: isRetired ? 'Đã thu hồi' : m.is_active ? 'Hoạt động' : 'Tạm ngừng',
        coordinates: hasCoords ? [m.map_x!, m.map_y!] : null,
        hasCoordinates: hasCoords,
        needsAttention: needsAtt,
        attentionReason: attReason,
        relationSummary: readingText,
        rawMeter: m,
      };
    });

    return [...assetRows, ...meterRows];
  }, [assets, meters]);

  // Counts
  const totalAssetsCount = assets.length;
  const totalMetersCount = meters.length;
  const totalAllCount = totalAssetsCount + totalMetersCount;

  // Filtered Items based on segment and search/filters
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // 1. Segment filter
      if (deviceSegment === 'ASSETS' && item.kind !== 'ASSET') return false;
      if (deviceSegment === 'METERS' && item.kind !== 'METER') return false;

      // 2. Needs Attention Filter
      if (needsAttentionOnly && !item.needsAttention) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesZone = item.zoneName.toLowerCase().includes(q);
        const matchesCategory = item.categoryBadge.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesZone && !matchesCategory) return false;
      }

      // 4. Type filter
      if (typeFilter !== 'ALL') {
        if (deviceSegment === 'ALL') {
          if (typeFilter === 'ASSET' && item.kind !== 'ASSET') return false;
          if (typeFilter === 'METER' && item.kind !== 'METER') return false;
        } else if (deviceSegment === 'ASSETS') {
          if (item.categoryType !== typeFilter) return false;
        } else if (deviceSegment === 'METERS') {
          if (item.categoryType !== typeFilter) return false;
        }
      }

      // 5. Zone filter
      if (zoneFilter !== 'ALL') {
        if (item.zoneId !== zoneFilter && !item.zoneName.includes(zoneFilter)) {
          return false;
        }
      }

      // 6. Status filter
      if (statusFilter !== 'ALL') {
        if (item.status !== statusFilter) return false;
      }

      return true;
    });
  }, [unifiedItems, deviceSegment, needsAttentionOnly, searchQuery, typeFilter, zoneFilter, statusFilter]);

  // Locate on Map Action
  const handleLocateEntity = (item: UnifiedDeviceRow) => {
    locateOnMap({
      type: item.kind === 'ASSET' ? 'asset' : 'meter',
      id: item.id,
      code: item.code,
      coordinates: item.coordinates || undefined,
    });
  };

  // Form submit for Asset creation
  const handleCreateAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormAssetSubmitting(true);
    setFormAssetError(null);
    const mx = formAssetMapX.trim() ? parseFloat(formAssetMapX.trim()) : null;
    const my = formAssetMapY.trim() ? parseFloat(formAssetMapY.trim()) : null;

    try {
      await createAdminAsset({
        code: formAssetCode.trim(),
        name: formAssetName.trim(),
        asset_type: formAssetType,
        zone_id: formAssetZone.trim() || null,
        map_x: mx,
        map_y: my,
        verification_status: 'SIMULATION_APPROVED',
        data_origin: 'SIMULATED',
        scenario_id: 'tan-thuan-demo-v1',
      });
      setIsCreateAssetOpen(false);
      setFormAssetCode('');
      setFormAssetName('');
      setFormAssetMapX('');
      setFormAssetMapY('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo thiết bị hạ tầng.';
      setFormAssetError(msg);
    } finally {
      setFormAssetSubmitting(false);
    }
  };

  // Form submit for Meter creation
  const handleCreateMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMeterSubmitting(true);
    setFormMeterError(null);

    try {
      await createAdminMeter({
        meter_code: formMeterCode.trim(),
        name: formMeterName.trim(),
        location: formMeterLocation.trim() || null,
        meter_type: formMeterType,
      });
      setIsCreateMeterOpen(false);
      setFormMeterCode('');
      setFormMeterName('');
      setFormMeterLocation('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo công tơ mới.';
      setFormMeterError(msg);
    } finally {
      setFormMeterSubmitting(false);
    }
  };

  // Form submit for Link Meter
  const handleLinkMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssetDetails || !linkMeterId.trim()) return;
    setLinkSubmitting(true);

    try {
      await createAdminMeterAssetRelation({
        meter_id: linkMeterId.trim(),
        asset_id: activeAssetDetails.id,
        relation_type: linkRelationType,
        mount_point: linkMountPoint.trim() || undefined,
        verification_status: 'SIMULATION_APPROVED',
      });
      setIsLinkMeterOpen(false);
      setLinkMeterId('');
      setLinkMountPoint('');
      // Refresh relations
      const relRes = await getAdminMeterAssetRelations({ asset_id: activeAssetDetails.id, active_only: false });
      setActiveRelations(relRes.relations || []);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể liên kết công tơ.');
    } finally {
      setLinkSubmitting(false);
    }
  };

  // Handle retire/deactivate
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
    <div className="sgp-devices-workspace flex flex-col w-full h-full bg-slate-100 overflow-hidden">
      {/* 1. TOP HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Count Badges */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-900 text-white flex items-center justify-center">
                <Boxes size={18} />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Thiết Bị</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium ml-2">
                <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-tabular">
                  {totalAllCount} tổng
                </span>
                <span>·</span>
                <span className="font-tabular">{totalAssetsCount} hạ tầng</span>
                <span>·</span>
                <span className="font-tabular">{totalMetersCount} công tơ</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kho quản trị tài nguyên hạ tầng cảng, thiết bị phụ tải và công tơ đo đếm
            </p>
          </div>

          {/* Segmented Control & Actions */}
          <div className="flex items-center gap-3">
            {/* Segmented Control [Tất cả] [Hạ tầng] [Công tơ] */}
            <div
              className="inline-flex p-1 bg-slate-200/80 rounded-xl border border-slate-300/80 text-xs font-semibold"
              role="tablist"
              aria-label="Phân loại thiết bị"
            >
              <button
                type="button"
                role="tab"
                aria-selected={deviceSegment === 'ALL'}
                onClick={() => {
                  setDeviceSegment('ALL');
                  setTypeFilter('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  deviceSegment === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({totalAllCount})
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={deviceSegment === 'ASSETS'}
                onClick={() => {
                  setDeviceSegment('ASSETS');
                  setTypeFilter('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  deviceSegment === 'ASSETS'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hạ tầng ({totalAssetsCount})
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={deviceSegment === 'METERS'}
                onClick={() => {
                  setDeviceSegment('METERS');
                  setTypeFilter('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  deviceSegment === 'METERS'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Công tơ ({totalMetersCount})
              </button>
            </div>

            {/* Primary Action [+ Thêm] Dropdown */}
            <div className="relative" ref={addMenuRef}>
              <button
                type="button"
                onClick={() => setIsAddMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-900 hover:bg-cyan-800 rounded-lg shadow-sm transition-colors"
                aria-haspopup="true"
                aria-expanded={isAddMenuOpen}
              >
                <Plus size={14} />
                <span>Thêm</span>
              </button>

              {isAddMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      setIsCreateAssetOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left"
                  >
                    <Boxes size={14} className="text-cyan-700" />
                    <span>Thêm thiết bị hạ tầng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      setIsCreateMeterOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left"
                  >
                    <Gauge size={14} className="text-amber-600" />
                    <span>Thêm công tơ mới</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. FILTER TOOLBAR */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã, tên hoặc phân khu..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Dynamic Category/Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-cyan-500"
          >
            {deviceSegment === 'ALL' && (
              <>
                <option value="ALL">Tất cả phân loại</option>
                <option value="ASSET">Chỉ thiết bị hạ tầng</option>
                <option value="METER">Chỉ công tơ đo đếm</option>
              </>
            )}
            {deviceSegment === 'ASSETS' && (
              <>
                <option value="ALL">Tất cả loại thiết bị</option>
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </>
            )}
            {deviceSegment === 'METERS' && (
              <>
                <option value="ALL">Tất cả nguồn năng lượng</option>
                <option value="ELECTRICITY">⚡ Công tơ Điện</option>
                <option value="WATER">💧 Công tơ Nước</option>
              </>
            )}
          </select>

          {/* Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Tất cả phân khu</option>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm ngừng</option>
            <option value="RETIRED">Đã thu hồi</option>
          </select>

          {/* Needs Attention Toggle */}
          <button
            type="button"
            onClick={() => setNeedsAttentionOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              needsAttentionOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title="Lọc các mục chưa chấm tọa độ bản đồ hoặc chờ đối soát"
          >
            <AlertTriangle size={13} className={needsAttentionOnly ? 'text-amber-700' : 'text-amber-500'} />
            <span>Cần chú ý</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs font-medium">
            Đang tải dữ liệu thiết bị và công tơ...
          </div>
        ) : error ? (
          <div className="py-12 text-center">
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700" aria-label="Danh sách thiết bị và công tơ">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Mã</th>
                    <th scope="col" className="py-3 px-4">Phân loại</th>
                    <th scope="col" className="py-3 px-4">Tên thiết bị / Công tơ</th>
                    <th scope="col" className="py-3 px-4">Phân khu</th>
                    <th scope="col" className="py-3 px-4">Đo lường / Liên kết</th>
                    <th scope="col" className="py-3 px-4">Trạng thái</th>
                    <th scope="col" className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const isSelected = selectedEntityRef?.id === item.id;
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
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-50/90 font-medium'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Mã */}
                        <td className="py-3 px-4 font-tabular font-bold text-slate-900">
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

                        {/* Phân loại Badge */}
                        <td className="py-3 px-4">
                          {item.kind === 'ASSET' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                              <Boxes size={11} className="text-slate-500" />
                              {item.categoryBadge}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                item.categoryType === 'WATER'
                                  ? 'text-sky-700 bg-sky-50 border-sky-200'
                                  : 'text-amber-700 bg-amber-50 border-amber-200'
                              }`}
                            >
                              {item.categoryBadge}
                            </span>
                          )}
                        </td>

                        {/* Tên */}
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-[220px] truncate">
                          {item.name}
                        </td>

                        {/* Phân khu */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-slate-600">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{item.zoneName}</span>
                          </div>
                        </td>

                        {/* Đo lường / Liên kết */}
                        <td className="py-3 px-4 font-tabular">
                          <span className="text-slate-600">{item.relationSummary}</span>
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3 px-4">
                          {item.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              {item.statusLabel}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <AlertTriangle size={11} className="text-rose-600" />
                              {item.statusLabel}
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-4 text-right">
                          <div
                            className="inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleLocateEntity(item)}
                              className="p-1.5 text-slate-400 hover:text-cyan-800 hover:bg-cyan-50 rounded-md transition-colors"
                              title="Xem vị trí trên bản đồ"
                            >
                              <Navigation size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedEntityRef({
                                  type: item.kind === 'ASSET' ? 'asset' : 'meter',
                                  id: item.id,
                                  code: item.code,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                              title="Xem chi tiết"
                            >
                              <ChevronRight size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* 3. DETAIL DRAWER (Read-First EntityDetailSurface) */}
      {selectedEntityRef && (
        <EntityDetailSurface
          entityType={selectedEntityRef.type}
          asset={activeAssetDetails}
          meter={activeMeterDetails}
          relations={activeRelations}
          connections={activeConnections}
          latestReading={activeLatestReading}
          isLoading={detailLoading}
          onClose={() => setSelectedEntityRef(null)}
          onLocateOnMap={() => {
            const currentItem = unifiedItems.find((i) => i.id === selectedEntityRef.id);
            if (currentItem) handleLocateEntity(currentItem);
          }}
          onEdit={() => {
            alert('Chức năng chỉnh sửa thông tin.');
          }}
          onRelocate={() => {
            const currentItem = unifiedItems.find((i) => i.id === selectedEntityRef.id);
            if (currentItem) handleLocateEntity(currentItem);
          }}
          onRetireOrDeactivate={handleRetireOrDeactivate}
          onLinkMeter={() => setIsLinkMeterOpen(true)}
          onSelectRelatedEntity={(type, id, code) => {
            setSelectedEntityRef({ type, id, code });
          }}
          onInspectReading={(readingId) => {
            setInspectingReadingId(readingId);
          }}
        />
      )}

      {/* 4. MODALS */}
      {/* Create Asset Modal */}
      {isCreateAssetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Thêm thiết bị hạ tầng mới</h3>
              <button
                type="button"
                onClick={() => setIsCreateAssetOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {formAssetError && (
              <div className="mt-3 p-2 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {formAssetError}
              </div>
            )}

            <form onSubmit={handleCreateAssetSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã thiết bị *</label>
                <input
                  type="text"
                  required
                  value={formAssetCode}
                  onChange={(e) => setFormAssetCode(e.target.value)}
                  placeholder="VD: RTG-05, TR-03"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500 font-tabular font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên thiết bị *</label>
                <input
                  type="text"
                  required
                  value={formAssetName}
                  onChange={(e) => setFormAssetName(e.target.value)}
                  placeholder="VD: Cẩu khung RTG 05"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại thiết bị *</label>
                <select
                  value={formAssetType}
                  onChange={(e) => setFormAssetType(e.target.value as AssetType)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phân khu</label>
                <select
                  value={formAssetZone}
                  onChange={(e) => setFormAssetZone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Chưa chọn phân khu</option>
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tọa độ Map X</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formAssetMapX}
                    onChange={(e) => setFormAssetMapX(e.target.value)}
                    placeholder="0.0000"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tọa độ Map Y</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formAssetMapY}
                    onChange={(e) => setFormAssetMapY(e.target.value)}
                    placeholder="0.0000"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateAssetOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formAssetSubmitting}
                  className="px-4 py-1.5 text-white bg-cyan-900 hover:bg-cyan-800 rounded-lg font-bold shadow-sm disabled:opacity-50"
                >
                  {formAssetSubmitting ? 'Đang tạo...' : 'Tạo thiết bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Meter Modal */}
      {isCreateMeterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Thêm công tơ mới</h3>
              <button
                type="button"
                onClick={() => setIsCreateMeterOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {formMeterError && (
              <div className="mt-3 p-2 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {formMeterError}
              </div>
            )}

            <form onSubmit={handleCreateMeterSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã công tơ *</label>
                <input
                  type="text"
                  required
                  value={formMeterCode}
                  onChange={(e) => setFormMeterCode(e.target.value)}
                  placeholder="VD: SIM-EM-13, SIM-WM-05"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500 font-tabular font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên công tơ *</label>
                <input
                  type="text"
                  required
                  value={formMeterName}
                  onChange={(e) => setFormMeterName(e.target.value)}
                  placeholder="VD: Công tơ điện Trạm CY-03"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vị trí / Phân khu</label>
                <input
                  type="text"
                  value={formMeterLocation}
                  onChange={(e) => setFormMeterLocation(e.target.value)}
                  placeholder="VD: Khu vực Bãi Container (CY)"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại công tơ</label>
                  <select
                    value={formMeterType}
                    onChange={(e) => setFormMeterType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LCD">Điện tử (LCD)</option>
                    <option value="MECHANICAL">Cơ khí (Kim quay)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nguồn năng lượng</label>
                  <select
                    value={formMeterUtility}
                    onChange={(e) => setFormMeterUtility(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ELECTRICITY">⚡ Điện (kWh)</option>
                    <option value="WATER">💧 Nước (m³)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateMeterOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formMeterSubmitting}
                  className="px-4 py-1.5 text-white bg-cyan-900 hover:bg-cyan-800 rounded-lg font-bold shadow-sm disabled:opacity-50"
                >
                  {formMeterSubmitting ? 'Đang tạo...' : 'Tạo công tơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Meter to Asset Modal */}
      {isLinkMeterOpen && activeAssetDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Liên kết công tơ cho {activeAssetDetails.code}
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkMeterOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLinkMeterSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn công tơ *</label>
                <select
                  required
                  value={linkMeterId}
                  onChange={(e) => setLinkMeterId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Chọn công tơ đo đếm --</option>
                  {meters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.meter_code} — {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại quan hệ</label>
                <select
                  value={linkRelationType}
                  onChange={(e) => setLinkRelationType(e.target.value as 'MEASURES' | 'INSTALLED_AT')}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="MEASURES">MEASURES — Đo lường tiêu thụ điện/nước</option>
                  <option value="INSTALLED_AT">INSTALLED_AT — Lắp đặt vật lý trên thiết bị</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Điểm gá lắp (tùy chọn)</label>
                <input
                  type="text"
                  value={linkMountPoint}
                  onChange={(e) => setLinkMountPoint(e.target.value)}
                  placeholder="VD: Tủ điện nhánh số 2, Cột nguồn số 4"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsLinkMeterOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={linkSubmitting}
                  className="px-4 py-1.5 text-white bg-cyan-900 hover:bg-cyan-800 rounded-lg font-bold shadow-sm disabled:opacity-50"
                >
                  {linkSubmitting ? 'Đang liên kết...' : 'Xác nhận liên kết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
