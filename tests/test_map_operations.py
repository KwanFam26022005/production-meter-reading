import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import pytest
from fastapi.testclient import TestClient

from backend.app.auth import generate_csrf_token, hash_password, hash_session_token
from backend.app.config import get_settings
from backend.app.db import SessionLocal, init_db
from backend.app.main import app
from backend.app.models import (
    AdminAuditLog,
    Meter,
    OperationalZone,
    ReadingBatch,
    ReadingRound,
    SessionModel,
    User,
    ZoneAssignment,
)

from backend.scripts.seed_admin_demo_month import DEFAULT_DEMO_METERS

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()
    db = SessionLocal()
    try:
        if db.query(Meter).count() == 0:
            meter_coords = {
                'CT-001': ('zone-technical', 0.18, 0.74),
                'CT-002': ('zone-warehouse', 0.20, 0.24),
                'CT-003': ('zone-berth', 0.72, 0.24),
                'CT-004': ('zone-berth', 0.73, 0.50),
                'CT-005': ('zone-warehouse', 0.21, 0.38),
                'CT-006': ('zone-warehouse', 0.22, 0.52),
                'CT-007': ('zone-technical', 0.36, 0.84),
                'CT-008': ('zone-berth', 0.74, 0.78),
                'CT-009': ('zone-technical', 0.40, 0.20),
                'CT-010': ('zone-technical', 0.52, 0.20),
                'CT-011': ('zone-container', 0.44, 0.46),
                'CT-012': ('zone-container', 0.49, 0.62),
            }
            for dm in DEFAULT_DEMO_METERS:
                code = dm["meter_code"]
                zid, mx, my = meter_coords.get(code, ("zone-technical", 0.5, 0.5))
                m = Meter(
                    id=str(uuid.uuid4()),
                    meter_code=code,
                    name=dm["name"],
                    location=dm["location"],
                    meter_type=dm["meter_type"],
                    zone_id=zid,
                    map_x=mx,
                    map_y=my,
                    is_active=True,
                )
                db.add(m)
            db.commit()
    finally:
        db.close()


def create_test_admin_session():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                employee_code="ADMIN_MAP_TEST",
                full_name="Quản Trị Viên Bản Đồ",
                password_hash=hash_password("AdminPass123!"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        token = f"test_map_session_{uuid.uuid4().hex}"
        t_hash = hash_session_token(token)
        s_obj = SessionModel(
            id=str(uuid.uuid4()),
            user_id=admin.id,
            token_hash=t_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestMapRunner",
        )
        db.add(s_obj)
        db.commit()

        csrf_token = generate_csrf_token(token)
        admin_id = str(admin.id)
        return token, csrf_token, admin_id
    finally:
        db.close()


def test_map_endpoints_require_admin():
    # Unauthenticated requests should be rejected with 401
    resp_overview = client.get("/api/v1/map/overview")
    assert resp_overview.status_code == 401

    resp_zones = client.get("/api/v1/map/zones")
    assert resp_zones.status_code == 401

    resp_meters = client.get("/api/v1/map/meters")
    assert resp_meters.status_code == 401


def test_map_overview_endpoint():
    token, csrf_token, admin = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}

    resp = client.get("/api/v1/map/overview", cookies=cookies)
    assert resp.status_code == 200
    data = resp.json()

    assert "target_date" in data
    assert "target_date_vn" in data
    assert "zones" in data
    assert "meters" in data
    assert len(data["zones"]) == 4
    assert len(data["meters"]) >= 12

    # Verify zones data
    zone_codes = {z["code"] for z in data["zones"]}
    assert "ZONE-BERTH" in zone_codes
    assert "ZONE-CONTAINER" in zone_codes
    assert "ZONE-WAREHOUSE" in zone_codes
    assert "ZONE-TECHNICAL" in zone_codes

    # Verify meter coordinates and states
    for m in data["meters"]:
        assert m["meter_code"].startswith("CT-")
        assert m["map_x"] is not None
        assert m["map_y"] is not None
        assert 0.0 <= m["map_x"] <= 1.0
        assert 0.0 <= m["map_y"] <= 1.0
        assert m["semantic_state"] in [
            "CONFIRMED",
            "PENDING",
            "DUE",
            "OVERDUE",
            "REVIEW",
            "INACTIVE",
        ]


def test_map_zones_endpoint():
    token, csrf_token, admin = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}

    resp = client.get("/api/v1/map/zones", cookies=cookies)
    assert resp.status_code == 200
    zones = resp.json()
    assert len(zones) == 4
    for z in zones:
        assert z["id"] in ["zone-berth", "zone-container", "zone-warehouse", "zone-technical"]
        assert len(z["map_polygon"]) > 10


def test_map_meters_filtered_by_zone():
    token, csrf_token, admin = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}

    resp = client.get("/api/v1/map/meters?zone_id=zone-berth", cookies=cookies)
    assert resp.status_code == 200
    meters = resp.json()
    assert len(meters) == 3
    for m in meters:
        assert m["zone_id"] == "zone-berth"


def test_zone_reassignment_with_audit_log():
    token, csrf_token, admin_id = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}
    headers = {"X-CSRF-Token": csrf_token}

    db = SessionLocal()
    try:
        # Find an employee
        emp = db.query(User).filter(User.role != "ADMIN", User.is_active == True).first()
        assert emp is not None

        # Reassign zone-berth
        payload = {
            "user_id": emp.id,
            "assignment_role": "PRIMARY",
            "note": "Điều phối ca tác nghiệp đặc biệt",
        }
        resp = client.post(
            "/api/v1/map/zones/zone-berth/assign",
            json=payload,
            cookies=cookies,
            headers=headers,
        )
        assert resp.status_code == 200
        res_data = resp.json()
        assert res_data["status"] == "success"
        assert res_data["user_id"] == emp.id

        # Verify audit log was produced
        audit = (
            db.query(AdminAuditLog)
            .filter(AdminAuditLog.action == "ZONE_OPERATOR_REASSIGNED")
            .order_by(AdminAuditLog.created_at.desc())
            .first()
        )
        assert audit is not None
        assert audit.actor_user_id == admin_id
        assert audit.resource_type == "ZONE_ASSIGNMENT"
    finally:
        db.close()


def test_map_operators_endpoint():
    token, csrf_token, _ = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}

    resp = client.get("/api/v1/map/operators", cookies=cookies)
    assert resp.status_code == 200
    operators = resp.json()
    assert isinstance(operators, list)
    assert len(operators) > 0
    for op in operators:
        assert "id" in op
        assert "employee_code" in op
        assert "full_name" in op


def test_map_overview_round_switching():
    token, csrf_token, _ = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}

    # Ensure rounds exist for 2026-08-25
    db = SessionLocal()
    try:
        tz = ZoneInfo("Asia/Ho_Chi_Minh")
        r_count = (
            db.query(ReadingRound)
            .filter(
                ReadingRound.scheduled_at >= datetime(2026, 8, 25, 0, 0, tzinfo=tz),
                ReadingRound.scheduled_at <= datetime(2026, 8, 25, 23, 59, tzinfo=tz),
            )
            .count()
        )
        if r_count < 2:
            batch = db.query(ReadingBatch).filter(ReadingBatch.period_key == "2026-08").first()
            if not batch:
                batch = ReadingBatch(id=str(uuid.uuid4()), name="Đợt 2026-08", period_key="2026-08", status="OPEN")
                db.add(batch)
                db.flush()
            r1_obj = ReadingRound(
                id=str(uuid.uuid4()),
                batch_id=batch.id,
                scheduled_at=datetime(2026, 8, 25, 8, 0, tzinfo=tz),
                status="CLOSED",
                is_legacy=False,
            )
            r2_obj = ReadingRound(
                id=str(uuid.uuid4()),
                batch_id=batch.id,
                scheduled_at=datetime(2026, 8, 25, 10, 0, tzinfo=tz),
                status="OPEN",
                is_legacy=False,
            )
            db.add_all([r1_obj, r2_obj])
            db.commit()
    finally:
        db.close()

    # Query 2026-08-25 dashboard to get rounds
    dash_resp = client.get("/api/v1/admin/dashboard?date=2026-08-25", cookies=cookies)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    rounds = dash_data["round_progress"]
    assert len(rounds) >= 2

    r1 = rounds[0]  # e.g. 08:00
    r2 = rounds[1]  # second round

    # Query overview for round 1
    resp_r1 = client.get(f"/api/v1/map/overview?date=2026-08-25&round_id={r1['round_id']}", cookies=cookies)
    assert resp_r1.status_code == 200
    data_r1 = resp_r1.json()
    assert data_r1["selected_round_id"] == r1["round_id"]
    assert data_r1["current_round_time"] == r1["scheduled_time"]
    assert data_r1["confirmed_count"] == r1["confirmed"]
    assert data_r1["completion_percent"] == r1["completion_percent"]

    # Query overview for round 2
    resp_r2 = client.get(f"/api/v1/map/overview?date=2026-08-25&round_id={r2['round_id']}", cookies=cookies)
    assert resp_r2.status_code == 200
    data_r2 = resp_r2.json()
    assert data_r2["selected_round_id"] == r2["round_id"]
    assert data_r2["current_round_time"] == r2["scheduled_time"]
    assert data_r2["confirmed_count"] == r2["confirmed"]
    assert data_r2["completion_percent"] == r2["completion_percent"]

    # Round 1 and Round 2 data must be distinct reflecting that round's operational state
    assert data_r1["current_round_time"] != data_r2["current_round_time"]


def test_admin_meter_creation_with_spatial_coordinates():
    token, csrf_token, _ = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}

    # Ensure clean slate for CT-V7-NEW
    db = SessionLocal()
    try:
        db.query(Meter).filter(Meter.meter_code == "CT-V7-NEW").delete()
        db.commit()
    finally:
        db.close()

    create_payload = {
        "meter_code": "CT-V7-NEW",
        "name": "Công tơ thử nghiệm V7",
        "location": "Bãi Container Trung tâm",
        "meter_type": "LCD",
        "zone_id": "zone-container",
        "map_x": 0.6115,
        "map_y": 0.5323,
    }

    resp = client.post(
        "/api/v1/admin/meters",
        json=create_payload,
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["meter_code"] == "CT-V7-NEW"
    assert data["zone_id"] == "zone-container"
    assert data["map_x"] == 0.6115
    assert data["map_y"] == 0.5323

    # Check audit log
    db = SessionLocal()
    try:
        audit = (
            db.query(AdminAuditLog)
            .filter(AdminAuditLog.action == "METER_CREATED", AdminAuditLog.resource_id == data["id"])
            .first()
        )
        assert audit is not None
        after_data = json.loads(audit.after_json) if isinstance(audit.after_json, str) else audit.after_json
        assert after_data["meter_code"] == "CT-V7-NEW"
        assert after_data["zone_id"] == "zone-container"
        assert after_data["map_x"] == 0.6115
        assert after_data["map_y"] == 0.5323
    finally:
        db.close()


def test_admin_meter_relocation_updates_coordinates_and_audit_log():
    token, csrf_token, _ = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}

    # First fetch meters to find CT-V7-NEW
    resp = client.get("/api/v1/admin/meters?search=CT-V7-NEW", cookies=cookies)
    assert resp.status_code == 200
    meters = resp.json()["meters"]
    assert len(meters) >= 1
    target = meters[0]

    # Relocate to new coordinates
    update_payload = {
        "zone_id": "zone-berth",
        "map_x": 0.7311,
        "map_y": 0.3812,
    }

    patch_resp = client.patch(
        f"/api/v1/admin/meters/{target['id']}",
        json=update_payload,
        headers={"X-CSRF-Token": csrf_token},
        cookies=cookies,
    )
    assert patch_resp.status_code == 200, patch_resp.text
    updated = patch_resp.json()
    assert updated["zone_id"] == "zone-berth"
    assert updated["map_x"] == 0.7311
    assert updated["map_y"] == 0.3812

    # Check audit log for METER_UPDATED
    db = SessionLocal()
    try:
        audit = (
            db.query(AdminAuditLog)
            .filter(AdminAuditLog.action == "METER_UPDATED", AdminAuditLog.resource_id == target["id"])
            .order_by(AdminAuditLog.created_at.desc())
            .first()
        )
        assert audit is not None
        before_data = json.loads(audit.before_json) if isinstance(audit.before_json, str) else audit.before_json
        after_data = json.loads(audit.after_json) if isinstance(audit.after_json, str) else audit.after_json
        assert before_data["zone_id"] == "zone-container"
        assert after_data["zone_id"] == "zone-berth"
        assert after_data["map_x"] == 0.7311
        assert after_data["map_y"] == 0.3812

        # Clean up test meter
        db.query(Meter).filter(Meter.id == target["id"]).delete()
        db.commit()
    finally:
        db.close()



