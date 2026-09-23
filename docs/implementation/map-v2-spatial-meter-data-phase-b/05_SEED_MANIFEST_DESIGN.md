# 05 — Seed Manifest Design & Governance Model

**Manifest Path:** `config/map_v2_meter_coordinate_seed.json`  
**Schema Version:** `1.0`  
**Canonical Map:** `frontend/src/components/map-v2/data/tan_thuan_1_zones_edited.json`  

---

## 1. Architectural Purpose

The Seed Manifest acts as an **auditable, version-controlled bridge** between raw engineering CAD surveys / field audits and the production database. It prevents ad-hoc database updates, enforces provenance tracking, and mandates spatial validation prior to persistence.

---

## 2. JSON Schema Specification

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SaigonPortMapV2MeterCoordinateSeedManifest",
  "type": "object",
  "required": ["version", "canonical_map", "coordinate_system", "meters"],
  "properties": {
    "version": { "type": "string", "example": "1.0" },
    "canonical_map": { "type": "string", "example": "tan_thuan_1_zones_edited.json" },
    "coordinate_system": {
      "type": "object",
      "required": ["width", "height", "origin", "unit"],
      "properties": {
        "width": { "type": "integer", "const": 1536 },
        "height": { "type": "integer", "const": 1024 },
        "origin": { "type": "string", "const": "top-left" },
        "unit": { "type": "string", "const": "image-pixels" }
      }
    },
    "meters": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["meter_code", "map_x", "map_y", "source", "source_reference", "verified", "notes"],
        "properties": {
          "meter_code": { "type": "string" },
          "map_x": { "type": ["number", "null"] },
          "map_y": { "type": ["number", "null"] },
          "source": { "type": "string" },
          "source_reference": { "type": "string" },
          "verified": { "type": "boolean" },
          "notes": { "type": "string" }
        }
      }
    }
  }
}
```

---

## 3. Provenance Taxonomy

Allowed values for the `source` field include:
- `cad_engineering_survey`: Coordinates extracted from official port CAD/DWG engineering drawings.
- `manual_field_audit`: Physical on-site inspection using calibrated landmark offsets.
- `simulated_b2_topology`: Coordinates derived from the frozen B2 utility network prototype.
- `unverified_legacy`: Coordinates inherited from legacy Map V1 migrations.

---

## 4. The Verification Governance Rule

> [!IMPORTANT]
> **RULE: Only meters with VERIFIED spatial coordinates (ground truth, engineering drawings, or confirmed physical location) may be marked `verified: true`.**
> 
> If a meter's location is unverified, simulated, or unknown:
> - `verified`: `false`
> - `map_x`: `null`
> - `map_y`: `null`
> 
> The safe seeder (`scripts/seed_meter_spatial_data.py`) **STRICTLY SKIPS** any record where `verified == false`. It will never write unverified coordinates into the database.

---

## 5. Current Baseline Manifest Content

In `config/map_v2_meter_coordinate_seed.json`:
- **12 Legacy Simulation Meters (`CT-001` .. `CT-012`)**:
  - `verified: false`, `map_x: null, map_y: null`, `source: "unverified_legacy"`.
  - Reason: Permanently retired meters with distorted Map V1 coordinates.
- **12 Active Simulation Meters (`SIM-EM-001` .. `SIM-WM-004`)**:
  - `verified: false`, `map_x: null, map_y: null`, `source: "simulated_b2_topology"`.
  - Reason: Simulation scenario demo nodes; not real verified port infrastructure.
- **Result upon `--apply`**: 0 rows modified, 24 records cleanly logged as skipped. Data truthfulness preserved at 100%.
