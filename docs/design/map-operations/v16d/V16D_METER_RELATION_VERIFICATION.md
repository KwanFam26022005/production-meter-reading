# V16D — Meter-Asset Relationship Verification

## 1. Overview
In Saigon Port operations, a physical meter frequently relates to two distinct assets:
1. **`INSTALLED_AT`**: Physical mount location (e.g. Substation Kiosk, Feeder Pillar, Workshop Wall).
2. **`MEASURES`**: The electrical or fluid consumer whose consumption is monitored (e.g. Quay Crane QC-01, Reefer Rack, Fire Pump System).

A meter may be mounted in Substation A while measuring consumption on Quay Crane 2. V16D preserves and enforces this decoupled semantic.

---

## 2. Active Primary Invariant & Auto-Close Logic

### The Rule
> **For a given meter and relation type (`INSTALLED_AT` or `MEASURES`), there can be AT MOST ONE active primary relationship at any time.**

### Uniqueness Enforcement Algorithm
When verifying a new relationship with `is_primary = True`:
1. The server identifies all existing active primary relations for the same `(meter_id, relation_type)` where `valid_to IS NULL`.
2. The server sets:
   - `existing_primary.valid_to = now_utc`
   - `existing_primary.is_primary = False`
3. An audit log `METER_ASSET_RELATION_TRANSFERRED` is recorded with before/after timestamps.
4. The new relationship is marked:
   - `rel.verification_status = 'VERIFIED'`
   - `rel.is_primary = True`
   - `rel.valid_to = NULL`
5. A `VerificationEvidence` entry is recorded linking the relationship ID to the electrical diagram or work order.

---

## 3. Evidence Requirements for Relationship Verification

Every relationship verification requires:
- `evidence_type`: `ELECTRICAL_DRAWING` | `ELECTRICAL_DIAGRAM` | `FIELD_INSPECTION` | `PORT_DOCUMENT` | `SINGLE_LINE_DIAGRAM` | etc.
- `evidence_reference`: As-built schematic ID or inspection report number.
- `notes`: Specific electrical termination / terminal lug identifier.

---

## 4. History Preservation
Previous associations are **never deleted**. They remain queryable with full timestamps:
- `valid_from`: Start of the historical connection period.
- `valid_to`: End timestamp when the meter was relocated or re-assigned.
- `created_by`: Admin who authorized the link.
