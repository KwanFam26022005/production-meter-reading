# V16E-A0: Current Data Gaps & Missing Evidence Audit

**Audit Timestamp:** 2026-09-16T02:18:45Z  
**Branch:** `feature/v10-landmark-calibration-minimal-hud`  
**Git Commit HEAD:** `e959b745ebda0d436ed43588d41224ec3a3e17ed`  
**Scope:** Identifying all informational voids, unverified entities, and missing physical evidence across the system.

---

## 1. Executive Summary of Data Gaps

While the database maintains 364 asset rows and 12 meter rows, the majority of records lack physical field verification, hardware serial tags, spatial coordinates, and engineering drawings.

```
Total Assets (364)
  ├── Verified: 105 (28.8%)
  └── UNVERIFIED GAPS: 259 (71.2%)

Spatial Coverage of Assets (364)
  ├── With Coordinates: 30 (8.2%)
  └── MISSING POSITION GAPS: 334 (91.8%)

Meter Hardware Identity (12)
  ├── Serial Number Recorded: 0 (0.0%)
  └── MISSING SERIAL GAPS: 12 (100.0%)

Meter Utility & Method Specification (12)
  ├── Specified: 1 (8.3%)
  └── UNKNOWN SPECIFICATION GAPS: 11 (91.7%)
```

---

## 2. Detailed Gap Categorization

### 2.1 Hardware Identity & Physical Nameplates (Meters)
- **Zero Serial Numbers:** None of the 12 meters in `meters` possess a manufacturer serial number, MAC address, or factory identification string. They exist purely as logical handles (`CT-001` through `CT-012`).
- **Missing Electrical Specifications:** Rated voltage ($220\text{V} / 380\text{V}$), CT/PT transformation ratio (e.g., $100/5\text{A}$ multiplier), phase count (single-phase vs 3-phase), and pulse constant ($\text{imp/kWh}$) are absent from all meter records.
- **Physical Cabinet Information:** None of the meters specify their physical enclosure or cabinet number (e.g., "Tủ phân phối MSB-01, Ngăn số 3").

### 2.2 Unverified Asset Inventory
- **259 Assets Awaiting Verification:** Out of 364 assets, 259 ($71.2\%$) remain in `UNVERIFIED` status. These include discovered transformers, high-mast lighting towers, reefers, and water distribution branches.
- **Spatial Blindspots:** Exactly **334 assets ($91.8\%$)** have `map_x = NULL` and `map_y = NULL`. They exist only as abstract database rows and cannot be rendered on the spatial terminal map until calibrated.

### 2.3 Relational & Mounting Ambiguities
- **Missing `INSTALLED_AT` for 10 Meters:** For meters `CT-003` through `CT-012`, there is **no `INSTALLED_AT` relation** recorded. The system knows where they are roughly plotted on the map, but has zero record of which physical switchboard, pillar, or wall they are physically bolted to.
- **54 Unverified Relations:** Of the 90 active meter-asset relations, 54 ($60.0\%$) are `UNVERIFIED` candidate proposals without human engineering signoff.

### 2.4 Physical Evidence Voids (`verification_evidences`)
- **Zero Meter Installation Photos:** While `meter_reading_evidence` contains reading dial crops, `verification_evidences` contains **zero field installation photos** showing the meter in context within its switchboard enclosure.
- **Zero Electrical Single-Line Diagrams (SLD):** No verified single-line diagram PDF or schematic reference is attached to substantiate the 95 electrical connections.
- **Zero Water Network Schematics:** The 7 water connections rely on manual seed data without attached piping and instrumentation diagrams (P&ID).

---

## 3. Recommended Remediation Roadmap

1. **Conduct Field Nameplate Audit:** Photograph nameplates and record manufacturer serial numbers, CT ratios, and physical cabinet IDs for all 12 meters.
2. **Batch Clean Candidate Test Relations:** Purge synthetic `DISCOVERY_PROPOSAL` relations attached to `CT-001` and `CT-002` while preserving reading history.
3. **Map Survey for 334 Assets:** Capture GPS or high-resolution orthomosaic coordinates for substations, high-masts, and pump houses to populate `map_x` and `map_y`.
4. **Attach Evidence References:** Link engineering SLD drawings to substations and verification records in `verification_evidences`.
