"""Authoritative date, shift, and zone staffing; independent of reading scope."""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import uuid

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .admin import log_admin_action
from .models import LeaveRequest, OperationalAssignment, OperationalZone, User, WorkSchedule, ZoneAssignment


LOCAL_TZ = ZoneInfo("Asia/Ho_Chi_Minh")
SHIFT_TIMES = {"CA1": ("06:00", "14:00"), "CA2": ("14:00", "22:00"), "CA3": ("22:00", "06:00"), "HC": ("07:30", "16:30")}


def shift_window(work_date: str, shift_code: str) -> tuple[datetime, datetime]:
    if shift_code not in SHIFT_TIMES:
        raise HTTPException(status_code=422, detail="Ca làm việc không hợp lệ.")
    start_text, end_text = SHIFT_TIMES[shift_code]
    day = date.fromisoformat(work_date)
    start = datetime.combine(day, time.fromisoformat(start_text), LOCAL_TZ)
    end = datetime.combine(day, time.fromisoformat(end_text), LOCAL_TZ)
    if end <= start:
        end += timedelta(days=1)
    return start, end


def timing_state(item: OperationalAssignment, now: datetime | None = None) -> str:
    if item.status == "CANCELLED":
        return "CANCELLED"
    start, end = shift_window(item.work_date, item.shift_code)
    current = (now or datetime.now(LOCAL_TZ)).astimezone(LOCAL_TZ)
    return "UPCOMING" if current < start else "PAST" if current >= end else "CURRENT"


def leave_conflicts(db: Session, user_id: str, work_date: str, shift_code: str, status: str) -> list[LeaveRequest]:
    return db.query(LeaveRequest).filter(
        LeaveRequest.user_id == user_id,
        LeaveRequest.start_date <= work_date,
        LeaveRequest.end_date >= work_date,
        LeaveRequest.status == status,
        LeaveRequest.shift_code.in_([None, "ALL", shift_code]),
    ).all()


def availability(db: Session, user: User, work_date: str, shift_code: str) -> dict:
    schedule = db.query(WorkSchedule).filter_by(user_id=user.id, work_date=work_date).first()
    if not user.is_active:
        state = "INACTIVE_USER"
    elif schedule is None:
        state = "UNASSIGNED_SHIFT"
    elif schedule.shift_code == "OFF":
        state = "OFF"
    elif schedule.shift_code == "LEAVE" or schedule.status == "ON_LEAVE":
        state = "APPROVED_LEAVE"
    elif schedule.shift_code != shift_code or shift_code not in SHIFT_TIMES:
        state = "SHIFT_MISMATCH"
    elif leave_conflicts(db, user.id, work_date, shift_code, "APPROVED"):
        state = "APPROVED_LEAVE"
    else:
        state = "AVAILABLE"
    pending = bool(leave_conflicts(db, user.id, work_date, shift_code, "PENDING"))
    return {"state": "PENDING_LEAVE" if state == "AVAILABLE" and pending else state, "assignable": state == "AVAILABLE", "warning": "Nhân viên có yêu cầu nghỉ đang chờ duyệt." if pending else None, "shift_code": schedule.shift_code if schedule else None}


def serialize(item: OperationalAssignment, db: Session | None = None) -> dict:
    usable = availability(db, item.user, item.work_date, item.shift_code) if db is not None else None
    return {"id": item.id, "user_id": item.user_id, "employee_code": item.user.employee_code, "employee_name": item.user.full_name,
            "zone_id": item.zone_id, "zone_code": item.zone.code, "zone_name": item.zone.name, "work_date": item.work_date,
            "shift_code": item.shift_code, "assignment_role": item.assignment_role, "status": item.status,
            "timing_state": timing_state(item), "source": item.source, "notes": item.notes,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "cancelled_at": item.cancelled_at.isoformat() if item.cancelled_at else None, "cancel_reason": item.cancel_reason,
            "actionable": bool(item.status == "ASSIGNED" and item.zone.is_active and usable and usable["assignable"])}


def board(db: Session, work_date: str, shift_code: str) -> dict:
    shift_window(work_date, shift_code)
    users = db.query(User).order_by(User.employee_code).all()
    zones = db.query(OperationalZone).order_by(OperationalZone.code).all()
    rows = db.query(OperationalAssignment).filter_by(work_date=work_date, shift_code=shift_code).all()
    active = [serialize(row, db) for row in rows if row.status == "ASSIGNED"]
    defaults = {row.zone_id: row.user_id for row in db.query(ZoneAssignment).filter_by(is_active=True).all()}
    return {"work_date": work_date, "shift_code": shift_code, "shift_start": shift_window(work_date, shift_code)[0].isoformat(),
            "shift_end": shift_window(work_date, shift_code)[1].isoformat(),
            "zones": [{"id": zone.id, "code": zone.code, "name": zone.name, "is_active": zone.is_active,
                       "default_user_id": defaults.get(zone.id), "assignments": [item for item in active if item["zone_id"] == zone.id]}
                      for zone in zones],
            "staff": [{"id": user.id, "employee_code": user.employee_code, "full_name": user.full_name,
                       **availability(db, user, work_date, shift_code)} for user in users],
            "cancelled": [serialize(row, db) for row in rows if row.status == "CANCELLED"]}


def preview(db: Session, work_date: str, shift_code: str, items: list[dict]) -> dict:
    shift_window(work_date, shift_code)
    existing = db.query(OperationalAssignment).filter_by(work_date=work_date, shift_code=shift_code, status="ASSIGNED").all()
    primary = {row.zone_id for row in existing if row.assignment_role == "PRIMARY"}
    pairs = {(row.user_id, row.zone_id) for row in existing}
    result = []
    for item in items:
        user = db.get(User, item["user_id"])
        zone = db.get(OperationalZone, item["zone_id"])
        role = item["assignment_role"]
        errors = []
        warnings = []
        if role not in ("PRIMARY", "SUPPORT"):
            errors.append("Vai trò không hợp lệ.")
        if not user or not user.is_active:
            errors.append("Nhân viên không tồn tại hoặc đã ngừng hoạt động.")
        if not zone or not zone.is_active:
            errors.append("Khu vực không tồn tại hoặc đã ngừng hoạt động.")
        if user and user.is_active:
            state = availability(db, user, work_date, shift_code)
            if not state["assignable"]:
                errors.append("Nhân viên không có ca phù hợp hoặc đang nghỉ.")
            if state["warning"]:
                warnings.append(state["warning"])
        pair = (item["user_id"], item["zone_id"])
        if pair in pairs:
            errors.append("Nhân viên đã được phân khu này trong ca.")
        if role == "PRIMARY" and item["zone_id"] in primary:
            errors.append("Khu vực đã có người phụ trách chính trong ca.")
        pairs.add(pair)
        if role == "PRIMARY":
            primary.add(item["zone_id"])
        result.append({**item, "errors": errors, "warnings": warnings, "outcome": "CONFLICT" if errors else "CREATE"})
    return {"work_date": work_date, "shift_code": shift_code, "items": result,
            "conflict_count": sum(bool(row["errors"]) for row in result), "warning_count": sum(bool(row["warnings"]) for row in result)}


def apply(db: Session, work_date: str, shift_code: str, items: list[dict], actor_id: str) -> list[dict]:
    result = preview(db, work_date, shift_code, items)
    if result["conflict_count"]:
        raise HTTPException(status_code=409, detail=result)
    created = []
    try:
        for item in items:
            record = OperationalAssignment(id=str(uuid.uuid4()), user_id=item["user_id"], zone_id=item["zone_id"],
                                           work_date=work_date, shift_code=shift_code, assignment_role=item["assignment_role"],
                                           status="ASSIGNED", source="MANUAL", notes=item.get("notes"), created_by=actor_id)
            db.add(record)
            db.flush()
            log_admin_action(db, actor_id, "OPERATIONAL_ASSIGNMENT_CREATED", "OPERATIONAL_ASSIGNMENT", record.id,
                             after_json={"user_id": record.user_id, "zone_id": record.zone_id, "work_date": work_date,
                                         "shift_code": shift_code, "role": record.assignment_role})
            created.append(record)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Phân khu đã thay đổi. Vui lòng xem lại trước khi lưu.")
    except Exception:
        db.rollback()
        raise
    return [serialize(item, db) for item in created]


def cancel(db: Session, record: OperationalAssignment, actor_id: str, reason: str) -> None:
    if record.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Phân khu đã được hủy.")
    record.status = "CANCELLED"
    record.cancelled_at = datetime.now(timezone.utc)
    record.cancelled_by = actor_id
    record.cancel_reason = reason
    log_admin_action(db, actor_id, "OPERATIONAL_ASSIGNMENT_CANCELLED", "OPERATIONAL_ASSIGNMENT", record.id,
                     before_json={"user_id": record.user_id, "zone_id": record.zone_id, "work_date": record.work_date,
                                  "shift_code": record.shift_code, "role": record.assignment_role},
                     after_json={"reason": reason})


def cancel_incompatible_shift(db: Session, user_id: str, work_date: str, new_shift: str, actor_id: str) -> int:
    rows = db.query(OperationalAssignment).filter_by(user_id=user_id, work_date=work_date, status="ASSIGNED").all()
    count = 0
    for row in rows:
        if row.shift_code != new_shift:
            cancel(db, row, actor_id, "SHIFT_CHANGED")
            count += 1
    return count


def cancel_for_leave(db: Session, request: LeaveRequest, actor_id: str) -> int:
    rows = db.query(OperationalAssignment).filter(
        OperationalAssignment.user_id == request.user_id,
        OperationalAssignment.work_date >= request.start_date,
        OperationalAssignment.work_date <= request.end_date,
        OperationalAssignment.status == "ASSIGNED",
    ).all()
    count = 0
    for row in rows:
        if request.shift_code in (None, "ALL", row.shift_code):
            cancel(db, row, actor_id, "APPROVED_LEAVE")
            count += 1
    return count
