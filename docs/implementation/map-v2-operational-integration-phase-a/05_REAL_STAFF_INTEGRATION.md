# 05 — Real Staff Integration & Truthful Spatial Semantics

**Scope:** Rendering live standing zone assignees at operator anchors without claiming GPS position.

---

## 1. Data Truthfulness Axioms Enforced

```text
REAL STAFF MARKER    ≠ GPS POSITION
ZONE ASSIGNEE        ≠ CURRENT SHIFT WORKER
SCHEDULED WORKER     ≠ CHECKED-IN WORKER
READING SUBMITTER    ≠ TASK OWNER
ZONE PROGRESS        ≠ PERSONAL EMPLOYEE PERFORMANCE
```

---

## 2. Stationary Anchor Placement Model

- Built via `buildLiveZoneEmployees(overview.zones)` in `frontend/src/components/map-v2/employeeDataAdapter.ts`.
- Extracts `zone.assigned_user` from the authoritative backend response.
- `emp.isStationary = true`:
  - Positioned strictly at `zoneAnchor.point` (the canonical operator anchor).
  - Duration set to `0`.
  - No continuous Lissajous animation or wandering route.
  - In `employeeMovement.ts`, `SafeMovementPath.reason` includes `'stationary_assignee'`.

---

## 3. Disclosures & Visual Badging

- **Marker Badge:** Real assignees display a discrete dark pill badge below the marker: `PHỤ TRÁCH`.
- **Tooltip & Inspector Text:**
  - `MAP_V2_LIVE_STAFF_DISCLOSURE_TEXT`: `"Người phụ trách phân khu — Vị trí cố định tại điểm neo, không phải vị trí GPS."`
- **Inspector Presentation:**
  - Discloses assignment identity (Employee Code, Full Name).
  - Discloses zone assignment ("Đang phụ trách phân khu: [TÊN KHU]").
  - Displays single-round zone progress without personal workload implication.
  - Safe CTA: `"Xem sổ điều độ ca trực"` (`onNavigateToTab('staff_roster')`).
