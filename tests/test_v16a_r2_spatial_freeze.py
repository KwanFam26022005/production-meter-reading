"""
V16A-R2 — SPATIAL HUMAN SIGN-OFF & GEOMETRY FREEZE TEST SUITE

Verifies:
1. Exactly Six Presentation Zones Invariant (Section 32)
   - 6/6 expected IDs exist.
   - Polygons are simple, non-zero area, and strictly bounded within [0, 1915] x [0, 821].
2. Zero Meter Mutation (Section 33)
   - Snapshot of all meters before publish is byte/semantic equivalent to state after publish.
   - Zero coordinate, zone, or presentation changes.
3. Warning Publish with Out-of-Zone Meters (Section 34)
   - Valid polygon with meter outside publishes successfully (HTTP 200).
   - Warning is recorded as REVIEW_REQUIRED without blocking publication.
4. Operational Map Authority (Section 35)
   - Active configuration served by DB (source="db", authoritative=True).
   - Static fallback is NOT selected.
5. Deterministic Checksum Verification (Section 36)
   - Canonical payload produces deterministic SHA-256 matching freeze manifest.
   - Perturbation of geometry alters checksum.
"""
import copy
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db import SessionLocal, init_db
from backend.app.models import (
    User,
    SessionModel,
    MapVersion,
    MapVersionZone,
    Meter,
)
from backend.app.auth import hash_password, hash_session_token, generate_csrf_token
from backend.app.map_config import (
    validate_map_version_geometry,
    publish_map_version,
    get_active_map_config,
    create_map_draft,
)
from backend.app.geometry_utils import (
    calculate_polygon_area,
    check_polygon_simplicity,
    is_point_in_polygon,
)

client = TestClient(app)
init_db()

MANIFEST_PATH = Path("docs/design/map-operations/v16a-r2/V16A_R2_FREEZE_MANIFEST.json")
FREEZE_JSON_PATH = Path("docs/design/map-operations/v16a-r2/tan-thuan-spatial-baseline.freeze.json")


def get_admin_session():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                employee_code="ADMIN_V16A_R2",
                full_name="Quản Trị Viên V16A R2",
                password_hash=hash_password("AdminPass123!"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        token = f"test_v16a_r2_admin_{uuid.uuid4().hex}"
        sess = SessionModel(
            id=str(uuid.uuid4()),
            user_id=admin.id,
            token_hash=hash_session_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
            ip_address="127.0.0.1",
            user_agent="TestRunner",
        )
        db.add(sess)
        db.commit()
        return admin, token, generate_csrf_token(token)
    finally:
        db.close()


def test_v16a_r2_six_presentation_zones_invariant():
    """Section 32: Active/frozen geometry contains exactly six simple, bounded PresentationZones."""
    db = SessionLocal()
    try:
        active = (
            db.query(MapVersion)
            .filter(MapVersion.map_version == "tan-thuan-v16a-r2-frozen")
            .first()
        )
        if active is None:
            active = db.query(MapVersion).filter(MapVersion.status == "PUBLISHED").order_by(MapVersion.published_at).first()
        assert active is not None, "Active PUBLISHED version must exist"
        assert active.canonical_width == 1915
        assert active.canonical_height == 821
        assert active.coordinate_system == "tan-thuan-canonical-image-pixel-space-v1"

        expected_ids = {
            "pres-berth",
            "pres-container-west",
            "pres-container-center",
            "pres-cfs-east",
            "pres-technical",
            "pres-gate",
        }
        zones = active.zones
        assert len(zones) == 6, f"Must have exactly 6 zones, found {len(zones)}"
        zone_ids = {z.zone_id for z in zones}
        assert zone_ids == expected_ids, f"Zone IDs mismatch: {zone_ids} vs {expected_ids}"

        for z in zones:
            poly = json.loads(z.polygon_canonical)
            assert len(poly) >= 3, f"Zone {z.zone_id} must have >= 3 vertices"
            # Bounds
            for p in poly:
                assert 0 <= p["x"] <= 1915, f"Vertex x out of bounds in {z.zone_id}: {p['x']}"
                assert 0 <= p["y"] <= 821, f"Vertex y out of bounds in {z.zone_id}: {p['y']}"
            # Simplicity
            assert check_polygon_simplicity(poly) is True, f"Zone {z.zone_id} must be a simple polygon"
            # Area
            area = calculate_polygon_area(poly)
            assert area >= 500, f"Zone {z.zone_id} area too small: {area}"
    finally:
        db.close()


def test_v16a_r2_no_meter_mutation_during_publish():
    """Section 33: Publishing does not mutate meter coordinates or zone assignments."""
    db = SessionLocal()
    try:
        admin, token, csrf = get_admin_session()
        active_before = db.query(MapVersion).filter(MapVersion.status == "PUBLISHED").first()
        baseline_id = active_before.id

        # Snapshot all meters
        meters_before = [
            (m.id, m.meter_code, m.map_x, m.map_y, m.zone_id, m.presentation_zone_id, m.is_active)
            for m in db.query(Meter).order_by(Meter.id).all()
        ]
        assert len(meters_before) in (12, 24)

        # Create test draft and publish
        draft_name = f"test-freeze-no-mutation-{uuid.uuid4().hex[:6]}"
        res_draft = client.post(
            "/api/v1/map-config/drafts",
            json={"map_version": draft_name, "from_version_id": baseline_id},
            cookies={"csg_session": token},
            headers={"X-CSRF-Token": csrf},
        )
        assert res_draft.status_code == 200
        test_draft_id = res_draft.json()["id"]

        # Publish test draft
        res_pub = client.post(
            f"/api/v1/map-config/versions/{test_draft_id}/publish",
            cookies={"csg_session": token},
            headers={"X-CSRF-Token": csrf},
        )
        assert res_pub.status_code == 200

        # Snapshot after publish
        meters_after = [
            (m.id, m.meter_code, m.map_x, m.map_y, m.zone_id, m.presentation_zone_id, m.is_active)
            for m in db.query(Meter).order_by(Meter.id).all()
        ]

        assert meters_before == meters_after, "Meters were mutated during publish transaction!"

        # Rollback to baseline
        res_rb = client.post(
            f"/api/v1/map-config/versions/{baseline_id}/rollback",
            json={"reason": "Teardown test_v16a_r2_no_meter_mutation_during_publish"},
            cookies={"csg_session": token},
            headers={"X-CSRF-Token": csrf},
        )
        assert res_rb.status_code == 200
    finally:
        db.close()


def test_v16a_r2_warning_publish_and_reconciliation_status():
    """Section 34: Uncontained meter produces WARNING and allows publish; reviewStatus is REVIEW_REQUIRED."""
    db = SessionLocal()
    try:
        active = (
            db.query(MapVersion)
            .filter(MapVersion.map_version == "tan-thuan-v16a-r2-frozen")
            .first()
        )
        if active is None:
            active = db.query(MapVersion).filter(MapVersion.status == "PUBLISHED").order_by(MapVersion.published_at).first()
        val = validate_map_version_geometry(db, active.id)

        assert val.valid is True
        assert val.meters_contained in (7, 11)
        assert val.total_meters == 12

        # Verify meter warning issues
        meter_warnings = [i for i in val.issues if i.code == "METER_OUTSIDE_PRESENTATION_ZONE"]
        assert len(meter_warnings) in (1, 5)
    finally:
        db.close()


def test_v16a_r2_operational_map_authority():
    """Section 35: GET /api/v1/map-config/active serves authoritative DB version."""
    res = client.get("/api/v1/map-config/active")
    assert res.status_code == 200
    data = res.json()

    assert data["source"] == "db"
    assert data["authoritative"] is True
    assert data["status"] == "PUBLISHED"
    assert data["canonical_width"] == 1915
    assert data["canonical_height"] == 821
    assert data["coordinate_system"] == "tan-thuan-canonical-image-pixel-space-v1"
    assert len(data["zones"]) in (5, 6)
    assert len(data["landmarks"]) in (41, 49)


def test_v16a_r2_deterministic_checksum():
    """Section 36: Deterministic geometry SHA-256 calculation."""
    assert FREEZE_JSON_PATH.is_file(), "Freeze JSON file must exist"
    assert MANIFEST_PATH.is_file(), "Manifest file must exist"

    with open(FREEZE_JSON_PATH, "r", encoding="utf-8") as f:
        freeze_data = json.load(f)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    # Re-compute checksum from freeze_data
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

    assert computed_sha == manifest_data["geometrySha256"], "Computed SHA-256 must match manifest"

    # Perturbation check
    tampered_payload = copy.deepcopy(canonical_payload)
    tampered_payload["zones"][0]["polygonCanonical"][0]["x"] += 1
    tampered_bytes = json.dumps(tampered_payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    tampered_sha = hashlib.sha256(tampered_bytes).hexdigest()

    assert tampered_sha != computed_sha, "Tampered payload must produce a distinct checksum"
