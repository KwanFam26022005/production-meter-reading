from typing import Any, Literal, Optional
from pydantic import BaseModel



class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    pipeline_version: str
    models_loaded: bool


class MeterReadResponse(BaseModel):
    status: Literal["success", "review"]
    reading: Optional[str] = None
    meter_type: Optional[Literal["lcd", "mechanical"]] = None
    det_confidence: Optional[float] = None
    ocr_confidence: Optional[float] = None
    localization_imgsz: Optional[int] = None
    pipeline_version: str
    roi_bbox: Optional[list[float]] = None


class LoginRequest(BaseModel):
    employee_code: str
    password: str


class UserOut(BaseModel):
    id: str
    employee_code: str
    full_name: str
    role: str


class LoginResponse(BaseModel):
    status: Literal["ok"] = "ok"
    user: UserOut


class LogoutResponse(BaseModel):
    status: Literal["ok"] = "ok"
    message: str


class CsrfResponse(BaseModel):
    csrf_token: str


class AttendanceEventDetail(BaseModel):
    id: str
    timestamp: str
    formatted_time: str
    status: str


class AttendanceTodayResponse(BaseModel):
    date: str
    check_in: Optional[AttendanceEventDetail] = None
    check_out: Optional[AttendanceEventDetail] = None
    allowed_action: Optional[Literal["CHECK_IN", "CHECK_OUT"]] = None


class AttendanceActionResponse(BaseModel):
    status: Literal["success"] = "success"
    event_type: Literal["CHECK_IN", "CHECK_OUT"]
    server_timestamp: str
    formatted_time: str
    message: str


# ==============================================================================
# METER MASTER & READING BATCH SCHEMAS
# ==============================================================================
class MeterOut(BaseModel):
    id: str
    meter_code: str
    name: str
    location: Optional[str] = None
    meter_type: str = "UNKNOWN"
    is_active: bool = True


class BatchProgress(BaseModel):
    total: int
    confirmed: int
    review: int
    pending: int


class ReadingBatchCurrentResponse(BaseModel):
    id: str
    name: str
    period_key: str
    status: Literal["OPEN", "CLOSED"]
    progress: BatchProgress


class ReadingRoundOut(BaseModel):
    id: str
    batch_id: str
    scheduled_at: str
    scheduled_local: str
    scheduled_time_only: str
    status: Literal["OPEN", "CLOSED"]
    is_legacy: bool = False
    timing_state: Literal["CURRENT", "PAST", "UPCOMING"]
    progress: BatchProgress


class ReadingRoundListResponse(BaseModel):
    batch_id: str
    batch_name: str
    period_key: str
    rounds: list[ReadingRoundOut]


class ReadingRoundCurrentResponse(BaseModel):
    current_round: Optional[ReadingRoundOut] = None
    nearest_upcoming_round: Optional[ReadingRoundOut] = None
    batch: Optional[ReadingBatchCurrentResponse] = None


class RecordedByOut(BaseModel):
    employee_code: str
    full_name: str


class BatchMeterItem(BaseModel):
    meter: MeterOut
    reading_status: Literal["PENDING", "CONFIRMED", "REVIEW"]
    reading: Optional[str] = None
    recorded_at: Optional[str] = None
    formatted_recorded_at: Optional[str] = None
    recorded_by: Optional[RecordedByOut] = None
    reading_id: Optional[str] = None


class BatchMeterListResponse(BaseModel):
    batch_id: str
    batch_name: str
    period_key: str
    progress: BatchProgress
    meters: list[BatchMeterItem]


class RoundMeterListResponse(BaseModel):
    round: ReadingRoundOut
    batch_id: str
    batch_name: str
    period_key: str
    progress: BatchProgress
    meters: list[BatchMeterItem]


class TodayHourlySlot(BaseModel):
    round_id: str
    scheduled_at: str
    scheduled_local: str
    scheduled_time_only: str
    timing_state: Literal["CURRENT", "PAST", "UPCOMING"]
    status: Literal["PENDING", "CONFIRMED", "REVIEW"]
    reading: Optional[str] = None
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None
    recorded_at: Optional[str] = None
    formatted_recorded_at: Optional[str] = None
    recorded_by: Optional[RecordedByOut] = None


class RecentHourlySlot(BaseModel):
    round_id: str
    scheduled_time: str
    timing_state: Literal["CURRENT", "PAST", "UPCOMING"]
    status: Literal["PENDING", "CONFIRMED", "REVIEW"]
    reading: Optional[str] = None


class MeterTrendPoint(BaseModel):
    scheduled_time: str
    reading: str
    value: float


class LatestConfirmedReading(BaseModel):
    reading: str
    ocr_reading: Optional[str] = None
    confirmation_source: str
    round_id: str
    round_time: str
    server_timestamp: str
    formatted_server_time: str
    is_today: bool = True


class MeterOperationItem(BaseModel):
    meter: MeterOut
    current_status: Literal["PENDING", "CONFIRMED", "REVIEW", "NO_ROUND"]
    current_reading: Optional[str] = None
    current_round_id: Optional[str] = None
    current_scheduled_time: Optional[str] = None
    current_recorded_local: Optional[str] = None
    latest_confirmed: Optional[LatestConfirmedReading] = None
    recent_slots: list[RecentHourlySlot] = []
    today_slots: list[TodayHourlySlot] = []
    trend: list[MeterTrendPoint] = []
    missed_count: int = 0


class TodayOperationsSummary(BaseModel):
    total_meters: int
    confirmed_current: int
    pending_current: int
    review_current: int
    percent_current: int


class TodayOperationsResponse(BaseModel):
    date: str
    date_formatted: str
    batch: Optional[ReadingBatchCurrentResponse] = None
    current_round: Optional[ReadingRoundOut] = None
    summary: TodayOperationsSummary
    meters: list[MeterOperationItem]


class ConfirmReadingRequest(BaseModel):
    meter_id: str
    reading_round_id: str
    batch_id: Optional[str] = None
    reading: str
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None  # "OCR_CONFIRMED" | "USER_CORRECTED" | "MANUAL_ENTRY"
    meter_type: Optional[str] = None
    det_confidence: Optional[float] = None
    ocr_confidence: Optional[float] = None
    localization_imgsz: Optional[int] = None
    pipeline_version: Optional[str] = None
    roi_bbox: Optional[list[float]] = None
    image_base64: Optional[str] = None


class MarkReviewRequest(BaseModel):
    meter_id: str
    reading_round_id: str
    batch_id: Optional[str] = None
    meter_type: Optional[str] = None
    det_confidence: Optional[float] = None
    ocr_confidence: Optional[float] = None
    localization_imgsz: Optional[int] = None
    pipeline_version: Optional[str] = None


class MeterReadingActionResponse(BaseModel):
    status: Literal["success"] = "success"
    reading_id: str
    meter_id: str
    batch_id: str
    reading_round_id: str
    round_scheduled_local: str
    reading_status: Literal["CONFIRMED", "REVIEW"]
    reading: Optional[str] = None
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None
    server_timestamp: str
    formatted_time: str
    message: str


class MeterReadingHistoryItem(BaseModel):
    id: str
    batch_id: str
    batch_name: str
    period_key: str
    reading_round_id: Optional[str] = None
    round_scheduled_at: Optional[str] = None
    round_scheduled_local: Optional[str] = None
    reading: Optional[str] = None
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None
    status: str
    meter_type: Optional[str] = None
    server_timestamp: str
    formatted_time: str
    recorded_by: RecordedByOut


class MeterDetailResponse(BaseModel):
    meter: MeterOut
    history: list[MeterReadingHistoryItem]


# ==============================================================================
# REPORTING & ANALYTICS SCHEMAS
# ==============================================================================
class ReportOverviewSummary(BaseModel):
    total_meters: int
    expected_slots: int
    due_slots: int
    confirmed_slots: int
    pending_slots: int
    review_slots: int
    completion_percent: float


class ReportHourlyProgressItem(BaseModel):
    round_id: str
    scheduled_time: str
    timing_state: Literal["CURRENT", "PAST", "UPCOMING"]
    total: int
    confirmed: int
    review: int
    pending: int
    completion_percent: float


class ReportLocationProgressItem(BaseModel):
    location: str
    meter_count: int
    expected_slots: int
    due_slots: int
    confirmed_slots: int
    review_slots: int
    pending_slots: int
    completion_percent: float


class ReportOverviewResponse(BaseModel):
    date: str
    date_formatted: str
    summary: ReportOverviewSummary
    hourly: list[ReportHourlyProgressItem]
    locations: list[ReportLocationProgressItem]


class ReportMeterHourlyRow(BaseModel):
    round_id: str
    scheduled_time: str
    timing_state: Literal["CURRENT", "PAST", "UPCOMING"]
    status: Literal["PENDING", "CONFIRMED", "REVIEW"]
    reading: Optional[str] = None
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None
    formatted_recorded_at: Optional[str] = None
    recorded_by: Optional[RecordedByOut] = None


class ReportMeterCompletion(BaseModel):
    scheduled_total: int
    due_total: int
    confirmed: int
    review: int
    pending: int
    completion_percent: float


class ReportMeterDetailResponse(BaseModel):
    date: str
    date_formatted: str
    meter: MeterOut
    latest_confirmed: Optional[LatestConfirmedReading] = None
    completion: ReportMeterCompletion
    hourly: list[ReportMeterHourlyRow]
    trend: list[MeterTrendPoint]


# ==============================================================================
# ADMIN OPERATIONS V1 SCHEMAS
# ==============================================================================
class AdminMeterCreateRequest(BaseModel):
    meter_code: str
    name: str
    location: Optional[str] = None
    meter_type: str = "UNKNOWN"
    zone_id: Optional[str] = None
    presentation_zone_id: Optional[str] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None


class AdminMeterUpdateRequest(BaseModel):
    meter_code: Optional[str] = None
    name: Optional[str] = None
    location: Optional[str] = None
    meter_type: Optional[str] = None
    zone_id: Optional[str] = None
    presentation_zone_id: Optional[str] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None


class AdminMeterRelocateRequest(BaseModel):
    map_x: float
    map_y: float


class AdminMeterChangeZoneRequest(BaseModel):
    zone_id: str
    presentation_zone_id: str


class AdminMeterItem(BaseModel):
    id: str
    meter_code: str
    name: str
    location: Optional[str] = None
    meter_type: str
    is_active: bool
    zone_id: Optional[str] = None
    presentation_zone_id: Optional[str] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    route_status: str = "VALID"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    has_readings: bool = False
    total_readings: int = 0
    latest_reading: Optional[str] = None
    latest_reading_time: Optional[str] = None


class AdminMeterListResponse(BaseModel):
    total: int
    active_count: int
    inactive_count: int
    meters: list[AdminMeterItem]


class AdminSchedulePreviewRequest(BaseModel):
    date: str
    start_time: str = "08:00"
    end_time: str = "17:00"
    interval_minutes: int = 60
    batch_id: Optional[str] = None


class AdminSchedulePreviewRound(BaseModel):
    scheduled_at: str
    scheduled_local: str
    scheduled_time_only: str
    is_conflict: bool = False
    existing_round_id: Optional[str] = None


class AdminSchedulePreviewResponse(BaseModel):
    batch_id: str
    batch_name: str
    target_date: str
    total_proposed: int
    conflict_count: int
    rounds: list[AdminSchedulePreviewRound]


class AdminScheduleCreateRequest(BaseModel):
    date: str
    start_time: str = "08:00"
    end_time: str = "17:00"
    interval_minutes: int = 60
    batch_id: Optional[str] = None


class AdminScheduleCreateResponse(BaseModel):
    status: Literal["success"] = "success"
    batch_id: str
    batch_name: str
    created_count: int
    message: str
    rounds: list[ReadingRoundOut]


class AdminScheduleDeleteResponse(BaseModel):
    status: Literal["success"] = "success"
    deleted_count: int
    message: str


class AdminDashboardKpis(BaseModel):
    current_round_time: Optional[str] = None
    current_round_status: Optional[str] = None
    confirmed_slots: int
    due_slots: int
    total_expected_slots: int
    completion_percent: float
    actionable_count: int
    review_count: int


class AdminDashboardRoundProgress(BaseModel):
    round_id: str
    scheduled_time: str
    scheduled_local: str
    timing_state: Literal["CURRENT", "PAST", "UPCOMING"]
    total_meters: int
    confirmed: int
    review: int
    pending: int
    completion_percent: float


class AdminDashboardLocationProgress(BaseModel):
    location: str
    meter_count: int
    due_slots: int
    confirmed_slots: int
    review_slots: int
    pending_slots: int
    completion_percent: float


class AdminDashboardExceptionItem(BaseModel):
    meter_id: str
    meter_code: str
    meter_name: str
    location: str
    round_id: str
    scheduled_time: str
    scheduled_local: str
    exception_state: Literal["MISSING", "REVIEW"]
    exception_label: str
    reading_id: Optional[str] = None
    ocr_reading: Optional[str] = None
    server_timestamp: Optional[str] = None
    recorded_by: Optional[str] = None


class AdminDashboardProvenanceStats(BaseModel):
    ocr_confirmed_count: int
    ocr_confirmed_percent: float
    user_corrected_count: int
    user_corrected_percent: float
    manual_entry_count: int
    manual_entry_percent: float
    total_readings: int


class AdminDashboardResponse(BaseModel):
    date: str
    date_formatted: str
    location_filter: Optional[str] = None
    batch: Optional[ReadingBatchCurrentResponse] = None
    kpis: AdminDashboardKpis
    round_progress: list[AdminDashboardRoundProgress]
    location_progress: list[AdminDashboardLocationProgress]
    exceptions: list[AdminDashboardExceptionItem]
    provenance: AdminDashboardProvenanceStats
    available_locations: list[str]


class AdminAuditLogItem(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_employee_code: Optional[str] = None
    actor_full_name: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    before_json: Optional[str] = None
    after_json: Optional[str] = None
    created_at: str
    created_at_local: str


class AdminAuditLogListResponse(BaseModel):
    total: int
    logs: list[AdminAuditLogItem]


# --- Admin Technical Reports Schemas ---

class DateRangeInfo(BaseModel):
    start_date: str
    end_date: str
    start_date_vn: str
    end_date_vn: str


class AdminTechnicalOverviewSummary(BaseModel):
    total_scheduled_rounds: int
    total_due_slots: int
    total_confirmed: int
    total_review: int
    total_missing: int
    completion_rate: float
    human_intervention_count: int
    human_intervention_rate: float
    ocr_confirmed_count: int
    ocr_confirmed_rate: float
    user_corrected_count: int
    user_corrected_rate: float
    manual_entry_count: int
    manual_entry_rate: float
    recording_latency_p50_minutes: Optional[float] = None
    recording_latency_p95_minutes: Optional[float] = None


class DailyCompletionTrendItem(BaseModel):
    date: str
    date_vn: str
    due_slots: int
    confirmed_slots: int
    completion_rate: float


class DailyProvenanceTrendItem(BaseModel):
    date: str
    date_vn: str
    confirmed_count: int
    ocr_confirmed_count: int
    user_corrected_count: int
    manual_entry_count: int
    ocr_rate: float
    corrected_rate: float
    manual_rate: float


class QualityByTypeItem(BaseModel):
    meter_type: str
    confirmed_count: int
    ocr_confirmed_count: int
    user_corrected_count: int
    manual_entry_count: int
    ocr_rate: float
    corrected_rate: float
    manual_rate: float


class QualityByLocationItem(BaseModel):
    location: str
    confirmed_count: int
    ocr_confirmed_count: int
    user_corrected_count: int
    manual_entry_count: int
    review_count: int
    ocr_rate: float
    corrected_rate: float
    manual_rate: float


class WatchlistMeterItem(BaseModel):
    meter_id: str
    meter_code: str
    name: str
    location: str
    meter_type: str
    confirmed_count: int
    user_corrected_count: int
    manual_entry_count: int
    review_count: int
    human_intervention_rate: float


class DataIntegrityResponse(BaseModel):
    total_violations: int
    duplicate_meter_rounds: int
    invalid_provenance_ocr_mismatch: int
    invalid_provenance_manual_with_ocr: int
    invalid_provenance_corrected_null_ocr: int
    confirmed_reading_on_future_round: int
    negative_latency_count: int
    status_message: str


class PipelineConfigResponse(BaseModel):
    pipeline_version: str
    localization_model: str
    localization_imgsz: int
    adaptive_retry_imgsz: int
    confidence_threshold: float
    iou_threshold: float
    crop_padding: str
    recognizer: str
    label: str


class AdminTechnicalOverviewResponse(BaseModel):
    date_range: DateRangeInfo
    summary: AdminTechnicalOverviewSummary
    daily_completion_trend: list[DailyCompletionTrendItem]
    daily_provenance_trend: list[DailyProvenanceTrendItem]
    quality_by_type: list[QualityByTypeItem]
    quality_by_location: list[QualityByLocationItem]
    watchlist_meters: list[WatchlistMeterItem]
    data_integrity: DataIntegrityResponse
    pipeline_config: PipelineConfigResponse
    available_locations: list[str]


class AdminTechnicalMeterSummary(BaseModel):
    meter_id: str
    meter_code: str
    name: str
    location: str
    meter_type: str
    is_active: bool
    scheduled_rounds_count: int
    confirmed_count: int
    review_count: int
    ocr_confirmed_count: int
    user_corrected_count: int
    manual_entry_count: int
    human_intervention_rate: float
    latency_p50: Optional[float] = None
    latency_p95: Optional[float] = None


class AdminTechnicalMeterHistoryItem(BaseModel):
    id: str
    round_id: str
    date: str
    scheduled_time: str
    status: str
    reading: Optional[str] = None
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None
    recorded_at: str
    operator_name: str


class CumulativeTrendItem(BaseModel):
    scheduled_time: str
    canonical_reading: str
    value: float
    tooltip_label: str


class AdminTechnicalMeterListResponse(BaseModel):
    date_range: DateRangeInfo
    meters: list[AdminTechnicalMeterSummary]
    selected_meter_id: Optional[str] = None
    history: list[AdminTechnicalMeterHistoryItem]
    cumulative_trend: list[CumulativeTrendItem]


class AdminTechnicalRecordDetail(BaseModel):
    id: str
    date: str
    scheduled_time: str
    meter_code: str
    meter_name: str
    location: str
    meter_type: str
    status: str
    reading: Optional[str] = None
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None
    recorded_at: Optional[str] = None
    operator_name: Optional[str] = None


class AdminTechnicalDetailsResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: list[AdminTechnicalRecordDetail]


# --- Admin Meter Reading Inspection Schemas ---
class AdminInspectionMeter(BaseModel):
    id: str
    meter_code: str
    name: str
    location: str
    meter_type: Optional[str] = None
    is_active: bool = True


class AdminInspectionRound(BaseModel):
    id: str
    scheduled_at: str
    scheduled_at_vn: str
    scheduled_time: str
    status: str


class AdminInspectionOperator(BaseModel):
    id: str
    full_name: str
    employee_code: str


class AdminInspectionBBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int
    norm_x1: float
    norm_y1: float
    norm_x2: float
    norm_y2: float
    width: int
    height: int
    norm_width: float
    norm_height: float


class AdminMeterReadingEvidenceInfo(BaseModel):
    available: bool = True
    width: Optional[int] = None
    height: Optional[int] = None
    mime_type: Optional[str] = "image/jpeg"
    captured_at_vn: Optional[str] = None
    localization_bbox: Optional[AdminInspectionBBox] = None
    recognition_bbox: Optional[AdminInspectionBBox] = None


class AdminMeterReadingInspectionResponse(BaseModel):
    reading_id: str
    status: str
    reading: Optional[str] = None
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None
    scheduled_at: str
    scheduled_at_vn: str
    scheduled_time: str
    recorded_at: Optional[str] = None
    recorded_at_vn: Optional[str] = None
    meter: AdminInspectionMeter
    round: AdminInspectionRound
    operator: Optional[AdminInspectionOperator] = None
    evidence_available: bool = False
    evidence: Optional[AdminMeterReadingEvidenceInfo] = None
    roi_bbox: Optional[list[float]] = None
    pipeline_version: Optional[str] = None
    prev_reading_id: Optional[str] = None
    next_reading_id: Optional[str] = None


class AdminMeterLatestReadingResponse(BaseModel):
    reading_id: str


# ==============================================================================
# WORK SCHEDULE & LEAVE MANAGEMENT SCHEMAS
# ==============================================================================

class ShiftDefinitionItem(BaseModel):
    code: str
    name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    color: str
    bg_color: str
    is_work: bool


class WorkScheduleDayItem(BaseModel):
    date: str
    day: int
    day_of_week: int
    weekday_label: str
    shift_code: str
    shift_name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    color: str
    bg_color: str
    is_work: bool
    status: str
    is_today: bool
    is_past: bool
    has_pending_leave: bool
    notes: Optional[str] = None


class WorkScheduleSummary(BaseModel):
    total_shifts: int
    completed_shifts: int
    upcoming_shifts: int
    annual_leave_remaining: int


class NextShiftInfo(BaseModel):
    date: str
    weekday_label: str
    shift_code: str
    shift_name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_today: bool


class UserMonthlyScheduleResponse(BaseModel):
    month: str
    year: int
    month_number: int
    today: str
    days: list[WorkScheduleDayItem]
    summary: WorkScheduleSummary
    next_shift: Optional[NextShiftInfo] = None
    available_shifts: list[ShiftDefinitionItem]


class LeaveRequestCreateRequest(BaseModel):
    leave_type: str = "ANNUAL"  # ANNUAL, COMPENSATORY, PERSONAL_PAID, PERSONAL_UNPAID, SICK
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None  # YYYY-MM-DD
    shift_code: Optional[str] = "ALL"
    reason: str
    substitute_user_id: Optional[str] = None


class LeaveRequestUserSummary(BaseModel):
    id: str
    full_name: str
    employee_code: str
    role: Optional[str] = None


class LeaveRequestItem(BaseModel):
    id: str
    leave_type: str
    leave_type_label: str
    start_date: str
    end_date: str
    shift_code: Optional[str] = None
    reason: str
    status: str
    user: Optional[LeaveRequestUserSummary] = None
    substitute_user: Optional[LeaveRequestUserSummary] = None
    reviewer_name: Optional[str] = None
    review_note: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: Optional[str] = None


class LeaveRequestReviewRequest(BaseModel):
    action: str  # "APPROVED" | "REJECTED"
    review_note: Optional[str] = None


class AdminRosterDayHeader(BaseModel):
    date: str
    day: int
    weekday_label: str
    is_weekend: bool
    is_today: bool


class AdminRosterUserRow(BaseModel):
    user_id: str
    employee_code: str
    full_name: str
    role: str
    shifts: dict[str, str]
    total_shifts: int


class AdminDailyStaffCounts(BaseModel):
    counts: dict[str, int]
    total_working: int


class AdminRosterResponse(BaseModel):
    month: str
    year: int
    month_number: int
    today: str
    days_header: list[AdminRosterDayHeader]
    users: list[AdminRosterUserRow]
    daily_staff_count: dict[str, AdminDailyStaffCounts]
    shift_definitions: dict[str, ShiftDefinitionItem]


class AdminShiftAssignItem(BaseModel):
    user_id: str
    work_date: str
    shift_code: str
    notes: Optional[str] = None


class AdminShiftAssignRequest(BaseModel):
    assignments: list[AdminShiftAssignItem]


class AdminAutoPatternRequest(BaseModel):
    month: str
    user_ids: list[str] = []
    pattern_type: str = "THREE_SHIFT_FOUR_TEAM"  # "THREE_SHIFT_FOUR_TEAM" | "STANDARD_WEEKDAY"


class AdminAutoPatternPreviewResponse(BaseModel):
    month: str
    pattern_type: str
    total_assignments: int
    changed_count: int
    unchanged_count: int
    leave_conflicts_count: int
    insufficient_rest_count: int
    understaffed_shifts_count: int
    sample_changes: list[dict[str, Any]] = []


# ==============================================================================
# MAP OPERATIONS SCHEMAS (PHASE 2)
# ==============================================================================
class OperationalZoneOut(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    map_polygon: str
    is_active: bool
    assigned_user: Optional[UserOut] = None
    total_meters: int = 0
    confirmed_count: int = 0
    review_count: int = 0
    overdue_count: int = 0
    due_count: int = 0
    pending_count: int = 0
    completion_percent: float = 0.0


class MapMeterOut(BaseModel):
    id: str
    meter_code: str
    name: str
    location: Optional[str] = None
    meter_type: str
    zone_id: Optional[str] = None
    zone_code: Optional[str] = None
    zone_name: Optional[str] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    is_active: bool
    semantic_state: str
    latest_reading_value: Optional[str] = None
    latest_reading_time: Optional[str] = None
    exception_state: Optional[str] = None
    exception_label: Optional[str] = None
    reading_id: Optional[str] = None


class MapOverviewResponse(BaseModel):
    target_date: str
    target_date_vn: str
    selected_round_id: Optional[str] = None
    current_round_time: Optional[str] = None
    current_round_status: Optional[str] = None
    total_meters: int
    confirmed_count: int
    review_count: int
    overdue_count: int
    due_count: int
    pending_count: int
    completion_percent: float
    zones: list[OperationalZoneOut]
    meters: list[MapMeterOut]
    exceptions_count: int



class ZoneReassignRequest(BaseModel):
    user_id: str
    assignment_role: str = "PRIMARY"
    effective_from: Optional[str] = None
    note: Optional[str] = None


class ZoneReassignResponse(BaseModel):
    status: str = "success"
    message: str
    zone_id: str
    user_id: str
    user_name: str


# ==============================================================================
# MAP CONFIGURATION & VERSIONING SCHEMAS (V16)
# ==============================================================================
class MapVersionZoneOut(BaseModel):
    id: str
    map_version_id: str
    zone_id: str
    business_zone_id: str
    display_index: int
    display_label: str
    business_name: str
    presentation_color: str
    icon: str
    polygon_canonical: list[dict[str, Any]]
    label_anchor_canonical: dict[str, Any]
    operator_anchor_canonical: dict[str, Any]
    landmarks: list[dict[str, Any]] = []
    revision: int


class MapVersionSummary(BaseModel):
    id: str
    map_id: str
    map_version: str
    status: str
    revision: int
    created_by_name: Optional[str] = None
    published_by_name: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    published_at: Optional[str] = None
    zones_count: int = 0


class MapVersionOut(BaseModel):
    id: str
    map_id: str
    map_version: str
    coordinate_system: str
    canonical_width: int
    canonical_height: int
    source_asset: str
    status: str
    revision: int
    parent_version_id: Optional[str] = None
    created_by_user_id: Optional[str] = None
    created_by_name: Optional[str] = None
    published_by_user_id: Optional[str] = None
    published_by_name: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    published_at: Optional[str] = None
    zones: list[MapVersionZoneOut] = []


class MapVersionListResponse(BaseModel):
    total: int
    versions: list[MapVersionSummary]


class MapDraftCreateRequest(BaseModel):
    from_version_id: Optional[str] = None
    map_version: Optional[str] = None


class MapZoneUpdateRequest(BaseModel):
    polygon_canonical: Optional[list[dict[str, Any]]] = None
    label_anchor_canonical: Optional[dict[str, Any]] = None
    operator_anchor_canonical: Optional[dict[str, Any]] = None
    landmarks: Optional[list[dict[str, Any]]] = None
    revision: int


class MapValidationResponse(BaseModel):
    valid: bool
    errors: list[str] = []
    warnings: list[str] = []
    zones_count: int
    simple_polygons: bool
    meters_contained: int
    total_meters: int
    anchors_valid: bool
    landmarks_valid: bool
    route_review_required: bool = False
    route_issues: list[str] = []


class MapPublishResponse(BaseModel):
    status: str = "success"
    map_version: str
    published_at: str
    message: str


class MapRollbackRequest(BaseModel):
    reason: Optional[str] = "Phục hồi phiên bản lịch sử"


