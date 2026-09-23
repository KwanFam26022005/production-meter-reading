# 05 — Map Architectures & Operational Zone Assignments Audit

**Document Reference:** `docs/research/employee-shift-map-audit/05_MAP_AND_ZONE_ASSIGNMENTS.md`  
**Audit Date:** 2026-09-23  
**Auditor Role:** Senior Business Analyst, Software Architect, Database Auditor & Full-Stack Engineer  
**Audit Mode:** Read-Only Source & Architecture Audit  

---

## 1. Executive Summary

This document audits the physical and operational zoning model, the two disjoint map implementations (Map V1 Operational Console vs. Map V2 Digital Twin), and the mechanisms governing how employees and meters are assigned to zones.

**Key Findings:**
1. **Two Completely Disconnected Map Universes**:
   - **Map V1 (`MapOperationsPage.tsx`)**: Backed by SQLite (`OperationalZone`, `ZoneAssignment`), uses coordinate system 1915×821 / 1664×932.
   - **Map V2 (`MapV2Workspace.tsx`)**: Standalone client-side SVG digital twin (1536×1024), backed entirely by static JSON ([`tan_thuan_1_zones_edited.json`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/data/tan_thuan_1_zones_edited.json)), with **zero backend API calls** and zero connection to the database.
2. **Standing vs. Dynamic Assignments**: In SQLite, `ZoneAssignment` is a continuous, permanent assignment. It is **not date-specific, not shift-specific, and not round-specific**.
3. **Fictional Shift Display on Map V1**: When Map V1 displays an operator's active shift badge, it does **not** query `WorkSchedule`. Instead, it synthesizes a fictional shift based on the wall-clock time of the current reading round!

---

## 2. Map V1 vs. Map V2 Architectural Comparison

```
+------------------------------------+       +------------------------------------+
|       MAP V1: CONSOLE V16          |       |       MAP V2: DIGITAL TWIN         |
|   (src/features/map-operations/)   |       |       (src/components/map-v2/)     |
+------------------------------------+       +------------------------------------+
|  Coordinate Space: 1915 x 821      |       |  Coordinate Space: 1536 x 1024     |
|  Rendering: Interactive Canvas/SVG |       |  Rendering: SVG Responsive Layers  |
|  Backend API: /api/v1/map/*        |       |  Backend API: NONE (Client-Side)   |
|  Data Source: SQLite Tables        |       |  Data Source: Static JSON File     |
|   - operational_zones              |       |   - tan_thuan_1_zones_edited.json  |
|   - zone_assignments               |       |                                    |
|   - meters (DB query)              |       |  Meters: Hardcoded SVG mock data   |
|  Operators: ZoneAssignment table   |       |  Operators: None                   |
|  Shift: Synthesized from round time|       |  Shift: None                       |
+------------------------------------+       +------------------------------------+
```

### 2.1 Detailed Map V2 Digital Twin Isolation
Inspection of [`frontend/src/components/map-v2/MapV2Workspace.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/MapV2Workspace.tsx) and its layer components confirms:
- **No HTTP Network Requests**: It imports geometry directly from `tan_thuan_1_zones_edited.json`.
- **No Meter State Integration**: Meter inspection panels show static demo properties (e.g., voltage, flow rate, simulated alerts) rather than live readings from `meter_readings` table.
- **No Employee Presence**: Map V2 contains no UI elements, layers, or data pipelines to represent field personnel, active shifts, or zone assignments.

---

## 3. OperationalZone & ZoneAssignment Data Models (Map V1)

In [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L89-L125):

```python
class OperationalZone(Base):
    __tablename__ = "operational_zones"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, index=True, nullable=False) # e.g. "ZONE_A"
    name = Column(String(100), nullable=False)                         # e.g. "Khu vuc Cau tau 1-3"
    polygon_coordinates = Column(Text, nullable=False)                 # JSON string of [[x,y],...]
    color = Column(String(20), default="#3B82F6", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

class ZoneAssignment(Base):
    __tablename__ = "zone_assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey("operational_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), default="PRIMARY", nullable=False)       # PRIMARY, BACKUP
    effective_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    effective_to = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
```

### 3.1 Standing Assignment Nature
Notice the fields: `effective_from`, `effective_to`, `is_active`.
- `ZoneAssignment` models a **continuous tenure** (e.g., "Worker X is assigned to Zone A starting Sept 1st indefinitely").
- It **lacks** `work_date`, `shift_code`, and `reading_round_id`.
- Consequently, the system cannot express: *"Worker X is assigned to Zone A during Ca 1 on Monday, but Zone B during Ca 2 on Tuesday."*
- If two workers are assigned to the same zone, both remain active indefinitely unless an administrator manually terminates one assignment via `effective_to`.

---

## 4. The Fictional Shift Derivation Flaw

In [`frontend/src/features/map-operations/utils/deriveOperatorShiftSummary.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/utils/deriveOperatorShiftSummary.ts#L38-L63):

When the Map V1 operational console renders the zone operator card showing the operator's name and shift badge:
1. It does **not** call `GET /work-schedules` or check the database.
2. It inspects the currently selected Reading Round's start time string:
   ```ts
   // Pseudo-code representation of observed derivation:
   if (roundTime >= "06:00" && roundTime < "14:00") {
       return { shiftCode: "CA1", shiftLabel: "Ca 1 (06:00 - 14:00)" };
   } else if (roundTime >= "14:00" && roundTime < "22:00") {
       return { shiftCode: "CA2", shiftLabel: "Ca 2 (14:00 - 22:00)" };
   } else {
       return { shiftCode: "CA3", shiftLabel: "Ca 3 (22:00 - 06:00)" };
   }
   ```
3. **The Deception**: An operator could be scheduled for `OFF` or approved `LEAVE` in `work_schedules`, yet if they have a standing `ZoneAssignment` in SQLite, the map displays them as on active duty in "Ca 1" simply because the reading round started at 09:00!

---

## 5. Mock / Fallback Operators in Map V1

In [`frontend/src/features/map-operations/config/portMapConfig.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/features/map-operations/config/portMapConfig.ts#L80-L115):

If the backend returns no active assignment for a zone, the frontend automatically falls back to hardcoded mock operator identities:
- Zone A: `NV001 - Nguyễn Văn Hải`
- Zone B: `NV002 - Trần Minh Tuấn`
- Zone C: `NV003 - Lê Hoàng Nam`

This mask prevents dispatchers from noticing unstaffed zones during development and testing, creating a risk if deployed to production without real database population.

---

## 6. Meters to Zones Relationship

In [`backend/app/models.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L40-L73):

```python
class Meter(Base):
    __tablename__ = "meters"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    zone_id = Column(Integer, ForeignKey("operational_zones.id"), nullable=True, index=True)
    zone_code = Column(String(32), nullable=True) # Redundant denormalized code
    map_x = Column(Float, nullable=True)
    map_y = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
```

### 6.1 Observations
1. **Meter Association**: Meters are statically linked to `OperationalZone` via `zone_id` and denormalized `zone_code`.
2. **Coordinate Alignment**: `map_x` and `map_y` correspond to Map V1 canvas dimensions (1915×821). They do not correspond to Map V2 coordinates (1536×1024), causing meters to render incorrectly if mapped directly onto Map V2 without coordinate transformation.
3. **Propagation of Reassignments**:
   - Reassigning an operator to a zone updates `zone_assignments` table in SQLite.
   - It **does not update** the meter reading worklist in the User Portal (`user.html`), because meter reading execution is not partitioned by zone assignment.
