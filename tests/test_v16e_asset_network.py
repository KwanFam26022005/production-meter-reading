"""
V16E — ASSET-CENTRIC MAP & UTILITY NETWORK TOPOLOGY TEST SUITE

Verifies:
1. Spatial baseline SHA-256 invariant (ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3)
   and preservation of all 12 baseline meters.
2. GET /api/v1/admin/asset-network:
   - verified_only=True (default) returns VERIFIED nodes and VERIFIED edges only.
   - verified_only=False returns unverified candidates as well.
   - utility_type filtering (ELECTRICITY, WATER).
   - focus_asset_id scopes to connected subgraph.
3. GET /api/v1/admin/assets/{asset_id}/operational-context:
   - Full asset metadata.
   - Attached meters (both INSTALLED_AT and MEASURES) with reading history projection.
   - Upstream and downstream connections.
   - Spatial position verification status.
4. Authorization enforcement:
   - Non-admin cannot query asset-network or operational-context.
5. SQLite foreign key integrity (PRAGMA foreign_key_check).
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
    Asset,
    AssetConnection,
    Meter,
    MeterAssetRelation,
    MeterReading,
    ReadingBatch,
    ReadingRound,
    SessionModel,
    User,
    get_utc_now,
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
                employee_code="ADMIN_V16E_TEST",
                full_name="Quản Trị Viên V16E",
                password_hash=hash_password("AdminPass123!"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        token = f"test_v16e_session_{uuid.uuid4().hex}"
        t_hash = hash_session_token(token)
        s_obj = SessionModel(
            id=str(uuid.uuid4()),
            user_id=admin.id,
            token_hash=t_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestV16ERunner",
        )
        db.add(s_obj)
        db.commit()

        csrf_token = generate_csrf_token(token)
        return token, csrf_token, admin.id
    finally:
        db.close()


def create_test_operator_session():
    init_db()
    db = SessionLocal()
    try:
        op = db.query(User).filter(User.role == "OPERATOR", User.is_active == True).first()
        if not op:
            op = User(
                id=str(uuid.uuid4()),
                employee_code="OPERATOR_V16E_TEST",
                full_name="Nhân Viên V16E",
                password_hash=hash_password("OperatorPass123!"),
                role="OPERATOR",
                is_active=True,
            )
            db.add(op)
            db.commit()
            db.refresh(op)

        token = f"test_v16e_op_session_{uuid.uuid4().hex}"
        t_hash = hash_session_token(token)
        s_obj = SessionModel(
            id=str(uuid.uuid4()),
            user_id=op.id,
            token_hash=t_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestV16ERunner",
        )
        db.add(s_obj)
        db.commit()

        csrf_token = generate_csrf_token(token)
        return token, csrf_token, op.id
    finally:
        db.close()


def test_spatial_baseline_invariant_v16e():
    """Verify spatial freeze SHA-256 canonical hash and preservation of 12 meters."""
    assert FREEZE_JSON_PATH.exists(), f"Freeze file missing: {FREEZE_JSON_PATH}"
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

    db = SessionLocal()
    try:
        meters = db.query(Meter).filter(Meter.meter_code.in_([f"CT-{i:03d}" for i in range(1, 13)])).all()
        assert len(meters) == 12, "All 12 baseline meters must exist in DB."
    finally:
        db.close()


def test_asset_network_endpoint_verified_only_default():
    """Verify GET /api/v1/admin/asset-network defaults to verified_only=True and does not leak unverified data."""
    admin_token, csrf, _ = create_test_admin_session()
    headers = {"Cookie": f"csg_session={admin_token}", "X-CSRF-Token": csrf}

    db = SessionLocal()
    try:
        # Create 1 verified asset, 1 unverified asset
        a1 = Asset(
            id=str(uuid.uuid4()),
            code=f"ASSET-NET-V-{uuid.uuid4().hex[:6]}",
            name="Trạm Biến Áp Đã Xác Minh",
            asset_type="SUBSTATION",
            verification_status="VERIFIED",
            lifecycle_status="ACTIVE",
            source="MANUAL_ENTRY",
        )
        a2 = Asset(
            id=str(uuid.uuid4()),
            code=f"ASSET-NET-UV-{uuid.uuid4().hex[:6]}",
            name="Trạm Biến Áp Chưa Xác Minh",
            asset_type="SUBSTATION",
            verification_status="UNVERIFIED",
            lifecycle_status="ACTIVE",
            source="DISCOVERY_PROPOSAL",
        )
        db.add_all([a1, a2])
        db.flush()

        a3 = Asset(
            id=str(uuid.uuid4()),
            code=f"ASSET-NET-V2-{uuid.uuid4().hex[:6]}",
            name="Tủ Phân Phối Đã Xác Minh",
            asset_type="SWITCHBOARD",
            verification_status="VERIFIED",
            lifecycle_status="ACTIVE",
            source="MANUAL_ENTRY",
        )
        db.add(a3)
        db.flush()

        conn_v = AssetConnection(
            id=str(uuid.uuid4()),
            source_asset_id=a1.id,
            target_asset_id=a3.id,
            utility_type="ELECTRICITY",
            connection_type="SUPPLIES",
            verification_status="VERIFIED",
        )
        conn_uv = AssetConnection(
            id=str(uuid.uuid4()),
            source_asset_id=a2.id,
            target_asset_id=a3.id,
            utility_type="ELECTRICITY",
            connection_type="SUPPLIES",
            verification_status="UNVERIFIED",
        )
        db.add_all([conn_v, conn_uv])
        db.commit()

        # 1. Query with default (verified_only=True)
        res = client.get("/api/v1/admin/asset-network", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["verified_only"] is True
        node_ids = {n["id"] for n in data["nodes"]}
        edge_ids = {e["id"] for e in data["edges"]}

        # Must include verified asset a1, a3; must NOT include unverified a2
        assert a1.id in node_ids
        assert a3.id in node_ids
        assert a2.id not in node_ids

        # Must include verified connection conn_v; must NOT include unverified conn_uv
        assert conn_v.id in edge_ids
        assert conn_uv.id not in edge_ids

        # Stats must truthfully reflect counts
        stats = data["stats"]
        assert stats["verified_nodes"] >= 2
        assert stats["unverified_nodes"] >= 1
        assert stats["verified_edges"] >= 1
        assert stats["unverified_edges"] >= 1

        # 2. Query with verified_only=false (Admin toggle: "Hiển thị giả thuyết chưa xác minh")
        res_all = client.get("/api/v1/admin/asset-network?verified_only=false", headers=headers)
        assert res_all.status_code == 200
        data_all = res_all.json()
        assert data_all["verified_only"] is False
        node_ids_all = {n["id"] for n in data_all["nodes"]}
        edge_ids_all = {e["id"] for e in data_all["edges"]}

        assert a2.id in node_ids_all
        assert conn_uv.id in edge_ids_all

    finally:
        db.close()


def test_asset_network_utility_filter_and_focus():
    """Verify utility_type filtering and focus_asset_id subgraph scoping."""
    admin_token, csrf, _ = create_test_admin_session()
    headers = {"Cookie": f"csg_session={admin_token}", "X-CSRF-Token": csrf}

    db = SessionLocal()
    try:
        e_src = Asset(
            id=str(uuid.uuid4()),
            code=f"E-SRC-{uuid.uuid4().hex[:6]}",
            name="Trạm Cắt 22kV",
            asset_type="SUBSTATION",
            verification_status="VERIFIED",
            lifecycle_status="ACTIVE",
            source="MANUAL_ENTRY",
        )
        e_dst = Asset(
            id=str(uuid.uuid4()),
            code=f"E-DST-{uuid.uuid4().hex[:6]}",
            name="Cẩu Bờ QC-01",
            asset_type="QUAY_CRANE",
            verification_status="VERIFIED",
            lifecycle_status="ACTIVE",
            source="MANUAL_ENTRY",
        )
        w_src = Asset(
            id=str(uuid.uuid4()),
            code=f"W-SRC-{uuid.uuid4().hex[:6]}",
            name="Đài Nước Cảng",
            asset_type="WATER_POINT",
            verification_status="VERIFIED",
            lifecycle_status="ACTIVE",
            source="MANUAL_ENTRY",
        )
        w_dst = Asset(
            id=str(uuid.uuid4()),
            code=f"W-DST-{uuid.uuid4().hex[:6]}",
            name="Trụ Nước Tàu Cầu Cảng",
            asset_type="WATER_POINT",
            verification_status="VERIFIED",
            lifecycle_status="ACTIVE",
            source="MANUAL_ENTRY",
        )
        db.add_all([e_src, e_dst, w_src, w_dst])
        db.flush()

        conn_e = AssetConnection(
            id=str(uuid.uuid4()),
            source_asset_id=e_src.id,
            target_asset_id=e_dst.id,
            utility_type="ELECTRICITY",
            connection_type="SUPPLIES",
            verification_status="VERIFIED",
        )
        conn_w = AssetConnection(
            id=str(uuid.uuid4()),
            source_asset_id=w_src.id,
            target_asset_id=w_dst.id,
            utility_type="WATER",
            connection_type="SUPPLIES",
            verification_status="VERIFIED",
        )
        db.add_all([conn_e, conn_w])
        db.commit()

        # 1. Filter ELECTRICITY
        res_e = client.get("/api/v1/admin/asset-network?utility_type=ELECTRICITY", headers=headers)
        assert res_e.status_code == 200
        data_e = res_e.json()
        edge_ids_e = {e["id"] for e in data_e["edges"]}
        assert conn_e.id in edge_ids_e
        assert conn_w.id not in edge_ids_e

        # 2. Filter WATER
        res_w = client.get("/api/v1/admin/asset-network?utility_type=WATER", headers=headers)
        assert res_w.status_code == 200
        data_w = res_w.json()
        edge_ids_w = {e["id"] for e in data_w["edges"]}
        assert conn_w.id in edge_ids_w
        assert conn_e.id not in edge_ids_w

        # 3. Focus asset e_src (subgraph)
        res_focus = client.get(f"/api/v1/admin/asset-network?focus_asset_id={e_src.id}", headers=headers)
        assert res_focus.status_code == 200
        data_focus = res_focus.json()
        focus_node_ids = {n["id"] for n in data_focus["nodes"]}
        assert e_src.id in focus_node_ids
        assert e_dst.id in focus_node_ids
        assert w_src.id not in focus_node_ids

    finally:
        db.close()


def test_asset_operational_context():
    """Verify GET /api/v1/admin/assets/{asset_id}/operational-context returns full context."""
    admin_token, csrf, admin_id = create_test_admin_session()
    headers = {"Cookie": f"csg_session={admin_token}", "X-CSRF-Token": csrf}

    db = SessionLocal()
    try:
        # Create an asset with coordinates
        asset = Asset(
            id=str(uuid.uuid4()),
            code=f"ASSET-CTX-{uuid.uuid4().hex[:6]}",
            name="Trạm Trắc Địa Tân Thuận",
            asset_type="SUBSTATION",
            verification_status="VERIFIED",
            position_verification_status="VERIFIED",
            map_x=0.35,
            map_y=0.45,
            lifecycle_status="ACTIVE",
            source="MANUAL_ENTRY",
        )
        db.add(asset)
        db.flush()

        # Create upstream asset & connection
        up_asset = Asset(
            id=str(uuid.uuid4()),
            code=f"ASSET-UP-{uuid.uuid4().hex[:6]}",
            name="Đường Dây 110kV EVN",
            asset_type="FEEDER",
            verification_status="VERIFIED",
            lifecycle_status="ACTIVE",
            source="MANUAL_ENTRY",
        )
        db.add(up_asset)
        db.flush()

        up_conn = AssetConnection(
            id=str(uuid.uuid4()),
            source_asset_id=up_asset.id,
            target_asset_id=asset.id,
            utility_type="ELECTRICITY",
            connection_type="SUPPLIES",
            verification_status="VERIFIED",
        )
        db.add(up_conn)

        # Attach meter CT-001 via MEASURES
        meter = db.query(Meter).filter(Meter.meter_code == "CT-001").first()
        assert meter is not None

        rel = MeterAssetRelation(
            id=str(uuid.uuid4()),
            meter_id=meter.id,
            asset_id=asset.id,
            relation_type="MEASURES",
            is_primary=True,
            verification_status="VERIFIED",
        )
        db.add(rel)

        # Add a reading for this meter
        batch = db.query(ReadingBatch).first()
        if not batch:
            batch = ReadingBatch(id=str(uuid.uuid4()), period_key="2026-09", status="ACTIVE")
            db.add(batch)
            db.flush()

        round_obj = db.query(ReadingRound).first()
        if not round_obj:
            round_obj = ReadingRound(id=str(uuid.uuid4()), batch_id=batch.id, round_number=1, status="ACTIVE")
            db.add(round_obj)
            db.flush()

        # Check if reading already exists for (meter_id, reading_round_id)
        existing_reading = db.query(MeterReading).filter(
            MeterReading.meter_id == meter.id,
            MeterReading.reading_round_id == round_obj.id,
        ).first()
        if existing_reading:
            reading = existing_reading
            reading.reading = "14520.5"
            reading.status = "CONFIRMED"
        else:
            reading = MeterReading(
                id=str(uuid.uuid4()),
                meter_id=meter.id,
                batch_id=batch.id,
                reading_round_id=round_obj.id,
                user_id=admin_id,
                reading="14520.5",
                status="CONFIRMED",
                server_timestamp=get_utc_now(),
            )
            db.add(reading)
        db.commit()

        # Query operational context
        res = client.get(f"/api/v1/admin/assets/{asset.id}/operational-context", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["asset"]["id"] == asset.id
        assert data["spatial_status"] == "VERIFIED"
        assert len(data["meters"]) >= 1
        m_ctx = next(m for m in data["meters"] if m["meter_id"] == meter.id)
        assert m_ctx["relation_type"] == "MEASURES"
        assert m_ctx["latest_reading_value"] is not None
        assert m_ctx["latest_reading_status"] is not None
        assert m_ctx["latest_reading_time"] is not None

        assert len(data["upstream_connections"]) == 1
        assert data["upstream_connections"][0]["source_asset_id"] == up_asset.id
        assert len(data["downstream_connections"]) == 0

    finally:
        # Clean up test relation so baseline review matrix is not contaminated
        db.query(MeterAssetRelation).filter(MeterAssetRelation.asset_id == asset.id).delete(synchronize_session=False)
        db.commit()
        db.close()


def test_operational_context_missing_coordinates():
    """Verify asset without coordinates reports spatial_status='MISSING_COORDINATES'."""
    admin_token, csrf, _ = create_test_admin_session()
    headers = {"Cookie": f"csg_session={admin_token}", "X-CSRF-Token": csrf}

    db = SessionLocal()
    try:
        asset = Asset(
            id=str(uuid.uuid4()),
            code=f"ASSET-NO-XY-{uuid.uuid4().hex[:6]}",
            name="Máy Bơm Cứu Hỏa Dự Phòng",
            asset_type="PUMP",
            verification_status="UNVERIFIED",
            map_x=None,
            map_y=None,
            lifecycle_status="ACTIVE",
            source="DISCOVERY_PROPOSAL",
        )
        db.add(asset)
        db.commit()

        res = client.get(f"/api/v1/admin/assets/{asset.id}/operational-context", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["spatial_status"] == "MISSING_COORDINATES"
        assert data["asset"]["map_x"] is None
        assert data["asset"]["map_y"] is None

    finally:
        db.close()


def test_non_admin_cannot_access_network_or_context():
    """Verify non-admin operator receives 403 Forbidden on asset network endpoints."""
    op_token, csrf, _ = create_test_operator_session()
    headers = {"Cookie": f"csg_session={op_token}", "X-CSRF-Token": csrf}

    res_net = client.get("/api/v1/admin/asset-network", headers=headers)
    assert res_net.status_code == 403

    res_ctx = client.get("/api/v1/admin/assets/some-id/operational-context", headers=headers)
    assert res_ctx.status_code == 403


def test_zero_foreign_key_violations_v16e():
    """Verify SQLite foreign key integrity after all mutations."""
    db = SessionLocal()
    try:
        violations = db.execute(text("PRAGMA foreign_key_check;")).fetchall()
        assert len(violations) == 0, f"Foreign key violations found: {violations}"
    finally:
        db.close()
