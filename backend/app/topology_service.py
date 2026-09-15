"""
Topology and Hierarchy Domain Services (Phase V16C).

Implements:
1. Arbitrary-depth hierarchy cycle prevention (containment hierarchy).
2. Pure domain topology traversal (downstream, upstream, connected) with visited-node loop protection.
3. Strict verified-only default filtering for operational graph queries.
"""

from collections import deque
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from .models import Asset, AssetConnection


def check_hierarchy_cycle(db: Session, asset_id: str, proposed_parent_id: Optional[str]) -> bool:
    """
    Returns True if setting parent of asset_id to proposed_parent_id would create a cycle.
    Also returns True if proposed_parent_id == asset_id (self-parenting).
    """
    if not proposed_parent_id:
        return False
    if proposed_parent_id == asset_id:
        return True

    visited = set()
    curr_id = proposed_parent_id

    while curr_id:
        if curr_id == asset_id:
            return True
        if curr_id in visited:
            # Detected an existing loop in ancestors
            return True
        visited.add(curr_id)

        parent_row = db.query(Asset.parent_asset_id).filter(Asset.id == curr_id).first()
        if not parent_row:
            break
        curr_id = parent_row[0]

    return False


def get_downstream(
    db: Session,
    asset_id: str,
    utility_type: Optional[str] = None,
    include_unverified: bool = False,
) -> tuple[list[Asset], list[AssetConnection]]:
    """
    Trace downstream utility flow (SUPPLIES from source to target).
    Cycle-safe BFS traversal. Default verified active connections only.
    """
    visited_assets = {asset_id}
    visited_connections = set()
    result_connections: list[AssetConnection] = []
    result_assets: list[Asset] = []

    queue = deque([asset_id])

    while queue:
        curr_asset_id = queue.popleft()

        query = db.query(AssetConnection).filter(
            AssetConnection.source_asset_id == curr_asset_id,
            AssetConnection.valid_to.is_(None),
            AssetConnection.connection_type == "SUPPLIES",
        )
        if not include_unverified:
            query = query.filter(AssetConnection.verification_status == "VERIFIED")
        if utility_type:
            query = query.filter(AssetConnection.utility_type == utility_type.strip().upper())

        outbound = query.all()
        for conn in outbound:
            if conn.id not in visited_connections:
                visited_connections.add(conn.id)
                result_connections.append(conn)

            target_id = conn.target_asset_id
            if target_id not in visited_assets:
                visited_assets.add(target_id)
                target_asset = db.query(Asset).filter(Asset.id == target_id).first()
                if target_asset:
                    result_assets.append(target_asset)
                queue.append(target_id)

    return result_assets, result_connections


def get_upstream(
    db: Session,
    asset_id: str,
    utility_type: Optional[str] = None,
    include_unverified: bool = False,
) -> tuple[list[Asset], list[AssetConnection]]:
    """
    Trace upstream utility supply (SUPPLIES towards target).
    Cycle-safe BFS traversal. Default verified active connections only.
    """
    visited_assets = {asset_id}
    visited_connections = set()
    result_connections: list[AssetConnection] = []
    result_assets: list[Asset] = []

    queue = deque([asset_id])

    while queue:
        curr_asset_id = queue.popleft()

        query = db.query(AssetConnection).filter(
            AssetConnection.target_asset_id == curr_asset_id,
            AssetConnection.valid_to.is_(None),
            AssetConnection.connection_type == "SUPPLIES",
        )
        if not include_unverified:
            query = query.filter(AssetConnection.verification_status == "VERIFIED")
        if utility_type:
            query = query.filter(AssetConnection.utility_type == utility_type.strip().upper())

        inbound = query.all()
        for conn in inbound:
            if conn.id not in visited_connections:
                visited_connections.add(conn.id)
                result_connections.append(conn)

            source_id = conn.source_asset_id
            if source_id not in visited_assets:
                visited_assets.add(source_id)
                source_asset = db.query(Asset).filter(Asset.id == source_id).first()
                if source_asset:
                    result_assets.append(source_asset)
                queue.append(source_id)

    return result_assets, result_connections


def get_connected(
    db: Session,
    asset_id: str,
    utility_type: Optional[str] = None,
    include_unverified: bool = False,
) -> tuple[list[Asset], list[AssetConnection]]:
    """
    Trace all connected assets (bidirectional, SUPPLIES or CONNECTED_TO).
    Cycle-safe BFS traversal. Default verified active connections only.
    """
    visited_assets = {asset_id}
    visited_connections = set()
    result_connections: list[AssetConnection] = []
    result_assets: list[Asset] = []

    queue = deque([asset_id])

    while queue:
        curr_asset_id = queue.popleft()

        # Check outbound
        q_out = db.query(AssetConnection).filter(
            AssetConnection.source_asset_id == curr_asset_id,
            AssetConnection.valid_to.is_(None),
        )
        if not include_unverified:
            q_out = q_out.filter(AssetConnection.verification_status == "VERIFIED")
        if utility_type:
            q_out = q_out.filter(AssetConnection.utility_type == utility_type.strip().upper())

        for conn in q_out.all():
            if conn.id not in visited_connections:
                visited_connections.add(conn.id)
                result_connections.append(conn)
            other_id = conn.target_asset_id
            if other_id not in visited_assets:
                visited_assets.add(other_id)
                other_asset = db.query(Asset).filter(Asset.id == other_id).first()
                if other_asset:
                    result_assets.append(other_asset)
                queue.append(other_id)

        # Check inbound
        q_in = db.query(AssetConnection).filter(
            AssetConnection.target_asset_id == curr_asset_id,
            AssetConnection.valid_to.is_(None),
        )
        if not include_unverified:
            q_in = q_in.filter(AssetConnection.verification_status == "VERIFIED")
        if utility_type:
            q_in = q_in.filter(AssetConnection.utility_type == utility_type.strip().upper())

        for conn in q_in.all():
            if conn.id not in visited_connections:
                visited_connections.add(conn.id)
                result_connections.append(conn)
            other_id = conn.source_asset_id
            if other_id not in visited_assets:
                visited_assets.add(other_id)
                other_asset = db.query(Asset).filter(Asset.id == other_id).first()
                if other_asset:
                    result_assets.append(other_asset)
                queue.append(other_id)

    return result_assets, result_connections
