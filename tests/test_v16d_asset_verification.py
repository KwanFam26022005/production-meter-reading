"""
V16D — ASSET / METER DATA VERIFICATION & CANDIDATE INGESTION TEST SUITE

Verifies:
1. Spatial baseline SHA-256 invariant (ed5fd8bfa4b0e8a2b59937a418de787c57c6d072f3f790f3dbe84df5299177d3)
   and preservation of 12 baseline meters (including 5 spatial review meters).
2. Candidate import idempotency (DISCOVERY_PROPOSAL, UNVERIFIED status, no duplicate creation,
   coordinates null by default).
3. Evidence-backed asset verification (requires evidence_type & evidence_reference, creates VerificationEvidence).
4. Asset verification rejection and reopen review transitions.
5. Meter-asset relation verification with primary uniqueness auto-closure & valid_to history.
6. Asset position placement with zone containment detection and non-blocking warnings.
7. Meter technical metadata updates (reading_method, communication_protocol, utility_type).
8. Topology connection verification with verified-only graph traversal policy.
9. Verification summary overview and 12-meter review matrix integrity.
10. Database foreign key integrity (PRAGMA foreign_key_check yields 0 violations).
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
    VerificationEvidence,
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
                employee_code="ADMIN_V16D_TEST",
                full_name="Quản Trị Viên V16D",
                password_hash=hash_password("AdminPass123!"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        token = f"test_v16d_session_{uuid.uuid4().hex}"
        t_hash = hash_session_token(token)
        s_obj = SessionModel(
            id=str(uuid.uuid4()),
            user_id=admin.id,
            token_hash=t_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestV16DRunner",
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


def test_spatial_baseline_invariant_v16d():
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

        for m in meters:
            assert m.map_x is not None and m.map_y is not None
            assert m.presentation_zone_id is not None
    finally:
        db.close()


def test_candidate_import_idempotent_v16d(auth_headers):
    """Import candidates proposal and verify idempotency, null coordinates, UNVERIFIED status."""
    # First import
    res = client.post("/api/v1/admin/assets/import-candidates", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "imported_assets" in data or "updated_assets" in data
    assert (data.get("imported_assets", 0) + data.get("updated_assets", 0)) >= 10
    assert (data.get("imported_relations", 0) + data.get("updated_relations", 0)) >= 12

    db = SessionLocal()
    try:
        # Check an imported candidate asset
        asset_cand = db.query(Asset).filter(Asset.code == "AST-CAND-001").first()
        assert asset_cand is not None
        assert asset_cand.verification_status == "UNVERIFIED"
        assert asset_cand.source == "DISCOVERY_PROPOSAL"
        # Coordinates MUST be null by default (no automatic copying from meter)
        assert asset_cand.map_x is None
        assert asset_cand.map_y is None
        assert asset_cand.position_verification_status == "UNVERIFIED"

        # Check relation
        rel = db.query(MeterAssetRelation).filter(
            MeterAssetRelation.asset_id == asset_cand.id
        ).first()
        assert rel is not None
        assert rel.verification_status == "UNVERIFIED"
        assert rel.source == "DISCOVERY_PROPOSAL"
        assert rel.confidence in ("HIGH", "MEDIUM", "LOW")
    finally:
        db.close()

    # Second import (idempotency check)
    res2 = client.post("/api/v1/admin/assets/import-candidates", headers=auth_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2.get("imported_assets", 0) == 0, "Repeated import must not create duplicate assets"
    assert data2.get("imported_relations", 0) == 0, "Repeated import must not create duplicate relations"


def test_asset_verification_requires_evidence_v16d(auth_headers):
    """Asset verification must enforce evidence and create VerificationEvidence."""
    db = SessionLocal()
    try:
        # Create unverified asset
        asset = Asset(
            id=str(uuid.uuid4()),
            code=f"TEST-VERIF-{uuid.uuid4().hex[:6].upper()}",
            name="Thiết bị kiểm tra xác minh",
            asset_type="WORKSHOP",
            lifecycle_status="ACTIVE",
            mobility_type="FIXED",
            verification_status="UNVERIFIED",
            source="DISCOVERY_PROPOSAL",
        )
        db.add(asset)
        db.commit()
        asset_id = asset.id
    finally:
        db.close()

    # 1. Attempt verification with empty evidence reference -> 422 or 400 Bad Request
    bad_res = client.post(
        f"/api/v1/admin/assets/{asset_id}/verify",
        json={"evidence_type": "PORT_DOCUMENT", "evidence_reference": ""},
        headers=auth_headers,
    )
    assert bad_res.status_code in (400, 422)

    # 2. Valid verification
    good_res = client.post(
        f"/api/v1/admin/assets/{asset_id}/verify",
        json={
            "evidence_type": "PHYSICAL_INSPECTION",
            "evidence_reference": "BIEN-BAN-KS-2026-001",
            "notes": "Kiểm tra thực địa phân xưởng đạt yêu cầu",
        },
        headers=auth_headers,
    )
    assert good_res.status_code == 200
    v_data = good_res.json()
    assert v_data["verification_status"] == "VERIFIED"

    # Verify VerificationEvidence record
    db = SessionLocal()
    try:
        ev = db.query(VerificationEvidence).filter(
            VerificationEvidence.entity_type == "ASSET",
            VerificationEvidence.entity_id == asset_id,
        ).first()
        assert ev is not None
        assert ev.evidence_type == "PHYSICAL_INSPECTION"
        assert ev.evidence_reference == "BIEN-BAN-KS-2026-001"
        assert ev.verified_by is not None
    finally:
        db.close()

    # Query API verification evidences
    ev_res = client.get(f"/api/v1/admin/verification-evidence/ASSET/{asset_id}", headers=auth_headers)
    assert ev_res.status_code == 200
    ev_list = ev_res.json()
    assert len(ev_list) >= 1
    assert ev_list[0]["evidence_reference"] == "BIEN-BAN-KS-2026-001"


def test_asset_verification_rejection_and_reopen_v16d(auth_headers):
    """Asset rejection and reopen review flow."""
    db = SessionLocal()
    try:
        asset = Asset(
            id=str(uuid.uuid4()),
            code=f"TEST-REJ-{uuid.uuid4().hex[:6].upper()}",
            name="Thiết bị bị đề xuất sai",
            asset_type="WAREHOUSE",
            lifecycle_status="ACTIVE",
            mobility_type="FIXED",
            verification_status="UNVERIFIED",
            source="DISCOVERY_PROPOSAL",
        )
        db.add(asset)
        db.commit()
        asset_id = asset.id
    finally:
        db.close()

    # Reject
    rej_res = client.post(
        f"/api/v1/admin/assets/{asset_id}/reject",
        json={"reason": "Không tồn tại trên mặt bằng thực địa", "notes": "Đã đối chiếu sơ đồ cảng 2026"},
        headers=auth_headers,
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["verification_status"] == "REJECTED"

    # Reopen
    reopen_res = client.post(f"/api/v1/admin/assets/{asset_id}/reopen-review", headers=auth_headers)
    assert reopen_res.status_code == 200
    assert reopen_res.json()["verification_status"] == "UNVERIFIED"


def test_meter_asset_relation_verification_and_primary_uniqueness_v16d(auth_headers):
    """Meter-asset relation verification enforces single active primary by auto-closing older primary."""
    db = SessionLocal()
    try:
        meter = db.query(Meter).filter(Meter.meter_code == "CT-002").first()
        assert meter is not None

        a1 = Asset(
            id=str(uuid.uuid4()),
            code=f"TEST-A1-{uuid.uuid4().hex[:6].upper()}",
            name="Thiết bị A1",
            asset_type="WORKSHOP",
            lifecycle_status="ACTIVE",
            mobility_type="FIXED",
        )
        a2 = Asset(
            id=str(uuid.uuid4()),
            code=f"TEST-A2-{uuid.uuid4().hex[:6].upper()}",
            name="Thiết bị A2",
            asset_type="WORKSHOP",
            lifecycle_status="ACTIVE",
            mobility_type="FIXED",
        )
        db.add_all([a1, a2])
        db.commit()

        # Existing primary relation
        r1 = MeterAssetRelation(
            id=str(uuid.uuid4()),
            meter_id=meter.id,
            asset_id=a1.id,
            relation_type="INSTALLED_AT",
            is_primary=True,
            verification_status="VERIFIED",
        )
        # New candidate relation
        r2 = MeterAssetRelation(
            id=str(uuid.uuid4()),
            meter_id=meter.id,
            asset_id=a2.id,
            relation_type="INSTALLED_AT",
            is_primary=False,
            verification_status="UNVERIFIED",
            confidence="MEDIUM",
            source="DISCOVERY_PROPOSAL",
        )
        db.add_all([r1, r2])
        db.commit()
        r1_id, r2_id = r1.id, r2.id
    finally:
        db.close()

    # Verify r2 as primary
    res = client.post(
        f"/api/v1/admin/meter-asset-relations/{r2_id}/verify",
        json={
            "evidence_type": "ELECTRICAL_DIAGRAM",
            "evidence_reference": "SO-DO-DAU-NOI-A2",
            "is_primary": True,
            "notes": "Chuyển điểm lắp đặt chính xác sang xưởng A2",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    r2_data = res.json()
    assert r2_data["verification_status"] == "VERIFIED"
    assert r2_data["is_primary"] is True

    # Check r1 was auto-closed as primary
    db = SessionLocal()
    try:
        r1_refreshed = db.query(MeterAssetRelation).filter(MeterAssetRelation.id == r1_id).first()
        assert r1_refreshed.is_primary is False
        assert r1_refreshed.valid_to is not None
    finally:
        db.close()


def test_asset_position_verification_v16d(auth_headers):
    """Position placement verifies coordinates, detects presentation zone containment, and warns without blocking."""
    db = SessionLocal()
    try:
        asset = Asset(
            id=str(uuid.uuid4()),
            code=f"TEST-POS-{uuid.uuid4().hex[:6].upper()}",
            name="Thiết bị định vị",
            asset_type="WAREHOUSE",
            lifecycle_status="ACTIVE",
            mobility_type="FIXED",
            verification_status="UNVERIFIED",
        )
        db.add(asset)
        db.commit()
        asset_id = asset.id
    finally:
        db.close()

    # Place coordinate inside Cầu Cảng zone (e.g. x=0.3624, y=0.3837)
    res_in = client.post(
        f"/api/v1/admin/assets/{asset_id}/position",
        json={
            "map_x": 0.3624,
            "map_y": 0.3837,
            "evidence_type": "FIELD_INSPECTION",
            "evidence_reference": "Tọa độ đo đạc thực địa GPS",
            "notes": "Vị trí cột số 3 Cầu cảng",
        },
        headers=auth_headers,
    )
    assert res_in.status_code == 200
    data_in = res_in.json()
    assert data_in["map_x"] == pytest.approx(0.3624, abs=1e-4)
    assert data_in["map_y"] == pytest.approx(0.3837, abs=1e-4)
    assert data_in["position_verification_status"] == "VERIFIED"
    assert data_in["contained_in_zone"] is True
    assert data_in["presentation_zone_id"] is not None
    assert data_in["warning"] is None

    # Place coordinate in water / unassigned area (e.g. x=0.01, y=0.01) -> warns without blocking
    res_out = client.post(
        f"/api/v1/admin/assets/{asset_id}/position",
        json={
            "map_x": 0.01,
            "map_y": 0.01,
            "evidence_type": "FIELD_INSPECTION",
            "evidence_reference": "Vị trí phao phụ trợ",
        },
        headers=auth_headers,
    )
    assert res_out.status_code == 200
    data_out = res_out.json()
    assert data_out["contained_in_zone"] is False
    assert data_out["warning"] is not None
    assert "nằm ngoài tất cả 6 presentation zones" in data_out["warning"]


def test_meter_metadata_update_v16d(auth_headers):
    """Update meter technical attributes with validation."""
    db = SessionLocal()
    try:
        meter = db.query(Meter).filter(Meter.meter_code == "CT-003").first()
        assert meter is not None
        meter_id = meter.id
    finally:
        db.close()

    res = client.patch(
        f"/api/v1/admin/meters/{meter_id}/metadata",
        json={
            "reading_method": "OCR",
            "communication_protocol": "MODBUS_RTU",
            "utility_type": "ELECTRICITY",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    m_data = res.json()
    assert m_data["reading_method"] == "OCR"
    assert m_data["communication_protocol"] == "MODBUS_RTU"
    assert m_data["utility_type"] == "ELECTRICITY"


def test_topology_edge_verification_and_traversal_v16d(auth_headers):
    """Asset connection verification and verified-only graph traversal policy."""
    db = SessionLocal()
    try:
        p_asset = Asset(
            id=str(uuid.uuid4()),
            code=f"TR-ST-{uuid.uuid4().hex[:4].upper()}",
            name="Trạm Biến Áp Nguồn",
            asset_type="FACILITY",
            lifecycle_status="ACTIVE",
            mobility_type="FIXED",
            verification_status="VERIFIED",
        )
        c_asset = Asset(
            id=str(uuid.uuid4()),
            code=f"SUB-ST-{uuid.uuid4().hex[:4].upper()}",
            name="Tủ Phân Phối Cầu Tàu",
            asset_type="WORKSHOP",
            lifecycle_status="ACTIVE",
            mobility_type="FIXED",
            verification_status="VERIFIED",
        )
        db.add_all([p_asset, c_asset])
        db.commit()

        conn = AssetConnection(
            id=str(uuid.uuid4()),
            source_asset_id=p_asset.id,
            target_asset_id=c_asset.id,
            utility_type="ELECTRICITY",
            connection_type="SUPPLIES",
            verification_status="UNVERIFIED",
            confidence="HIGH",
            source="DISCOVERY_PROPOSAL",
        )
        db.add(conn)
        db.commit()
        p_id, c_id, conn_id = p_asset.id, c_asset.id, conn.id
    finally:
        db.close()

    # 1. Tracing with verified_only=True must NOT traverse unverified edge
    t_unverified = client.get(
        f"/api/v1/admin/assets/{p_id}/trace-topology?direction=DOWNSTREAM&verified_only=true",
        headers=auth_headers,
    )
    assert t_unverified.status_code == 200
    reached_ids = [n["id"] for n in t_unverified.json()["nodes"]]
    assert c_id not in reached_ids

    # 2. Verify connection with evidence
    v_res = client.post(
        f"/api/v1/admin/asset-connections/{conn_id}/verify",
        json={
            "evidence_type": "SINGLE_LINE_DIAGRAM",
            "evidence_reference": "SLD-2026-PORT-ELEC-01",
            "notes": "Bản vẽ hoàn công hệ thống cáp điện ngầm",
        },
        headers=auth_headers,
    )
    assert v_res.status_code == 200
    assert v_res.json()["verification_status"] == "VERIFIED"

    # 3. Tracing with verified_only=True now reaches downstream asset
    t_verified = client.get(
        f"/api/v1/admin/assets/{p_id}/trace-topology?direction=DOWNSTREAM&verified_only=true",
        headers=auth_headers,
    )
    assert t_verified.status_code == 200
    reached_ids_after = [n["id"] for n in t_verified.json()["nodes"]]
    assert c_id in reached_ids_after


def test_meter_review_matrix_and_summary_v16d(auth_headers):
    """Check verification summary overview and 12-meter review matrix."""
    # Summary
    s_res = client.get("/api/v1/admin/verification-summary", headers=auth_headers)
    assert s_res.status_code == 200
    s_data = s_res.json()
    assert "assetCandidates" in s_data
    assert "meterRelations" in s_data
    assert "spatialReviewMeters" in s_data
    assert len(s_data["spatialReviewMeters"]) == 5

    # Matrix
    m_res = client.get("/api/v1/admin/meter-review-matrix", headers=auth_headers)
    assert m_res.status_code == 200
    m_list = m_res.json()
    assert len(m_list) == 12

    matrix_dict = {item["meter_code"]: item for item in m_list}
    for code in ["CT-001", "CT-007", "CT-008", "CT-009", "CT-010"]:
        assert matrix_dict[code]["is_spatial_review_required"] is True, (
            f"Matrix must reflect SPATIAL REVIEW for {code}"
        )


def test_zero_foreign_key_violations_v16d():
    """PRAGMA foreign_key_check yields 0 violations."""
    db = SessionLocal()
    try:
        fk_violations = db.execute(text("PRAGMA foreign_key_check;")).fetchall()
        assert len(fk_violations) == 0, f"Foreign key violations detected: {fk_violations}"
    finally:
        db.close()
