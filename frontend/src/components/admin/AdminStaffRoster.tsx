import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AdminRosterResponse,
  AdminShiftAssignItem,
  LeaveRequestItem,
  User,
} from '../../types';
import {
  getAdminRoster,
  assignAdminShifts,
  autoPatternAdminRoster,
  getAdminLeaveRequests,
  reviewAdminLeaveRequest,
  getAdminRosterExportUrl,
} from '../../services/api';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';

import {
  ActiveCellPopoverState,
  RosterConflict,
  RosterFilterState,
  RosterViewMode,
} from './roster/types';
import {
  formatDateRangeLabel,
  formatVietnameseMonth,
  sliceDaysForViewMode,
  stepRosterView,
} from './roster/rosterUtils';
import { validateRosterState } from './roster/rosterValidation';
import { RosterToolbar } from './roster/RosterToolbar';
import { RosterStatusStrip } from './roster/RosterStatusStrip';
import { RosterFilters } from './roster/RosterFilters';
import { RosterMatrix } from './roster/RosterMatrix';
import { RosterMobileView } from './roster/RosterMobileView';
import { RosterCellPopover } from './roster/RosterCellPopover';
import { RosterConflictPanel } from './roster/RosterConflictPanel';
import { RosterDraftBar } from './roster/RosterDraftBar';
import { AutoPatternDialog } from './roster/AutoPatternDialog';
import { LeaveRequestsPanel } from './roster/LeaveRequestsPanel';
import { OperationalAssignmentBoard } from './OperationalAssignmentBoard';

interface AdminStaffRosterProps {
  user: User;
}

export const AdminStaffRoster: React.FC<AdminStaffRosterProps> = ({ user: _currentUser }) => {
  const getTodayMonthStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [currentMonth, setCurrentMonth] = useState<string>(getTodayMonthStr());
  const [viewMode, setViewMode] = useState<RosterViewMode>('WEEK');
  const [focusDayIndex, setFocusDayIndex] = useState<number>(0);

  const [rosterData, setRosterData] = useState<AdminRosterResponse | null>(null);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(true);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'ROSTER' | 'ZONES' | 'LEAVES'>('ROSTER');

  // Pending cell modifications in client RAM before saving
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [savingChanges, setSavingChanges] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [leaveFilter, setLeaveFilter] = useState<string>('ALL');
  const [loadingLeaves, setLoadingLeaves] = useState<boolean>(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Search & Filter state (P2.4: shiftFocus highlights without hiding rows)
  const [filterState, setFilterState] = useState<RosterFilterState>({
    searchQuery: '',
    shiftFocus: 'ALL',
    roleFilter: 'ALL',
    onlyConflicts: false,
  });

  // Actionable Conflict Panel state (P2.5 & P2.6)
  const [conflictPanelOpen, setConflictPanelOpen] = useState<boolean>(false);
  const [targetConflictCellKey, setTargetConflictCellKey] = useState<string | null>(null);

  // Cell shift editor popover state
  const [activeCellPopover, setActiveCellPopover] = useState<ActiveCellPopoverState | null>(null);

  // Auto-pattern modal state
  const [autoPatternModalOpen, setAutoPatternModalOpen] = useState<boolean>(false);
  const [applyingPattern, setApplyingPattern] = useState<boolean>(false);

  // Responsive state for mobile card fallback
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchRoster = async (monthStr: string) => {
    setLoadingRoster(true);
    setRosterError(null);
    try {
      const data = await getAdminRoster(monthStr);
      setRosterData(data);

      // Default focus on today if in the current month
      const todayIndex = data.days_header.findIndex((d) => d.is_today);
      if (todayIndex >= 0) {
        setFocusDayIndex(todayIndex);
      } else {
        setFocusDayIndex(0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải ma trận phân ca.';
      setRosterError(msg);
    } finally {
      setLoadingRoster(false);
    }
  };

  const fetchLeaves = async (filter: string) => {
    setLoadingLeaves(true);
    try {
      const data = await getAdminLeaveRequests(filter);
      setLeaveRequests(data);
    } catch {
      // ignore
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchRoster(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    fetchLeaves(leaveFilter);
  }, [leaveFilter]);

  // Pure validation & coverage computations (real-time reactive over pendingChanges)
  const validationResult = useMemo(() => {
    return validateRosterState(rosterData, pendingChanges, leaveRequests);
  }, [rosterData, pendingChanges, leaveRequests]);

  // Sliced days for the active view mode (WEEK, TWO_WEEK, MONTH, COVERAGE)
  const { visibleDays } = useMemo(() => {
    if (!rosterData) return { visibleDays: [], startIndex: 0, endIndex: 0 };
    return sliceDaysForViewMode(rosterData.days_header, viewMode, focusDayIndex);
  }, [rosterData, viewMode, focusDayIndex]);

  // Available unique roles for filter dropdown
  const availableRoles = useMemo(() => {
    if (!rosterData) return [];
    const roleSet = new Set<string>();
    for (const u of rosterData.users) {
      if (u.role) roleSet.add(u.role);
    }
    return Array.from(roleSet);
  }, [rosterData]);

  // Filtered users according to search query, role, and conflict toggle
  // IMPORTANT (P2.4): shiftFocus does NOT hide rows; it visually emphasizes matching cells
  const filteredUsers = useMemo(() => {
    if (!rosterData) return [];
    return rosterData.users.filter((u) => {
      // Search query (name or code)
      if (filterState.searchQuery.trim()) {
        const q = filterState.searchQuery.toLowerCase();
        const matchName = u.full_name.toLowerCase().includes(q);
        const matchCode = u.employee_code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }

      // Role filter
      if (filterState.roleFilter !== 'ALL' && u.role !== filterState.roleFilter) {
        return false;
      }

      // Only conflicts filter
      if (filterState.onlyConflicts) {
        const hasConflict = visibleDays.some((d) => {
          const cellKey = `${u.user_id}_${d.date}`;
          return (validationResult.conflictsByCell[cellKey]?.length || 0) > 0;
        });
        if (!hasConflict) return false;
      }

      return true;
    });
  }, [rosterData, filterState, visibleDays, validationResult]);

  // Navigation handlers
  const handlePrev = () => {
    if (!rosterData) return;
    const { nextMonth, nextFocusIndex } = stepRosterView(
      currentMonth,
      viewMode,
      focusDayIndex,
      'prev',
      rosterData.days_header.length
    );
    if (nextMonth !== currentMonth) {
      setCurrentMonth(nextMonth);
    }
    setFocusDayIndex(nextFocusIndex);
  };

  const handleNext = () => {
    if (!rosterData) return;
    const { nextMonth, nextFocusIndex } = stepRosterView(
      currentMonth,
      viewMode,
      focusDayIndex,
      'next',
      rosterData.days_header.length
    );
    if (nextMonth !== currentMonth) {
      setCurrentMonth(nextMonth);
    }
    setFocusDayIndex(nextFocusIndex);
  };

  // Popover shift selection
  const handleSelectShiftForCell = (shiftCode: string) => {
    if (!activeCellPopover) return;
    const key = `${activeCellPopover.userId}_${activeCellPopover.date}`;
    setPendingChanges((prev) => ({
      ...prev,
      [key]: shiftCode,
    }));
    setActiveCellPopover(null);
  };

  // Batch save pending changes to server
  const handleSaveRoster = async () => {
    const changeKeys = Object.keys(pendingChanges);
    if (changeKeys.length === 0) return;

    setSavingChanges(true);
    setSaveSuccessMsg(null);

    const assignments: AdminShiftAssignItem[] = changeKeys.map((k) => {
      const [userId, workDate] = k.split('_');
      return {
        user_id: userId,
        work_date: workDate,
        shift_code: pendingChanges[k],
      };
    });

    try {
      const res = await assignAdminShifts(assignments);
      setSaveSuccessMsg(res.message);
      setPendingChanges({});
      await fetchRoster(currentMonth);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi lưu bảng phân ca.');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleUndoAll = () => {
    if (window.confirm('Bạn có chắc muốn hoàn tác tất cả các thay đổi nháp chưa lưu?')) {
      setPendingChanges({});
    }
  };

  const handleResetFilters = () => {
    setFilterState({
      searchQuery: '',
      shiftFocus: 'ALL',
      roleFilter: 'ALL',
      onlyConflicts: false,
    });
  };

  // P2.6: Go to conflict navigation
  const handleGoToConflict = (conflict: RosterConflict) => {
    setConflictPanelOpen(false);

    if (!rosterData) return;

    // Check if conflict date is outside visible days
    const isVisible = visibleDays.some((d) => d.date === conflict.date);
    if (!isVisible) {
      const dayIndex = rosterData.days_header.findIndex((d) => d.date === conflict.date);
      if (dayIndex >= 0) {
        setFocusDayIndex(dayIndex);
      }
    }

    const cellKey = conflict.cellKey || `${conflict.userId}_${conflict.date}`;
    setTargetConflictCellKey(cellKey);

    // Scroll into view & pulse highlight
    setTimeout(() => {
      const cellSelector = `[data-cell-date="${conflict.date}"][data-user-name="${conflict.userName}"]`;
      const el = document.querySelector(cellSelector) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        el.focus();
      }
    }, 120);

    setTimeout(() => {
      setTargetConflictCellKey(null);
    }, 1200);
  };

  const handleApplyAutoPattern = async (patternType: string) => {
    setApplyingPattern(true);
    try {
      const res = await autoPatternAdminRoster(currentMonth, [], patternType);
      alert(res.message);
      setAutoPatternModalOpen(false);
      setPendingChanges({});
      await fetchRoster(currentMonth);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể áp dụng chu kỳ ca.');
    } finally {
      setApplyingPattern(false);
    }
  };

  const handleReviewLeave = async (requestId: string, action: 'APPROVED' | 'REJECTED', note?: string) => {
    setReviewingId(requestId);
    try {
      await reviewAdminLeaveRequest(requestId, action, note);
      await fetchLeaves(leaveFilter);
      await fetchRoster(currentMonth);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi xử lý đơn.');
    } finally {
      setReviewingId(null);
    }
  };

  const pendingChangesCount = Object.keys(pendingChanges).length;
  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'PENDING').length;

  // Compute active date range title for header and stepper
  const activeDateLabel = useMemo(() => {
    if (viewMode === 'MONTH') {
      return formatVietnameseMonth(currentMonth);
    }
    if (visibleDays.length === 0) return '';
    const firstDate = visibleDays[0].date;
    const lastDate = visibleDays[visibleDays.length - 1].date;
    return formatDateRangeLabel(firstDate, lastDate);
  }, [viewMode, currentMonth, visibleDays]);

  return (
    <div className="admin-page-container">
      {/* 1. HEADER SECTION */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 className="admin-page-title">Lịch phân ca</h1>
          <p className="admin-page-subtitle">
            Quản lý kíp trực và độ phủ nhân sự 24/7 theo chu kỳ cảng biển Sài Gòn
          </p>
        </div>

        {/* TOOLBAR CONTROLS */}
        <RosterToolbar
          currentDateLabel={activeDateLabel}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onPrev={handlePrev}
          onNext={handleNext}
          onOpenAutoPattern={() => setAutoPatternModalOpen(true)}
          onRefresh={() => {
            fetchRoster(currentMonth);
            fetchLeaves(leaveFilter);
          }}
          exportUrl={getAdminRosterExportUrl(currentMonth)}
          loading={loadingRoster}
        />
      </div>

      {/* SUCCESS BANNER */}
      {saveSuccessMsg && (
        <div className="admin-alert-banner alert-success" role="status">
          <CheckCircle2 size={16} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SUB-TABS: ROSTER MATRIX vs LEAVE REQUESTS */}
      <div className="admin-subtabs-bar">
        <button
          type="button"
          onClick={() => setActiveSubTab('ROSTER')}
          className={`admin-subtab-btn ${activeSubTab === 'ROSTER' ? 'active' : ''}`}
        >
          <FileSpreadsheet size={16} />
          <span>Lịch ca ({viewMode === 'WEEK' ? 'Tuần' : viewMode === 'TWO_WEEK' ? '2 Tuần' : 'Tháng'})</span>
          {pendingChangesCount > 0 && (
            <span className="admin-subtab-count">
              {pendingChangesCount}
            </span>
          )}
        </button>

        <button type="button" onClick={() => setActiveSubTab('ZONES')} className={`admin-subtab-btn ${activeSubTab === 'ZONES' ? 'active' : ''}`} aria-current={activeSubTab === 'ZONES' ? 'page' : undefined}>
          <span>Phân khu tác nghiệp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('LEAVES')}
          className={`admin-subtab-btn ${activeSubTab === 'LEAVES' ? 'active' : ''}`}
        >
          <Clock size={16} />
          <span>Đơn xin nghỉ phép cần duyệt</span>
          {pendingLeavesCount > 0 && (
            <span className="admin-subtab-badge">
              {pendingLeavesCount}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'ZONES' && <OperationalAssignmentBoard />}

      {/* ========================================================================= */}
      {/* SUBTAB 1: ROSTER MATRIX & COVERAGE WORKSPACE                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'ROSTER' && (
        <div
          className="admin-surface-card"
          style={{
            padding: 0,
            overflow: 'hidden',
            background: '#ffffff',
            border: '1px solid var(--sgp-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {/* Status Strip: Operational Situational Awareness */}
          <RosterStatusStrip
            coveragePercent={validationResult.coveragePercent}
            totalConflicts={validationResult.totalConflicts}
            pendingLeavesCount={pendingLeavesCount}
            pendingChangesCount={pendingChangesCount}
            onOpenConflicts={() => setConflictPanelOpen(true)}
            onJumpToLeaves={() => setActiveSubTab('LEAVES')}
          />

          {/* Filters & Search Bar */}
          <RosterFilters
            filterState={filterState}
            onChange={setFilterState}
            availableRoles={availableRoles}
            totalUsersCount={rosterData?.users.length || 0}
            filteredUsersCount={filteredUsers.length}
            onResetFilters={handleResetFilters}
          />

          {/* Shift legend bar */}
          <div className="admin-roster-legend-bar">
            <div className="admin-roster-legend-items">
              <span style={{ color: 'var(--sgp-ink-muted)', fontWeight: 600 }}>Ký hiệu ca:</span>
              <span className="admin-legend-pill shift-tag-ca1">C1: 06:00 – 14:00</span>
              <span className="admin-legend-pill shift-tag-ca2">C2: 14:00 – 22:00</span>
              <span className="admin-legend-pill shift-tag-ca3">C3: 22:00 – 06:00</span>
              <span className="admin-legend-pill shift-tag-hc">HC: 07:30 – 16:30</span>
              <span className="admin-legend-pill shift-tag-off">OFF: Nghỉ tuần</span>
              <span className="admin-legend-pill shift-tag-leave">PHÉP: Nghỉ phép</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--sgp-ink-muted)' }}>
              Bấm vào ô để đổi ca trực nhanh · Dữ liệu kiểm tra cập nhật tức thì
            </div>
          </div>

          {loadingRoster ? (
            <LoadingState message="Đang tải dữ liệu phân ca..." />
          ) : rosterError ? (
            <ErrorState message={rosterError} onRetry={() => fetchRoster(currentMonth)} />
          ) : rosterData ? (
            isMobileViewport ? (
              <RosterMobileView
                users={filteredUsers}
                visibleDays={visibleDays}
                pendingChanges={pendingChanges}
                conflictsByCell={validationResult.conflictsByCell}
                approvedLeavesLookup={validationResult.approvedLeavesLookup}
                pendingLeavesLookup={validationResult.pendingLeavesLookup}
                activePopover={activeCellPopover}
                shiftFocus={filterState.shiftFocus}
                targetConflictCellKey={targetConflictCellKey}
                onlyConflicts={filterState.onlyConflicts}
                onCellClick={setActiveCellPopover}
                onResetFilters={handleResetFilters}
              />
            ) : (
              <RosterMatrix
                users={filteredUsers}
                visibleDays={visibleDays}
                viewMode={viewMode}
                pendingChanges={pendingChanges}
                dayCoverage={validationResult.dayCoverage}
                conflictsByCell={validationResult.conflictsByCell}
                approvedLeavesLookup={validationResult.approvedLeavesLookup}
                pendingLeavesLookup={validationResult.pendingLeavesLookup}
                activePopover={activeCellPopover}
                shiftFocus={filterState.shiftFocus}
                targetConflictCellKey={targetConflictCellKey}
                onlyConflicts={filterState.onlyConflicts}
                onCellClick={setActiveCellPopover}
                onResetFilters={handleResetFilters}
              />
            )
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: LEAVE REQUESTS APPROVAL TABLE                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'LEAVES' && (
        <LeaveRequestsPanel
          leaveRequests={leaveRequests}
          leaveFilter={leaveFilter}
          onFilterChange={setLeaveFilter}
          onReview={handleReviewLeave}
          loading={loadingLeaves}
          reviewingId={reviewingId}
        />
      )}

      {/* CONTEXTUAL CELL POPOVER */}
      {activeCellPopover && (
        <RosterCellPopover
          state={activeCellPopover}
          onSelectShift={handleSelectShiftForCell}
          onClose={() => setActiveCellPopover(null)}
        />
      )}

      {/* ACTIONABLE CONFLICT PANEL (P2.5 & P2.6) */}
      <RosterConflictPanel
        isOpen={conflictPanelOpen}
        onClose={() => setConflictPanelOpen(false)}
        conflicts={validationResult.allConflicts}
        onGoToConflict={handleGoToConflict}
      />

      {/* PERSISTENT DRAFT ACTION BAR */}
      <RosterDraftBar
        pendingCount={pendingChangesCount}
        conflictsCount={validationResult.totalConflicts}
        saving={savingChanges}
        onUndoAll={handleUndoAll}
        onInspectConflicts={() => setConflictPanelOpen(true)}
        onSave={handleSaveRoster}
      />

      {/* AUTO PATTERN MODAL WITH IMPACT PREVIEW */}
      <AutoPatternDialog
        currentMonth={currentMonth}
        isOpen={autoPatternModalOpen}
        onClose={() => setAutoPatternModalOpen(false)}
        onApply={handleApplyAutoPattern}
        applying={applyingPattern}
      />
    </div>
  );
};
