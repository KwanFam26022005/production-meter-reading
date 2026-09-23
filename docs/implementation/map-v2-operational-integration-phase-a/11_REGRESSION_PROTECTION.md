# 11 — Regression Protection & Invariant Preservation

**Scope:** Verifying zero regressions across Map V1, frozen B2 geometry, and bundle separation.

---

## 1. Map V1 Preservation

- Map V1 (`AdminDashboard.tsx`) remains 100% active and untouched.
- `locateOnMap(entity)` retains default target `'dashboard'`.
- Verified by:
  - `frontend/tests/mapV2IndependentWorkspace.test.ts` (Scenario 3 & 4: Map V1 remains accessible and untouched).
  - All existing 342 operations tests passing without modification to Map V1 semantics.

---

## 2. Frozen B2 Topology Invariant

- Verification command: `node scripts/verify_b2_freeze_hash.mjs`
  - Output SHA256: `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`
  - Node count: 17
  - Edge count: 15
  - Canonical asset: `frontend/src/components/map-v2/data/tan_thuan_1_zones_edited.json` (1536x1024) untouched.

---

## 3. Bundle Separation Invariant

- Verification command: `node scripts/verify_bundle_separation.mjs`
  - User Portal bundle: `286.51 KB` (zero admin/management leakage).
  - Operations Portal bundle: `917.68 KB` (zero field camera UI leakage).
  - Clean separation audit passed with exit code 0.
