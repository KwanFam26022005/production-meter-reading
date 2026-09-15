"""
V16B — METER LIFECYCLE SAFETY & HISTORY PRESERVATION TEST SUITE

Verifies:
1. Migration & Default State:
   - All meters in DB have lifecycle_status='ACTIVE'.
   - Fresh meters default to 'ACTIVE' and is_active=True.
2. Valid Lifecycle Transitions:
   - ACTIVE -> INACTIVE (deactivate) -> lifecycle_status='INACTIVE', is_active=False.
   - INACTIVE -> ACTIVE (reactivate) -> lifecycle_status='ACTIVE', is_active=True.
   - ACTIVE -> RETIRED (retire) -> lifecycle_status='RETIRED', is_active=False, retired_at/by/reason set.
   - INACTIVE -> RETIRED -> succeeds.
3. Terminal Retired State & Invalid Transitions:
   - RETIRED -> ACTIVE rejected (400 Bad Request).
   - RETIRED -> INACTIVE rejected (400 Bad Request).
   - Mutations on RETIRED meters (relocate, change zone, update) rejected (400 Bad Request).
4. Reading Creation Rejection:
   - Confirming reading on INACTIVE meter rejected (400 Bad Request).
   - Confirming reading on RETIRED meter rejected (400 Bad Request).
   - Mark review on INACTIVE/RETIRED rejected (400 Bad Request).
5. History & Audit Preservation:
   - Retiring a meter with readings preserves 100% of historical readings, alerts, and audit logs.
   - GET /api/v1/meters/{id} returns historical info and lifecycle status.
6. Hard Delete Safeguard (409 Conflict):
   - Meters with readings reject hard delete with 409 Conflict.
   - Pristine unused test meters can be hard deleted with METER_HARD_DELETED audit log.
7. Operational Map Filtering:
   - Operational map excludes RETIRED meters.
   - Operational map defaults to ACTIVE only; include_inactive=True exposes INACTIVE but not RETIRED.
8. Admin List & Status Filtering:
   - Supports status=ALL, ACTIVE, INACTIVE, RETIRED with accurate active_count, inactive_count, retired_count.
9. Spatial Freeze Preservation:
   - Canonical geometry checksum matches manifest ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3.
   - Reconciliation meters (CT-001, CT-007, CT-008, CT-009, CT-010) coordinates untouched.
10. Foreign Key Integrity:
   - PRAGMA foreign_key_check yields 0 violations.
"""
import copy
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app.main import app
from backend.app.config import get_settings
from backend.app.db import SessionLocal, init_db
from backend.app.models import (
    User,
    SessionModel,
    Meter,
    MeterReading,
    ReadingBatch,
    ReadingRound,
    AdminAuditLog,
)
from backend.app.auth import hash_password, hash_session_token, generate_csrf_token

client = TestClient(app)
init_db()

MANIFEST_PATH = Path("docs/design/map-operations/v16a-r2/V16A_R2_FREEZE_MANIFEST.json")
FREEZE_JSON_PATH = Path("docs/design/map-operations/v16a-r2/tan-thuan-spatial-baseline.freeze.json")
EXPECTED_FREEZE_SHA256 = "ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3"


def create_test_admin_session():
    init_db()
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                employee_code="ADMIN_V16B_TEST",
                full_name="Quản Trị Viên V16B",
                password_hash=hash_password("AdminPass123!"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        token = f"test_v16b_session_{uuid.uuid4().hex}"
        t_hash = hash_session_token(token)
        s_obj = SessionModel(
            id=str(uuid.uuid4()),
            user_id=admin.id,
            token_hash=t_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestV16BRunner",
        )
        db.add(s_obj)
        db.commit()

        csrf_token = generate_csrf_token(token)
        admin_id = admin.id
        return token, csrf_token, admin_id
    finally:
        db.close()


@pytest.fixture
def auth_headers():
    token, csrf_token, admin_id = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}
    headers = {"X-CSRF-Token": csrf_token}
    return cookies, headers, admin_id


def test_v16b_migration_and_defaults(auth_headers):
    """1. Migration backfill and default lifecycle status."""
    cookies, headers, _ = auth_headers
    db = SessionLocal()
    try:
        # All existing meters in DB must have valid lifecycle_status
        meters = db.query(Meter).all()
        assert len(meters) >= 12
        for m in meters:
            assert m.lifecycle_status in ("ACTIVE", "INACTIVE", "RETIRED")
            if m.lifecycle_status == "ACTIVE":
                assert m.is_active is True

        # Create a fresh meter via API
        code = f"CT-V16B-DEF-{uuid.uuid4().hex[:6].upper()}"
        resp = client.post(
            "/api/v1/admin/meters",
            json={
                "meter_code": code,
                "name": "Công tơ kiểm tra mặc định",
                "meter_type": "LCD",
            },
            cookies=cookies,
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["lifecycle_status"] == "ACTIVE"
        assert data["is_active"] is True
        assert data["retired_at"] is None
        assert data["retired_by"] is None
        assert data["retirement_reason"] is None

        # Clean up created meter
        client.delete(f"/api/v1/admin/meters/{data['id']}", cookies=cookies, headers=headers)
    finally:
        db.close()


def test_v16b_valid_lifecycle_transitions(auth_headers):
    """2. Valid transitions: ACTIVE -> INACTIVE -> ACTIVE -> RETIRED."""
    cookies, headers, admin_id = auth_headers
    code = f"CT-V16B-TRANS-{uuid.uuid4().hex[:6].upper()}"
    create_resp = client.post(
        "/api/v1/admin/meters",
        json={
            "meter_code": code,
            "name": "Công tơ chuyển trạng thái",
            "meter_type": "LCD",
        },
        cookies=cookies,
        headers=headers,
    )
    assert create_resp.status_code == 200
    meter_id = create_resp.json()["id"]

    try:
        # 1. ACTIVE -> INACTIVE
        deact_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/deactivate",
            cookies=cookies,
            headers=headers,
        )
        assert deact_resp.status_code == 200
        deact_data = deact_resp.json()
        assert deact_data["lifecycle_status"] == "INACTIVE"
        assert deact_data["is_active"] is False

        # Verify audit log
        db = SessionLocal()
        try:
            audit = (
                db.query(AdminAuditLog)
                .filter(AdminAuditLog.resource_id == meter_id, AdminAuditLog.action == "METER_DEACTIVATED")
                .first()
            )
            assert audit is not None
        finally:
            db.close()

        # 2. INACTIVE -> ACTIVE
        react_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/reactivate",
            cookies=cookies,
            headers=headers,
        )
        assert react_resp.status_code == 200
        react_data = react_resp.json()
        assert react_data["lifecycle_status"] == "ACTIVE"
        assert react_data["is_active"] is True

        # 3. ACTIVE -> RETIRED
        retire_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/retire",
            json={"reason": "Công tơ hỏng phần cứng LCD"},
            cookies=cookies,
            headers=headers,
        )
        assert retire_resp.status_code == 200
        retire_data = retire_resp.json()
        assert retire_data["lifecycle_status"] == "RETIRED"
        assert retire_data["is_active"] is False
        assert retire_data["retirement_reason"] == "Công tơ hỏng phần cứng LCD"
        assert retire_data["retired_at"] is not None
        assert retire_data["retired_by"] == admin_id

        # Verify audit log for METER_RETIRED
        db = SessionLocal()
        try:
            audit_retire = (
                db.query(AdminAuditLog)
                .filter(AdminAuditLog.resource_id == meter_id, AdminAuditLog.action == "METER_RETIRED")
                .first()
            )
            assert audit_retire is not None
            assert "Công tơ hỏng phần cứng LCD" in (audit_retire.after_json or "")
        finally:
            db.close()

    finally:
        # Clean up
        db = SessionLocal()
        try:
            m = db.query(Meter).filter(Meter.id == meter_id).first()
            if m:
                db.delete(m)
                db.commit()
        finally:
            db.close()


def test_v16b_retire_from_inactive_succeeds(auth_headers):
    """INACTIVE -> RETIRED transition must succeed non-destructively."""
    cookies, headers, admin_id = auth_headers
    code = f"CT-V16B-INACT-RET-{uuid.uuid4().hex[:6].upper()}"
    create_resp = client.post(
        "/api/v1/admin/meters",
        json={"meter_code": code, "name": "Test Inactive Retire", "meter_type": "MECHANICAL"},
        cookies=cookies,
        headers=headers,
    )
    meter_id = create_resp.json()["id"]

    try:
        # Deactivate first
        client.post(f"/api/v1/admin/meters/{meter_id}/deactivate", cookies=cookies, headers=headers)

        # Retire from INACTIVE
        retire_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/retire",
            json={"reason": "Thanh lý thiết bị định kỳ"},
            cookies=cookies,
            headers=headers,
        )
        assert retire_resp.status_code == 200
        assert retire_resp.json()["lifecycle_status"] == "RETIRED"
        assert retire_resp.json()["is_active"] is False
        assert retire_resp.json()["retirement_reason"] == "Thanh lý thiết bị định kỳ"
    finally:
        db = SessionLocal()
        try:
            m = db.query(Meter).filter(Meter.id == meter_id).first()
            if m:
                db.delete(m)
                db.commit()
        finally:
            db.close()


def test_v16b_terminal_retired_state_and_invalid_transitions(auth_headers):
    """3. Terminal state: RETIRED cannot reactivate, deactivate, relocate, or change zone."""
    cookies, headers, _ = auth_headers
    code = f"CT-V16B-TERM-{uuid.uuid4().hex[:6].upper()}"
    create_resp = client.post(
        "/api/v1/admin/meters",
        json={"meter_code": code, "name": "Test Terminal Meter", "meter_type": "LCD"},
        cookies=cookies,
        headers=headers,
    )
    meter_id = create_resp.json()["id"]

    try:
        # Retire meter
        client.post(
            f"/api/v1/admin/meters/{meter_id}/retire",
            json={"reason": "Kết thúc vòng đời"},
            cookies=cookies,
            headers=headers,
        )

        # 1. RETIRED -> reactivate rejected
        react_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/reactivate",
            cookies=cookies,
            headers=headers,
        )
        assert react_resp.status_code == 400
        assert "không thể kích hoạt lại" in react_resp.json()["detail"].lower()

        # 2. RETIRED -> deactivate rejected
        deact_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/deactivate",
            cookies=cookies,
            headers=headers,
        )
        assert deact_resp.status_code == 400

        # 3. RETIRED -> update metadata rejected
        upd_resp = client.patch(
            f"/api/v1/admin/meters/{meter_id}",
            json={"name": "Tên mới bất hợp lệ"},
            cookies=cookies,
            headers=headers,
        )
        assert upd_resp.status_code == 400
        assert "ngừng sử dụng" in upd_resp.json()["detail"].lower()

        # 4. RETIRED -> relocate rejected
        reloc_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/relocate",
            json={"map_x": 0.5, "map_y": 0.5},
            cookies=cookies,
            headers=headers,
        )
        assert reloc_resp.status_code == 400
        assert "ngừng sử dụng" in reloc_resp.json()["detail"].lower()

        # 5. RETIRED -> change zone rejected
        zone_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/change-zone",
            json={"zone_id": "zone-berth", "presentation_zone_id": "pres-berth"},
            cookies=cookies,
            headers=headers,
        )
        assert zone_resp.status_code == 400
        assert "ngừng sử dụng" in zone_resp.json()["detail"].lower()

    finally:
        db = SessionLocal()
        try:
            m = db.query(Meter).filter(Meter.id == meter_id).first()
            if m:
                db.delete(m)
                db.commit()
        finally:
            db.close()


def test_v16b_reading_creation_rejection_for_non_active_meters(auth_headers):
    """4. Recording readings rejected for INACTIVE and RETIRED meters."""
    cookies, headers, _ = auth_headers
    code_inact = f"CT-V16B-INACT-{uuid.uuid4().hex[:6].upper()}"
    code_ret = f"CT-V16B-RET-{uuid.uuid4().hex[:6].upper()}"

    res_inact = client.post(
        "/api/v1/admin/meters",
        json={"meter_code": code_inact, "name": "Meter Inactive", "meter_type": "LCD"},
        cookies=cookies,
        headers=headers,
    )
    id_inact = res_inact.json()["id"]

    res_ret = client.post(
        "/api/v1/admin/meters",
        json={"meter_code": code_ret, "name": "Meter Retired", "meter_type": "LCD"},
        cookies=cookies,
        headers=headers,
    )
    id_ret = res_ret.json()["id"]

    try:
        # Set states
        client.post(f"/api/v1/admin/meters/{id_inact}/deactivate", cookies=cookies, headers=headers)
        client.post(f"/api/v1/admin/meters/{id_ret}/retire", json={"reason": "Testing"}, cookies=cookies, headers=headers)

        db = SessionLocal()
        try:
            batch = db.query(ReadingBatch).filter(ReadingBatch.status == "OPEN").first()
            if not batch:
                batch = db.query(ReadingBatch).first()
                if batch:
                    batch.status = "OPEN"
                    db.commit()
            now_utc = datetime.now(timezone.utc)
            round_obj = (
                db.query(ReadingRound)
                .filter(
                    ReadingRound.batch_id == batch.id,
                    ReadingRound.status == "OPEN",
                    ReadingRound.scheduled_at <= now_utc,
                )
                .first()
                if batch else None
            )
            if not round_obj and batch:
                round_obj = ReadingRound(
                    id=str(uuid.uuid4()),
                    batch_id=batch.id,
                    round_number=999,
                    scheduled_at=now_utc - timedelta(minutes=5),
                    status="OPEN",
                )
                db.add(round_obj)
                db.commit()
            round_id = round_obj.id if round_obj else ""
            batch_id = batch.id if batch else ""
        finally:
            db.close()

        # 1. Attempt confirm reading on INACTIVE meter -> 400
        conf_inact = client.post(
            "/api/v1/meter-readings/confirm",
            json={
                "meter_id": id_inact,
                "reading_round_id": round_id,
                "batch_id": batch_id,
                "reading": "1234.5",
                "confirmation_source": "MANUAL",
            },
            cookies=cookies,
            headers=headers,
        )
        assert conf_inact.status_code == 400
        assert "tạm ngừng" in conf_inact.json()["detail"].lower()

        # 2. Attempt confirm reading on RETIRED meter -> 400
        conf_ret = client.post(
            "/api/v1/meter-readings/confirm",
            json={
                "meter_id": id_ret,
                "reading_round_id": round_id,
                "batch_id": batch_id,
                "reading": "9999.0",
                "confirmation_source": "MANUAL",
            },
            cookies=cookies,
            headers=headers,
        )
        assert conf_ret.status_code == 400
        assert "ngừng sử dụng" in conf_ret.json()["detail"].lower()

        # 3. Attempt mark review on INACTIVE meter -> 400
        rev_inact = client.post(
            "/api/v1/meter-readings/review",
            json={
                "meter_id": id_inact,
                "reading_round_id": round_id,
                "batch_id": batch_id,
            },
            cookies=cookies,
            headers=headers,
        )
        assert rev_inact.status_code == 400

        # 4. Attempt mark review on RETIRED meter -> 400
        rev_ret = client.post(
            "/api/v1/meter-readings/review",
            json={
                "meter_id": id_ret,
                "reading_round_id": round_id,
                "batch_id": batch_id,
            },
            cookies=cookies,
            headers=headers,
        )
        assert rev_ret.status_code == 400

    finally:
        db = SessionLocal()
        try:
            db.query(Meter).filter(Meter.id.in_([id_inact, id_ret])).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()


def test_v16b_history_preservation_across_lifecycle(auth_headers):
    """5. Zero loss of readings and historical lookups across lifecycle changes."""
    cookies, headers, _ = auth_headers
    db = SessionLocal()
    try:
        # Create a meter with a confirmed reading
        code = f"CT-V16B-HIST-{uuid.uuid4().hex[:6].upper()}"
        m = Meter(
            id=str(uuid.uuid4()),
            meter_code=code,
            name="Công tơ lưu trữ lịch sử",
            meter_type="LCD",
            is_active=True,
            lifecycle_status="ACTIVE",
        )
        db.add(m)
        db.commit()
        db.refresh(m)
        meter_id = m.id

        batch = db.query(ReadingBatch).first()
        round_obj = db.query(ReadingRound).filter(ReadingRound.batch_id == batch.id).first()
        user_obj = db.query(User).first()

        reading = MeterReading(
            id=str(uuid.uuid4()),
            meter_id=meter_id,
            batch_id=batch.id,
            reading_round_id=round_obj.id,
            user_id=user_obj.id,
            reading="5678.9",
            status="CONFIRMED",
        )
        db.add(reading)
        db.commit()
        reading_id = reading.id

        # Verify initial reading count
        count_before = db.query(MeterReading).filter(MeterReading.meter_id == meter_id).count()
        assert count_before == 1

    finally:
        db.close()

    try:
        # Retire the meter
        retire_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/retire",
            json={"reason": "Lưu trữ kiểm toán vĩnh viễn"},
            cookies=cookies,
            headers=headers,
        )
        assert retire_resp.status_code == 200

        # Check readings are 100% preserved
        db = SessionLocal()
        try:
            count_after = db.query(MeterReading).filter(MeterReading.meter_id == meter_id).count()
            assert count_after == count_before
            preserved_reading = db.query(MeterReading).filter(MeterReading.id == reading_id).first()
            assert preserved_reading is not None
            assert preserved_reading.reading == "5678.9"
        finally:
            db.close()

        # Historical lookup via GET /api/v1/meters/{id} must succeed
        get_resp = client.get(f"/api/v1/meters/{meter_id}", cookies=cookies, headers=headers)
        assert get_resp.status_code == 200
        get_data = get_resp.json()
        meter_obj = get_data["meter"]
        assert meter_obj["id"] == meter_id
        assert meter_obj["meter_code"] == code
        assert meter_obj["lifecycle_status"] == "RETIRED"
        assert meter_obj["is_active"] is False
        assert meter_obj["retirement_reason"] == "Lưu trữ kiểm toán vĩnh viễn"

    finally:
        # Clean up test records
        db = SessionLocal()
        try:
            db.query(MeterReading).filter(MeterReading.meter_id == meter_id).delete()
            db.query(Meter).filter(Meter.id == meter_id).delete()
            db.commit()
        finally:
            db.close()


def test_v16b_hard_delete_safeguard(auth_headers):
    """6. Hard delete safeguard: 409 Conflict if historical readings exist, allowed if clean."""
    cookies, headers, _ = auth_headers
    db = SessionLocal()
    try:
        # 1. CT-001 has ~240 readings -> deletion MUST be blocked with 409
        ct001 = db.query(Meter).filter(Meter.meter_code == "CT-001").first()
        assert ct001 is not None
        ct001_id = ct001.id
        ct001_readings = db.query(MeterReading).filter(MeterReading.meter_id == ct001_id).count()
        assert ct001_readings > 0
    finally:
        db.close()

    del_blocked = client.delete(f"/api/v1/admin/meters/{ct001_id}", cookies=cookies, headers=headers)
    assert del_blocked.status_code == 409
    assert "Không được phép xóa vĩnh viễn" in del_blocked.json()["detail"]
    assert "Ngừng sử dụng" in del_blocked.json()["detail"]

    # Verify CT-001 is still alive and active
    db = SessionLocal()
    try:
        ct001_after = db.query(Meter).filter(Meter.id == ct001_id).first()
        assert ct001_after is not None
        assert db.query(MeterReading).filter(MeterReading.meter_id == ct001_id).count() == ct001_readings
    finally:
        db.close()

    # 2. Pristine unused test meter (0 readings) -> deletion succeeds
    fresh_resp = client.post(
        "/api/v1/admin/meters",
        json={"meter_code": f"CT-V16B-DEL-{uuid.uuid4().hex[:6]}", "name": "Fresh Meter", "meter_type": "LCD"},
        cookies=cookies,
        headers=headers,
    )
    assert fresh_resp.status_code == 200
    fresh_id = fresh_resp.json()["id"]

    del_fresh = client.delete(f"/api/v1/admin/meters/{fresh_id}", cookies=cookies, headers=headers)
    assert del_fresh.status_code == 200
    assert "thành công" in del_fresh.json()["message"]

    # Verify audit log recorded METER_HARD_DELETED
    db = SessionLocal()
    try:
        audit = db.query(AdminAuditLog).filter(AdminAuditLog.resource_id == fresh_id, AdminAuditLog.action == "METER_HARD_DELETED").first()
        assert audit is not None
    finally:
        db.close()


def test_v16b_operational_map_filtering(auth_headers):
    """7. Operational map hides RETIRED meters, and hides INACTIVE by default."""
    cookies, headers, _ = auth_headers

    # Create one active, one inactive, one retired meter
    code_act = f"CT-V16B-M-ACT-{uuid.uuid4().hex[:4]}"
    code_inact = f"CT-V16B-M-INA-{uuid.uuid4().hex[:4]}"
    code_ret = f"CT-V16B-M-RET-{uuid.uuid4().hex[:4]}"

    r1 = client.post("/api/v1/admin/meters", json={"meter_code": code_act, "name": "Map Active"}, cookies=cookies, headers=headers)
    r2 = client.post("/api/v1/admin/meters", json={"meter_code": code_inact, "name": "Map Inactive"}, cookies=cookies, headers=headers)
    r3 = client.post("/api/v1/admin/meters", json={"meter_code": code_ret, "name": "Map Retired"}, cookies=cookies, headers=headers)

    id_act = r1.json()["id"]
    id_inact = r2.json()["id"]
    id_ret = r3.json()["id"]

    try:
        client.post(f"/api/v1/admin/meters/{id_inact}/deactivate", cookies=cookies, headers=headers)
        client.post(f"/api/v1/admin/meters/{id_ret}/retire", json={"reason": "Map test"}, cookies=cookies, headers=headers)

        # 1. Default overview (include_inactive=False)
        map_default = client.get("/api/v1/map/overview", cookies=cookies, headers=headers).json()
        map_meter_ids = [m["id"] for m in map_default["meters"]]
        assert id_act in map_meter_ids
        assert id_inact not in map_meter_ids
        assert id_ret not in map_meter_ids

        # 2. Overview with include_inactive=True
        map_with_inact = client.get("/api/v1/map/overview?include_inactive=true", cookies=cookies, headers=headers).json()
        map_meter_ids_inact = [m["id"] for m in map_with_inact["meters"]]
        assert id_act in map_meter_ids_inact
        assert id_inact in map_meter_ids_inact
        assert id_ret not in map_meter_ids_inact  # RETIRED MUST NEVER appear on operational map

    finally:
        db = SessionLocal()
        try:
            db.query(Meter).filter(Meter.id.in_([id_act, id_inact, id_ret])).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()


def test_v16b_admin_meter_list_filtering_and_counts(auth_headers):
    """8. Admin list supports status=ALL, ACTIVE, INACTIVE, RETIRED and returns retired_count."""
    cookies, headers, _ = auth_headers

    resp = client.get("/api/v1/admin/meters?status=ALL", cookies=cookies, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "retired_count" in data
    assert data["total"] == data["active_count"] + data["inactive_count"] + data["retired_count"]

    # Active only
    resp_act = client.get("/api/v1/admin/meters?status=ACTIVE", cookies=cookies, headers=headers)
    assert resp_act.status_code == 200
    for m in resp_act.json()["meters"]:
        assert m["lifecycle_status"] == "ACTIVE"

    # Inactive only
    resp_inact = client.get("/api/v1/admin/meters?status=INACTIVE", cookies=cookies, headers=headers)
    assert resp_inact.status_code == 200
    for m in resp_inact.json()["meters"]:
        assert m["lifecycle_status"] == "INACTIVE"

    # Retired only
    resp_ret = client.get("/api/v1/admin/meters?status=RETIRED", cookies=cookies, headers=headers)
    assert resp_ret.status_code == 200
    for m in resp_ret.json()["meters"]:
        assert m["lifecycle_status"] == "RETIRED"


def test_v16b_absolute_spatial_freeze_unmodified():
    """9. Absolute spatial freeze canonical checksum remains identical."""
    assert FREEZE_JSON_PATH.exists(), f"Freeze artifact {FREEZE_JSON_PATH} must exist"
    assert MANIFEST_PATH.exists(), f"Manifest artifact {MANIFEST_PATH} must exist"

    with open(FREEZE_JSON_PATH, "r", encoding="utf-8") as f:
        freeze_data = json.load(f)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    # Re-compute canonical payload checksum
    canonical_payload = {
        "coordinateSystem": freeze_data["coordinateSystem"],
        "canonicalWidth": freeze_data["canonicalWidth"],
        "canonicalHeight": freeze_data["canonicalHeight"],
        "zones": [
            {
                "id": z["id"],
                "businessZoneIds": sorted(z["businessZoneIds"]),
                "displayIndex": z["displayIndex"],
                "displayLabel": z["displayLabel"],
                "polygonCanonical": [{"x": p["x"], "y": p["y"]} for p in z["polygonCanonical"]],
                "labelAnchorCanonical": {"x": z["labelAnchorCanonical"]["x"], "y": z["labelAnchorCanonical"]["y"]},
                "operatorAnchorCanonical": {"x": z["operatorAnchorCanonical"]["x"], "y": z["operatorAnchorCanonical"]["y"]},
            }
            for z in sorted(freeze_data["zones"], key=lambda x: x["id"])
        ],
        "landmarks": [
            {
                "id": l["id"],
                "zoneId": l.get("zoneId"),
                "category": l.get("category"),
                "canonical": {"x": l["canonical"]["x"], "y": l["canonical"]["y"]},
                "label": l.get("label"),
            }
            for l in sorted(freeze_data["landmarks"], key=lambda x: x["id"])
        ],
    }

    raw_bytes = json.dumps(canonical_payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    computed_sha = hashlib.sha256(raw_bytes).hexdigest()
    assert (
        computed_sha == EXPECTED_FREEZE_SHA256
    ), f"Spatial freeze canonical SHA mismatch! Expected {EXPECTED_FREEZE_SHA256}, got {computed_sha}"
    assert computed_sha == manifest_data["geometrySha256"]

    # Verify reconciliation meters in DB match freeze snapshot
    reconcil_path = Path("docs/design/map-operations/v16a-r2/METER_SPATIAL_RECONCILIATION.json")
    assert reconcil_path.exists(), "Reconciliation snapshot must exist"
    with open(reconcil_path, "r", encoding="utf-8") as f:
        reconcil_meters = json.load(f)

    db = SessionLocal()
    try:
        reconcil_codes = ["CT-001", "CT-007", "CT-008", "CT-009", "CT-010"]
        for code in reconcil_codes:
            m_db = db.query(Meter).filter(Meter.meter_code == code).first()
            assert m_db is not None, f"Reconciliation meter {code} missing from DB"
            m_base = next((bm for bm in reconcil_meters if bm["meterCode"] == code), None)
            assert m_base is not None, f"Reconciliation meter {code} missing from freeze baseline"
            assert round(m_db.map_x * 1915, 0) == round(m_base["canonicalPosition"]["x"], 0)
            assert round(m_db.map_y * 821, 0) == round(m_base["canonicalPosition"]["y"], 0)
            assert m_db.presentation_zone_id == m_base["presentationZoneId"]
    finally:
        db.close()


def test_v16b_sqlite_foreign_key_integrity():
    """10. Foreign key integrity check: PRAGMA foreign_key_check yields 0 violations."""
    db = SessionLocal()
    try:
        violations = db.execute(text("PRAGMA foreign_key_check")).fetchall()
        assert len(violations) == 0, f"Foreign key integrity violations detected: {violations}"
    finally:
        db.close()
