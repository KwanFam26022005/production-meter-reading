# Operations V2 Foundation: Tan Thuan Demo V2 Dataset

**Date:** 2026-09-24  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Document:** `docs/implementation/operations-v2-foundation/DEMO_DATA_V2.md`

---

## 1. Executive Summary

`tan-thuan-demo-v2` is the canonical, deterministic demonstration and development baseline for the Saigon Port Production Meter Reading application.

Anchored at **`2026-09-24` (`Asia/Ho_Chi_Minh`)**, it synthesizes full operational lifecycles across all four core architectural contracts:
- **Thread 9A:** 60 SNAPSHOT-mode Reading Rounds with materialized, immutable `ReadingRoundMeter` scope snapshots.
- **Thread 9B:** 269 multi-dimensional `OperationalAssignment` records covering PRIMARY and SUPPORT shift staffing across 4 operational zones.
- **Thread 9C:** Real-time User Task Projection without persistent task tables (`Tasks = RoundScope ∩ OperationalAssignment`).
- **Thread 9D:** Technical consumption analytics, 7-day median baseline comparisons, and explicit measurement metadata.

---

## 2. Seed Generation Invariants

- **Fixed Seed Number:** `24092026`
- **Stable Identity Generation:** All UUIDs generated deterministically using RFC 4122 namespace hashing:
  `uuid.uuid5(NAMESPACE_URL, f"pmr-demo-v2/{entity}/{key}")`
- **Idempotency Guarantee:** Executing the seed script multiple times produces identical row counts, keys, and values without cumulative record inflation.

---

## 3. Data Specification by Domain

### 3.1 People & Work Schedules
- **Administrator:** 1 Admin user (`admin` / `ADMIN-001`).
- **Field Operators:** 12 Employee users (`DEMO2-001` .. `DEMO2-012`) with Vietnamese names.
- **Password:** `demo2026` hashed via Argon2id.
- **Work Schedules:** 300+ shift assignments (`CA1`, `CA2`, `CA3`, `HC`, `OFF`, `LEAVE`) covering `2026-09-10` to `2026-09-30`.
- **Leave Requests:** Realistic leave distribution (1 `APPROVED`, 1 `PENDING`, 1 `CANCELLED`).

### 3.2 Operational Assignments (WHO + WHERE + SHIFT)
- 4 Operational Zones:
  - `zone-berth` (Khu vực Cầu cảng)
  - `zone-container` (Bãi Container)
  - `zone-warehouse` (Kho CFS & Ngoại quan)
  - `zone-technical` (Khu Kỹ thuật & Trạm biến áp)
- Enforces at most 1 active PRIMARY operator per zone/date/shift, alongside scheduled SUPPORT operators.

### 3.3 Map V2 Digital Twin Baseline
- Preserves the frozen B2 digital twin geometry.
- 32 Assets (Substations, Transformers, RTGs, CFS Warehouses, Pumps) and 12 Meters (`SIM-EM-001` .. `SIM-EM-008`, `SIM-WM-001` .. `SIM-WM-004`).
- Topology: Complete electrical distribution DAG and municipal water network.

### 3.4 Reading Rounds & Provenance
- 60 SNAPSHOT-mode Reading Rounds (4 daily slots: 06:00, 10:00, 14:00, 22:00 from Sept 10 to Sept 24).
- 720 `ReadingRoundMeter` snapshot rows (`12 meters × 60 rounds`).
- Rich reading provenance distribution:
  - `OCR_CONFIRMED`: Direct high-confidence camera confirmations.
  - `USER_CORRECTED`: Operator-adjusted readings with audit trail.
  - `MANUAL_ENTRY`: Direct keyboard input for mechanical counters.
  - `REVIEW`: Out-of-bounds readings flagged for administrative inspection.
  - 1 intentional negative delta flagged as `RESET_OR_ROLLOVER_SUSPECTED`.

---

## 4. Reset & Verification Tooling

- **Reset Tool:** `scripts/reset-demo-data.ps1` — Backs up existing `.runtime/data/app.db` before cleanly executing seed and audit.
- **Audit Tool:** `scripts/audit_demo_data_v2.py` — Programmatically verifies all 9A–9D invariants.
