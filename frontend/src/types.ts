export type MeterType = "lcd" | "mechanical";

export interface MeterReadResponse {
  status: "success" | "review";
  reading: string | null;
  meter_type: MeterType | null;
  det_confidence: number | null;
  ocr_confidence: number | null;
  localization_imgsz: number | null;
  pipeline_version: string;
  roi_bbox?: [number, number, number, number] | null;
}

export interface User {
  id: string;
  employee_code: string;
  full_name: string;
  role: string;
}

export function formatUserRole(role?: string | null): string {
  if (!role || !role.trim()) return 'Nhân viên hiện trường';
  const normalized = role.trim().toUpperCase();
  const roleMap: Record<string, string> = {
    EMPLOYEE: 'Nhân viên hiện trường',
    FIELD_OPERATOR: 'Nhân viên hiện trường',
    OPERATOR: 'Nhân viên vận hành',
    SUPERVISOR: 'Giám sát viên',
    ADMIN: 'Quản trị viên',
    MANAGER: 'Quản lý',
    STAFF: 'Nhân viên hiện trường',
    LEADER: 'Trưởng nhóm',
    LEAD: 'Trưởng nhóm',
  };
  if (roleMap[normalized]) {
    return roleMap[normalized];
  }
  if (normalized.startsWith('ROLE_')) {
    const sub = normalized.substring(5);
    if (roleMap[sub]) return roleMap[sub];
  }
  return 'Nhân viên';
}

export interface AttendanceDetail {
  id: string;
  timestamp: string;
  formatted_time: string;
  status: string;
}

export interface TodayAttendance {
  date: string;
  check_in: AttendanceDetail | null;
  check_out: AttendanceDetail | null;
  allowed_action: "CHECK_IN" | "CHECK_OUT" | null;
}

export interface AttendanceActionResponse {
  status: "success";
  event_type: "CHECK_IN" | "CHECK_OUT";
  server_timestamp: string;
  formatted_time: string;
  message: string;
}

export interface Meter {
  id: string;
  meter_code: string;
  name: string;
  location: string | null;
  meter_type: string;
  is_active: boolean;
}

export interface BatchProgress {
  total: number;
  confirmed: number;
  review: number;
  pending: number;
}

export interface ReadingBatch {
  id: string;
  name: string;
  period_key: string;
  status: "OPEN" | "CLOSED";
  progress: BatchProgress;
}

export interface RecordedBy {
  employee_code: string;
  full_name: string;
}

export interface BatchMeterItem {
  meter: Meter;
  reading_status: "PENDING" | "CONFIRMED" | "REVIEW";
  reading?: string | null;
  recorded_at?: string | null;
  formatted_recorded_at?: string | null;
  recorded_by?: RecordedBy | null;
  reading_id?: string | null;
}

export interface ReadingRound {
  id: string;
  batch_id: string;
  scheduled_at: string;
  scheduled_local: string;
  scheduled_time_only: string;
  status: 'OPEN' | 'CLOSED';
  is_legacy?: boolean;
  timing_state: 'CURRENT' | 'PAST' | 'UPCOMING';
  progress: BatchProgress;
}

export interface ReadingRoundListResponse {
  batch_id: string;
  batch_name: string;
  period_key: string;
  rounds: ReadingRound[];
}

export interface ReadingRoundCurrentResponse {
  current_round: ReadingRound | null;
  nearest_upcoming_round: ReadingRound | null;
  batch: ReadingBatch | null;
}

export interface RoundMeterListResponse {
  round: ReadingRound;
  batch_id: string;
  batch_name: string;
  period_key: string;
  progress: BatchProgress;
  meters: BatchMeterItem[];
}

export interface TodayHourlySlot {
  round_id: string;
  scheduled_at: string;
  scheduled_local: string;
  scheduled_time_only: string;
  timing_state: 'CURRENT' | 'PAST' | 'UPCOMING';
  status: 'PENDING' | 'CONFIRMED' | 'REVIEW';
  reading: string | null;
  ocr_reading: string | null;
  confirmation_source: string | null;
  recorded_at: string | null;
  formatted_recorded_at: string | null;
  recorded_by: RecordedBy | null;
}

export interface RecentHourlySlot {
  round_id: string;
  scheduled_time: string;
  timing_state: 'CURRENT' | 'PAST' | 'UPCOMING';
  status: 'PENDING' | 'CONFIRMED' | 'REVIEW';
  reading?: string | null;
}

export interface MeterTrendPoint {
  scheduled_time: string;
  reading: string;
  value: number;
}

export interface LatestConfirmedReading {
  reading: string;
  ocr_reading: string | null;
  confirmation_source: string;
  round_id: string;
  round_time: string;
  server_timestamp: string;
  formatted_server_time: string;
  is_today?: boolean;
}

export interface MeterOperationItem {
  meter: Meter;
  current_status: 'PENDING' | 'CONFIRMED' | 'REVIEW' | 'NO_ROUND';
  current_reading: string | null;
  current_round_id: string | null;
  current_scheduled_time?: string | null;
  current_recorded_local?: string | null;
  latest_confirmed: LatestConfirmedReading | null;
  recent_slots: RecentHourlySlot[];
  today_slots: TodayHourlySlot[];
  trend: MeterTrendPoint[];
  missed_count: number;
}

export interface TodayOperationsSummary {
  total_meters: number;
  confirmed_current: number;
  pending_current: number;
  review_current: number;
  percent_current: number;
}

export interface TodayOperationsResponse {
  date: string;
  date_formatted: string;
  batch: ReadingBatch | null;
  current_round: ReadingRound | null;
  summary: {
    total_meters: number;
    confirmed_current: number;
    pending_current: number;
    review_current: number;
    percent_current: number;
  };
  meters: MeterOperationItem[];
}

export interface BatchMeterListResponse {
  batch_id: string;
  batch_name: string;
  period_key: string;
  progress: BatchProgress;
  meters: BatchMeterItem[];
}

export interface ConfirmReadingPayload {
  meter_id: string;
  reading_round_id: string;
  batch_id?: string;
  reading: string;
  ocr_reading?: string | null;
  confirmation_source?: 'OCR_CONFIRMED' | 'USER_CORRECTED' | 'MANUAL_ENTRY';
  meter_type?: string | null;
  det_confidence?: number | null;
  ocr_confidence?: number | null;
  localization_imgsz?: number | null;
  pipeline_version?: string | null;
  roi_bbox?: [number, number, number, number] | null;
  image_base64?: string | null;
}

export interface MarkReviewPayload {
  meter_id: string;
  reading_round_id: string;
  batch_id?: string;
  meter_type?: string | null;
  det_confidence?: number | null;
  ocr_confidence?: number | null;
  localization_imgsz?: number | null;
  pipeline_version?: string | null;
}

export interface MeterReadingActionResponse {
  status: "success";
  reading_id: string;
  meter_id: string;
  batch_id: string;
  reading_round_id: string;
  round_scheduled_local: string;
  reading_status: "CONFIRMED" | "REVIEW";
  reading: string | null;
  ocr_reading?: string | null;
  confirmation_source?: string | null;
  server_timestamp: string;
  formatted_time: string;
  message: string;
}

export interface MeterReadingHistoryItem {
  id: string;
  batch_id: string;
  batch_name: string;
  period_key: string;
  reading_round_id?: string | null;
  round_scheduled_at?: string | null;
  round_scheduled_local?: string | null;
  reading: string | null;
  ocr_reading?: string | null;
  confirmation_source?: string | null;
  status: string;
  meter_type: string | null;
  server_timestamp: string;
  formatted_time: string;
  recorded_by: RecordedBy;
}

export interface MeterDetailResponse {
  meter: Meter;
  history: MeterReadingHistoryItem[];
}

export interface ReportOverviewSummary {
  total_meters: number;
  expected_slots: number;
  due_slots: number;
  confirmed_slots: number;
  pending_slots: number;
  review_slots: number;
  completion_percent: number;
}

export interface ReportHourlyProgressItem {
  round_id: string;
  scheduled_time: string;
  timing_state: 'CURRENT' | 'PAST' | 'UPCOMING';
  total: number;
  confirmed: number;
  review: number;
  pending: number;
  completion_percent: number;
}

export interface ReportLocationProgressItem {
  location: string;
  meter_count: number;
  expected_slots: number;
  due_slots: number;
  confirmed_slots: number;
  review_slots: number;
  pending_slots: number;
  completion_percent: number;
}

export interface ReportOverviewResponse {
  date: string;
  date_formatted: string;
  summary: ReportOverviewSummary;
  hourly: ReportHourlyProgressItem[];
  locations: ReportLocationProgressItem[];
}

export interface ReportMeterHourlyRow {
  round_id: string;
  scheduled_time: string;
  timing_state: 'CURRENT' | 'PAST' | 'UPCOMING';
  status: 'PENDING' | 'CONFIRMED' | 'REVIEW';
  reading?: string | null;
  ocr_reading?: string | null;
  confirmation_source?: string | null;
  formatted_recorded_at?: string | null;
  recorded_by?: RecordedBy | null;
}

export interface ReportMeterCompletion {
  scheduled_total: number;
  due_total: number;
  confirmed: number;
  review: number;
  pending: number;
  completion_percent: number;
}

export interface ReportMeterDetailResponse {
  date: string;
  date_formatted: string;
  meter: Meter;
  latest_confirmed?: LatestConfirmedReading | null;
  completion: ReportMeterCompletion;
  hourly: ReportMeterHourlyRow[];
  trend: MeterTrendPoint[];
}

// ==============================================================================
// ADMIN OPERATIONS V1 INTERFACES
// ==============================================================================
export interface AdminMeterItem {
  id: string;
  meter_code: string;
  name: string;
  location: string | null;
  meter_type: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  has_readings: boolean;
  total_readings: number;
  latest_reading: string | null;
  latest_reading_time: string | null;
}

export interface AdminMeterListResponse {
  total: number;
  active_count: number;
  inactive_count: number;
  meters: AdminMeterItem[];
}

export interface AdminMeterCreatePayload {
  meter_code: string;
  name: string;
  location?: string | null;
  meter_type?: string;
}

export interface AdminMeterUpdatePayload {
  meter_code?: string;
  name?: string;
  location?: string | null;
  meter_type?: string;
}

export interface AdminSchedulePreviewRound {
  scheduled_at: string;
  scheduled_local: string;
  scheduled_time_only: string;
  is_conflict: boolean;
  existing_round_id?: string | null;
}

export interface AdminSchedulePreviewResponse {
  batch_id: string;
  batch_name: string;
  target_date: string;
  total_proposed: number;
  conflict_count: number;
  rounds: AdminSchedulePreviewRound[];
}

export interface AdminScheduleCreateResponse {
  status: 'success';
  batch_id: string;
  batch_name: string;
  created_count: number;
  message: string;
  rounds: ReadingRound[];
}

export interface AdminScheduleDeleteResponse {
  status: 'success';
  deleted_count: number;
  message: string;
}

export interface AdminDashboardKpis {
  current_round_time: string | null;
  current_round_status: string | null;
  confirmed_slots: number;
  due_slots: number;
  total_expected_slots: number;
  completion_percent: number;
  actionable_count: number;
  review_count: number;
}

export interface AdminDashboardRoundProgress {
  round_id: string;
  scheduled_time: string;
  scheduled_local: string;
  timing_state: 'CURRENT' | 'PAST' | 'UPCOMING';
  total_meters: number;
  confirmed: number;
  review: number;
  pending: number;
  completion_percent: number;
}

export interface AdminDashboardLocationProgress {
  location: string;
  meter_count: number;
  due_slots: number;
  confirmed_slots: number;
  review_slots: number;
  pending_slots: number;
  completion_percent: number;
}

export interface AdminDashboardExceptionItem {
  meter_id: string;
  meter_code: string;
  meter_name: string;
  location: string;
  round_id: string;
  scheduled_time: string;
  scheduled_local: string;
  exception_state: 'MISSING' | 'REVIEW';
  exception_label: string;
  reading_id?: string | null;
  ocr_reading?: string | null;
  server_timestamp?: string | null;
  recorded_by?: string | null;
}

export interface AdminDashboardProvenanceStats {
  ocr_confirmed_count: number;
  ocr_confirmed_percent: number;
  user_corrected_count: number;
  user_corrected_percent: number;
  manual_entry_count: number;
  manual_entry_percent: number;
  total_readings: number;
}

export interface AdminDashboardResponse {
  date: string;
  date_formatted: string;
  location_filter?: string | null;
  batch: ReadingBatch | null;
  kpis: AdminDashboardKpis;
  round_progress: AdminDashboardRoundProgress[];
  location_progress: AdminDashboardLocationProgress[];
  exceptions: AdminDashboardExceptionItem[];
  provenance: AdminDashboardProvenanceStats;
  available_locations: string[];
}

export interface AdminAuditLogItem {
  id: string;
  actor_id?: string | null;
  actor_employee_code?: string | null;
  actor_full_name?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  before_json?: string | null;
  after_json?: string | null;
  created_at: string;
  created_at_local: string;
}

export interface AdminAuditLogListResponse {
  total: number;
  logs: AdminAuditLogItem[];
}

// --- Admin Technical Reports Interfaces ---

export interface TechnicalDateRange {
  start_date: string;
  end_date: string;
  start_date_vn: string;
  end_date_vn: string;
}

export interface AdminTechnicalOverviewSummary {
  total_scheduled_rounds: number;
  total_due_slots: number;
  total_confirmed: number;
  total_review: number;
  total_missing: number;
  completion_rate: number;
  human_intervention_count: number;
  human_intervention_rate: number;
  ocr_confirmed_count: number;
  ocr_confirmed_rate: number;
  user_corrected_count: number;
  user_corrected_rate: number;
  manual_entry_count: number;
  manual_entry_rate: number;
  recording_latency_p50_minutes?: number | null;
  recording_latency_p95_minutes?: number | null;
}

export interface DailyCompletionTrendItem {
  date: string;
  date_vn: string;
  due_slots: number;
  confirmed_slots: number;
  completion_rate: number;
}

export interface DailyProvenanceTrendItem {
  date: string;
  date_vn: string;
  confirmed_count: number;
  ocr_confirmed_count: number;
  user_corrected_count: number;
  manual_entry_count: number;
  ocr_rate: number;
  corrected_rate: number;
  manual_rate: number;
}

export interface QualityByTypeItem {
  meter_type: string;
  confirmed_count: number;
  ocr_confirmed_count: number;
  user_corrected_count: number;
  manual_entry_count: number;
  ocr_rate: number;
  corrected_rate: number;
  manual_rate: number;
}

export interface QualityByLocationItem {
  location: string;
  confirmed_count: number;
  ocr_confirmed_count: number;
  user_corrected_count: number;
  manual_entry_count: number;
  review_count: number;
  ocr_rate: number;
  corrected_rate: number;
  manual_rate: number;
}

export interface WatchlistMeterItem {
  meter_id: string;
  meter_code: string;
  name: string;
  location: string;
  meter_type: string;
  confirmed_count: number;
  user_corrected_count: number;
  manual_entry_count: number;
  review_count: number;
  human_intervention_rate: number;
}

export interface DataIntegrityResponse {
  total_violations: number;
  duplicate_meter_rounds: number;
  invalid_provenance_ocr_mismatch: number;
  invalid_provenance_manual_with_ocr: number;
  invalid_provenance_corrected_null_ocr: number;
  confirmed_reading_on_future_round: number;
  negative_latency_count: number;
  status_message: string;
}

export interface PipelineConfigResponse {
  pipeline_version: string;
  localization_model: string;
  localization_imgsz: number;
  adaptive_retry_imgsz: number;
  confidence_threshold: number;
  iou_threshold: number;
  crop_padding: string;
  recognizer: string;
  label: string;
}

export interface AdminTechnicalOverviewResponse {
  date_range: TechnicalDateRange;
  summary: AdminTechnicalOverviewSummary;
  daily_completion_trend: DailyCompletionTrendItem[];
  daily_provenance_trend: DailyProvenanceTrendItem[];
  quality_by_type: QualityByTypeItem[];
  quality_by_location: QualityByLocationItem[];
  watchlist_meters: WatchlistMeterItem[];
  data_integrity: DataIntegrityResponse;
  pipeline_config: PipelineConfigResponse;
  available_locations: string[];
}

export interface AdminTechnicalMeterSummary {
  meter_id: string;
  meter_code: string;
  name: string;
  location: string;
  meter_type: string;
  is_active: boolean;
  scheduled_rounds_count: number;
  confirmed_count: number;
  review_count: number;
  ocr_confirmed_count: number;
  user_corrected_count: number;
  manual_entry_count: number;
  human_intervention_rate: number;
  latency_p50?: number | null;
  latency_p95?: number | null;
}

export interface AdminTechnicalMeterHistoryItem {
  id: string;
  round_id: string;
  date: string;
  scheduled_time: string;
  status: string;
  reading?: string | null;
  ocr_reading?: string | null;
  confirmation_source?: string | null;
  recorded_at: string;
  operator_name: string;
}

export interface CumulativeTrendItem {
  scheduled_time: string;
  canonical_reading: string;
  value: number;
  tooltip_label: string;
}

export interface AdminTechnicalMeterListResponse {
  date_range: TechnicalDateRange;
  meters: AdminTechnicalMeterSummary[];
  selected_meter_id?: string | null;
  history: AdminTechnicalMeterHistoryItem[];
  cumulative_trend: CumulativeTrendItem[];
}

export interface AdminTechnicalRecordDetail {
  id: string;
  date: string;
  scheduled_time: string;
  meter_code: string;
  meter_name: string;
  location: string;
  meter_type: string;
  status: string;
  reading?: string | null;
  ocr_reading?: string | null;
  confirmation_source?: string | null;
  recorded_at?: string | null;
  operator_name?: string | null;
}

export interface AdminTechnicalDetailsResponse {
  total: number;
  page: number;
  limit: number;
  items: AdminTechnicalRecordDetail[];
}

// --- Admin Meter Reading Inspection Types ---
export interface AdminInspectionMeter {
  id: string;
  meter_code: string;
  name: string;
  location: string;
  meter_type?: string | null;
  is_active: boolean;
}

export interface AdminInspectionRound {
  id: string;
  scheduled_at: string;
  scheduled_at_vn: string;
  scheduled_time: string;
  status: string;
}

export interface AdminInspectionOperator {
  id: string;
  full_name: string;
  employee_code: string;
}

export interface AdminMeterReadingInspectionResponse {
  reading_id: string;
  status: string;
  reading?: string | null;
  ocr_reading?: string | null;
  confirmation_source?: string | null;
  scheduled_at: string;
  scheduled_at_vn: string;
  scheduled_time: string;
  recorded_at?: string | null;
  recorded_at_vn?: string | null;
  meter: AdminInspectionMeter;
  round: AdminInspectionRound;
  operator?: AdminInspectionOperator | null;
  evidence_available: boolean;
  evidence?: AdminMeterReadingEvidenceInfo | null;
  roi_bbox?: number[] | null;
  pipeline_version?: string | null;
  prev_reading_id?: string | null;
  next_reading_id?: string | null;
}

export interface AdminInspectionBBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  norm_x1: number;
  norm_y1: number;
  norm_x2: number;
  norm_y2: number;
  width: number;
  height: number;
  norm_width: number;
  norm_height: number;
}

export interface AdminMeterReadingEvidenceInfo {
  available: boolean;
  width?: number | null;
  height?: number | null;
  mime_type?: string | null;
  captured_at_vn?: string | null;
  localization_bbox?: AdminInspectionBBox | null;
  recognition_bbox?: AdminInspectionBBox | null;
}

export interface AdminMeterLatestReadingResponse {
  reading_id: string;
}

// ==============================================================================
// WORK SCHEDULE & LEAVE MANAGEMENT TYPES
// ==============================================================================

export type ShiftCode = 'CA1' | 'CA2' | 'CA3' | 'HC' | 'OFF' | 'LEAVE';

export interface ShiftDefinition {
  code: string;
  name: string;
  start_time?: string | null;
  end_time?: string | null;
  color: string;
  bg_color: string;
  is_work: boolean;
}

export interface WorkScheduleDay {
  date: string;
  day: number;
  day_of_week: number;
  weekday_label: string;
  shift_code: string;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
  color: string;
  bg_color: string;
  is_work: boolean;
  status: string;
  is_today: boolean;
  is_past: boolean;
  has_pending_leave: boolean;
  notes?: string | null;
}

export interface WorkScheduleSummary {
  total_shifts: number;
  completed_shifts: number;
  upcoming_shifts: number;
  annual_leave_remaining: number;
}

export interface NextShiftInfo {
  date: string;
  weekday_label: string;
  shift_code: string;
  shift_name: string;
  start_time?: string | null;
  end_time?: string | null;
  is_today: boolean;
}

export interface UserMonthlyScheduleResponse {
  month: string;
  year: number;
  month_number: number;
  today: string;
  days: WorkScheduleDay[];
  summary: WorkScheduleSummary;
  next_shift?: NextShiftInfo | null;
  available_shifts: ShiftDefinition[];
}

export interface LeaveRequestUserSummary {
  id: string;
  full_name: string;
  employee_code: string;
  role?: string | null;
}

export interface LeaveRequestItem {
  id: string;
  leave_type: string;
  leave_type_label: string;
  start_date: string;
  end_date: string;
  shift_code?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  user?: LeaveRequestUserSummary | null;
  substitute_user?: LeaveRequestUserSummary | null;
  reviewer_name?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
}

export interface LeaveRequestCreatePayload {
  leave_type: string;
  start_date: string;
  end_date?: string | null;
  shift_code?: string | null;
  reason: string;
  substitute_user_id?: string | null;
}

export interface AdminRosterDayHeader {
  date: string;
  day: number;
  weekday_label: string;
  is_weekend: boolean;
  is_today: boolean;
}

export interface AdminRosterUserRow {
  user_id: string;
  employee_code: string;
  full_name: string;
  role: string;
  shifts: Record<string, string>;
  total_shifts: number;
}

export interface AdminDailyStaffCounts {
  counts: Record<string, number>;
  total_working: number;
}

export interface AdminRosterResponse {
  month: string;
  year: number;
  month_number: number;
  today: string;
  days_header: AdminRosterDayHeader[];
  users: AdminRosterUserRow[];
  daily_staff_count: Record<string, AdminDailyStaffCounts>;
  shift_definitions: Record<string, ShiftDefinition>;
}

export interface AdminShiftAssignItem {
  user_id: string;
  work_date: string;
  shift_code: string;
  notes?: string | null;
}

export interface AutoPatternSampleChange {
  user_id: string;
  full_name: string;
  employee_code: string;
  work_date: string;
  old_shift: string;
  new_shift: string;
}

export interface AdminAutoPatternPreviewResponse {
  month: string;
  pattern_type: string;
  total_assignments: number;
  changed_count: number;
  unchanged_count: number;
  leave_conflicts_count: number;
  insufficient_rest_count: number;
  understaffed_shifts_count: number;
  sample_changes: AutoPatternSampleChange[];
}

// --- Map Operations Interfaces (Phase 2 & Phase 3) ---

export interface OperationalZoneOut {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  map_polygon: string;
  is_active: boolean;
  assigned_user?: {
    id: string;
    employee_code: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
  } | null;
  total_meters: number;
  confirmed_count?: number;
  review_count?: number;
  overdue_count?: number;
  due_count?: number;
  pending_count?: number;
  completion_percent?: number;
}

export interface MapMeterOut {
  id: string;
  meter_code: string;
  name: string;
  location?: string | null;
  meter_type: string;
  zone_id?: string | null;
  zone_code?: string | null;
  zone_name?: string | null;
  map_x?: number | null;
  map_y?: number | null;
  is_active: boolean;
  semantic_state: 'CONFIRMED' | 'PENDING' | 'DUE' | 'OVERDUE' | 'REVIEW' | 'INACTIVE';
  latest_reading_value?: string | null;
  latest_reading_time?: string | null;
  exception_state?: string | null;
  exception_label?: string | null;
  reading_id?: string | null;
}

export interface MapOverviewResponse {
  target_date: string;
  target_date_vn: string;
  current_round_time?: string | null;
  current_round_status?: string | null;
  total_meters: number;
  confirmed_count: number;
  review_count: number;
  overdue_count: number;
  due_count: number;
  pending_count: number;
  completion_percent: number;
  zones: OperationalZoneOut[];
  meters: MapMeterOut[];
  exceptions_count: number;
}

export interface ZoneReassignRequest {
  user_id: string;
  assignment_role?: string;
  effective_from?: string;
  note?: string;
}

export interface ZoneReassignResponse {
  status: string;
  message: string;
  zone_id: string;
  user_id: string;
  user_name: string;
}
