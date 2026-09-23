import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.auth import hash_password
from backend.app.db import Base, get_db, migrate_db
from backend.app.main import app
from backend.app.models import AdminAuditLog, LeaveRequest, OperationalAssignment, OperationalZone, User, WorkSchedule
from backend.app.operational_assignments import apply, availability, board, cancel, preview, shift_window, timing_state
from backend.app.work_schedule import assign_admin_shifts, auto_pattern_admin_roster, get_admin_roster_matrix, get_user_monthly_schedule, preview_auto_pattern_roster, review_admin_leave_request

DATE = "2030-09-23"


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    migrate_db(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def people(db):
    users = []
    for code, role in (("9B-A", "ADMIN"), ("9B-B", "EMPLOYEE"), ("9B-C", "EMPLOYEE"), ("9B-D", "EMPLOYEE")):
        user = User(id=str(uuid.uuid4()), employee_code=code, full_name=code, password_hash=hash_password("Password123!"), role=role, is_active=True)
        db.add(user)
        users.append(user)
    zones = []
    for code in ("9B-Z1", "9B-Z2"):
        zone = OperationalZone(id=str(uuid.uuid4()), code=code, name=code, map_polygon="[]", is_active=True)
        db.add(zone)
        zones.append(zone)
    db.commit()
    return users, zones


def schedule(db, user, shift="CA1", day=DATE):
    db.add(WorkSchedule(id=str(uuid.uuid4()), user_id=user.id, work_date=day, shift_code=shift, status="SCHEDULED"))
    db.commit()


def item(user, zone, role="PRIMARY"):
    return {"user_id": user.id, "zone_id": zone.id, "assignment_role": role}


def test_missing_schedule_is_unassigned_and_cannot_assign(db, people):
    users, zones = people
    day = next(x for x in get_user_monthly_schedule(db, users[1].id, "2030-09")["days"] if x["date"] == DATE)
    assert day["shift_code"] == day["status"] == "UNASSIGNED"
    assert not day["is_work"]
    assert get_admin_roster_matrix(db, "2030-09")["users"][1]["shifts"][DATE] == "UNASSIGNED"
    assert availability(db, users[1], DATE, "CA1")["state"] == "UNASSIGNED_SHIFT"
    assert preview(db, DATE, "CA1", [item(users[1], zones[0])])["conflict_count"] == 1


@pytest.mark.parametrize("shift,state", [("CA2", "SHIFT_MISMATCH"), ("OFF", "OFF"), ("LEAVE", "APPROVED_LEAVE")])
def test_wrong_or_nonworking_schedule_blocks(db, people, shift, state):
    users, zones = people
    schedule(db, users[1], shift)
    assert availability(db, users[1], DATE, "CA1")["state"] == state
    assert preview(db, DATE, "CA1", [item(users[1], zones[0])])["conflict_count"] == 1


def test_matching_schedule_pending_warning_and_approved_block(db, people):
    users, zones = people
    schedule(db, users[1])
    assert availability(db, users[1], DATE, "CA1")["assignable"]
    leave = LeaveRequest(id=str(uuid.uuid4()), user_id=users[1].id, leave_type="ANNUAL", start_date=DATE, end_date=DATE,
                         shift_code="CA1", reason="test", status="PENDING")
    db.add(leave)
    db.commit()
    checked = preview(db, DATE, "CA1", [item(users[1], zones[0])])
    assert checked["warning_count"] == 1 and checked["conflict_count"] == 0
    leave.status = "APPROVED"
    db.commit()
    assert availability(db, users[1], DATE, "CA1")["state"] == "APPROVED_LEAVE"
    assert preview(db, DATE, "CA1", [item(users[1], zones[0])])["conflict_count"] == 1


def test_inactive_user_and_zone_block(db, people):
    users, zones = people
    schedule(db, users[1])
    users[1].is_active = False
    assert preview(db, DATE, "CA1", [item(users[1], zones[0])])["conflict_count"] == 1
    users[1].is_active = True
    zones[0].is_active = False
    assert preview(db, DATE, "CA1", [item(users[1], zones[0])])["conflict_count"] == 1


def test_primary_support_cardinality_duplicate_and_multiple_zones(db, people):
    users, zones = people
    for user in users[1:]:
        schedule(db, user)
    created = apply(db, DATE, "CA1", [item(users[1], zones[0]), item(users[2], zones[0], "SUPPORT"),
                                      item(users[3], zones[0], "SUPPORT"), item(users[1], zones[1])], users[0].id)
    assert len(created) == 4
    assert len(board(db, DATE, "CA1")["zones"][0]["assignments"]) == 3
    assert preview(db, DATE, "CA1", [item(users[2], zones[0])])["conflict_count"] == 1
    assert preview(db, DATE, "CA1", [item(users[2], zones[0], "SUPPORT")])["conflict_count"] == 1
    assert db.query(AdminAuditLog).filter_by(action="OPERATIONAL_ASSIGNMENT_CREATED").count() == 4


def test_batch_preview_apply_atomic_cancel_and_replace(db, people):
    users, zones = people
    schedule(db, users[1]); schedule(db, users[2])
    valid = item(users[1], zones[0])
    invalid = item(users[2], zones[0])
    assert preview(db, DATE, "CA1", [valid, invalid])["conflict_count"] == 1
    with pytest.raises(HTTPException) as exc:
        apply(db, DATE, "CA1", [valid, invalid], users[0].id)
    assert exc.value.status_code == 409
    assert db.query(OperationalAssignment).count() == 0
    apply(db, DATE, "CA1", [valid], users[0].id)
    old = db.query(OperationalAssignment).one()
    cancel(db, old, users[0].id, "ADMIN_CANCELLED")
    db.commit()
    replacement = apply(db, DATE, "CA1", [invalid], users[0].id)[0]
    assert replacement["id"] != old.id
    assert old.status == "CANCELLED" and old.cancelled_at and old.cancel_reason == "ADMIN_CANCELLED"
    assert db.query(AdminAuditLog).filter_by(action="OPERATIONAL_ASSIGNMENT_CANCELLED").count() == 1


def test_database_unique_indexes_and_no_history_fabrication(db, people):
    users, zones = people
    assert db.query(OperationalAssignment).count() == 0
    first = OperationalAssignment(id=str(uuid.uuid4()), user_id=users[1].id, zone_id=zones[0].id, work_date=DATE,
                                  shift_code="CA1", assignment_role="PRIMARY", status="ASSIGNED")
    db.add(first); db.commit()
    second = OperationalAssignment(id=str(uuid.uuid4()), user_id=users[1].id, zone_id=zones[0].id, work_date=DATE,
                                   shift_code="CA1", assignment_role="SUPPORT", status="ASSIGNED")
    db.add(second)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    third = OperationalAssignment(id=str(uuid.uuid4()), user_id=users[2].id, zone_id=zones[0].id, work_date=DATE,
                                  shift_code="CA1", assignment_role="PRIMARY", status="ASSIGNED")
    db.add(third)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_shift_change_cancels_without_migration(db, people):
    users, zones = people
    schedule(db, users[1])
    apply(db, DATE, "CA1", [item(users[1], zones[0])], users[0].id)
    assign_admin_shifts(db, [{"user_id": users[1].id, "work_date": DATE, "shift_code": "CA2"}], users[0].id)
    old = db.query(OperationalAssignment).one()
    assert old.status == "CANCELLED" and old.shift_code == "CA1" and old.cancel_reason == "SHIFT_CHANGED"
    assert db.query(OperationalAssignment).filter_by(shift_code="CA2").count() == 0


def test_leave_approval_cancels_but_substitute_stays_suggestion(db, people):
    users, zones = people
    schedule(db, users[1]); schedule(db, users[2])
    apply(db, DATE, "CA1", [item(users[1], zones[0])], users[0].id)
    leave = LeaveRequest(id=str(uuid.uuid4()), user_id=users[1].id, leave_type="ANNUAL", start_date=DATE, end_date=DATE,
                         shift_code="CA1", reason="test", status="PENDING", substitute_user_id=users[2].id)
    db.add(leave); db.commit()
    review_admin_leave_request(db, leave.id, "APPROVED", None, users[0].id)
    old = db.query(OperationalAssignment).one()
    assert old.status == "CANCELLED" and old.cancel_reason == "APPROVED_LEAVE"
    assert db.query(WorkSchedule).filter_by(user_id=users[2].id, work_date=DATE).one().shift_code == "CA1"
    assert db.query(OperationalAssignment).filter_by(user_id=users[2].id).count() == 0
    assert apply(db, DATE, "CA1", [item(users[2], zones[0])], users[0].id)


def test_ca3_window_and_timing_after_midnight(db, people):
    start, end = shift_window(DATE, "CA3")
    assert start.isoformat().startswith("2030-09-23T22:00")
    assert end.isoformat().startswith("2030-09-24T06:00")
    row = OperationalAssignment(work_date=DATE, shift_code="CA3", status="ASSIGNED")
    assert timing_state(row, datetime(2030, 9, 24, 2, tzinfo=ZoneInfo("Asia/Ho_Chi_Minh"))) == "CURRENT"


def test_auto_pattern_reports_assignment_impact_and_cancels_old_shift(db, people):
    users, zones = people
    schedule(db, users[1])
    apply(db, DATE, "CA1", [item(users[1], zones[0])], users[0].id)
    impact = preview_auto_pattern_roster(db, "2030-09", [users[1].id], "THREE_SHIFT_FOUR_TEAM")
    assert impact["assignment_impact_count"] == 1
    auto_pattern_admin_roster(db, "2030-09", [users[1].id], "THREE_SHIFT_FOUR_TEAM", users[0].id)
    old = db.query(OperationalAssignment).one()
    assert old.status == "CANCELLED" and old.cancel_reason == "SHIFT_CHANGED"
    assert db.query(OperationalAssignment).filter_by(user_id=users[1].id, status="ASSIGNED").count() == 0


def test_inactive_lifecycle_keeps_history_but_marks_unavailable(db, people):
    users, zones = people
    schedule(db, users[1])
    apply(db, DATE, "CA1", [item(users[1], zones[0])], users[0].id)
    users[1].is_active = False
    assert board(db, DATE, "CA1")["zones"][0]["assignments"][0]["actionable"] is False
    users[1].is_active = True
    zones[0].is_active = False
    assert board(db, DATE, "CA1")["zones"][0]["assignments"][0]["actionable"] is False
    assert db.query(OperationalAssignment).count() == 1


def test_partial_shift_leave_does_not_hide_other_shift(db, people):
    users, zones = people
    schedule(db, users[1], "CA2")
    leave = LeaveRequest(id=str(uuid.uuid4()), user_id=users[1].id, leave_type="ANNUAL", start_date=DATE, end_date=DATE,
                         shift_code="CA1", reason="test", status="PENDING")
    db.add(leave); db.commit()
    review_admin_leave_request(db, leave.id, "APPROVED", None, users[0].id)
    day = next(x for x in get_user_monthly_schedule(db, users[1].id, "2030-09")["days"] if x["date"] == DATE)
    assert day["shift_code"] == "CA2"
    assert availability(db, users[1], DATE, "CA2")["assignable"]


def test_api_auth_csrf_user_isolation_and_scope_untouched(db, people):
    users, zones = people
    schedule(db, users[1]); schedule(db, users[2])
    def override_db():
        yield db
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            assert client.post('/api/v1/admin/operational-assignments/apply', json={}).status_code == 401
            client.post('/api/v1/auth/login', json={"employee_code": users[1].employee_code, "password": "Password123!"})
            payload = {"work_date": DATE, "shift_code": "CA1", "items": [item(users[1], zones[0])]}
            assert client.get(f'/api/v1/admin/operational-assignments?date={DATE}&shift_code=CA1').status_code == 403
            assert client.post('/api/v1/admin/operational-assignments/apply', json=payload).status_code in (403, 404)
            client.post('/api/v1/auth/login', json={"employee_code": users[0].employee_code, "password": "Password123!"})
            assert client.post('/api/v1/admin/operational-assignments/apply', json=payload).status_code == 403
            csrf = client.get('/api/v1/auth/csrf').json()['csrf_token']
            headers = {"X-CSRF-Token": csrf}
            assert client.post('/api/v1/admin/operational-assignments/preview', json=payload, headers=headers).status_code == 200
            response = client.post('/api/v1/admin/operational-assignments/apply', json=payload, headers=headers)
            assert response.status_code == 200, response.text
            client.post('/api/v1/auth/login', json={"employee_code": users[2].employee_code, "password": "Password123!"})
            assert client.get('/api/v1/operational-assignments/me?month=2030-09').json() == []
            client.post('/api/v1/auth/login', json={"employee_code": users[1].employee_code, "password": "Password123!"})
            own = client.get('/api/v1/operational-assignments/me?month=2030-09')
            assert own.status_code == 200 and len(own.json()) == 1
            assert client.get('/api/v1/meter-operations/today').status_code == 200
    finally:
        app.dependency_overrides.clear()
