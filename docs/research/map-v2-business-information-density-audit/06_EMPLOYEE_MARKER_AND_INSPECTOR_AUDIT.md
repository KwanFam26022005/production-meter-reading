# Map V2 Business & Information Density Audit — 06. Employee Marker & Inspector Audit

## 1. Data Source Verification

| Claim | Source Evidence | Classification |
| :--- | :--- | :--- |
| Markers use DEMO_MAP_V2_EMPLOYEES, not real API | employeeDataAdapter.ts#L36: 4 hardcoded employees | SOURCE_VERIFIED |
| employeeDataAdapter.ts isolates demo from live data | Function `getEmployeesForZone` defaults to DEMO array | SOURCE_VERIFIED |
| Zone assignments are fabricated for demo | DEMO_NV001→ZONE_QUAY, NV003→ZONE_GENERAL, etc. | SOURCE_VERIFIED |
| Motion disclosed as illustrative, not GPS | MAP_V2_EMPLOYEE_DISCLOSURE_TEXT constant | SOURCE_VERIFIED |
| Hover pauses animation correctly | useEmployeeAnimation.ts checks isHovered/isFocused | SOURCE_VERIFIED |
| Click opens inspector + highlights zone | MapV2Canvas.tsx highlights parent polygon on employee selection | SOURCE_VERIFIED |
| Deselect resumes animation | Clearing selectedEntity removes pause reason | SOURCE_VERIFIED |
| Play/Pause HUD works | isMotionPaused state in MapV2Workspace | SOURCE_VERIFIED |
| prefers-reduced-motion respected | useEmployeeAnimation.ts queries matchMedia | SOURCE_VERIFIED |
| Technical mode hides employees | MapV2EmployeeLayer returns null if isTechnicalMode | SOURCE_VERIFIED |
| Multiple markers staggered in same zone | zoneCount offset: +28px X, +12px Y per additional worker | SOURCE_VERIFIED |
| Trajectories constrained in concave polygons | employeeMovement.ts ray-casting + test verification | TEST_VERIFIED |
| Boundary clearance respects marker size | markerRadius + clearanceMargin parameters | TEST_VERIFIED |
| Selected marker visible when inspector open | Active radar pulse circle on selected marker | SOURCE_VERIFIED |

## 2. Test Suite Inventory

File: frontend/tests/mapV2AnimatedEmployeeMarkers.test.ts (18 tests)

1. Valid polygon containment (waypoints inside polygons)
2. Concave polygon containment
3. Narrow-zone stationary fallback (clearance < 18px)
4. Marker-radius boundary clearance
5. Entire path containment (36 samples per path)
6. Deterministic waypoint generation
7. Stable marker identity across rerenders
8. Hover pause and resume
9. Keyboard focus pause
10. Selection freeze and resume
11. Reduced-motion behavior
12. Manual pause/resume HUD
13. Operational vs technical mode visibility
14. Unknown/missing assignment handling
15. No fabricated personal progress
16. Multiple markers spacing
17. Inspector without selection loss
18. Animation cleanup on unmount

## 3. Implementation Report Claims vs Independent Verification

| Claim in IMPLEMENTATION_REPORT.md | Independent Finding | Status |
| :--- | :--- | :--- |
| 'FULLY IMPLEMENTED, TESTED, BUILT & VISUALLY ACCEPTED' | Feature code exists and tests pass in source, but test execution not independently run in this audit | REPORTED_ONLY |
| '342/342 Operations Portal tests pass' | Test count not independently verified (running tests prohibited by audit scope) | REPORTED_ONLY |
| '74/74 User Portal tests pass' | Same — not independently executed | REPORTED_ONLY |
| 'Zero marker clipping outside polygon boundaries' | Geometry math verified in source; test assertions verify 36-point sampling | SOURCE_VERIFIED + TEST_VERIFIED |
| 'Frozen B2 SHA-256 hash verified intact' | Hash verification script exists but not executed | REPORTED_ONLY |
| '9 high-resolution screenshots' | Screenshots exist in screenshots/ directory; independently viewed | VISUALLY_OBSERVED |

## 4. Inspector Field Assessment

### Currently Displayed:
| Field | Useful? | Demo-Only? | Should Keep? | Notes |
| :--- | :--- | :--- | :--- | :--- |
| MÃ NHÂN VIÊN (code) | Yes | Demo | KEEP | Essential identity |
| HỌ VÀ TÊN | Yes | Demo | KEEP | Essential identity |
| PHÂN KHU PHỤ TRÁCH + zone ID | Yes | Demo | KEEP (hide zone ID for operators) | Zone assignment |
| VAI TRÒ | Marginal | Demo ('Người phụ trách phân khu') | KEEP but derive from real data | Static demo text |
| TRẠNG THÁI | Marginal | Demo ('Phân công theo dõi khu vực (Minh họa)') | REPLACE with verified status | Misleading without real data |
| TIẾN ĐỘ KHU VỰC | Useful concept | Demo hardcoded ('34/42 công tơ') | KEEP but source from API | Zone progress, not personal |
| Disclosure card | Essential | No (truthfulness control) | KEEP ALWAYS | Required data provenance |

### Missing Fields:
| Field | Business Value | Data Source | Readiness |
| :--- | :--- | :--- | :--- |
| Verified shift (CA1/CA2/CA3) | High — confirms duty schedule | WorkSchedule table exists | NEEDS_BACKEND_DATA |
| Attendance check-in time | High — confirms physical presence | AttendanceEvent exists | NEEDS_BACKEND_DATA |
| Reading count today | Medium — shows individual output | MeterReading.user_id | NEEDS_BACKEND_DATA |
| Link to Phân ca | Medium — enables drill-down | Sidebar tab 'staff_roster' | NEEDS_FRONTEND_INTEGRATION |
| Link to Lịch ghi | Low — indirect relationship | Sidebar tab 'schedules' | NEEDS_FRONTEND_INTEGRATION |

## 5. Conclusions

### Marker Demo Completeness
The animated employee marker feature is **functionally complete as a demo visualization**. All claimed behaviors (motion, pause, selection, inspector, accessibility) are verified in source code and test assertions. The implementation correctly isolates demo data and provides truthfulness disclosures.

### Conditions Missing for Real Data
1. **No REST API** to serve zone-assignment data to Map V2
2. **No shift-zone-assignment table** linking shift codes to zone IDs (Thread 2/3 recommended creating this)
3. **No attendance integration** on Map V2 — cannot verify if employee actually checked in
4. **employeeDataAdapter.ts** has `isDemo: true` hardcoded; needs API fetch path

### Limitations to Preserve When Optimizing UI
1. Do NOT remove disclosure text (legal/ethical truthfulness requirement)
2. Do NOT display personal progress without a verified individual task denominator
3. Do NOT remove motion pause capability (accessibility requirement)
4. Do NOT convert demo statuses to appear as verified operational data
5. Keep zone-level progress attribution, not individual
