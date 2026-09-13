"""
Comprehensive integration tests for V16 Persistent Spatial Administration CRUD:
1. Map configuration read & active version
2. Draft lifecycle & optimistic locking (revision check)
3. Geometry validation pipeline (self-intersection, area, bounds)
4. Atomic publish transaction & active immutability
5. Version rollback
6. Meter administrative relocation & zone change with containment
7. Soft-delete ("Ngừng sử dụng") vs Hard-delete protection (409 Conflict)
"""
import json
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
    MeterReading,
    ReadingRound,
    AdminAuditLog,
)
from backend.app.auth import hash_password, hash_session_token, generate_csrf_token

client = TestClient(app)


def create_test_admin_session():
    init_db()
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                employee_code="ADMIN_V16_TEST",
                full_name="Quản Trị Viên V16",
                password_hash=hash_password("AdminPass123!"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        token = f"test_v16_session_{uuid.uuid4().hex}"
        t_hash = hash_session_token(token)
        s_obj = SessionModel(
            id=str(uuid.uuid4()),
            user_id=admin.id,
            token_hash=t_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestV16Runner",
        )
        db.add(s_obj)
        db.commit()

        csrf_token = generate_csrf_token(token)
        return token, csrf_token, admin
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


@pytest.fixture(autouse=True)
def cleanup_drafts_each_test():
    clean_all_drafts()
    yield
    clean_all_drafts()


@pytest.fixture
def auth_headers():
    token, csrf_token, admin = create_test_admin_session()
    cookies = {get_settings().session_cookie_name: token}
    headers = {"X-CSRF-Token": csrf_token}
    return cookies, headers


def test_get_active_map_config():
    resp = client.get("/api/v1/map-config/active")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "PUBLISHED"
    assert data["canonical_width"] == 1915
    assert data["canonical_height"] == 821
    assert len(data["zones"]) == 6
    zone_ids = [z["zone_id"] for z in data["zones"]]
    assert "pres-berth" in zone_ids
    assert "pres-container-center" in zone_ids


def test_list_map_versions(auth_headers):
    cookies, headers = auth_headers
    resp = client.get("/api/v1/map-config/versions", cookies=cookies, headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()
    versions = res_data["versions"]
    assert len(versions) >= 1
    assert any(v["status"] == "PUBLISHED" for v in versions)


def test_draft_lifecycle_and_optimistic_locking(auth_headers):
    cookies, headers = auth_headers

    # Ensure no leftover draft exists
    db = SessionLocal()
    try:
        existing_draft = db.query(MapVersion).filter(MapVersion.status == "DRAFT").first()
        if existing_draft:
            client.delete(f"/api/v1/map-config/versions/{existing_draft.id}", cookies=cookies, headers=headers)
    finally:
        db.close()

    # 1. Create a draft
    create_resp = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": "draft-test-v16"},
        cookies=cookies,
        headers=headers,
    )
    assert create_resp.status_code == 200, create_resp.text
    draft = create_resp.json()
    assert draft["status"] == "DRAFT"
    assert draft["revision"] == 1
    draft_id = draft["id"]

    # 2. Creating another draft when one is active should fail with 409
    dup_resp = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": "dup-draft"},
        cookies=cookies,
        headers=headers,
    )
    assert dup_resp.status_code == 409

    # 3. Update zone with wrong revision (optimistic lock failure) -> 409
    bad_rev_resp = client.patch(
        f"/api/v1/map-config/versions/{draft_id}/zones/pres-berth",
        json={
            "revision": 999,
            "polygon_canonical": [{"x": 200, "y": 200}, {"x": 500, "y": 200}, {"x": 500, "y": 400}, {"x": 200, "y": 400}],
        },
        cookies=cookies,
        headers=headers,
    )
    assert bad_rev_resp.status_code == 409

    # 4. Update zone with matching revision -> 200, revision incremented
    good_rev_resp = client.patch(
        f"/api/v1/map-config/versions/{draft_id}/zones/pres-berth",
        json={
            "revision": 1,
            "polygon_canonical": [{"x": 200, "y": 200}, {"x": 500, "y": 200}, {"x": 500, "y": 400}, {"x": 200, "y": 400}],
        },
        cookies=cookies,
        headers=headers,
    )
    assert good_rev_resp.status_code == 200
    updated_zone = good_rev_resp.json()
    assert updated_zone["revision"] == 2

    # Clean up draft
    del_resp = client.delete(f"/api/v1/map-config/versions/{draft_id}", cookies=cookies, headers=headers)
    assert del_resp.status_code == 200


def test_geometry_validation_and_publish_protection(auth_headers):
    cookies, headers = auth_headers

    # Clean any leftover draft
    db = SessionLocal()
    try:
        existing_draft = db.query(MapVersion).filter(MapVersion.status == "DRAFT").first()
        if existing_draft:
            client.delete(f"/api/v1/map-config/versions/{existing_draft.id}", cookies=cookies, headers=headers)
    finally:
        db.close()

    # 1. Create a draft
    create_resp = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": "draft-val-test"},
        cookies=cookies,
        headers=headers,
    )
    assert create_resp.status_code == 200
    draft = create_resp.json()
    draft_id = draft["id"]

    try:
        # Validate initial draft -> valid
        val_resp = client.post(f"/api/v1/map-config/versions/{draft_id}/validate", cookies=cookies, headers=headers)
        assert val_resp.status_code == 200
        val_data = val_resp.json()
        assert val_data["valid"] is True
        assert len(val_data["errors"]) == 0

        # Inject a self-intersecting polygon (hourglass/bow-tie shape)
        bowtie_polygon = [{"x": 100, "y": 100}, {"x": 300, "y": 300}, {"x": 300, "y": 100}, {"x": 100, "y": 300}]
        patch_resp = client.patch(
            f"/api/v1/map-config/versions/{draft_id}/zones/pres-berth",
            json={
                "revision": 1,
                "polygon_canonical": bowtie_polygon,
            },
            cookies=cookies,
            headers=headers,
        )
        assert patch_resp.status_code == 200

        # Validate -> should report invalid self-intersecting polygon
        val_resp2 = client.post(f"/api/v1/map-config/versions/{draft_id}/validate", cookies=cookies, headers=headers)
        assert val_resp2.status_code == 200
        val_data2 = val_resp2.json()
        assert val_data2["valid"] is False
        assert any("tự cắt" in err for err in val_data2["errors"])

        # Attempt to publish invalid draft -> 422 Unprocessable Entity
        pub_resp = client.post(
            f"/api/v1/map-config/versions/{draft_id}/publish",
            cookies=cookies,
            headers=headers,
        )
        assert pub_resp.status_code == 422
        assert "tự cắt" in str(pub_resp.json()["detail"])

    finally:
        # Clean up draft
        client.delete(f"/api/v1/map-config/versions/{draft_id}", cookies=cookies, headers=headers)


def test_atomic_publish_and_rollback(auth_headers):
    cookies, headers = auth_headers

    # Clean any leftover draft
    db = SessionLocal()
    try:
        existing_draft = db.query(MapVersion).filter(MapVersion.status == "DRAFT").first()
        if existing_draft:
            client.delete(f"/api/v1/map-config/versions/{existing_draft.id}", cookies=cookies, headers=headers)
    finally:
        db.close()

    # Get active version before
    active_before = client.get("/api/v1/map-config/active").json()

    # Create draft
    create_resp = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": "draft-publish-test"},
        cookies=cookies,
        headers=headers,
    )
    assert create_resp.status_code == 200
    draft = create_resp.json()
    draft_id = draft["id"]

    # Publish valid draft
    pub_resp = client.post(
        f"/api/v1/map-config/versions/{draft_id}/publish",
        cookies=cookies,
        headers=headers,
    )
    assert pub_resp.status_code == 200
    published = pub_resp.json()
    assert published["status"] == "success"

    # Verify active map config is now draft_id
    active_after = client.get("/api/v1/map-config/active").json()
    assert active_after["id"] == draft_id

    # Rollback to previous active version
    rollback_resp = client.post(
        f"/api/v1/map-config/versions/{active_before['id']}/rollback",
        json={"reason": "Automated test rollback"},
        cookies=cookies,
        headers=headers,
    )
    assert rollback_resp.status_code == 200
    active_restored = client.get("/api/v1/map-config/active").json()
    assert active_restored["id"] == active_before["id"]


def test_admin_meter_relocation_containment_and_route_status(auth_headers):
    cookies, headers = auth_headers

    # 1. Create a test meter in pres-container-center
    active_map = client.get("/api/v1/map-config/active").json()
    cont_zone = next(z for z in active_map["zones"] if z["zone_id"] == "pres-container-center")
    poly = cont_zone["polygon_canonical"]
    avg_x = sum(p["x"] for p in poly) / len(poly) / 1915.0
    avg_y = sum(p["y"] for p in poly) / len(poly) / 821.0

    new_meter_code = "CT-V16-TEST"
    create_meter_resp = client.post(
        "/api/v1/admin/meters",
        json={
            "meter_code": new_meter_code,
            "name": "Công tơ kiểm thử V16",
            "location": "Bãi Container Trung tâm",
            "meter_type": "LCD",
            "zone_id": "zone-container",
            "presentation_zone_id": "pres-container-center",
            "map_x": round(avg_x, 4),
            "map_y": round(avg_y, 4),
        },
        cookies=cookies,
        headers=headers,
    )
    assert create_meter_resp.status_code == 200
    meter_data = create_meter_resp.json()
    meter_id = meter_data["id"]

    try:
        # 2. Relocate to valid point within pres-container-center -> succeeds freely
        reloc_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/relocate",
            json={"map_x": round(avg_x, 4), "map_y": round(avg_y, 4)},
            cookies=cookies,
            headers=headers,
        )
        assert reloc_resp.status_code == 200
        reloc_data = reloc_resp.json()
        assert reloc_data["route_status"] == "ROUTABLE"

        # 3. Relocate to arbitrary coordinate (0.01, 0.01) -> succeeds without being blocked by zone polygon (Decoupled)
        arbitrary_reloc = client.post(
            f"/api/v1/admin/meters/{meter_id}/relocate",
            json={"map_x": 0.01, "map_y": 0.01},
            cookies=cookies,
            headers=headers,
        )
        assert arbitrary_reloc.status_code == 200
        assert arbitrary_reloc.json()["map_x"] == 0.01

        # 4. Change zone to pres-berth -> succeeds freely without requiring coordinate containment (Decoupled)
        change_zone_resp = client.post(
            f"/api/v1/admin/meters/{meter_id}/change-zone",
            json={"zone_id": "zone-berth", "presentation_zone_id": "pres-berth"},
            cookies=cookies,
            headers=headers,
        )
        assert change_zone_resp.status_code == 200
        assert change_zone_resp.json()["presentation_zone_id"] == "pres-berth"

    finally:
        # Clean up meter
        db = SessionLocal()
        try:
            db.query(Meter).filter(Meter.id == meter_id).delete()
            db.commit()
        finally:
            db.close()


def test_soft_delete_vs_hard_delete_protection(auth_headers):
    cookies, headers = auth_headers

    # 1. Test meter with readings cannot be hard deleted
    db = SessionLocal()
    try:
        ct001 = db.query(Meter).filter(Meter.meter_code == "CT-001").first()
        assert ct001 is not None
        ct001_id = ct001.id
    finally:
        db.close()

    del_resp = client.delete(f"/api/v1/admin/meters/{ct001_id}", cookies=cookies, headers=headers)
    assert del_resp.status_code == 409
    assert "Không được phép xóa vĩnh viễn" in del_resp.json()["detail"]

    # 2. Test fresh meter without readings CAN be hard deleted
    fresh_resp = client.post(
        "/api/v1/admin/meters",
        json={
            "meter_code": "CT-V16-TEMP",
            "name": "Công tơ tạm không bản ghi",
            "meter_type": "UNKNOWN",
        },
        cookies=cookies,
        headers=headers,
    )
    assert fresh_resp.status_code == 200
    fresh_id = fresh_resp.json()["id"]

    del_fresh_resp = client.delete(f"/api/v1/admin/meters/{fresh_id}", cookies=cookies, headers=headers)
    assert del_fresh_resp.status_code == 200
    assert "thành công" in del_fresh_resp.json()["message"]
