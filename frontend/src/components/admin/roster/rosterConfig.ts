// Centralized operational configuration for Saigon Port Admin Roster
// IMPORTANT: These thresholds represent V1 operational situational awareness rules,
// NOT official Saigon Port statutory/legal compliance quotas.

export const REQUIRED_SHIFT_COVERAGE: Record<string, number> = {
  CA1: 1, // Minimum 1 staff for Ca 1 (06:00 - 14:00)
  CA2: 1, // Minimum 1 staff for Ca 2 (14:00 - 22:00)
  CA3: 1, // Minimum 1 staff for Ca 3 (22:00 - 06:00)
  HC: 0,  // Administrative shift, no strict 24/7 coverage requirement
};

// Work hours credit per shift code for workload monitoring
export const SHIFT_WORK_HOURS: Record<string, number> = {
  CA1: 8,
  CA2: 8,
  CA3: 8,
  HC: 9, // 07:30 to 16:30 with meal breaks
  OFF: 0,
  LEAVE: 0,
};

// Operational workload caution threshold (hours per 7-day week)
// Label: "Cảnh báo tải lịch", NOT a legal violation claim
export const WEEKLY_WORKLOAD_WARNING_HOURS = 48;

// Conflict severity mapping
export type CoverageHealthState = 'HEALTHY' | 'AT_MINIMUM' | 'UNDERSTAFFED';

export function getCoverageHealthState(assigned: number, required: number): CoverageHealthState {
  if (required <= 0) return 'HEALTHY';
  if (assigned > required) return 'HEALTHY';
  if (assigned === required) return 'AT_MINIMUM';
  return 'UNDERSTAFFED';
}
