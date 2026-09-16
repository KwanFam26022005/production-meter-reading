"""
Test Suite for V16E-S1: Simulated Operational Baseline & Scenario Isolation
"""

import pytest
from sqlalchemy.orm import Session

from backend.app.db import SessionLocal
from backend.app.models import (
    Asset,
    AssetConnection,
    MapVersion,
    Meter,
    MeterAssetRelation,
    MeterReading,
    OperationalZone,
)
from backend.app.asset_operations import get_asset_network, list_assets
from backend.app.map_config import get_active_map_config
from backend.app.map_operations import get_map_overview
from scripts.seed_tan_thuan_demo_v1 import seed_simulation


@pytest.fixture
def db_session():
    db = SessionLocal()
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
