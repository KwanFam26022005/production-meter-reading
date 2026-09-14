"""
V16A-R1 — DECOUPLE MAP GEOMETRY CALIBRATION FROM METER CONTAINMENT
Backend Verification Suite

Tests:
1. Geometry validation decoupling:
   - Meters outside zone -> valid=True, severity="WARNING", publish allowed.
   - Anchors outside zone -> valid=True, severity="WARNING", publish allowed.
   - Self-intersecting polygon -> valid=False, severity="ERROR", publish BLOCKED.
2. Full Publish flow with uncontained meter:
   - Admin creates draft, modifies zone boundary so an assigned meter is outside.
   - Validation passes (valid=True) with warnings.
   - Publish succeeds (HTTP 200).
   - Invariant check: meter coordinates & assignments in DB are NOT mutated.
"""
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import get_settings
from backend.app.db import SessionLocal, init_db
from backend.app.models import (
    User,
    SessionModel,
    MapVersion,
    MapVersionZone,
    Meter,
)
from backend.app.auth import hash_password, hash_session_token, generate_csrf_token

client = TestClient(app)
init_db()


def create_admin_and_operator_sessions():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                employee_code="ADMIN_V16A_TEST",
                full_name="Quản Trị Viên V16A",
                password_hash=hash_password("AdminPass123!"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        admin_token = f"test_v16a_admin_{uuid.uuid4().hex}"
        s_admin = SessionModel(
            id=str(uuid.uuid4()),
            user_id=admin.id,
            token_hash=hash_session_token(admin_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestV16ARunner",
        )
        db.add(s_admin)

        operator = db.query(User).filter(User.role == "EMPLOYEE", User.is_active == True).first()
        if not operator:
            operator = User(
                id=str(uuid.uuid4()),
                employee_code="OP_V16A_TEST",
                full_name="Nhân Viên V16A",
                password_hash=hash_password("OpPass123!"),
                role="EMPLOYEE",
                is_active=True,
            )
            db.add(operator)
            db.commit()
            db.refresh(operator)

        op_token = f"test_v16a_op_{uuid.uuid4().hex}"
        s_op = SessionModel(
            id=str(uuid.uuid4()),
            user_id=operator.id,
            token_hash=hash_session_token(op_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestV16ARunner",
        )
        db.add(s_op)
        db.commit()

        admin_headers = {
            "cookies": {get_settings().session_cookie_name: admin_token},
            "headers": {"X-CSRF-Token": generate_csrf_token(admin_token)},
        }
        op_headers = {
            "cookies": {get_settings().session_cookie_name: op_token},
            "headers": {"X-CSRF-Token": generate_csrf_token(op_token)},
        }
        return admin_headers, op_headers
    finally:
        db.close()


def clean_all_drafts():
    db = SessionLocal()
    try:
        drafts = db.query(MapVersion).filter(MapVersion.status == "DRAFT").all()
        for d in drafts:
            db.query(MapVersionZone).filter(MapVersionZone.map_version_id == d.id).delete()
            db.delete(d)
        db.commit()
    finally:
        db.close()


CANONICAL_METERS = {
    'CT-001': ('Trạm điện A', 'pres-technical', 0.5995, 0.8356),
    'CT-002': ('Kho B', 'pres-container-west', 0.2648, 0.5664),
    'CT-003': ('Cầu cảng 1', 'pres-berth', 0.1760, 0.3849),
    'CT-004': ('Cầu cảng 2', 'pres-berth', 0.3624, 0.3837),
    'CT-005': ('Kho C', 'pres-container-west', 0.3337, 0.5786),
    'CT-006': ('Kho D', 'pres-cfs-east', 0.8773, 0.4629),
    'CT-007': ('Trạm điện B', 'pres-technical', 0.5577, 0.8770),
    'CT-008': ('Cầu cảng 3', 'pres-berth', 0.7311, 0.3021),
    'CT-009': ('Khu kỹ thuật 1', 'pres-technical', 0.6418, 0.8295),
    'CT-010': ('Khu kỹ thuật 2', 'pres-gate', 0.8564, 0.6821),
    'CT-011': ('Bãi Container 1', 'pres-container-center', 0.6115, 0.5323),
    'CT-012': ('Bãi Container 2', 'pres-container-center', 0.7321, 0.5164),
}


def ensure_canonical_meters(db):
    for code, (name, pres_id, mx, my) in CANONICAL_METERS.items():
        m = db.query(Meter).filter(Meter.meter_code == code).first()
        if not m:
            m = Meter(
                id=str(uuid.uuid4()),
                meter_code=code,
                name=name,
                presentation_zone_id=pres_id,
                map_x=mx,
                map_y=my,
                route_status="VALID",
                is_active=True,
            )
            db.add(m)
        else:
            m.presentation_zone_id = pres_id
            m.map_x = mx
            m.map_y = my
            m.route_status = "VALID"
            m.is_active = True
    db.commit()


@pytest.fixture(autouse=True)
def cleanup_drafts():
    db = SessionLocal()
    try:
        ensure_canonical_meters(db)
    finally:
        db.close()
    clean_all_drafts()
    yield
    clean_all_drafts()


def test_v16a_r1_meter_outside_does_not_block_validation():
    """
    Meter outside polygon must emit WARNING severity issue and keep valid=True.
    """
    admin_auth, _ = create_admin_and_operator_sessions()

    # Create a draft
    create_resp = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": f"v16a-r1-val-{uuid.uuid4().hex[:6]}"},
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert create_resp.status_code == 200, create_resp.text
    draft_data = create_resp.json()
    draft_id = draft_data["id"]
    pres_berth = next(z for z in draft_data["zones"] if z["zone_id"] == "pres-berth")

    # Shrink pres-berth polygon so assigned meters fall outside, but anchors remain inside
    patch_resp = client.patch(
        f"/api/v1/map-config/versions/{draft_id}/zones/pres-berth",
        json={
            "revision": pres_berth["revision"],
            "polygon_canonical": [
                {"x": 100, "y": 100},
                {"x": 200, "y": 100},
                {"x": 200, "y": 200},
                {"x": 100, "y": 200},
            ],
            "label_anchor_canonical": {"x": 150, "y": 150},
            "operator_anchor_canonical": {"x": 160, "y": 160},
        },
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert patch_resp.status_code == 200, patch_resp.text

    # Validate draft
    val_resp = client.post(
        f"/api/v1/map-config/versions/{draft_id}/validate",
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert val_resp.status_code == 200, val_resp.text
    report = val_resp.json()

    # VALIDATION MUST PASS (valid=True)
    assert report["valid"] is True, f"Expected valid=True, got False. Errors: {report['errors']}"
    assert len(report["errors"]) == 0

    # WARNINGS must be captured
    assert len(report["warnings"]) > 0
    meter_warning_issues = [i for i in report.get("issues", []) if i["code"] == "METER_OUTSIDE_PRESENTATION_ZONE"]
    assert len(meter_warning_issues) > 0
    assert all(i["severity"] == "WARNING" for i in meter_warning_issues)
    assert all(i["entity_type"] == "METER" for i in meter_warning_issues)


def test_v16a_r1_anchor_outside_does_not_block_validation():
    """
    Anchor outside polygon must emit WARNING severity and keep valid=True.
    """
    admin_auth, _ = create_admin_and_operator_sessions()

    create_resp = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": f"v16a-r1-anchor-{uuid.uuid4().hex[:6]}"},
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    draft_data = create_resp.json()
    draft_id = draft_data["id"]
    pres_berth = next(z for z in draft_data["zones"] if z["zone_id"] == "pres-berth")

    # Place anchors outside polygon
    patch_resp = client.patch(
        f"/api/v1/map-config/versions/{draft_id}/zones/pres-berth",
        json={
            "revision": pres_berth["revision"],
            "label_anchor_canonical": {"x": 50, "y": 50},
            "operator_anchor_canonical": {"x": 10, "y": 10},
        },
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert patch_resp.status_code == 200, patch_resp.text

    val_resp = client.post(
        f"/api/v1/map-config/versions/{draft_id}/validate",
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert val_resp.status_code == 200, val_resp.text
    report = val_resp.json()

    # Non-blocking warning!
    assert report["valid"] is True
    assert len(report["errors"]) == 0
    anchor_issues = [i for i in report.get("issues", []) if i["code"] == "ANCHOR_OUTSIDE_POLYGON"]
    assert len(anchor_issues) > 0
    assert all(i["severity"] == "WARNING" for i in anchor_issues)


def test_v16a_r1_self_intersection_blocks_validation():
    """
    Self-intersecting polygon is a structural defect and MUST block validation (valid=False).
    """
    admin_auth, _ = create_admin_and_operator_sessions()

    create_resp = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": f"v16a-r1-bowtie-{uuid.uuid4().hex[:6]}"},
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    draft_data = create_resp.json()
    draft_id = draft_data["id"]
    pres_berth = next(z for z in draft_data["zones"] if z["zone_id"] == "pres-berth")

    bowtie_poly = [
        {"x": 100, "y": 100},
        {"x": 300, "y": 300},
        {"x": 300, "y": 100},
        {"x": 100, "y": 300},
    ]

    patch_resp = client.patch(
        f"/api/v1/map-config/versions/{draft_id}/zones/pres-berth",
        json={
            "revision": pres_berth["revision"],
            "polygon_canonical": bowtie_poly,
        },
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert patch_resp.status_code == 200, patch_resp.text

    val_resp = client.post(
        f"/api/v1/map-config/versions/{draft_id}/validate",
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert val_resp.status_code == 200, val_resp.text
    report = val_resp.json()

    # Structural error: MUST BLOCK
    assert report["valid"] is False
    assert len(report["errors"]) > 0
    bowtie_issues = [i for i in report.get("issues", []) if i["code"] == "POLYGON_SELF_INTERSECTION"]
    assert len(bowtie_issues) > 0
    assert bowtie_issues[0]["severity"] == "ERROR"


def test_v16a_r1_publish_succeeds_with_uncontained_meter_and_preserves_meters():
    """
    End-to-End API Test:
    1. Create draft.
    2. Adjust pres-berth polygon so an assigned meter is outside.
    3. Publish the draft version via HTTP POST.
    4. Assert HTTP 200 OK and active version updated.
    5. Invariant: Meter coordinates and assignments in DB are untouched.
    6. Rollback to original active version.
    """
    admin_auth, _ = create_admin_and_operator_sessions()
    db = SessionLocal()
    original_active = db.query(MapVersion).filter(MapVersion.status == "PUBLISHED").first()
    original_active_id = original_active.id

    # Record initial meter state
    initial_meters = {
        m.meter_code: {"x": m.map_x, "y": m.map_y, "pres_zone_id": m.presentation_zone_id}
        for m in db.query(Meter).all()
    }
    db.close()

    try:
        # 1. Create draft
        draft_resp = client.post(
            "/api/v1/map-config/drafts",
            json={"map_version": f"v16a-r1-pub-{uuid.uuid4().hex[:6]}"},
            cookies=admin_auth["cookies"],
            headers=admin_auth["headers"],
        )
        assert draft_resp.status_code == 200, draft_resp.text
        draft_data = draft_resp.json()
        draft_id = draft_data["id"]
        pres_berth = next(z for z in draft_data["zones"] if z["zone_id"] == "pres-berth")

        # 2. Modify pres-berth polygon: keep valid area, simple polygon, but shift boundary
        # so one meter is outside
        patch_resp = client.patch(
            f"/api/v1/map-config/versions/{draft_id}/zones/pres-berth",
            json={
                "revision": pres_berth["revision"],
                "polygon_canonical": [
                    {"x": 600, "y": 20},
                    {"x": 1200, "y": 20},
                    {"x": 1200, "y": 150},
                    {"x": 600, "y": 150},
                ],
                "label_anchor_canonical": {"x": 700, "y": 80},
                "operator_anchor_canonical": {"x": 800, "y": 80},
            },
            cookies=admin_auth["cookies"],
            headers=admin_auth["headers"],
        )
        assert patch_resp.status_code == 200, patch_resp.text

        # 3. Publish draft
        pub_resp = client.post(
            f"/api/v1/map-config/versions/{draft_id}/publish",
            json={"changelog": "V16A-R1 Test Publish with uncontained meter"},
            cookies=admin_auth["cookies"],
            headers=admin_auth["headers"],
        )
        assert pub_resp.status_code == 200, f"Publish should succeed under V16A-R1 decoupling: {pub_resp.text}"
        pub_data = pub_resp.json()
        assert pub_data["status"] == "success"
        assert pub_data["version_id"] == draft_id

        # Verify active version in DB
        db = SessionLocal()
        published_in_db = db.query(MapVersion).filter(MapVersion.id == draft_id).first()
        assert published_in_db is not None
        assert published_in_db.status == "PUBLISHED"
        db.close()

        # 4. Verify meters in DB: ZERO changes to coordinates or assignments
        db = SessionLocal()
        try:
            current_meters = db.query(Meter).all()
            for m in current_meters:
                assert m.meter_code in initial_meters
                orig = initial_meters[m.meter_code]
                assert m.map_x == orig["x"], f"Meter {m.meter_code} map_x was modified!"
                assert m.map_y == orig["y"], f"Meter {m.meter_code} map_y was modified!"
                assert m.presentation_zone_id == orig["pres_zone_id"], f"Meter {m.meter_code} presentation_zone_id was modified!"
        finally:
            db.close()

    finally:
        # 6. Rollback to original active version
        rollback_resp = client.post(
            f"/api/v1/map-config/versions/{original_active_id}/rollback",
            json={"reason": "Teardown test_v16a_r1_publish_succeeds_with_uncontained_meter_and_preserves_meters"},
            cookies=admin_auth["cookies"],
            headers=admin_auth["headers"],
        )
        assert rollback_resp.status_code == 200, rollback_resp.text
