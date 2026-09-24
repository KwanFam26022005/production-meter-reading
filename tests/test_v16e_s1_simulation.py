"""
Test Suite for V16E-S1: Simulated Operational Baseline & Scenario Isolation
"""

import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from backend.app.config import get_settings
from backend.app.db import migrate_db
from backend.app.models import (
    Asset,
    AssetConnection,
    MapVersion,
    Meter,
    MeterAssetRelation,
    MeterReading,
    OperationalZone,
    ReadingRound,
    User,
)
from backend.app.admin import get_admin_meters
from backend.app.asset_operations import get_asset_network, list_assets
from backend.app.map_config import get_active_map_config
from backend.app.map_operations import get_map_overview
from scripts.seed_tan_thuan_demo_v1 import seed_simulation


@pytest.fixture(autouse=True)
def ensure_simulation_db_env():
    os.environ["DATABASE_URL"] = "sqlite:///./data/app.db"
    get_settings.cache_clear()


@pytest.fixture
def db_session():
    os.environ["DATABASE_URL"] = "sqlite:///./data/app.db"
    get_settings.cache_clear()
    engine = create_engine("sqlite:///./data/app.db", connect_args={"check_same_thread": False})
    # This suite opens the shared simulation database directly instead of going
    # through the application lifespan. Apply the same idempotent SQLite schema
    # patch before ORM queries so existing rounds receive LEGACY_DYNAMIC mode.
    migrate_db(engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


def test_5zone_map_active_pres_gate_absent(db_session: Session):
    """Assert 5-zone simulation map is published & active, pres-gate is strictly absent."""
    cfg = get_active_map_config(db_session)
    assert cfg is not None
    assert cfg.map_version == "tan-thuan-sim-v1-5zone"
    assert cfg.status == "PUBLISHED"

    zone_ids = [z.zone_id for z in cfg.zones]
    assert len(zone_ids) == 5
    assert "pres-gate" not in zone_ids
    assert "pres-berth" in zone_ids
    assert "pres-container-west" in zone_ids
    assert "pres-container-center" in zone_ids
    assert "pres-cfs-east" in zone_ids
    assert "pres-technical" in zone_ids


def test_clean_asset_and_meter_baselines(db_session: Session):
    """Assert 32 active simulated assets and 12 active simulated meters."""
    sim_assets = (
        db_session.query(Asset)
        .filter(Asset.scenario_id == "tan-thuan-demo-v1")
        .all()
    )
    assert len(sim_assets) == 32
    for a in sim_assets:
        assert a.data_origin == "SIMULATED"
        assert a.verification_status == "SIMULATION_APPROVED"
        assert a.lifecycle_status == "ACTIVE"

    sim_meters = (
        db_session.query(Meter)
        .filter(Meter.scenario_id == "tan-thuan-demo-v1")
        .all()
    )
    assert len(sim_meters) == 12
    for m in sim_meters:
        assert m.data_origin == "SIMULATED"
        assert m.is_active is True
        assert m.lifecycle_status == "ACTIVE"
        assert m.route_status == "VALID"

    elec_meters = [m for m in sim_meters if m.utility_type == "ELECTRICITY"]
    water_meters = [m for m in sim_meters if m.utility_type == "WATER"]
    assert len(elec_meters) == 8
    assert len(water_meters) == 4


def test_legacy_meters_quarantined_and_retired(db_session: Session):
    """Assert legacy meters CT-001..CT-012 are retired and preserved."""
    legacy_meters = (
        db_session.query(Meter)
        .filter(Meter.meter_code.like("CT-%"))
        .all()
    )
    assert len(legacy_meters) == 12
    for m in legacy_meters:
        assert m.lifecycle_status == "RETIRED"
        assert m.data_origin == "LEGACY_SIMULATION"
        assert m.is_active is False
        assert m.scenario_id is None

    # Historical readings preserved
    legacy_ids = [m.id for m in legacy_meters]
    ct_readings = (
        db_session.query(MeterReading)
        .filter(MeterReading.meter_id.in_(legacy_ids))
        .count()
    )
    assert ct_readings >= 2841


def test_electricity_and_water_network_acyclic(db_session: Session):
    """Assert electricity graph (24 edges) and water graph (7 edges) have 0 cycles."""
    elec_net = get_asset_network(db_session, utility_type="ELECTRICITY", scenario_id="tan-thuan-demo-v1")
    assert len(elec_net.edges) == 24

    water_net = get_asset_network(db_session, utility_type="WATER", scenario_id="tan-thuan-demo-v1")
    assert len(water_net.edges) == 7

    # Cycle check for both
    for net in (elec_net, water_net):
        adj = {}
        for edge in net.edges:
            adj.setdefault(edge.source_asset_id, []).append(edge.target_asset_id)

        visited = set()
        rec_stack = set()

        def has_cycle(node):
            visited.add(node)
            rec_stack.add(node)
            for neighbor in adj.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            rec_stack.remove(node)
            return False

        has_any_cycle = False
        for node in adj:
            if node not in visited:
                if has_cycle(node):
                    has_any_cycle = True
                    break
        assert not has_any_cycle, "Cycle detected in utility graph!"


def test_deterministic_readings_and_active_round(db_session: Session):
    """Assert 4,032 hourly readings generated across 14 days and current round is 0/12."""
    sim_meters = (
        db_session.query(Meter)
        .filter(Meter.scenario_id == "tan-thuan-demo-v1")
        .all()
    )
    sim_ids = [m.id for m in sim_meters]

    readings_count = (
        db_session.query(MeterReading)
        .filter(MeterReading.meter_id.in_(sim_ids))
        .count()
    )
    assert readings_count == 4032

    # Map overview projection for the active operational round
    active_round_id = "af8b6a60-80d9-596b-8db0-9c83d372c4bd"
    overview = get_map_overview(db_session, date_str="2026-09-16", round_id=active_round_id)
    assert len(overview.meters) == 12
    # In active round at start of shift, 0 / 12 are confirmed
    assert overview.confirmed_count == 0


def test_scenario_isolation_in_apis(db_session: Session):
    """Assert that list_assets and get_map_overview isolate scenario data from legacy test data."""
    default_assets = list_assets(db_session)
    assert default_assets.total == 32
    assert len(default_assets.assets) == 32
    for a in default_assets.assets:
        assert a.scenario_id == "tan-thuan-demo-v1"
        assert a.data_origin == "SIMULATED"

    # Explicit legacy query returns the 364 quarantined assets
    legacy_assets = list_assets(db_session, data_origin="LEGACY_TEST_DATA", scenario_id=None, limit=500)
    assert legacy_assets.total == 364
    assert len(legacy_assets.assets) == 364


def test_seed_idempotency(db_session: Session):
    """Assert that re-running seed_simulation produces identical counts with zero duplicates."""
    seed_simulation("data/app.db")

    sim_assets = db_session.query(Asset).filter(Asset.scenario_id == "tan-thuan-demo-v1").count()
    assert sim_assets == 32

    sim_meters = db_session.query(Meter).filter(Meter.scenario_id == "tan-thuan-demo-v1").count()
    assert sim_meters == 12

    sim_conns = db_session.query(AssetConnection).filter(AssetConnection.scenario_id == "tan-thuan-demo-v1").count()
    assert sim_conns == 31

    sim_readings = db_session.query(MeterReading).filter(
        MeterReading.meter_id.in_(
            db_session.query(Meter.id).filter(Meter.scenario_id == "tan-thuan-demo-v1")
        )
    ).count()
    assert sim_readings == 4032


def test_12_meters_runtime_truth_contract(db_session: Session):
    """V16E-S1-R1: Assert 12 meters correctly resolve zone names and utility types."""
    expected_zones = {
        "SIM-EM-001": "pres-technical",
        "SIM-EM-002": "pres-berth",
        "SIM-EM-003": "pres-container-west",
        "SIM-EM-004": "pres-container-center",
        "SIM-EM-005": "pres-cfs-east",
        "SIM-EM-006": "pres-technical",
        "SIM-EM-007": "pres-container-west",
        "SIM-EM-008": "pres-container-center",
        "SIM-WM-001": "pres-technical",
        "SIM-WM-002": "pres-berth",
        "SIM-WM-003": "pres-cfs-east",
        "SIM-WM-004": "pres-technical",
    }

    overview = get_map_overview(db_session, date_str="2026-09-16")
    assert len(overview.meters) == 12

    for m in overview.meters:
        assert m.meter_code in expected_zones
        assert m.presentation_zone_id == expected_zones[m.meter_code]
        assert m.zone_name is not None
        assert len(m.zone_name) > 0

        if m.meter_code.startswith("SIM-EM-"):
            assert m.utility_type == "ELECTRICITY"
        elif m.meter_code.startswith("SIM-WM-"):
            assert m.utility_type == "WATER"


def test_admin_meters_utility_and_zone_contract(db_session: Session):
    """V16E-S1-R1: Assert get_admin_meters provides zone_name and utility_type."""
    res = get_admin_meters(db_session, scenario_id="tan-thuan-demo-v1")
    assert res.total == 12
    for m in res.meters:
        assert m.zone_name is not None
        assert m.utility_type in ("ELECTRICITY", "WATER")
        if m.meter_code.startswith("SIM-WM-"):
            assert m.utility_type == "WATER"
        else:
            assert m.utility_type == "ELECTRICITY"


def test_electricity_network_excludes_water_nodes(db_session: Session):
    """V16E-S1-R1: Electricity view has 24 edges and strictly no water-exclusive assets."""
    net = get_asset_network(db_session, utility_type="ELECTRICITY", scenario_id="tan-thuan-demo-v1")
    assert len(net.edges) == 24
    node_codes = {n.code for n in net.nodes}
    water_exclusive = {
        "SIM-CITY-WATER", "SIM-WIN-01", "SIM-WJ-01",
        "SIM-WP-B01", "SIM-WP-CFS-01", "SIM-WP-TECH-01", "SIM-FIRE-HDR-01"
    }
    for w in water_exclusive:
        assert w not in node_codes, f"Water node {w} found in electricity network!"


def test_water_network_excludes_electricity_nodes(db_session: Session):
    """V16E-S1-R1: Water view has 7 edges and strictly no electricity-exclusive assets."""
    net = get_asset_network(db_session, utility_type="WATER", scenario_id="tan-thuan-demo-v1")
    assert len(net.edges) == 7
    node_codes = {n.code for n in net.nodes}
    electricity_exclusive = {
        "SIM-EXT-GRID", "SIM-SS-01", "SIM-TR-01", "SIM-MDB-01",
        "SIM-CFS-MDB-01", "SIM-QC-01", "SIM-QC-02", "SIM-QC-03",
        "SIM-RTG-W01", "SIM-RTG-C01", "SIM-COMP-01"
    }
    for e in electricity_exclusive:
        assert e not in node_codes, f"Electricity node {e} found in water network!"


def test_fresh_seed_current_round_zero_of_twelve(db_session: Session):
    """V16E-S1-R2: Fresh seed operational round Ca 1 has 0/12 completed and 12/12 DUE."""
    overview = get_map_overview(db_session, date_str="2026-09-16")
    assert overview.selected_round_id == "af8b6a60-80d9-596b-8db0-9c83d372c4bd"
    assert overview.current_round_time == "06:00"
    assert overview.total_meters == 12
    assert overview.confirmed_count == 0
    assert overview.due_count == 12
    assert overview.completion_percent == 0.0
    for m in overview.meters:
        assert m.semantic_state == "DUE"
        assert m.latest_reading_value is None


def test_one_meter_completion_real_workflow(db_session: Session):
    """V16E-S1-R2: Submitting 1 meter reading progresses round from 0/12 to 1/12."""
    import uuid
    from datetime import datetime, timezone

    round_id = "af8b6a60-80d9-596b-8db0-9c83d372c4bd"
    meter = db_session.query(Meter).filter(Meter.meter_code == "SIM-EM-001").first()
    round_obj = db_session.query(ReadingRound).filter(ReadingRound.id == round_id).first()
    admin_user = db_session.query(User).filter(User.role == "ADMIN").first()
    user_id = admin_user.id if admin_user else "admin-test"

    test_reading = MeterReading(
        id=str(uuid.uuid4()),
        meter_id=meter.id,
        user_id=user_id,
        batch_id=round_obj.batch_id,
        reading_round_id=round_id,
        reading="207950.50",
        ocr_reading="207950.50",
        confirmation_source="MANUAL",
        status="CONFIRMED",
        meter_type=meter.meter_type,
        det_confidence=0.99,
        ocr_confidence=0.99,
        server_timestamp=datetime.now(timezone.utc),
    )
    db_session.add(test_reading)
    db_session.commit()

    try:
        overview = get_map_overview(db_session, date_str="2026-09-16")
        assert overview.confirmed_count == 1
        assert overview.due_count == 11
        assert overview.total_meters == 12

        em_001 = next(m for m in overview.meters if m.meter_code == "SIM-EM-001")
        assert em_001.semantic_state == "CONFIRMED"
        assert em_001.latest_reading_value == "207950.50"
    finally:
        db_session.delete(test_reading)
        db_session.commit()

    # Verify return to 0/12 after cleanup
    overview_clean = get_map_overview(db_session, date_str="2026-09-16")
    assert overview_clean.confirmed_count == 0
    assert overview_clean.due_count == 12
