# Map V2 Business & Information Density Audit — 15. Implementation Readiness

## Classification Legend
- **UI_ONLY_READY**: Can be implemented purely in frontend with existing data
- **NEEDS_FRONTEND_INTEGRATION**: Requires frontend work to connect existing components
- **NEEDS_BACKEND_DATA**: Requires new or modified backend API endpoints
- **NEEDS_BUSINESS_CONFIRMATION**: Requires port management decision
- **DEMO_ONLY**: Feature works only with demo data
- **UNVERIFIED**: Cannot determine readiness

## Toolbar Improvements

| Improvement | Classification | Dependencies | Risk | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| Move CANONICAL badge to Settings/About | UI_ONLY_READY | MapV2Workspace.tsx | Low — metadata still accessible | Visual audit |
| Group utility toggles in Tùy chọn menu | UI_ONLY_READY | MapV2Workspace.tsx | Low — 2 clicks to access | Visual audit |
| Group visual theme in Tùy chọn menu | UI_ONLY_READY | MapV2Workspace.tsx | Low | Visual audit |
| Add date/round context badge | NEEDS_BACKEND_DATA | App.tsx state + Map V2 consumption | Medium — no round data on Map V2 | App.tsx, MapV2Workspace.tsx |
| Add search functionality | NEEDS_FRONTEND_INTEGRATION | Zone/meter search index | Medium | No search component exists |
| Add zone progress badges | NEEDS_BACKEND_DATA | Zone + meter + reading APIs | High — core feature gap | models.py |
| Permission-gate technical tools | NEEDS_FRONTEND_INTEGRATION | User role from auth context | Low | App.tsx auth state |

## Inspector Improvements

| Improvement | Classification | Dependencies | Risk | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| Add links from employee inspector to Phân ca | NEEDS_FRONTEND_INTEGRATION | Tab navigation + employee ID mapping | Low | AdminShell.tsx |
| Add links from zone card to Báo cáo | NEEDS_FRONTEND_INTEGRATION | Tab navigation + zone ID mapping | Medium — ID system mismatch | AdminShell.tsx |
| Show real zone progress in zone card | NEEDS_BACKEND_DATA | Zone progress API | High | No API |
| Show real employee shift/attendance in inspector | NEEDS_BACKEND_DATA | WorkSchedule + Attendance APIs | High | No API for Map V2 |
| Custom zone hover tooltip | UI_ONLY_READY | MapV2Canvas.tsx | Low | Currently native SVG title only |
| Meter inspector panel | NEEDS_BACKEND_DATA | Meter API + coordinate mapping | High | No meter data on Map V2 |

## Data Integration

| Integration | Classification | Affected Files | Risk |
| :--- | :--- | :--- | :--- |
| Connect Map V2 to reading round context | NEEDS_FRONTEND_INTEGRATION | MapV2Workspace.tsx, App.tsx | Medium |
| Connect Map V2 to zone progress API | NEEDS_BACKEND_DATA | MapV2Workspace.tsx, new API | High |
| Replace DEMO_MAP_V2_EMPLOYEES with API | NEEDS_BACKEND_DATA | employeeDataAdapter.ts | High |
| Map V2 ↔ backend zone ID mapping | NEEDS_BACKEND_DATA + NEEDS_BUSINESS_CONFIRMATION | New mapping layer | Critical |
| Coordinate system reconciliation (V1 vs V2) | NEEDS_BUSINESS_CONFIRMATION | Multiple files | Critical |

## Items That Must NOT Change

| Item | Reason | Evidence |
| :--- | :--- | :--- |
| B2 frozen geometry hash | Canonical polygon integrity | verify_b2_freeze_hash.mjs |
| Camera/FSM service | Existing animation + zoom behavior | MapV2Canvas.tsx |
| Employee movement primitives | Geometry safety proven by tests | employeeMovement.ts |
| Data truthfulness disclosures | Legal/ethical requirement | employeeDataAdapter.ts |
| prefers-reduced-motion support | Accessibility requirement | useEmployeeAnimation.ts |
