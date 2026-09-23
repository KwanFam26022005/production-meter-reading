from datetime import date, datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator



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
    photo_sha256: Optional[str] = None
    payload_sha256: Optional[str] = None
    client_submission_id: Optional[str] = None


class AttendanceTodayResponse(BaseModel):
    date: str
    check_in: Optional[AttendanceEventDetail] = None
    check_out: Optional[AttendanceEventDetail] = None
    allowed_action: Optional[Literal["CHECK_IN", "CHECK_OUT"]] = None


class AttendanceActionResponse(BaseModel):
    status: Literal["success"] = "success"
    id: Optional[str] = None
    event_type: Literal["CHECK_IN", "CHECK_OUT"]
    server_timestamp: str
    formatted_time: str
    message: str
    photo_sha256: Optional[str] = None
    payload_sha256: Optional[str] = None
    client_submission_id: Optional[str] = None


# ==============================================================================
# METER MASTER & READING BATCH SCHEMAS
# ==============================================================================
class MeterOut(BaseModel):
    id: str
    meter_code: str
    name: str
    location: Optional[str] = None
    meter_type: str = "UNKNOWN"
    utility_type: Optional[str] = "UNKNOWN"
    is_active: bool = True
    lifecycle_status: str = "ACTIVE"
    retired_at: Optional[str] = None
    retired_by: Optional[str] = None
    retirement_reason: Optional[str] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    presentation_zone_id: Optional[str] = None
    presentation_zone_name: Optional[str] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    route_status: Optional[str] = "VALID"


class BatchProgress(BaseModel):
    total: int
    confirmed: int
    review: int
    pending: int
    # Explicit batch metrics. The legacy fields above remain for compatibility.
    unique_meter_count: Optional[int] = None
    scheduled_slot_count: Optional[int] = None
    confirmed_slot_count: Optional[int] = None
    review_slot_count: Optional[int] = None
    pending_slot_count: Optional[int] = None


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
    status: Literal["OPEN", "CLOSED", "CANCELLED"]
    is_legacy: bool = False
    # Thread 9A
    scope_mode: Literal["SNAPSHOT", "LEGACY_DYNAMIC"] = "LEGACY_DYNAMIC"
    timing_state: Literal["CURRENT", "PAST", "UPCOMING", "CANCELLED"]
    progress: BatchProgress
    scope_meter_count: Optional[int] = None  # populated for SNAPSHOT rounds


# Thread 9A: Scope row returned in admin scope detail view
class ReadingRoundMeterOut(BaseModel):
    id: str
    reading_round_id: str
    meter_id: Optional[str] = None
    meter_code_snapshot: str
    meter_name_snapshot: Optional[str] = None
    zone_id_snapshot: Optional[str] = None
    presentation_zone_id_snapshot: Optional[str] = None
    utility_type_snapshot: Optional[str] = None
    scope_origin: str
    scope_status: str
    created_at: str


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
    scope_item_id: Optional[str] = None
    scope_origin: Optional[str] = None
    scope_status: Optional[str] = None
    scope_zone_id_snapshot: Optional[str] = None
    scope_presentation_zone_id_snapshot: Optional[str] = None
    scope_utility_type_snapshot: Optional[str] = None
    current_zone_id: Optional[str] = None
    current_zone_name: Optional[str] = None
    current_presentation_zone_id: Optional[str] = None
    current_presentation_zone_name: Optional[str] = None
    meter_availability: Optional[Literal["AVAILABLE", "INACTIVE", "RETIRED", "MISSING"]] = None
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
    meter_availability: Optional[Literal["AVAILABLE", "INACTIVE", "RETIRED", "MISSING"]] = None


class TodayOperationsSummary(BaseModel):
    total_meters: int
    confirmed_current: int
    pending_current: int
    review_current: int
    percent_current: int
    scheduled_meter_count: Optional[int] = None


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


class MeterReadingReconciliationResponse(BaseModel):
    exists: bool
    reading_id: Optional[str] = None
    meter_id: str
    round_id: str
    batch_id: Optional[str] = None
    reading_status: Optional[str] = None  # "CONFIRMED" | "REVIEW" | None
    reading: Optional[str] = None
    ocr_reading: Optional[str] = None
    confirmation_source: Optional[str] = None
    server_timestamp: Optional[str] = None
    formatted_time: Optional[str] = None
    recorded_by_employee_code: Optional[str] = None



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


class AdminMeterRetireRequest(BaseModel):
    reason: Optional[str] = None


class AdminMeterItem(BaseModel):
    id: str
    meter_code: str
    name: str
    location: Optional[str] = None
    meter_type: str
    utility_type: Optional[str] = "UNKNOWN"
    is_active: bool
    lifecycle_status: str = "ACTIVE"
    retired_at: Optional[str] = None
    retired_by: Optional[str] = None
    retirement_reason: Optional[str] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    presentation_zone_id: Optional[str] = None
    presentation_zone_name: Optional[str] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    route_status: str = "VALID"
    data_origin: Optional[str] = "SIMULATED"
    scenario_id: Optional[str] = None
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
    retired_count: int = 0
    meters: list[AdminMeterItem]


ScopeMode = Literal["ALL_ELIGIBLE", "BY_ZONE", "BY_UTILITY", "SELECTED_METERS"]


class AdminScheduleScopeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: ScopeMode
    zone_ids: Optional[list[str]] = None
    utility_types: Optional[list[Literal["ELECTRICITY", "WATER", "OTHER", "UNKNOWN"]]] = None
    meter_ids: Optional[list[str]] = None

    @model_validator(mode="after")
    def validate_scope_selection(self) -> "AdminScheduleScopeRequest":
        zones = self.zone_ids or []
        utilities = self.utility_types or []
        meters = self.meter_ids or []
        if self.mode == "ALL_ELIGIBLE":
            valid = not zones and not utilities and not meters
        elif self.mode == "BY_ZONE":
            valid = bool(zones) and not utilities and not meters
        elif self.mode == "BY_UTILITY":
            valid = bool(utilities) and not zones and not meters
        else:
            valid = bool(meters) and not zones and not utilities
        if not valid:
            raise ValueError("Phạm vi công tơ không hợp lệ hoặc thiếu lựa chọn bắt buộc.")
        selected_values = zones if self.mode == "BY_ZONE" else utilities if self.mode == "BY_UTILITY" else meters if self.mode == "SELECTED_METERS" else []
        if len(selected_values) != len(set(selected_values)):
            raise ValueError("Không được chọn trùng công tơ, khu vực hoặc tiện ích.")
        return self


class AdminScheduleScopeInvalidSelection(BaseModel):
    id: str
    reason: Literal["NOT_FOUND", "INACTIVE", "RETIRED", "UNKNOWN_ZONE", "NO_ELIGIBLE_METERS"]
    label: Optional[str] = None


class AdminScheduleZoneSummary(BaseModel):
    zone_id: Optional[str] = None
    zone_name: str
    meter_count: int


class AdminScheduleScopeSummary(BaseModel):
    mode: ScopeMode
    meter_count: int
    electricity_count: int
    water_count: int
    other_count: int
    zones: list[AdminScheduleZoneSummary] = Field(default_factory=list)
    invalid_selections: list[AdminScheduleScopeInvalidSelection] = Field(default_factory=list)
    fingerprint: str


class AdminSchedulePreviewRequest(BaseModel):
    date: str
    start_time: str = "08:00"
    end_time: str = "17:00"
    interval_minutes: int = 60
    batch_id: Optional[str] = None
    scope: AdminScheduleScopeRequest = Field(default_factory=lambda: AdminScheduleScopeRequest(mode="ALL_ELIGIBLE"))


class AdminSchedulePreviewRound(BaseModel):
    scheduled_at: str
    scheduled_local: str
    scheduled_time_only: str
    is_conflict: bool = False
    existing_round_id: Optional[str] = None
    meter_count: int = 0


class AdminSchedulePreviewResponse(BaseModel):
    batch_id: str
    batch_name: str
    target_date: str
    total_proposed: int
    conflict_count: int
    rounds: list[AdminSchedulePreviewRound]
    scope: AdminScheduleScopeSummary


class AdminScheduleCreateRequest(BaseModel):
    date: str
    start_time: str = "08:00"
    end_time: str = "17:00"
    interval_minutes: int = 60
    batch_id: Optional[str] = None
    scope: AdminScheduleScopeRequest = Field(default_factory=lambda: AdminScheduleScopeRequest(mode="ALL_ELIGIBLE"))
    expected_scope_fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")



class AdminScheduleCreateResponse(BaseModel):
    status: Literal["success"] = "success"
    batch_id: str
    batch_name: str
    created_count: int
    message: str
    rounds: list[ReadingRoundOut]
    # Thread 9A: present when scope was materialized
    scope_materialized_count: Optional[int] = None  # total ReadingRoundMeter rows created
    scope_fingerprint: Optional[str] = None


class AdminScheduleDeleteResponse(BaseModel):
    status: Literal["success"] = "success"
    deleted_count: int
    cancelled_count: int = 0
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


class OperationalAssignmentItemRequest(BaseModel):
    user_id: str
    zone_id: str
    assignment_role: Literal["PRIMARY", "SUPPORT"]
    notes: Optional[str] = None


class OperationalAssignmentBatchRequest(BaseModel):
    work_date: date
    shift_code: Literal["CA1", "CA2", "CA3", "HC"]
    items: list[OperationalAssignmentItemRequest] = Field(min_length=1)


class OperationalAssignmentOut(BaseModel):
    id: str
    user_id: str
    employee_code: str
    employee_name: str
    zone_id: str
    zone_code: str
    zone_name: str
    work_date: str
    shift_code: str
    assignment_role: Literal["PRIMARY", "SUPPORT"]
    status: Literal["ASSIGNED", "CANCELLED"]
    timing_state: Literal["UPCOMING", "CURRENT", "PAST", "CANCELLED"]
    source: str
    notes: Optional[str] = None
    created_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    cancel_reason: Optional[str] = None
    actionable: bool = False


class OperationalAssignmentPreviewItem(OperationalAssignmentItemRequest):
    errors: list[str]
    warnings: list[str]
    outcome: Literal["CREATE", "CONFLICT"]


class OperationalAssignmentPreviewResponse(BaseModel):
    work_date: str
    shift_code: str
    items: list[OperationalAssignmentPreviewItem]
    conflict_count: int
    warning_count: int


class OperationalStaffAvailability(BaseModel):
    id: str
    employee_code: str
    full_name: str
    state: str
    assignable: bool
    warning: Optional[str] = None
    shift_code: Optional[str] = None


class OperationalZoneAssignmentBoardItem(BaseModel):
    id: str
    code: str
    name: str
    is_active: bool
    default_user_id: Optional[str] = None
    assignments: list[OperationalAssignmentOut]


class OperationalAssignmentBoardResponse(BaseModel):
    work_date: str
    shift_code: str
    shift_start: str
    shift_end: str
    zones: list[OperationalZoneAssignmentBoardItem]
    staff: list[OperationalStaffAvailability]
    cancelled: list[OperationalAssignmentOut]


class OperationalAssignmentCancelRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=100)


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
    assignment_impact_count: int = 0
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
    utility_type: Optional[str] = "UNKNOWN"
    zone_id: Optional[str] = None
    zone_code: Optional[str] = None
    zone_name: Optional[str] = None
    presentation_zone_id: Optional[str] = None
    presentation_zone_name: Optional[str] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    is_active: bool
    lifecycle_status: str = "ACTIVE"
    retired_at: Optional[str] = None
    retired_by: Optional[str] = None
    retirement_reason: Optional[str] = None
    semantic_state: str
    latest_reading_value: Optional[str] = None
    latest_reading_time: Optional[str] = None
    exception_state: Optional[str] = None
    exception_label: Optional[str] = None
    reading_id: Optional[str] = None
    data_origin: Optional[str] = "VERIFIED"
    scenario_id: Optional[str] = None


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
    presentation_id: Optional[str] = None
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
    geometry_schema_version: Optional[str] = "1.0"
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


class ActiveMapConfigurationResponse(BaseModel):
    id: str
    map_id: str
    version_id: str
    version_number: str
    map_version: str
    coordinate_system: str
    canonical_width: int
    canonical_height: int
    source_asset: str
    source_checksum: Optional[str] = None
    geometry_schema_version: str = "1.0"
    status: str
    revision: int
    published_at: Optional[str] = None
    zones: list[MapVersionZoneOut] = []
    landmarks: list[dict[str, Any]] = []
    source: Literal["db", "fallback"] = "db"
    authoritative: bool = True


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


class ValidationIssue(BaseModel):
    code: str
    severity: Literal["ERROR", "WARNING", "INFO"]
    entity_type: Literal["ZONE", "METER", "ANCHOR", "LANDMARK", "MAP"]
    entity_id: Optional[str] = None
    message: str


class MapValidationResponse(BaseModel):
    valid: bool
    errors: list[str] = []
    warnings: list[str] = []
    issues: list[ValidationIssue] = []
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
    version_id: Optional[str] = None
    version_number: Optional[str] = None
    map_version: str
    published_at: str
    message: str
    coordinate_system: Optional[str] = None
    canonical_width: Optional[int] = None
    canonical_height: Optional[int] = None


class MapRollbackRequest(BaseModel):
    reason: Optional[str] = "Phục hồi phiên bản lịch sử"


# ==============================================================================
# ASSET-CENTRIC DOMAIN & TOPOLOGY SCHEMAS (V16C)
# ==============================================================================

AssetType = Literal[
    "SUBSTATION",
    "TRANSFORMER",
    "FEEDER",
    "SWITCHBOARD",
    "QUAY_CRANE",
    "RTG",
    "VEHICLE",
    "PUMP",
    "COMPRESSOR",
    "MACHINE",
    "WAREHOUSE",
    "WORKSHOP",
    "OFFICE",
    "WATER_POINT",
    "FIRE_WATER_POINT",
    "SHORE_POWER_POINT",
    "OTHER",
]

AssetMobilityType = Literal["FIXED", "MOBILE"]
AssetPositionSource = Literal["STATIC_MAP", "ASSIGNED", "LAST_KNOWN", "GPS", "UNKNOWN"]
AssetLifecycleStatus = Literal["ACTIVE", "INACTIVE", "RETIRED"]
AssetVerificationStatus = Literal["UNVERIFIED", "VERIFIED", "REJECTED", "SIMULATION_APPROVED"]

MeterAssetRelationType = Literal["INSTALLED_AT", "MEASURES"]
UtilityType = Literal["ELECTRICITY", "WATER", "OTHER"]
AssetConnectionType = Literal["SUPPLIES", "CONNECTED_TO"]


class AssetCreateRequest(BaseModel):
    code: str
    name: str
    asset_type: str
    parent_asset_id: Optional[str] = None
    zone_id: Optional[str] = None
    mobility_type: Optional[str] = "FIXED"
    position_source: Optional[str] = "UNKNOWN"
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    verification_status: Optional[str] = "UNVERIFIED"
    metadata_json: Optional[str] = None
    data_origin: Optional[str] = None
    scenario_id: Optional[str] = None


class AssetUpdateRequest(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    parent_asset_id: Optional[str] = None
    zone_id: Optional[str] = None
    mobility_type: Optional[str] = None
    position_source: Optional[str] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    lifecycle_status: Optional[str] = None
    verification_status: Optional[str] = None
    metadata_json: Optional[str] = None


class AssetRelocateRequest(BaseModel):
    map_x: float
    map_y: float
    position_source: Optional[str] = "STATIC_MAP"


class AssetSetParentRequest(BaseModel):
    parent_asset_id: Optional[str] = None


class AssetRetireRequest(BaseModel):
    reason: Optional[str] = None


class AssetSummary(BaseModel):
    id: str
    code: str
    name: str
    asset_type: str
    lifecycle_status: str
    verification_status: str
    data_origin: Optional[str] = "SIMULATED"
    scenario_id: Optional[str] = None


class AssetResponse(BaseModel):
    id: str
    code: str
    name: str
    asset_type: str
    parent_asset_id: Optional[str] = None
    parent_asset: Optional[AssetSummary] = None
    zone_id: Optional[str] = None
    zone_code: Optional[str] = None
    zone_name: Optional[str] = None
    mobility_type: str
    position_source: str
    map_x: Optional[float] = None
    map_y: Optional[float] = None
    lifecycle_status: str
    verification_status: str
    position_verification_status: str = "UNVERIFIED"
    source: str = "MANUAL_ENTRY"
    contained_in_zone: Optional[bool] = None
    presentation_zone_id: Optional[str] = None
    warning: Optional[str] = None
    metadata_json: Optional[str] = None
    child_count: int = 0
    attached_meters_count: int = 0
    data_origin: Optional[str] = "SIMULATED"
    scenario_id: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class AssetListResponse(BaseModel):
    total: int
    assets: list[AssetResponse]


# Meter-Asset Relations
class MeterAssetRelationCreateRequest(BaseModel):
    meter_id: str
    asset_id: str
    relation_type: str  # INSTALLED_AT | MEASURES
    mount_point: Optional[str] = None
    is_primary: bool = True
    verification_status: Optional[str] = "UNVERIFIED"
    confidence: Optional[str] = "MEDIUM"
    source: Optional[str] = "MANUAL_ENTRY"
    notes: Optional[str] = None


class MeterAssetRelationTransferRequest(BaseModel):
    new_asset_id: str
    mount_point: Optional[str] = None
    is_primary: bool = True


class MeterAssetRelationResponse(BaseModel):
    id: str
    meter_id: str
    meter_code: str
    meter_name: str
    asset_id: str
    asset_code: str
    asset_name: str
    relation_type: str
    mount_point: Optional[str] = None
    is_primary: bool
    verification_status: str
    confidence: Optional[str] = "MEDIUM"
    source: Optional[str] = "MANUAL_ENTRY"
    notes: Optional[str] = None
    data_origin: Optional[str] = "SIMULATED"
    scenario_id: Optional[str] = None
    valid_from: str
    valid_to: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None


class MeterAssetRelationListResponse(BaseModel):
    total: int
    relations: list[MeterAssetRelationResponse]


# Asset Connections (Topology)
class AssetConnectionCreateRequest(BaseModel):
    source_asset_id: str
    target_asset_id: str
    utility_type: str  # ELECTRICITY | WATER | OTHER
    connection_type: Optional[str] = "SUPPLIES"  # SUPPLIES | CONNECTED_TO
    verification_status: Optional[str] = "UNVERIFIED"
    confidence: Optional[str] = "MEDIUM"
    source: Optional[str] = "MANUAL_ENTRY"
    metadata_json: Optional[str] = None


class AssetConnectionResponse(BaseModel):
    id: str
    source_asset_id: str
    source_asset_code: str
    source_asset_name: str
    target_asset_id: str
    target_asset_code: str
    target_asset_name: str
    utility_type: str
    connection_type: str
    verification_status: str
    confidence: Optional[str] = "MEDIUM"
    source: Optional[str] = "MANUAL_ENTRY"
    data_origin: Optional[str] = "SIMULATED"
    scenario_id: Optional[str] = None
    valid_from: str
    valid_to: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None


class AssetConnectionListResponse(BaseModel):
    total: int
    connections: list[AssetConnectionResponse]


class TopologyTraceResponse(BaseModel):
    root_asset_id: str
    direction: str
    utility_type: Optional[str] = None
    include_unverified: bool
    nodes: list[AssetResponse]
    edges: list[AssetConnectionResponse]


# ==============================================================================
# V16D — VERIFICATION, EVIDENCE & DISCOVERY INGESTION SCHEMAS
# ==============================================================================

class VerificationEvidenceResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    evidence_type: str
    evidence_reference: str
    notes: Optional[str] = None
    verified_by: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: str
    created_at: str


class AssetVerifyRequest(BaseModel):
    evidence_type: str  # FIELD_INSPECTION | MENTOR_CONFIRMATION | PORT_DOCUMENT | EQUIPMENT_NAMEPLATE | METER_PHOTO | ELECTRICAL_DRAWING | WATER_DRAWING | SCADA_CONFIG | OTHER
    evidence_reference: str
    notes: Optional[str] = None


class AssetRejectRequest(BaseModel):
    reason: str
    notes: Optional[str] = None


class AssetVerifyPositionRequest(BaseModel):
    map_x: float
    map_y: float
    evidence_type: str = "FIELD_INSPECTION"
    evidence_reference: str = "Xác nhận vị trí"
    notes: Optional[str] = None


class RelationVerifyRequest(BaseModel):
    evidence_type: str
    evidence_reference: str
    is_primary: bool = True
    mount_point: Optional[str] = None
    notes: Optional[str] = None


class RelationRejectRequest(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None


class ConnectionVerifyRequest(BaseModel):
    evidence_type: str
    evidence_reference: str
    notes: Optional[str] = None


class ConnectionRejectRequest(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None


class MeterMetadataUpdateRequest(BaseModel):
    reading_method: Optional[str] = None  # MANUAL | OCR | PULSE | MODBUS | PLC | SCADA | UNKNOWN
    communication_protocol: Optional[str] = None  # NONE | PULSE | RS485 | MODBUS_RTU | MODBUS_TCP | PLC | OTHER | UNKNOWN
    utility_type: Optional[str] = None  # ELECTRICITY | WATER | OTHER | UNKNOWN


class CandidateImportRequest(BaseModel):
    proposals_file: Optional[str] = None
    relations_file: Optional[str] = None


class CandidateImportResponse(BaseModel):
    imported_assets: int
    updated_assets: int
    imported_relations: int
    updated_relations: int
    total_candidates: int
    message: str


class AssetVerificationSummaryResponse(BaseModel):
    assetCandidates: int
    verifiedAssets: int
    unverifiedAssets: int
    rejectedAssets: int
    meterRelations: int
    verifiedMeterRelations: int
    unverifiedMeterRelations: int
    topologyConnections: int
    verifiedTopologyConnections: int
    spatialReviewMeters: list[str]
    missingInformationCounts: dict[str, int]


class MeterReviewMatrixItem(BaseModel):
    meter_code: str
    name: str
    utility: str
    proposed_measures: Optional[str] = None
    measures_confidence: Optional[str] = None
    measures_verification: str
    proposed_installed_at: Optional[str] = None
    installed_at_verification: str
    asset_position_known: bool
    reading_method: str
    missing_info: list[str]
    is_spatial_review_required: bool


# ==============================================================================
# V16E — ASSET-CENTRIC MAP & UTILITY NETWORK TOPOLOGY SCHEMAS
# ==============================================================================

class AssetNetworkStats(BaseModel):
    total_nodes: int
    total_edges: int
    verified_nodes: int
    verified_edges: int
    unverified_nodes: int
    unverified_edges: int


class AssetNetworkResponse(BaseModel):
    utility_type: Optional[str] = None
    focus_asset_id: Optional[str] = None
    verified_only: bool = True
    nodes: list[AssetResponse]
    edges: list[AssetConnectionResponse]
    stats: AssetNetworkStats


class AssetAttachedMeterContext(BaseModel):
    relation_id: str
    relation_type: str  # INSTALLED_AT | MEASURES
    is_primary: bool
    verification_status: str
    meter_id: str
    meter_code: str
    meter_name: str
    meter_type: Optional[str] = None
    utility_type: Optional[str] = None
    lifecycle_status: str
    latest_reading_value: Optional[str] = None
    latest_reading_status: Optional[str] = None
    latest_reading_time: Optional[str] = None


class AssetOperationalContextResponse(BaseModel):
    asset: AssetResponse
    meters: list[AssetAttachedMeterContext]
    upstream_connections: list[AssetConnectionResponse]
    downstream_connections: list[AssetConnectionResponse]
    presentation_zone_id: Optional[str] = None
    presentation_zone_name: Optional[str] = None
    spatial_status: str  # VERIFIED | UNVERIFIED | MISSING_COORDINATES
