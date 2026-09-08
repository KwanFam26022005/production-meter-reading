import calendar
from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Optional
import io
import csv
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .models import LeaveRequest, User, WorkSchedule, AdminAuditLog
from .attendance import LOCAL_TZ, get_current_business_date


# Defined Shift Configurations for Saigon Port Operations
SHIFTS_CONFIG: Dict[str, Dict[str, Any]] = {
    "CA1": {
        "code": "CA1",
        "name": "Ca 1 (Sáng)",
        "start_time": "06:00",
        "end_time": "14:00",
        "color": "#0284C7",
        "bg_color": "#E0F2FE",
        "is_work": True,
    },
    "CA2": {
        "code": "CA2",
        "name": "Ca 2 (Chiều)",
        "start_time": "14:00",
        "end_time": "22:00",
        "color": "#D97706",
        "bg_color": "#FEF3C7",
        "is_work": True,
    },
    "CA3": {
        "code": "CA3",
        "name": "Ca 3 (Đêm)",
        "start_time": "22:00",
        "end_time": "06:00",
        "color": "#7C3AED",
        "bg_color": "#EDE9FE",
        "is_work": True,
    },
    "HC": {
        "code": "HC",
        "name": "Ca Hành chính",
        "start_time": "07:30",
        "end_time": "16:30",
        "color": "#475569",
        "bg_color": "#F1F5F9",
        "is_work": True,
    },
    "OFF": {
        "code": "OFF",
        "name": "Nghỉ tuần",
        "start_time": None,
        "end_time": None,
        "color": "#94A3B8",
        "bg_color": "#F8FAFC",
        "is_work": False,
    },
    "LEAVE": {
        "code": "LEAVE",
        "name": "Nghỉ phép",
        "start_time": None,
        "end_time": None,
        "color": "#DB2777",
        "bg_color": "#FCE7F3",
        "is_work": False,
    },
}

LEAVE_TYPES_MAP: Dict[str, str] = {
    "ANNUAL": "Phép năm",
    "COMPENSATORY": "Nghỉ bù",
    "PERSONAL_PAID": "Việc riêng có lương",
    "PERSONAL_UNPAID": "Việc riêng không lương",
    "SICK": "Nghỉ ốm / Khám chữa bệnh",
}


def parse_year_month(month_str: Optional[str] = None) -> tuple[int, int]:
    if month_str:
        try:
            parts = month_str.split("-")
            return int(parts[0]), int(parts[1])
        except Exception:
            pass
    now_vn = datetime.now(LOCAL_TZ)
    return now_vn.year, now_vn.month


def get_month_date_range(year: int, month: int) -> tuple[str, str, int]:
    _, num_days = calendar.monthrange(year, month)
    start_date = f"{year:04d}-{month:02d}-01"
    end_date = f"{year:04d}-{month:02d}-{num_days:02d}"
    return start_date, end_date, num_days


def get_user_monthly_schedule(db: Session, user_id: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    year, month = parse_year_month(month_str)
    start_date, end_date, num_days = get_month_date_range(year, month)
    today_str = get_current_business_date()

    # Query assigned schedules for this user in this month
    schedules = (
        db.query(WorkSchedule)
        .filter(
            WorkSchedule.user_id == user_id,
            WorkSchedule.work_date >= start_date,
            WorkSchedule.work_date <= end_date,
        )
        .all()
    )
    schedule_by_date = {s.work_date: s for s in schedules}

    # Query approved/pending leaves in this month for this user
    leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date,
            LeaveRequest.status.in_(["PENDING", "APPROVED"]),
        )
        .all()
    )

    days_list = []
    total_shifts_count = 0
    completed_shifts_count = 0

    for day in range(1, num_days + 1):
        d_str = f"{year:04d}-{month:02d}-{day:02d}"
        dt = date(year, month, day)
        # weekday 0=Mon, 6=Sun
        day_of_week = dt.weekday()
        weekday_label = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][day_of_week]

        sched = schedule_by_date.get(d_str)
        shift_code = sched.shift_code if sched else ("OFF" if day_of_week == 6 else "CA1")
        shift_status = sched.status if sched else "SCHEDULED"
        notes = sched.notes if sched else None

        # Check if there is an approved leave on this day
        has_approved_leave = any(
            l.status == "APPROVED" and l.start_date <= d_str <= l.end_date for l in leaves
        )
        has_pending_leave = any(
            l.status == "PENDING" and l.start_date <= d_str <= l.end_date for l in leaves
        )

        if has_approved_leave:
            shift_code = "LEAVE"
            shift_status = "ON_LEAVE"

        shift_info = SHIFTS_CONFIG.get(shift_code, SHIFTS_CONFIG["OFF"])
        is_today = (d_str == today_str)
        is_past = (d_str < today_str)

        if shift_info["is_work"]:
            total_shifts_count += 1
            if is_past:
                completed_shifts_count += 1

        days_list.append({
            "date": d_str,
            "day": day,
            "day_of_week": day_of_week,
            "weekday_label": weekday_label,
            "shift_code": shift_code,
            "shift_name": shift_info["name"],
            "start_time": shift_info["start_time"],
            "end_time": shift_info["end_time"],
            "color": shift_info["color"],
            "bg_color": shift_info["bg_color"],
            "is_work": shift_info["is_work"],
            "status": shift_status,
            "is_today": is_today,
            "is_past": is_past,
            "has_pending_leave": has_pending_leave,
            "notes": notes,
        })

    # Find next upcoming shift
    next_shift = None
    for d in days_list:
        if (d["date"] >= today_str) and d["is_work"]:
            next_shift = {
                "date": d["date"],
                "weekday_label": d["weekday_label"],
                "shift_code": d["shift_code"],
                "shift_name": d["shift_name"],
                "start_time": d["start_time"],
                "end_time": d["end_time"],
                "is_today": d["is_today"],
            }
            break

    # Calculate leave stats
    approved_leave_days = sum(
        1 for d in days_list if d["shift_code"] == "LEAVE"
    )

    return {
        "month": f"{year:04d}-{month:02d}",
        "year": year,
        "month_number": month,
        "today": today_str,
        "days": days_list,
        "summary": {
            "total_shifts": total_shifts_count,
            "completed_shifts": completed_shifts_count,
            "upcoming_shifts": max(0, total_shifts_count - completed_shifts_count),
            "annual_leave_remaining": max(0, 12 - approved_leave_days),
        },
        "next_shift": next_shift,
        "available_shifts": list(SHIFTS_CONFIG.values()),
    }


def create_leave_request(db: Session, user_id: str, data: Dict[str, Any]) -> LeaveRequest:
    start_date = data["start_date"]
    end_date = data.get("end_date") or start_date
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày bắt đầu nghỉ phép không được lớn hơn ngày kết thúc.",
        )

    substitute_id = data.get("substitute_user_id")
    if substitute_id:
        sub_user = db.query(User).filter(User.id == substitute_id, User.is_active == True).first()
        if not sub_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin nhân viên trực thay được chỉ định.",
            )

    leave_req = LeaveRequest(
        id=str(uuid.uuid4()),
        user_id=user_id,
        leave_type=data.get("leave_type", "ANNUAL"),
        start_date=start_date,
        end_date=end_date,
        shift_code=data.get("shift_code", "ALL"),
        reason=data.get("reason", "").strip(),
        substitute_user_id=substitute_id,
        status="PENDING",
    )
    db.add(leave_req)
    db.commit()
    db.refresh(leave_req)
    return leave_req


def get_user_leave_requests(db: Session, user_id: str) -> List[Dict[str, Any]]:
    requests = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.user_id == user_id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )
    results = []
    for r in requests:
        results.append({
            "id": r.id,
            "leave_type": r.leave_type,
            "leave_type_label": LEAVE_TYPES_MAP.get(r.leave_type, r.leave_type),
            "start_date": r.start_date,
            "end_date": r.end_date,
            "shift_code": r.shift_code,
            "reason": r.reason,
            "status": r.status,
            "substitute_user": {
                "id": r.substitute_user.id,
                "full_name": r.substitute_user.full_name,
                "employee_code": r.substitute_user.employee_code,
            } if r.substitute_user else None,
            "reviewer_name": r.reviewer.full_name if r.reviewer else None,
            "review_note": r.review_note,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return results


def cancel_user_leave_request(db: Session, user_id: str, request_id: str) -> bool:
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id, LeaveRequest.user_id == user_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn xin nghỉ phép.")
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="Chỉ có thể hủy đơn xin nghỉ phép khi đang chờ duyệt.")
    
    req.status = "CANCELLED"
    db.commit()
    return True


# ==============================================================================
# ADMIN ROSTER MANAGEMENT
# ==============================================================================

def get_admin_roster_matrix(db: Session, month_str: Optional[str] = None) -> Dict[str, Any]:
    year, month = parse_year_month(month_str)
    start_date, end_date, num_days = get_month_date_range(year, month)
    today_str = get_current_business_date()

    # Get active users
    users = db.query(User).filter(User.is_active == True).order_by(User.employee_code.asc()).all()

    # Get all schedules for this month
    all_schedules = (
        db.query(WorkSchedule)
        .filter(WorkSchedule.work_date >= start_date, WorkSchedule.work_date <= end_date)
        .all()
    )
    user_sched_map: Dict[str, Dict[str, str]] = {}
    for s in all_schedules:
        if s.user_id not in user_sched_map:
            user_sched_map[s.user_id] = {}
        user_sched_map[s.user_id][s.work_date] = s.shift_code

    # Days list header
    days_header = []
    for d in range(1, num_days + 1):
        d_str = f"{year:04d}-{month:02d}-{d:02d}"
        dt = date(year, month, d)
        dow = dt.weekday()
        days_header.append({
            "date": d_str,
            "day": d,
            "weekday_label": ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][dow],
            "is_weekend": (dow >= 5),
            "is_today": (d_str == today_str),
        })

    # Matrix rows
    users_matrix = []
    for u in users:
        u_map = user_sched_map.get(u.id, {})
        user_shifts = {}
        total_shifts = 0
        for d_obj in days_header:
            d_str = d_obj["date"]
            # Default to CA1 if weekday, OFF if Sunday if not assigned yet
            dt = date(year, month, d_obj["day"])
            default_shift = "OFF" if dt.weekday() == 6 else "CA1"
            shift = u_map.get(d_str, default_shift)
            user_shifts[d_str] = shift
            if shift in ["CA1", "CA2", "CA3", "HC"]:
                total_shifts += 1

        users_matrix.append({
            "user_id": u.id,
            "employee_code": u.employee_code,
            "full_name": u.full_name,
            "role": u.role,
            "shifts": user_shifts,
            "total_shifts": total_shifts,
        })

    # Daily staffing count summary
    daily_staff_count = {}
    for d_obj in days_header:
        d_str = d_obj["date"]
        counts = {"CA1": 0, "CA2": 0, "CA3": 0, "HC": 0, "OFF": 0, "LEAVE": 0}
        for u_row in users_matrix:
            s_code = u_row["shifts"].get(d_str, "OFF")
            if s_code in counts:
                counts[s_code] += 1
            else:
                counts["OFF"] += 1
        daily_staff_count[d_str] = {
            "counts": counts,
            "total_working": counts["CA1"] + counts["CA2"] + counts["CA3"] + counts["HC"],
        }

    return {
        "month": f"{year:04d}-{month:02d}",
        "year": year,
        "month_number": month,
        "today": today_str,
        "days_header": days_header,
        "users": users_matrix,
        "daily_staff_count": daily_staff_count,
        "shift_definitions": SHIFTS_CONFIG,
    }


def assign_admin_shifts(db: Session, assignments: List[Dict[str, Any]], admin_user_id: str) -> int:
    count = 0
    for item in assignments:
        u_id = item["user_id"]
        w_date = item["work_date"]
        s_code = item["shift_code"]
        notes = item.get("notes")

        if s_code not in SHIFTS_CONFIG:
            raise HTTPException(status_code=400, detail=f"Mã ca {s_code} không hợp lệ.")

        existing = (
            db.query(WorkSchedule)
            .filter(WorkSchedule.user_id == u_id, WorkSchedule.work_date == w_date)
            .first()
        )
        if existing:
            existing.shift_code = s_code
            if notes is not None:
                existing.notes = notes
            existing.updated_at = datetime.now(timezone.utc)
        else:
            new_sched = WorkSchedule(
                id=str(uuid.uuid4()),
                user_id=u_id,
                work_date=w_date,
                shift_code=s_code,
                status="SCHEDULED",
                notes=notes,
            )
            db.add(new_sched)
        count += 1

    db.commit()
    return count


def auto_pattern_admin_roster(
    db: Session,
    month_str: str,
    user_ids: List[str],
    pattern_type: str = "THREE_SHIFT_FOUR_TEAM",
    admin_user_id: str = None
) -> int:
    """
    Applies standard port shift patterns:
    - THREE_SHIFT_FOUR_TEAM: CA1 -> CA2 -> CA3 -> OFF -> OFF (or rotation)
    - STANDARD_WEEKDAY: Mon-Fri: CA1/HC, Sat-Sun: OFF
    """
    year, month = parse_year_month(month_str)
    _, _, num_days = get_month_date_range(year, month)

    pattern_3_4 = ["CA1", "CA2", "CA3", "OFF"]
    updated_count = 0

    target_users = db.query(User).filter(User.is_active == True)
    if user_ids:
        target_users = target_users.filter(User.id.in_(user_ids))
    users_list = target_users.all()

    for idx, u in enumerate(users_list):
        # Stagger start offset per team/user
        offset = idx % len(pattern_3_4)
        for d in range(1, num_days + 1):
            w_date = f"{year:04d}-{month:02d}-{d:02d}"
            dt = date(year, month, d)

            if pattern_type == "STANDARD_WEEKDAY":
                s_code = "OFF" if dt.weekday() >= 5 else "HC"
            else:
                # 3 ca 4 kíp rotation
                pat_idx = (d - 1 + offset) % len(pattern_3_4)
                s_code = pattern_3_4[pat_idx]

            existing = (
                db.query(WorkSchedule)
                .filter(WorkSchedule.user_id == u.id, WorkSchedule.work_date == w_date)
                .first()
            )
            if existing:
                existing.shift_code = s_code
                existing.updated_at = datetime.now(timezone.utc)
            else:
                db.add(WorkSchedule(
                    id=str(uuid.uuid4()),
                    user_id=u.id,
                    work_date=w_date,
                    shift_code=s_code,
                    status="SCHEDULED",
                ))
            updated_count += 1

    db.commit()
    return updated_count


def get_admin_leave_requests(db: Session, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    query = db.query(LeaveRequest).order_by(LeaveRequest.created_at.desc())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(LeaveRequest.status == status_filter.upper())
    
    records = query.all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "user": {
                "id": r.user.id,
                "full_name": r.user.full_name,
                "employee_code": r.user.employee_code,
                "role": r.user.role,
            } if r.user else None,
            "leave_type": r.leave_type,
            "leave_type_label": LEAVE_TYPES_MAP.get(r.leave_type, r.leave_type),
            "start_date": r.start_date,
            "end_date": r.end_date,
            "shift_code": r.shift_code,
            "reason": r.reason,
            "status": r.status,
            "substitute_user": {
                "id": r.substitute_user.id,
                "full_name": r.substitute_user.full_name,
                "employee_code": r.substitute_user.employee_code,
            } if r.substitute_user else None,
            "reviewer_name": r.reviewer.full_name if r.reviewer else None,
            "review_note": r.review_note,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return results


def review_admin_leave_request(
    db: Session,
    request_id: str,
    action: str,  # "APPROVED" | "REJECTED"
    review_note: Optional[str],
    admin_user_id: str
) -> Dict[str, Any]:
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn xin nghỉ phép.")
    
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="Đơn xin nghỉ phép đã được xử lý trước đó.")

    action_norm = action.strip().upper()
    if action_norm not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Hành động duyệt không hợp lệ.")

    req.status = action_norm
    req.reviewer_id = admin_user_id
    req.review_note = review_note
    req.reviewed_at = datetime.now(timezone.utc)

    # If APPROVED, automatically update WorkSchedule for requester
    if action_norm == "APPROVED":
        # Loop through dates from start_date to end_date
        s_dt = datetime.strptime(req.start_date, "%Y-%m-%d").date()
        e_dt = datetime.strptime(req.end_date, "%Y-%m-%d").date()
        delta = (e_dt - s_dt).days

        for i in range(delta + 1):
            curr_date_str = (s_dt + timedelta(days=i)).strftime("%Y-%m-%d")
            sched = (
                db.query(WorkSchedule)
                .filter(WorkSchedule.user_id == req.user_id, WorkSchedule.work_date == curr_date_str)
                .first()
            )
            orig_shift = sched.shift_code if sched else "CA1"
            if sched:
                sched.shift_code = "LEAVE"
                sched.status = "ON_LEAVE"
                sched.notes = f"Nghỉ phép: {LEAVE_TYPES_MAP.get(req.leave_type, req.leave_type)}"
            else:
                db.add(WorkSchedule(
                    id=str(uuid.uuid4()),
                    user_id=req.user_id,
                    work_date=curr_date_str,
                    shift_code="LEAVE",
                    status="ON_LEAVE",
                    notes=f"Nghỉ phép: {LEAVE_TYPES_MAP.get(req.leave_type, req.leave_type)}",
                ))

            # If substitute was specified, assign them the original shift
            if req.substitute_user_id:
                sub_sched = (
                    db.query(WorkSchedule)
                    .filter(WorkSchedule.user_id == req.substitute_user_id, WorkSchedule.work_date == curr_date_str)
                    .first()
                )
                if sub_sched:
                    sub_sched.shift_code = orig_shift
                    sub_sched.notes = f"Trực thay cho {req.user.full_name if req.user else ''}"
                else:
                    db.add(WorkSchedule(
                        id=str(uuid.uuid4()),
                        user_id=req.substitute_user_id,
                        work_date=curr_date_str,
                        shift_code=orig_shift,
                        status="SCHEDULED",
                        notes=f"Trực thay cho {req.user.full_name if req.user else ''}",
                    ))

    db.commit()
    return {
        "status": "success",
        "request_id": req.id,
        "new_status": req.status,
        "message": "Đã phê duyệt đơn xin nghỉ phép." if action_norm == "APPROVED" else "Đã từ chối đơn xin nghỉ phép.",
    }


def export_roster_csv(db: Session, month_str: Optional[str] = None) -> str:
    matrix = get_admin_roster_matrix(db, month_str)
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    header = ["Mã NV", "Họ và tên", "Chức danh"]
    for d in matrix["days_header"]:
        header.append(f"{d['weekday_label']} {d['day']:02d}")
    header.append("Tổng ca làm")
    writer.writerow(header)

    # Rows
    for u in matrix["users"]:
        row = [u["employee_code"], u["full_name"], u["role"]]
        for d in matrix["days_header"]:
            row.append(u["shifts"].get(d["date"], "OFF"))
        row.append(u["total_shifts"])
        writer.writerow(row)

    return output.getvalue()
