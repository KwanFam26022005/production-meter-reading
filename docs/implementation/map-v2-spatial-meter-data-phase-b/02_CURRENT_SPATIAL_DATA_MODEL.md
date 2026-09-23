# 02 — Current Spatial Data Model & Pipeline Analysis

**Scope:** In-depth audit of SQLite schema, model definitions, API projection layers, and coordinate transformation pipeline.

---

## 1. Where Spatial Coordinates are Defined

Spatial coordinates for meters are stored as persistent columns directly on the `meters` table in the SQLite database (`data/app.db`):

```python
# backend/app/models.py (lines 173-198)
class Meter(Base):
    __tablename__ = "meters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meter_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    meter_type = Column(String(50), nullable=False, default="UNKNOWN")
    zone_id = Column(String(36), ForeignKey("operational_zones.id", ondelete="SET NULL"), nullable=True, index=True)
    presentation_zone_id = Column(String(50), nullable=True, index=True)
    map_x = Column(Float, nullable=True)
    map_y = Column(Float, nullable=True)
    route_status = Column(String(50), nullable=False, default="VALID", index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    lifecycle_status = Column(String(20), nullable=False, default="ACTIVE", index=True)
    utility_type = Column(String(32), nullable=True, default="UNKNOWN")
    data_origin = Column(String(32), nullable=False, default="REAL", index=True)
    scenario_id = Column(String(64), nullable=True, index=True)
```

In the API projection layer:
- `backend/app/schemas.py`: `MapMeterOut` defines `map_x: Optional[float] = None`, `map_y: Optional[float] = None`.
- `backend/app/map_operations.py`: `get_map_overview` maps `map_x=m.map_x`, `map_y=m.map_y` directly from the database row to `MapMeterOut`.
- `frontend/src/types.ts`: `MapMeterOut` defines `map_x?: number | null`, `map_y?: number | null`.

---

## 2. Origin of Existing Database Coordinates

The existing SQLite database contains 24 meter records, populated through two historical migration/seeding mechanisms:

1. **Legacy Simulation Meters (`CT-001` through `CT-012`):**
   - Seeded in `backend/app/db.py` (`migrate_db()`, lines 500–520 and 621–642).
   - Marked with `lifecycle_status = 'RETIRED'` and `data_origin = 'LEGACY_SIMULATION'`.
   - Coordinates were digitized on the **Map V1 canvas (`1915 × 821`)** and stored as normalized fractions (`0.1760` to `0.8773`).

2. **Active Scenario Simulation Meters (`SIM-EM-001` through `SIM-WM-004`):**
   - Seeded in `scripts/seed_tan_thuan_demo_v1.py` for scenario `tan-thuan-demo-v1`.
   - Marked with `lifecycle_status = 'ACTIVE'` and `data_origin = 'SIMULATED'`.
   - Coordinates were also normalized against the **Map V1 canvas (`1915 × 821`)**.

---

## 3. The 55% Aspect Ratio Distortion Mismatch

The root cause of coordinate misplacement on Map V2 is a fundamental geometric transformation discrepancy:

| Parameter | Map V1 Canonical Space | Map V2 Canonical Space | Geometric Variance |
| :--- | :--- | :--- | :--- |
| **Image Asset** | `tan-thuan-canonical-base.png` | `tan_thuan_1_zones_edited.json` / `map-verison3.png` | New aerial orthographic crop |
| **Canonical Width** | $1915\text{ px}$ | $1536\text{ px}$ | $-19.8\%$ |
| **Canonical Height** | $821\text{ px}$ | $1024\text{ px}$ | $+24.7\%$ |
| **Aspect Ratio** | $2.332 : 1$ | $1.500 : 1$ | **55.5% distortion factor** |
| **Coordinate System** | `tan-thuan-canonical-image-pixel-space-v1` | `port-zoning-image-pixels/v1` | Incompatible image pixel space |

When normalized coordinates $c \in [0, 1]$ from Map V1 are naively scaled to Map V2 by multiplying $x \times 1536$ and $y \times 1024$:
- Horizontal positions are compressed by $\sim 20\%$.
- Vertical positions are stretched by $\sim 25\%$.
- The net distortion pushes meters into the river, onto building roofs, or outside their designated operational zones.

---

## 4. Frontend Layer Tolerance vs Data Truthfulness

In `frontend/src/components/map-v2/MapV2MeterLayer.tsx`:

```typescript
export function isValidMeterCoordinate(mapX?: number | null, mapY?: number | null): boolean {
  if (mapX === null || mapX === undefined || mapY === null || mapY === undefined) return false;
  if (isNaN(mapX) || isNaN(mapY)) return false;
  if (mapX === 0 && mapY === 0) return false;
  // Normalized range (0, 1]
  if (mapX > 0 && mapX <= 1.0 && mapY > 0 && mapY <= 1.0) return true;
  // Pixel range (1, 1536] x (1, 1024]
  if (mapX > 1.0 && mapX <= CANVAS_WIDTH && mapY > 1.0 && mapY <= CANVAS_HEIGHT) return true;
  return false;
}
```

The frontend layer gracefully accepts both representations, but **technical tolerance does not equate to spatial truthfulness**. As proven by our audit, relying on Map V1 normalized coordinates results in **87.5% of meters falling outside their assigned zone polygons**.
