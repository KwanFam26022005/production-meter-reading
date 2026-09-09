import { AdminRosterDayHeader, LeaveRequestItem } from '../../../types';
import { CoverageHealthState } from './rosterConfig';

export type RosterViewMode = 'WEEK' | 'TWO_WEEK' | 'MONTH' | 'COVERAGE';

export type ConflictSeverity = 'warning' | 'error';

export type ConflictType =
  | 'APPROVED_LEAVE_CONFLICT'
  | 'INSUFFICIENT_REST'
  | 'UNDERSTAFFED_SHIFT'
  | 'INVALID_STATE';

export interface RosterConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  userId?: string;
  userName?: string;
  date: string;
  shiftCode?: string;
  cellKey?: string;
  title: string;
  description: string;
}

export interface ShiftCoverageStat {
  assigned: number;
  required: number;
  healthState: CoverageHealthState;
}

export interface DayCoverageSummary {
  date: string;
  dayHeader: AdminRosterDayHeader;
  shifts: {
    CA1: ShiftCoverageStat;
    CA2: ShiftCoverageStat;
    CA3: ShiftCoverageStat;
    HC: ShiftCoverageStat;
  };
  totalWorking: number;
  hasUnderstaffed: boolean;
}

export interface RosterValidationResult {
  coveragePercent: number;
  totalConflicts: number;
  conflictsByCell: Record<string, RosterConflict[]>; // key: userId_date
  conflictsByDate: Record<string, RosterConflict[]>; // key: date
  allConflicts: RosterConflict[];
  dayCoverage: Record<string, DayCoverageSummary>; // key: date
  pendingLeavesCount: number;
  approvedLeavesLookup: Record<string, LeaveRequestItem>; // key: userId_date
  pendingLeavesLookup: Record<string, LeaveRequestItem>; // key: userId_date
}

export interface RosterFilterState {
  searchQuery: string;
  shiftFocus: string; // 'ALL' | 'CA1' | 'CA2' | 'CA3' | 'HC' | 'OFF' | 'LEAVE' (Highlights without hiding)
  roleFilter: string; // 'ALL' | specific role
  onlyConflicts: boolean;
}

export interface ActiveCellPopoverState {
  userId: string;
  userName: string;
  employeeCode: string;
  date: string;
  weekdayLabel: string;
  currentShift: string;
  boundingRect: DOMRect;
  approvedLeave?: LeaveRequestItem;
  pendingLeave?: LeaveRequestItem;
  conflicts: RosterConflict[];
}
