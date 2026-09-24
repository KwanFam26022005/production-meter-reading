"""
Asset Domain Operations, Meter-Asset Relationships & Topology Management (Phase V16C).

Implements:
1. Asset CRUD with non-destructive lifecycle semantics and hierarchy cycle prevention.
2. Meter-Asset relationship management (INSTALLED_AT, MEASURES, active primary uniqueness, transfer, history).
3. Asset Connections management and cycle-safe utility topology tracing.
4. Comprehensive audit logging for all mutations.
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .admin import log_admin_action
from .config import settings
from .geometry_utils import is_point_in_polygon
from .models import (
    AdminAuditLog,
    Asset,
    AssetConnection,
    Meter,
    MeterAssetRelation,
    MeterReading,
    ReadingRound,
    OperationalZone,
    MapVersion,
    MapVersionZone,
    User,
    VerificationEvidence,
    get_utc_now,
)
from .schemas import (
    AssetAttachedMeterContext,
    AssetConnectionCreateRequest,
    AssetConnectionListResponse,
    AssetConnectionResponse,
    AssetCreateRequest,
    AssetListResponse,
    AssetNetworkResponse,
    AssetNetworkStats,
    AssetOperationalContextResponse,
    AssetRejectRequest,
    AssetRelocateRequest,
    AssetResponse,
    AssetRetireRequest,
    AssetSetParentRequest,
    AssetSummary,
    AssetUpdateRequest,
    AssetVerificationSummaryResponse,
    AssetVerifyPositionRequest,
    AssetVerifyRequest,
    CandidateImportRequest,
    CandidateImportResponse,
    ConnectionRejectRequest,
    ConnectionVerifyRequest,
    MeterAssetRelationCreateRequest,
    MeterAssetRelationListResponse,
    MeterAssetRelationResponse,
    MeterAssetRelationTransferRequest,
    MeterMetadataUpdateRequest,
    MeterReviewMatrixItem,
    RelationRejectRequest,
    RelationVerifyRequest,
    TopologyTraceResponse,
    VerificationEvidenceResponse,
)
from .topology_service import (
    check_hierarchy_cycle,
    get_connected,
    get_downstream,
    get_upstream,
)

VALID_ASSET_TYPES = {
    "SUBSTATION",
    "TRANSFORMER",
    "FEEDER",
    "SWITCHBOARD",
    "QUAY_CRANE",
    "RTG",
    "VEHICLE",
    "PUMP",
    "COMPRESSOR",
    "MACHINE",
    "FACILITY",
    "BUILDING",
    "WAREHOUSE",
    "WORKSHOP",
    "BERTH_INFRASTRUCTURE",
    "GATE_EQUIPMENT",
    "FIRE_PUMP_SYSTEM",
    "COMPRESSOR_SYSTEM",
    "WATER_POINT",
    "FIRE_WATER_POINT",
    "SHORE_POWER_POINT",
    "OFFICE",
    "OTHER",
}

VALID_MOBILITY_TYPES = {"FIXED", "MOBILE"}
VALID_POSITION_SOURCES = {"STATIC_MAP", "ASSIGNED", "LAST_KNOWN", "GPS", "UNKNOWN"}
VALID_LIFECYCLE_STATUSES = {"ACTIVE", "INACTIVE", "RETIRED"}
VALID_VERIFICATION_STATUSES = {"UNVERIFIED", "VERIFIED", "REJECTED", "SIMULATION_APPROVED"}

VALID_RELATION_TYPES = {"INSTALLED_AT", "MEASURES"}
VALID_UTILITY_TYPES = {"ELECTRICITY", "WATER", "OTHER"}
VALID_CONNECTION_TYPES = {"SUPPLIES", "CONNECTED_TO"}

VALID_EVIDENCE_TYPES = {
    "FIELD_INSPECTION",
    "PHYSICAL_INSPECTION",
    "MENTOR_CONFIRMATION",
    "PORT_DOCUMENT",
    "EQUIPMENT_NAMEPLATE",
    "METER_PHOTO",
    "ELECTRICAL_DRAWING",
    "ELECTRICAL_DIAGRAM",
    "WATER_DRAWING",
    "SINGLE_LINE_DIAGRAM",
    "SCADA_CONFIG",
    "OTHER",
}
VALID_READING_METHODS = {"MANUAL", "OCR", "PULSE", "MODBUS", "PLC", "SCADA", "UNKNOWN"}
VALID_COMMUNICATION_PROTOCOLS = {"NONE", "PULSE", "RS485", "MODBUS_RTU", "MODBUS_TCP", "PLC", "OTHER", "UNKNOWN"}
VALID_METER_UTILITY_TYPES = {"ELECTRICITY", "WATER", "OTHER", "UNKNOWN"}


def _serialize_evidence(ev: VerificationEvidence) -> VerificationEvidenceResponse:
    return VerificationEvidenceResponse(
        id=ev.id,
        entity_type=ev.entity_type,
        entity_id=ev.entity_id,
        evidence_type=ev.evidence_type,
        evidence_reference=ev.evidence_reference,
        notes=ev.notes,
        verified_by=ev.verified_by,
        verified_by_name=ev.verified_by_user.full_name if ev.verified_by_user else None,
        verified_at=ev.verified_at.isoformat() if ev.verified_at else "",
        created_at=ev.created_at.isoformat() if ev.created_at else "",
    )


def _serialize_asset(
    asset: Asset,
    db: Session,
    contained_in_zone: Optional[bool] = None,
    presentation_zone_id: Optional[str] = None,
    warning: Optional[str] = None,
) -> AssetResponse:
    parent_summary = None
    if asset.parent_asset:
        parent_summary = AssetSummary(
            id=asset.parent_asset.id,
            code=asset.parent_asset.code,
            name=asset.parent_asset.name,
            asset_type=asset.parent_asset.asset_type,
            lifecycle_status=asset.parent_asset.lifecycle_status,
            verification_status=asset.parent_asset.verification_status,
        )

    child_count = db.query(Asset).filter(Asset.parent_asset_id == asset.id).count()
    attached_meters_count = (
        db.query(MeterAssetRelation)
        .filter(MeterAssetRelation.asset_id == asset.id, MeterAssetRelation.valid_to.is_(None))
        .count()
    )

    return AssetResponse(
        id=asset.id,
        code=asset.code,
        name=asset.name,
        asset_type=asset.asset_type,
        parent_asset_id=asset.parent_asset_id,
        parent_asset=parent_summary,
        zone_id=asset.zone_id,
        zone_code=asset.zone.code if asset.zone else None,
        zone_name=asset.zone.name if asset.zone else None,
        mobility_type=asset.mobility_type,
        position_source=asset.position_source,
        map_x=asset.map_x,
        map_y=asset.map_y,
        lifecycle_status=asset.lifecycle_status,
        verification_status=asset.verification_status,
        position_verification_status=getattr(asset, "position_verification_status", "UNVERIFIED") or "UNVERIFIED",
        source=getattr(asset, "source", "MANUAL_ENTRY") or "MANUAL_ENTRY",
        contained_in_zone=contained_in_zone,
        presentation_zone_id=presentation_zone_id,
        warning=warning,
        metadata_json=asset.metadata_json,
        child_count=child_count,
        attached_meters_count=attached_meters_count,
        data_origin=getattr(asset, "data_origin", "SIMULATED"),
        scenario_id=getattr(asset, "scenario_id", None),
        created_at=asset.created_at.isoformat() if asset.created_at else "",
        updated_at=asset.updated_at.isoformat() if asset.updated_at else "",
        created_by=asset.created_by,
        updated_by=asset.updated_by,
    )


def _serialize_relation(rel: MeterAssetRelation) -> MeterAssetRelationResponse:
    return MeterAssetRelationResponse(
        id=rel.id,
        meter_id=rel.meter_id,
        meter_code=rel.meter.meter_code if rel.meter else "",
        meter_name=rel.meter.name if rel.meter else "",
        asset_id=rel.asset_id,
        asset_code=rel.asset.code if rel.asset else "",
        asset_name=rel.asset.name if rel.asset else "",
        relation_type=rel.relation_type,
        mount_point=rel.mount_point,
        is_primary=rel.is_primary,
        verification_status=rel.verification_status,
        confidence=getattr(rel, "confidence", "MEDIUM") or "MEDIUM",
        source=getattr(rel, "source", "MANUAL_ENTRY") or "MANUAL_ENTRY",
        notes=getattr(rel, "notes", None),
        data_origin=getattr(rel, "data_origin", "SIMULATED"),
        scenario_id=getattr(rel, "scenario_id", None),
        valid_from=rel.valid_from.isoformat() if rel.valid_from else "",
        valid_to=rel.valid_to.isoformat() if rel.valid_to else None,
        created_at=rel.created_at.isoformat() if rel.created_at else "",
        created_by=rel.created_by,
    )


def _serialize_connection(conn: AssetConnection) -> AssetConnectionResponse:
    return AssetConnectionResponse(
        id=conn.id,
        source_asset_id=conn.source_asset_id,
        source_asset_code=conn.source_asset.code if conn.source_asset else "",
        source_asset_name=conn.source_asset.name if conn.source_asset else "",
        target_asset_id=conn.target_asset_id,
        target_asset_code=conn.target_asset.code if conn.target_asset else "",
        target_asset_name=conn.target_asset.name if conn.target_asset else "",
        utility_type=conn.utility_type,
        connection_type=conn.connection_type,
        verification_status=conn.verification_status,
        confidence=getattr(conn, "confidence", "MEDIUM") or "MEDIUM",
        source=getattr(conn, "source", "MANUAL_ENTRY") or "MANUAL_ENTRY",
        data_origin=getattr(conn, "data_origin", "SIMULATED"),
        scenario_id=getattr(conn, "scenario_id", None),
        valid_from=conn.valid_from.isoformat() if conn.valid_from else "",
        valid_to=conn.valid_to.isoformat() if conn.valid_to else None,
        metadata_json=conn.metadata_json,
        created_at=conn.created_at.isoformat() if conn.created_at else "",
        created_by=conn.created_by,
    )


# ==============================================================================
# ASSET CRUD
# ==============================================================================

def list_assets(
    db: Session,
    asset_type: Optional[str] = None,
    zone_id: Optional[str] = None,
    lifecycle_status: Optional[str] = None,
    verification_status: Optional[str] = None,
    mobility_type: Optional[str] = None,
    search: Optional[str] = None,
    scenario_id: Optional[str] = None,
    data_origin: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> AssetListResponse:
    query = db.query(Asset)

    # Scoping: default to active scenario in simulation mode unless explicitly "ALL" or legacy origin
    if scenario_id is not None:
        if scenario_id.upper() == "ALL":
            target_scenario = None
        elif scenario_id.upper() in ("NONE", "NULL"):
            query = query.filter(Asset.scenario_id.is_(None))
            target_scenario = None
        else:
            target_scenario = scenario_id
    elif data_origin and data_origin.upper() in ("LEGACY_TEST_DATA", "LEGACY_SIMULATION", "ALL"):
        target_scenario = None
    elif settings.data_mode == "SIMULATION":
        target_scenario = settings.active_scenario
    else:
        target_scenario = None

    if target_scenario:
        query = query.filter(Asset.scenario_id == target_scenario)

    if data_origin and data_origin.upper() != "ALL":
        query = query.filter(Asset.data_origin == data_origin.strip())

    if asset_type:
        query = query.filter(Asset.asset_type == asset_type.strip().upper())
    if zone_id:
        query = query.filter(Asset.zone_id == zone_id.strip())
    if lifecycle_status:
        query = query.filter(Asset.lifecycle_status == lifecycle_status.strip().upper())
    if verification_status:
        vs = verification_status.strip().upper()
        if vs in ("VERIFIED", "APPROVED"):
            query = query.filter(Asset.verification_status.in_(["VERIFIED", "SIMULATION_APPROVED"]))
        else:
            query = query.filter(Asset.verification_status == vs)
    if mobility_type:
        query = query.filter(Asset.mobility_type == mobility_type.strip().upper())
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Asset.code.ilike(s)) | (Asset.name.ilike(s)))

    total = query.count()
    assets = query.order_by(Asset.code.asc()).offset(offset).limit(limit).all()

    return AssetListResponse(
        total=total,
        assets=[_serialize_asset(a, db) for a in assets],
    )


def get_asset_by_id(db: Session, asset_id: str) -> AssetResponse:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found",
        )
    return _serialize_asset(asset, db)


def create_asset(db: Session, actor: User, payload: AssetCreateRequest) -> AssetResponse:
    code = payload.code.strip()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset code is required",
        )

    # Check unique code
    existing = db.query(Asset).filter(Asset.code == code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Asset with code '{code}' already exists",
        )

    # Validate asset_type
    asset_type = payload.asset_type.strip().upper()
    if asset_type not in VALID_ASSET_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid asset_type '{asset_type}'. Valid types: {sorted(list(VALID_ASSET_TYPES))}",
        )

    # Validate zone if provided
    zone_id = payload.zone_id.strip() if payload.zone_id else None
    if zone_id:
        zone = db.query(OperationalZone).filter(OperationalZone.id == zone_id).first()
        if not zone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Operational zone '{zone_id}' not found",
            )

    # Validate coordinates
    map_x = payload.map_x
    map_y = payload.map_y
    if map_x is not None or map_y is not None:
        if map_x is None or map_y is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both map_x and map_y must be provided together",
            )
        if not (0.0 <= map_x <= 1.0 and 0.0 <= map_y <= 1.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Normalized coordinates map_x and map_y must be in range [0, 1]",
            )

    # Validate parent if provided
    parent_asset_id = payload.parent_asset_id.strip() if payload.parent_asset_id else None
    if parent_asset_id:
        parent = db.query(Asset).filter(Asset.id == parent_asset_id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parent asset with ID '{parent_asset_id}' not found",
            )

    mobility_type = (payload.mobility_type or "FIXED").strip().upper()
    if mobility_type not in VALID_MOBILITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mobility_type '{mobility_type}'",
        )

    pos_source = (payload.position_source or "UNKNOWN").strip().upper()
    if pos_source not in VALID_POSITION_SOURCES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid position_source '{pos_source}'",
        )

    verif_status = (payload.verification_status or "UNVERIFIED").strip().upper()
    if verif_status not in VALID_VERIFICATION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification_status '{verif_status}'",
        )

    new_asset = Asset(
        id=str(uuid.uuid4()),
        code=code,
        name=payload.name.strip(),
        asset_type=asset_type,
        parent_asset_id=parent_asset_id,
        zone_id=zone_id,
        mobility_type=mobility_type,
        position_source=pos_source,
        map_x=map_x,
        map_y=map_y,
        lifecycle_status="ACTIVE",
        verification_status=verif_status,
        data_origin=payload.data_origin or "FIELD_VERIFIED",
        scenario_id=payload.scenario_id,
        metadata_json=payload.metadata_json,
        created_by=actor.id if actor else None,
        updated_by=actor.id if actor else None,
    )
    db.add(new_asset)
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_CREATED",
        resource_type="ASSET",
        resource_id=new_asset.id,
        before_json=None,
        after_json={
            "id": new_asset.id,
            "code": new_asset.code,
            "name": new_asset.name,
            "asset_type": new_asset.asset_type,
            "parent_asset_id": new_asset.parent_asset_id,
            "zone_id": new_asset.zone_id,
            "map_x": new_asset.map_x,
            "map_y": new_asset.map_y,
            "lifecycle_status": new_asset.lifecycle_status,
            "verification_status": new_asset.verification_status,
        },
    )
    db.commit()
    db.refresh(new_asset)
    return _serialize_asset(new_asset, db)


def update_asset(
    db: Session,
    actor: User,
    asset_id: str,
    payload: AssetUpdateRequest,
) -> AssetResponse:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with ID '{asset_id}' not found",
        )

    before_state = {
        "id": asset.id,
        "code": asset.code,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "parent_asset_id": asset.parent_asset_id,
        "zone_id": asset.zone_id,
        "map_x": asset.map_x,
        "map_y": asset.map_y,
        "lifecycle_status": asset.lifecycle_status,
        "verification_status": asset.verification_status,
        "mobility_type": asset.mobility_type,
        "position_source": asset.position_source,
    }

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset name cannot be empty")
        asset.name = name

    if payload.asset_type is not None:
        at = payload.asset_type.strip().upper()
        if at not in VALID_ASSET_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid asset_type '{at}'")
        asset.asset_type = at

    parent_changed = False
    if payload.parent_asset_id is not None:
        proposed_parent = payload.parent_asset_id.strip() if payload.parent_asset_id else None
        if proposed_parent:
            if proposed_parent == asset.id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset cannot be its own parent")
            parent = db.query(Asset).filter(Asset.id == proposed_parent).first()
            if not parent:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Parent asset '{proposed_parent}' not found")
            if check_hierarchy_cycle(db, asset.id, proposed_parent):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hierarchy cycle detected")
        if asset.parent_asset_id != proposed_parent:
            asset.parent_asset_id = proposed_parent
            parent_changed = True

    if payload.zone_id is not None:
        zone_id = payload.zone_id.strip() if payload.zone_id else None
        if zone_id:
            zone = db.query(OperationalZone).filter(OperationalZone.id == zone_id).first()
            if not zone:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Zone '{zone_id}' not found")
        asset.zone_id = zone_id

    relocated = False
    if payload.map_x is not None or payload.map_y is not None:
        if payload.map_x is None or payload.map_y is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Both map_x and map_y must be provided")
        if not (0.0 <= payload.map_x <= 1.0 and 0.0 <= payload.map_y <= 1.0):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Normalized coordinates must be in [0, 1]")
        if asset.map_x != payload.map_x or asset.map_y != payload.map_y:
            asset.map_x = payload.map_x
            asset.map_y = payload.map_y
            relocated = True

    if payload.mobility_type is not None:
        mt = payload.mobility_type.strip().upper()
        if mt not in VALID_MOBILITY_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid mobility_type '{mt}'")
        asset.mobility_type = mt

    if payload.position_source is not None:
        ps = payload.position_source.strip().upper()
        if ps not in VALID_POSITION_SOURCES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid position_source '{ps}'")
        asset.position_source = ps

    if payload.lifecycle_status is not None:
        ls = payload.lifecycle_status.strip().upper()
        if ls not in VALID_LIFECYCLE_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid lifecycle_status '{ls}'")
        asset.lifecycle_status = ls

    if payload.verification_status is not None:
        vs = payload.verification_status.strip().upper()
        if vs not in VALID_VERIFICATION_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid verification_status '{vs}'")
        asset.verification_status = vs

    if payload.metadata_json is not None:
        asset.metadata_json = payload.metadata_json

    asset.updated_at = get_utc_now()
    asset.updated_by = actor.id if actor else None
    db.flush()

    after_state = {
        "id": asset.id,
        "code": asset.code,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "parent_asset_id": asset.parent_asset_id,
        "zone_id": asset.zone_id,
        "map_x": asset.map_x,
        "map_y": asset.map_y,
        "lifecycle_status": asset.lifecycle_status,
        "verification_status": asset.verification_status,
        "mobility_type": asset.mobility_type,
        "position_source": asset.position_source,
    }

    if parent_changed:
        log_admin_action(
            db,
            actor_user_id=actor.id if actor else None,
            action="ASSET_PARENT_CHANGED",
            resource_type="ASSET",
            resource_id=asset.id,
            before_json={"parent_asset_id": before_state["parent_asset_id"]},
            after_json={"parent_asset_id": after_state["parent_asset_id"]},
        )

    if relocated:
        log_admin_action(
            db,
            actor_user_id=actor.id if actor else None,
            action="ASSET_RELOCATED",
            resource_type="ASSET",
            resource_id=asset.id,
            before_json={"map_x": before_state["map_x"], "map_y": before_state["map_y"]},
            after_json={"map_x": after_state["map_x"], "map_y": after_state["map_y"]},
        )

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_UPDATED",
        resource_type="ASSET",
        resource_id=asset.id,
        before_json=before_state,
        after_json=after_state,
    )
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset, db)


def relocate_asset(
    db: Session,
    actor: User,
    asset_id: str,
    payload: AssetRelocateRequest,
) -> AssetResponse:
    if not (0.0 <= payload.map_x <= 1.0 and 0.0 <= payload.map_y <= 1.0):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coordinates must be normalized in [0, 1]")

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{asset_id}' not found")

    before_x, before_y = asset.map_x, asset.map_y
    asset.map_x = payload.map_x
    asset.map_y = payload.map_y
    if payload.position_source:
        ps = payload.position_source.strip().upper()
        if ps in VALID_POSITION_SOURCES:
            asset.position_source = ps
    asset.updated_at = get_utc_now()
    asset.updated_by = actor.id if actor else None
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_RELOCATED",
        resource_type="ASSET",
        resource_id=asset.id,
        before_json={"map_x": before_x, "map_y": before_y},
        after_json={"map_x": asset.map_x, "map_y": asset.map_y, "position_source": asset.position_source},
    )
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset, db)


def set_asset_parent(
    db: Session,
    actor: User,
    asset_id: str,
    payload: AssetSetParentRequest,
) -> AssetResponse:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{asset_id}' not found")

    proposed_parent = payload.parent_asset_id.strip() if payload.parent_asset_id else None
    if proposed_parent:
        if proposed_parent == asset.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset cannot be its own parent")
        parent = db.query(Asset).filter(Asset.id == proposed_parent).first()
        if not parent:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Parent asset '{proposed_parent}' not found")
        if check_hierarchy_cycle(db, asset.id, proposed_parent):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hierarchy cycle detected")

    before_parent = asset.parent_asset_id
    asset.parent_asset_id = proposed_parent
    asset.updated_at = get_utc_now()
    asset.updated_by = actor.id if actor else None
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_PARENT_CHANGED",
        resource_type="ASSET",
        resource_id=asset.id,
        before_json={"parent_asset_id": before_parent},
        after_json={"parent_asset_id": proposed_parent},
    )
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset, db)


def set_asset_lifecycle_state(
    db: Session,
    actor: User,
    asset_id: str,
    new_status: str,
    reason: Optional[str] = None,
) -> AssetResponse:
    target_status = new_status.strip().upper()
    if target_status not in VALID_LIFECYCLE_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid lifecycle status '{target_status}'")

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{asset_id}' not found")

    before_status = asset.lifecycle_status
    asset.lifecycle_status = target_status
    asset.updated_at = get_utc_now()
    asset.updated_by = actor.id if actor else None
    db.flush()

    action = "ASSET_UPDATED"
    if target_status == "INACTIVE":
        action = "ASSET_DEACTIVATED"
    elif target_status == "ACTIVE":
        action = "ASSET_REACTIVATED"
    elif target_status == "RETIRED":
        action = "ASSET_RETIRED"

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action=action,
        resource_type="ASSET",
        resource_id=asset.id,
        before_json={"lifecycle_status": before_status},
        after_json={"lifecycle_status": target_status, "reason": reason},
    )
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset, db)


# ==============================================================================
# METER-ASSET RELATIONSHIPS
# ==============================================================================

def create_meter_asset_relation(
    db: Session,
    actor: User,
    payload: MeterAssetRelationCreateRequest,
) -> MeterAssetRelationResponse:
    # 1. Meter must exist and NOT be retired
    meter = db.query(Meter).filter(Meter.id == payload.meter_id).first()
    if not meter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Meter '{payload.meter_id}' not found")
    if meter.lifecycle_status == "RETIRED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot attach relation to a RETIRED meter. Preserved history is read-only.",
        )

    # 2. Asset must exist and NOT be retired
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{payload.asset_id}' not found")
    if asset.lifecycle_status == "RETIRED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot attach relation to a RETIRED asset.",
        )

    # 3. Validate relation type
    rel_type = payload.relation_type.strip().upper()
    if rel_type not in VALID_RELATION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid relation_type '{rel_type}'. Valid: {sorted(list(VALID_RELATION_TYPES))}",
        )

    # 4. Active Primary Safety (Section 36):
    # If is_primary=True, ensure no existing active primary relation of same relation_type
    # If exists, close it (valid_to = now()) to preserve history
    now_utc = get_utc_now()
    if payload.is_primary:
        existing_primaries = (
            db.query(MeterAssetRelation)
            .filter(
                MeterAssetRelation.meter_id == meter.id,
                MeterAssetRelation.relation_type == rel_type,
                MeterAssetRelation.is_primary == True,
                MeterAssetRelation.valid_to.is_(None),
            )
            .all()
        )
        for ep in existing_primaries:
            ep.valid_to = now_utc
            log_admin_action(
                db,
                actor_user_id=actor.id if actor else None,
                action="METER_ASSET_RELATION_CLOSED",
                resource_type="METER_ASSET_RELATION",
                resource_id=ep.id,
                before_json={"valid_to": None, "reason": "superseded_by_new_primary"},
                after_json={"valid_to": now_utc.isoformat()},
            )

    verif_status = (payload.verification_status or "UNVERIFIED").strip().upper()
    if verif_status not in VALID_VERIFICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid verification_status '{verif_status}'")

    new_rel = MeterAssetRelation(
        id=str(uuid.uuid4()),
        meter_id=meter.id,
        asset_id=asset.id,
        relation_type=rel_type,
        mount_point=payload.mount_point.strip() if payload.mount_point else None,
        is_primary=payload.is_primary,
        verification_status=verif_status,
        data_origin="FIELD_VERIFIED",
        scenario_id=None,
        valid_from=now_utc,
        valid_to=None,
        created_at=now_utc,
        created_by=actor.id if actor else None,
    )
    db.add(new_rel)
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="METER_ASSET_RELATION_CREATED",
        resource_type="METER_ASSET_RELATION",
        resource_id=new_rel.id,
        before_json=None,
        after_json={
            "id": new_rel.id,
            "meter_id": new_rel.meter_id,
            "asset_id": new_rel.asset_id,
            "relation_type": new_rel.relation_type,
            "mount_point": new_rel.mount_point,
            "is_primary": new_rel.is_primary,
            "verification_status": new_rel.verification_status,
        },
    )
    db.commit()
    db.refresh(new_rel)
    return _serialize_relation(new_rel)


def list_meter_asset_relations(
    db: Session,
    meter_id: Optional[str] = None,
    asset_id: Optional[str] = None,
    relation_type: Optional[str] = None,
    active_only: bool = True,
    verification_status: Optional[str] = None,
) -> MeterAssetRelationListResponse:
    query = db.query(MeterAssetRelation)

    if meter_id:
        query = query.filter(MeterAssetRelation.meter_id == meter_id.strip())
    if asset_id:
        query = query.filter(MeterAssetRelation.asset_id == asset_id.strip())
    if relation_type:
        query = query.filter(MeterAssetRelation.relation_type == relation_type.strip().upper())
    if active_only:
        query = query.filter(MeterAssetRelation.valid_to.is_(None))
    if verification_status:
        vs = verification_status.strip().upper()
        if vs in ("VERIFIED", "APPROVED"):
            query = query.filter(MeterAssetRelation.verification_status.in_(["VERIFIED", "SIMULATION_APPROVED"]))
        else:
            query = query.filter(MeterAssetRelation.verification_status == vs)

    total = query.count()
    rels = query.order_by(MeterAssetRelation.created_at.desc()).all()

    return MeterAssetRelationListResponse(
        total=total,
        relations=[_serialize_relation(r) for r in rels],
    )


def close_meter_asset_relation(
    db: Session,
    actor: User,
    relation_id: str,
) -> MeterAssetRelationResponse:
    rel = db.query(MeterAssetRelation).filter(MeterAssetRelation.id == relation_id).first()
    if not rel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Relation '{relation_id}' not found")

    if rel.valid_to is not None:
        return _serialize_relation(rel)

    now_utc = get_utc_now()
    rel.valid_to = now_utc
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="METER_ASSET_RELATION_CLOSED",
        resource_type="METER_ASSET_RELATION",
        resource_id=rel.id,
        before_json={"valid_to": None},
        after_json={"valid_to": now_utc.isoformat()},
    )
    db.commit()
    db.refresh(rel)
    return _serialize_relation(rel)


def transfer_meter_asset_relation(
    db: Session,
    actor: User,
    relation_id: str,
    payload: MeterAssetRelationTransferRequest,
) -> MeterAssetRelationResponse:
    old_rel = db.query(MeterAssetRelation).filter(MeterAssetRelation.id == relation_id).first()
    if not old_rel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Relation '{relation_id}' not found")
    if old_rel.valid_to is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot transfer an already closed relation")

    # Target asset must exist and not be retired
    new_asset = db.query(Asset).filter(Asset.id == payload.new_asset_id).first()
    if not new_asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Target asset '{payload.new_asset_id}' not found")
    if new_asset.lifecycle_status == "RETIRED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot transfer relation to a RETIRED asset")

    # Meter must not be retired
    meter = db.query(Meter).filter(Meter.id == old_rel.meter_id).first()
    if not meter or meter.lifecycle_status == "RETIRED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot transfer relation for a RETIRED meter")

    now_utc = get_utc_now()
    # Close old relation
    old_rel.valid_to = now_utc

    # Create new relation
    new_rel = MeterAssetRelation(
        id=str(uuid.uuid4()),
        meter_id=old_rel.meter_id,
        asset_id=new_asset.id,
        relation_type=old_rel.relation_type,
        mount_point=payload.mount_point.strip() if payload.mount_point else old_rel.mount_point,
        is_primary=payload.is_primary,
        verification_status="UNVERIFIED",
        valid_from=now_utc,
        valid_to=None,
        created_at=now_utc,
        created_by=actor.id if actor else None,
    )
    db.add(new_rel)
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="METER_ASSET_TRANSFERRED",
        resource_type="METER_ASSET_RELATION",
        resource_id=new_rel.id,
        before_json={"old_relation_id": old_rel.id, "old_asset_id": old_rel.asset_id},
        after_json={"new_relation_id": new_rel.id, "new_asset_id": new_asset.id},
    )
    db.commit()
    db.refresh(new_rel)
    return _serialize_relation(new_rel)


def verify_meter_asset_relation(
    db: Session,
    actor: User,
    relation_id: str,
    new_status: str = "VERIFIED",
) -> MeterAssetRelationResponse:
    vs = new_status.strip().upper()
    if vs not in VALID_VERIFICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid verification status '{vs}'")

    rel = db.query(MeterAssetRelation).filter(MeterAssetRelation.id == relation_id).first()
    if not rel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Relation '{relation_id}' not found")

    before_status = rel.verification_status
    rel.verification_status = vs
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="METER_ASSET_RELATION_VERIFIED",
        resource_type="METER_ASSET_RELATION",
        resource_id=rel.id,
        before_json={"verification_status": before_status},
        after_json={"verification_status": vs},
    )
    db.commit()
    db.refresh(rel)
    return _serialize_relation(rel)


# ==============================================================================
# ASSET CONNECTIONS (TOPOLOGY)
# ==============================================================================

def create_asset_connection(
    db: Session,
    actor: User,
    payload: AssetConnectionCreateRequest,
) -> AssetConnectionResponse:
    if payload.source_asset_id == payload.target_asset_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source and target asset cannot be the same")

    src = db.query(Asset).filter(Asset.id == payload.source_asset_id).first()
    if not src:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Source asset '{payload.source_asset_id}' not found")

    tgt = db.query(Asset).filter(Asset.id == payload.target_asset_id).first()
    if not tgt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Target asset '{payload.target_asset_id}' not found")

    util_type = payload.utility_type.strip().upper()
    if util_type not in VALID_UTILITY_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid utility_type '{util_type}'")

    conn_type = (payload.connection_type or "SUPPLIES").strip().upper()
    if conn_type not in VALID_CONNECTION_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid connection_type '{conn_type}'")

    verif_status = (payload.verification_status or "UNVERIFIED").strip().upper()
    if verif_status not in VALID_VERIFICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid verification_status '{verif_status}'")

    now_utc = get_utc_now()
    new_conn = AssetConnection(
        id=str(uuid.uuid4()),
        source_asset_id=src.id,
        target_asset_id=tgt.id,
        utility_type=util_type,
        connection_type=conn_type,
        verification_status=verif_status,
        data_origin="FIELD_VERIFIED",
        scenario_id=None,
        valid_from=now_utc,
        valid_to=None,
        metadata_json=payload.metadata_json,
        created_at=now_utc,
        created_by=actor.id if actor else None,
    )
    db.add(new_conn)
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_CONNECTION_CREATED",
        resource_type="ASSET_CONNECTION",
        resource_id=new_conn.id,
        before_json=None,
        after_json={
            "id": new_conn.id,
            "source_asset_id": new_conn.source_asset_id,
            "target_asset_id": new_conn.target_asset_id,
            "utility_type": new_conn.utility_type,
            "connection_type": new_conn.connection_type,
            "verification_status": new_conn.verification_status,
        },
    )
    db.commit()
    db.refresh(new_conn)
    return _serialize_connection(new_conn)


def list_asset_connections(
    db: Session,
    source_asset_id: Optional[str] = None,
    target_asset_id: Optional[str] = None,
    utility_type: Optional[str] = None,
    connection_type: Optional[str] = None,
    active_only: bool = True,
    verification_status: Optional[str] = None,
    scenario_id: Optional[str] = None,
    data_origin: Optional[str] = None,
) -> AssetConnectionListResponse:
    query = db.query(AssetConnection)

    # Scoping: default to active scenario in simulation mode unless explicitly "ALL" or legacy origin
    if scenario_id is not None:
        if scenario_id.upper() == "ALL":
            target_scenario = None
        elif scenario_id.upper() in ("NONE", "NULL"):
            query = query.filter(AssetConnection.scenario_id.is_(None))
            target_scenario = None
        else:
            target_scenario = scenario_id
    elif data_origin and data_origin.upper() in ("LEGACY_TEST_DATA", "LEGACY_SIMULATION", "ALL"):
        target_scenario = None
    elif settings.data_mode == "SIMULATION":
        target_scenario = settings.active_scenario
    else:
        target_scenario = None

    if target_scenario:
        query = query.filter(AssetConnection.scenario_id == target_scenario)

    if data_origin and data_origin.upper() != "ALL":
        query = query.filter(AssetConnection.data_origin == data_origin.strip())

    if source_asset_id:
        query = query.filter(AssetConnection.source_asset_id == source_asset_id.strip())
    if target_asset_id:
        query = query.filter(AssetConnection.target_asset_id == target_asset_id.strip())
    if utility_type:
        query = query.filter(AssetConnection.utility_type == utility_type.strip().upper())
    if connection_type:
        query = query.filter(AssetConnection.connection_type == connection_type.strip().upper())
    if active_only:
        query = query.filter(AssetConnection.valid_to.is_(None))
    if verification_status:
        vs = verification_status.strip().upper()
        if vs in ("VERIFIED", "APPROVED"):
            query = query.filter(AssetConnection.verification_status.in_(["VERIFIED", "SIMULATION_APPROVED"]))
        else:
            query = query.filter(AssetConnection.verification_status == vs)

    total = query.count()
    conns = query.order_by(AssetConnection.created_at.desc()).all()

    return AssetConnectionListResponse(
        total=total,
        connections=[_serialize_connection(c) for c in conns],
    )


def close_asset_connection(
    db: Session,
    actor: User,
    connection_id: str,
) -> AssetConnectionResponse:
    conn = db.query(AssetConnection).filter(AssetConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Connection '{connection_id}' not found")

    if conn.valid_to is not None:
        return _serialize_connection(conn)

    now_utc = get_utc_now()
    conn.valid_to = now_utc
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_CONNECTION_CLOSED",
        resource_type="ASSET_CONNECTION",
        resource_id=conn.id,
        before_json={"valid_to": None},
        after_json={"valid_to": now_utc.isoformat()},
    )
    db.commit()
    db.refresh(conn)
    return _serialize_connection(conn)


def verify_asset_connection(
    db: Session,
    actor: User,
    connection_id: str,
    new_status: str = "VERIFIED",
) -> AssetConnectionResponse:
    vs = new_status.strip().upper()
    if vs not in VALID_VERIFICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid verification status '{vs}'")

    conn = db.query(AssetConnection).filter(AssetConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Connection '{connection_id}' not found")

    before_status = conn.verification_status
    conn.verification_status = vs
    db.flush()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_CONNECTION_VERIFIED",
        resource_type="ASSET_CONNECTION",
        resource_id=conn.id,
        before_json={"verification_status": before_status},
        after_json={"verification_status": vs},
    )
    db.commit()
    db.refresh(conn)
    return _serialize_connection(conn)


def trace_asset_topology(
    db: Session,
    asset_id: str,
    direction: str = "downstream",
    utility_type: Optional[str] = None,
    include_unverified: bool = False,
) -> TopologyTraceResponse:
    root = db.query(Asset).filter(Asset.id == asset_id).first()
    if not root:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{asset_id}' not found")

    dir_clean = direction.strip().lower()
    if dir_clean == "downstream":
        assets, conns = get_downstream(db, asset_id, utility_type, include_unverified)
    elif dir_clean == "upstream":
        assets, conns = get_upstream(db, asset_id, utility_type, include_unverified)
    elif dir_clean in ("connected", "both"):
        assets, conns = get_connected(db, asset_id, utility_type, include_unverified)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid direction '{direction}'. Valid: 'downstream', 'upstream', 'connected'",
        )

    # Include the root asset in nodes list
    all_nodes = [root] + [a for a in assets if a.id != root.id]

    return TopologyTraceResponse(
        root_asset_id=root.id,
        direction=dir_clean,
        utility_type=utility_type,
        include_unverified=include_unverified,
        nodes=[_serialize_asset(a, db) for a in all_nodes],
        edges=[_serialize_connection(c) for c in conns],
    )


# ==============================================================================
# V16D — CANDIDATE INGESTION, HUMAN VERIFICATION & DATA POPULATION
# ==============================================================================

def import_candidate_proposals(
    db: Session,
    actor: User,
    proposals_file: Optional[str] = None,
    relations_file: Optional[str] = None,
) -> CandidateImportResponse:
    """
    Imports discovery proposals into UNVERIFIED candidate assets and meter-asset relations.
    Guarantees idempotence: Repeated calls do not create duplicates.
    Does NOT invent coordinates, zones, or topology.
    Does NOT mark records as VERIFIED.
    """
    prop_path = Path(proposals_file) if proposals_file else Path("docs/domain/asset-discovery/ASSET_MIGRATION_PROPOSALS.v1.json")
    rel_path = Path(relations_file) if relations_file else Path("docs/domain/asset-discovery/METER_ASSET_RELATION_PROPOSALS.v1.json")

    if not prop_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate proposals file not found: {prop_path}",
        )

    with open(prop_path, "r", encoding="utf-8") as f:
        proposals_data = json.load(f)

    relations_data = []
    if rel_path.exists():
        with open(rel_path, "r", encoding="utf-8") as f:
            relations_data = json.load(f)

    imported_assets = 0
    updated_assets = 0
    imported_relations = 0
    updated_relations = 0

    now_utc = get_utc_now()

    # 1. Ingest Asset Candidates
    for p in proposals_data:
        code = p.get("proposedCode", "").strip()
        if not code:
            continue
        existing_asset = db.query(Asset).filter(Asset.code == code).first()
        raw_type = p.get("assetType", "OTHER").strip().upper()
        asset_type = raw_type if raw_type in VALID_ASSET_TYPES else "OTHER"
        mobility = p.get("mobilityType", "FIXED").strip().upper()
        if mobility not in ("FIXED", "MOBILE"):
            mobility = "FIXED"

        meta = {
            "evidenceSource": p.get("evidenceSource"),
            "notes": p.get("notes"),
            "confidence": p.get("confidence", "MEDIUM"),
        }

        if existing_asset:
            # Idempotent: Only update metadata and keep UNVERIFIED if candidate
            if existing_asset.source == "DISCOVERY_PROPOSAL" and existing_asset.verification_status == "UNVERIFIED":
                existing_asset.name = p.get("proposedName", existing_asset.name)
                existing_asset.asset_type = asset_type
                existing_asset.mobility_type = mobility
                existing_asset.metadata_json = json.dumps(meta, ensure_ascii=False)
                existing_asset.updated_at = now_utc
            updated_assets += 1
        else:
            new_asset = Asset(
                id=str(uuid.uuid4()),
                code=code,
                name=p.get("proposedName", f"Asset {code}"),
                asset_type=asset_type,
                zone_id=None,  # Section 9: Do not invent zone
                parent_asset_id=None,  # Section 9: Do not invent parent
                mobility_type=mobility,
                position_source="UNKNOWN",
                map_x=None,  # Section 10: Null coordinates expected
                map_y=None,
                lifecycle_status="ACTIVE",
                verification_status="UNVERIFIED",
                position_verification_status="UNVERIFIED",
                source="DISCOVERY_PROPOSAL",
                metadata_json=json.dumps(meta, ensure_ascii=False),
                created_at=now_utc,
                updated_at=now_utc,
                created_by=actor.id if actor else None,
            )
            db.add(new_asset)
            imported_assets += 1

    db.flush()

    # 2. Ingest Meter-Asset Relation Candidates
    for r in relations_data:
        m_code = r.get("meterCode", "").strip()
        a_code = r.get("proposedAssetCode", "").strip()
        rel_type = r.get("proposedRelationType", "MEASURES").strip().upper()
        if rel_type not in VALID_RELATION_TYPES:
            rel_type = "MEASURES"

        if not m_code or not a_code:
            continue

        # Match meter: Check exact code, then try MTR- <-> CT- mapping
        meter = db.query(Meter).filter(Meter.meter_code == m_code).first()
        if not meter:
            alt_code = m_code.replace("MTR-", "CT-") if "MTR-" in m_code else m_code.replace("CT-", "MTR-")
            meter = db.query(Meter).filter(Meter.meter_code == alt_code).first()

        asset = db.query(Asset).filter(Asset.code == a_code).first()

        if meter and asset:
            # Check if active relation exists
            existing_rel = (
                db.query(MeterAssetRelation)
                .filter(
                    MeterAssetRelation.meter_id == meter.id,
                    MeterAssetRelation.asset_id == asset.id,
                    MeterAssetRelation.relation_type == rel_type,
                    MeterAssetRelation.valid_to.is_(None),
                )
                .first()
            )

            rel_notes = {
                "evidenceSource": r.get("evidenceSource"),
                "questions": r.get("questions", []),
            }

            if existing_rel:
                if existing_rel.source == "DISCOVERY_PROPOSAL" and existing_rel.verification_status == "UNVERIFIED":
                    existing_rel.confidence = r.get("confidence", "MEDIUM")
                    existing_rel.notes = json.dumps(rel_notes, ensure_ascii=False)
                updated_relations += 1
            else:
                new_rel = MeterAssetRelation(
                    id=str(uuid.uuid4()),
                    meter_id=meter.id,
                    asset_id=asset.id,
                    relation_type=rel_type,
                    mount_point=None,
                    is_primary=False,  # Unverified candidate is not primary yet
                    verification_status="UNVERIFIED",
                    confidence=r.get("confidence", "MEDIUM"),
                    source="DISCOVERY_PROPOSAL",
                    notes=json.dumps(rel_notes, ensure_ascii=False),
                    valid_from=now_utc,
                    valid_to=None,
                    created_at=now_utc,
                    created_by=actor.id if actor else None,
                )
                db.add(new_rel)
                imported_relations += 1

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_CANDIDATE_IMPORTED",
        resource_type="ASSET",
        resource_id=None,
        before_json=None,
        after_json={
            "imported_assets": imported_assets,
            "updated_assets": updated_assets,
            "imported_relations": imported_relations,
            "updated_relations": updated_relations,
        },
    )
    db.commit()

    return CandidateImportResponse(
        imported_assets=imported_assets,
        updated_assets=updated_assets,
        imported_relations=imported_relations,
        updated_relations=updated_relations,
        total_candidates=len(proposals_data),
        message=f"Import completed: {imported_assets} assets added, {updated_assets} unchanged/updated, {imported_relations} relations added, {updated_relations} unchanged/updated.",
    )


def verify_asset(
    db: Session,
    actor: User,
    asset_id: str,
    payload: AssetVerifyRequest,
) -> AssetResponse:
    ev_type = payload.evidence_type.strip().upper()
    if ev_type not in VALID_EVIDENCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid evidence_type '{payload.evidence_type}'. Valid types: {sorted(list(VALID_EVIDENCE_TYPES))}",
        )
    ref = payload.evidence_reference.strip()
    if not ref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evidence_reference is required for human verification",
        )

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{asset_id}' not found",
        )

    # Minimum verification rules (Section 18)
    if not asset.code or not asset.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset must have code and name to be verified",
        )
    if asset.asset_type not in VALID_ASSET_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset has invalid type '{asset.asset_type}'",
        )

    now_utc = get_utc_now()
    before_status = asset.verification_status
    asset.verification_status = "VERIFIED"
    asset.updated_at = now_utc
    asset.updated_by = actor.id if actor else None

    # Record Evidence
    evidence = VerificationEvidence(
        id=str(uuid.uuid4()),
        entity_type="ASSET",
        entity_id=asset.id,
        evidence_type=ev_type,
        evidence_reference=ref,
        notes=payload.notes,
        verified_by=actor.id if actor else None,
        verified_at=now_utc,
        created_at=now_utc,
    )
    db.add(evidence)

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_VERIFIED",
        resource_type="ASSET",
        resource_id=asset.id,
        before_json={"verification_status": before_status},
        after_json={
            "verification_status": "VERIFIED",
            "evidence_type": ev_type,
            "evidence_reference": ref,
        },
    )
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset, db)


def reject_asset_verification(
    db: Session,
    actor: User,
    asset_id: str,
    payload: AssetRejectRequest,
) -> AssetResponse:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{asset_id}' not found",
        )

    now_utc = get_utc_now()
    before_status = asset.verification_status
    asset.verification_status = "REJECTED"
    asset.updated_at = now_utc
    asset.updated_by = actor.id if actor else None

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_VERIFICATION_REJECTED",
        resource_type="ASSET",
        resource_id=asset.id,
        before_json={"verification_status": before_status},
        after_json={
            "verification_status": "REJECTED",
            "reason": payload.reason,
            "notes": payload.notes,
        },
    )
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset, db)


def reopen_asset_review(
    db: Session,
    actor: User,
    asset_id: str,
) -> AssetResponse:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{asset_id}' not found",
        )

    now_utc = get_utc_now()
    before_status = asset.verification_status
    asset.verification_status = "UNVERIFIED"
    asset.updated_at = now_utc
    asset.updated_by = actor.id if actor else None

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_REOPENED_FOR_REVIEW",
        resource_type="ASSET",
        resource_id=asset.id,
        before_json={"verification_status": before_status},
        after_json={"verification_status": "UNVERIFIED"},
    )
    db.commit()
    db.refresh(asset)
    return _serialize_asset(asset, db)


def verify_asset_position(
    db: Session,
    actor: User,
    asset_id: str,
    payload: AssetVerifyPositionRequest,
) -> tuple[AssetResponse, Optional[str]]:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{asset_id}' not found",
        )

    ev_type = payload.evidence_type.strip().upper()
    if ev_type not in VALID_EVIDENCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid evidence_type '{payload.evidence_type}'",
        )
    ref = payload.evidence_reference.strip()
    if not ref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evidence_reference is required",
        )

    if not (0.0 <= payload.map_x <= 1.0 and 0.0 <= payload.map_y <= 1.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coordinates map_x and map_y must be within [0.0, 1.0]",
        )

    # Check presentation zone containment
    contained_zone_id = None
    contained_in_zone = False
    warning_msg = None

    active_mv = db.query(MapVersion).filter(MapVersion.status == "PUBLISHED").first()
    if active_mv and active_mv.zones:
        cw = active_mv.canonical_width or 1915
        ch = active_mv.canonical_height or 821
        px = payload.map_x * cw
        py = payload.map_y * ch
        pt = {"x": px, "y": py}
        for vz in active_mv.zones:
            try:
                poly = json.loads(vz.polygon_canonical) if isinstance(vz.polygon_canonical, str) else vz.polygon_canonical
                if is_point_in_polygon(pt, poly):
                    contained_zone_id = vz.zone_id
                    contained_in_zone = True
                    break
            except Exception:
                pass

    if not contained_in_zone:
        warning_msg = f"Cảnh báo: Tọa độ ({payload.map_x:.4f}, {payload.map_y:.4f}) nằm ngoài tất cả 6 presentation zones"
    elif asset.zone_id:
        zone = db.query(OperationalZone).filter(OperationalZone.id == asset.zone_id).first()
        if zone and zone.map_polygon:
            try:
                poly = json.loads(zone.map_polygon) if isinstance(zone.map_polygon, str) else zone.map_polygon
                pt = {"x": payload.map_x, "y": payload.map_y}
                if not is_point_in_polygon(pt, poly):
                    warning_msg = f"Cảnh báo: Tọa độ ({payload.map_x:.4f}, {payload.map_y:.4f}) nằm ngoài ranh giới vùng '{zone.name}'"
            except Exception:
                pass

    now_utc = get_utc_now()
    before_x, before_y = asset.map_x, asset.map_y
    asset.map_x = payload.map_x
    asset.map_y = payload.map_y
    asset.position_source = "STATIC_MAP"
    asset.position_verification_status = "VERIFIED"
    asset.updated_at = now_utc
    asset.updated_by = actor.id if actor else None

    # Record Evidence
    evidence = VerificationEvidence(
        id=str(uuid.uuid4()),
        entity_type="ASSET_POSITION",
        entity_id=asset.id,
        evidence_type=ev_type,
        evidence_reference=ref,
        notes=payload.notes,
        verified_by=actor.id if actor else None,
        verified_at=now_utc,
        created_at=now_utc,
    )
    db.add(evidence)

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_POSITION_VERIFIED",
        resource_type="ASSET",
        resource_id=asset.id,
        before_json={"map_x": before_x, "map_y": before_y},
        after_json={
            "map_x": payload.map_x,
            "map_y": payload.map_y,
            "position_verification_status": "VERIFIED",
            "warning": warning_msg,
        },
    )
    db.commit()
    db.refresh(asset)
    return _serialize_asset(
        asset,
        db,
        contained_in_zone=contained_in_zone,
        presentation_zone_id=contained_zone_id,
        warning=warning_msg,
    ), warning_msg


def verify_meter_asset_relation(
    db: Session,
    actor: User,
    relation_id: str,
    payload: RelationVerifyRequest,
) -> MeterAssetRelationResponse:
    ev_type = payload.evidence_type.strip().upper()
    if ev_type not in VALID_EVIDENCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid evidence_type '{payload.evidence_type}'. Valid: {sorted(list(VALID_EVIDENCE_TYPES))}",
        )
    ref = payload.evidence_reference.strip()
    if not ref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evidence_reference is required",
        )

    rel = db.query(MeterAssetRelation).filter(MeterAssetRelation.id == relation_id).first()
    if not rel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relation '{relation_id}' not found",
        )

    if rel.meter.lifecycle_status == "RETIRED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot verify relation on RETIRED meter '{rel.meter.meter_code}'",
        )

    now_utc = get_utc_now()

    # Active Primary Uniqueness enforcement (Section 48)
    if payload.is_primary:
        existing_primaries = (
            db.query(MeterAssetRelation)
            .filter(
                MeterAssetRelation.meter_id == rel.meter_id,
                MeterAssetRelation.relation_type == rel.relation_type,
                MeterAssetRelation.is_primary == True,
                MeterAssetRelation.valid_to.is_(None),
                MeterAssetRelation.id != rel.id,
            )
            .all()
        )
        for existing_primary in existing_primaries:
            existing_primary.valid_to = now_utc
            existing_primary.is_primary = False
            log_admin_action(
                db,
                actor_user_id=actor.id if actor else None,
                action="METER_ASSET_RELATION_TRANSFERRED",
                resource_type="METER_ASSET_RELATION",
                resource_id=existing_primary.id,
                before_json={"is_primary": True, "valid_to": None},
                after_json={"is_primary": False, "valid_to": now_utc.isoformat()},
            )

    before_status = rel.verification_status
    rel.verification_status = "VERIFIED"
    rel.is_primary = payload.is_primary
    if payload.mount_point is not None:
        rel.mount_point = payload.mount_point.strip() or None

    # Record Evidence
    evidence = VerificationEvidence(
        id=str(uuid.uuid4()),
        entity_type="METER_ASSET_RELATION",
        entity_id=rel.id,
        evidence_type=ev_type,
        evidence_reference=ref,
        notes=payload.notes,
        verified_by=actor.id if actor else None,
        verified_at=now_utc,
        created_at=now_utc,
    )
    db.add(evidence)

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="METER_ASSET_RELATION_VERIFIED",
        resource_type="METER_ASSET_RELATION",
        resource_id=rel.id,
        before_json={"verification_status": before_status},
        after_json={
            "verification_status": "VERIFIED",
            "is_primary": rel.is_primary,
            "evidence_type": ev_type,
            "evidence_reference": ref,
        },
    )
    db.commit()
    db.refresh(rel)
    return _serialize_relation(rel)


def reject_meter_asset_relation(
    db: Session,
    actor: User,
    relation_id: str,
    payload: RelationRejectRequest,
) -> MeterAssetRelationResponse:
    rel = db.query(MeterAssetRelation).filter(MeterAssetRelation.id == relation_id).first()
    if not rel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relation '{relation_id}' not found",
        )

    now_utc = get_utc_now()
    before_status = rel.verification_status
    rel.verification_status = "REJECTED"
    rel.valid_to = now_utc
    rel.is_primary = False

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="METER_ASSET_RELATION_REJECTED",
        resource_type="METER_ASSET_RELATION",
        resource_id=rel.id,
        before_json={"verification_status": before_status, "valid_to": None},
        after_json={
            "verification_status": "REJECTED",
            "valid_to": now_utc.isoformat(),
            "reason": payload.reason,
            "notes": payload.notes,
        },
    )
    db.commit()
    db.refresh(rel)
    return _serialize_relation(rel)


def verify_asset_connection_with_evidence(
    db: Session,
    actor: User,
    connection_id: str,
    payload: ConnectionVerifyRequest,
) -> AssetConnectionResponse:
    ev_type = payload.evidence_type.strip().upper()
    if ev_type not in VALID_EVIDENCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid evidence_type '{payload.evidence_type}'",
        )
    ref = payload.evidence_reference.strip()
    if not ref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evidence_reference is required",
        )

    conn = db.query(AssetConnection).filter(AssetConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection '{connection_id}' not found",
        )

    now_utc = get_utc_now()
    before_status = conn.verification_status
    conn.verification_status = "VERIFIED"

    evidence = VerificationEvidence(
        id=str(uuid.uuid4()),
        entity_type="ASSET_CONNECTION",
        entity_id=conn.id,
        evidence_type=ev_type,
        evidence_reference=ref,
        notes=payload.notes,
        verified_by=actor.id if actor else None,
        verified_at=now_utc,
        created_at=now_utc,
    )
    db.add(evidence)

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_CONNECTION_VERIFIED",
        resource_type="ASSET_CONNECTION",
        resource_id=conn.id,
        before_json={"verification_status": before_status},
        after_json={"verification_status": "VERIFIED", "evidence_reference": ref},
    )
    db.commit()
    db.refresh(conn)
    return _serialize_connection(conn)


def reject_asset_connection(
    db: Session,
    actor: User,
    connection_id: str,
    payload: ConnectionRejectRequest,
) -> AssetConnectionResponse:
    conn = db.query(AssetConnection).filter(AssetConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection '{connection_id}' not found",
        )

    now_utc = get_utc_now()
    before_status = conn.verification_status
    conn.verification_status = "REJECTED"
    conn.valid_to = now_utc

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="ASSET_CONNECTION_REJECTED",
        resource_type="ASSET_CONNECTION",
        resource_id=conn.id,
        before_json={"verification_status": before_status, "valid_to": None},
        after_json={"verification_status": "REJECTED", "valid_to": now_utc.isoformat(), "reason": payload.reason},
    )
    db.commit()
    db.refresh(conn)
    return _serialize_connection(conn)


def update_meter_metadata(
    db: Session,
    actor: User,
    meter_id: str,
    payload: MeterMetadataUpdateRequest,
) -> dict:
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meter '{meter_id}' not found",
        )

    before = {
        "reading_method": meter.reading_method,
        "communication_protocol": meter.communication_protocol,
        "utility_type": meter.utility_type,
        "measurement_unit": meter.measurement_unit,
        "register_semantics": meter.register_semantics,
    }

    if payload.reading_method is not None:
        rm = payload.reading_method.strip().upper()
        if rm not in VALID_READING_METHODS:
            raise HTTPException(status_code=400, detail=f"Invalid reading_method '{rm}'")
        meter.reading_method = rm

    if payload.communication_protocol is not None:
        cp = payload.communication_protocol.strip().upper()
        if cp not in VALID_COMMUNICATION_PROTOCOLS:
            raise HTTPException(status_code=400, detail=f"Invalid communication_protocol '{cp}'")
        meter.communication_protocol = cp

    if payload.utility_type is not None:
        ut = payload.utility_type.strip().upper()
        if ut not in VALID_METER_UTILITY_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid utility_type '{ut}'")
        meter.utility_type = ut

    if payload.measurement_unit is not None:
        meter.measurement_unit = payload.measurement_unit
    if payload.register_semantics is not None:
        meter.register_semantics = payload.register_semantics
    if (meter.utility_type == "WATER" and meter.measurement_unit == "KWH") or (
        meter.utility_type == "ELECTRICITY" and meter.measurement_unit == "M3"
    ):
        raise HTTPException(status_code=400, detail="Measurement unit conflicts with utility type")

    meter.updated_at = get_utc_now()

    log_admin_action(
        db,
        actor_user_id=actor.id if actor else None,
        action="METER_METADATA_VERIFIED",
        resource_type="METER",
        resource_id=meter.id,
        before_json=before,
        after_json={
            "reading_method": meter.reading_method,
            "communication_protocol": meter.communication_protocol,
            "utility_type": meter.utility_type,
            "measurement_unit": meter.measurement_unit,
            "register_semantics": meter.register_semantics,
        },
    )
    db.commit()
    db.refresh(meter)
    return {
        "id": meter.id,
        "meter_code": meter.meter_code,
        "reading_method": meter.reading_method,
        "communication_protocol": meter.communication_protocol,
        "utility_type": meter.utility_type,
        "measurement_unit": meter.measurement_unit,
        "register_semantics": meter.register_semantics,
    }


def get_verification_summary(db: Session, scenario_id: Optional[str] = None) -> AssetVerificationSummaryResponse:
    if scenario_id is not None:
        target_scenario = None if scenario_id.upper() in ("ALL", "NONE", "NULL") else scenario_id
    elif settings.data_mode == "SIMULATION":
        target_scenario = settings.active_scenario
    else:
        target_scenario = None

    asset_q = db.query(Asset)
    if target_scenario:
        asset_q = asset_q.filter(Asset.scenario_id == target_scenario)

    asset_candidates = asset_q.filter(Asset.source == "DISCOVERY_PROPOSAL").count()
    verified_assets = asset_q.filter(Asset.verification_status.in_(["VERIFIED", "SIMULATION_APPROVED"])).count()
    unverified_assets = asset_q.filter(Asset.verification_status == "UNVERIFIED").count()
    rejected_assets = asset_q.filter(Asset.verification_status == "REJECTED").count()

    rel_q = db.query(MeterAssetRelation).filter(MeterAssetRelation.valid_to.is_(None))
    if target_scenario:
        rel_q = rel_q.filter(MeterAssetRelation.scenario_id == target_scenario)

    meter_relations = rel_q.count()
    verified_relations = rel_q.filter(MeterAssetRelation.verification_status.in_(["VERIFIED", "SIMULATION_APPROVED"])).count()
    unverified_relations = rel_q.filter(MeterAssetRelation.verification_status == "UNVERIFIED").count()

    conn_q = db.query(AssetConnection).filter(AssetConnection.valid_to.is_(None))
    if target_scenario:
        conn_q = conn_q.filter(AssetConnection.scenario_id == target_scenario)

    connections = conn_q.count()
    verified_conns = conn_q.filter(AssetConnection.verification_status.in_(["VERIFIED", "SIMULATION_APPROVED"])).count()

    missing_pos = asset_q.filter(Asset.map_x.is_(None)).count()
    meter_q = db.query(Meter).filter(Meter.lifecycle_status == "ACTIVE")
    if target_scenario:
        meter_q = meter_q.filter(Meter.scenario_id == target_scenario)
    meters = meter_q.all()

    missing_inst = 0
    missing_meas = 0
    missing_rm = 0
    missing_ut = 0
    for m in meters:
        has_inst = any(r.relation_type == "INSTALLED_AT" and r.valid_to is None for r in m.asset_relations)
        has_meas = any(r.relation_type == "MEASURES" and r.valid_to is None for r in m.asset_relations)
        if not has_inst:
            missing_inst += 1
        if not has_meas:
            missing_meas += 1
        if not m.reading_method or m.reading_method == "UNKNOWN":
            missing_rm += 1
        if not m.utility_type or m.utility_type == "UNKNOWN":
            missing_ut += 1

    # Spatial review meters scoped to active scenario
    if target_scenario:
        spatial_review_candidates = [m.meter_code for m in meters if m.meter_code.endswith("-001") or m.meter_code.endswith("-007")]
    else:
        spatial_review_candidates = ["CT-001", "CT-007", "CT-008", "CT-009", "CT-010"]

    return AssetVerificationSummaryResponse(
        assetCandidates=asset_candidates,
        verifiedAssets=verified_assets,
        unverifiedAssets=unverified_assets,
        rejectedAssets=rejected_assets,
        meterRelations=meter_relations,
        verifiedMeterRelations=verified_relations,
        unverifiedMeterRelations=unverified_relations,
        topologyConnections=connections,
        verifiedTopologyConnections=verified_conns,
        spatialReviewMeters=spatial_review_candidates,
        missingInformationCounts={
            "missing_asset_position": missing_pos,
            "missing_installed_at": missing_inst,
            "missing_measures": missing_meas,
            "missing_reading_method": missing_rm,
            "missing_utility_type": missing_ut,
        },
    )


def get_meter_review_matrix(db: Session, scenario_id: Optional[str] = None) -> list[MeterReviewMatrixItem]:
    if scenario_id is not None:
        target_scenario = None if scenario_id.upper() in ("ALL", "NONE", "NULL") else scenario_id
    elif settings.data_mode == "SIMULATION":
        target_scenario = settings.active_scenario
    else:
        target_scenario = None

    meter_q = db.query(Meter)
    if target_scenario:
        meter_q = meter_q.filter(Meter.scenario_id == target_scenario)
    meters = meter_q.order_by(Meter.meter_code.asc()).all()

    matrix = []
    spatial_review_set = {"CT-001", "CT-007", "CT-008", "CT-009", "CT-010", "SIM-EM-001", "SIM-EM-007"}

    for m in meters:
        measures_rel = next((r for r in m.asset_relations if r.relation_type == "MEASURES" and r.valid_to is None), None)
        installed_rel = next((r for r in m.asset_relations if r.relation_type == "INSTALLED_AT" and r.valid_to is None), None)

        pos_known = False
        if measures_rel and measures_rel.asset and measures_rel.asset.map_x is not None:
            pos_known = True
        elif installed_rel and installed_rel.asset and installed_rel.asset.map_x is not None:
            pos_known = True

        missing = []
        if not measures_rel:
            missing.append("Nguồn cấp / tải đo (MEASURES)")
        if not installed_rel:
            missing.append("Vị trí tủ / nơi lắp đặt (INSTALLED_AT)")
        if not pos_known:
            missing.append("Tọa độ thiết bị")
        if not m.reading_method or m.reading_method == "UNKNOWN":
            missing.append("Phương thức đọc chỉ số")
        if not m.utility_type or m.utility_type == "UNKNOWN":
            missing.append("Loại môi chất / điện năng")

        item = MeterReviewMatrixItem(
            meter_code=m.meter_code,
            name=m.name,
            utility=m.utility_type or "UNKNOWN",
            proposed_measures=measures_rel.asset.name if (measures_rel and measures_rel.asset) else None,
            measures_confidence=measures_rel.confidence if measures_rel else None,
            measures_verification=measures_rel.verification_status if measures_rel else "CHƯA LIÊN KẾT",
            proposed_installed_at=installed_rel.asset.name if (installed_rel and installed_rel.asset) else None,
            installed_at_verification=installed_rel.verification_status if installed_rel else "CHƯA LIÊN KẾT",
            asset_position_known=pos_known,
            reading_method=m.reading_method or "UNKNOWN",
            missing_info=missing,
            is_spatial_review_required=m.meter_code in spatial_review_set,
        )
        matrix.append(item)

    return matrix


def get_entity_verification_evidences(
    db: Session,
    entity_type: str,
    entity_id: str,
) -> list[VerificationEvidenceResponse]:
    evs = (
        db.query(VerificationEvidence)
        .filter(
            VerificationEvidence.entity_type == entity_type.strip().upper(),
            VerificationEvidence.entity_id == entity_id.strip(),
        )
        .order_by(VerificationEvidence.verified_at.desc())
        .all()
    )
    return [_serialize_evidence(e) for e in evs]


# ==============================================================================
# V16E — ASSET-CENTRIC MAP & UTILITY NETWORK TOPOLOGY
# ==============================================================================

def get_asset_network(
    db: Session,
    utility_type: Optional[str] = None,
    focus_asset_id: Optional[str] = None,
    verified_only: bool = True,
    scenario_id: Optional[str] = None,
) -> AssetNetworkResponse:
    """
    Returns the network topology graph (nodes and edges) for the utility network view.
    Default: verified_only=True. Does NOT leak unverified edges unless explicitly requested.
    In simulation mode, accepts SIMULATION_APPROVED alongside VERIFIED.
    """
    clean_util = utility_type.strip().upper() if utility_type and utility_type.strip().upper() != "ALL" else None

    # Scoping: default to active scenario in simulation mode unless explicitly "ALL"
    target_scenario = scenario_id if scenario_id is not None else (settings.active_scenario if settings.data_mode == "SIMULATION" else None)
    if target_scenario and target_scenario.upper() == "ALL":
        target_scenario = None

    # Allowed verification statuses when verified_only is True
    approved_statuses = ["VERIFIED", "SIMULATION_APPROVED"]

    # Base connection query (active connections only)
    conn_query = db.query(AssetConnection).filter(AssetConnection.valid_to.is_(None))
    if target_scenario:
        conn_query = conn_query.filter(AssetConnection.scenario_id == target_scenario)
    if clean_util:
        conn_query = conn_query.filter(AssetConnection.utility_type == clean_util)
    if verified_only:
        conn_query = conn_query.filter(AssetConnection.verification_status.in_(approved_statuses))

    connections = conn_query.all()

    # Asset nodes query
    if focus_asset_id:
        focus_asset = db.query(Asset).filter(Asset.id == focus_asset_id).first()
        if not focus_asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Focus asset '{focus_asset_id}' not found")
        # Get connected subgraph
        connected_assets, _ = get_connected(
            db, focus_asset_id, utility_type=clean_util, include_unverified=not verified_only
        )
        node_map = {focus_asset.id: focus_asset}
        for a in connected_assets:
            if target_scenario and a.scenario_id != target_scenario:
                continue
            if not verified_only or a.verification_status in approved_statuses:
                node_map[a.id] = a
        nodes = list(node_map.values())
        # Filter connections to those between the subgraph nodes
        node_ids = set(node_map.keys())
        connections = [c for c in connections if c.source_asset_id in node_ids and c.target_asset_id in node_ids]
    else:
        asset_query = db.query(Asset).filter(Asset.lifecycle_status != "RETIRED")
        if target_scenario:
            asset_query = asset_query.filter(Asset.scenario_id == target_scenario)
        if verified_only:
            asset_query = asset_query.filter(Asset.verification_status.in_(approved_statuses))

        if clean_util:
            # P0: For a specific utility graph, nodes must be derived from the utility connections
            conn_node_ids = set()
            for c in connections:
                conn_node_ids.add(c.source_asset_id)
                conn_node_ids.add(c.target_asset_id)
            asset_query = asset_query.filter(Asset.id.in_(conn_node_ids))

        nodes = asset_query.all()

    # Calculate scoped stats
    base_asset_q = db.query(Asset).filter(Asset.lifecycle_status != "RETIRED")
    base_conn_q = db.query(AssetConnection).filter(AssetConnection.valid_to.is_(None))
    if target_scenario:
        base_asset_q = base_asset_q.filter(Asset.scenario_id == target_scenario)
        base_conn_q = base_conn_q.filter(AssetConnection.scenario_id == target_scenario)

    total_nodes = base_asset_q.count()
    total_edges = base_conn_q.count()
    verified_nodes = (
        base_asset_q.filter(Asset.verification_status.in_(approved_statuses)).count()
    )
    verified_edges = (
        base_conn_q.filter(AssetConnection.verification_status.in_(approved_statuses)).count()
    )

    stats = AssetNetworkStats(
        total_nodes=total_nodes,
        total_edges=total_edges,
        verified_nodes=verified_nodes,
        verified_edges=verified_edges,
        unverified_nodes=total_nodes - verified_nodes,
        unverified_edges=total_edges - verified_edges,
    )

    return AssetNetworkResponse(
        utility_type=clean_util,
        focus_asset_id=focus_asset_id,
        verified_only=verified_only,
        nodes=[_serialize_asset(a, db) for a in nodes],
        edges=[_serialize_connection(c) for c in connections],
        stats=stats,
    )


def get_asset_operational_context(db: Session, asset_id: str) -> AssetOperationalContextResponse:
    """
    Returns full operational context for an asset:
    - Base asset metadata
    - Attached meters (both INSTALLED_AT and MEASURES) with latest readings
    - Upstream / downstream topology connections
    - Spatial position verification status
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{asset_id}' not found")

    # 1. Attached meters
    relations = (
        db.query(MeterAssetRelation)
        .filter(MeterAssetRelation.asset_id == asset.id, MeterAssetRelation.valid_to.is_(None))
        .all()
    )

    attached_meters: list[AssetAttachedMeterContext] = []
    for rel in relations:
        m = rel.meter
        if not m:
            continue
        # Fetch latest reading
        latest_reading = (
            db.query(MeterReading)
            .join(ReadingRound, MeterReading.reading_round_id == ReadingRound.id)
            .filter(MeterReading.meter_id == m.id)
            .order_by(ReadingRound.scheduled_at.desc(), MeterReading.server_timestamp.desc(), MeterReading.id.desc())
            .first()
        )
        attached_meters.append(
            AssetAttachedMeterContext(
                relation_id=rel.id,
                relation_type=rel.relation_type,
                is_primary=rel.is_primary,
                verification_status=rel.verification_status,
                meter_id=m.id,
                meter_code=m.meter_code,
                meter_name=m.name,
                meter_type=m.meter_type,
                utility_type=m.utility_type,
                lifecycle_status=m.lifecycle_status,
                latest_reading_value=latest_reading.reading if latest_reading else None,
                latest_reading_status=latest_reading.status if latest_reading else None,
                latest_reading_time=latest_reading.server_timestamp.isoformat() if latest_reading else None,
            )
        )

    # 2. Topology connections
    upstream_conns = (
        db.query(AssetConnection)
        .filter(AssetConnection.target_asset_id == asset.id, AssetConnection.valid_to.is_(None))
        .all()
    )
    downstream_conns = (
        db.query(AssetConnection)
        .filter(AssetConnection.source_asset_id == asset.id, AssetConnection.valid_to.is_(None))
        .all()
    )

    # 3. Spatial status
    if asset.map_x is None or asset.map_y is None:
        spatial_status = "MISSING_COORDINATES"
    else:
        spatial_status = asset.position_verification_status or "VERIFIED"

    zone_pres_id = None
    zone_pres_name = None
    if asset.zone:
        zone_pres_id = asset.zone.presentation_zone_id or asset.zone.zone_id or asset.zone.id
        zone_pres_name = asset.zone.name

    return AssetOperationalContextResponse(
        asset=_serialize_asset(asset, db),
        meters=attached_meters,
        upstream_connections=[_serialize_connection(c) for c in upstream_conns],
        downstream_connections=[_serialize_connection(c) for c in downstream_conns],
        presentation_zone_id=zone_pres_id,
        presentation_zone_name=zone_pres_name,
        spatial_status=spatial_status,
    )
