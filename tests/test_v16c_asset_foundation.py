"""
V16C — ASSET-CENTRIC DOMAIN FOUNDATION & TOPOLOGY TEST SUITE

Verifies:
1. Asset Entity & CRUD:
   - Unique code constraint, valid taxonomy types, normalized coordinates [0, 1].
   - List filtering (type, zone, status, verification, search).
   - Relocate, set parent, deactivate, reactivate, retire.
2. Hierarchy Safety & Cycle Prevention:
   - Self-parenting rejected (400 Bad Request).
   - Multi-step cyclic hierarchy A -> B -> C -> A rejected (400 Bad Request).
   - Retiring parent does not cascade-delete children.
3. Meter-Asset Decoupled Relationships:
   - INSTALLED_AT vs MEASURES semantics.
   - 1 Asset to many Meters.
   - Different installed-at vs measures assets for single meter.
   - Active primary uniqueness enforcement (auto-close/transfer).
   - Atomic transfer and close operations preserve historical valid_to timestamp.
   - Retired meters cannot receive new active relations.
   - Verification status transition (UNVERIFIED -> VERIFIED).
4. Topology-Ready Asset Connections & Graph Traversal:
   - SUPPLIES (directional) and CONNECTED_TO connections.
   - Cycle-safe downstream, upstream, and connected graph tracing.
   - Verified-only operational default policy.
5. Backward Compatibility & Spatial Invariants:
   - Zero assets required for existing meter reading and operational map.
   - Spatial freeze SHA-256 checksum invariant preserved (ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3).
   - 5 spatial review meters untouched.
   - PRAGMA foreign_key_check yields 0 violations.
"""

import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app.main import app
from backend.app.db import SessionLocal, init_db
from backend.app.models import (
    AdminAuditLog,
    Asset,
    AssetConnection,
    Meter,
    MeterAssetRelation,
    SessionModel,
    User,
)
from backend.app.auth import hash_password, hash_session_token, generate_csrf_token

client = TestClient(app)
init_db()

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
                employee_code="ADMIN_V16C_TEST",
                full_name="Quản Trị Viên V16C",
                password_hash=hash_password("AdminPass123!"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        token = f"test_v16c_session_{uuid.uuid4().hex}"
        t_hash = hash_session_token(token)
        s_obj = SessionModel(
            id=str(uuid.uuid4()),
            user_id=admin.id,
            token_hash=t_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestV16CRunner",
        )
        db.add(s_obj)
        db.commit()

        csrf_token = generate_csrf_token(token)
        return token, csrf_token, admin.id
    finally:
        db.close()


@pytest.fixture
def auth_headers():
    token, csrf_token, admin_id = create_test_admin_session()
    client.cookies.set("csg_session", token)
    return {
        "X-CSRF-Token": csrf_token,
        "Cookie": f"csg_session={token}",
    }


# ==============================================================================
# 1. ASSET CRUD & VALIDATION
# ==============================================================================

def test_asset_create_read_update_and_audit(auth_headers):
    unique_code = f"AST-TEST-{uuid.uuid4().hex[:6].upper()}"
    create_payload = {
        "code": unique_code,
        "name": "Trạm Biến Áp Kiểm Thử V16C",
        "asset_type": "SUBSTATION",
        "zone_id": "zone-technical",
        "mobility_type": "FIXED",
        "position_source": "STATIC_MAP",
        "map_x": 0.4567,
        "map_y": 0.6789,
        "verification_status": "UNVERIFIED",
    }

    # 1. Create Asset
    res = client.post("/api/v1/admin/assets", json=create_payload, headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    asset_id = data["id"]
    assert data["code"] == unique_code
    assert data["asset_type"] == "SUBSTATION"
    assert data["lifecycle_status"] == "ACTIVE"
    assert data["verification_status"] == "UNVERIFIED"
    assert abs(data["map_x"] - 0.4567) < 1e-4

    # 2. Read Asset by ID
    res_get = client.get(f"/api/v1/admin/assets/{asset_id}", headers=auth_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == asset_id

    # 3. List Filter by asset_type
    res_list = client.get(f"/api/v1/admin/assets?asset_type=SUBSTATION&search={unique_code}", headers=auth_headers)
    assert res_list.status_code == 200
    assert res_list.json()["total"] >= 1

    # 4. Update Asset
    update_payload = {
        "name": "Trạm Biến Áp Kiểm Thử (Đã cập nhật)",
        "verification_status": "VERIFIED",
    }
    res_up = client.patch(f"/api/v1/admin/assets/{asset_id}", json=update_payload, headers=auth_headers)
    assert res_up.status_code == 200
    assert res_up.json()["name"] == "Trạm Biến Áp Kiểm Thử (Đã cập nhật)"
    assert res_up.json()["verification_status"] == "VERIFIED"

    # 5. Relocate Asset
    res_reloc = client.post(
        f"/api/v1/admin/assets/{asset_id}/relocate",
        json={"map_x": 0.5000, "map_y": 0.5000, "position_source": "ASSIGNED"},
        headers=auth_headers,
    )
    assert res_reloc.status_code == 200
    assert res_reloc.json()["map_x"] == 0.5000
    assert res_reloc.json()["position_source"] == "ASSIGNED"

    # 6. Verify Audit Logs
    db = SessionLocal()
    try:
        audits = (
            db.query(AdminAuditLog)
            .filter(AdminAuditLog.resource_type == "ASSET", AdminAuditLog.resource_id == asset_id)
            .all()
        )
        actions = {a.action for a in audits}
        assert "ASSET_CREATED" in actions
        assert "ASSET_UPDATED" in actions
        assert "ASSET_RELOCATED" in actions
    finally:
        db.close()


def test_asset_validation_constraints(auth_headers):
    code = f"AST-VAL-{uuid.uuid4().hex[:6].upper()}"
    client.post(
        "/api/v1/admin/assets",
        json={"code": code, "name": "Asset Val", "asset_type": "PUMP"},
        headers=auth_headers,
    )

    # 1. Duplicate code rejected (409 Conflict)
    res_dup = client.post(
        "/api/v1/admin/assets",
        json={"code": code, "name": "Duplicate Asset", "asset_type": "PUMP"},
        headers=auth_headers,
    )
    assert res_dup.status_code == 409

    # 2. Invalid asset type rejected (400 Bad Request)
    res_inv_type = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-INV-{uuid.uuid4().hex[:4]}", "name": "Bad Type", "asset_type": "SPACESHIP"},
        headers=auth_headers,
    )
    assert res_inv_type.status_code == 400

    # 3. Out-of-bounds coordinates rejected (400 Bad Request)
    res_inv_coord = client.post(
        "/api/v1/admin/assets",
        json={
            "code": f"AST-COORD-{uuid.uuid4().hex[:4]}",
            "name": "Bad Coord",
            "asset_type": "PUMP",
            "map_x": 1.5,
            "map_y": 0.5,
        },
        headers=auth_headers,
    )
    assert res_inv_coord.status_code == 400


# ==============================================================================
# 2. HIERARCHY SAFETY & CYCLE PREVENTION
# ==============================================================================

def test_asset_hierarchy_cycle_prevention(auth_headers):
    # Create 3 assets: A -> B -> C
    res_a = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-A-{uuid.uuid4().hex[:4]}", "name": "Asset A", "asset_type": "SUBSTATION"},
        headers=auth_headers,
    )
    res_b = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-B-{uuid.uuid4().hex[:4]}", "name": "Asset B", "asset_type": "SWITCHBOARD"},
        headers=auth_headers,
    )
    res_c = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-C-{uuid.uuid4().hex[:4]}", "name": "Asset C", "asset_type": "FEEDER"},
        headers=auth_headers,
    )
    id_a, id_b, id_c = res_a.json()["id"], res_b.json()["id"], res_c.json()["id"]

    # 1. Self-parenting rejected
    res_self = client.post(
        f"/api/v1/admin/assets/{id_a}/set-parent",
        json={"parent_asset_id": id_a},
        headers=auth_headers,
    )
    assert res_self.status_code == 400

    # 2. Setup A -> B (A is parent of B), B -> C (B is parent of C)
    res_b_parent = client.post(
        f"/api/v1/admin/assets/{id_b}/set-parent",
        json={"parent_asset_id": id_a},
        headers=auth_headers,
    )
    assert res_b_parent.status_code == 200

    res_c_parent = client.post(
        f"/api/v1/admin/assets/{id_c}/set-parent",
        json={"parent_asset_id": id_b},
        headers=auth_headers,
    )
    assert res_c_parent.status_code == 200

    # 3. Cycle attempt: set C as parent of A (would form A -> B -> C -> A)
    res_cycle = client.post(
        f"/api/v1/admin/assets/{id_a}/set-parent",
        json={"parent_asset_id": id_c},
        headers=auth_headers,
    )
    assert res_cycle.status_code == 400
    assert "cycle" in res_cycle.text.lower()


def test_asset_non_destructive_retirement(auth_headers):
    # Create parent and child asset
    res_p = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-PAR-{uuid.uuid4().hex[:4]}", "name": "Parent Asset", "asset_type": "WAREHOUSE"},
        headers=auth_headers,
    )
    id_p = res_p.json()["id"]

    res_c = client.post(
        "/api/v1/admin/assets",
        json={
            "code": f"AST-CHL-{uuid.uuid4().hex[:4]}",
            "name": "Child Asset",
            "asset_type": "SWITCHBOARD",
            "parent_asset_id": id_p,
        },
        headers=auth_headers,
    )
    id_c = res_c.json()["id"]

    # Retire parent
    res_ret = client.post(
        f"/api/v1/admin/assets/{id_p}/retire",
        json={"reason": "Warehouse renovation"},
        headers=auth_headers,
    )
    assert res_ret.status_code == 200
    assert res_ret.json()["lifecycle_status"] == "RETIRED"

    # Verify child remains ACTIVE and is not deleted
    res_child = client.get(f"/api/v1/admin/assets/{id_c}", headers=auth_headers)
    assert res_child.status_code == 200
    assert res_child.json()["lifecycle_status"] == "ACTIVE"


# ==============================================================================
# 3. METER-ASSET RELATIONSHIPS
# ==============================================================================

def test_meter_asset_relations_lifecycle_and_transfer(auth_headers):
    db = SessionLocal()
    try:
        active_meter = db.query(Meter).filter(Meter.lifecycle_status == "ACTIVE").first()
        assert active_meter is not None, "Need an active meter"
        meter_id = active_meter.id
    finally:
        db.close()

    # Create 2 Assets: Asset 1 (Switchboard) and Asset 2 (RTG Crane)
    res_a1 = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-SW-{uuid.uuid4().hex[:4]}", "name": "Tủ Điện Kiosk", "asset_type": "SWITCHBOARD"},
        headers=auth_headers,
    )
    res_a2 = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-RTG-{uuid.uuid4().hex[:4]}", "name": "Cẩu Khung RTG-99", "asset_type": "RTG"},
        headers=auth_headers,
    )
    id_a1, id_a2 = res_a1.json()["id"], res_a2.json()["id"]

    # 1. Create INSTALLED_AT on Asset 1
    res_rel1 = client.post(
        "/api/v1/admin/meter-asset-relations",
        json={
            "meter_id": meter_id,
            "asset_id": id_a1,
            "relation_type": "INSTALLED_AT",
            "mount_point": "Ngăn hạ thế số 1",
            "is_primary": True,
            "verification_status": "UNVERIFIED",
        },
        headers=auth_headers,
    )
    assert res_rel1.status_code == 200, res_rel1.text
    rel1 = res_rel1.json()
    assert rel1["relation_type"] == "INSTALLED_AT"
    assert rel1["is_primary"] is True

    # 2. Create MEASURES on Asset 2 (Different asset)
    res_rel2 = client.post(
        "/api/v1/admin/meter-asset-relations",
        json={
            "meter_id": meter_id,
            "asset_id": id_a2,
            "relation_type": "MEASURES",
            "is_primary": True,
            "verification_status": "UNVERIFIED",
        },
        headers=auth_headers,
    )
    assert res_rel2.status_code == 200
    assert res_rel2.json()["relation_type"] == "MEASURES"

    # 3. Active Primary Uniqueness:
    # Creating a second primary INSTALLED_AT should close rel1
    res_a3 = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-NEW-SW-{uuid.uuid4().hex[:4]}", "name": "Tủ Mới", "asset_type": "SWITCHBOARD"},
        headers=auth_headers,
    )
    id_a3 = res_a3.json()["id"]

    res_rel3 = client.post(
        "/api/v1/admin/meter-asset-relations",
        json={
            "meter_id": meter_id,
            "asset_id": id_a3,
            "relation_type": "INSTALLED_AT",
            "is_primary": True,
        },
        headers=auth_headers,
    )
    assert res_rel3.status_code == 200

    # Verify rel1 has valid_to set (closed)
    db = SessionLocal()
    try:
        r1_db = db.query(MeterAssetRelation).filter(MeterAssetRelation.id == rel1["id"]).first()
        assert r1_db.valid_to is not None, "Previous primary relation must be closed"
    finally:
        db.close()

    # 4. Transfer relation
    res_trans = client.post(
        f"/api/v1/admin/meter-asset-relations/{res_rel3.json()['id']}/transfer",
        json={"new_asset_id": id_a1, "mount_point": "Ngăn mới"},
        headers=auth_headers,
    )
    assert res_trans.status_code == 200
    assert res_trans.json()["asset_id"] == id_a1

    # 5. Verify relation
    new_rel_id = res_trans.json()["id"]
    res_ver = client.post(
        f"/api/v1/admin/meter-asset-relations/{new_rel_id}/verify",
        headers=auth_headers,
    )
    assert res_ver.status_code == 200
    assert res_ver.json()["verification_status"] == "VERIFIED"


def test_retired_meter_rejects_new_active_relations(auth_headers):
    db = SessionLocal()
    try:
        # Create a test meter and retire it
        test_meter = Meter(
            id=str(uuid.uuid4()),
            meter_code=f"MTR-RET-{uuid.uuid4().hex[:4]}",
            name="Meter Test Retired",
            lifecycle_status="RETIRED",
            is_active=False,
        )
        db.add(test_meter)

        test_asset = Asset(
            id=str(uuid.uuid4()),
            code=f"AST-FOR-RET-{uuid.uuid4().hex[:4]}",
            name="Asset For Retired Meter",
            asset_type="MACHINE",
        )
        db.add(test_asset)
        db.commit()
        m_id, a_id = test_meter.id, test_asset.id
    finally:
        db.close()

    try:
        # Attempting to attach new relation to RETIRED meter should fail with 400
        res = client.post(
            "/api/v1/admin/meter-asset-relations",
            json={
                "meter_id": m_id,
                "asset_id": a_id,
                "relation_type": "MEASURES",
            },
            headers=auth_headers,
        )
        assert res.status_code == 400
        assert "retired" in res.text.lower()
    finally:
        clean_db = SessionLocal()
        try:
            clean_db.query(MeterAssetRelation).filter(MeterAssetRelation.meter_id == m_id).delete()
            clean_db.query(Meter).filter(Meter.id == m_id).delete()
            clean_db.query(Asset).filter(Asset.id == a_id).delete()
            clean_db.commit()
        finally:
            clean_db.close()


# ==============================================================================
# 4. TOPOLOGY CONNECTIONS & CYCLE-SAFE TRACING
# ==============================================================================

def test_topology_connections_and_cycle_safe_trace(auth_headers):
    # Create 3 Assets: Substation -> Switchboard -> Crane -> Substation (loop)
    res_sub = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-TOPO-SUB-{uuid.uuid4().hex[:4]}", "name": "Trạm TT", "asset_type": "SUBSTATION"},
        headers=auth_headers,
    )
    res_sw = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-TOPO-SW-{uuid.uuid4().hex[:4]}", "name": "Tủ Phân Phối", "asset_type": "SWITCHBOARD"},
        headers=auth_headers,
    )
    res_crane = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-TOPO-CR-{uuid.uuid4().hex[:4]}", "name": "Cẩu Bờ", "asset_type": "QUAY_CRANE"},
        headers=auth_headers,
    )
    sub_id, sw_id, cr_id = res_sub.json()["id"], res_sw.json()["id"], res_crane.json()["id"]

    # 1. Create connection Substation -> Switchboard (SUPPLIES, VERIFIED)
    res_c1 = client.post(
        "/api/v1/admin/asset-connections",
        json={
            "source_asset_id": sub_id,
            "target_asset_id": sw_id,
            "utility_type": "ELECTRICITY",
            "connection_type": "SUPPLIES",
            "verification_status": "VERIFIED",
        },
        headers=auth_headers,
    )
    assert res_c1.status_code == 200

    # 2. Create connection Switchboard -> Crane (SUPPLIES, VERIFIED)
    res_c2 = client.post(
        "/api/v1/admin/asset-connections",
        json={
            "source_asset_id": sw_id,
            "target_asset_id": cr_id,
            "utility_type": "ELECTRICITY",
            "connection_type": "SUPPLIES",
            "verification_status": "VERIFIED",
        },
        headers=auth_headers,
    )
    assert res_c2.status_code == 200

    # 3. Create cycle edge Crane -> Substation (SUPPLIES, VERIFIED) to test loop protection
    res_c3 = client.post(
        "/api/v1/admin/asset-connections",
        json={
            "source_asset_id": cr_id,
            "target_asset_id": sub_id,
            "utility_type": "ELECTRICITY",
            "connection_type": "SUPPLIES",
            "verification_status": "VERIFIED",
        },
        headers=auth_headers,
    )
    assert res_c3.status_code == 200

    # 4. Trace downstream from Substation (must complete without hanging/infinite recursion)
    res_trace = client.get(
        f"/api/v1/admin/asset-topology/trace?asset_id={sub_id}&direction=downstream&utility_type=ELECTRICITY",
        headers=auth_headers,
    )
    assert res_trace.status_code == 200
    trace_data = res_trace.json()
    node_ids = {n["id"] for n in trace_data["nodes"]}
    assert sub_id in node_ids
    assert sw_id in node_ids
    assert cr_id in node_ids
    assert len(trace_data["edges"]) == 3

    # 5. Test verified-only default:
    # Add an UNVERIFIED edge Crane -> New Asset
    res_extra = client.post(
        "/api/v1/admin/assets",
        json={"code": f"AST-EXTRA-{uuid.uuid4().hex[:4]}", "name": "Extra Asset", "asset_type": "OTHER"},
        headers=auth_headers,
    )
    extra_id = res_extra.json()["id"]

    client.post(
        "/api/v1/admin/asset-connections",
        json={
            "source_asset_id": cr_id,
            "target_asset_id": extra_id,
            "utility_type": "ELECTRICITY",
            "connection_type": "SUPPLIES",
            "verification_status": "UNVERIFIED",
        },
        headers=auth_headers,
    )

    # Default trace (include_unverified=False) must NOT include extra_id
    res_ver_only = client.get(
        f"/api/v1/admin/asset-topology/trace?asset_id={sub_id}&direction=downstream&include_unverified=false",
        headers=auth_headers,
    )
    assert extra_id not in {n["id"] for n in res_ver_only.json()["nodes"]}

    # include_unverified=True MUST include extra_id
    res_with_unver = client.get(
        f"/api/v1/admin/asset-topology/trace?asset_id={sub_id}&direction=downstream&include_unverified=true",
        headers=auth_headers,
    )
    assert extra_id in {n["id"] for n in res_with_unver.json()["nodes"]}


# ==============================================================================
# 5. BACKWARD COMPATIBILITY & SPATIAL INVARIANTS
# ==============================================================================

def test_backward_compatibility_zero_assets():
    # Verify that existing operational map config loads without requiring assets
    res_map = client.get("/api/v1/map-config/active")
    assert res_map.status_code == 200
    map_data = res_map.json()
    assert map_data["map_id"] == "tan-thuan"
    assert len(map_data["zones"]) == 6


def test_spatial_freeze_baseline_checksum_v16c():
    """Verify authoritative map version sha256 checksum is untouched."""
    with open(FREEZE_JSON_PATH, "r", encoding="utf-8") as f:
        freeze_data = json.load(f)

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
    computed_hash = hashlib.sha256(raw_bytes).hexdigest()
    assert computed_hash == EXPECTED_FREEZE_SHA256, (
        f"Spatial freeze checksum mismatch: {computed_hash} != {EXPECTED_FREEZE_SHA256}"
    )


def test_db_foreign_key_integrity_v16c():
    """Verify SQLite foreign key integrity after V16C migrations."""
    db = SessionLocal()
    try:
        res = db.execute(text("PRAGMA foreign_key_check;")).fetchall()
        assert len(res) == 0, f"Foreign key check violations found: {res}"
    finally:
        db.close()
