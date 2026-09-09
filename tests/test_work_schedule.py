import os
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

# Ensure test DB is isolated
os.environ["DATABASE_URL"] = "sqlite:///./data/test_app.db"
os.environ["ENVIRONMENT"] = "development"

from backend.app.config import get_settings
get_settings.cache_clear()

from backend.app.db import SessionLocal, init_db
from backend.app.models import User, WorkSchedule, LeaveRequest
from backend.app.auth import hash_password
from backend.app.work_schedule import (
    get_user_monthly_schedule,
    create_leave_request,
    get_admin_roster_matrix,
    assign_admin_shifts,
    review_admin_leave_request,
    preview_auto_pattern_roster,
)



@pytest.fixture
def db():
    init_db()
    session = SessionLocal()
    yield session
    session.close()


def test_work_schedule_and_leave_workflow(db):
    # 1. Create a test employee user and an admin user
    test_emp = db.query(User).filter(User.employee_code == "NV_SCHED_01").first()
    if not test_emp:
        test_emp = User(
            employee_code="NV_SCHED_01",
            full_name="Nguyễn Văn Lịch",
            password_hash=hash_password("Pass123!"),
            role="EMPLOYEE",
            is_active=True,
        )
        db.add(test_emp)

    test_admin = db.query(User).filter(User.employee_code == "ADM_SCHED_01").first()
    if not test_admin:
        test_admin = User(
            employee_code="ADM_SCHED_01",
            full_name="Admin Điều Hành",
            password_hash=hash_password("AdminPass123!"),
            role="ADMIN",
            is_active=True,
        )
        db.add(test_admin)

    db.commit()
    db.refresh(test_emp)
    db.refresh(test_admin)

    # Clean up prior test records to ensure idempotency across runs
    db.query(LeaveRequest).filter(LeaveRequest.user_id == test_emp.id).delete()
    db.query(WorkSchedule).filter(WorkSchedule.user_id == test_emp.id).delete()
    db.commit()

    # 2. Query user monthly schedule
    user_sched = get_user_monthly_schedule(db, test_emp.id, month_str="2026-09")
    assert user_sched["month"] == "2026-09"
    assert len(user_sched["days"]) == 30
    assert "summary" in user_sched

    # 3. Admin assigns specific shift to employee on 2026-09-15
    assign_count = assign_admin_shifts(
        db,
        assignments=[
            {
                "user_id": test_emp.id,
                "work_date": "2026-09-15",
                "shift_code": "CA2",
                "notes": "Trực bến Tân Thuận ca chiều",
            }
        ],
        admin_user_id=test_admin.id,
    )
    assert assign_count == 1

    # Check updated schedule for user
    updated_user_sched = get_user_monthly_schedule(db, test_emp.id, month_str="2026-09")
    day_15 = next(d for d in updated_user_sched["days"] if d["date"] == "2026-09-15")
    assert day_15["shift_code"] == "CA2"
    assert day_15["notes"] == "Trực bến Tân Thuận ca chiều"

    # 4. User submits a leave request for 2026-09-15
    leave_req = create_leave_request(
        db,
        user_id=test_emp.id,
        data={
            "leave_type": "ANNUAL",
            "start_date": "2026-09-15",
            "end_date": "2026-09-15",
            "shift_code": "CA2",
            "reason": "Việc gia đình có tang",
        },
    )
    assert leave_req.status == "PENDING"
    assert leave_req.user_id == test_emp.id

    # 5. Admin reviews and approves leave request
    review_res = review_admin_leave_request(
        db,
        request_id=leave_req.id,
        action="APPROVED",
        review_note="Đã sắp xếp người trực thay, đồng ý cho nghỉ.",
        admin_user_id=test_admin.id,
    )
    assert review_res["status"] == "success"
    assert review_res["new_status"] == "APPROVED"

    # 6. Verify employee schedule for 2026-09-15 is automatically converted to LEAVE
    post_leave_sched = get_user_monthly_schedule(db, test_emp.id, month_str="2026-09")
    day_15_post = next(d for d in post_leave_sched["days"] if d["date"] == "2026-09-15")
    assert day_15_post["shift_code"] == "LEAVE"
    assert day_15_post["status"] == "ON_LEAVE"

    # 7. Query admin roster matrix
    roster = get_admin_roster_matrix(db, month_str="2026-09")
    assert len(roster["days_header"]) == 30
    user_row = next((u for u in roster["users"] if u["user_id"] == test_emp.id), None)
    assert user_row is not None
    assert user_row["shifts"]["2026-09-15"] == "LEAVE"


def test_auto_pattern_preview(db):
    preview = preview_auto_pattern_roster(
        db,
        month_str="2026-09",
        pattern_type="THREE_SHIFT_FOUR_TEAM",
    )
    assert preview["month"] == "2026-09"
    assert preview["pattern_type"] == "THREE_SHIFT_FOUR_TEAM"
    assert preview["total_assignments"] > 0
    assert "changed_count" in preview
    assert "unchanged_count" in preview
    assert "leave_conflicts_count" in preview
    assert "insufficient_rest_count" in preview
    assert "understaffed_shifts_count" in preview
