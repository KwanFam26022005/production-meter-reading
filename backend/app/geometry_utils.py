from typing import Any


def calculate_polygon_area(vertices: list[dict[str, Any]]) -> float:
    n = len(vertices)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += vertices[i]["x"] * vertices[j]["y"]
        area -= vertices[j]["x"] * vertices[i]["y"]
    return abs(area) / 2.0


def is_point_in_polygon(point: dict[str, Any], polygon: list[dict[str, Any]]) -> bool:
    """Ray casting algorithm to determine if point (x, y) is inside polygon."""
    x = point.get("x", 0)
    y = point.get("y", 0)
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


def do_segments_intersect(p1: dict, p2: dict, p3: dict, p4: dict) -> bool:
    def ccw(A: dict, B: dict, C: dict) -> bool:
        return (C["y"] - A["y"]) * (B["x"] - A["x"]) > (B["y"] - A["y"]) * (C["x"] - A["x"])

    # Shared vertices are not considered cross-intersections
    if (p1["x"] == p3["x"] and p1["y"] == p3["y"]) or (p1["x"] == p4["x"] and p1["y"] == p4["y"]):
        return False
    if (p2["x"] == p3["x"] and p2["y"] == p3["y"]) or (p2["x"] == p4["x"] and p2["y"] == p4["y"]):
        return False

    return (ccw(p1, p3, p4) != ccw(p2, p3, p4)) and (ccw(p1, p2, p3) != ccw(p1, p2, p4))


def check_polygon_simplicity(vertices: list[dict[str, Any]]) -> bool:
    n = len(vertices)
    if n < 3:
        return False
    for i in range(n):
        p1 = vertices[i]
        p2 = vertices[(i + 1) % n]
        for j in range(i + 2, n):
            if (i == 0) and (j == n - 1):
                continue  # adjacent segments at wrap-around
            p3 = vertices[j]
            p4 = vertices[(j + 1) % n]
            if do_segments_intersect(p1, p2, p3, p4):
                return False
    return True
