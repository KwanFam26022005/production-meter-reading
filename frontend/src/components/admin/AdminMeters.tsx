import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Power,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  Lock,
  MoreVertical,
  Layers,
  Map,
  List,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import { AdminMeterItem, AdminMeterListResponse } from '../../types';
import {
  activateAdminMeter,
  createAdminMeter,
  deactivateAdminMeter,
  getAdminMeterLatestReading,
  getAdminMeters,
  updateAdminMeter,
  getAdminMeterRelations,
} from '../../services/api';
import { MeterAssetRelation } from '../../features/assets/types';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { MapOperationsPage } from '../../features/map-operations/MapOperationsPage';
import { formatMeterTypeLabel } from '../../utils/meterMetadata';

export const formatLatestReadingTime = (timeStr?: string | null): string | null => {
  if (!timeStr) return null;
  if (timeStr.includes(' - ')) {
    const [timePart, datePart] = timeStr.split(' - ');
    const timeParts = timePart.split(':');
    const conciseTime = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : timePart;
    const dateParts = datePart.split('/');
    const conciseDate = dateParts.length >= 2 ? `${dateParts[0]}/${dateParts[1]}` : datePart;
    return `${conciseTime} · ${conciseDate}`;
  }
  return timeStr;
};

export const getMeterMeasurementInfo = (
  utilityType?: string | null,
  measurementUnit?: string | null
): { label: string; badgeClass: string; unitText: string; isUnknown: boolean } => {
  const normUnit = measurementUnit?.toUpperCase();
  const normUtil = utilityType?.toUpperCase();

  if (normUnit === 'UNKNOWN' || (!normUnit && normUtil === 'UNKNOWN')) {
    return {
      label: 'Chưa cấu hình đơn vị',
      badgeClass: 'badge-unit-unknown',
      unitText: '',
      isUnknown: true,
    };
  }

  if (normUnit === 'KWH' || normUtil === 'ELECTRICITY') {
    return {
      label: 'Điện (kWh)',
      badgeClass: 'badge-unit-kwh',
      unitText: 'kWh',
      isUnknown: false,
    };
  }

  if (normUnit === 'M3' || normUtil === 'WATER') {
    return {
      label: 'Nước (m³)',
      badgeClass: 'badge-unit-m3',
      unitText: 'm³',
      isUnknown: false,
    };
  }

  return {
    label: normUtil ? `${normUtil} (${normUnit || 'Chưa rõ'})` : 'Chưa rõ đơn vị',
    badgeClass: 'badge-unit-unknown',
    unitText: normUnit || '',
    isUnknown: true,
  };
};

export const getRegisterSemanticsInfo = (
  semantics?: string | null
): { label: string; badgeClass: string } => {
  const norm = semantics?.toUpperCase();
  if (norm === 'CUMULATIVE') {
    return { label: 'Lũy kế', badgeClass: 'badge-semantics-cumulative' };
  }
  if (norm === 'INTERVAL') {
    return { label: 'Khoảng', badgeClass: 'badge-semantics-interval' };
  }
  return { label: 'Chưa cấu hình', badgeClass: 'badge-semantics-unknown' };
};

export interface AdminMetersProps {
  onInspectReading?: (readingId: string) => void;
}

export const AdminMeters: React.FC<AdminMetersProps> = ({ onInspectReading }) => {
  const [data, setData] = useState<AdminMeterListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  // Overflow menu state (tracks which meter ID's menu is open)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Drawer state (Add / Edit)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editingMeter, setEditingMeter] = useState<AdminMeterItem | null>(null);
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formType, setFormType] = useState<string>('LCD');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [meterRelations, setMeterRelations] = useState<MeterAssetRelation[]>([]);

  // Deactivation / Activation modal state
  const [deactivatingMeter, setDeactivatingMeter] = useState<AdminMeterItem | null>(null);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const loadMeters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminMeters(
        searchQuery,
        statusFilter === 'ALL' ? undefined : statusFilter,
        typeFilter === 'ALL' ? undefined : typeFilter
      );
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh mục công tơ.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeters();
  }, [searchQuery, statusFilter, typeFilter]);

  // Handle outside clicks and Escape key to close overflow menu
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleDocumentClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  const handleOpenAdd = () => {
    setEditingMeter(null);
    setFormCode('');
    setFormName('');
    setFormLocation('');
    setFormType('LCD');
    setFormError(null);
    setMeterRelations([]);
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  const handleOpenEdit = (m: AdminMeterItem) => {
    setEditingMeter(m);
    setFormCode(m.meter_code);
    setFormName(m.name);
    setFormLocation(m.location || '');
    const meterType = m.meter_type?.toUpperCase() || 'UNKNOWN';
    setFormType(['LCD', 'MECHANICAL', 'OTHER', 'UNKNOWN'].includes(meterType) ? meterType : 'UNKNOWN');
    setFormError(null);
    setMeterRelations([]);
    getAdminMeterRelations(m.id)
      .then((res) => setMeterRelations(res.relations))
      .catch(() => setMeterRelations([]));
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  const handleCloseDrawer = () => {
    if (!formSubmitting) {
      setIsDrawerOpen(false);
      setEditingMeter(null);
      setFormError(null);
      setMeterRelations([]);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formCode.trim();
    const cleanName = formName.trim();
    const cleanLoc = formLocation.trim();

    if (!cleanCode) {
      setFormError('Vui lòng nhập mã công tơ.');
      return;
    }
    if (!cleanName) {
      setFormError('Vui lòng nhập tên công tơ.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingMeter) {
        // Update
        await updateAdminMeter(editingMeter.id, {
          meter_code: cleanCode,
          name: cleanName,
          location: cleanLoc || null,
          meter_type: formType,
        });
      } else {
        // Create
        await createAdminMeter({
          meter_code: cleanCode,
          name: cleanName,
          location: cleanLoc || null,
          meter_type: formType,
        });
      }
      setIsDrawerOpen(false);
      await loadMeters();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu thông tin công tơ.';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingMeter) return;
    setDeactivating(true);
    setDeactivateError(null);

    try {
      if (deactivatingMeter.is_active) {
        await deactivateAdminMeter(deactivatingMeter.id);
      } else {
        await activateAdminMeter(deactivatingMeter.id);
      }
      setDeactivatingMeter(null);
      await loadMeters();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thao tác không thành công.';
      setDeactivateError(msg);
    } finally {
      setDeactivating(false);
    }
  };

  const isSearchOrFilterActive =
    searchQuery.trim() !== '' || statusFilter !== 'ALL' || typeFilter !== 'ALL';

  const [viewMode, setViewMode] = useState<'map' | 'legacy'>(() => {
    try {
      const saved = sessionStorage.getItem('csg_admin_meters_view_mode');
      if (saved === 'legacy' || saved === 'map') return saved;
    } catch {}
    return 'legacy';
  });

  const handleSetViewMode = (mode: 'map' | 'legacy') => {
    setViewMode(mode);
    try {
      sessionStorage.setItem('csg_admin_meters_view_mode', mode);
    } catch {}
  };

  if (viewMode === 'map') {
    return (
      <MapOperationsPage
        onInspectReading={onInspectReading}
        onSwitchToLegacy={() => handleSetViewMode('legacy')}
      />
    );
  }

  return (
    <div className="admin-page-container">
      {/* 1. PAGE HEADER */}
      <div className="admin-page-header admin-meters-desktop-header">
        <div className="admin-page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="admin-page-title">Danh mục công tơ</h1>
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
          <p className="admin-page-subtitle">Quản lý thông tin và trạng thái công tơ</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sgp-view-mode-toggle" role="group" aria-label="Chế độ hiển thị">
            <button
              type="button"
              className="sgp-mode-btn"
              onClick={() => handleSetViewMode('map')}
            >
              <Map size={15} />
              <span>Bản đồ</span>
            </button>
            <button
              type="button"
              className="sgp-mode-btn active"
              onClick={() => handleSetViewMode('legacy')}
            >
              <List size={15} />
              <span>Danh sách</span>
            </button>
          </div>

          <button
            type="button"
            className="admin-btn-primary"
            onClick={handleOpenAdd}
            aria-label="Thêm công tơ mới"
          >
            <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>Thêm công tơ</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR */}
      <div className="admin-toolbar-card admin-meters-desktop-toolbar" role="search" aria-label="Tìm kiếm và lọc công tơ">
        <div className="admin-toolbar-search-wrap">
          <Search size={16} className="admin-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm mã, tên hoặc vị trí"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm công tơ"
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Xóa tìm kiếm"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="admin-toolbar-filters">
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang dùng</option>
            <option value="INACTIVE">Ngừng sử dụng</option>
          </select>

          <select
            className="admin-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Lọc theo loại công tơ"
          >
            <option value="ALL">Tất cả loại</option>
            <option value="LCD">LCD</option>
            <option value="MECHANICAL">Cơ</option>
            <option value="OTHER">Khác</option>
            <option value="UNKNOWN">Chưa cấu hình loại</option>
          </select>

          <button
            type="button"
            className="admin-btn-refresh"
            onClick={loadMeters}
            disabled={loading}
            title="Làm mới dữ liệu"
            aria-label="Làm mới danh sách công tơ"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* MOBILE HEADER & FILTER DISCLOSURE */}
      <div className="admin-meters-mobile-header">
        <div className="admin-meters-mobile-title-row">
          <div>
            <h1 className="admin-meters-mobile-title">Danh mục công tơ</h1>
            <p className="admin-meters-mobile-subtitle">
              {data ? `${data.total} công tơ • ${data.meters.filter((m) => m.is_active).length} đang dùng` : 'Quản lý công tơ'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="admin-meters-mobile-add-btn"
            aria-label="Thêm công tơ mới"
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>Thêm</span>
          </button>
        </div>

        <div className="admin-meters-mobile-search-row">
          <div className="admin-meters-mobile-search-box">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Tìm mã, tên hoặc vị trí..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-meters-mobile-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                aria-label="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className={`admin-meters-mobile-filter-toggle ${mobileFiltersOpen ? 'active' : ''}`}
          >
            Bộ lọc
          </button>
        </div>

        {mobileFiltersOpen && (
          <div className="admin-meters-mobile-filter-panel">
            <div className="admin-meters-mobile-filter-field">
              <label>Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang dùng</option>
                <option value="INACTIVE">Ngừng sử dụng</option>
              </select>
            </div>
            <div className="admin-meters-mobile-filter-field">
              <label>Loại công tơ</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">Tất cả loại</option>
                <option value="LCD">LCD</option>
                <option value="MECHANICAL">Cơ</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 3. METERS MASTER DATA TABLE */}
      {loading ? (
        <LoadingState message="Đang tải danh mục công tơ..." />
      ) : error ? (
        <ErrorState
          title="Không thể tải danh sách"
          message={error}
          onRetry={loadMeters}
        />
      ) : !data || data.meters.length === 0 ? (
        <div className="admin-surface-card admin-meter-empty-card">
          <Layers size={32} className="text-muted" aria-hidden="true" />
          <h3 className="admin-meter-empty-title">
            {isSearchOrFilterActive ? 'Không tìm thấy công tơ phù hợp' : 'Chưa có công tơ'}
          </h3>
          <p className="admin-meter-empty-text">
            {isSearchOrFilterActive
              ? 'Thử thay đổi từ khóa hoặc bộ lọc để tìm kiếm lại.'
              : 'Danh mục công tơ hiện đang trống.'}
          </p>
          {!isSearchOrFilterActive && (
            <button
              type="button"
              className="admin-btn-primary"
              onClick={handleOpenAdd}
            >
              <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
              <span>Thêm công tơ</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="admin-surface-card table-card admin-meters-desktop-table">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Danh sách thiết bị</h2>
              <span className="admin-card-badge font-tabular">
                {data.total} công tơ
              </span>
            </div>

            <div className="admin-table-container">
              <table className="admin-table admin-meters-table" aria-label="Bảng danh mục công tơ">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '12%' }}>Mã công tơ</th>
                    <th scope="col" style={{ width: '16%' }}>Tên công tơ</th>
                    <th scope="col" style={{ width: '18%' }}>Khu vực / vị trí</th>
                    <th scope="col" style={{ width: '18%' }}>Tiện ích & Đơn vị</th>
                    <th scope="col" style={{ width: '12%' }}>Trạng thái</th>
                    <th scope="col" style={{ width: '19%' }}>Chỉ số gần nhất</th>
                    <th scope="col" style={{ width: '56px', textAlign: 'center' }}>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.meters.map((m) => {
                    const formattedTime = formatLatestReadingTime(m.latest_reading_time);
                    const isMenuOpen = openMenuId === m.id;
                    const typeLabel = formatMeterTypeLabel(m.meter_type);
                    const measInfo = getMeterMeasurementInfo(m.utility_type, m.measurement_unit);
                    const semInfo = getRegisterSemanticsInfo(m.register_semantics);

                    return (
                      <tr
                        key={m.id}
                        className={`admin-meter-row ${!m.is_active ? 'row-meter-inactive' : ''}`}
                      >
                        {/* Column 1: Mã công tơ */}
                        <td>
                          <button
                            type="button"
                            className="admin-meter-code-link font-mono font-bold font-tabular"
                            onClick={() => handleOpenEdit(m)}
                            title={`Chỉnh sửa công tơ ${m.meter_code}`}
                          >
                            {m.meter_code}
                          </button>
                        </td>

                        {/* Column 2: Tên công tơ */}
                        <td>
                          <span className="admin-meter-name font-medium">{m.name}</span>
                        </td>

                        {/* Column 3: Operational zone and physical location */}
                        <td>
                          <div className="admin-meter-location" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span>{m.zone_name || <span className="text-muted">Chưa phân khu</span>}</span>
                            {m.location && (
                              <span className="text-muted" style={{ fontSize: 11 }}>Vị trí: {m.location}</span>
                            )}
                          </div>
                        </td>

                        {/* Column 4: Tiện ích & Đơn vị đo */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {measInfo.isUnknown ? (
                                <span
                                  className="admin-badge badge-unit-unknown"
                                  title="Đơn vị chưa được cấu hình (UNKNOWN). Cần kiểm tra hồ sơ kỹ thuật."
                                >
                                  <AlertTriangle size={11} aria-hidden="true" />
                                  <span>Chưa cấu hình ĐV</span>
                                </span>
                              ) : (
                                <span className={`admin-badge ${measInfo.badgeClass}`}>
                                  {measInfo.label}
                                </span>
                              )}
                              <span className="text-muted font-tabular" style={{ fontSize: 11 }}>
                                {typeLabel}
                              </span>
                            </div>
                            {m.register_semantics && (
                              <span className="text-muted font-tabular" style={{ fontSize: 11 }}>
                                Kiểu: {semInfo.label}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Column 5: Trạng thái */}
                        <td>
                          {m.is_active ? (
                            <span className="admin-meter-status-active">
                              <span className="meter-dot dot-active" aria-hidden="true" />
                              <span>Đang dùng</span>
                            </span>
                          ) : (
                            <span className="admin-meter-status-inactive">
                              <span className="meter-dot dot-inactive" aria-hidden="true" />
                              <span>Ngừng sử dụng</span>
                            </span>
                          )}
                        </td>

                        {/* Column 6: Chỉ số gần nhất (Truthful Unit Representation) */}
                        <td>
                          {m.latest_reading ? (
                            <div className="admin-reading-cell-v2">
                              <span className="admin-reading-val font-mono font-semibold font-tabular">
                                {m.latest_reading}{' '}
                                {measInfo.isUnknown ? (
                                  <span
                                    className="font-normal text-xs"
                                    title="Đơn vị đo lường chưa cấu hình"
                                    style={{ color: 'var(--sgp-warning, #A86200)' }}
                                  >
                                    (Chưa rõ ĐV)
                                  </span>
                                ) : (
                                  measInfo.unitText
                                )}
                              </span>
                              {formattedTime && (
                                <span className="admin-reading-time font-tabular">
                                  {formattedTime}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted text-sm">Chưa có dữ liệu</span>
                          )}
                        </td>

                        {/* Column 7: Single Overflow Actions Menu [ ⋯ ] */}
                        <td style={{ textAlign: 'center', position: 'relative' }}>
                          <div
                            className="admin-overflow-wrapper"
                            ref={isMenuOpen ? menuRef : null}
                          >
                            <button
                              type="button"
                              className={`admin-menu-trigger ${isMenuOpen ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(isMenuOpen ? null : m.id);
                              }}
                              aria-expanded={isMenuOpen}
                              aria-haspopup="menu"
                              aria-label={`Thao tác với ${m.meter_code}`}
                              title="Thao tác"
                            >
                              <MoreVertical size={16} aria-hidden="true" />
                            </button>

                            {isMenuOpen && (
                              <div
                                className="admin-overflow-menu"
                                role="menu"
                                aria-orientation="vertical"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="admin-menu-item"
                                  role="menuitem"
                                  onClick={() => handleOpenEdit(m)}
                                >
                                  <Edit2 size={14} aria-hidden="true" />
                                  <span>Chỉnh sửa</span>
                                </button>

                                {onInspectReading && (
                                  <button
                                    type="button"
                                    className="admin-menu-item"
                                    role="menuitem"
                                    onClick={async () => {
                                     setOpenMenuId(null);
                                      try {
                                        const res = await getAdminMeterLatestReading(m.id);
                                        onInspectReading(res.reading_id);
                                      } catch (err: unknown) {
                                        const msg = err instanceof Error ? err.message : 'Công tơ chưa có bản ghi để kiểm tra.';
                                        alert(msg);
                                      }
                                    }}
                                  >
                                    <Search size={14} aria-hidden="true" />
                                    <span>Kiểm tra bản ghi gần nhất</span>
                                  </button>
                                )}

                                <div className="admin-menu-divider" role="separator" />

                                {m.is_active ? (
                                  <button
                                    type="button"
                                    className="admin-menu-item text-danger"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setDeactivateError(null);
                                      setDeactivatingMeter(m);
                                    }}
                                  >
                                    <Power size={14} aria-hidden="true" />
                                    <span>Ngừng sử dụng</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="admin-menu-item text-brand"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setDeactivateError(null);
                                      setDeactivatingMeter(m);
                                    }}
                                  >
                                    <Power size={14} aria-hidden="true" />
                                    <span>Kích hoạt lại</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE METERS LIST */}
          <div className="admin-meters-mobile-list">
            {data.meters.map((m) => {
              const formattedTime = formatLatestReadingTime(m.latest_reading_time);
              const measInfo = getMeterMeasurementInfo(m.utility_type, m.measurement_unit);

              return (
                <div
                  key={m.id}
                  onClick={() => handleOpenEdit(m)}
                  className="admin-meter-mobile-card"
                >
                  <div className="admin-meter-card-top">
                    <span className="admin-meter-card-code font-mono font-bold">{m.meter_code}</span>
                    <span className={`admin-meter-card-utility ${measInfo.isUnknown ? 'unknown' : m.utility_type === 'WATER' ? 'water' : 'electricity'}`}>
                      {measInfo.isUnknown ? '⚠️ Chưa cấu hình ĐV' : m.utility_type === 'WATER' ? '💧 Nước (m³)' : '⚡ Điện (kWh)'}
                    </span>
                  </div>

                  <div className="admin-meter-card-name">{m.name}</div>

                  <div className="admin-meter-card-zone">
                    <MapPin size={13} className="shrink-0 text-slate-400" />
                    <span>
                      {m.zone_name || m.location || 'Chưa phân khu / vị trí'}
                      {m.location && m.zone_name && (
                        <span className="block text-xs text-slate-500">Vị trí: {m.location}</span>
                      )}
                    </span>
                  </div>

                  <div className="admin-meter-card-bottom">
                    <div className="admin-meter-card-reading-wrap">
                      {m.latest_reading ? (
                        <>
                          <span className="admin-meter-card-reading-val font-mono">
                            {m.latest_reading}{' '}
                            {measInfo.isUnknown ? (
                              <span style={{ fontSize: 11, color: 'var(--sgp-warning, #A86200)' }}>
                                (Chưa rõ ĐV)
                              </span>
                            ) : (
                              measInfo.unitText
                            )}
                          </span>
                          {formattedTime && (
                            <span className="admin-meter-card-reading-time">{formattedTime}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted text-xs">Chưa có chỉ số</span>
                      )}
                    </div>

                    <div className="admin-meter-card-status-row">
                      <div className="admin-meter-card-status">
                        {m.is_active ? (
                          <span className="admin-meter-status-active">
                            <span className="meter-dot dot-active" aria-hidden="true" />
                            <span>Đang dùng</span>
                          </span>
                        ) : (
                          <span className="admin-meter-status-inactive">
                            <span className="meter-dot dot-inactive" aria-hidden="true" />
                            <span>Ngừng</span>
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-slate-400 shrink-0" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 4. SLIDE-OVER DRAWER (ADD / EDIT) */}
      {isDrawerOpen && (
        <div
          className="admin-drawer-overlay"
          onClick={handleCloseDrawer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-meter-title"
        >
          <div className="admin-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-header">
              <div className="drawer-title-group">
                <h2 id="drawer-meter-title" className="admin-drawer-title">
                  {editingMeter ? 'Chỉnh sửa công tơ' : 'Thêm công tơ mới'}
                </h2>
                {editingMeter && (
                  <span className="admin-drawer-code-tag font-mono font-bold">
                    {editingMeter.meter_code}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={handleCloseDrawer}
                disabled={formSubmitting}
                aria-label="Đóng bảng chỉnh sửa"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="admin-drawer-body">
              {formError && (
                <div className="admin-form-error-box" role="alert">
                  <AlertTriangle size={15} aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="admin-form-group">
                <label htmlFor="meter_code_input" className="admin-form-label">
                  Mã công tơ <span className="required-star">*</span>
                </label>
                <div className="admin-input-wrap">
                  <input
                    id="meter_code_input"
                    type="text"
                    className="admin-form-input font-mono font-bold"
                    placeholder="VD: ME-001, CT-013"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    disabled={Boolean(editingMeter && editingMeter.has_readings) || formSubmitting}
                    required
                  />
                  {editingMeter && editingMeter.has_readings && (
                    <Lock size={15} className="admin-input-lock-icon" aria-hidden="true" />
                  )}
                </div>
                {editingMeter && editingMeter.has_readings ? (
                  <span className="admin-form-help text-amber">
                    Mã công tơ không thể thay đổi sau khi đã có dữ liệu ghi nhận ({editingMeter.total_readings} lượt).
                  </span>
                ) : (
                  <span className="admin-form-help">
                    Mã định danh duy nhất của công tơ trong hệ thống
                  </span>
                )}
              </div>

              <div className="admin-form-group">
                <label htmlFor="meter_name_input" className="admin-form-label">
                  Tên công tơ <span className="required-star">*</span>
                </label>
                <input
                  id="meter_name_input"
                  type="text"
                  className="admin-form-input"
                  placeholder="VD: Công tơ tổng trạm biến áp A1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={formSubmitting}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="meter_location_input" className="admin-form-label">
                  Vị trí
                </label>
                <input
                  id="meter_location_input"
                  type="text"
                  className="admin-form-input"
                  placeholder="VD: Trạm điện A, Kho B, Cầu cảng 1"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  disabled={formSubmitting}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="meter_type_input" className="admin-form-label">
                  Loại công tơ
                </label>
                <select
                  id="meter_type_input"
                  className="admin-form-select"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  disabled={formSubmitting}
                >
                  <option value="LCD">Điện tử (LCD)</option>
                  <option value="MECHANICAL">Cơ (Mechanical)</option>
                  <option value="OTHER">Khác</option>
                  <option value="UNKNOWN">Chưa cấu hình loại</option>
                </select>
              </div>

              {editingMeter && (
                <div className="admin-form-group border-t border-slate-200 pt-4 mt-2">
                  <label className="admin-form-label flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Khu vực công tơ</span>
                  </label>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-medium">Khu vực tác nghiệp:</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {editingMeter.zone_name || 'Chưa xác minh'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-medium">Khu vực bản đồ:</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {editingMeter.presentation_zone_name || 'Chưa cấu hình'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {editingMeter && (
                <div className="admin-form-group border-t border-slate-200 pt-4 mt-2">
                  <label className="admin-form-label flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Thông số đo lường & Cấu hình</span>
                    {editingMeter.measurement_unit === 'UNKNOWN' && (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 text-[11px] font-semibold flex items-center gap-1">
                        <AlertTriangle size={11} /> Cần bổ sung
                      </span>
                    )}
                  </label>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Loại tiện ích:</span>
                      <span className="font-semibold text-slate-800">
                        {editingMeter.utility_type === 'WATER'
                          ? 'Cấp nước (WATER)'
                          : editingMeter.utility_type === 'ELECTRICITY'
                          ? 'Điện năng (ELECTRICITY)'
                          : 'Chưa xác định (UNKNOWN)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Đơn vị đo:</span>
                      <span className={`font-semibold ${editingMeter.measurement_unit === 'UNKNOWN' ? 'text-amber-800 font-bold' : 'text-slate-800'}`}>
                        {editingMeter.measurement_unit === 'KWH'
                          ? 'kWh (Kilowatt-giờ)'
                          : editingMeter.measurement_unit === 'M3'
                          ? 'm³ (Mét khối)'
                          : 'Chưa cấu hình (UNKNOWN)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Cơ chế ghi:</span>
                      <span className="font-semibold text-slate-800">
                        {editingMeter.register_semantics === 'CUMULATIVE'
                          ? 'Chỉ số lũy kế (CUMULATIVE)'
                          : editingMeter.register_semantics === 'INTERVAL'
                          ? 'Chỉ số khoảng (INTERVAL)'
                          : 'Chưa xác định (UNKNOWN)'}
                      </span>
                    </div>
                    {editingMeter.measurement_unit === 'UNKNOWN' && (
                      <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                        <AlertTriangle size={12} className="inline mr-1 text-amber-600" />
                        Công tơ này chưa được xác định đơn vị đo lường (UNKNOWN). Cần kiểm tra hồ sơ kỹ thuật để hoàn tất cấu hình trước khi tính toán sản lượng tiêu thụ.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {editingMeter && (
                <div className="admin-form-group border-t border-slate-200 pt-4 mt-2">
                  <label className="admin-form-label flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Liên kết thiết bị (V16C)</span>
                  </label>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Lắp tại:</span>
                      {meterRelations.find((r) => r.relation_type === 'INSTALLED_AT' && !r.valid_to) ? (
                        <span className="font-semibold text-slate-800">
                          {meterRelations.find((r) => r.relation_type === 'INSTALLED_AT' && !r.valid_to)?.asset_name}
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px] font-medium">
                          Chưa xác minh
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Đo:</span>
                      {meterRelations.find((r) => r.relation_type === 'MEASURES' && !r.valid_to) ? (
                        <span className="font-semibold text-slate-800">
                          {meterRelations.find((r) => r.relation_type === 'MEASURES' && !r.valid_to)?.asset_name}
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px] font-medium">
                          Chưa xác minh
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="admin-drawer-footer">
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={formSubmitting}
                >
                  <Check size={16} aria-hidden="true" />
                  <span>
                    {formSubmitting
                      ? 'Đang lưu...'
                      : editingMeter
                      ? 'Lưu thay đổi'
                      : 'Tạo công tơ'}
                  </span>
                </button>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={handleCloseDrawer}
                  disabled={formSubmitting}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DEACTIVATION / ACTIVATION CONFIRMATION MODAL */}
      {deactivatingMeter && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-deact-title">
          <div className="admin-modal-box">
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <Power size={18} className={deactivatingMeter.is_active ? 'text-warning' : 'text-brand'} aria-hidden="true" />
                <h2 id="modal-deact-title" className="admin-modal-title">
                  {deactivatingMeter.is_active
                    ? `Ngừng sử dụng ${deactivatingMeter.meter_code}?`
                    : `Kích hoạt lại ${deactivatingMeter.meter_code}?`}
                </h2>
              </div>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={() => setDeactivatingMeter(null)}
                disabled={deactivating}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="admin-modal-body">
              <p className="admin-modal-text">
                {deactivatingMeter.is_active ? (
                  <>
                    Công tơ <strong>{deactivatingMeter.name}</strong> ({deactivatingMeter.meter_code}) sẽ không xuất hiện trong các lượt tác nghiệp mới. Dữ liệu lịch sử vẫn được giữ nguyên.
                  </>
                ) : (
                  <>
                    Công tơ <strong>{deactivatingMeter.name}</strong> ({deactivatingMeter.meter_code}) sẽ có thể xuất hiện trong các lượt tác nghiệp mới.
                  </>
                )}
              </p>

              {deactivateError && (
                <div className="admin-form-error-box" role="alert" style={{ marginTop: '12px' }}>
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span>{deactivateError}</span>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className={`admin-btn-primary ${deactivatingMeter.is_active ? 'btn-danger' : ''}`}
                onClick={handleConfirmDeactivate}
                disabled={deactivating}
              >
                <Power size={16} aria-hidden="true" />
                <span>
                  {deactivating
                    ? 'Đang xử lý...'
                    : deactivatingMeter.is_active
                    ? 'Ngừng sử dụng'
                    : 'Kích hoạt lại'}
                </span>
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setDeactivatingMeter(null)}
                disabled={deactivating}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
