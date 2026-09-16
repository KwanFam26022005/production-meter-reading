#!/usr/bin/env python3
"""
scripts/audit/v16e_a0_audit_collector.py
Read-only audit collector for V16E-A0:
Current Spatial + Meter + Asset + Utility Topology Audit.

ABSOLUTELY READ-ONLY:
- Opens SQLite database in URI read-only mode (?mode=ro)
- Computes comprehensive audit artifacts into docs/audit/v16e-a0/
- Never performs INSERT, UPDATE, DELETE, or schema modifications.
"""

import os
import sys
import json
import csv
import math
import hashlib
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

DB_PATH = REPO_ROOT / "data" / "app.db"
OUTPUT_DIR = REPO_ROOT / "docs" / "audit" / "v16e-a0"
SCREENSHOT_DIR = OUTPUT_DIR / "screenshots"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def get_ro_connection():
    uri = f"file:{DB_PATH.as_posix()}?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    return con


# ----------------------------------------------------------------------
# Geometry Math Helpers
# ----------------------------------------------------------------------

def calculate_polygon_area(vertices: list[dict]) -> float:
    n = len(vertices)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += vertices[i]["x"] * vertices[j]["y"]
        area -= vertices[j]["x"] * vertices[i]["y"]
    return abs(area) / 2.0


def is_point_in_polygon(point: dict, polygon: list[dict]) -> bool:
    x = point.get("x", 0.0)
    y = point.get("y", 0.0)
    n = len(polygon)
    if n < 3:
        return False
    inside = False
    for i in range(n):
        j = (i + 1) % n
        xi, yi = polygon[i]["x"], polygon[i]["y"]
        xj, yj = polygon[j]["x"], polygon[j]["y"]
        intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)
        if intersect:
            inside = not inside
    return inside


def point_to_segment_dist(px, py, x1, y1, x2, y2) -> float:
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    closest_x = x1 + t * dx
    closest_y = y1 + t * dy
    return math.hypot(px - closest_x, py - closest_y)


def point_to_polygon_dist(point: dict, polygon: list[dict]) -> float:
    min_d = float("inf")
    n = len(polygon)
    for i in range(n):
        p1 = polygon[i]
        p2 = polygon[(i + 1) % n]
        d = point_to_segment_dist(point["x"], point["y"], p1["x"], p1["y"], p2["x"], p2["y"])
        if d < min_d:
            min_d = d
    return min_d


def check_polygon_simplicity(vertices: list[dict]) -> bool:
    def ccw(A, B, C):
        return (C["y"] - A["y"]) * (B["x"] - A["x"]) > (B["y"] - A["y"]) * (C["x"] - A["x"])

    def intersect(p1, p2, p3, p4):
        if (p1["x"] == p3["x"] and p1["y"] == p3["y"]) or (p1["x"] == p4["x"] and p1["y"] == p4["y"]):
            return False
        if (p2["x"] == p3["x"] and p2["y"] == p3["y"]) or (p2["x"] == p4["x"] and p2["y"] == p4["y"]):
            return False
        return (ccw(p1, p3, p4) != ccw(p2, p3, p4)) and (ccw(p1, p2, p3) != ccw(p1, p2, p4))

    n = len(vertices)
    if n < 3:
        return False
    for i in range(n):
        p1 = vertices[i]
        p2 = vertices[(i + 1) % n]
        for j in range(i + 2, n):
            if (i == 0) and (j == n - 1):
                continue
            p3 = vertices[j]
            p4 = vertices[(j + 1) % n]
            if intersect(p1, p2, p3, p4):
                return False
    return True


def get_bounding_box(vertices: list[dict]) -> dict:
    if not vertices:
        return {"minX": 0, "maxX": 0, "minY": 0, "maxY": 0, "width": 0, "height": 0}
    xs = [v["x"] for v in vertices]
    ys = [v["y"] for v in vertices]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return {
        "minX": min_x,
        "maxX": max_x,
        "minY": min_y,
        "maxY": max_y,
        "width": max_x - min_x,
        "height": max_y - min_y,
    }


def main():
    con = get_ro_connection()

    # ------------------------------------------------------------------
    # 1. Active Map Version Audit
    # ------------------------------------------------------------------
    active_mv_row = con.execute(
        "SELECT * FROM map_versions WHERE status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 1"
    ).fetchone()

    if not active_mv_row:
        active_mv_row = con.execute("SELECT * FROM map_versions ORDER BY created_at DESC LIMIT 1").fetchone()

    active_map_version = dict(active_mv_row) if active_mv_row else {}
    map_version_id = active_map_version.get("id")

    zone_rows = con.execute(
        "SELECT * FROM map_version_zones WHERE map_version_id = ? ORDER BY display_index ASC",
        (map_version_id,),
    ).fetchall()

    canonical_width = active_map_version.get("canonical_width", 1915)
    canonical_height = active_map_version.get("canonical_height", 821)
    coord_system = active_map_version.get("coordinate_system", "tan-thuan-canonical-image-pixel-space-v1")

    # ------------------------------------------------------------------
    # 2. Presentation Zones Processing
    # ------------------------------------------------------------------
    zones_inventory = []
    zone_polygons_map = {}

    for zr in zone_rows:
        poly_canonical = json.loads(zr["polygon_canonical"]) if zr["polygon_canonical"] else []
        poly_norm = [
            {"x": round(pt["x"] / canonical_width, 6), "y": round(pt["y"] / canonical_height, 6)}
            for pt in poly_canonical
        ]
        lbl_anchor = json.loads(zr["label_anchor_canonical"]) if zr["label_anchor_canonical"] else None
        op_anchor = json.loads(zr["operator_anchor_canonical"]) if zr["operator_anchor_canonical"] else None
        landmarks = json.loads(zr["landmarks_json"]) if zr["landmarks_json"] else []

        area = calculate_polygon_area(poly_canonical)
        is_simple = check_polygon_simplicity(poly_canonical)
        bbox = get_bounding_box(poly_canonical)

        # check if anchors are inside
        lbl_inside = is_point_in_polygon(lbl_anchor, poly_canonical) if lbl_anchor else False
        op_inside = is_point_in_polygon(op_anchor, poly_canonical) if op_anchor else False

        # bounds validity
        bounds_valid = all(
            0 <= pt["x"] <= canonical_width and 0 <= pt["y"] <= canonical_height for pt in poly_canonical
        )

        zone_data = {
            "presentationZoneId": zr["zone_id"],
            "displayName": zr["display_label"],
            "businessName": zr["business_name"],
            "businessZoneId": zr["business_zone_id"],
            "displayIndex": zr["display_index"],
            "presentationColor": zr["presentation_color"],
            "icon": zr["icon"],
            "vertexCount": len(poly_canonical),
            "polygonCanonical": poly_canonical,
            "polygonNormalized": poly_norm,
            "areaPixels": round(area, 2),
            "boundingBox": bbox,
            "labelAnchor": lbl_anchor,
            "labelAnchorInside": lbl_inside,
            "operatorAnchor": op_anchor,
            "operatorAnchorInside": op_inside,
            "landmarksCount": len(landmarks),
            "isSimplePolygon": is_simple,
            "boundsValid": bounds_valid,
            "status": "ACTIVE_PUBLISHED",
            "source": "map_version_zones",
        }
        zones_inventory.append(zone_data)
        zone_polygons_map[zr["zone_id"]] = poly_canonical

    # ------------------------------------------------------------------
    # 3. Meter Inventory & Spatial Containment Audit
    # ------------------------------------------------------------------
    meter_rows = con.execute("SELECT * FROM meters ORDER BY meter_code ASC").fetchall()
    meter_inventory = []
    meter_spatial_matrix = []
    meter_history_impact = []

    for mr in meter_rows:
        m = dict(mr)
        m_id = m["id"]
        m_code = m["meter_code"]
        map_x = m.get("map_x")
        map_y = m.get("map_y")
        assigned_zone = m.get("presentation_zone_id")

        if map_x is not None and map_y is not None:
            cx = round(map_x * canonical_width, 2)
            cy = round(map_y * canonical_height, 2)
            c_pos = {"x": cx, "y": cy}
            has_coords = True
        else:
            cx, cy = None, None
            c_pos = None
            has_coords = False

        # Determine actual containing zones
        containing_zones = []
        if has_coords:
            for zid, poly in zone_polygons_map.items():
                if is_point_in_polygon(c_pos, poly):
                    containing_zones.append(zid)

        # Classification
        if not has_coords:
            spatial_class = "UNKNOWN_POSITION"
            nearest_zone = None
            nearest_dist = None
        elif len(containing_zones) == 1:
            if containing_zones[0] == assigned_zone:
                spatial_class = "MATCH"
                nearest_zone = assigned_zone
                nearest_dist = 0.0
            else:
                spatial_class = "OUTSIDE_ASSIGNED_ZONE"
                # Nearest zone
                nearest_zone = containing_zones[0]
                nearest_dist = 0.0
        elif len(containing_zones) > 1:
            spatial_class = "MULTIPLE_ZONE_OVERLAP"
            nearest_zone = containing_zones[0]
            nearest_dist = 0.0
        else:
            spatial_class = "NO_CONTAINING_ZONE"
            # calculate nearest zone boundary
            min_dist = float("inf")
            best_z = None
            for zid, poly in zone_polygons_map.items():
                d = point_to_polygon_dist(c_pos, poly)
                if d < min_dist:
                    min_dist = d
                    best_z = zid
            nearest_zone = best_z
            nearest_dist = round(min_dist, 2)

        # Reading stats
        r_stats = con.execute(
            """SELECT COUNT(*) as count, MIN(created_at) as earliest, MAX(created_at) as latest
               FROM meter_readings WHERE meter_id = ?""",
            (m_id,),
        ).fetchone()
        reading_count = r_stats["count"]
        earliest_reading = r_stats["earliest"]
        latest_reading = r_stats["latest"]

        # Latest recorded reading value & unit
        latest_r_val = con.execute(
            """SELECT reading, created_at FROM meter_readings 
               WHERE meter_id = ? ORDER BY created_at DESC LIMIT 1""",
            (m_id,),
        ).fetchone()
        latest_val = latest_r_val["reading"] if latest_r_val else None

        # Evidence / samples count
        evidence_count = con.execute(
            """SELECT COUNT(*) as count FROM meter_reading_evidence mre
               JOIN meter_readings mr ON mre.meter_reading_id = mr.id
               WHERE mr.meter_id = ?""",
            (m_id,),
        ).fetchone()["count"]

        training_count = con.execute(
            "SELECT COUNT(*) as count FROM meter_training_samples WHERE meter_id = ?",
            (m_id,),
        ).fetchone()["count"]

        # Alert count (no separate alerts table in schema, defaults to 0)
        alert_count = 0

        # Asset relations
        relations = con.execute(
            "SELECT * FROM meter_asset_relations WHERE meter_id = ?",
            (m_id,),
        ).fetchall()
        relation_count = len(relations)
        installed_at_assets = [r["asset_id"] for r in relations if r["relation_type"] == "INSTALLED_AT"]
        measures_assets = [r["asset_id"] for r in relations if r["relation_type"] == "MEASURES"]

        # History criticality classification
        if reading_count > 0 or evidence_count > 0 or training_count > 0:
            history_class = "HISTORY_CRITICAL"
        elif alert_count > 0 or relation_count > 0:
            history_class = "LOW_HISTORY"
        else:
            history_class = "NO_HISTORY"

        m_item = {
            **m,
            "canonicalPosition": c_pos,
            "containingZones": containing_zones,
            "spatialClassification": spatial_class,
            "nearestZone": nearest_zone,
            "distanceToNearestZone": nearest_dist,
            "readingCount": reading_count,
            "earliestReading": earliest_reading,
            "latestReading": latest_reading,
            "latestRecordedValue": latest_val,
            "evidenceCount": evidence_count,
            "trainingSampleCount": training_count,
            "alertCount": alert_count,
            "relationCount": relation_count,
            "installedAtAssets": installed_at_assets,
            "measuresAssets": measures_assets,
            "historyCriticality": history_class,
        }
        meter_inventory.append(m_item)

        meter_spatial_matrix.append({
            "meterCode": m_code,
            "meterName": m.get("name"),
            "assignedPresentationZone": assigned_zone,
            "actualContainingZones": "; ".join(containing_zones) if containing_zones else "NONE",
            "isInsideAssigned": (assigned_zone in containing_zones),
            "spatialClassification": spatial_class,
            "normalizedCoord": f"({map_x}, {map_y})" if has_coords else "NULL",
            "canonicalCoord": f"({cx}, {cy})" if has_coords else "NULL",
            "nearestZone": nearest_zone or "N/A",
            "distanceToNearestBoundaryPx": nearest_dist if nearest_dist is not None else "N/A",
        })

        meter_history_impact.append({
            "meterCode": m_code,
            "lifecycleStatus": m.get("lifecycle_status"),
            "readingCount": reading_count,
            "earliestReading": earliest_reading or "NONE",
            "latestReading": latest_reading or "NONE",
            "latestValue": latest_val or "NONE",
            "ocrEvidenceCount": evidence_count,
            "trainingSampleCount": training_count,
            "alertCount": alert_count,
            "activeAssetRelations": relation_count,
            "historyImpactClassification": history_class,
            "safeToDelete": "NO (FK reading/evidence lock)" if history_class == "HISTORY_CRITICAL" else "YES (no history)",
        })

    # ------------------------------------------------------------------
    # 4. Asset Inventory & Verification Audit
    # ------------------------------------------------------------------
    asset_rows = con.execute("SELECT * FROM assets ORDER BY code ASC").fetchall()
    asset_inventory = []

    for ar in asset_rows:
        a = dict(ar)
        a_id = a["id"]
        ax = a.get("map_x")
        ay = a.get("map_y")
        has_pos = (ax is not None and ay is not None)

        if has_pos:
            acx = round(ax * canonical_width, 2)
            acy = round(ay * canonical_height, 2)
            apos = {"x": acx, "y": acy}
            containing_zones = [zid for zid, poly in zone_polygons_map.items() if is_point_in_polygon(apos, poly)]
        else:
            acx, acy, apos = None, None, None
            containing_zones = []

        assigned_zone = a.get("zone_id")
        if not has_pos:
            spatial_class = "UNKNOWN_POSITION"
        elif len(containing_zones) == 1:
            spatial_class = "MATCH" if (assigned_zone and assigned_zone in containing_zones[0]) else "CONTAINED_IN_ZONE"
        elif len(containing_zones) > 1:
            spatial_class = "MULTIPLE_ZONE_OVERLAP"
        else:
            spatial_class = "NO_CONTAINING_ZONE"

        # Attached relations
        rel_rows = con.execute("SELECT * FROM meter_asset_relations WHERE asset_id = ?", (a_id,)).fetchall()
        attached_meters = [r["meter_id"] for r in rel_rows]

        # Topology connections
        out_conns = con.execute("SELECT * FROM asset_connections WHERE source_asset_id = ?", (a_id,)).fetchall()
        in_conns = con.execute("SELECT * FROM asset_connections WHERE target_asset_id = ?", (a_id,)).fetchall()

        # Evidence count for asset
        ev_rows = con.execute(
            "SELECT * FROM verification_evidences WHERE entity_id = ? AND entity_type = 'ASSET'",
            (a_id,),
        ).fetchall()

        asset_item = {
            **a,
            "canonicalPosition": apos,
            "hasPosition": has_pos,
            "containingZones": containing_zones,
            "spatialClassification": spatial_class,
            "attachedMetersCount": len(attached_meters),
            "outboundConnectionsCount": len(out_conns),
            "inboundConnectionsCount": len(in_conns),
            "evidenceCount": len(ev_rows),
            "evidenceTypes": [e["evidence_type"] for e in ev_rows],
        }
        asset_inventory.append(asset_item)

    # ------------------------------------------------------------------
    # 5. Meter ↔ Asset Relations
    # ------------------------------------------------------------------
    rel_rows = con.execute(
        """SELECT r.*, m.meter_code, a.code as asset_code, a.name as asset_name, a.verification_status as asset_verif
           FROM meter_asset_relations r
           LEFT JOIN meters m ON r.meter_id = m.id
           LEFT JOIN assets a ON r.asset_id = a.id
           ORDER BY r.created_at ASC"""
    ).fetchall()

    relations_inventory = []
    for r in rel_rows:
        rd = dict(r)
        # Evidence for relation
        ev_r = con.execute(
            "SELECT * FROM verification_evidences WHERE entity_id = ? AND entity_type = 'METER_ASSET_RELATION'",
            (rd["id"],),
        ).fetchall()
        rd["evidenceCount"] = len(ev_r)
        rd["evidenceTypes"] = [e["evidence_type"] for e in ev_r]
        relations_inventory.append(rd)

    # ------------------------------------------------------------------
    # 6. Asset Connections (Topology)
    # ------------------------------------------------------------------
    conn_rows = con.execute(
        """SELECT c.*, 
                  sa.code as source_code, sa.name as source_name, sa.verification_status as source_verif,
                  ta.code as target_code, ta.name as target_name, ta.verification_status as target_verif
           FROM asset_connections c
           LEFT JOIN assets sa ON c.source_asset_id = sa.id
           LEFT JOIN assets ta ON c.target_asset_id = ta.id
           ORDER BY c.created_at ASC"""
    ).fetchall()

    connections_inventory = []
    for c in conn_rows:
        cd = dict(c)
        ev_c = con.execute(
            "SELECT * FROM verification_evidences WHERE entity_id = ? AND entity_type = 'ASSET_CONNECTION'",
            (cd["id"],),
        ).fetchall()
        cd["evidenceCount"] = len(ev_c)
        cd["evidenceTypes"] = [e["evidence_type"] for e in ev_c]
        connections_inventory.append(cd)

    # ------------------------------------------------------------------
    # 7. Graph Analysis (Electricity & Water)
    # ------------------------------------------------------------------
    def analyze_graph(utility_filter: str):
        nodes_map = {}
        edges = []

        for a in asset_inventory:
            # node belongs to this utility if asset.utility_type == utility_filter or ALL or has connection in it
            nodes_map[a["id"]] = {
                "id": a["id"],
                "code": a["code"],
                "name": a["name"],
                "asset_type": a["asset_type"],
                "utility_type": a.get("utility_type"),
                "verification_status": a["verification_status"],
                "is_verified": a["verification_status"] == "VERIFIED",
                "in_degree": 0,
                "out_degree": 0,
            }

        filtered_edges = [c for c in connections_inventory if c.get("utility_type") == utility_filter]

        for e in filtered_edges:
            s_id = e["source_asset_id"]
            t_id = e["target_asset_id"]
            if s_id in nodes_map:
                nodes_map[s_id]["out_degree"] += 1
            if t_id in nodes_map:
                nodes_map[t_id]["in_degree"] += 1

            edges.append({
                "id": e["id"],
                "source": s_id,
                "sourceCode": e.get("source_code"),
                "target": t_id,
                "targetCode": e.get("target_code"),
                "connection_type": e.get("connection_type"),
                "verification_status": e.get("verification_status"),
                "is_verified": e.get("verification_status") == "VERIFIED",
            })

        # Connected components (undirected BFS)
        adj = {nid: [] for nid in nodes_map}
        for e in edges:
            if e["source"] in adj and e["target"] in adj:
                adj[e["source"]].append(e["target"])
                adj[e["target"]].append(e["source"])

        visited = set()
        components = []
        for nid in nodes_map:
            if nid not in visited:
                comp = []
                queue = [nid]
                visited.add(nid)
                while queue:
                    curr = queue.pop(0)
                    comp.append(curr)
                    for nxt in adj.get(curr, []):
                        if nxt not in visited:
                            visited.add(nxt)
                            queue.append(nxt)
                components.append(comp)

        # Isolated nodes (degree 0)
        isolated_nodes = [
            {"id": nid, "code": nodes_map[nid]["code"], "name": nodes_map[nid]["name"]}
            for nid in nodes_map
            if nodes_map[nid]["in_degree"] == 0 and nodes_map[nid]["out_degree"] == 0
        ]

        # Root candidates (in_degree == 0 and out_degree > 0)
        root_candidates = [
            {"id": nid, "code": nodes_map[nid]["code"], "name": nodes_map[nid]["name"], "out_degree": nodes_map[nid]["out_degree"]}
            for nid in nodes_map
            if nodes_map[nid]["in_degree"] == 0 and nodes_map[nid]["out_degree"] > 0
        ]

        # Sink candidates (in_degree > 0 and out_degree == 0)
        sink_candidates = [
            {"id": nid, "code": nodes_map[nid]["code"], "name": nodes_map[nid]["name"], "in_degree": nodes_map[nid]["in_degree"]}
            for nid in nodes_map
            if nodes_map[nid]["in_degree"] > 0 and nodes_map[nid]["out_degree"] == 0
        ]

        # Cycle detection (directed DFS)
        dir_adj = {nid: [] for nid in nodes_map}
        for e in edges:
            if e["source"] in dir_adj and e["target"] in dir_adj:
                dir_adj[e["source"]].append(e["target"])

        has_cycle = False
        color = {nid: 0 for nid in nodes_map}  # 0: unvisited, 1: visiting, 2: visited

        def dfs_cycle(u):
            nonlocal has_cycle
            color[u] = 1
            for v in dir_adj.get(u, []):
                if color[v] == 1:
                    has_cycle = True
                elif color[v] == 0:
                    dfs_cycle(v)
            color[u] = 2

        for nid in nodes_map:
            if color[nid] == 0:
                dfs_cycle(nid)

        active_nodes_count = len([n for n in nodes_map.values() if n["in_degree"] > 0 or n["out_degree"] > 0])
        verified_edges_count = len([e for e in edges if e["is_verified"]])

        return {
            "utilityType": utility_filter,
            "totalNodes": len(nodes_map),
            "connectedNodesCount": active_nodes_count,
            "isolatedNodesCount": len(isolated_nodes),
            "totalEdges": len(edges),
            "verifiedEdges": verified_edges_count,
            "unverifiedEdges": len(edges) - verified_edges_count,
            "connectedComponentsCount": len(components),
            "hasCycles": has_cycle,
            "graphRootCandidates": root_candidates,
            "graphSinkCandidates": sink_candidates,
            "isolatedNodes": isolated_nodes,
            "edges": edges,
        }

    electricity_graph = analyze_graph("ELECTRICITY")
    water_graph = analyze_graph("WATER")

    # ------------------------------------------------------------------
    # 8. Matrices Generation
    # ------------------------------------------------------------------

    # Zone ↔ Meter Matrix
    zone_meter_summary = []
    for z in zones_inventory:
        zid = z["presentationZoneId"]
        assigned_m = [m for m in meter_inventory if m.get("presentation_zone_id") == zid]
        contained_m = [m for m in meter_inventory if zid in m.get("containingZones", [])]
        mismatch_m = [m for m in assigned_m if zid not in m.get("containingZones", [])]
        active_cnt = len([m for m in assigned_m if m.get("lifecycle_status") == "ACTIVE"])
        inactive_cnt = len([m for m in assigned_m if m.get("lifecycle_status") == "INACTIVE"])
        retired_cnt = len([m for m in assigned_m if m.get("lifecycle_status") == "RETIRED"])

        zone_meter_summary.append({
            "presentationZoneId": zid,
            "displayName": z["displayName"],
            "assignedMeterCount": len(assigned_m),
            "physicallyContainedMeterCount": len(contained_m),
            "outsideAssignedCount": len(mismatch_m),
            "activeCount": active_cnt,
            "inactiveCount": inactive_cnt,
            "retiredCount": retired_cnt,
            "assignedMeterCodes": "; ".join([m["meter_code"] for m in assigned_m]),
            "containedMeterCodes": "; ".join([m["meter_code"] for m in contained_m]),
            "mismatchMeterCodes": "; ".join([m["meter_code"] for m in mismatch_m]),
        })

    # Zone ↔ Asset Matrix
    zone_asset_summary = []
    for z in zones_inventory:
        zid = z["presentationZoneId"]
        assigned_a = [a for a in asset_inventory if a.get("zone_id") == zid]
        contained_a = [a for a in asset_inventory if zid in a.get("containingZones", [])]
        verif_a = [a for a in contained_a if a.get("verification_status") == "VERIFIED"]
        unverif_a = [a for a in contained_a if a.get("verification_status") == "UNVERIFIED"]
        with_pos = [a for a in contained_a if a.get("hasPosition")]

        zone_asset_summary.append({
            "presentationZoneId": zid,
            "displayName": z["displayName"],
            "assignedAssetCount": len(assigned_a),
            "containedAssetCount": len(contained_a),
            "verifiedContainedCount": len(verif_a),
            "unverifiedContainedCount": len(unverif_a),
            "withPositionCount": len(with_pos),
            "containedAssetCodes": "; ".join([a["code"] for a in contained_a[:15]]) + ("..." if len(contained_a) > 15 else ""),
        })

    # InstalledAt vs Measures Gap Matrix
    installed_measures_matrix = []
    for m in meter_inventory:
        m_code = m["meter_code"]
        inst_assets = [
            f"{r['asset_code']} ({r['asset_verif']})"
            for r in relations_inventory
            if r["meter_id"] == m["id"] and r["relation_type"] == "INSTALLED_AT"
        ]
        meas_assets = [
            f"{r['asset_code']} ({r['asset_verif']})"
            for r in relations_inventory
            if r["meter_id"] == m["id"] and r["relation_type"] == "MEASURES"
        ]

        installed_measures_matrix.append({
            "meterCode": m_code,
            "meterName": m.get("name"),
            "utilityType": m.get("utility_type") or "UNKNOWN",
            "installedAtStatus": "KNOWN" if inst_assets else "UNKNOWN",
            "installedAtAssets": "; ".join(inst_assets) if inst_assets else "NONE",
            "measuresStatus": "KNOWN" if meas_assets else "UNKNOWN",
            "measuresAssets": "; ".join(meas_assets) if meas_assets else "NONE",
            "meterLifecycle": m.get("lifecycle_status"),
        })

    # Identifier Cross-Reference
    id_cross_ref = []
    for m in meter_inventory:
        id_cross_ref.append({
            "databaseId": m["id"],
            "publicMeterCode": m["meter_code"],
            "serialNumber": m.get("serial_number") or "UNKNOWN",
            "name": m.get("name"),
            "zoneId": m.get("zone_id") or "UNKNOWN",
            "presentationZoneId": m.get("presentation_zone_id") or "UNKNOWN",
            "lifecycleStatus": m.get("lifecycle_status"),
            "readingMethod": m.get("reading_method") or "UNKNOWN",
        })

    # ------------------------------------------------------------------
    # 9. Write JSON & CSV Files
    # ------------------------------------------------------------------

    # JSON outputs
    with open(OUTPUT_DIR / "CURRENT_ZONE_INVENTORY.json", "w", encoding="utf-8") as f:
        json.dump(zones_inventory, f, indent=2, ensure_ascii=False)

    with open(OUTPUT_DIR / "CURRENT_METER_INVENTORY.json", "w", encoding="utf-8") as f:
        json.dump(meter_inventory, f, indent=2, ensure_ascii=False)

    with open(OUTPUT_DIR / "CURRENT_ASSET_INVENTORY.json", "w", encoding="utf-8") as f:
        json.dump(asset_inventory, f, indent=2, ensure_ascii=False)

    with open(OUTPUT_DIR / "CURRENT_ASSET_CONNECTIONS.json", "w", encoding="utf-8") as f:
        json.dump(connections_inventory, f, indent=2, ensure_ascii=False)

    with open(OUTPUT_DIR / "CURRENT_ELECTRICITY_GRAPH.json", "w", encoding="utf-8") as f:
        json.dump(electricity_graph, f, indent=2, ensure_ascii=False)

    with open(OUTPUT_DIR / "CURRENT_WATER_GRAPH.json", "w", encoding="utf-8") as f:
        json.dump(water_graph, f, indent=2, ensure_ascii=False)

    # Helper for CSV write
    def write_csv(filename, dict_list):
        if not dict_list:
            return
        with open(OUTPUT_DIR / filename, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=list(dict_list[0].keys()))
            writer.writeheader()
            writer.writerows(dict_list)

    write_csv("CURRENT_METER_INVENTORY.csv", [
        {
            "id": m["id"],
            "meter_code": m["meter_code"],
            "name": m["name"],
            "meter_type": m.get("meter_type"),
            "utility_type": m.get("utility_type"),
            "lifecycle_status": m.get("lifecycle_status"),
            "reading_method": m.get("reading_method"),
            "zone_id": m.get("zone_id"),
            "presentation_zone_id": m.get("presentation_zone_id"),
            "map_x": m.get("map_x"),
            "map_y": m.get("map_y"),
            "readingCount": m["readingCount"],
            "latestRecordedValue": m["latestRecordedValue"],
            "historyCriticality": m["historyCriticality"],
        }
        for m in meter_inventory
    ])

    write_csv("METER_ZONE_SPATIAL_MATRIX.csv", meter_spatial_matrix)
    write_csv("METER_HISTORY_IMPACT.csv", meter_history_impact)
    write_csv("CURRENT_ASSET_INVENTORY.csv", [
        {
            "id": a["id"],
            "code": a["code"],
            "name": a["name"],
            "asset_type": a["asset_type"],
            "utility_type": a.get("utility_type", "UNKNOWN"),
            "lifecycle_status": a["lifecycle_status"],
            "verification_status": a["verification_status"],
            "zone_id": a.get("zone_id"),
            "map_x": a.get("map_x"),
            "map_y": a.get("map_y"),
            "attachedMetersCount": a["attachedMetersCount"],
            "outboundConnectionsCount": a["outboundConnectionsCount"],
            "inboundConnectionsCount": a["inboundConnectionsCount"],
        }
        for a in asset_inventory
    ])
    write_csv("METER_ASSET_RELATIONS_CURRENT.csv", [
        {
            "id": r["id"],
            "meter_code": r.get("meter_code"),
            "asset_code": r.get("asset_code"),
            "relation_type": r["relation_type"],
            "is_primary": r.get("is_primary"),
            "verification_status": r["verification_status"],
            "confidence": r.get("confidence"),
            "source": r.get("source"),
            "notes": r.get("notes"),
        }
        for r in relations_inventory
    ])
    write_csv("INSTALLED_AT_MEASURES_MATRIX.csv", installed_measures_matrix)
    write_csv("ZONE_METER_MATRIX.csv", zone_meter_summary)
    write_csv("ZONE_ASSET_MATRIX.csv", zone_asset_summary)
    write_csv("IDENTIFIER_CROSS_REFERENCE.csv", id_cross_ref)

    # ------------------------------------------------------------------
    # 10. Write AUDIT_MANIFEST.json
    # ------------------------------------------------------------------
    base_map_img_path = REPO_ROOT / "frontend" / "src" / "assets" / "maps" / "tan-thuan-port-v8.webp"
    base_map_sha = ""
    if base_map_img_path.exists():
        with open(base_map_img_path, "rb") as bf:
            base_map_sha = hashlib.sha256(bf.read()).hexdigest()

    db_sha = ""
    if DB_PATH.exists():
        with open(DB_PATH, "rb") as df:
            db_sha = hashlib.sha256(df.read()).hexdigest()

    verified_assets_cnt = len([a for a in asset_inventory if a.get("verification_status") == "VERIFIED"])
    verified_rel_cnt = len([r for r in relations_inventory if r.get("verification_status") == "VERIFIED"])
    verified_conn_cnt = len([c for c in connections_inventory if c.get("verification_status") == "VERIFIED"])

    spatial_mismatch_meters = len([m for m in meter_inventory if m["spatialClassification"] in ("OUTSIDE_ASSIGNED_ZONE", "NO_CONTAINING_ZONE")])
    spatial_mismatch_assets = len([a for a in asset_inventory if a["spatialClassification"] in ("NO_CONTAINING_ZONE",)])

    pres_gate_present = any(z["presentationZoneId"] == "pres-gate" for z in zones_inventory)

    audit_manifest = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "branch": "feature/v10-landmark-calibration-minimal-hud",
        "commit": "e959b745ebda0d436ed43588d41224ec3a3e17ed",
        "databasePath": str(DB_PATH),
        "databaseSha256": db_sha,
        "activeMapVersionId": map_version_id,
        "activeMapVersionNumber": active_map_version.get("map_version"),
        "mapImagePath": str(base_map_img_path),
        "mapImageSha256": base_map_sha,
        "canonicalDimensions": {"width": canonical_width, "height": canonical_height},
        "coordinateSystem": coord_system,
        "zoneCount": len(zones_inventory),
        "meterCount": len(meter_inventory),
        "assetCount": len(asset_inventory),
        "meterAssetRelationCount": len(relations_inventory),
        "assetConnectionCount": len(connections_inventory),
        "verifiedAssetCount": verified_assets_cnt,
        "verifiedRelationCount": verified_rel_cnt,
        "verifiedTopologyEdgeCount": verified_conn_cnt,
        "electricityEdgeCount": len(electricity_graph["edges"]),
        "waterEdgeCount": len(water_graph["edges"]),
        "spatialMismatchMeterCount": spatial_mismatch_meters,
        "spatialMismatchAssetCount": spatial_mismatch_assets,
        "presGatePresent": pres_gate_present,
    }

    with open(OUTPUT_DIR / "AUDIT_MANIFEST.json", "w", encoding="utf-8") as f:
        json.dump(audit_manifest, f, indent=2, ensure_ascii=False)

    con.close()
    print("V16E-A0 READ-ONLY AUDIT EXTRACTION COMPLETED SUCCESSFULLY.")


if __name__ == "__main__":
    main()
