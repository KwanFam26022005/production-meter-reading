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
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .admin import log_admin_action
from .models import (
    AdminAuditLog,
    Asset,
    AssetConnection,
    Meter,
    MeterAssetRelation,
    OperationalZone,
    User,
    get_utc_now,
)
from .schemas import (
    AssetConnectionCreateRequest,
    AssetConnectionListResponse,
    AssetConnectionResponse,
    AssetCreateRequest,
    AssetListResponse,
    AssetRelocateRequest,
    AssetResponse,
    AssetRetireRequest,
    AssetSetParentRequest,
    AssetSummary,
    AssetUpdateRequest,
    MeterAssetRelationCreateRequest,
    MeterAssetRelationListResponse,
    MeterAssetRelationResponse,
    MeterAssetRelationTransferRequest,
    TopologyTraceResponse,
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
    "WAREHOUSE",
    "WORKSHOP",
    "OFFICE",
    "WATER_POINT",
    "FIRE_WATER_POINT",
    "SHORE_POWER_POINT",
    "OTHER",
}

VALID_MOBILITY_TYPES = {"FIXED", "MOBILE"}
VALID_POSITION_SOURCES = {"STATIC_MAP", "ASSIGNED", "LAST_KNOWN", "GPS", "UNKNOWN"}
VALID_LIFECYCLE_STATUSES = {"ACTIVE", "INACTIVE", "RETIRED"}
VALID_VERIFICATION_STATUSES = {"UNVERIFIED", "VERIFIED", "REJECTED"}

VALID_RELATION_TYPES = {"INSTALLED_AT", "MEASURES"}
VALID_UTILITY_TYPES = {"ELECTRICITY", "WATER", "OTHER"}
VALID_CONNECTION_TYPES = {"SUPPLIES", "CONNECTED_TO"}


def _serialize_asset(asset: Asset, db: Session) -> AssetResponse:
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
        metadata_json=asset.metadata_json,
        child_count=child_count,
        attached_meters_count=attached_meters_count,
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
    limit: int = 100,
    offset: int = 0,
) -> AssetListResponse:
    query = db.query(Asset)

    if asset_type:
        query = query.filter(Asset.asset_type == asset_type.strip().upper())
    if zone_id:
        query = query.filter(Asset.zone_id == zone_id.strip())
    if lifecycle_status:
        query = query.filter(Asset.lifecycle_status == lifecycle_status.strip().upper())
    if verification_status:
        query = query.filter(Asset.verification_status == verification_status.strip().upper())
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
        query = query.filter(MeterAssetRelation.verification_status == verification_status.strip().upper())

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
) -> AssetConnectionListResponse:
    query = db.query(AssetConnection)

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
        query = query.filter(AssetConnection.verification_status == verification_status.strip().upper())

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
