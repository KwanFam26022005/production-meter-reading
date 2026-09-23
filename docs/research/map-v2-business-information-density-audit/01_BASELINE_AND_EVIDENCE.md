# Map V2 Business & Information Density Audit — 01. Baseline & Evidence

**Thread:** 5 — Map V2 Business & Information Density Audit
**Project:** Production Meter Reading — Cảng Sài Gòn
**Repository:** `D:\Projects\production-meter-reading\production-meter-reading`
**Audit Date:** 2026-09-23
**Audit Mode:** READ-ONLY — Zero source modifications

---

## 1. Git Baseline

| Property | Value |
| :--- | :--- |
| Branch | `feature/v16e-network-map-overlay-r1` |
| HEAD Commit | `5d370474112fb978105f87e7498cdc9d339471a0` |
| Commit Message | `feat(v16e-r1): handoff desktop UX r1 - admin schedules, reports, logbook & QA capture script` |
| Commit Date | 2026-09-20 13:24:39 +0700 |
| Working Tree | 89 files modified/untracked |

### Modified Files (Tracked)
- `.agent/skills/saigon-port-ui/SKILL.md`
- `backend/app/attendance.py`, `db.py`, `main.py`, `meter_logbook.py`, `models.py`, `schemas.py`
- `frontend/DESIGN_DNA.md`, `package.json`, `src/App.tsx`
- `frontend/src/components/AttendanceView.tsx`, `AuthenticatedShell.tsx`, `HomeHub.tsx`, `MeterCamera.tsx`
- `frontend/src/components/admin/AdminShell.tsx`
- `frontend/src/index.css`, `services/api.ts`, `types.ts`

### Untracked Files (New)
- `AGENTS.md`, `apps/`, `deployment/`, `docs/audits/`, `docs/implementation/`, `docs/research/`
- `frontend/operations.html`, `frontend/src/apps/`, `frontend/src/components/map-v2/` (entire directory)
- `frontend/tests/mapV2*.test.ts` (7 test files)
- Various other test files and configs

### Cross-Thread Activity
Multiple threads appear active. Modified backend files may belong to other threads. Map V2 components are entirely untracked/new.

---

## 2. Prior Thread Handoffs Read

| Thread | File | Status |
| :--- | :--- | :--- |
| Thread 2 — Employee, Shift & Map V2 Business Audit | `docs/research/employee-shift-map-audit/THREAD_HANDOFF.md` | READ |
| Thread 3 — Employee × Shift × Map V2 UX Design | `docs/research/employee-map-ux-design/THREAD_HANDOFF.md` | READ |
| Thread 4 — Reporting × Map Integrated Audit | `docs/research/reporting-map-integrated-audit/THREAD_HANDOFF.md` | NOT FOUND |

### Key Findings from Prior Threads

**Thread 2 (Audit Baseline):**
- No Employee Admin UI or REST API exists. Users created via CLI scripts only.
- Shift assignment: single shift per calendar day with fallback CA1/OFF.
- Attendance disconnected from shifts and zones. CA3 overnight bug exists.
- Map V1 vs V2: two separate worlds. Map V2 is client-side SVG demo with ZERO backend API calls.
- Task allocation: open pool free-for-all. No meter dispatching to individuals.

**Thread 3 (UX Design):**
- Approved Hybrid Model (Shift-Duty with Standing Templates).
- Map Marker Variant B (Status Marker) approved; Variant C (progress ring) suppressed until personal quotas exist.
- Three-Tier Progressive Disclosure: L1 At-a-glance → L2 Hover Preview → L3 Contextual Inspector (400px dock).
- Map-First Architecture: 92%+ horizontal space for Map V2.
- Data Truthfulness: Never fabricate personal progress denominators.

---

## 3. Implementation Documentation Read

| File | Status | Key Claims |
| :--- | :--- | :--- |
| `docs/implementation/map-v2-animated-employee-markers/IMPLEMENTATION_REPORT.md` | READ | Claims FULLY IMPLEMENTED, 342/342 tests, zero regressions |
| `docs/implementation/map-v2-animated-employee-markers/02_DATA_PROVENANCE_AND_LIMITATIONS.md` | READ | Documents demo data isolation |
| `docs/implementation/map-v2-animated-employee-markers/06_VISUAL_ACCEPTANCE.md` | READ | 9 screenshots across viewports |

---

## 4. Visual Evidence Observed

| Screenshot | File | Observations |
| :--- | :--- | :--- |
| Overview Default (1920×1080) | `screenshots/01_map_v2_overview_default.png` | Full toolbar visible, 7 zones with anchors, 4 employee markers, demo badge |
| Hover Preview | `screenshots/03_map_v2_employee_marker_hover_preview.png` | Clean tooltip with code, name, zone, disclosure |
| Selected Inspector | `screenshots/04_map_v2_employee_marker_selected_inspector.png` | Right-dock panel, zone highlight, employee details |
| HUD Motion Pause | `screenshots/05_map_v2_hud_motion_pause.png` | Play button visible in HUD, markers stationary |
| Layer Manager | `screenshots/06_map_v2_layer_manager.png` | 7 layers listed with checkboxes |
| Technical Mode | `screenshots/07_map_v2_technical_network_mode.png` | Employee markers hidden, utility network with SIM-EXT-GRID node |
| 1280×800 Compact | `screenshots/09_map_v2_viewport_1280x800.png` | Collapsed to single toolbar row with 'Tùy chọn' button |

---

## 5. Source Files Audited

### Map V2 Components (frontend/src/components/map-v2/)
| File | Lines | Purpose |
| :--- | :--- | :--- |
| MapV2Workspace.tsx | Main workspace | Container, state management, toolbar |
| MapV2Canvas.tsx | SVG canvas | Rendering, zoom, pan, HUD, event handling |
| MapV2EmployeeLayer.tsx | Employee layer | Multi-employee coordination |
| MapV2EmployeeMarker.tsx | Employee marker | Individual marker SVG + tooltip |
| MapV2InspectionPanel.tsx | Inspector panel | Employee and geometry inspection |
| MapV2Layers.tsx | Layer manager | Layer visibility toggles |
| MapV2UtilityLayer.tsx | Utility network | Electricity/water demo graph |
| employeeDataAdapter.ts | Data adapter | Demo employee data with truthfulness gates |
| employeeMovement.ts | Movement engine | Polygon-safe path generation |
| useEmployeeAnimation.ts | Animation hook | Lifecycle, pause/resume, reduced-motion |
| types.ts | Type definitions | Interfaces for all Map V2 entities |
| zoneAnchors.ts | Zone hotspots | 7 canonical anchors |
| utilityDemoLayout.ts | Utility data | Demo utility network layout |
| utilityNetworkGraph.ts | Network graph | Graph traversal for utility demo |
| utilityNetworkStateMachine.ts | Network FSM | State machine for utility mode |
| validation.ts | Data validation | Manifest validation |
| data/tan_thuan_1_zones_edited.json | Zone geometry | 7 polygons, parent-child data |

### Backend Models (backend/app/models.py)
- User, OperationalZone, ZoneAssignment, MapVersion, MapVersionZone, Meter, MeterReading, ReadingRound, WorkSchedule, AttendanceEvent

### Routing & Navigation
- frontend/src/App.tsx — Tab-based routing
- frontend/src/components/admin/AdminShell.tsx — Sidebar navigation

---

## 6. User-Provided Images

The user requested audit using three attached images. No user-attached images were received in this conversation. All visual evidence is sourced from implementation screenshots in `docs/implementation/map-v2-animated-employee-markers/screenshots/`.

> **Transparency Note**: This audit relies on implementation-generated screenshots, not independently captured evidence. Visual claims are classified as REPORTED_ONLY unless independently verified against source code.
