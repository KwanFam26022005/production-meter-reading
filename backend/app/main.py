from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from . import auth, attendance, meter_logbook, admin
from .admin import (
    change_admin_meter_zone,
    create_admin_meter,
    create_admin_schedules,
    delete_admin_meter,
    delete_admin_schedule_round,
    delete_admin_schedules_by_date,
    get_admin_audit_logs,
    get_admin_dashboard,
    get_admin_meter_latest_reading,
    get_admin_meter_reading_detail,
    get_admin_meter_reading_evidence_path,
    get_admin_meters,
    get_admin_schedules_list,
    preview_admin_schedules,
    relocate_admin_meter,
    retire_admin_meter,
    set_meter_active_state,
    update_admin_meter,
)
from .map_config import (
    create_map_draft,
    delete_map_draft,
    get_active_map_config,
    get_current_draft,
    get_map_version_detail,
    list_map_versions,
    publish_map_version,
    rollback_map_version,
    update_draft_zone,
    validate_map_version_geometry,
)
from .schemas import (
    ActiveMapConfigurationResponse,
    AdminMeterChangeZoneRequest,
    AdminMeterRelocateRequest,
    MapDraftCreateRequest,
    MapPublishResponse,
    MapRollbackRequest,
    MapValidationResponse,
    MapVersionListResponse,
    MapVersionOut,
    MapVersionZoneOut,
    MapZoneUpdateRequest,
)
from .attendance import get_local_time_str, get_today_attendance_summary, record_attendance
from .meter_logbook import (
    calculate_batch_progress,
    calculate_round_progress,
    confirm_meter_reading,
    determine_round_timing_state,
    get_batch_meters_with_status,
    get_batch_rounds_with_progress,
    get_current_or_nearest_round,
    get_meter_history,
    get_open_reading_batch,
    get_round_local_time_str,
    get_round_meters_with_status,
    get_round_time_only_str,
    get_today_meter_operations,
    mark_meter_review,
)
from .auth import (
    clear_session_cookie,
    create_user_session,
    enforce_csrf,
    generate_csrf_token,
    get_current_active_user,
    get_current_session_and_user,
    get_current_user,
    login_rate_limiter,
    require_admin,
    set_session_cookie,
    verify_password,
)
from .config import get_settings
from .db import get_db, init_db
from .inference import MeterReader, decode_image
from .models import Meter, MeterReading, ReadingBatch, ReadingRound, SessionModel, User
from .reporting import export_report_csv, get_meter_report, get_report_overview
from .schemas import (
    AdminAuditLogListResponse,
    AdminDashboardResponse,
    AdminMeterCreateRequest,
    AdminMeterItem,
    AdminMeterLatestReadingResponse,
    AdminMeterListResponse,
    AdminMeterReadingInspectionResponse,
    AdminMeterRelocateRequest,
    AdminMeterRetireRequest,
    AdminMeterUpdateRequest,
    AdminScheduleCreateRequest,
    AdminScheduleCreateResponse,
    AdminScheduleDeleteResponse,
    AdminSchedulePreviewRequest,
    AdminSchedulePreviewResponse,
    AttendanceActionResponse,
    AttendanceTodayResponse,
    BatchMeterListResponse,
    ConfirmReadingRequest,
    CsrfResponse,
    HealthResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    MarkReviewRequest,
    MeterDetailResponse,
    MeterOut,
    MeterReadResponse,
    MeterReadingActionResponse,
    MeterReadingHistoryItem,
    ReadingBatchCurrentResponse,
    ReadingRoundCurrentResponse,
    ReadingRoundListResponse,
    ReadingRoundOut,
    ReportMeterDetailResponse,
    ReportOverviewResponse,
    RoundMeterListResponse,
    TodayOperationsResponse,
    UserOut,
    AssetCreateRequest,
    AssetUpdateRequest,
    AssetRelocateRequest,
    AssetSetParentRequest,
    AssetRetireRequest,
    AssetResponse,
    AssetListResponse,
    MeterAssetRelationCreateRequest,
    MeterAssetRelationTransferRequest,
    MeterAssetRelationResponse,
    MeterAssetRelationListResponse,
    AssetConnectionCreateRequest,
    AssetConnectionResponse,
    AssetConnectionListResponse,
    AssetNetworkResponse,
    AssetOperationalContextResponse,
    TopologyTraceResponse,
    VerificationEvidenceResponse,
    AssetVerifyRequest,
    AssetRejectRequest,
    AssetVerifyPositionRequest,
    RelationVerifyRequest,
    RelationRejectRequest,
    ConnectionVerifyRequest,
    ConnectionRejectRequest,
    MeterMetadataUpdateRequest,
    CandidateImportRequest,
    CandidateImportResponse,
    AssetVerificationSummaryResponse,
    MeterReviewMatrixItem,
)
from .asset_operations import (
    list_assets,
    get_asset_by_id,
    create_asset,
    update_asset,
    relocate_asset,
    set_asset_parent,
    set_asset_lifecycle_state,
    create_meter_asset_relation,
    list_meter_asset_relations,
    close_meter_asset_relation,
    transfer_meter_asset_relation,
    verify_meter_asset_relation,
    reject_meter_asset_relation,
    create_asset_connection,
    list_asset_connections,
    close_asset_connection,
    verify_asset_connection,
    verify_asset_connection_with_evidence,
    reject_asset_connection,
    trace_asset_topology,
    get_asset_network,
    get_asset_operational_context,
    import_candidate_proposals,
    verify_asset,
    reject_asset_verification,
    reopen_asset_review,
    verify_asset_position,
    update_meter_metadata,
    get_verification_summary,
    get_meter_review_matrix,
    get_entity_verification_evidences,
)

settings = get_settings()
reader = MeterReader(settings)


import logging

logger = logging.getLogger(__name__)
is_production = settings.environment.lower() == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    init_db()
    # Eagerly load AI models so model/config errors surface at startup
    try:
        reader.load()
    except Exception as e:
        if is_production:
            raise
        logger.warning(f"Could not load ML models on startup: {e}")
    yield


app = FastAPI(
    title="Production Meter Reading & Attendance API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(StarletteHTTPException)
async def custom_starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 400 and "parsing the body" in str(exc.detail):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": f"Dung lượng ảnh chấm công vượt quá giới hạn {settings.max_attendance_upload_mb}MB."},
        )
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=getattr(exc, "headers", None))


# ==============================================================================
# PUBLIC HEALTH ENDPOINT
# ==============================================================================
@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        pipeline_version=settings.pipeline_version,
        models_loaded=reader.loaded,
    )


# ==============================================================================
# AUTHENTICATION ENDPOINTS
# ==============================================================================
@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{req.employee_code.strip()}"

    if login_rate_limiter.is_rate_limited(rate_limit_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Đăng nhập sai quá 5 lần. Vui lòng thử lại sau ít phút.",
        )

    user = (
        db.query(User)
        .filter(User.employee_code == req.employee_code.strip())
        .first()
    )

    if not user or not user.is_active or not verify_password(req.password, user.password_hash):
        login_rate_limiter.record_failed_attempt(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã nhân viên hoặc mật khẩu không chính xác.",
        )

    login_rate_limiter.reset(rate_limit_key)

    user_agent = request.headers.get("User-Agent")
    _, token = create_user_session(db, user, user_agent=user_agent, ip_address=client_ip)
    set_session_cookie(response, token)

    return LoginResponse(
        status="ok",
        user=UserOut(
            id=user.id,
            employee_code=user.employee_code,
            full_name=user.full_name,
            role=user.role,
        ),
    )


@app.post("/api/v1/auth/logout", response_model=LogoutResponse, dependencies=[Depends(enforce_csrf)])
def logout(
    response: Response,
    auth_data: tuple[SessionModel, User, str] = Depends(get_current_session_and_user),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    session_obj, _, _ = auth_data
    session_obj.revoked_at = datetime.now(timezone.utc)
    db.commit()
    clear_session_cookie(response)
    return LogoutResponse(status="ok", message="Đã đăng xuất thành công.")


@app.get("/api/v1/auth/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(
        id=user.id,
        employee_code=user.employee_code,
        full_name=user.full_name,
        role=user.role,
    )


@app.get("/api/v1/auth/csrf", response_model=CsrfResponse)
def get_csrf_token(auth_data: tuple[SessionModel, User, str] = Depends(get_current_session_and_user)) -> CsrfResponse:
    _, _, token = auth_data
    csrf_token = generate_csrf_token(token)
    return CsrfResponse(csrf_token=csrf_token)


# ==============================================================================
# ATTENDANCE ENDPOINTS
# ==============================================================================
@app.get("/api/v1/attendance/today", response_model=AttendanceTodayResponse)
def get_attendance_today(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceTodayResponse:
    data = get_today_attendance_summary(db, user.id)
    return AttendanceTodayResponse(**data)


@app.post(
    "/api/v1/attendance/check-in",
    response_model=AttendanceActionResponse,
    dependencies=[Depends(enforce_csrf)],
)
async def check_in(
    file: UploadFile = File(...),
    capture_source: str = Form("live_camera"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceActionResponse:
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Chỉ hỗ trợ tệp hình ảnh hợp lệ (JPG, PNG).",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tệp ảnh tải lên bị trống.")

    current_settings = get_settings()
    if len(data) > current_settings.max_attendance_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dung lượng ảnh chấm công vượt quá giới hạn {current_settings.max_attendance_upload_mb}MB.",
        )

    event = record_attendance(
        db=db,
        user=user,
        event_type="CHECK_IN",
        image_bytes=data,
        capture_source=capture_source,
    )

    formatted = get_local_time_str(event.server_timestamp)
    return AttendanceActionResponse(
        status="success",
        event_type="CHECK_IN",
        server_timestamp=event.server_timestamp.isoformat(),
        formatted_time=formatted,
        message=f"Đã ghi nhận vào ca thành công lúc {formatted}.",
    )


@app.post(
    "/api/v1/attendance/check-out",
    response_model=AttendanceActionResponse,
    dependencies=[Depends(enforce_csrf)],
)
async def check_out(
    file: UploadFile = File(...),
    capture_source: str = Form("live_camera"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceActionResponse:
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Chỉ hỗ trợ tệp hình ảnh hợp lệ (JPG, PNG).",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tệp ảnh tải lên bị trống.")

    current_settings = get_settings()
    if len(data) > current_settings.max_attendance_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dung lượng ảnh chấm công vượt quá giới hạn {current_settings.max_attendance_upload_mb}MB.",
        )

    event = record_attendance(
        db=db,
        user=user,
        event_type="CHECK_OUT",
        image_bytes=data,
        capture_source=capture_source,
    )

    formatted = get_local_time_str(event.server_timestamp)
    return AttendanceActionResponse(
        status="success",
        event_type="CHECK_OUT",
        server_timestamp=event.server_timestamp.isoformat(),
        formatted_time=formatted,
        message=f"Đã ghi nhận tan ca thành công lúc {formatted}.",
    )


# ==============================================================================
# METER LOGBOOK & READING BATCH ENDPOINTS
# ==============================================================================
@app.get("/api/v1/reading-batches/current", response_model=ReadingBatchCurrentResponse)
def get_current_reading_batch(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReadingBatchCurrentResponse:
    batch = get_open_reading_batch(db)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chưa có đợt ghi chỉ số đang mở.",
        )
    progress = calculate_batch_progress(db, batch.id)
    return ReadingBatchCurrentResponse(
        id=batch.id,
        name=batch.name,
        period_key=batch.period_key,
        status=batch.status,
        progress=progress,
    )


@app.get("/api/v1/meter-operations/today", response_model=TodayOperationsResponse)
def get_today_operations(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TodayOperationsResponse:
    return get_today_meter_operations(db, date_filter=date)


@app.get("/api/v1/reading-rounds/current", response_model=ReadingRoundCurrentResponse)
def get_current_reading_round(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReadingRoundCurrentResponse:
    batch = get_open_reading_batch(db)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chưa có đợt ghi chỉ số đang mở.",
        )
    batch_progress = calculate_batch_progress(db, batch.id)
    batch_out = ReadingBatchCurrentResponse(
        id=batch.id,
        name=batch.name,
        period_key=batch.period_key,
        status=batch.status,
        progress=batch_progress,
    )

    current_r, upcoming_r = get_current_or_nearest_round(db, batch.id, date_filter=date)

    curr_out = None
    if current_r:
        prog = calculate_round_progress(db, current_r.id)
        sched = current_r.scheduled_at.replace(tzinfo=timezone.utc) if current_r.scheduled_at.tzinfo is None else current_r.scheduled_at
        curr_out = ReadingRoundOut(
            id=current_r.id,
            batch_id=current_r.batch_id,
            scheduled_at=sched.isoformat(),
            scheduled_local=get_round_local_time_str(sched),
            scheduled_time_only=get_round_time_only_str(sched),
            status=current_r.status,
            is_legacy=current_r.is_legacy,
            timing_state="CURRENT",
            progress=prog,
        )

    up_out = None
    if upcoming_r:
        prog = calculate_round_progress(db, upcoming_r.id)
        sched = upcoming_r.scheduled_at.replace(tzinfo=timezone.utc) if upcoming_r.scheduled_at.tzinfo is None else upcoming_r.scheduled_at
        up_out = ReadingRoundOut(
            id=upcoming_r.id,
            batch_id=upcoming_r.batch_id,
            scheduled_at=sched.isoformat(),
            scheduled_local=get_round_local_time_str(sched),
            scheduled_time_only=get_round_time_only_str(sched),
            status=upcoming_r.status,
            is_legacy=upcoming_r.is_legacy,
            timing_state="UPCOMING",
            progress=prog,
        )

    return ReadingRoundCurrentResponse(
        current_round=curr_out,
        nearest_upcoming_round=up_out,
        batch=batch_out,
    )


@app.get("/api/v1/reading-batches/{batch_id}/rounds", response_model=ReadingRoundListResponse)
def get_batch_rounds(
    batch_id: str,
    date: Optional[str] = None,
    include_legacy: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReadingRoundListResponse:
    batch = db.query(ReadingBatch).filter(ReadingBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đợt ghi chỉ số.",
        )
    rounds = get_batch_rounds_with_progress(db, batch.id, date_filter=date, include_legacy=include_legacy)
    return ReadingRoundListResponse(
        batch_id=batch.id,
        batch_name=batch.name,
        period_key=batch.period_key,
        rounds=rounds,
    )


@app.get("/api/v1/reading-rounds/{round_id}/meters", response_model=RoundMeterListResponse)
def get_round_meters(
    round_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RoundMeterListResponse:
    round_obj = db.query(ReadingRound).filter(ReadingRound.id == round_id).first()
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lượt ghi chỉ số.",
        )
    batch = round_obj.batch
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đợt ghi chỉ số tương ứng.",
        )

    now_utc = datetime.now(timezone.utc)
    current_r, _ = get_current_or_nearest_round(db, batch.id)
    is_curr = (current_r and current_r.id == round_obj.id)
    r_sched = round_obj.scheduled_at.replace(tzinfo=timezone.utc) if round_obj.scheduled_at.tzinfo is None else round_obj.scheduled_at
    timing_state = determine_round_timing_state(r_sched, now_utc, is_latest_past=is_curr)
    progress = calculate_round_progress(db, round_obj.id)

    round_out = ReadingRoundOut(
        id=round_obj.id,
        batch_id=round_obj.batch_id,
        scheduled_at=r_sched.isoformat(),
        scheduled_local=get_round_local_time_str(r_sched),
        scheduled_time_only=get_round_time_only_str(r_sched),
        status=round_obj.status,
        timing_state=timing_state,
        progress=progress,
    )

    meters = get_round_meters_with_status(db, round_obj, search=search, status_filter=status)

    return RoundMeterListResponse(
        round=round_out,
        batch_id=batch.id,
        batch_name=batch.name,
        period_key=batch.period_key,
        progress=progress,
        meters=meters,
    )


@app.get("/api/v1/reading-batches/{batch_id}/meters", response_model=BatchMeterListResponse)
def get_batch_meters(
    batch_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BatchMeterListResponse:
    batch = db.query(ReadingBatch).filter(ReadingBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đợt ghi chỉ số.",
        )
    progress = calculate_batch_progress(db, batch.id)
    meter_items = get_batch_meters_with_status(db, batch, search=search, status_filter=status)
    return BatchMeterListResponse(
        batch_id=batch.id,
        batch_name=batch.name,
        period_key=batch.period_key,
        progress=progress,
        meters=meter_items,
    )


@app.post(
    "/api/v1/meter-readings/confirm",
    response_model=MeterReadingActionResponse,
    dependencies=[Depends(enforce_csrf)],
)
def confirm_reading_endpoint(
    payload: ConfirmReadingRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MeterReadingActionResponse:
    reading_record = confirm_meter_reading(db, user, payload)
    formatted = get_local_time_str(reading_record.server_timestamp)
    round_local = ""
    if reading_record.round:
        r_sched = reading_record.round.scheduled_at.replace(tzinfo=timezone.utc) if reading_record.round.scheduled_at.tzinfo is None else reading_record.round.scheduled_at
        round_local = get_round_local_time_str(r_sched)

    return MeterReadingActionResponse(
        status="success",
        reading_id=reading_record.id,
        meter_id=reading_record.meter_id,
        batch_id=reading_record.batch_id,
        reading_round_id=reading_record.reading_round_id,
        round_scheduled_local=round_local,
        reading_status="CONFIRMED",
        reading=reading_record.reading,
        ocr_reading=reading_record.ocr_reading,
        confirmation_source=reading_record.confirmation_source,
        server_timestamp=reading_record.server_timestamp.isoformat(),
        formatted_time=formatted,
        message=f"Đã xác nhận chỉ số {reading_record.reading} thành công lúc {formatted}.",
    )


@app.post(
    "/api/v1/meter-readings/review",
    response_model=MeterReadingActionResponse,
    dependencies=[Depends(enforce_csrf)],
)
def mark_review_endpoint(
    payload: MarkReviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MeterReadingActionResponse:
    reading_record = mark_meter_review(db, user, payload)
    formatted = get_local_time_str(reading_record.server_timestamp)
    round_local = ""
    if reading_record.round:
        r_sched = reading_record.round.scheduled_at.replace(tzinfo=timezone.utc) if reading_record.round.scheduled_at.tzinfo is None else reading_record.round.scheduled_at
        round_local = get_round_local_time_str(r_sched)

    return MeterReadingActionResponse(
        status="success",
        reading_id=reading_record.id,
        meter_id=reading_record.meter_id,
        batch_id=reading_record.batch_id,
        reading_round_id=reading_record.reading_round_id,
        round_scheduled_local=round_local,
        reading_status="REVIEW",
        reading=None,
        server_timestamp=reading_record.server_timestamp.isoformat(),
        formatted_time=formatted,
        message=f"Đã ghi nhận trạng thái Cần kiểm tra lúc {formatted}.",
    )


@app.get("/api/v1/meters/{meter_id}", response_model=MeterDetailResponse)
def get_meter_detail(
    meter_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MeterDetailResponse:
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công tơ.",
        )
    history = get_meter_history(db, meter.id)
    ls = getattr(meter, "lifecycle_status", None) or ("ACTIVE" if meter.is_active else "INACTIVE")
    ret_at = meter.retired_at.isoformat() if getattr(meter, "retired_at", None) else None
    return MeterDetailResponse(
        meter=MeterOut(
            id=meter.id,
            meter_code=meter.meter_code,
            name=meter.name,
            location=meter.location,
            meter_type=meter.meter_type,
            is_active=meter.is_active,
            lifecycle_status=ls,
            retired_at=ret_at,
            retired_by=getattr(meter, "retired_by", None),
            retirement_reason=getattr(meter, "retirement_reason", None),
        ),
        history=history,
    )


@app.get("/api/v1/meters/{meter_id}/readings", response_model=list[MeterReadingHistoryItem])
def get_meter_readings_history(
    meter_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MeterReadingHistoryItem]:
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy công tơ.",
        )
    return get_meter_history(db, meter.id)


# ==============================================================================
# REPORTING & ANALYTICS ENDPOINTS
# ==============================================================================
@app.get("/api/v1/reports/overview", response_model=ReportOverviewResponse)
def get_report_overview_endpoint(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReportOverviewResponse:
    return get_report_overview(db, date_str=date)


@app.get("/api/v1/reports/meters/{meter_id}", response_model=ReportMeterDetailResponse)
def get_meter_report_endpoint(
    meter_id: str,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReportMeterDetailResponse:
    return get_meter_report(db, meter_id=meter_id, date_str=date)


@app.get("/api/v1/reports/export.csv")
def export_report_csv_endpoint(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    csv_content = export_report_csv(db, date_str=date)
    filename_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="bao-cao-cong-to-{filename_date}.csv"'
        },
    )


# ==============================================================================
# PROTECTED METER READING ENDPOINT (FROZEN AI PIPELINE, NO PERSISTENCE)
# ==============================================================================
@app.post(
    "/api/v1/read-meter",
    response_model=MeterReadResponse,
    dependencies=[Depends(enforce_csrf)],
)
async def read_meter(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> MeterReadResponse:
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Chỉ hỗ trợ tệp hình ảnh hợp lệ.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tệp ảnh tải lên bị trống.")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dung lượng ảnh vượt quá giới hạn {settings.max_upload_mb}MB.",
        )

    try:
        # Transient decoding in RAM, NO METER IMAGE PERSISTENCE
        image = decode_image(data)
        result = reader.read(image)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return MeterReadResponse(
        status=result.status,
        reading=result.reading,
        meter_type=result.meter_type,
        det_confidence=result.det_confidence,
        ocr_confidence=result.ocr_confidence,
        localization_imgsz=result.localization_imgsz,
        pipeline_version=settings.pipeline_version,
        roi_bbox=list(result.roi_bbox) if result.roi_bbox else None,
    )


# ==============================================================================
# ADMIN OPERATIONS V1 ENDPOINTS (ADMIN AUTHORIZATION REQUIRED)
# ==============================================================================
@app.get("/api/v1/admin/meters", response_model=AdminMeterListResponse)
def get_admin_meters_endpoint(
    search: Optional[str] = None,
    status: Optional[str] = None,
    meter_type: Optional[str] = None,
    scenario_id: Optional[str] = None,
    data_origin: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterListResponse:
    return get_admin_meters(
        db,
        search=search,
        status_filter=status,
        meter_type=meter_type,
        scenario_id=scenario_id,
        data_origin=data_origin,
    )


@app.post(
    "/api/v1/admin/meters",
    response_model=AdminMeterItem,
    dependencies=[Depends(enforce_csrf)],
)
def create_admin_meter_endpoint(
    payload: AdminMeterCreateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterItem:
    return create_admin_meter(db, admin_user, payload)


@app.patch(
    "/api/v1/admin/meters/{meter_id}",
    response_model=AdminMeterItem,
    dependencies=[Depends(enforce_csrf)],
)
def update_admin_meter_endpoint(
    meter_id: str,
    payload: AdminMeterUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterItem:
    return update_admin_meter(db, admin_user, meter_id, payload)


@app.post(
    "/api/v1/admin/meters/{meter_id}/deactivate",
    response_model=AdminMeterItem,
    dependencies=[Depends(enforce_csrf)],
)
def deactivate_admin_meter_endpoint(
    meter_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterItem:
    return set_meter_active_state(db, admin_user, meter_id, is_active=False)


@app.post(
    "/api/v1/admin/meters/{meter_id}/activate",
    response_model=AdminMeterItem,
    dependencies=[Depends(enforce_csrf)],
)
def activate_admin_meter_endpoint(
    meter_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterItem:
    return set_meter_active_state(db, admin_user, meter_id, is_active=True)


@app.post(
    "/api/v1/admin/meters/{meter_id}/reactivate",
    response_model=AdminMeterItem,
    dependencies=[Depends(enforce_csrf)],
)
def reactivate_admin_meter_endpoint(
    meter_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterItem:
    return set_meter_active_state(db, admin_user, meter_id, is_active=True)


@app.post(
    "/api/v1/admin/meters/{meter_id}/retire",
    response_model=AdminMeterItem,
    dependencies=[Depends(enforce_csrf)],
)
def retire_admin_meter_endpoint(
    meter_id: str,
    payload: Optional[AdminMeterRetireRequest] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterItem:
    return retire_admin_meter(db, actor=admin_user, meter_id=meter_id, payload=payload)


@app.post(
    "/api/v1/admin/meters/{meter_id}/relocate",
    response_model=AdminMeterItem,
    dependencies=[Depends(enforce_csrf)],
)
def relocate_admin_meter_endpoint(
    meter_id: str,
    payload: AdminMeterRelocateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterItem:
    return relocate_admin_meter(db, actor=admin_user, meter_id=meter_id, payload=payload)


@app.post(
    "/api/v1/admin/meters/{meter_id}/change-zone",
    response_model=AdminMeterItem,
    dependencies=[Depends(enforce_csrf)],
)
def change_admin_meter_zone_endpoint(
    meter_id: str,
    payload: AdminMeterChangeZoneRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterItem:
    return change_admin_meter_zone(db, actor=admin_user, meter_id=meter_id, payload=payload)


@app.delete(
    "/api/v1/admin/meters/{meter_id}",
    dependencies=[Depends(enforce_csrf)],
)
def delete_admin_meter_endpoint(
    meter_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return delete_admin_meter(db, actor=admin_user, meter_id=meter_id)



@app.get("/api/v1/admin/schedules", response_model=ReadingRoundListResponse)
def get_admin_schedules_endpoint(
    date: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ReadingRoundListResponse:
    batch, rounds = get_admin_schedules_list(db, date_str=date)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chưa có đợt ghi hiện hành.",
        )
    return ReadingRoundListResponse(
        batch_id=batch.id,
        batch_name=batch.name,
        period_key=batch.period_key,
        rounds=rounds,
    )


@app.post(
    "/api/v1/admin/schedules/preview",
    response_model=AdminSchedulePreviewResponse,
    dependencies=[Depends(enforce_csrf)],
)
def preview_admin_schedules_endpoint(
    payload: AdminSchedulePreviewRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminSchedulePreviewResponse:
    return preview_admin_schedules(db, payload)


@app.post(
    "/api/v1/admin/schedules",
    response_model=AdminScheduleCreateResponse,
    dependencies=[Depends(enforce_csrf)],
)
def create_admin_schedules_endpoint(
    payload: AdminScheduleCreateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminScheduleCreateResponse:
    return create_admin_schedules(db, admin_user, payload)


@app.delete(
    "/api/v1/admin/schedules/rounds/{round_id}",
    response_model=AdminScheduleDeleteResponse,
    dependencies=[Depends(enforce_csrf)],
)
def delete_admin_schedule_round_endpoint(
    round_id: str,
    force: bool = False,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminScheduleDeleteResponse:
    return delete_admin_schedule_round(db, admin_user, round_id, force=force)


@app.delete(
    "/api/v1/admin/schedules",
    response_model=AdminScheduleDeleteResponse,
    dependencies=[Depends(enforce_csrf)],
)
def delete_admin_schedules_by_date_endpoint(
    date: str,
    force: bool = False,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminScheduleDeleteResponse:
    return delete_admin_schedules_by_date(db, admin_user, date_str=date, force=force)


@app.get("/api/v1/admin/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard_endpoint(
    date: Optional[str] = None,
    location: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    return get_admin_dashboard(db, date_str=date, location_filter=location)


@app.get("/api/v1/admin/audit-logs", response_model=AdminAuditLogListResponse)
def get_admin_audit_logs_endpoint(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminAuditLogListResponse:
    return get_admin_audit_logs(db, action=action, resource_type=resource_type, limit=limit, offset=offset)


# --- Admin Technical Reports Endpoints ---
from .admin_reports import (
    get_admin_technical_overview,
    get_admin_technical_meters,
    get_admin_technical_details,
    export_admin_technical_csv,
)
from .schemas import (
    AdminTechnicalOverviewResponse,
    AdminTechnicalMeterListResponse,
    AdminTechnicalDetailsResponse,
)


@app.get("/api/v1/admin/reports/technical/overview", response_model=AdminTechnicalOverviewResponse)
def get_admin_technical_overview_endpoint(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    meter_type: Optional[str] = None,
    confirmation_source: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminTechnicalOverviewResponse:
    return get_admin_technical_overview(
        db,
        start_date=start_date,
        end_date=end_date,
        location=location,
        meter_type=meter_type,
        confirmation_source=confirmation_source,
    )


@app.get("/api/v1/admin/reports/technical/meters", response_model=AdminTechnicalMeterListResponse)
def get_admin_technical_meters_endpoint(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    meter_type: Optional[str] = None,
    confirmation_source: Optional[str] = None,
    meter_id: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminTechnicalMeterListResponse:
    return get_admin_technical_meters(
        db,
        start_date=start_date,
        end_date=end_date,
        location=location,
        meter_type=meter_type,
        confirmation_source=confirmation_source,
        meter_id=meter_id,
    )


@app.get("/api/v1/admin/reports/technical/details", response_model=AdminTechnicalDetailsResponse)
def get_admin_technical_details_endpoint(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    meter_type: Optional[str] = None,
    confirmation_source: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminTechnicalDetailsResponse:
    return get_admin_technical_details(
        db,
        start_date=start_date,
        end_date=end_date,
        location=location,
        meter_type=meter_type,
        confirmation_source=confirmation_source,
        status_filter=status_filter,
        page=page,
        limit=limit,
    )


@app.get("/api/v1/admin/reports/technical/export.csv")
def export_admin_technical_csv_endpoint(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    meter_type: Optional[str] = None,
    confirmation_source: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return export_admin_technical_csv(
        db,
        start_date=start_date,
        end_date=end_date,
        location=location,
        meter_type=meter_type,
        confirmation_source=confirmation_source,
    )


# --- Admin Meter Reading Inspection Endpoints ---
@app.get("/api/v1/admin/meter-readings/{reading_id}", response_model=AdminMeterReadingInspectionResponse)
def get_admin_meter_reading_inspection_endpoint(
    reading_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterReadingInspectionResponse:
    return get_admin_meter_reading_detail(db, reading_id=reading_id)


@app.get("/api/v1/admin/meter-readings/{reading_id}/evidence")
def get_admin_meter_reading_evidence_endpoint(
    reading_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    file_path = get_admin_meter_reading_evidence_path(db, reading_id=reading_id)
    return FileResponse(
        path=file_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "private, no-store"},
    )


@app.get("/api/v1/admin/meters/{meter_id}/latest-reading", response_model=AdminMeterLatestReadingResponse)
def get_admin_meter_latest_reading_endpoint(
    meter_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminMeterLatestReadingResponse:
    return get_admin_meter_latest_reading(db, meter_id=meter_id)


# ==============================================================================
# WORK SCHEDULE & LEAVE MANAGEMENT ENDPOINTS
# ==============================================================================
from .work_schedule import (
    get_user_monthly_schedule,
    create_leave_request,
    get_user_leave_requests,
    cancel_user_leave_request,
    get_admin_roster_matrix,
    assign_admin_shifts,
    auto_pattern_admin_roster,
    preview_auto_pattern_roster,
    get_admin_leave_requests,
    review_admin_leave_request,
    export_roster_csv,
)
from .schemas import (
    UserMonthlyScheduleResponse,
    LeaveRequestCreateRequest,
    LeaveRequestItem,
    LeaveRequestReviewRequest,
    AdminRosterResponse,
    AdminShiftAssignRequest,
    AdminAutoPatternRequest,
    AdminAutoPatternPreviewResponse,
)



@app.get("/api/v1/schedule/my-month", response_model=UserMonthlyScheduleResponse)
def get_my_monthly_schedule_endpoint(
    month: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserMonthlyScheduleResponse:
    data = get_user_monthly_schedule(db, user_id=current_user.id, month_str=month)
    return UserMonthlyScheduleResponse(**data)


@app.post("/api/v1/schedule/leave-requests")
def create_leave_request_endpoint(
    payload: LeaveRequestCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leave_req = create_leave_request(db, user_id=current_user.id, data=payload.model_dump())
    return {
        "status": "success",
        "id": leave_req.id,
        "message": "Đã gửi đơn xin nghỉ phép thành công.",
    }


@app.get("/api/v1/schedule/leave-requests/my", response_model=list[LeaveRequestItem])
def get_my_leave_requests_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LeaveRequestItem]:
    data = get_user_leave_requests(db, user_id=current_user.id)
    return [LeaveRequestItem(**item) for item in data]


@app.delete("/api/v1/schedule/leave-requests/{request_id}")
def cancel_leave_request_endpoint(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cancel_user_leave_request(db, user_id=current_user.id, request_id=request_id)
    return {"status": "success", "message": "Đã hủy đơn xin nghỉ phép."}


# --- Admin Roster & Leave Endpoints ---

@app.get("/api/v1/admin/roster", response_model=AdminRosterResponse)
def get_admin_roster_endpoint(
    month: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminRosterResponse:
    data = get_admin_roster_matrix(db, month_str=month)
    return AdminRosterResponse(**data)


@app.post("/api/v1/admin/roster/assign")
def assign_admin_shifts_endpoint(
    payload: AdminShiftAssignRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    count = assign_admin_shifts(
        db,
        assignments=[item.model_dump() for item in payload.assignments],
        admin_user_id=admin_user.id,
    )
    return {"status": "success", "updated_count": count, "message": f"Đã phân ca thành công cho {count} lượt."}


@app.post("/api/v1/admin/roster/auto-pattern")
def auto_pattern_admin_roster_endpoint(
    payload: AdminAutoPatternRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    count = auto_pattern_admin_roster(
        db,
        month_str=payload.month,
        user_ids=payload.user_ids,
        pattern_type=payload.pattern_type,
        admin_user_id=admin_user.id,
    )
    return {"status": "success", "updated_count": count, "message": f"Đã áp dụng chu kỳ ca cho {count} lượt."}


@app.post("/api/v1/admin/roster/auto-pattern/preview", response_model=AdminAutoPatternPreviewResponse)
def preview_auto_pattern_admin_roster_endpoint(
    payload: AdminAutoPatternRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminAutoPatternPreviewResponse:
    data = preview_auto_pattern_roster(
        db,
        month_str=payload.month,
        user_ids=payload.user_ids,
        pattern_type=payload.pattern_type,
    )
    return AdminAutoPatternPreviewResponse(**data)



@app.get("/api/v1/admin/leave-requests", response_model=list[LeaveRequestItem])
def get_admin_leave_requests_endpoint(
    status: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[LeaveRequestItem]:
    data = get_admin_leave_requests(db, status_filter=status)
    return [LeaveRequestItem(**item) for item in data]


@app.post("/api/v1/admin/leave-requests/{request_id}/review")
def review_admin_leave_request_endpoint(
    request_id: str,
    payload: LeaveRequestReviewRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return review_admin_leave_request(
        db,
        request_id=request_id,
        action=payload.action,
        review_note=payload.review_note,
        admin_user_id=admin_user.id,
    )


@app.get("/api/v1/admin/roster/export.csv")
def export_admin_roster_csv_endpoint(
    month: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    csv_content = export_roster_csv(db, month_str=month)
    filename = f"phan_ca_nhan_su_{month or 'hien_tai'}.csv"
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ==============================================================================
# MAP OPERATIONS ENDPOINTS (PHASE 2)
# ==============================================================================
from .map_operations import (
    get_map_operators,
    get_map_overview,
    get_map_zones,
    reassign_zone_operator,
)
from .schemas import (
    MapMeterOut,
    MapOverviewResponse,
    OperationalZoneOut,
    UserOut,
    ZoneReassignRequest,
    ZoneReassignResponse,
)


@app.get("/api/v1/map/overview", response_model=MapOverviewResponse)
def get_map_overview_endpoint(
    date: Optional[str] = None,
    round_id: Optional[str] = None,
    include_inactive: bool = False,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MapOverviewResponse:
    return get_map_overview(db, date_str=date, round_id=round_id, include_inactive=include_inactive)


@app.get("/api/v1/map/zones", response_model=list[OperationalZoneOut])
def get_map_zones_endpoint(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[OperationalZoneOut]:
    return get_map_zones(db)


@app.get("/api/v1/map/operators", response_model=list[UserOut])
def get_map_operators_endpoint(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    return get_map_operators(db)



@app.get("/api/v1/map/meters", response_model=list[MapMeterOut])
def get_map_meters_endpoint(
    date: Optional[str] = None,
    round_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    include_inactive: bool = False,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[MapMeterOut]:
    overview = get_map_overview(db, date_str=date, round_id=round_id, include_inactive=include_inactive)
    meters = overview.meters
    if zone_id and zone_id != "ALL":
        meters = [m for m in meters if m.zone_id == zone_id]
    return meters


@app.post(
    "/api/v1/map/zones/{zone_id}/assign",
    response_model=ZoneReassignResponse,
    dependencies=[Depends(enforce_csrf)],
)
def reassign_zone_operator_endpoint(
    zone_id: str,
    payload: ZoneReassignRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ZoneReassignResponse:
    return reassign_zone_operator(db, actor=admin_user, zone_id=zone_id, payload=payload)


# ==============================================================================
# MAP CONFIGURATION & VERSIONING ENDPOINTS (V16)
# ==============================================================================
@app.get("/api/v1/map-config/active", response_model=ActiveMapConfigurationResponse)
def get_active_map_config_endpoint(
    db: Session = Depends(get_db),
) -> ActiveMapConfigurationResponse:
    """Returns the current active PUBLISHED map version with zones and landmarks."""
    return get_active_map_config(db)


@app.get("/api/v1/map-config/versions", response_model=MapVersionListResponse)
def list_map_versions_endpoint(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MapVersionListResponse:
    """Lists all map versions (Draft, Published, Archived)."""
    return list_map_versions(db)


@app.get("/api/v1/map-config/versions/current-draft", response_model=Optional[MapVersionOut])
def get_current_draft_endpoint(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Optional[MapVersionOut]:
    """Gets the active draft version if one exists."""
    return get_current_draft(db)


@app.get("/api/v1/map-config/versions/{version_id}", response_model=MapVersionOut)
def get_map_version_detail_endpoint(
    version_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MapVersionOut:
    """Gets specific version detail with zones."""
    return get_map_version_detail(db, version_id=version_id)


@app.post(
    "/api/v1/map-config/drafts",
    response_model=MapVersionOut,
    dependencies=[Depends(enforce_csrf)],
)
def create_map_draft_endpoint(
    payload: Optional[MapDraftCreateRequest] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MapVersionOut:
    """Creates a new draft map version cloned from published or specified version."""
    return create_map_draft(db, actor=admin_user, payload=payload)


@app.patch(
    "/api/v1/map-config/versions/{version_id}/zones/{zone_id}",
    response_model=MapVersionZoneOut,
    dependencies=[Depends(enforce_csrf)],
)
def update_draft_zone_endpoint(
    version_id: str,
    zone_id: str,
    payload: MapZoneUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MapVersionZoneOut:
    """Updates geometry of a zone inside a draft version with optimistic concurrency check."""
    return update_draft_zone(db, actor=admin_user, version_id=version_id, zone_id=zone_id, payload=payload)


@app.post(
    "/api/v1/map-config/versions/{version_id}/validate",
    response_model=MapValidationResponse,
)
def validate_map_version_endpoint(
    version_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MapValidationResponse:
    """Runs complete validation pipeline on a map version."""
    return validate_map_version_geometry(db, version_id=version_id)


@app.post(
    "/api/v1/map-config/versions/{version_id}/publish",
    response_model=MapPublishResponse,
    dependencies=[Depends(enforce_csrf)],
)
def publish_map_version_endpoint(
    version_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MapPublishResponse:
    """Atomically validates and publishes a draft map version."""
    return publish_map_version(db, actor=admin_user, version_id=version_id)


@app.post(
    "/api/v1/map-config/versions/{version_id}/rollback",
    response_model=MapPublishResponse,
    dependencies=[Depends(enforce_csrf)],
)
def rollback_map_version_endpoint(
    version_id: str,
    payload: Optional[MapRollbackRequest] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MapPublishResponse:
    """Atomically rolls back to a historical validated map version."""
    return rollback_map_version(db, actor=admin_user, target_version_id=version_id, payload=payload)


@app.delete(
    "/api/v1/map-config/versions/{version_id}",
    dependencies=[Depends(enforce_csrf)],
)
def delete_map_draft_endpoint(
    version_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Deletes an un-published draft."""
    return delete_map_draft(db, actor=admin_user, version_id=version_id)


# ==============================================================================
# ASSET-CENTRIC DOMAIN & TOPOLOGY MANAGEMENT (V16C)
# ==============================================================================

@app.get("/api/v1/admin/assets", response_model=AssetListResponse)
def get_admin_assets_endpoint(
    asset_type: Optional[str] = None,
    zone_id: Optional[str] = None,
    lifecycle_status: Optional[str] = None,
    verification_status: Optional[str] = None,
    mobility_type: Optional[str] = None,
    search: Optional[str] = None,
    scenario_id: Optional[str] = None,
    data_origin: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetListResponse:
    return list_assets(
        db,
        asset_type=asset_type,
        zone_id=zone_id,
        lifecycle_status=lifecycle_status,
        verification_status=verification_status,
        mobility_type=mobility_type,
        search=search,
        scenario_id=scenario_id,
        data_origin=data_origin,
        limit=limit,
        offset=offset,
    )


@app.post("/api/v1/admin/assets", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def create_admin_asset_endpoint(
    payload: AssetCreateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return create_asset(db, actor=admin_user, payload=payload)


@app.get("/api/v1/admin/assets/{asset_id}", response_model=AssetResponse)
def get_admin_asset_endpoint(
    asset_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return get_asset_by_id(db, asset_id=asset_id)


@app.patch("/api/v1/admin/assets/{asset_id}", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def update_admin_asset_endpoint(
    asset_id: str,
    payload: AssetUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return update_asset(db, actor=admin_user, asset_id=asset_id, payload=payload)


@app.post("/api/v1/admin/assets/{asset_id}/relocate", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def relocate_admin_asset_endpoint(
    asset_id: str,
    payload: AssetRelocateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return relocate_asset(db, actor=admin_user, asset_id=asset_id, payload=payload)


@app.post("/api/v1/admin/assets/{asset_id}/set-parent", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def set_admin_asset_parent_endpoint(
    asset_id: str,
    payload: AssetSetParentRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return set_asset_parent(db, actor=admin_user, asset_id=asset_id, payload=payload)


@app.post("/api/v1/admin/assets/{asset_id}/deactivate", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def deactivate_admin_asset_endpoint(
    asset_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return set_asset_lifecycle_state(db, actor=admin_user, asset_id=asset_id, new_status="INACTIVE")


@app.post("/api/v1/admin/assets/{asset_id}/reactivate", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def reactivate_admin_asset_endpoint(
    asset_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return set_asset_lifecycle_state(db, actor=admin_user, asset_id=asset_id, new_status="ACTIVE")


@app.post("/api/v1/admin/assets/{asset_id}/retire", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def retire_admin_asset_endpoint(
    asset_id: str,
    payload: Optional[AssetRetireRequest] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    reason = payload.reason if payload else None
    return set_asset_lifecycle_state(db, actor=admin_user, asset_id=asset_id, new_status="RETIRED", reason=reason)


# Meter-Asset Relations
@app.get("/api/v1/admin/meter-asset-relations", response_model=MeterAssetRelationListResponse)
def list_meter_asset_relations_endpoint(
    meter_id: Optional[str] = None,
    asset_id: Optional[str] = None,
    relation_type: Optional[str] = None,
    active_only: bool = True,
    verification_status: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MeterAssetRelationListResponse:
    return list_meter_asset_relations(
        db,
        meter_id=meter_id,
        asset_id=asset_id,
        relation_type=relation_type,
        active_only=active_only,
        verification_status=verification_status,
    )


@app.get("/api/v1/admin/meters/{meter_id}/relations", response_model=MeterAssetRelationListResponse)
def get_meter_relations_endpoint(
    meter_id: str,
    active_only: bool = False,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MeterAssetRelationListResponse:
    return list_meter_asset_relations(
        db,
        meter_id=meter_id,
        active_only=active_only,
    )


@app.post("/api/v1/admin/meter-asset-relations", response_model=MeterAssetRelationResponse, dependencies=[Depends(enforce_csrf)])
def create_meter_asset_relation_endpoint(
    payload: MeterAssetRelationCreateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MeterAssetRelationResponse:
    return create_meter_asset_relation(db, actor=admin_user, payload=payload)


@app.post("/api/v1/admin/meter-asset-relations/{relation_id}/close", response_model=MeterAssetRelationResponse, dependencies=[Depends(enforce_csrf)])
def close_meter_asset_relation_endpoint(
    relation_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MeterAssetRelationResponse:
    return close_meter_asset_relation(db, actor=admin_user, relation_id=relation_id)


@app.post("/api/v1/admin/meter-asset-relations/{relation_id}/transfer", response_model=MeterAssetRelationResponse, dependencies=[Depends(enforce_csrf)])
def transfer_meter_asset_relation_endpoint(
    relation_id: str,
    payload: MeterAssetRelationTransferRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MeterAssetRelationResponse:
    return transfer_meter_asset_relation(db, actor=admin_user, relation_id=relation_id, payload=payload)


@app.post("/api/v1/admin/meter-asset-relations/{relation_id}/verify", response_model=MeterAssetRelationResponse, dependencies=[Depends(enforce_csrf)])
def verify_meter_asset_relation_endpoint(
    relation_id: str,
    payload: Optional[RelationVerifyRequest] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MeterAssetRelationResponse:
    if payload is None:
        payload = RelationVerifyRequest(
            evidence_type="PORT_DOCUMENT",
            evidence_reference="Phê duyệt liên kết công tơ V16C",
        )
    return verify_meter_asset_relation(db, actor=admin_user, relation_id=relation_id, payload=payload)


@app.post("/api/v1/admin/meter-asset-relations/{relation_id}/reject", response_model=MeterAssetRelationResponse, dependencies=[Depends(enforce_csrf)])
def reject_meter_asset_relation_endpoint(
    relation_id: str,
    payload: Optional[RelationRejectRequest] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MeterAssetRelationResponse:
    if payload is None:
        payload = RelationRejectRequest(reason="Từ chối liên kết qua Admin")
    return reject_meter_asset_relation(db, actor=admin_user, relation_id=relation_id, payload=payload)


# Asset Connections (Topology)
@app.get("/api/v1/admin/asset-connections", response_model=AssetConnectionListResponse)
def list_asset_connections_endpoint(
    source_asset_id: Optional[str] = None,
    target_asset_id: Optional[str] = None,
    utility_type: Optional[str] = None,
    connection_type: Optional[str] = None,
    active_only: bool = True,
    verification_status: Optional[str] = None,
    scenario_id: Optional[str] = None,
    data_origin: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetConnectionListResponse:
    return list_asset_connections(
        db,
        source_asset_id=source_asset_id,
        target_asset_id=target_asset_id,
        utility_type=utility_type,
        connection_type=connection_type,
        active_only=active_only,
        verification_status=verification_status,
        scenario_id=scenario_id,
        data_origin=data_origin,
    )


@app.post("/api/v1/admin/asset-connections", response_model=AssetConnectionResponse, dependencies=[Depends(enforce_csrf)])
def create_asset_connection_endpoint(
    payload: AssetConnectionCreateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetConnectionResponse:
    return create_asset_connection(db, actor=admin_user, payload=payload)


@app.post("/api/v1/admin/asset-connections/{connection_id}/close", response_model=AssetConnectionResponse, dependencies=[Depends(enforce_csrf)])
def close_asset_connection_endpoint(
    connection_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetConnectionResponse:
    return close_asset_connection(db, actor=admin_user, connection_id=connection_id)


@app.post("/api/v1/admin/asset-connections/{connection_id}/verify", response_model=AssetConnectionResponse, dependencies=[Depends(enforce_csrf)])
def verify_asset_connection_endpoint(
    connection_id: str,
    payload: Optional[ConnectionVerifyRequest] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetConnectionResponse:
    if payload is None:
        payload = ConnectionVerifyRequest(
            evidence_type="PORT_DOCUMENT",
            evidence_reference="Phê duyệt kết nối mạng lưới V16C",
        )
    return verify_asset_connection_with_evidence(db, actor=admin_user, connection_id=connection_id, payload=payload)


@app.post("/api/v1/admin/asset-connections/{connection_id}/reject", response_model=AssetConnectionResponse, dependencies=[Depends(enforce_csrf)])
def reject_asset_connection_endpoint(
    connection_id: str,
    payload: Optional[ConnectionRejectRequest] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetConnectionResponse:
    if payload is None:
        payload = ConnectionRejectRequest(reason="Từ chối kết nối qua Admin")
    return reject_asset_connection(db, actor=admin_user, connection_id=connection_id, payload=payload)


@app.get("/api/v1/admin/asset-topology/trace", response_model=TopologyTraceResponse)
@app.get("/api/v1/admin/assets/{asset_id}/trace-topology", response_model=TopologyTraceResponse)
def trace_asset_topology_endpoint(
    asset_id: str,
    direction: str = "downstream",
    utility_type: Optional[str] = None,
    include_unverified: bool = False,
    verified_only: Optional[bool] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TopologyTraceResponse:
    if verified_only is not None:
        include_unverified = not verified_only
    return trace_asset_topology(
        db,
        asset_id=asset_id,
        direction=direction,
        utility_type=utility_type,
        include_unverified=include_unverified,
    )


# ==============================================================================
# V16E — ASSET NETWORK TOPOLOGY & OPERATIONAL CONTEXT ROUTES
# ==============================================================================

@app.get("/api/v1/admin/asset-network", response_model=AssetNetworkResponse)
def get_asset_network_endpoint(
    utility_type: Optional[str] = None,
    focus_asset_id: Optional[str] = None,
    verified_only: bool = True,
    scenario_id: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetNetworkResponse:
    return get_asset_network(
        db,
        utility_type=utility_type,
        focus_asset_id=focus_asset_id,
        verified_only=verified_only,
        scenario_id=scenario_id,
    )


@app.get("/api/v1/admin/assets/{asset_id}/operational-context", response_model=AssetOperationalContextResponse)
def get_asset_operational_context_endpoint(
    asset_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetOperationalContextResponse:
    return get_asset_operational_context(db, asset_id=asset_id)



# ==============================================================================
# V16D — CANDIDATE IMPORT, VERIFICATION & METADATA ROUTES
# ==============================================================================

@app.post("/api/v1/admin/assets/import-candidates", response_model=CandidateImportResponse, dependencies=[Depends(enforce_csrf)])
def import_candidates_endpoint(
    payload: Optional[CandidateImportRequest] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CandidateImportResponse:
    p_file = payload.proposals_file if payload else None
    r_file = payload.relations_file if payload else None
    return import_candidate_proposals(db, actor=admin_user, proposals_file=p_file, relations_file=r_file)


@app.get("/api/v1/admin/asset-verification/overview", response_model=AssetVerificationSummaryResponse)
@app.get("/api/v1/admin/verification-summary", response_model=AssetVerificationSummaryResponse)
def get_verification_overview_endpoint(
    scenario_id: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetVerificationSummaryResponse:
    return get_verification_summary(db, scenario_id=scenario_id)


@app.get("/api/v1/admin/asset-verification/matrix", response_model=list[MeterReviewMatrixItem])
@app.get("/api/v1/admin/meter-review-matrix", response_model=list[MeterReviewMatrixItem])
def get_meter_review_matrix_endpoint(
    scenario_id: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[MeterReviewMatrixItem]:
    return get_meter_review_matrix(db, scenario_id=scenario_id)


@app.get("/api/v1/admin/asset-verification/evidences", response_model=list[VerificationEvidenceResponse])
def get_entity_evidences_endpoint(
    entity_type: str,
    entity_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[VerificationEvidenceResponse]:
    return get_entity_verification_evidences(db, entity_type=entity_type, entity_id=entity_id)


@app.get("/api/v1/admin/verification-evidence/{entity_type}/{entity_id}", response_model=list[VerificationEvidenceResponse])
def get_entity_evidences_path_endpoint(
    entity_type: str,
    entity_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[VerificationEvidenceResponse]:
    return get_entity_verification_evidences(db, entity_type=entity_type, entity_id=entity_id)


@app.post("/api/v1/admin/assets/{asset_id}/verify", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def verify_asset_endpoint(
    asset_id: str,
    payload: AssetVerifyRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return verify_asset(db, actor=admin_user, asset_id=asset_id, payload=payload)


@app.post("/api/v1/admin/assets/{asset_id}/reject-verification", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
@app.post("/api/v1/admin/assets/{asset_id}/reject", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def reject_asset_verification_endpoint(
    asset_id: str,
    payload: AssetRejectRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return reject_asset_verification(db, actor=admin_user, asset_id=asset_id, payload=payload)


@app.post("/api/v1/admin/assets/{asset_id}/reopen-review", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def reopen_asset_review_endpoint(
    asset_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    return reopen_asset_review(db, actor=admin_user, asset_id=asset_id)


@app.post("/api/v1/admin/assets/{asset_id}/verify-position", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
@app.post("/api/v1/admin/assets/{asset_id}/position", response_model=AssetResponse, dependencies=[Depends(enforce_csrf)])
def verify_asset_position_endpoint(
    asset_id: str,
    payload: AssetVerifyPositionRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssetResponse:
    res, _ = verify_asset_position(db, actor=admin_user, asset_id=asset_id, payload=payload)
    return res


@app.patch("/api/v1/admin/meters/{meter_id}/metadata", dependencies=[Depends(enforce_csrf)])
@app.put("/api/v1/admin/meters/{meter_id}/metadata", dependencies=[Depends(enforce_csrf)])
def update_meter_metadata_endpoint(
    meter_id: str,
    payload: MeterMetadataUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return update_meter_metadata(db, actor=admin_user, meter_id=meter_id, payload=payload)

