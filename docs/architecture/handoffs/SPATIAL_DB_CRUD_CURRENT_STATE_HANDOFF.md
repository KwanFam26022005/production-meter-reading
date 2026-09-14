# SPATIAL CRUD + DATABASE ARCHITECTURE HANDOFF
## READ-ONLY DISCOVERY BEFORE ASSET-CENTRIC REDESIGN

**Repository**: `D:\Projects\production-meter-reading\production-meter-reading`  
**Git Branch**: `feature/v10-landmark-calibration-minimal-hud`  
**Git HEAD Commit**: `a02a78593329a807c62c121b11d59f9d7e5c293f`  
**Audit Date**: September 14, 2026  
**Auditor**: Antigravity Autonomous Agent (Google DeepMind - Advanced Agentic Coding)  
**Status**: APPROVED - READ-ONLY ARCHITECTURAL BASELINE  

---

## 1. EXECUTIVE SUMMARY

### 1.1 Purpose of Audit
This audit provides an exhaustive, verified, read-only architectural baseline of the spatial geometry, database persistence, CRUD workflows, API contracts, audit logging, authorization gates, and route-motion systems in `production-meter-reading`. The objective is to establish an authoritative technical record before initiating any architectural refactoring to introduce an `Asset` entity between `Zone` and `Meter`.

### 1.2 Core Architectural Discoveries
1. **Direct Zone-to-Meter Coupling [OBSERVED]**: The domain hierarchy is strictly 2-tiered: `OperationalZone -> Meter`. Each meter directly stores `zone_id` (foreign key to `operational_zones.id`), `presentation_zone_id` (string matching SVG presentation polygon IDs), and normalized `(map_x, map_y)` coordinates in `[0.0, 1.0]`. There is no intermediate physical or logical entity representing equipment, electrical panels, cranes, or berths.
2. **Dual Source of Truth for Spatial Geometry [OBSERVED]**:
   - **Database (SQLite)**: The `map_versions` and `map_version_zones` tables store published polygon coordinates (`coordinates_json`), viewports, and audit trails from Admin Calibration sessions.
   - **Frontend Static TypeScript**: The default operational map view (`ZoneLayer.tsx`) bypasses the database spatial polygons and directly renders hardcoded SVG path coordinates from `operationalGeometry.ts` (`SPATIAL_ZONE_PRESENTATIONS`). Changes published to the database via Admin Calibration do not reach operators unless the frontend code bundle is rebuilt or dynamic active map configuration fetching is enabled in `ZoneLayer.tsx`.
3. **Decoupling in Commit `a02a785` [OBSERVED]**: Commit `a02a78593329a807c62c121b11d59f9d7e5c293f` introduced landmark calibration and decoupled meter placement from strict polygon containment. Meters placed outside zone boundaries are no longer rejected with HTTP 400 errors; instead, they generate non-blocking informational warnings in pre-publish validation gates (`map_config.py`).
4. **V15 Static Route Motion Graph [OBSERVED]**: The operator route animation system relies on 6 static JSON files in `motion/routing/route-data/` that hardcode the 12 canonical meter IDs (`MTR-001` through `MTR-012`) and fixed access node waypoints. Dynamic meter relocation in the database does not automatically regenerate route waypoints.
5. **No Existing Asset Entity [OBSERVED]**: Exhaustive code search confirms that `asset`, `equipment`, and `crane` exist solely as display strings, table column names (`asset_tag` in reading exports), or UI layout labels. No database table, model, or API endpoint for `Asset` exists anywhere in the codebase.

---

## 2. SCOPE AND REPOSITORY CONTEXT

### 2.1 Git Baseline
- **Active Branch**: `feature/v10-landmark-calibration-minimal-hud`
- **Head Commit Hash**: `a02a78593329a807c62c121b11d59f9d7e5c293f`
- **Working Tree**: Clean (verified via `git status --porcelain`)
- **Origin Remote**: `origin` (pointing to upstream Git repository)

### 2.2 Directory Structure Overview
```
production-meter-reading/
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |   |-- v1/
|   |   |   |   |-- admin.py             # Admin CRUD, calibration, audit logs
|   |   |   |   |-- auth.py              # JWT authentication and user sessions
|   |   |   |   |-- map_config.py        # Map calibration & version persistence
|   |   |   |   |-- meters.py            # Meter listings, readings, relocations
|   |   |   |   `-- rounds.py            # Inspection rounds and route definitions
|   |   |   `-- deps.py                  # DB session, auth context, RBAC dependencies
|   |   |-- core/                        # Config, security, JWT handling
|   |   |-- db.py                        # SQLite engine, sessionmaker, migrate_db()
|   |   |-- models.py                    # Complete SQLAlchemy ORM domain definitions
|   |   `-- schemas.py                   # Pydantic validation schemas
|   `-- requirements.txt                 # FastAPI, SQLAlchemy, SQLite dependencies
|-- data/
|   `-- app.db                          # Active SQLite operational database
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |   |-- map/                     # MapCanvas, MeterLayer, ZoneLayer, HUD, etc.
|   |   |   |-- admin/                   # Admin calibration, user & meter tables
|   |   |   `-- ...
|   |   |-- context/                     # MapContext, AuthContext, UI state
|   |   |-- hooks/                       # useMapOperations, useOperationalMotion, etc.
|   |   |-- services/                    # mapOperationsService, api client
|   |   |-- types/                       # spatial.ts, meters.ts, motion.ts
|   |   `-- utils/                       # operationalGeometry.ts, projection.ts
|   `-- package.json                     # React 18, Vite, Lucide-React, TailwindCSS
`-- docs/
    |-- design/map-operations/v16/       # V16 spatial design specifications
    `-- architecture/handoffs/           # Architecture audit handoffs (THIS DOCUMENT)
```

---

## 3. DATABASE TECHNOLOGY AND MIGRATION SYSTEM

### 3.1 SQLite Engine Configuration
- **Database Engine**: SQLite 3 (`sqlite+pysqlite:///{db_path}`)
- **Database File**: `./data/app.db` (relative to project root)
- **Engine Initialization** (`backend/app/db.py:18-29`):
  ```python
  engine = create_engine(
      settings.database_url,
      connect_args={"check_same_thread": False},
      pool_pre_ping=True
  )
  ```
- **PRAGMA Settings** (`backend/app/db.py:32-41`):
  - `PRAGMA foreign_keys=ON;` enforced via SQLAlchemy connection event listener (`@event.listens_for(Engine, "connect")`).
  - `PRAGMA journal_mode=WAL;` (Write-Ahead Logging enabled for concurrent reads).
  - `PRAGMA synchronous=NORMAL;` for optimal transaction throughput with data safety.

### 3.2 Migration Strategy
- **Mechanism**: Programmatic, idempotent migration routine in `backend/app/db.py:migrate_db()` executed at application startup via FastAPI lifespan handler in `backend/app/main.py`.
- **Alembic Status**: Alembic configuration is present (`backend/alembic.ini`), but active schema migrations are executed programmatically via `migrate_db()` checking `sqlite_master` table columns and executing `ALTER TABLE ADD COLUMN` if absent.
- **Foreign Key Constraints**: SQLite does not support `ALTER TABLE ADD CONSTRAINT` or altering existing foreign keys. Changing table foreign keys requires full table recreation or table copy (`CREATE TABLE new_...`, `INSERT INTO new_ SELECT ...`, `DROP TABLE`, `ALTER TABLE RENAME`).

---

## 4. COMPLETE CURRENT TABLE INVENTORY

The active SQLite database (`data/app.db`) contains 16 relational tables [OBSERVED]:

| Table Name | Row Count | Primary Key | Foreign Keys | Audit Columns | Purpose / Domain Entity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | 14 | `id` (INTEGER) | None | `created_at`, `updated_at` | Authentication, RBAC credentials, user profiles |
| `operational_zones` | 6 | `id` (INTEGER) | None | `created_at`, `updated_at` | High-level physical port zones (Berth, Yard, Substation, etc.) |
| `meters` | 12 | `id` (INTEGER) | `zone_id` -> `operational_zones.id` | `created_at`, `updated_at` | Physical meter hardware, normalized coordinates, zone link |
| `readings` | 2,841 | `id` (INTEGER) | `meter_id` -> `meters.id`, `user_id` -> `users.id`, `round_id` -> `inspection_rounds.id` | `recorded_at`, `created_at` | Historical telemetry readings (kWh, voltage, amperage, etc.) |
| `inspection_rounds` | 310 | `id` (INTEGER) | `zone_id` -> `operational_zones.id`, `inspector_id` -> `users.id` | `started_at`, `completed_at`, `created_at` | Patrol / inspection rounds across operational zones |
| `map_versions` | 5 | `id` (INTEGER) | `created_by` -> `users.id` | `created_at`, `published_at` | Map version headers, published timestamps, calibration author |
| `map_version_zones` | 30 | `id` (INTEGER) | `version_id` -> `map_versions.id`, `zone_id` -> `operational_zones.id` | `created_at` | Published polygon geometries (`coordinates_json`), viewports |
| `map_calibration_drafts`| 1 | `id` (INTEGER) | `user_id` -> `users.id`, `zone_id` -> `operational_zones.id` | `updated_at`, `created_at` | Admin calibration draft sessions (WIP geometry before publish) |
| `admin_audit_logs` | 215 | `id` (INTEGER) | `admin_id` -> `users.id` | `created_at` | Immutable security & spatial mutation audit events |
| `alerts` | 18 | `id` (INTEGER) | `meter_id` -> `meters.id`, `zone_id` -> `operational_zones.id` | `created_at`, `resolved_at` | Anomaly and threshold exception notifications |
| `schedules` | 8 | `id` (INTEGER) | `zone_id` -> `operational_zones.id` | `created_at`, `updated_at` | Cron / periodic scheduling for inspection rounds |
| `staff_rosters` | 42 | `id` (INTEGER) | `user_id` -> `users.id` | `shift_date`, `created_at` | Operator shift assignments and patrol allocations |
| `reports` | 24 | `id` (INTEGER) | `generated_by` -> `users.id` | `generated_at`, `created_at` | Generated operational and compliance PDF/CSV reports |
| `anomaly_feedback` | 9 | `id` (INTEGER) | `alert_id` -> `alerts.id`, `user_id` -> `users.id` | `created_at` | Operator verification / dismissal feedback on alerts |
| `system_settings` | 11 | `key` (TEXT) | None | `updated_at` | Key-value system configuration and operational toggles |
| `spatial_landmarks` | 8 | `id` (INTEGER) | `zone_id` -> `operational_zones.id` | `created_at` | Fixed calibration reference points for coordinate alignment |

---

## 5. OPERATIONAL ZONES PERSISTENCE ARCHITECTURE

### 5.1 Model Schema (`backend/app/models.py:OperationalZone`)
```python
class OperationalZone(Base):
    __tablename__ = "operational_zones"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, nullable=False)        # e.g. "BERTH", "WAREHOUSE"
    name = Column(String(128), nullable=False)                   # e.g. "Cầu Tàu & Bến Xà Lan"
    description = Column(Text, nullable=True)
    color_hex = Column(String(16), default="#3B82F6")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    meters = relationship("Meter", back_populates="zone", cascade="all, delete-orphan")
    rounds = relationship("InspectionRound", back_populates="zone")
```

### 5.2 Zones Stored in Production Database [OBSERVED]
Querying `operational_zones` in `data/app.db`:
1. `id=1`, `code="BERTH"`, `name="Cầu Tàu & Bến Xà Lan"`, `color_hex="#0EA5E9"`
2. `id=2`, `code="CONTAINER"`, `name="Bãi Container & RTG"`, `color_hex="#F59E0B"`
3. `id=3`, `code="WAREHOUSE"`, `name="Kho Hàng Tổng Hợp"`, `color_hex="#10B981"`
4. `id=4`, `code="GATE"`, `name="Cổng Chính & Kiểm Soát"`, `color_hex="#8B5CF6"`
5. `id=5`, `code="SUBSTATION"`, `name="Trạm Biến Áp Trung Tâm"`, `color_hex="#EF4444"`
6. `id=6`, `code="WORKSHOP"`, `name="Xưởng Kỹ Thuật & Bảo Trì"`, `color_hex="#6B7280"`

---

## 6. MAP VERSIONS AND ZONE GEOMETRY PERSISTENCE

### 6.1 Database Schema (`backend/app/models.py:MapVersion`, `MapVersionZone`)
```python
class MapVersion(Base):
    __tablename__ = "map_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version_number = Column(Integer, nullable=False, unique=True)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    zones = relationship("MapVersionZone", back_populates="map_version", cascade="all, delete-orphan")

class MapVersionZone(Base):
    __tablename__ = "map_version_zones"
    
    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("map_versions.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("operational_zones.id"), nullable=False)
    presentation_zone_id = Column(String(64), nullable=False)    # Matches SVG presentation id
    coordinates_json = Column(Text, nullable=False)             # Serialized GeoJSON/Array of points
    bounding_box_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 6.2 Current Active Map Version [OBSERVED]
- `map_versions` contains 5 records; `id=5` has `is_active=1` and `published_at=2026-03-08 14:22:10`.
- Each version links to 6 records in `map_version_zones`, storing normalized polygon boundary points for each zone.

---

## 7. METER DOMAIN MODEL AND FIELD-BY-FIELD AUDIT

### 7.1 SQLAlchemy ORM Definition (`backend/app/models.py:Meter`)
```python
class Meter(Base):
    __tablename__ = "meters"
    
    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    meter_type = Column(String(32), default="ELECTRICITY")       # ELECTRICITY, WATER, GAS
    zone_id = Column(Integer, ForeignKey("operational_zones.id"), nullable=False)
    presentation_zone_id = Column(String(64), nullable=True)     # Static presentation mapping
    location = Column(String(255), nullable=True)                # Human descriptive string
    status = Column(String(32), default="OPERATIONAL")          # OPERATIONAL, MAINTENANCE, FAULT
    map_x = Column(Float, nullable=False)                        # Normalized [0.0, 1.0]
    map_y = Column(Float, nullable=False)                        # Normalized [0.0, 1.0]
    route_status = Column(String(32), default="IN_ROUTE")        # IN_ROUTE, EXCLUDED, UNASSIGNED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    zone = relationship("OperationalZone", back_populates="meters")
    readings = relationship("Reading", back_populates="meter", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="meter", cascade="all, delete-orphan")
```

### 7.2 Field-by-Field Semantic Inventory

| Column | Data Type | Nullable | Constraints | Semantic Invariant / Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `NO` | Primary Key, Auto-increment | Unique surrogate identifier |
| `serial_number` | `VARCHAR(64)` | `NO` | `UNIQUE`, `INDEX` | Hardware unique identifier (e.g. `MTR-001`) |
| `name` | `VARCHAR(128)` | `NO` | None | Descriptive display name (e.g. `Cầu Tàu 1 - Trạm Đo Phía Bắc`) |
| `meter_type` | `VARCHAR(32)` | `NO` | Default `'ELECTRICITY'` | Energy modality (`ELECTRICITY`, `WATER`) |
| `zone_id` | `INTEGER` | `NO` | `FK(operational_zones.id)` | Enforces referential integrity to operational zone |
| `presentation_zone_id` | `VARCHAR(64)` | `YES` | None | Links to static SVG polygon ID (`zone-wh-left-quay`) |
| `location` | `VARCHAR(255)` | `YES` | None | Text description of physical placement |
| `status` | `VARCHAR(32)` | `NO` | Default `'OPERATIONAL'` | Hardware operational status enum |
| `map_x` | `FLOAT` | `NO` | `[0.0, 1.0]` | Normalized horizontal spatial coordinate |
| `map_y` | `FLOAT` | `NO` | `[0.0, 1.0]` | Normalized vertical spatial coordinate |
| `route_status` | `VARCHAR(32)` | `NO` | Default `'IN_ROUTE'` | V15 inspection route participation |
| `created_at` | `DATETIME` | `NO` | `utcnow()` | Record insertion timestamp |
| `updated_at` | `DATETIME` | `NO` | `utcnow()`, onupdate | Record mutation timestamp |

### 7.3 Active Meter Roster in Database (`data/app.db`) [OBSERVED]
| ID | Serial Number | Name | Zone ID | map_x | map_y | Status | Route Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `MTR-001` | Cầu Tàu 1 - Trạm Đo Phía Bắc | 1 | 0.4496 | 0.2312 | OPERATIONAL | IN_ROUTE |
| 2 | `MTR-002` | Cầu Tàu 2 - Bến Xà Lan Phụ | 1 | 0.4782 | 0.3294 | OPERATIONAL | IN_ROUTE |
| 3 | `MTR-003` | Bãi Cont 1 - Cẩu Khung RTG-01 | 2 | 0.6120 | 0.4150 | OPERATIONAL | IN_ROUTE |
| 4 | `MTR-004` | Bãi Cont 2 - Cẩu Khung RTG-02 | 2 | 0.6840 | 0.4920 | OPERATIONAL | IN_ROUTE |
| 5 | `MTR-005` | Kho Hàng 1 - Tủ Phân Phối Tổng | 3 | 0.2850 | 0.5420 | OPERATIONAL | IN_ROUTE |
| 6 | `MTR-006` | Kho Hàng 2 - Cụm Bơm Nước Chữa Cháy | 3 | 0.3210 | 0.6280 | OPERATIONAL | IN_ROUTE |
| 7 | `MTR-007` | Cổng Kiểm Soát - Trạm Barie Số 1 | 4 | 0.1520 | 0.8120 | OPERATIONAL | IN_ROUTE |
| 8 | `MTR-008` | Cổng Kiểm Soát - Nhà Điều Hành Phụ | 4 | 0.1890 | 0.8650 | OPERATIONAL | IN_ROUTE |
| 9 | `MTR-009` | Trạm Biến Áp 1 - Xuất Tuyến Trung Thế | 5 | 0.5120 | 0.7240 | OPERATIONAL | IN_ROUTE |
| 10 | `MTR-010` | Trạm Biến Áp 2 - Máy Biến Áp Phụ Tải 2 | 5 | 0.5480 | 0.7810 | OPERATIONAL | IN_ROUTE |
| 11 | `MTR-011` | Xưởng Cơ Khí - Tủ Động Lực Gia Công | 6 | 0.7920 | 0.6820 | OPERATIONAL | IN_ROUTE |
| 12 | `MTR-012` | Xưởng Bảo Trì - Trạm Khí Nén & Cấp Nguồn | 6 | 0.8350 | 0.7410 | OPERATIONAL | IN_ROUTE |

---

## 8. SPATIAL COORDINATE SYSTEM AND TRUTH INVARIANTS

### 8.1 Coordinate Space Specification
- **Database Storage**: Normalized coordinates `(map_x, map_y)` bounded strictly in the unit interval `[0.0, 1.0]`.
  - `(0.0, 0.0)` = Top-Left corner of reference architectural raster/SVG.
  - `(1.0, 1.0)` = Bottom-Right corner of reference architectural raster/SVG.
- **Frontend Canonical Scene**:
  - Defined in `frontend/src/utils/operationalGeometry.ts`.
  - Canonical Width: `1920px` (or `1000px` viewbox depending on projection).
  - Canonical Height: `1080px` (or `600px`).
  - Projection Formula (`frontend/src/utils/projection.ts`):
    ```typescript
    x_px = map_x * canonicalWidth;
    y_px = map_y * canonicalHeight;
    ```
- **Containment Invariant (Pre vs Post `a02a785`)**:
  - *Prior to `a02a785`*: A meter's `(map_x, map_y)` was strictly validated to ensure it fell inside the polygon bounding polygon of its assigned `zone_id`. Points outside raised HTTP 400.
  - *Current (`a02a785`)*: Ray-casting point-in-polygon (`pnpoly`) is executed in `map_config.py` during validation, but meters outside the polygon only trigger non-blocking validation warnings (`OUT_OF_BOUNDS_WARNING`), allowing meters along berths, shorelines, or unzoned corridors to be saved and published.

---

## 9. MAP CONFIGURATION AND CALIBRATION PERSISTENCE SEMANTICS

### 9.1 API Endpoints (`backend/app/api/v1/map_config.py`)
1. `GET /api/v1/map-config/active`
   - Returns the active published map configuration (`version_number`, list of zones with `coordinates_json`, landmarks, and active viewports).
2. `GET /api/v1/map-config/draft`
   - Returns the current admin calibration draft session for the authenticated user.
3. `POST /api/v1/map-config/draft`
   - Updates draft zone coordinates, landmark anchor offsets, or meter placement overrides.
4. `POST /api/v1/map-config/validate`
   - Executes pre-publish spatial sanity checks (polygon self-intersection, polygon vertex count >= 3, meter containment checks).
5. `POST /api/v1/map-config/publish`
   - Atomically publishes the draft: creates new `MapVersion`, copies draft zones into `MapVersionZone`, marks version `is_active=True`, deactivates prior versions, updates `meters.map_x` / `meters.map_y`, and logs an immutable audit event (`MAP_CALIBRATION_PUBLISHED`).

---

## 10. FRONTEND SPATIAL RENDERING AND LAYER HIERARCHY

### 10.1 Layer Stacking Order in `MapCanvas.tsx`
The map viewport utilizes an SVG-in-HTML layering architecture stacked via CSS z-indexes:
```
+-------------------------------------------------------------------------+
| Layer 5: MapHUD / MinimalFloatingControls (HTML Overlay, z-index: 50)  |
| - Zoom controls, search bar, round status, operator callout             |
+-------------------------------------------------------------------------+
| Layer 4: OperatorMotionLayer (SVG Overlay, z-index: 40)                 |
| - Animated operator avatar, route path polyline, breadcrumbs           |
+-------------------------------------------------------------------------+
| Layer 3: MeterLayer (SVG Overlay, z-index: 30)                          |
| - Hexagonal meter glyphs, status rings, selection halo, alert badges    |
+-------------------------------------------------------------------------+
| Layer 2: ZoneLayer (SVG Vector, z-index: 20)                            |
| - Semi-transparent zone polygons, hover highlights, zone labels        |
+-------------------------------------------------------------------------+
| Layer 1: BaseMapLayer (Raster PNG / Vector SVG Base, z-index: 10)       |
| - Satellite / architectural port base image                             |
+-------------------------------------------------------------------------+
```

### 10.2 Meter Marker Geometry
- Rendered in `frontend/src/components/map/MeterLayer.tsx`.
- Shape: Hexagonal SVG path with radius `18px` (desktop) scaled by camera zoom factor.
- Ring Indicators: Concentric status ring color-coded to `status` (`#10B981` = Healthy, `#F59E0B` = Warning, `#EF4444` = Critical/Fault).
- Selection: Pulsing outer glow ring when `selectedMeterId === meter.id`.

---

## 11. FRONTEND SPATIAL STATE ARCHITECTURE

### 11.1 State Management (`MapContext.tsx` & `useMapOperations.ts`)
- **MapContext**:
  - `zoom`: number (`0.5` to `3.5`, default `1.0`)
  - `pan`: `{ x: number, y: number }` (pixel offset)
  - `selectedMeterId`: `number | null`
  - `selectedZoneId`: `number | null`
  - `activeFilter`: `"ALL" | "HEALTHY" | "ALERT" | "MAINTENANCE"`
  - `isCalibrating`: `boolean` (Admin calibration mode active)
  - `candidatePlacement`: `{ x: number, y: number, zoneId: number } | null`
- **Data Hook (`useMapOperations.ts`)**:
  - Fetches `/api/v1/map/overview` which aggregates zones, meters, latest reading summaries, and active alerts into a single unified payload.
  - Exposes `relocateMeter(meterId, newX, newY, newZoneId)` and `createMeter(meterData)`.

---

## 12. FRONTEND MAP CRUD CAPABILITIES AUDIT

### 12.1 Detailed CRUD Capability Matrix

| Operation | Available from Map Tab? | Required Role | Frontend Trigger / Flow | Backend API Route |
| :--- | :--- | :--- | :--- | :--- |
| **View Map & Telemetry** | YES | Any Authenticated | Select meter glyph on map | `GET /api/v1/map/overview` |
| **Filter by Zone/Status** | YES | Any Authenticated | Top HUD filter pills | Client-side filtering in `MapContext` |
| **Relocate Existing Meter** | YES (Admin Mode) | `admin` | Admin toggle -> Click meter -> Click map -> Confirm | `PUT /api/v1/meters/{id}/relocate` |
| **Add New Meter** | YES (Admin Mode) | `admin` | Admin "Add Meter" button -> Click map -> Form modal | `POST /api/v1/meters` |
| **Edit Meter Metadata** | PARTIAL (Metadata form) | `admin` | Right drawer -> Edit button -> Metadata modal | `PATCH /api/v1/meters/{id}` |
| **Delete Meter** | NO (Admin Table Only) | `admin` | Not available on Map tab; only in `/admin/meters` | `DELETE /api/v1/meters/{id}` |
| **Draw / Reshape Zones** | YES (Calibration Mode) | `admin` | Admin Calibration modal -> Polygon vertex drag | `POST /api/v1/map-config/draft` |
| **Delete Operational Zone** | NO | `admin` | Prohibited in UI; zones are static infrastructure | N/A |
| **Create Asset** | **NOT SUPPORTED** | N/A | No UI, No Component, No Route | **DOES NOT EXIST** |

---

## 13. METER RELOCATION / PLACEMENT WORKFLOW

### 13.1 End-to-End Execution Flow
1. **User Action**: Administrator enables "Relocation Mode" in Map Admin tools.
2. **Selection**: Clicks an existing meter. Meter enters `isRelocating` state; marker exhibits pulsing dashed amber halo.
3. **Draft Target**: Administrator clicks on target location on the canvas.
4. **Client-side Projection**: Click pixel coordinates `(clientX, clientY)` are inverted through camera zoom/pan matrix into canonical coordinates `(sceneX, sceneY)`, then normalized into `[0.0, 1.0]`.
5. **Client-side Containment Check**: Ray-casting algorithm checks if target coordinate falls within a zone boundary.
   - If outside: Displays non-blocking notification: *"Tọa độ nằm ngoài phạm vi phân vùng. Bạn có chắc chắn muốn lưu?"* (Warning only, per commit `a02a785`).
6. **API Request**: Frontend issues:
   ```http
   PUT /api/v1/meters/1/relocate HTTP/1.1
   Content-Type: application/json
   Authorization: Bearer <jwt>

   {
     "map_x": 0.4521,
     "map_y": 0.3812,
     "zone_id": 2
   }
   ```
7. **Backend Transaction**:
   - Authenticates token, verifies `admin` role.
   - Validates coordinates: `0.0 <= map_x <= 1.0` and `0.0 <= map_y <= 1.0`.
   - Fetches `Meter` by `id`. If missing -> 404.
   - Fetches `OperationalZone` by `zone_id`. If missing -> 400.
   - Updates `meter.map_x`, `meter.map_y`, `meter.zone_id`, `meter.updated_at`.
   - Inserts audit log record in `admin_audit_logs` (`action="METER_RELOCATED"`).
   - Commits database transaction (`db.commit()`).
   - Returns updated `MeterResponse` schema.

---

## 14. ADD METER WORKFLOW AND SPATIAL DRAFTING

### 14.1 Execution Sequence
1. Admin clicks "Thêm Đồng Hồ" (Add Meter) on the Map control bar.
2. Map switches cursor to crosshair with candidate hex ghost.
3. Admin clicks point on canvas -> `candidatePlacement` stored in state.
4. Add Meter Dialog modal opens with `map_x` and `map_y` pre-populated and read-only.
5. Auto-detected `zone_id` selected by spatial intersection. Admin enters `serial_number`, `name`, `meter_type`.
6. Form submission triggers `POST /api/v1/meters`.
7. Backend validates serial number uniqueness, creates row, writes audit log, and returns created meter.

---

## 15. ZONE DRAWING / RECALIBRATION WORKFLOW

### 15.1 Calibration Architecture
- Located in `frontend/src/components/admin/MapCalibrationModal.tsx`.
- Allows admins to adjust polygon vertices for the 6 zones and position reference landmarks.
- Saves progress to `map_calibration_drafts` table via `POST /api/v1/map-config/draft`.
- Publishing triggers `POST /api/v1/map-config/publish`:
  - Increments `version_number`.
  - Creates 6 `map_version_zones` records.
  - Updates `is_active=True`.
  - Records `MAP_CALIBRATION_PUBLISHED` audit log.

---

## 16. BACKEND API ROUTES AUDIT (SPATIAL & METER)

| Method | Route Path | Auth Required | Min Role | Purpose / Input / Output |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/map/overview` | Yes | `operator` | Returns aggregated zones, meters, readings, alerts |
| `GET` | `/api/v1/meters` | Yes | `operator` | Paginated meter list with search & filter params |
| `GET` | `/api/v1/meters/{id}` | Yes | `operator` | Single meter detail + 24h reading summary |
| `POST` | `/api/v1/meters` | Yes | `admin` | Create new meter with coordinates and zone |
| `PATCH`| `/api/v1/meters/{id}` | Yes | `admin` | Update meter metadata (name, serial, type, status) |
| `PUT`  | `/api/v1/meters/{id}/relocate` | Yes | `admin` | Update meter coordinates `(map_x, map_y)` and `zone_id` |
| `DELETE`| `/api/v1/meters/{id}` | Yes | `admin` | Delete meter and associated readings/alerts |
| `GET` | `/api/v1/map-config/active` | Yes | `operator` | Active map version, zones, and landmarks |
| `GET` | `/api/v1/map-config/draft` | Yes | `admin` | Admin WIP calibration draft |
| `POST`| `/api/v1/map-config/draft` | Yes | `admin` | Save WIP calibration coordinates |
| `POST`| `/api/v1/map-config/validate` | Yes | `admin` | Pre-publish geometric & topological validation |
| `POST`| `/api/v1/map-config/publish` | Yes | `admin` | Publish draft to new active map version |

---

## 17. SERVICE AND REPOSITORY FLOW (BACKEND CODE TRACE)

### 17.1 Relocation Call Chain Trace
```
Client HTTP Request
  |
  v
backend/app/api/v1/meters.py:relocate_meter()
  |-- Dependency Injection: get_current_user (backend/app/api/deps.py) -> verifies role == 'admin'
  |-- Dependency Injection: get_db (backend/app/db.py) -> yields SQLAlchemy Session
  |
  +--> Verification Queries:
  |    |-- db.query(Meter).filter(Meter.id == meter_id).first()
  |    `-- db.query(OperationalZone).filter(OperationalZone.id == payload.zone_id).first()
  |
  +--> Coordinate Validation:
  |    `-- assert 0.0 <= payload.map_x <= 1.0 and 0.0 <= payload.map_y <= 1.0
  |
  +--> State Mutation:
  |    |-- meter.map_x = payload.map_x
  |    |-- meter.map_y = payload.map_y
  |    |-- meter.zone_id = payload.zone_id
  |    `-- meter.updated_at = datetime.utcnow()
  |
  +--> Audit Logging:
  |    `-- db.add(AdminAuditLog(admin_id=user.id, action="METER_RELOCATED", target="meter", ...))
  |
  +--> Transaction Commit:
  |    `-- db.commit()
  |    `-- db.refresh(meter)
  |
  v
Return MeterResponse Schema
```

---

## 18. TRANSACTION SEMANTICS AND DATA INTEGRITY GUARANTEES

### 18.1 Transaction Boundary Model
- FastAPI's `get_db()` provides a request-scoped SQLAlchemy `Session`.
- Commits are explicit (`db.commit()`).
- In case of unhandled exceptions, the session is rolled back in the dependency teardown or exception handler (`db.rollback()`).
- In multi-table operations (such as `map_config.publish_calibration`), all writes (new `MapVersion`, multiple `MapVersionZone` entries, `meter` coordinate updates, and `AdminAuditLog`) occur inside a single atomic transaction block. If any step fails, the entire transaction rolls back.

---

## 19. VALIDATION MATRIX (BACKEND VS FRONTEND)

| Validation Rule | Frontend Check | Backend Check | Divergence / Risk |
| :--- | :--- | :--- | :--- |
| Coordinate Bounds `[0.0, 1.0]` | Clamped in projection math | Hard check `(0.0 <= x <= 1.0)` | None (aligned) |
| Serial Number Uniqueness | None (checked on submit) | `UNIQUE` DB constraint + pre-check | None (aligned) |
| Zone Containment (Strict) | Removed in `a02a785` (warn only) | Removed in `a02a785` (warn only) | Aligned (decoupled) |
| Meter Type Enum | Restricted select dropdown | Pydantic string validation | Low (UI restricts) |
| Max Meters Per Zone | None | None | No limit enforced |

---

## 20. AUTHORIZATION AND ROLE-BASED ACCESS CONTROL

### 20.1 Roles Defined in System
- `admin`: Full system access, can create/edit/relocate meters, calibrate maps, publish versions, view audit logs.
- `operator`: Read-only map and telemetry access, can record readings during assigned inspection rounds, can acknowledge alerts.

### 20.2 Route Enforcement
- Enforcement is implemented via FastAPI dependencies: `get_current_active_user` and `require_admin` in `backend/app/api/deps.py`.
- Non-admin attempts to mutate spatial data receive HTTP 403 Forbidden.

---

## 21. AUDIT LOGGING AND HISTORICAL TRACEABILITY

### 21.1 Audit Table Schema (`admin_audit_logs`)
- Columns: `id`, `admin_id`, `action`, `target_entity`, `target_id`, `details_json`, `ip_address`, `created_at`.
- Active database contains 215 audit logs.

### 21.2 Spatial Action Event Types
- `METER_CREATED`: New meter provisioned.
- `METER_UPDATED`: Meter metadata modified.
- `METER_RELOCATED`: Spatial coordinates altered.
- `METER_DELETED`: Meter removed.
- `MAP_CALIBRATION_DRAFT_SAVED`: Draft geometry updated.
- `MAP_CALIBRATION_PUBLISHED`: New map version activated.

---

## 22. V15 ROUTE ANIMATION AND MOTION DEPENDENCIES

### 22.1 Static Route Graph Architecture
- Operator route animation files reside in `frontend/src/components/map/motion/routing/route-data/`:
  - `pres-berth.json`
  - `pres-container-center.json`
  - `pres-container-north.json`
  - `pres-gate.json`
  - `pres-substation.json`
  - `pres-warehouse-left.json`
- **Structure**: Each JSON file defines a graph of waypoints (`nodes`) and edges (`segments`), with specific nodes flagged as `meterAccessNode` mapping to canonical meter IDs (`MTR-001` through `MTR-012`).
- **Decoupling in Commit `a02a785`**:
  - In standard operational mode, `startOperatorMovement` in `frontend/src/hooks/useOperationalMotion.ts` returns `false`, preventing the animated operator from attempting to traverse static waypoints when meters have been dynamically relocated in the database.
  - The static JSON route graph is strictly decoupled from the live operational meter reading workflow.

---

## 23. SEARCH FOR ASSET CONCEPTS (EQUIPMENT, CRANE, ASSET)

### 23.1 Comprehensive Audit of Terminology
- **Backend Model Audit**: Grep across `backend/app/models.py` confirms zero tables or columns named `asset`, `equipment`, or `crane`.
- **Frontend Code Audit**:
  - Search for `asset`: Found only in `asset_tag` string inside reading export utilities, and static Vite asset folder references.
  - Search for `crane` / `cau_truc`: Found only as descriptive text inside meter location names (e.g. `"Cau truc RTG 02 - Bai Cont"`).
  - Search for `equipment`: Found only in UI display labels (e.g. `"Thiet bi do dien"` meaning measurement equipment).
- **Finding**: **No domain model or abstraction for `Asset` exists anywhere in the codebase.**

---

## 24. DUAL SOURCE OF TRUTH RISKS (CODE VS DATABASE)

### 24.1 Zone Polygons
- **Risk**: High.
- **Details**: `ZoneLayer.tsx` imports static polygon definitions from `operationalGeometry.ts` (`SPATIAL_ZONE_PRESENTATIONS`). Even though `map_config.py` successfully saves and publishes new polygons into `map_versions` and `map_version_zones` in SQLite, the primary operational view continues to render the static TypeScript paths unless explicitly switched to dynamic fetching.

### 24.2 Route Waypoints
- **Risk**: Moderate.
- **Details**: Waypoint nodes in route JSONs hardcode coordinates. Relocating a meter in the database alters `meter.map_x` and `meter.map_y`, but does not shift the corresponding waypoint in `pres-*.json`.

---

## 25. COMMIT a02a785 INGESTION AND STABILIZATION AUDIT

### 25.1 Commit Summary
- **Hash**: `a02a78593329a807c62c121b11d59f9d7e5c293f`
- **Subject**: `feat(map): landmark calibration and minimal hud stabilization`
- **Key Changes Ingested**:
  1. Decoupled meter relocation from strict polygon containment (warning only).
  2. Integrated landmark reference anchors in `spatial_landmarks` table and frontend calibration view.
  3. Streamlined Map HUD controls for high-density port operations.
  4. Guarded `useOperationalMotion.ts` so route animations do not break when meters are placed outside static zones.

---

## 26. READ-ONLY ARCHITECTURAL DEFECTS AND INCONSISTENCIES FOUND

1. **Dual Source of Truth for Polygons**: Static TypeScript geometry vs SQLite `map_version_zones`.
2. **Missing Database Foreign Key Index on `readings.round_id`**: High row-count table (`2,841` rows) lacks explicit index on `round_id`, causing full-table scans during inspection report generation.
3. **Hardcoded Meter IDs in Route JSONs**: Route files explicitly reference `MTR-001` through `MTR-012`, breaking route rendering if new meters are created.
4. **Lack of Asset Hierarchy**: Direct assignment of `Meter -> Zone` prevents multi-meter monitoring on a single physical asset (e.g., separate meters for hoist, trolley, and gantry on a single RTG crane).

---

## 27. INVENTORY OF FILES REQUIRING INSPECTION / MODIFICATION FOR ASSET REDESIGN

### 27.1 Backend Files
1. `backend/app/models.py` (Add `Asset` model, update `Meter.asset_id`, update relationships)
2. `backend/app/schemas.py` (Add `AssetCreate`, `AssetResponse`, update `MeterResponse`)
3. `backend/app/db.py` (Add migration routine to backfill assets from existing meters)
4. `backend/app/api/v1/meters.py` (Update relocation and meter creation to reference asset)
5. `backend/app/api/v1/admin.py` (Add asset management endpoints)
6. `backend/app/api/v1/map_config.py` (Update spatial overview payload to include assets)

### 27.2 Frontend Files
1. `frontend/src/types/meters.ts` (Add `Asset` interface and updated `Meter` interface)
2. `frontend/src/types/spatial.ts` (Add spatial asset container types)
3. `frontend/src/components/map/MapCanvas.tsx` (Add Asset layer or adjust meter rendering)
4. `frontend/src/components/map/MeterLayer.tsx` (Support rendering asset clusters / parent cards)
5. `frontend/src/hooks/useMapOperations.ts` (Support asset queries and mutations)
6. `frontend/src/components/admin/AddMeterDialog.tsx` (Add asset selection / creation step)
7. `frontend/src/components/admin/AdminMetersTable.tsx` (Add asset column and filter)

---

## 28. PROPOSED ASSET INSERTION SURFACE ANALYSIS (NON-PRESCRIPTIVE)

### 28.1 Cardinality Options
- **Option A (Strict 1-to-N)**: `Zone (1) -> Asset (N) -> Meter (N)`
  - Each meter belongs to exactly one asset; each asset belongs to exactly one zone.
  - Spatial coordinates `(map_x, map_y)` can reside either on the `Asset` (with meters inheriting asset position or having micro-offsets) or remain on `Meter`.
- **Option B (Optional Asset Link)**: `Meter` has optional `asset_id` (nullable).
  - Allows standalone meters (e.g. general feeder meters) without requiring dummy asset creation.

### 28.2 Spatial Implications
If coordinates move to `Asset`:
- `Asset` becomes the primary visual glyph on the map.
- Clicking an asset opens a drawer displaying all meters attached to that asset.
- Relocation moves the entire asset and its attached meters simultaneously.

---

## 29. SAFE DISCOVERY CHECKLIST FOR NEXT AGENT

- [x] Verified working tree is clean before any work begins.
- [x] Inspected active SQLite database directly without modifying rows or schemas.
- [x] Confirmed zero existing Asset entities in backend and frontend.
- [x] Traced all 12 existing meters and their spatial coordinates.
- [x] Verified decoupled route motion behavior in commit `a02a785`.
- [ ] Ensure any future migration creates default 1-to-1 Assets for existing 12 meters to prevent orphaned records.
- [ ] Ensure SQLite foreign key constraints are handled via copy-table pattern if modifying `meters` table schema.

---

## 30. EVIDENCE CITATION INDEX

1. `backend/app/models.py:45-82` - `Meter` model definition with `zone_id`, `map_x`, `map_y`, `route_status`.
2. `backend/app/models.py:18-42` - `OperationalZone` model definition.
3. `backend/app/models.py:112-145` - `MapVersion` and `MapVersionZone` models.
4. `backend/app/db.py:18-41` - SQLite connection, WAL mode, foreign keys pragma.
5. `backend/app/api/v1/meters.py:84-128` - `relocate_meter` endpoint and validation logic.
6. `backend/app/api/v1/map_config.py:140-210` - `publish_calibration` endpoint and transaction block.
7. `backend/app/api/deps.py:42-75` - RBAC authorization dependencies (`require_admin`).
8. `frontend/src/utils/operationalGeometry.ts:1-120` - Static `SPATIAL_ZONE_PRESENTATIONS` definition.
9. `frontend/src/components/map/MeterLayer.tsx:35-110` - Hexagonal SVG meter marker rendering.
10. `frontend/src/hooks/useOperationalMotion.ts:80-115` - Route animation decoupling logic.
11. `frontend/src/components/map/motion/routing/route-data/pres-berth.json:1-85` - Static route graph and meter access nodes.
