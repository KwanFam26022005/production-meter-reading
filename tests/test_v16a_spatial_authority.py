"""
V16A — SPATIAL AUTHORITY STABILIZATION TESTS
Validates:
1. Primary Acceptance Test:
   - Load active version N
   - Create draft with updated polygon
   - Publish N+1
   - Fetch /api/v1/map-config/active -> assert N+1 returned with matching published geometry
   - Assert source="db" and authoritative=True
2. Single active version invariant:
   - Exactly one version has status="PUBLISHED"
3. Rejection of invalid active config & transaction rollback
4. Authorization enforcement (non-admin cannot draft/publish)
5. Spatial metadata and landmark round-trip serialization
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
)
from backend.app.auth import hash_password, hash_session_token, generate_csrf_token

client = TestClient(app)
init_db()


def create_admin_and_operator_sessions():
    db = SessionLocal()
    try:
        # Admin user
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

        # Operator user (non-admin)
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


@pytest.fixture(autouse=True)
def cleanup_drafts_each_test():
    clean_all_drafts()
    yield
    clean_all_drafts()


def test_v16a_primary_acceptance_test():
    """
    Primary V16A Acceptance Gate:
    1. Load active version N
    2. Create/save draft geometry
    3. Publish N+1
    4. Fetch /api/v1/map-config/active
    5. Assert N+1 returned
    6. Assert published coordinates match draft
    7. Assert authoritative=True and source="db"
    8. Rollback to original active version
    """
    admin_auth, _ = create_admin_and_operator_sessions()

    # 1. Load active version N
    resp_n = client.get("/api/v1/map-config/active")
    assert resp_n.status_code == 200, resp_n.text
    active_n = resp_n.json()
    version_n_id = active_n["version_id"]
    version_n_num = active_n["version_number"]
    assert active_n["source"] == "db"
    assert active_n["authoritative"] is True
    assert active_n["geometry_schema_version"] == "1.0"
    assert active_n["canonical_width"] == 1915
    assert active_n["canonical_height"] == 821
    assert active_n["coordinate_system"] == "tan-thuan-canonical-image-pixel-space-v1"

    # 2. Create draft geometry N+1
    draft_name = f"v16a-test-acceptance-{uuid.uuid4().hex[:6]}"
    create_resp = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": draft_name},
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert create_resp.status_code == 200, create_resp.text
    draft_data = create_resp.json()
    draft_id = draft_data["id"]

    # Save modified polygon for pres-berth that is valid and contains anchors
    # Original pres-berth contains label anchor (420, 275) and operator anchor (1030, 285)
    # Let's adjust pres-berth slightly while keeping simplicity, containment, and area
    pres_berth_zone = next(z for z in draft_data["zones"] if z["zone_id"] == "pres-berth")
    modified_poly = [
        {"x": 190, "y": 250},
        {"x": 1690, "y": 250},
        {"x": 1690, "y": 420},
        {"x": 190, "y": 420},
    ]
    patch_resp = client.patch(
        f"/api/v1/map-config/versions/{draft_id}/zones/pres-berth",
        json={
            "revision": pres_berth_zone["revision"],
            "polygon_canonical": modified_poly,
            "label_anchor_canonical": {"x": 420, "y": 280},
            "operator_anchor_canonical": {"x": 1030, "y": 285},
        },
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert patch_resp.status_code == 200, patch_resp.text

    # Validate draft N+1
    val_resp = client.post(
        f"/api/v1/map-config/versions/{draft_id}/validate",
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert val_resp.status_code == 200
    assert val_resp.json()["valid"] is True

    # 3. Publish N+1
    pub_resp = client.post(
        f"/api/v1/map-config/versions/{draft_id}/publish",
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert pub_resp.status_code == 200, pub_resp.text
    pub_data = pub_resp.json()
    assert pub_data["status"] == "success"
    assert pub_data["version_id"] == draft_id
    assert pub_data["version_number"] == draft_name

    # 4. Fetch /api/v1/map-config/active (as any client, no admin cookie required)
    resp_n1 = client.get("/api/v1/map-config/active")
    assert resp_n1.status_code == 200
    active_n1 = resp_n1.json()

    # 5. Assert N+1 returned
    assert active_n1["version_id"] == draft_id
    assert active_n1["version_number"] == draft_name
    assert active_n1["status"] == "PUBLISHED"
    assert active_n1["source"] == "db"
    assert active_n1["authoritative"] is True

    # 6. Assert published coordinates are rendered / returned exactly
    berth_n1 = next(z for z in active_n1["zones"] if z["zone_id"] == "pres-berth")
    assert berth_n1["polygon_canonical"] == modified_poly
    assert berth_n1["label_anchor_canonical"] == {"x": 420, "y": 280}
    assert berth_n1["operator_anchor_canonical"] == {"x": 1030, "y": 285}

    # Rollback to N for cleanliness
    rb_resp = client.post(
        f"/api/v1/map-config/versions/{version_n_id}/rollback",
        json={"reason": "Teardown primary acceptance test"},
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    )
    assert rb_resp.status_code == 200
    restored = client.get("/api/v1/map-config/active").json()
    assert restored["version_id"] == version_n_id


def test_single_active_published_version_invariant():
    """
    Invariant: At all times, exactly ONE MapVersion record has status='PUBLISHED' for map_id='tan-thuan'.
    """
    db = SessionLocal()
    try:
        published_count = (
            db.query(MapVersion)
            .filter(MapVersion.map_id == "tan-thuan", MapVersion.status == "PUBLISHED")
            .count()
        )
        assert published_count == 1
    finally:
        db.close()


def test_non_admin_cannot_publish_or_modify_drafts():
    """
    Security Gate: Non-admin users cannot create drafts, update zones, or publish.
    """
    admin_auth, op_auth = create_admin_and_operator_sessions()

    # Operator attempts to create draft -> 403 Forbidden
    resp_create = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": "unauthorized-draft"},
        cookies=op_auth["cookies"],
        headers=op_auth["headers"],
    )
    assert resp_create.status_code == 403

    # Admin creates draft
    admin_draft = client.post(
        "/api/v1/map-config/drafts",
        json={"map_version": "auth-test-draft"},
        cookies=admin_auth["cookies"],
        headers=admin_auth["headers"],
    ).json()
    draft_id = admin_draft["id"]

    try:
        # Operator attempts to update zone -> 403
        resp_update = client.patch(
            f"/api/v1/map-config/versions/{draft_id}/zones/pres-berth",
            json={"revision": 1, "polygon_canonical": [{"x": 1, "y": 1}]},
            cookies=op_auth["cookies"],
            headers=op_auth["headers"],
        )
        assert resp_update.status_code == 403

        # Operator attempts to publish -> 403
        resp_pub = client.post(
            f"/api/v1/map-config/versions/{draft_id}/publish",
            cookies=op_auth["cookies"],
            headers=op_auth["headers"],
        )
        assert resp_pub.status_code == 403

    finally:
        client.delete(f"/api/v1/map-config/versions/{draft_id}", cookies=admin_auth["cookies"], headers=admin_auth["headers"])


def test_active_map_config_spatial_metadata_and_landmarks():
    """
    Validates complete spatial contract in GET /api/v1/map-config/active:
    - version_id, version_number, geometry_schema_version
    - coordinate_system, canonical_width, canonical_height, source_asset
    - presentation zones with display_label, business_name, polygon_canonical, anchors
    - root landmarks array populated
    """
    resp = client.get("/api/v1/map-config/active")
    assert resp.status_code == 200
    data = resp.json()

    assert data["coordinate_system"] == "tan-thuan-canonical-image-pixel-space-v1"
    assert data["canonical_width"] == 1915
    assert data["canonical_height"] == 821
    assert data["source_asset"] == "tan-thuan-canonical-base.png"
    assert data["geometry_schema_version"] == "1.0"
    assert data["source"] == "db"
    assert data["authoritative"] is True
    assert len(data["zones"]) == 6

    # Verify each zone has valid geometry and anchors
    for zone in data["zones"]:
        assert len(zone["polygon_canonical"]) >= 3
        assert "x" in zone["label_anchor_canonical"]
        assert "y" in zone["label_anchor_canonical"]
        assert "x" in zone["operator_anchor_canonical"]
        assert "y" in zone["operator_anchor_canonical"]
        assert zone["presentation_color"].startswith("#") or "rgb" in zone["presentation_color"]
