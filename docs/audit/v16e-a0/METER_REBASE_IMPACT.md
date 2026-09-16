# V16E-A0: Meter Rebase & Historical Integrity Impact Audit

**Audit Timestamp:** 2026-09-16T02:18:45Z  
**Branch:** `feature/v10-landmark-calibration-minimal-hud`  
**Git Commit HEAD:** `e959b745ebda0d436ed43588d41224ec3a3e17ed`  
**Scope:** Data integrity analysis of meter reading history, OCR training samples, and foreign key constraints.

---

## 1. Executive Summary: The "Never Delete a Meter" Rule

An audit of the relational schema in `backend/app/models.py` and rows in `data/app.db` demonstrates that **meters cannot and must not be deleted via SQL `DELETE`**. 

Every one of the 12 active meters possesses an extensive audit trail of monthly operational readings and foreign key attachments. Any attempt to purge meters would corrupt historical compliance reports and break database constraints.

---

## 2. Quantitative Historical Reading Inventory

| Meter Code | Database UUID | Reading Count | Earliest Reading (UTC) | Latest Reading (UTC) | Latest Reading Value | OCR Evidence Records | Safe to Delete? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CT-001** | `4557d411-4bef-445e-b045-1ead2e242948` | **232** | 2026-08-01 01:13:00 | 2026-08-29 03:41:18 | `00836` | 0 | **NO (Data Lock)** |
| **CT-002** | `fed0d7d8-bc2d-4c1d-a8f8-262fa3ac396e` | **229** | 2026-08-01 01:06:00 | 2026-08-28 10:13:00 | *(Null/Blank)* | 0 | **NO (Data Lock)** |
| **CT-003** | `e0654f54-c401-49f2-8d79-38f6fbf50ef6` | **249** | 2026-08-01 01:06:00 | 2026-08-29 03:36:49 | `00801` | 0 | **NO (Data Lock)** |
| **CT-004** | `bb0d2e8d-67ab-47eb-b36e-26448152c7e4` | **236** | 2026-08-01 01:09:00 | 2026-08-28 09:13:00 | `001225.69` | 0 | **NO (Data Lock)** |
| **CT-005** | `0ca43793-5158-46e7-a796-431f2cfd7ecf` | **235** | 2026-08-01 01:05:00 | 2026-08-29 03:59:18 | `00846` | 0 | **NO (Data Lock)** |
| **CT-006** | `8b56445b-7da9-4bce-91fc-388f3f7a2737` | **241** | 2026-08-01 02:10:00 | 2026-08-28 10:09:00 | `0028728.6` | 0 | **NO (Data Lock)** |
| **CT-007** | `5abcdc9c-bda7-403d-99e1-0d1733af3417` | **242** | 2026-08-01 01:04:00 | 2026-08-28 10:15:00 | *(Null/Blank)* | 0 | **NO (Data Lock)** |
| **CT-008** | `50167b00-47da-4c35-9733-5c534188ca32` | **235** | 2026-08-01 01:07:00 | 2026-08-28 10:05:00 | `0064413.1` | 0 | **NO (Data Lock)** |
| **CT-009** | `eacc7434-4dd3-41d8-88f4-cccf84635295` | **234** | 2026-08-01 01:04:00 | 2026-08-28 09:02:00 | `001885.73` | 0 | **NO (Data Lock)** |
| **CT-010** | `171d8959-492a-413c-bb07-6b72d59db796` | **241** | 2026-08-01 01:07:00 | 2026-08-28 10:41:00 | `0032922.7` | 0 | **NO (Data Lock)** |
| **CT-011** | `00142f61-7c44-42b6-8e57-e4a6c9302557` | **238** | 2026-08-01 01:10:00 | 2026-08-28 09:02:00 | `001277.68` | 0 | **NO (Data Lock)** |
| **CT-012** | `8908e259-d48d-4fef-aef7-2da41e1466e2` | **229** | 2026-08-01 01:07:00 | 2026-08-28 10:10:00 | `0045774.0` | 0 | **NO (Data Lock)** |
| **TOTAL** | — | **2,801** | — | — | — | — | **100% LOCKED** |

---

## 3. Relational Foreign Key Impact Analysis

If an engineer executes `DELETE FROM meters WHERE meter_code = 'CT-001'`:
1. **`meter_readings` (232 rows):** Cascaded deletion or foreign key violation (`ondelete="CASCADE"` would wipe out the entire reading history for August 2026).
2. **`meter_reading_evidence`:** Attached dial inspection crops would be deleted from SQLite and orphaned on the physical filesystem.
3. **`meter_training_samples`:** YOLO / TrOCR bounding box training samples referencing `meter_id` would have their foreign keys set to NULL (`ondelete="SET NULL"`), destroying dataset lineage.
4. **`meter_asset_relations`:** Restricted deletion constraint (`ondelete="RESTRICT"`) on `meter_asset_relations.meter_id` actively blocks the SQL delete query, raising an `IntegrityError`.

---

## 4. Safe Meter Rebase & Reconfiguration Protocol

When reorganizing, renaming, or recalibrating meters in V16E:

1. **Spatial Recalibration (Safe):**
   - Call `relocate_admin_meter(meter_id, map_x, map_y)` to update coordinates. Preserves all reading history and relations.
2. **Zone Reassignment (Safe):**
   - Call `change_admin_meter_zone(meter_id, new_zone_id)` to reassign presentation zone (e.g., moving `CT-010` from `pres-gate` to `pres-technical`).
3. **Decommissioning / Deactivation (Safe):**
   - Call `retire_admin_meter(meter_id, reason)` which sets `lifecycle_status = 'RETIRED'` and `is_active = False`.
   - The meter is hidden from operational daily reading patrol routes while retaining $100\%$ historical audit logs and reading reports.
4. **Relationship Cleanup (Safe):**
   - Delete unverified synthetic test proposals:
     ```sql
     DELETE FROM meter_asset_relations 
     WHERE source = 'DISCOVERY_PROPOSAL' AND verification_status = 'UNVERIFIED';
     ```
   - This safely cleans the 55 test relations on `CT-001` without affecting reading records.
