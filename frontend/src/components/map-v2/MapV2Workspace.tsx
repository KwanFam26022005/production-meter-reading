import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Layers,
  AlertCircle,
  FileCheck2,
  Maximize2,
  StretchHorizontal,
  Compass,
  Cpu,
  Sun,
  Sparkles,
  X,
  SlidersHorizontal,
  Settings,
  Zap,
  Droplets,
  AlertTriangle,
  User,
  Calendar,
  Search,
  RefreshCw,
  ChevronDown,
  Info,
  MapPin,
} from 'lucide-react';
import canonicalJson from './data/tan_thuan_1_zones_edited.json';
import { validateMapV2Manifest } from './validation';
import {
  DEMO_MAP_V2_EMPLOYEES,
  buildLiveZoneEmployees,
} from './employeeDataAdapter';
import {
  MapV2LayerVisibility,
  MapV2SelectedEntity,
  MapV2Manifest,
  MapV2ViewMode,
  MapV2InteractionMode,
  MapV2ToneMode,
} from './types';
import { MapV2Canvas } from './MapV2Canvas';
import { MapV2Layers } from './MapV2Layers';
import { MapV2InspectionPanel } from './MapV2InspectionPanel';
import { getZoneAnchor, ZONE_ANCHORS } from './zoneAnchors';
import { UtilityOverlayMode, UtilityStatusInfo } from './MapV2UtilityLayer';
import { RECOMMENDED_LAYOUT_KEY, UtilityLayoutKey } from './utilityDemoLayout';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';
import { getMapOverview, getAdminSchedules } from '../../services/api';
import type { MapMeterOut, ReadingRound, MapOverviewResponse } from '../../types';
import { isValidMeterCoordinate, getMeterCanvasPoint } from './MapV2MeterLayer';
import { CANONICAL_MAP_V2_ZONE_MAPPING } from './zoneMapping';
import { getSimulationMeter } from './simulation';
import './MapV2Workspace.css';

const COMPACT_WORKSPACE_THRESHOLD = 1380;

export const MapV2Workspace: React.FC = () => {
  // Validate authoritative manifest on load
  const validationResult = useMemo(() => {
    return validateMapV2Manifest(canonicalJson);
  }, []);

  // 1. Shared Context Integration (Section 6)
  const {
    selectedDate,
    setSelectedDate,
    selectedRoundId,
    setSelectedRoundId,
    utilityFilter,
    focusedEntity,
    setFocusedEntity,
    openReadingInspection,
    openMeterDetails,
    setActiveTab,
  } = useOperationalWorkspace();

  // 2. Local Display & Presentation States (Three-Axis Toolbar Architecture, Section 13)
  const [viewMode, setViewMode] = useState<MapV2ViewMode>('width');
  const [interactionMode, setInteractionMode] = useState<MapV2InteractionMode>('operational');
  const [toneMode, setToneMode] = useState<MapV2ToneMode>('technical');
  const [utilityLayout] = useState<UtilityLayoutKey>(RECOMMENDED_LAYOUT_KEY);
  const [, setUtilityStatus] = useState<UtilityStatusInfo>({
    electricityPhase: 'collapsed',
    waterPhase: 'collapsed',
    activeTracedMeter: null,
    activeTracedUtility: null,
  });

  // Layer Visibility State (Axis 2)
  const [layerVisibility, setLayerVisibility] = useState<MapV2LayerVisibility>({
    baseMap: true,
    zones: true,
    buildings: true,
    roadsAndBoundaries: true,
    gates: true,
    anchors: true,
    employees: true,       // Real standing assignees
    meters: true,          // Real operational meters
    exceptionsOnly: false,
    demoEmployees: false,  // Demo animated simulation layer (separate)
    powerNetwork: false,
    waterNetwork: false,
  });

  // Derive utilityMode from layerVisibility to satisfy independent overlay requirement (Section 13)
  const utilityMode: UtilityOverlayMode = useMemo(() => {
    const p = layerVisibility.powerNetwork;
    const w = layerVisibility.waterNetwork;
    if (p && w) return 'both';
    if (p) return 'electricity';
    if (w) return 'water';
    return 'off';
  }, [layerVisibility.powerNetwork, layerVisibility.waterNetwork]);

  // Toolbar popover states
  const [contextPickerOpen, setContextPickerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [layersOpen, setLayersOpen] = useState<boolean>(false);
  const [moreSettingsOpen, setMoreSettingsOpen] = useState<boolean>(false);

  // Entities & Navigation
  const [selectedEntity, setSelectedEntity] = useState<MapV2SelectedEntity>(null);
  const [tracedMeterCode, setTracedMeterCode] = useState<string | null>(null);
  const [centerOnCoord, setCenterOnCoord] = useState<[number, number] | null>(null);
  const [anchorScreenPos, setAnchorScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1920);
  const [isMotionPaused, setIsMotionPaused] = useState<boolean>(false);

  // Non-blocking feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3. Live Map Overview Query (Section 8)
  const [overview, setOverview] = useState<MapOverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [availableRounds, setAvailableRounds] = useState<ReadingRound[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceBodyRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Show auto-dismissing toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4500);
  }, []);

  // Fetch live overview on date or round change
  const fetchOverviewData = useCallback(async (date: string, roundId?: string | null) => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const data = await getMapOverview(date, roundId || undefined);
      setOverview(data);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Không thể tải dữ liệu bản đồ tác nghiệp.';
      setOverviewError(errorMsg);
      // Notice: Do NOT erase canvas geometry when operational data fails!
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // Fetch reading rounds for date
  const fetchRoundsForDate = useCallback(async (date: string) => {
    try {
      const res = await getAdminSchedules(date);
      setAvailableRounds(res.rounds || []);
    } catch {
      setAvailableRounds([]);
    }
  }, []);

  // Subscribe to shared date & round
  useEffect(() => {
    fetchOverviewData(selectedDate, selectedRoundId);
    fetchRoundsForDate(selectedDate);
  }, [selectedDate, selectedRoundId, fetchOverviewData, fetchRoundsForDate]);

  // Track container width for responsive presentation (wide vs compact)
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Close popovers on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextPickerOpen(false);
        setSearchOpen(false);
        setLayersOpen(false);
        setMoreSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real standing zone assignees (Section 17)
  const liveEmployees = useMemo(() => {
    if (!overview?.zones) return [];
    return buildLiveZoneEmployees(overview.zones);
  }, [overview?.zones]);

  // Live meters
  const liveMeters = useMemo(() => {
    return overview?.meters || [];
  }, [overview?.meters]);

  // Exception meters count
  const exceptionsCount = useMemo(() => {
    return liveMeters.filter(
      (m) => m.semantic_state === 'REVIEW' || m.semantic_state === 'OVERDUE'
    ).length;
  }, [liveMeters]);

  // Synchronize focusedEntity from shared context (Schedules, Reports, etc.)
  useEffect(() => {
    if (!focusedEntity) return;

    if (focusedEntity.type === 'meter') {
      const foundMeter = liveMeters.find(
        (m) => m.id === focusedEntity.id || m.meter_code === focusedEntity.code
      );
      if (foundMeter) {
        if (isValidMeterCoordinate(foundMeter.map_x, foundMeter.map_y)) {
          const pt = getMeterCanvasPoint(foundMeter.map_x!, foundMeter.map_y!);
          setCenterOnCoord(pt);
          setSelectedEntity({ type: 'meter', data: foundMeter });
        } else {
          setSelectedEntity({ type: 'meter', data: foundMeter });
          showToast(`Công tơ ${foundMeter.meter_code} chưa xác định vị trí trên Map V2`);
        }
      } else {
        // Create transient placeholder meter if not in overview
        const placeholderMeter: MapMeterOut = {
          id: focusedEntity.id,
          meter_code: focusedEntity.code,
          name: focusedEntity.name || focusedEntity.code,
          meter_type: 'UNKNOWN',
          is_active: true,
          semantic_state: 'PENDING',
        };
        setSelectedEntity({ type: 'meter', data: placeholderMeter });
        showToast(`Công tơ ${focusedEntity.code} chưa xác định vị trí trên Map V2`);
      }
    }
  }, [focusedEntity, liveMeters, showToast]);

  const isCompact = containerWidth < COMPACT_WORKSPACE_THRESHOLD;
  const inspectorPresentation = isCompact ? 'drawer' : 'docked';

  const selectedMeterCode = useMemo(() => {
    if (selectedEntity?.type === 'meter') {
      return selectedEntity.data.meter_code;
    }
    return null;
  }, [selectedEntity]);

  const handleSelectMeterHost = useCallback((nodeId: string, meterCode: string) => {
    const matchedMeter = liveMeters.find((m) => m.meter_code === meterCode);
    if (matchedMeter) {
      setSelectedEntity({ type: 'meter', data: matchedMeter });
    } else {
      const simMeter = getSimulationMeter(meterCode);
      const placeholder: MapMeterOut = {
        id: simMeter?.meterId || nodeId,
        meter_code: meterCode,
        name: simMeter?.name || meterCode,
        meter_type: 'SIMULATED',
        utility_type: simMeter?.utility || 'ELECTRICITY',
        is_active: true,
        semantic_state: 'PENDING',
        location: `Node B2 ${nodeId}`,
      };
      setSelectedEntity({ type: 'meter', data: placeholder });
    }
  }, [liveMeters]);

  const handleTraceMeter = useCallback((meterCode: string) => {
    if (tracedMeterCode === meterCode) {
      setTracedMeterCode(null);
    } else {
      setTracedMeterCode(meterCode);
      const isElec = meterCode.startsWith('SIM-EM-');
      if (isElec && !layerVisibility.powerNetwork) {
        setLayerVisibility((prev) => ({ ...prev, powerNetwork: true }));
      } else if (!isElec && !layerVisibility.waterNetwork) {
        setLayerVisibility((prev) => ({ ...prev, waterNetwork: true }));
      }
    }
  }, [tracedMeterCode, layerVisibility.powerNetwork, layerVisibility.waterNetwork]);

  const handleAnchorScreenPosChange = useCallback((pos: { x: number; y: number } | null) => {
    setAnchorScreenPos(pos);
  }, []);

  if (!validationResult.valid || !validationResult.manifest) {
    return (
      <div className="map-v2-container" style={{ padding: 32, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ maxWidth: 540, background: '#ffffff', border: '1px solid #b43a3a', borderRadius: 12, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#b43a3a', marginBottom: 12 }}>
            <AlertCircle size={24} />
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Lỗi thẩm định dữ liệu Bản đồ V2</h2>
          </div>
          <p style={{ color: '#252525', fontSize: '0.85rem' }}>
            Tệp dữ liệu phân khu Tân Thuận 1 không vượt qua cổng kiểm tra cấu trúc.
          </p>
          <ul style={{ color: '#b43a3a', fontSize: '0.8rem', paddingLeft: 20 }}>
            {validationResult.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const manifest = validationResult.manifest as MapV2Manifest;
  const isNeon = toneMode === 'neon';
  const isOperational = interactionMode === 'operational';

  // Find active zone anchor if an entity is selected
  const activeAnchor = selectedEntity
    ? (selectedEntity.type === 'polygon'
        ? getZoneAnchor(selectedEntity.data.id)
        : (selectedEntity.type === 'employee'
            ? getZoneAnchor(selectedEntity.data.zoneId)
            : (selectedEntity.type === 'zone_operational'
                ? selectedEntity.data.anchor || getZoneAnchor(selectedEntity.data.zone.id)
                : null)))
    : null;

  // Contextual card position calculation
  const cardPositionStyle: React.CSSProperties = useMemo(() => {
    if (!anchorScreenPos || !workspaceBodyRef.current) {
      return { bottom: 24, left: 24 };
    }
    const bodyW = workspaceBodyRef.current.clientWidth || 1200;
    const bodyH = workspaceBodyRef.current.clientHeight || 700;
    const cardW = Math.min(340, bodyW - 32);
    const cardH = 145;

    let left = anchorScreenPos.x - cardW / 2;
    let top = anchorScreenPos.y + 36;

    if (top + cardH > bodyH - 32) {
      top = anchorScreenPos.y - cardH - 36;
    }

    left = Math.max(16, Math.min(left, bodyW - cardW - 16));
    top = Math.max(16, Math.min(top, bodyH - cardH - 16));

    if (left + cardW > bodyW - 85 && top + cardH > bodyH - 190) {
      left = Math.max(16, bodyW - cardW - 90);
    }

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      bottom: 'auto',
      maxWidth: `${cardW}px`,
    };
  }, [anchorScreenPos]);

  // Quick Search Matching (Section 16)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    const matchedZones = ZONE_ANCHORS.filter(
      (z) => z.label.toLowerCase().includes(q) || z.code.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedMeters = liveMeters.filter(
      (m) => m.meter_code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedEmployees = liveEmployees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
    ).slice(0, 3);

    return {
      zones: matchedZones,
      meters: matchedMeters,
      employees: matchedEmployees,
      totalCount: matchedZones.length + matchedMeters.length + matchedEmployees.length,
    };
  }, [searchQuery, liveMeters, liveEmployees]);

  // Current round label
  const roundDisplay = useMemo(() => {
    if (selectedRoundId && availableRounds.length > 0) {
      const match = availableRounds.find((r) => r.id === selectedRoundId);
      if (match) return `Lượt ${match.scheduled_time_only} (${match.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'})`;
    }
    if (overview?.current_round_time) {
      return `Lượt ${overview.current_round_time} (${overview.current_round_status === 'OPEN' ? 'Đang mở' : overview.current_round_status || 'Hiện tại'})`;
    }
    return 'Lượt đọc hiện tại';
  }, [selectedRoundId, availableRounds, overview]);

  // Formatted date string
  const dateDisplay = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div
      ref={containerRef}
      className={`map-v2-container ${isNeon ? 'tone-neon' : 'tone-technical'} ${isCompact ? 'layout-compact' : 'layout-wide'}`}
      data-workspace="map-v2"
    >
      {/* DEGRADED OPERATIONAL BANNER (Non-blocking retry, Section 8) */}
      {overviewError && (
        <div className="map-v2-degraded-banner" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} />
            <span>
              <strong>Dữ liệu ngoại tuyến:</strong> Không thể tải chỉ số từ máy chủ ({overviewError}). Bản đồ hiển thị cấu trúc hình học chuẩn.
            </span>
          </div>
          <button
            type="button"
            className="map-v2-btn"
            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
            onClick={() => fetchOverviewData(selectedDate, selectedRoundId)}
          >
            <RefreshCw size={12} className={loadingOverview ? 'animate-spin' : ''} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* NON-BLOCKING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="map-v2-toast-notification" role="status">
          <Info size={16} color="#38BDF8" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. PRIMARY OPERATIONAL TOOLBAR (Section 13, 14) */}
      <header className="map-v2-header" role="banner">
        {/* Workspace Title */}
        <div className="map-v2-title-group">
          <div className="map-v2-title-row">
            <h1 className="map-v2-title">Bản đồ Tân Thuận</h1>
            {isNeon && (
              <span className="map-v2-badge" style={{ backgroundColor: '#061730', color: '#00f0ff', borderColor: '#00f0ff' }}>
                Digital Twin
              </span>
            )}
          </div>
          <p className="map-v2-subtitle">
            Cảng Tân Thuận 1 &bull; Bản đồ số vận hành
          </p>
        </div>

        {/* Primary Controls Row */}
        <div className="map-v2-toolbar" role="toolbar" aria-label="Thanh công cụ Bản đồ V2">
          {/* A. Date & Round Context Selector Trigger (Section 6) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="map-v2-context-trigger"
              onClick={() => {
                setContextPickerOpen((prev) => !prev);
                setSearchOpen(false);
              }}
              title="Nhấp để thay đổi Ngày và Lượt ghi chỉ số"
              aria-expanded={contextPickerOpen}
              aria-label="Chọn ngày và lượt ghi"
            >
              <Calendar size={14} color={isNeon ? '#00f0ff' : '#003875'} />
              <span>{dateDisplay} &bull; {roundDisplay}</span>
              <ChevronDown size={13} />
            </button>

            {/* Context Selector Popover */}
            {contextPickerOpen && (
              <div className="map-v2-context-popover" role="dialog" aria-label="Chọn ngày và lượt đọc">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isNeon ? '#00f0ff' : '#003875' }}>
                    Ngữ cảnh tác nghiệp
                  </span>
                  <button
                    type="button"
                    className="map-v2-btn map-v2-btn-icon-only"
                    onClick={() => setContextPickerOpen(false)}
                    aria-label="Đóng"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="map-v2-context-field">
                  <label className="map-v2-context-label">Ngày ghi chỉ số</label>
                  <input
                    type="date"
                    className="map-v2-context-input"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(e.target.value);
                      }
                    }}
                  />
                </div>

                <div className="map-v2-context-field">
                  <label className="map-v2-context-label">Lượt đọc trong ngày</label>
                  <select
                    className="map-v2-context-input"
                    value={selectedRoundId || ''}
                    onChange={(e) => {
                      setSelectedRoundId(e.target.value || null);
                      setContextPickerOpen(false);
                    }}
                  >
                    <option value="">Lượt đọc mặc định (Theo máy chủ)</option>
                    {availableRounds.map((r) => (
                      <option key={r.id} value={r.id}>
                        Lượt {r.scheduled_time_only} ({r.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button
                    type="button"
                    className="map-v2-btn map-v2-btn-primary"
                    style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                    onClick={() => {
                      fetchOverviewData(selectedDate, selectedRoundId);
                      setContextPickerOpen(false);
                    }}
                  >
                    <RefreshCw size={12} className={loadingOverview ? 'animate-spin' : ''} />
                    <span>Cập nhật</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* B. Quick Search Box (Section 16) */}
          <div className="map-v2-search-box">
            <Search size={14} className="map-v2-search-icon" />
            <input
              ref={searchInputRef}
              type="search"
              className="map-v2-search-input"
              placeholder="Tìm khu vực, công tơ, mã NV..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(Boolean(e.target.value.trim()));
              }}
              onFocus={() => {
                if (searchQuery.trim()) setSearchOpen(true);
              }}
              aria-label="Tìm kiếm trên bản đồ"
            />

            {/* Autocomplete Search Dropdown */}
            {searchOpen && searchResults && 'totalCount' in searchResults && searchResults.totalCount > 0 && (
              <div className="map-v2-search-dropdown" role="listbox">
                {/* 1. Mapped Zones */}
                {searchResults.zones.length > 0 && (
                  <div>
                    <div className="map-v2-search-group-header">Phân khu</div>
                    {searchResults.zones.map((z) => (
                      <div
                        key={z.zoneId}
                        className="map-v2-search-item"
                        onClick={() => {
                          setCenterOnCoord(z.point);
                          const targetPoly = manifest.polygons.find((p) => p.id === z.zoneId);
                          const bizId = CANONICAL_MAP_V2_ZONE_MAPPING[z.zoneId] || z.zoneId;
                          const opZone = (overview?.zones || []).find((oz) => oz.id === bizId || oz.id === z.zoneId);
                          if (opZone) {
                            setSelectedEntity({ type: 'zone_operational', data: { zone: opZone, anchor: z, polygon: targetPoly } });
                          } else if (targetPoly) {
                            setSelectedEntity({ type: 'polygon', data: targetPoly });
                          }
                          setSearchOpen(false);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={13} color="#0068FF" />
                          <span style={{ fontWeight: 600 }}>{z.label}</span>
                          <span style={{ color: '#64748B', fontSize: '0.72rem' }}>({z.code})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Operational Meters */}
                {searchResults.meters.length > 0 && (
                  <div>
                    <div className="map-v2-search-group-header">Điểm đo công tơ</div>
                    {searchResults.meters.map((m) => {
                      const hasCoords = isValidMeterCoordinate(m.map_x, m.map_y);
                      const isElec = m.utility_type === 'ELECTRICITY';
                      return (
                        <div
                          key={m.id}
                          className="map-v2-search-item"
                          onClick={() => {
                            if (hasCoords) {
                              const pt = getMeterCanvasPoint(m.map_x!, m.map_y!);
                              setCenterOnCoord(pt);
                              setSelectedEntity({ type: 'meter', data: m });
                            } else {
                              setSelectedEntity({ type: 'meter', data: m });
                              showToast(`Công tơ ${m.meter_code} chưa xác định vị trí trên Map V2`);
                            }
                            setSearchOpen(false);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isElec ? <Zap size={12} color="#FFB703" /> : <Droplets size={12} color="#0068FF" />}
                            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{m.meter_code}</span>
                            <span style={{ color: '#64748B', fontSize: '0.75rem' }}>{m.name}</span>
                          </div>
                          <div>
                            {!hasCoords ? (
                              <span style={{ fontSize: '0.7rem', color: '#B43A3A', fontStyle: 'italic' }}>
                                Chưa có vị trí
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>
                                {m.semantic_state === 'CONFIRMED' ? 'Đã ghi' : m.semantic_state === 'REVIEW' ? 'Cần kiểm tra' : 'Đến hạn'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Assigned Personnel */}
                {searchResults.employees.length > 0 && (
                  <div>
                    <div className="map-v2-search-group-header">Nhân sự phụ trách</div>
                    {searchResults.employees.map((e) => (
                      <div
                        key={e.id}
                        className="map-v2-search-item"
                        onClick={() => {
                          const anchor = getZoneAnchor(e.zoneId);
                          if (anchor) setCenterOnCoord(anchor.point);
                          setSelectedEntity({ type: 'employee', data: e });
                          setSearchOpen(false);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={12} color="#003875" />
                          <span style={{ fontWeight: 600 }}>{e.name}</span>
                          <span style={{ color: '#64748B', fontSize: '0.72rem' }}>({e.code})</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#0068FF' }}>{e.zoneLabel}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* C. Exception Filter Chip (Section 12, 14) */}
          {exceptionsCount > 0 && (
            <button
              type="button"
              className={`map-v2-exception-chip ${layerVisibility.exceptionsOnly ? 'active' : ''}`}
              onClick={() => {
                setLayerVisibility((prev) => ({
                  ...prev,
                  exceptionsOnly: !prev.exceptionsOnly,
                }));
              }}
              title={layerVisibility.exceptionsOnly ? 'Tắt lọc ngoại lệ' : 'Nhấp để lọc chỉ hiển thị các điểm đo cần kiểm tra hoặc trễ hạn'}
              aria-pressed={layerVisibility.exceptionsOnly}
            >
              <AlertTriangle size={13} />
              <span>{exceptionsCount} Ngoại lệ</span>
            </button>
          )}

          {/* D. Layer Manager Trigger (Axis 2, Section 13) */}
          <button
            type="button"
            className={`map-v2-btn ${layersOpen ? 'active' : ''}`}
            onClick={() => {
              setLayersOpen((prev) => !prev);
              setMoreSettingsOpen(false);
              setContextPickerOpen(false);
            }}
            title="Quản lý các lớp hiển thị trên bản đồ"
            aria-expanded={layersOpen}
            aria-label="Quản lý lớp bản đồ"
          >
            <Layers size={14} />
            <span>Lớp</span>
          </button>

          {/* E. More Settings Menu (Axis 1 & Axis 3, Section 13, 14) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`map-v2-btn ${moreSettingsOpen ? 'active' : ''}`}
              onClick={() => {
                setMoreSettingsOpen((prev) => !prev);
                setLayersOpen(false);
                setContextPickerOpen(false);
              }}
              title="Tùy chọn hiển thị, chế độ kiểm tra và thông tin bản đồ"
              aria-expanded={moreSettingsOpen}
              aria-label="Tùy chọn bổ sung"
            >
              <Settings size={14} />
              <span>⋯</span>
            </button>

            {/* More Settings Popover */}
            {moreSettingsOpen && (
              <div
                className={`map-v2-options-popover ${isNeon ? 'tone-neon' : ''}`}
                role="dialog"
                aria-label="Tùy chọn hiển thị và chế độ bản đồ"
              >
                <div className="map-v2-options-header">
                  <span className="map-v2-options-title">Tùy chọn bản đồ</span>
                  <button
                    type="button"
                    className="map-v2-btn map-v2-btn-icon-only"
                    onClick={() => setMoreSettingsOpen(false)}
                    aria-label="Đóng"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* AXIS 1: Work Mode (Operational vs Geometry Inspection) */}
                <div className="map-v2-options-section">
                  <span className="map-v2-options-section-label">Chế độ làm việc (Work Mode)</span>
                  <div className="map-v2-viewmode-group" style={{ width: '100%' }}>
                    <button
                      type="button"
                      style={{ flex: 1, justifyContent: 'center' }}
                      className={`map-v2-viewmode-btn ${interactionMode === 'operational' ? 'active' : ''}`}
                      onClick={() => {
                        setInteractionMode('operational');
                      }}
                      title="Chế độ vận hành chuẩn"
                    >
                      <Compass size={13} />
                      <span>Vận hành</span>
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, justifyContent: 'center' }}
                      className={`map-v2-viewmode-btn ${interactionMode === 'technical' ? 'active' : ''}`}
                      onClick={() => {
                        setInteractionMode('technical');
                      }}
                      title="Kiểm tra tọa độ hình học (Dành cho Admin)"
                    >
                      <Cpu size={13} />
                      <span>Kiểm tra</span>
                    </button>
                  </div>
                </div>

                {/* AXIS 3: Presentation Theme (Technical Light vs Neon Digital Twin) */}
                <div className="map-v2-options-section">
                  <span className="map-v2-options-section-label">Giao diện (Presentation)</span>
                  <div className="map-v2-viewmode-group" style={{ width: '100%' }}>
                    <button
                      type="button"
                      style={{ flex: 1, justifyContent: 'center' }}
                      className={`map-v2-viewmode-btn ${toneMode === 'technical' ? 'active' : ''}`}
                      onClick={() => setToneMode('technical')}
                    >
                      <Sun size={13} />
                      <span>Chuẩn kỹ thuật</span>
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, justifyContent: 'center' }}
                      className={`map-v2-viewmode-btn ${toneMode === 'neon' ? 'active neon-active' : ''}`}
                      onClick={() => setToneMode('neon')}
                    >
                      <Sparkles size={13} />
                      <span>Neon số</span>
                    </button>
                  </div>
                </div>

                {/* Framing & View Mode */}
                <div className="map-v2-options-section">
                  <span className="map-v2-options-section-label">Chế độ khung nhìn</span>
                  <div className="map-v2-viewmode-group" style={{ width: '100%' }}>
                    <button
                      type="button"
                      style={{ flex: 1, justifyContent: 'center' }}
                      className={`map-v2-viewmode-btn ${viewMode === 'contain' ? 'active' : ''}`}
                      onClick={() => setViewMode('contain')}
                    >
                      <Maximize2 size={13} />
                      <span>Fit toàn bộ</span>
                    </button>
                    <button
                      type="button"
                      style={{ flex: 1, justifyContent: 'center' }}
                      className={`map-v2-viewmode-btn ${viewMode === 'width' ? 'active' : ''}`}
                      onClick={() => setViewMode('width')}
                    >
                      <StretchHorizontal size={13} />
                      <span>Tràn chiều rộng</span>
                    </button>
                  </div>
                </div>

                {/* Layer Management Quick Access */}
                <div className="map-v2-options-section">
                  <button
                    type="button"
                    className="map-v2-btn map-v2-btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                    onClick={() => {
                      setLayersOpen(true);
                      setMoreSettingsOpen(false);
                    }}
                  >
                    <Layers size={13} />
                    <span>Quản lý 6 lớp hiển thị</span>
                  </button>
                </div>

                {/* Canonical Metadata (Relocated from primary attention) */}
                <div className="map-v2-options-meta">
                  <FileCheck2 size={12} color={isNeon ? '#00f0ff' : '#003875'} />
                  <span>1536×1024 px &bull; 7 phân khu &bull; Canonical B2</span>
                </div>
              </div>
            )}
          </div>

          {/* Deselect button when an entity is selected */}
          {selectedEntity && (
            <button
              type="button"
              className="map-v2-btn"
              onClick={() => {
                setSelectedEntity(null);
                setTracedMeterCode(null);
              }}
              title="Bỏ chọn đối tượng"
              aria-label="Bỏ chọn"
            >
              <X size={14} />
              <span>Bỏ chọn</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN BODY: CANVAS + POPUPS + INSPECTION */}
      <div ref={workspaceBodyRef} className="map-v2-workspace-body">
        {/* Central Map Canvas */}
        <MapV2Canvas
          manifest={manifest}
          visibility={layerVisibility}
          selectedEntity={selectedEntity}
          onSelectEntity={(entity) => setSelectedEntity(entity)}
          viewMode={viewMode}
          interactionMode={interactionMode}
          toneMode={toneMode}
          utilityMode={utilityMode}
          utilityLayoutKey={utilityLayout}
          onUtilityStatusChange={setUtilityStatus}
          onAnchorScreenPosChange={handleAnchorScreenPosChange}
          employees={liveEmployees}
          demoEmployees={DEMO_MAP_V2_EMPLOYEES}
          meters={liveMeters}
          liveOperationalZones={overview?.zones || []}
          utilityFilter={utilityFilter}
          exceptionsOnly={layerVisibility.exceptionsOnly}
          centerOnCoord={centerOnCoord}
          selectedMeterCode={selectedMeterCode}
          tracedMeterCode={tracedMeterCode}
          onSelectMeterHost={handleSelectMeterHost}
          isMotionPaused={isMotionPaused}
          onToggleMotionPause={() => setIsMotionPaused((prev) => !prev)}
        />

        {/* Floating Layer Control Popover */}
        {layersOpen && (
          <MapV2Layers
            visibility={layerVisibility}
            onChange={(nextVis) => setLayerVisibility(nextVis)}
            onClose={() => setLayersOpen(false)}
            toneMode={toneMode}
          />
        )}

        {/* Operational Floating Zone Card when a polygon is revealed in Operational Mode */}
        {isOperational && selectedEntity && selectedEntity.type === 'polygon' && (
          <div
            className={`map-v2-operational-card ${isNeon ? 'tone-neon' : ''}`}
            role="region"
            aria-label="Thông tin phân khu đang chọn"
            style={cardPositionStyle}
          >
            <div className="map-v2-operational-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="map-v2-operational-pill-code font-mono">
                  {activeAnchor?.code || selectedEntity.data.id}
                </span>
                <span className="map-v2-operational-card-title">
                  {selectedEntity.data.label}
                </span>
              </div>
              <button
                type="button"
                className="map-v2-btn map-v2-btn-icon-only"
                onClick={() => setSelectedEntity(null)}
                title="Đóng bảng thông tin"
                aria-label="Đóng"
                style={{ padding: '2px 4px' }}
              >
                <X size={13} />
              </button>
            </div>

            <p className="map-v2-operational-card-desc">
              {activeAnchor?.description || `Phân loại: ${selectedEntity.data.category}.`}
            </p>

            <div className="map-v2-operational-card-actions">
              <button
                type="button"
                className="map-v2-btn map-v2-btn-sm"
                onClick={() => setInteractionMode('technical')}
                title="Chuyển sang chế độ kiểm tra chi tiết"
              >
                <SlidersHorizontal size={13} />
                <span>Xem chi tiết kỹ thuật</span>
              </button>
            </div>
          </div>
        )}

        {/* Right Side Inspector Panel (Section 20, 25, 27) */}
        {selectedEntity && (selectedEntity.type === 'employee' || selectedEntity.type === 'meter' || selectedEntity.type === 'zone_operational' || (!isOperational && selectedEntity)) && (
          <>
            {inspectorPresentation === 'drawer' && (
              <div
                className="map-v2-inspector-backdrop"
                onClick={() => {
                  setSelectedEntity(null);
                  setFocusedEntity(null);
                  setTracedMeterCode(null);
                }}
                aria-hidden="true"
              />
            )}
            <MapV2InspectionPanel
              selected={selectedEntity}
              onClose={() => {
                setSelectedEntity(null);
                setFocusedEntity(null);
                setTracedMeterCode(null);
              }}
              toneMode={toneMode}
              presentation={inspectorPresentation}
              onInspectReading={openReadingInspection}
              onOpenMeterDetails={openMeterDetails}
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
              onTraceMeter={handleTraceMeter}
              isMeterTraced={Boolean(selectedEntity?.type === 'meter' && tracedMeterCode === selectedEntity.data.meter_code)}
              selectedDate={selectedDate}
              selectedRoundId={selectedRoundId}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default MapV2Workspace;
