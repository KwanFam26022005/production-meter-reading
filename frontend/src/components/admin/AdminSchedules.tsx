import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  AlertCircle,
  Layers,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Search,
  MapPin,
} from 'lucide-react';
import {
  AdminSchedulePreviewResponse,
  AdminMeterItem,
  AdminScheduleScopeMode,
  AdminScheduleScopeRequest,
  ReadingRoundListResponse,
  ReadingRound,
  RoundMeterListResponse,
} from '../../types';
import {
  createAdminSchedule,
  getAdminMeters,
  ApiError,
  deleteAdminScheduleRound,
  deleteAdminSchedulesByDate,
  getAdminSchedules,
  previewAdminSchedule,
  getRoundMeters,
} from '../../services/api';
import { useOperationalWorkspace } from '../../context/OperationalWorkspaceContext';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { VnDatePicker } from '../ui/VnDatePicker';

export const formatDisplayDateVN = (isoDate: string): string => {
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {}
  return isoDate;
};

const getDialogFocusableElements = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.offsetParent !== null && !element.closest('[aria-hidden="true"]'));
};

export const addDays = (isoDate: string, days: number): string => {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  } catch {
    return isoDate;
  }
};

interface RoundTimingDerived {
  state: 'CURRENT' | 'UPCOMING' | 'PAST_COMPLETE' | 'PAST_INCOMPLETE' | 'CLOSED' | 'CANCELLED';
  badgeLabel: string;
  badgeClass: string;
  isCurrent: boolean;
  isUpcoming: boolean;
}

export const deriveRoundTimingState = (
  r: ReadingRound,
  selectedDate: string,
  todayStr: string,
  currentRoundId: string | null
): RoundTimingDerived => {
  if (r.status === 'CANCELLED') {
    return {
      state: 'CANCELLED',
      badgeLabel: 'Đã hủy',
      badgeClass: 'badge-past',
      isCurrent: false,
      isUpcoming: false,
    };
  }

  if (r.status === 'CLOSED') {
    return {
      state: 'CLOSED',
      badgeLabel: 'Đã đóng',
      badgeClass: 'badge-closed',
      isCurrent: false,
      isUpcoming: false,
    };
  }

  if (selectedDate < todayStr) {
    const isComplete = r.progress.confirmed === r.progress.total && r.progress.total > 0;
    return {
      state: isComplete ? 'PAST_COMPLETE' : 'PAST_INCOMPLETE',
      badgeLabel: isComplete ? 'Đã hoàn tất' : 'Đã qua',
      badgeClass: isComplete ? 'badge-completed' : 'badge-past',
      isCurrent: false,
      isUpcoming: false,
    };
  }

  if (selectedDate > todayStr) {
    return {
      state: 'UPCOMING',
      badgeLabel: 'Sắp tới',
      badgeClass: 'badge-upcoming',
      isCurrent: false,
      isUpcoming: true,
    };
  }

  // Today
  if (currentRoundId && r.id === currentRoundId) {
    return {
      state: 'CURRENT',
      badgeLabel: 'Hiện tại',
      badgeClass: 'badge-current',
      isCurrent: true,
      isUpcoming: false,
    };
  }

  const rTime = new Date(r.scheduled_at).getTime();
  const nowUtcTime = new Date().getTime();

  if (rTime <= nowUtcTime) {
    const isComplete = r.progress.confirmed === r.progress.total && r.progress.total > 0;
    return {
      state: isComplete ? 'PAST_COMPLETE' : 'PAST_INCOMPLETE',
      badgeLabel: isComplete ? 'Đã hoàn tất' : 'Đã qua',
      badgeClass: isComplete ? 'badge-completed' : 'badge-past',
      isCurrent: false,
      isUpcoming: false,
    };
  }

  return {
    state: 'UPCOMING',
    badgeLabel: 'Sắp tới',
    badgeClass: 'badge-upcoming',
    isCurrent: false,
    isUpcoming: true,
  };
};

export interface AdminSchedulesProps {
  onInspectReading?: (readingId: string) => void;
}

export const AdminSchedules: React.FC<AdminSchedulesProps> = ({ onInspectReading }) => {
  const {
    locateOnMap,
    openReadingInspection,
    selectedRoundId,
    setSelectedRoundId,
    selectedDate: wsDate,
    setSelectedDate: setWsDate,
  } = useOperationalWorkspace();

  const getTodayLocal = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  };

  const todayStr = getTodayLocal();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      return sessionStorage.getItem('admin_schedules_date') || todayStr;
    } catch {
      return todayStr;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('admin_schedules_date', selectedDate);
    } catch {}
    if (setWsDate && wsDate !== selectedDate) {
      setWsDate(selectedDate);
    }
  }, [selectedDate, setWsDate, wsDate]);

  const [scheduleData, setScheduleData] = useState<ReadingRoundListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Round Logbook State
  const [selectedRoundForMeters, setSelectedRoundForMeters] = useState<ReadingRound | null>(null);
  const [roundMetersData, setRoundMetersData] = useState<RoundMeterListResponse | null>(null);
  const [roundMetersLoading, setRoundMetersLoading] = useState<boolean>(false);
  const [roundMetersError, setRoundMetersError] = useState<string | null>(null);

  const [meterSearch, setMeterSearch] = useState<string>('');
  const [meterStatusFilter, setMeterStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'REVIEW' | 'PENDING'>('ALL');
  const [meterUtilityFilter, setMeterUtilityFilter] = useState<'ALL' | 'ELECTRICITY' | 'WATER'>('ALL');

  // Shift filter for 24-hour rounds table
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'CA1' | 'CA2' | 'CA3'>('ALL');
  const [mapLocateWarning, setMapLocateWarning] = useState<string | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState<boolean>(false);

  const loadRoundMeters = useCallback(async (roundId: string) => {
    setRoundMetersLoading(true);
    setRoundMetersError(null);
    try {
      const res = await getRoundMeters(roundId);
      setRoundMetersData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách công tơ của ca này.';
      setRoundMetersError(msg);
    } finally {
      setRoundMetersLoading(false);
    }
  }, []);

  const handleSelectRoundForMeters = (round: ReadingRound) => {
    if (selectedRoundForMeters?.id === round.id) {
      setSelectedRoundForMeters(null);
      setRoundMetersData(null);
      setSelectedRoundId(null);
    } else {
      setSelectedRoundForMeters(round);
      setSelectedRoundId(round.id);
      loadRoundMeters(round.id);
    }
  };

  // Sync with workspace selectedRoundId
  useEffect(() => {
    if (scheduleData && scheduleData.rounds.length > 0 && selectedRoundId) {
      const matchingRound = scheduleData.rounds.find((r) => r.id === selectedRoundId);
      if (matchingRound && selectedRoundForMeters?.id !== matchingRound.id) {
        setSelectedRoundForMeters(matchingRound);
        loadRoundMeters(matchingRound.id);
      }
    }
  }, [scheduleData, selectedRoundId, loadRoundMeters]);

  const filteredMeters = useMemo(() => {
    if (!roundMetersData?.meters) return [];
    return roundMetersData.meters.filter((item) => {
      const meterCode = item.meter.meter_code || (item.meter as any).code || '';
      const meterName = item.meter.name || '';
      const isWater =
        (item.meter as any).utility_type === 'WATER' ||
        meterCode.startsWith('W-') ||
        meterCode.startsWith('SIM-W');

      // Search filter
      if (meterSearch.trim()) {
        const q = meterSearch.trim().toLowerCase();
        if (!meterCode.toLowerCase().includes(q) && !meterName.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Status filter
      if (meterStatusFilter !== 'ALL' && item.reading_status !== meterStatusFilter) {
        return false;
      }

      // Utility filter
      if (meterUtilityFilter === 'ELECTRICITY' && isWater) return false;
      if (meterUtilityFilter === 'WATER' && !isWater) return false;

      return true;
    });
  }, [roundMetersData, meterSearch, meterStatusFilter, meterUtilityFilter]);

  const filteredRounds = useMemo(() => {
    if (!scheduleData?.rounds) return [];
    if (shiftFilter === 'ALL') return scheduleData.rounds;
    return scheduleData.rounds.filter((r) => {
      const h = parseInt(r.scheduled_time_only.split(':')[0], 10);
      if (shiftFilter === 'CA1') return h >= 6 && h < 14;
      if (shiftFilter === 'CA2') return h >= 14 && h < 22;
      if (shiftFilter === 'CA3') return h >= 22 || h < 6;
      return true;
    });
  }, [scheduleData, shiftFilter]);

  const shiftCounts = useMemo(() => {
    if (!scheduleData?.rounds) return { all: 0, ca1: 0, ca2: 0, ca3: 0 };
    let ca1 = 0;
    let ca2 = 0;
    let ca3 = 0;
    scheduleData.rounds.forEach((r) => {
      const h = parseInt(r.scheduled_time_only.split(':')[0], 10);
      if (h >= 6 && h < 14) ca1++;
      else if (h >= 14 && h < 22) ca2++;
      else ca3++;
    });
    return { all: scheduleData.rounds.length, ca1, ca2, ca3 };
  }, [scheduleData]);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formStart, setFormStart] = useState<string>('08:00');
  const [formEnd, setFormEnd] = useState<string>('17:00');
  const [intervalPreset, setIntervalPreset] = useState<number>(60);
  const [customInterval, setCustomInterval] = useState<string>('30');
  const [scopeMode, setScopeMode] = useState<AdminScheduleScopeMode>('ALL_ELIGIBLE');
  const [scopeMeters, setScopeMeters] = useState<AdminMeterItem[]>([]);
  const [scopeMetersLoading, setScopeMetersLoading] = useState<boolean>(false);
  const [scopeMetersError, setScopeMetersError] = useState<string | null>(null);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [selectedUtilities, setSelectedUtilities] = useState<Array<'ELECTRICITY' | 'WATER' | 'OTHER' | 'UNKNOWN'>>([]);
  const [selectedMeterIds, setSelectedMeterIds] = useState<string[]>([]);
  const createDialogRef = useRef<HTMLDivElement>(null);
  const restoreCreateFocusRef = useRef<HTMLElement | null>(null);

  const scheduleScope = useMemo<AdminScheduleScopeRequest>(() => {
    if (scopeMode === 'BY_ZONE') return { mode: scopeMode, zone_ids: selectedZoneIds };
    if (scopeMode === 'BY_UTILITY') return { mode: scopeMode, utility_types: selectedUtilities };
    if (scopeMode === 'SELECTED_METERS') return { mode: scopeMode, meter_ids: selectedMeterIds };
    return { mode: 'ALL_ELIGIBLE' };
  }, [scopeMode, selectedZoneIds, selectedUtilities, selectedMeterIds]);

  const eligibleScopeMeters = useMemo(
    () => scopeMeters.filter((meter) => meter.is_active && meter.lifecycle_status !== 'RETIRED'),
    [scopeMeters]
  );

  const scopeZoneOptions = useMemo(() => {
    const byId = new Map<string, string>();
    eligibleScopeMeters.forEach((meter) => {
      if (meter.zone_id) byId.set(meter.zone_id, meter.zone_name || meter.zone_id);
    });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [eligibleScopeMeters]);

  const scopeReady =
    scopeMode === 'ALL_ELIGIBLE' ||
    (scopeMode === 'BY_ZONE' && selectedZoneIds.length > 0) ||
    (scopeMode === 'BY_UTILITY' && selectedUtilities.length > 0) ||
    (scopeMode === 'SELECTED_METERS' && selectedMeterIds.length > 0);

  // Preview State
  const [previewData, setPreviewData] = useState<AdminSchedulePreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Creation Action State
  const [creating, setCreating] = useState<boolean>(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isModalOpen || !createDialogRef.current) return;
    restoreCreateFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    getDialogFocusableElements(createDialogRef.current)[0]?.focus();
    return () => restoreCreateFocusRef.current?.focus();
  }, [isModalOpen]);

  // Delete State
  interface DeleteTarget {
    type: 'round' | 'day';
    round?: ReadingRound;
    date?: string;
    count?: number;
    confirmedCount?: number;
  }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const restoreDeleteFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!deleteTarget || !deleteDialogRef.current) return;
    restoreDeleteFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    getDialogFocusableElements(deleteDialogRef.current)[0]?.focus();
    return () => restoreDeleteFocusRef.current?.focus();
  }, [Boolean(deleteTarget)]);

  const loadSchedules = async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminSchedules(dateStr);
      setScheduleData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch ghi chỉ số.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules(selectedDate);
  }, [selectedDate]);

  // Determine current round id for today
  let currentRoundId: string | null = null;
  if (scheduleData && selectedDate === todayStr && scheduleData.rounds.length > 0) {
    const nowUtc = new Date().getTime();
    const pastOrCurr = scheduleData.rounds.filter(
      (r) => r.status === 'OPEN' && new Date(r.scheduled_at).getTime() <= nowUtc
    );
    if (pastOrCurr.length > 0) {
      currentRoundId = pastOrCurr[pastOrCurr.length - 1].id;
    }
  }

  // Derive Daily Summary Text
  const getDailySummary = (): string => {
    if (!scheduleData || scheduleData.rounds.length === 0) {
      return '0 lượt';
    }
    const total = scheduleData.rounds.length;

    if (selectedDate > todayStr) {
      return `${total} lượt · Lịch dự kiến`;
    }

    if (selectedDate < todayStr) {
      const completedCount = scheduleData.rounds.filter(
        (r) => r.progress.confirmed === r.progress.total && r.progress.total > 0
      ).length;
      const incompleteCount = total - completedCount;
      if (incompleteCount === 0) {
        return `${total} lượt · ${completedCount} hoàn tất`;
      }
      return `${total} lượt · ${completedCount} hoàn tất · ${incompleteCount} chưa hoàn tất`;
    }

    // Today
    const currentCount = currentRoundId ? 1 : 0;
    const upcomingCount = scheduleData.rounds.filter((r) => {
      const t = deriveRoundTimingState(r, selectedDate, todayStr, currentRoundId);
      return t.isUpcoming;
    }).length;
    const pastCount = total - currentCount - upcomingCount;

    if (pastCount > 0) {
      return `${total} lượt · ${pastCount} đã qua · ${currentCount} hiện tại · ${upcomingCount} sắp tới`;
    }
    return `${total} lượt · ${currentCount} hiện tại · ${upcomingCount} sắp tới`;
  };

  const getEffectiveInterval = (): number => {
    return intervalPreset === -1 ? (Number(customInterval) || 60) : intervalPreset;
  };

  const handleOpenCreateModal = async () => {
    setFormDate(selectedDate >= todayStr ? selectedDate : todayStr);
    setFormStart('08:00');
    setFormEnd('17:00');
    setIntervalPreset(60);
    setCustomInterval('30');
    setPreviewData(null);
    setPreviewError(null);
    setScopeMode('ALL_ELIGIBLE');
    setSelectedZoneIds([]);
    setSelectedUtilities([]);
    setSelectedMeterIds([]);
    setScopeMetersError(null);
    setIsModalOpen(true);
    setScopeMetersLoading(true);
    try {
      const response = await getAdminMeters(undefined, undefined, undefined, 'ALL', 'ALL');
      setScopeMeters(response.meters);
    } catch (err: unknown) {
      setScopeMetersError(err instanceof Error ? err.message : 'Không thể tải danh sách công tơ.');
    } finally {
      setScopeMetersLoading(false);
    }
  };

  const handleCreateDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCloseModal();
      return;
    }
    if (event.key !== 'Tab' || !createDialogRef.current) return;
    const focusable = getDialogFocusableElements(createDialogRef.current);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleCloseModal = () => {
    if (!creating) {
      setIsModalOpen(false);
      setPreviewData(null);
      setPreviewError(null);
    }
  };

  const handleCheckPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    const intervalToUse = getEffectiveInterval();
    if (!intervalToUse || intervalToUse < 5 || intervalToUse > 1440) {
      setPreviewError('Chu kỳ đọc phải nằm trong khoảng từ 5 đến 1440 phút.');
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    try {
      const res = await previewAdminSchedule({
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        interval_minutes: intervalToUse,
        scope: scheduleScope,
      });
      setPreviewData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kiểm tra lịch đọc.';
      setPreviewError(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!previewData || previewData.conflict_count > 0) return;
    const intervalToUse = getEffectiveInterval();
    if (!intervalToUse || intervalToUse < 5 || intervalToUse > 1440) {
      setPreviewError('Chu kỳ đọc phải nằm trong khoảng từ 5 đến 1440 phút.');
      return;
    }
    setCreating(true);
    setPreviewError(null);
    try {
      const res = await createAdminSchedule({
        date: formDate,
        start_time: formStart,
        end_time: formEnd,
        interval_minutes: intervalToUse,
        scope: scheduleScope,
        expected_scope_fingerprint: previewData.scope.fingerprint,
      });
      setIsModalOpen(false);
      setCreateSuccessMsg(res.message);
      setSelectedDate(formDate);
      await loadSchedules(formDate);
      setTimeout(() => setCreateSuccessMsg(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo lịch ghi.';
      setPreviewError(msg);
      if (err instanceof ApiError && err.status === 409) setPreviewData(null);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDeleteRound = (r: ReadingRound) => {
    setDeleteTarget({
      type: 'round',
      round: r,
    });
    setDeleteError(null);
  };

  const handleOpenDeleteDay = () => {
    if (!scheduleData || scheduleData.rounds.length === 0) return;
    const confirmedCount = scheduleData.rounds.reduce(
      (acc, r) => acc + (r.progress.confirmed || 0) + (r.progress.review || 0),
      0
    );
    setDeleteConfirmChecked(false);
    setDeleteTarget({
      type: 'day',
      date: selectedDate,
      count: scheduleData.rounds.length,
      confirmedCount,
    });
    setDeleteError(null);
  };

  const handleCloseDeleteModal = () => {
    if (!deleting) {
      setDeleteTarget(null);
      setDeleteError(null);
      setDeleteConfirmChecked(false);
    }
  };

  const handleDeleteDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCloseDeleteModal();
      return;
    }
    if (event.key !== 'Tab' || !deleteDialogRef.current) return;
    const focusable = getDialogFocusableElements(deleteDialogRef.current);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'day' && (deleteTarget.confirmedCount || 0) > 0 && !deleteConfirmChecked) {
      setDeleteError('Vui lòng tích chọn xác nhận trước khi thực hiện xóa dữ liệu.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      if (deleteTarget.type === 'round' && deleteTarget.round) {
        const res = await deleteAdminScheduleRound(deleteTarget.round.id);
        setDeleteTarget(null);
        setDeleteConfirmChecked(false);
        setDeleteSuccessMsg(res.message);
        await loadSchedules(selectedDate);
        setTimeout(() => setDeleteSuccessMsg(null), 5000);
      } else if (deleteTarget.type === 'day' && deleteTarget.date) {
        const res = await deleteAdminSchedulesByDate(deleteTarget.date);
        setDeleteTarget(null);
        setDeleteConfirmChecked(false);
        setDeleteSuccessMsg(res.message);
        await loadSchedules(selectedDate);
        setTimeout(() => setDeleteSuccessMsg(null), 5000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa lịch đọc.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const isSelectedToday = selectedDate === todayStr;

  return (
    <div className="admin-page-container">
      {/* 1. PAGE HEADER */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 className="admin-page-title">Lịch ghi chỉ số</h1>
          <p className="admin-page-subtitle">Thiết lập và theo dõi lịch đọc công tơ</p>
        </div>

        <button
          type="button"
          className="admin-btn-primary"
          onClick={handleOpenCreateModal}
          aria-label="Tạo lịch đọc mới"
        >
          <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>Tạo lịch đọc</span>
        </button>
      </div>

      {/* 2. BATCH CONTEXT & TIMELINE TOOLBAR BANNER */}
      {scheduleData && (
        <div className="admin-batch-banner">
          <div className="admin-bb-main">
            <Layers size={18} className="text-brand" aria-hidden="true" />
            <div className="admin-bb-info">
              <span className="admin-bb-kicker">ĐỢT HIỆN HÀNH</span>
              <span className="admin-bb-title">{scheduleData.batch_name}</span>
              <span className="admin-bb-meta">{scheduleData.period_key} &bull; Đang mở</span>
            </div>
          </div>

          {/* Daily Date Navigation Controls */}
          <div className="admin-bb-controls" role="toolbar" aria-label="Điều hướng ngày tác nghiệp">
            {/* Quick "Hôm nay" Button */}
            {!isSelectedToday && (
              <button
                type="button"
                className="admin-btn-today"
                onClick={() => setSelectedDate(todayStr)}
                aria-label="Về hôm nay"
              >
                Hôm nay
              </button>
            )}

            {/* Stepper Chevron Left */}
            <button
              type="button"
              className="admin-nav-btn"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              title="Ngày trước"
              aria-label="Ngày trước"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>

            {/* Localized Vietnamese Date Picker */}
            <VnDatePicker
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              ariaLabel="Chọn ngày tác nghiệp"
            />

            {/* Stepper Chevron Right */}
            <button
              type="button"
              className="admin-nav-btn"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              title="Ngày sau"
              aria-label="Ngày sau"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>

            {/* Tertiary Refresh Button */}
            <button
              type="button"
              className="admin-btn-refresh"
              onClick={() => loadSchedules(selectedDate)}
              disabled={loading}
              title="Làm mới dữ liệu"
              aria-label="Làm mới lịch đọc"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS NOTIFICATION */}
      {(createSuccessMsg || deleteSuccessMsg) && (
        <div className="admin-alert-banner alert-success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{createSuccessMsg || deleteSuccessMsg}</span>
        </div>
      )}

      {/* 3. DAILY OPERATIONAL TIMELINE TABLE */}
      {loading ? (
        <LoadingState message="Đang tải lịch ghi chỉ số..." />
      ) : error ? (
        <ErrorState
          title="Không thể tải lịch ghi"
          message={error}
          onRetry={() => loadSchedules(selectedDate)}
        />
      ) : !scheduleData || scheduleData.rounds.length === 0 ? (
        <div className="admin-surface-card admin-sched-empty-card">
          <Calendar size={32} className="text-muted" aria-hidden="true" />
          <h3 className="admin-sched-empty-title">
            Chưa có lịch ghi cho ngày {formatDisplayDateVN(selectedDate)}
          </h3>
          <p className="admin-sched-empty-text">
            Không có khung giờ nào được lên lịch cho ngày này. Bạn có thể bấm "Tạo lịch đọc" để thiết lập ca ghi mới.
          </p>
          <button
            type="button"
            className="admin-btn-primary"
            onClick={handleOpenCreateModal}
          >
            <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>Tạo lịch đọc</span>
          </button>
        </div>
      ) : (
        <div className="admin-surface-card table-card">
          <div className="admin-card-header">
            <div className="admin-card-title-group">
              <Clock size={16} className="text-brand" aria-hidden="true" />
              <h2 className="admin-card-title">
                Lịch trình ngày {formatDisplayDateVN(selectedDate)}
              </h2>
            </div>
            <div className="admin-card-header-actions">
              <span className="admin-daily-summary-tag font-tabular">
                {getDailySummary()}
              </span>
            </div>
          </div>

          {/* Shift Filter Toolbar */}
          <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--sgp-border)', background: 'var(--sgp-canvas)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="text-xs font-semibold text-muted" style={{ marginRight: '4px' }}>Ca tác nghiệp:</span>
            <button
              type="button"
              className={`admin-shift-tab ${shiftFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setShiftFilter('ALL')}
            >
              Tất cả ({shiftCounts.all})
            </button>
            <button
              type="button"
              className={`admin-shift-tab ${shiftFilter === 'CA1' ? 'active' : ''}`}
              onClick={() => setShiftFilter('CA1')}
            >
              Ca 1 · Sáng ({shiftCounts.ca1})
            </button>
            <button
              type="button"
              className={`admin-shift-tab ${shiftFilter === 'CA2' ? 'active' : ''}`}
              onClick={() => setShiftFilter('CA2')}
            >
              Ca 2 · Chiều ({shiftCounts.ca2})
            </button>
            <button
              type="button"
              className={`admin-shift-tab ${shiftFilter === 'CA3' ? 'active' : ''}`}
              onClick={() => setShiftFilter('CA3')}
            >
              Ca 3 · Đêm ({shiftCounts.ca3})
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table admin-sched-table" aria-label="Bảng các lượt ghi chỉ số theo ngày">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '110px' }}>Lượt</th>
                  <th scope="col" style={{ width: '140px' }}>Trạng thái</th>
                  <th scope="col">Tiến độ</th>
                  <th scope="col" style={{ width: '180px' }}>Ngoại lệ</th>
                  <th scope="col" style={{ width: '150px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRounds.map((r) => {
                  const timing = deriveRoundTimingState(
                    r,
                    selectedDate,
                    todayStr,
                    currentRoundId
                  );
                  const pct =
                    r.progress.total > 0
                      ? (r.progress.confirmed / r.progress.total) * 100
                      : 0;

                  return (
                    <tr
                      key={r.id}
                      className={`admin-sched-row ${
                        timing.isCurrent ? 'row-current' : timing.isUpcoming ? 'row-upcoming' : ''
                      } ${selectedRoundForMeters?.id === r.id ? 'row-selected' : ''}`}
                      onClick={() => handleSelectRoundForMeters(r)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Column 1: Lượt */}
                      <td>
                        <span className="sched-time font-tabular font-bold">
                          {r.scheduled_time_only}
                        </span>
                      </td>

                      {/* Column 2: Trạng thái (Derived Temporal Badge) */}
                      <td>
                        <span className={`admin-badge ${timing.badgeClass} font-tabular`}>
                          {timing.badgeLabel}
                        </span>
                      </td>

                      {/* Column 3: Tiến độ */}
                      <td>
                        {timing.isUpcoming ? (
                          <span className="sched-progress-upcoming font-tabular">
                            {r.scope_mode === 'SNAPSHOT'
                              ? `${r.progress.total} công tơ trong lượt`
                              : `Phạm vi lịch cũ · ${r.progress.total} công tơ đang hoạt động`}
                          </span>
                        ) : (
                          <div className="sched-progress-wrap">
                            <span className="sched-progress-ratio font-tabular">
                              <strong>{r.progress.confirmed}</strong> / {r.progress.total}{' '}
                              {r.scope_mode === 'SNAPSHOT' ? 'công tơ trong lượt' : 'công tơ đang hoạt động'}
                            </span>
                            <div className="admin-progress-bg sched-progress-bar">
                              <div
                                className="admin-progress-fill"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: timing.isCurrent
                                    ? 'var(--sgp-brand-700)'
                                    : 'var(--sgp-brand-600)',
                                }}
                              />
                            </div>
                            {r.scope_mode !== 'SNAPSHOT' && (
                              <span className="text-xs text-muted">Phạm vi lịch cũ</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Column 4: Ngoại lệ */}
                      <td>
                        {r.progress.review > 0 ? (
                          <span className="admin-review-pill font-tabular" title={`${r.progress.review} lượt cần kiểm tra`}>
                            <AlertTriangle size={11} aria-hidden="true" /> {r.progress.review} cần kiểm tra
                          </span>
                        ) : (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </td>

                      {/* Column 5: Thao tác */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className={`admin-btn-secondary btn-sm ${selectedRoundForMeters?.id === r.id ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRoundForMeters(r);
                            }}
                            title={selectedRoundForMeters?.id === r.id ? 'Đóng sổ ca' : 'Xem sổ ca ghi công tơ'}
                            aria-label={`Xem sổ ca khung giờ ${r.scheduled_time_only}`}
                          >
                            <Layers size={13} aria-hidden="true" />
                            <span>{selectedRoundForMeters?.id === r.id ? 'Đang xem' : 'Sổ ca'}</span>
                          </button>
                          <button
                            type="button"
                            className="admin-sched-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteRound(r);
                            }}
                            title={`Xóa lượt ghi lúc ${r.scheduled_time_only}`}
                            aria-label={`Xóa lượt ghi lúc ${r.scheduled_time_only}`}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            style={{
              padding: '10px 18px',
              borderTop: '1px solid var(--sgp-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              background: 'var(--sgp-canvas)',
            }}
          >
            <button
              type="button"
              className="admin-btn-ghost text-muted"
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px' }}
              onClick={handleOpenDeleteDay}
              title={`Gỡ các lượt rỗng và hủy các lượt có lịch sử ngày ${formatDisplayDateVN(selectedDate)}`}
              aria-label={`Gỡ lượt rỗng và hủy lượt có lịch sử ngày ${formatDisplayDateVN(selectedDate)}`}
            >
              <Trash2 size={13} aria-hidden="true" />
              <span>Gỡ lượt rỗng / Hủy lịch ngày này</span>
            </button>
          </div>
        </div>
      )}

      {/* 3.1. ROUND METER LOGBOOK (IN-PLACE INSPECTION) */}
      {selectedRoundForMeters && (
        <div className="admin-surface-card table-card" style={{ marginTop: '18px' }} id="round-meter-logbook">
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div className="admin-card-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Clock size={16} className="text-brand" aria-hidden="true" />
              <h2 className="admin-card-title" style={{ fontSize: '15px' }}>
                Sổ ca ghi: Khung giờ {selectedRoundForMeters.scheduled_time_only} &mdash; Ngày {formatDisplayDateVN(selectedDate)}
              </h2>
              {roundMetersData && (
                <span className="admin-daily-summary-tag font-tabular">
                  {roundMetersData.progress.total} công tơ trong lượt · {roundMetersData.progress.confirmed} đã ghi · {roundMetersData.progress.review} cần kiểm tra · {roundMetersData.progress.pending} chưa ghi
                </span>
              )}
              {roundMetersData?.round.scope_mode === 'LEGACY_DYNAMIC' && (
                <span className="admin-badge badge-past">Phạm vi lịch cũ</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="admin-btn-refresh"
                onClick={() => loadRoundMeters(selectedRoundForMeters.id)}
                disabled={roundMetersLoading}
                title="Làm mới sổ ca"
                aria-label="Làm mới sổ ca"
              >
                <RefreshCw size={14} className={roundMetersLoading ? 'animate-spin' : ''} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="admin-btn-secondary btn-sm"
                onClick={() => {
                  setSelectedRoundForMeters(null);
                  setRoundMetersData(null);
                  setSelectedRoundId(null);
                }}
                title="Đóng sổ ca"
                aria-label="Đóng sổ ca"
              >
                <X size={13} aria-hidden="true" />
                <span>Đóng sổ ca</span>
              </button>
            </div>
          </div>

          {mapLocateWarning && (
            <div
              style={{
                margin: '10px 18px 0',
                padding: '8px 12px',
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 'var(--radius-sm)',
                color: '#92400e',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              role="alert"
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>{mapLocateWarning}</span>
            </div>
          )}

          {/* Filters Toolbar */}
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--sgp-border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: 'var(--sgp-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--sgp-canvas)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--sgp-border)', flex: '1', minWidth: '180px', maxWidth: '320px' }}>
              <Search size={14} className="text-muted" aria-hidden="true" />
              <input
                type="text"
                placeholder="Tìm theo mã hoặc tên..."
                value={meterSearch}
                onChange={(e) => setMeterSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '12px', color: 'var(--sgp-ink)' }}
              />
              {meterSearch && (
                <button
                  type="button"
                  onClick={() => setMeterSearch('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--sgp-ink-muted)' }}
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <select
              className="admin-select admin-select-sm"
              value={meterStatusFilter}
              onChange={(e) => setMeterStatusFilter(e.target.value as any)}
              aria-label="Lọc theo trạng thái đọc"
              style={{ width: 'auto' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="REVIEW">Cần kiểm tra</option>
              <option value="PENDING">Chờ ghi</option>
            </select>

            <select
              className="admin-select admin-select-sm"
              value={meterUtilityFilter}
              onChange={(e) => setMeterUtilityFilter(e.target.value as any)}
              aria-label="Lọc theo loại tiện ích"
              style={{ width: 'auto' }}
            >
              <option value="ALL">Tất cả tiện ích</option>
              <option value="ELECTRICITY">⚡ Điện</option>
              <option value="WATER">💧 Nước</option>
            </select>

            <span className="font-tabular text-xs text-muted" style={{ marginLeft: 'auto' }}>
              Hiển thị {filteredMeters.length} / {roundMetersData?.meters?.length || 0} công tơ
            </span>
          </div>

          {/* Meters Table */}
          {roundMetersLoading ? (
            <div style={{ padding: '32px' }}>
              <LoadingState message="Đang tải danh sách công tơ theo ca..." />
            </div>
          ) : roundMetersError ? (
            <div style={{ padding: '24px' }}>
              <ErrorState
                title="Không thể tải sổ ca"
                message={roundMetersError}
                onRetry={() => loadRoundMeters(selectedRoundForMeters.id)}
              />
            </div>
          ) : filteredMeters.length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--sgp-ink-muted)', fontSize: '13px' }}>
              Không có công tơ nào khớp với bộ lọc tìm kiếm.
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table" aria-label="Danh sách công tơ trong ca">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '60px' }}>STT</th>
                    <th scope="col">Mã &amp; Tên công tơ</th>
                    <th scope="col" style={{ width: '100px' }}>Tiện ích</th>
                    <th scope="col">Vị trí</th>
                    <th scope="col" style={{ width: '140px' }}>Chỉ số ghi</th>
                    <th scope="col" style={{ width: '130px' }}>Trạng thái</th>
                    <th scope="col" style={{ width: '190px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeters.map((item, idx) => {
                    const meterCode = item.meter.meter_code || (item.meter as any).code;
                    const utilityType = item.scope_utility_type_snapshot || item.meter.utility_type;
                    const isWater = utilityType === 'WATER' || (!utilityType && (meterCode.startsWith('W-') || meterCode.startsWith('SIM-W')));

                    return (
                      <tr key={item.meter.id || idx}>
                        <td className="font-tabular text-muted">{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="font-mono font-bold" style={{ color: 'var(--sgp-ink)' }}>
                              {meterCode}
                            </span>
                            <span className="text-xs text-muted" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.meter.name}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-badge ${isWater ? 'badge-info' : 'badge-warning'} font-tabular`}>
                            {isWater ? '💧 Nước' : '⚡ Điện'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="text-sm font-medium" style={{ color: 'var(--sgp-ink)' }}>
                              {item.meter.location || item.meter.presentation_zone_name || item.meter.zone_name || 'Chưa định vị'}
                            </span>
                            {item.meter.map_x !== null && item.meter.map_x !== undefined && item.meter.map_y !== null && item.meter.map_y !== undefined ? (
                              <span className="text-xs font-tabular" style={{ color: 'var(--sgp-brand-600)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <MapPin size={10} aria-hidden="true" />
                                {item.meter.presentation_zone_name || 'Đã định vị trên bản đồ'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted font-tabular">
                                Chưa có tọa độ bản đồ
                              </span>
                            )}
                            <span className="text-xs text-muted">
                              Khu vực theo lịch: {item.scope_zone_id_snapshot ? (item.meter.zone_name || item.scope_zone_id_snapshot) : 'Chưa gán khu vực'}
                            </span>
                            {item.meter_availability !== 'MISSING' && item.current_zone_id !== item.scope_zone_id_snapshot && (
                              <span className="text-xs text-muted">
                                Khu vực hiện tại: {item.current_zone_name || item.current_zone_id || 'Chưa gán khu vực'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {item.reading ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="font-tabular font-bold" style={{ color: 'var(--sgp-ink)' }}>
                                {item.reading} {isWater ? 'm³' : utilityType === 'ELECTRICITY' ? 'kWh' : ''}
                              </span>
                              {item.formatted_recorded_at && (
                                <span className="text-xs text-muted font-tabular">
                                  {item.formatted_recorded_at}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted text-sm">—</span>
                          )}
                        </td>
                        <td>
                          {item.meter_availability === 'MISSING' ? (
                            <span className="admin-badge badge-review font-tabular">Không còn trong danh mục</span>
                          ) : item.meter_availability === 'RETIRED' ? (
                            <span className="admin-badge badge-inactive font-tabular">Công tơ đã ngừng sử dụng</span>
                          ) : item.meter_availability === 'INACTIVE' ? (
                            <span className="admin-badge badge-inactive font-tabular">Công tơ đang tạm ngừng</span>
                          ) : item.reading_status === 'CONFIRMED' ? (
                            <span className="admin-badge badge-active font-tabular">
                              Đã xác nhận
                            </span>
                          ) : item.reading_status === 'REVIEW' ? (
                            <span className="admin-badge badge-review font-tabular">
                              Cần kiểm tra
                            </span>
                          ) : (
                            <span className="admin-badge badge-inactive font-tabular">
                              Chờ ghi
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              className="admin-btn-secondary btn-sm"
                              disabled={item.meter_availability === 'MISSING'}
                              onClick={() => {
                                if (item.meter.map_x !== null && item.meter.map_x !== undefined && item.meter.map_y !== null && item.meter.map_y !== undefined) {
                                  locateOnMap({
                                    type: 'meter',
                                    id: item.meter.id,
                                    code: meterCode,
                                    name: item.meter.name,
                                  });
                                } else {
                                  setMapLocateWarning(`Công tơ ${meterCode} chưa có tọa độ không gian trên bản đồ.`);
                                  setTimeout(() => setMapLocateWarning(null), 5000);
                                }
                              }}
                              title={item.meter.map_x !== null && item.meter.map_x !== undefined ? `Xem công tơ ${meterCode} trên Bản đồ` : `Công tơ chưa có tọa độ trên bản đồ`}
                              aria-label={`Xem công tơ ${meterCode} trên Bản đồ`}
                            >
                              <MapPin size={12} aria-hidden="true" />
                              <span>Bản đồ</span>
                            </button>

                            {item.reading_status === 'REVIEW' && item.reading_id && (
                              <button
                                type="button"
                                className="admin-btn-secondary btn-sm"
                                onClick={() => {
                                  if (onInspectReading) {
                                    onInspectReading(item.reading_id!);
                                  } else {
                                    openReadingInspection(item.reading_id!);
                                  }
                                }}
                                title="Đối soát ngoại lệ chỉ số này"
                                aria-label="Đối soát ngoại lệ"
                                style={{
                                  color: '#b45309',
                                  borderColor: '#fcd34d',
                                  backgroundColor: '#fffbeb',
                                }}
                              >
                                <AlertTriangle size={12} aria-hidden="true" />
                                <span>Kiểm tra</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. CREATE SCHEDULE MODAL WITH CONFLICT DETECTION */}
      {isModalOpen && (
        <div
          ref={createDialogRef}
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-sched-title"
          onKeyDown={handleCreateDialogKeyDown}
        >
          <div className="admin-modal-box modal-wide">
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <Clock size={20} className="text-brand" aria-hidden="true" />
                <h2 id="create-sched-title" className="admin-modal-title">
                  Tạo lịch ghi chỉ số định kỳ
                </h2>
              </div>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={handleCloseModal}
                disabled={creating}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="admin-modal-body">
              <form onSubmit={handleCheckPreview} className="admin-schedule-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="sched_date_input" className="admin-form-label">
                      Ngày tác nghiệp <span className="required-star">*</span>
                    </label>
                    <VnDatePicker
                      id="sched_date_input"
                      value={formDate}
                      onChange={(d) => {
                        setFormDate(d);
                        setPreviewData(null);
                      }}
                      min={todayStr}
                      disabled={previewing || creating}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="sched_interval_input" className="admin-form-label">
                      Chu kỳ đọc
                    </label>
                    <select
                      id="sched_interval_input"
                      className="admin-form-select"
                      value={intervalPreset}
                      onChange={(e) => {
                        setIntervalPreset(Number(e.target.value));
                        setPreviewData(null);
                      }}
                      disabled={previewing || creating}
                    >
                      <option value={15}>Mỗi 15 phút</option>
                      <option value={30}>Mỗi 30 phút</option>
                      <option value={45}>Mỗi 45 phút</option>
                      <option value={60}>Mỗi 60 phút (Hàng giờ - Mặc định)</option>
                      <option value={90}>Mỗi 90 phút (1.5 giờ)</option>
                      <option value={120}>Mỗi 120 phút (2 giờ)</option>
                      <option value={180}>Mỗi 180 phút (3 giờ)</option>
                      <option value={240}>Mỗi 240 phút (4 giờ)</option>
                      <option value={360}>Mỗi 360 phút (6 giờ)</option>
                      <option value={480}>Mỗi 480 phút (8 giờ)</option>
                      <option value={720}>Mỗi 720 phút (12 giờ)</option>
                      <option value={-1}>Tùy chỉnh số phút...</option>
                    </select>
                    {intervalPreset === -1 && (
                      <div style={{ marginTop: '6px' }}>
                        <input
                          id="sched_custom_interval_input"
                          type="number"
                          min={5}
                          max={1440}
                          className="admin-form-input font-tabular"
                          value={customInterval}
                          onChange={(e) => {
                            setCustomInterval(e.target.value);
                            setPreviewData(null);
                          }}
                          disabled={previewing || creating}
                          placeholder="Nhập số phút (5 - 1440)..."
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="sched_start_input" className="admin-form-label">
                      Giờ bắt đầu (HH:MM) <span className="required-star">*</span>
                    </label>
                    <input
                      id="sched_start_input"
                      type="time"
                      className="admin-form-input font-tabular"
                      value={formStart}
                      onChange={(e) => {
                        setFormStart(e.target.value);
                        setPreviewData(null);
                      }}
                      disabled={previewing || creating}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="sched_end_input" className="admin-form-label">
                      Giờ kết thúc (HH:MM) <span className="required-star">*</span>
                    </label>
                    <input
                      id="sched_end_input"
                      type="time"
                      className="admin-form-input font-tabular"
                      value={formEnd}
                      onChange={(e) => {
                        setFormEnd(e.target.value);
                        setPreviewData(null);
                      }}
                      disabled={previewing || creating}
                      required
                    />
                  </div>
                </div>

                <fieldset
                  className="admin-schedule-scope-fieldset"
                  aria-describedby="sched_scope_help"
                  disabled={previewing || creating || scopeMetersLoading}
                >
                  <legend className="admin-form-label">Phạm vi công tơ</legend>
                  <p id="sched_scope_help" className="text-sm text-muted">
                    Chọn chính xác công tơ sẽ có trong từng lượt đọc.
                  </p>
                  <div className="admin-schedule-scope-options">
                    <label className="admin-schedule-scope-option">
                      <input
                        type="radio"
                        name="schedule_scope_mode"
                        value="ALL_ELIGIBLE"
                        checked={scopeMode === 'ALL_ELIGIBLE'}
                        onChange={() => { setScopeMode('ALL_ELIGIBLE'); setPreviewData(null); }}
                      />
                      <span>Tất cả công tơ đủ điều kiện</span>
                    </label>
                    <label className="admin-schedule-scope-option">
                      <input
                        type="radio"
                        name="schedule_scope_mode"
                        value="BY_ZONE"
                        checked={scopeMode === 'BY_ZONE'}
                        onChange={() => { setScopeMode('BY_ZONE'); setPreviewData(null); }}
                      />
                      <span>Theo khu vực</span>
                    </label>
                    <label className="admin-schedule-scope-option">
                      <input
                        type="radio"
                        name="schedule_scope_mode"
                        value="BY_UTILITY"
                        checked={scopeMode === 'BY_UTILITY'}
                        onChange={() => { setScopeMode('BY_UTILITY'); setPreviewData(null); }}
                      />
                      <span>Theo tiện ích</span>
                    </label>
                    <label className="admin-schedule-scope-option">
                      <input
                        type="radio"
                        name="schedule_scope_mode"
                        value="SELECTED_METERS"
                        checked={scopeMode === 'SELECTED_METERS'}
                        onChange={() => { setScopeMode('SELECTED_METERS'); setPreviewData(null); }}
                      />
                      <span>Chọn công tơ</span>
                    </label>
                  </div>

                  {scopeMetersLoading && <p role="status">Đang tải danh sách công tơ...</p>}
                  {scopeMetersError && <p className="admin-form-error-text" role="alert">{scopeMetersError}</p>}

                  {scopeMode === 'BY_ZONE' && (
                    <fieldset className="admin-schedule-scope-choice-group" aria-label="Chọn khu vực">
                      <legend>Khu vực</legend>
                      {scopeZoneOptions.length === 0 ? (
                        <p>Chưa có khu vực với công tơ đủ điều kiện.</p>
                      ) : scopeZoneOptions.map((zone) => (
                        <label key={zone.id} className="admin-schedule-scope-option">
                          <input
                            type="checkbox"
                            checked={selectedZoneIds.includes(zone.id)}
                            onChange={(event) => {
                              setSelectedZoneIds((current) => event.target.checked
                                ? [...current, zone.id]
                                : current.filter((id) => id !== zone.id));
                              setPreviewData(null);
                            }}
                          />
                          <span>{zone.name}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}

                  {scopeMode === 'BY_UTILITY' && (
                    <fieldset className="admin-schedule-scope-choice-group" aria-label="Chọn tiện ích">
                      <legend>Tiện ích</legend>
                      {(['ELECTRICITY', 'WATER', 'OTHER', 'UNKNOWN'] as const).map((utility) => (
                        <label key={utility} className="admin-schedule-scope-option">
                          <input
                            type="checkbox"
                            checked={selectedUtilities.includes(utility)}
                            onChange={(event) => {
                              setSelectedUtilities((current) => event.target.checked
                                ? [...current, utility]
                                : current.filter((value) => value !== utility));
                              setPreviewData(null);
                            }}
                          />
                          <span>{utility === 'ELECTRICITY' ? 'Điện' : utility === 'WATER' ? 'Nước' : utility === 'OTHER' ? 'Khác' : 'Chưa xác định'}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}

                  {scopeMode === 'SELECTED_METERS' && (
                    <div className="admin-form-group">
                      <label htmlFor="sched_selected_meters" className="admin-form-label">Công tơ đủ điều kiện</label>
                      <select
                        id="sched_selected_meters"
                        className="admin-form-select"
                        multiple
                        size={7}
                        value={selectedMeterIds}
                        aria-describedby="sched_selected_meters_help"
                        onChange={(event) => {
                          setSelectedMeterIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value));
                          setPreviewData(null);
                        }}
                      >
                        {eligibleScopeMeters.map((meter) => (
                          <option key={meter.id} value={meter.id}>
                            {meter.meter_code} — {meter.name} ({meter.utility_type === 'WATER' ? 'Nước' : meter.utility_type === 'ELECTRICITY' ? 'Điện' : 'Khác'})
                          </option>
                        ))}
                      </select>
                      <p id="sched_selected_meters_help" className="text-sm text-muted">
                        Dùng Ctrl hoặc Shift để chọn nhiều công tơ.
                      </p>
                    </div>
                  )}
                </fieldset>

                <div className="admin-form-actions-inline">
                  <button
                    type="submit"
                    className="admin-btn-secondary"
                    disabled={previewing || creating || !scopeReady || Boolean(scopeMetersError)}
                  >
                    <RefreshCw size={15} className={previewing ? 'animate-spin' : ''} aria-hidden="true" />
                    <span>{previewing ? 'Đang kiểm tra...' : 'Kiểm tra trước lịch tạo'}</span>
                  </button>
                </div>
              </form>

              {/* PREVIEW RESULTS */}
              {previewError && (
                <div className="admin-form-error-box" role="alert" style={{ marginTop: '14px' }}>
                  <AlertTriangle size={15} aria-hidden="true" />
                  <span>{previewError}</span>
                </div>
              )}

              {previewData && (
                <div className="admin-schedule-preview-box">
                  <div className="preview-summary-header">
                    <span className="preview-sum-title">
                      Dự kiến tạo <strong>{previewData.total_proposed}</strong> lượt đọc ngày {formatDisplayDateVN(formDate)}
                    </span>
                    {previewData.conflict_count > 0 ? (
                      <span className="preview-conflict-badge text-danger">
                        <AlertCircle size={14} aria-hidden="true" /> Có {previewData.conflict_count} lượt bị trùng
                      </span>
                    ) : (
                      <span className="preview-conflict-badge text-success">
                        <CheckCircle2 size={14} aria-hidden="true" /> Không có trùng lặp
                      </span>
                    )}
                  </div>

                  <div className="admin-schedule-scope-summary" aria-live="polite">
                    <strong>{previewData.scope.meter_count} công tơ / lượt</strong>
                    <span>{previewData.scope.electricity_count} điện</span>
                    <span>{previewData.scope.water_count} nước</span>
                    {previewData.scope.other_count > 0 && <span>{previewData.scope.other_count} tiện ích khác</span>}
                    <strong>
                      {previewData.scope.meter_count * previewData.total_proposed} nhiệm vụ đọc dự kiến
                    </strong>
                  </div>
                  {previewData.scope.zones.length > 0 && (
                    <p className="text-sm text-muted">
                      Khu vực: {previewData.scope.zones.map((zone) => `${zone.zone_name} (${zone.meter_count})`).join(' · ')}
                    </p>
                  )}
                  {previewData.scope.invalid_selections.length > 0 && (
                    <div className="admin-conflict-alert" role="alert">
                      <AlertTriangle size={16} aria-hidden="true" />
                      <span>
                        Cần kiểm tra lựa chọn: {previewData.scope.invalid_selections.map((item) => item.label || item.id).join(', ')}.
                        Hãy điều chỉnh phạm vi rồi xem trước lại.
                      </span>
                    </div>
                  )}

                  {previewData.conflict_count > 0 && (
                    <div className="admin-conflict-alert">
                      <AlertTriangle size={16} aria-hidden="true" />
                      <span>
                        Một số lượt đọc đã tồn tại trong ngày này. Vui lòng điều chỉnh lại khung giờ bắt đầu/kết thúc để tránh trùng lặp.
                      </span>
                    </div>
                  )}

                  <div className="preview-rounds-grid">
                    {previewData.rounds.map((pr, idx) => (
                      <div
                        key={idx}
                        className={`preview-round-chip ${pr.is_conflict ? 'chip-conflict' : ''}`}
                      >
                        <span className="chip-time font-tabular">{pr.scheduled_time_only}</span>
                        <span className="chip-meter-count">{pr.meter_count} công tơ</span>
                        {pr.is_conflict && <span className="chip-conflict-tag">Đã có</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-primary"
                onClick={handleConfirmCreate}
                disabled={
                  !previewData ||
                  previewData.conflict_count > 0 ||
                  previewData.scope.meter_count === 0 ||
                  previewData.scope.invalid_selections.length > 0 ||
                  creating
                }
              >
                <Check size={16} aria-hidden="true" />
                <span>
                  {creating
                    ? 'Đang tạo...'
                    : previewData
                    ? `Tạo ${previewData.total_proposed} lượt đọc`
                    : 'Tạo lịch đọc'}
                </span>
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={handleCloseModal}
                disabled={creating}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-sched-title" onKeyDown={handleDeleteDialogKeyDown}>
          <div className="admin-modal-box modal-danger" ref={deleteDialogRef}>
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <AlertTriangle size={20} className="text-danger" aria-hidden="true" />
                <h2 id="delete-sched-title" className="admin-modal-title">
                  {deleteTarget.type === 'round'
                    ? 'Gỡ lượt ghi'
                    : 'Gỡ lịch ghi trong ngày'}
                </h2>
              </div>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="admin-modal-body">
              {deleteTarget.type === 'round' && deleteTarget.round && (
                <div>
                  <p className="admin-modal-confirm-text">
                    Bạn có chắc chắn muốn gỡ lượt ghi lúc{' '}
                    <strong>{deleteTarget.round.scheduled_time_only}</strong> ngày{' '}
                    <strong>{formatDisplayDateVN(selectedDate)}</strong>?
                  </p>

                  {(deleteTarget.round.progress.confirmed + deleteTarget.round.progress.review) > 0 && (
                    <div className="admin-danger-warning-box">
                      <AlertCircle size={18} className="text-danger" aria-hidden="true" />
                      <div>
                        <strong>Lịch sử được giữ nguyên:</strong>
                        <p>
                          Lượt này có <strong>{deleteTarget.round.progress.confirmed + deleteTarget.round.progress.review}</strong> kết quả.
                          Hệ thống sẽ hủy lượt và giữ lại dữ liệu chỉ số cùng phạm vi công tơ.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {deleteTarget.type === 'day' && (
                <div>
                  <p className="admin-modal-confirm-text">
                    Bạn có chắc chắn muốn gỡ các lượt rỗng và hủy các lượt có kết quả trong{' '}
                    <strong>{deleteTarget.count}</strong> lượt ghi trong ngày{' '}
                    <strong>{formatDisplayDateVN(selectedDate)}</strong>?
                  </p>

                  {(deleteTarget.confirmedCount || 0) > 0 && (
                    <div className="admin-danger-warning-box">
                      <AlertCircle size={18} className="text-danger" aria-hidden="true" />
                      <div>
                        <strong>Các kết quả sẽ được giữ nguyên:</strong>
                        <p>
                          Đã có <strong>{deleteTarget.confirmedCount}</strong> kết quả trong ngày này. Các lượt có kết quả sẽ được hủy.
                        </p>
                      </div>
                    </div>
                  )}

                  {(deleteTarget.confirmedCount || 0) > 0 && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '12px', fontSize: '13px', cursor: 'pointer', userSelect: 'none', color: 'var(--sgp-ink)' }}>
                      <input
                        type="checkbox"
                        checked={deleteConfirmChecked}
                        onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                        style={{ marginTop: '3px' }}
                      />
                      <span>
                        Tôi xác nhận muốn gỡ các lượt rỗng và hủy lượt có <strong>{deleteTarget.confirmedCount}</strong> kết quả.
                      </span>
                    </label>
                  )}
                </div>
              )}

              {deleteError && (
                <div className="admin-form-error-box" role="alert" style={{ marginTop: '14px' }}>
                  <AlertTriangle size={15} aria-hidden="true" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting || (deleteTarget.type === 'day' && (deleteTarget.confirmedCount || 0) > 0 && !deleteConfirmChecked)}
              >
                <Trash2 size={15} aria-hidden="true" />
                <span>{deleting ? 'Đang cập nhật...' : 'Gỡ lượt rỗng / hủy lượt có kết quả'}</span>
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={handleCloseDeleteModal}
                disabled={deleting}
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
