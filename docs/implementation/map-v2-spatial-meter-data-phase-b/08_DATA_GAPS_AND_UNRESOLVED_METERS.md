# 08 — Data Gaps & Unresolved Meters Roadmap

**Scope:** Formal inventory of unverified meters, missing spatial coordinates, and deferred architectural decisions.

---

## 1. Unverified Spatial Coordinates Gap

Our audit confirms that **0 meters currently in SQLite possess verified physical ground truth coordinates for Map V2**:

1. **Legacy Simulation Meters (`CT-001` .. `CT-012`):**
   - Currently retired (`lifecycle_status = 'RETIRED'`).
   - Defined in legacy Map V1 normalized space (1915 × 821).
   - In Map V2 space (1536 × 1024), 100% of these meters land outside their assigned presentation polygons.
   - Status: Kept in manifest as `verified: false, map_x: null, map_y: null`.

2. **Active Scenario Meters (`SIM-EM-001` .. `SIM-WM-004`):**
   - Active in scenario `tan-thuan-demo-v1`.
   - Defined on simulated B2 utility topology nodes (`utilityDemoLayout.ts`).
   - The B2 coordinates are simulation display waypoints, not verified physical infrastructure.
   - Status: Kept in manifest as `verified: false, map_x: null, map_y: null`.

3. **Field Real Meters:**
   - When operational staff create real administrative meters in the database without coordinates, they trigger the `"Chưa xác định vị trí trên Map V2"` non-blocking notice.
   - They remain searchable via `Ctrl+K` and inspectable in the Operations Portal.

---

## 2. Deferred Business & Schema Gaps

### BD-02: Measurement Unit Gap
- **Finding:** The database currently stores raw numerical readings without an authoritative unit column (`kWh`, `kvarh`, `m³`) on `Meter` or `MapMeterOut`.
- **Status in Thread 8A:** Strictly preserved without heuristic inference.
- **Handover to Thread 8B:** Propose schema migration adding `measurement_unit VARCHAR(16)` and `multiplier FLOAT DEFAULT 1.0` to the `meters` table.

### BD-05: Round Progress Denominator
- **Finding:** The denominator for single-round progress calculation requires business committee sign-off on whether it represents all active port meters or meters scheduled for that specific round.
- **Status in Thread 8A:** Preserved single-round explicit text: `"Đã ghi X / Y công tơ trong lượt"`.

---

## 3. Data Ingestion Roadmap for Port Operations

When port engineering provides verified physical coordinates (via AutoCAD DWG or on-site GPS calibration):
1. **Input Generation**: Export coordinates to a staging manifest (`config/map_v2_meter_coordinate_seed.json`).
2. **Provenance Attachment**: Populate `source = "cad_engineering_survey"` and `source_reference = "DWG-PORT-2026-X"`.
3. **Set Verification**: Set `verified = true` only for confirmed physical meters.
4. **Validation & Dry-Run**: Run `python scripts/seed_meter_spatial_data.py --dry-run` to inspect point-in-polygon compliance.
5. **Execution**: Run `python scripts/seed_meter_spatial_data.py --apply`.
6. **Audit Confirmation**: Run `python scripts/audit_meter_spatial_data.py` to regenerate CSV and JSON audit artifacts.
