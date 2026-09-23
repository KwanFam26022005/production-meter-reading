import React, { useEffect, useState } from 'react';
import { NextShiftInfo, TodayAttendance, TodayOperationsResponse, User, formatUserRole } from '../types';
import { getTodayAttendance, getTodayOperations, getUserMonthlySchedule } from '../services/api';
import { BottomRadialNav } from './home/BottomRadialNav';
import { InsightFeed } from './home/InsightFeed';

export interface HomeHubProps {
  user: User;
  onOpenMeter: () => void;
  onOpenAttendance: () => void;
  onOpenSchedule: () => void;
  attendance?: TodayAttendance | null;
  loadingAttendance?: boolean;
  attendanceError?: string | null;
  onRefreshAttendance?: () => void;
}

export function getShortDisplayName(fullName?: string | null): string {
  const trimmed = (fullName || '').trim();
  if (!trimmed) {
    return 'Nhân viên';
  }
  // Extract display/first name naturally in Vietnamese context (last word of full name)
  const tokens = trimmed.split(/\s+/);
  return tokens.length > 0 ? tokens[tokens.length - 1] : 'Nhân viên';
}

export function formatEmployeeMeta(employeeCode?: string | null, role?: string | null): string {
  const code = (employeeCode || '').trim();
  const roleText = role ? formatUserRole(role as any).trim() : '';
  if (code && roleText) {
    return `${code} \u2022 ${roleText}`;
  }
  if (code) {
    return code;
  }
  if (roleText) {
    return roleText;
  }
  return '';
}

/**
 * @deprecated Time-based greeting is replaced by Minimal Operational Identity.
 * Retained for backwards compatibility if referenced by legacy modules.
 */
export function getTimeBasedGreeting(fullName: string): string {
  return getShortDisplayName(fullName);
}

export const HomeHub: React.FC<HomeHubProps> = ({
  user: _user,
  onOpenMeter,
  onOpenAttendance,
  onOpenSchedule,
  attendance: attendanceProp,
  loadingAttendance: loadingAttendanceProp,
  attendanceError: attendanceErrorProp,
  onRefreshAttendance,
}) => {
  // Support shared authoritative attendance from App Shell, with graceful local fallback
  const isControlledAttendance = attendanceProp !== undefined;
  const [localAttendance, setLocalAttendance] = useState<TodayAttendance | null>(null);
  const [localLoadingAttendance, setLocalLoadingAttendance] = useState<boolean>(true);
  const [localAttendanceError, setLocalAttendanceError] = useState<string | null>(null);

  const attendance = isControlledAttendance ? attendanceProp : localAttendance;
  const loadingAttendance = isControlledAttendance ? (loadingAttendanceProp ?? false) : localLoadingAttendance;
  const attendanceError = isControlledAttendance ? (attendanceErrorProp ?? null) : localAttendanceError;

  const [operations, setOperations] = useState<TodayOperationsResponse | null>(null);
  const [loadingOperations, setLoadingOperations] = useState<boolean>(true);
  const [operationsError, setOperationsError] = useState<string | null>(null);

  const [nextShift, setNextShift] = useState<NextShiftInfo | null>(null);

  const fetchOperationsData = () => {
    setLoadingOperations(true);
    setOperationsError(null);
    const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    getTodayOperations(todayDateStr)
      .then((data) => {
        setOperations(data);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Không thể tải trạng thái lượt đọc.';
        setOperationsError(msg);
      })
      .finally(() => {
        setLoadingOperations(false);
      });
  };

  const fetchLocalAttendanceData = () => {
    setLocalLoadingAttendance(true);
    setLocalAttendanceError(null);
    getTodayAttendance()
      .then((data) => {
        setLocalAttendance(data);
        setLocalAttendanceError(null);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Lỗi tải trạng thái chấm công.';
        setLocalAttendanceError(msg);
        setLocalAttendance(null);
      })
      .finally(() => {
        setLocalLoadingAttendance(false);
      });
  };

  useEffect(() => {
    let mounted = true;

    if (!isControlledAttendance) {
      setLocalLoadingAttendance(true);
      setLocalAttendanceError(null);
      getTodayAttendance()
        .then((data) => {
          if (mounted) {
            setLocalAttendance(data);
            setLocalAttendanceError(null);
          }
        })
        .catch((err: unknown) => {
          if (mounted) {
            const msg = err instanceof Error ? err.message : 'Lỗi tải trạng thái chấm công.';
            setLocalAttendanceError(msg);
            setLocalAttendance(null);
          }
        })
        .finally(() => {
          if (mounted) setLocalLoadingAttendance(false);
        });
    }

    fetchOperationsData();

    getUserMonthlySchedule()
      .then((data) => {
        if (mounted && data.next_shift) {
          setNextShift(data.next_shift);
        }
      })
      .catch(() => {
        // ignore background fetch error
      });

    return () => {
      mounted = false;
    };
  }, [isControlledAttendance]);

  const hasActiveRound = !!operations?.current_round;
  const roundProgress = operations?.current_round
    ? {
        total: operations.current_round.progress.total,
        confirmed: operations.current_round.progress.confirmed,
        roundName: operations.current_round.scheduled_time_only,
      }
    : null;

  return (
    <div className="workspace-container workspace-container--with-bottom-nav">
      {/* 1. Actionable Insight Feed (Real API Data) */}
      <InsightFeed
        operations={operations}
        attendance={attendance}
        nextShift={nextShift}
        loadingOperations={loadingOperations}
        loadingAttendance={loadingAttendance}
        operationsError={operationsError}
        attendanceError={attendanceError}
        onRetryOperations={() => {
          fetchOperationsData();
          onRefreshAttendance?.();
        }}
        onRetryAttendance={() => {
          if (onRefreshAttendance) {
            onRefreshAttendance();
          } else {
            fetchLocalAttendanceData();
          }
        }}
        onOpenMeter={onOpenMeter}
        onOpenAttendance={onOpenAttendance}
        onOpenSchedule={onOpenSchedule}
      />

      {/* 2. Fixed Bottom Radial Navigation with Port-Wide Progress Ring */}
      <BottomRadialNav
        onOpenMeter={onOpenMeter}
        onOpenAttendance={onOpenAttendance}
        onOpenSchedule={onOpenSchedule}
        roundProgress={roundProgress}
        hasActiveRound={hasActiveRound}
      />
    </div>
  );
};
