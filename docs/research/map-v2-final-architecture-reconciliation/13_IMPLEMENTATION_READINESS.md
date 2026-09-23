# Map V2 Final Architecture Reconciliation — 13. Implementation Readiness Matrix

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Objective:** Provide a granular, production-ready engineering feasibility matrix for all 18 core Map V2 capabilities.

---

## 1. Feasibility & Readiness Matrix

| Feature | Current Infrastructure | Backend Ready? | Frontend Ready? | Map V2 Consumes It? | Business Rule Ready? | Correct Action | Files Likely Affected | Risk |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :---: |
| **1. Shared Date Context** | `selectedDate` in `OperationalWorkspaceContext`; `GET /api/v1/map/overview?date=` | ✅ YES | ✅ YES | ❌ NO | ✅ YES | Connect `useOperationalWorkspace().selectedDate` to Map V2 fetch | `MapV2Workspace.tsx` | Low |
| **2. Shared Reading Round** | `selectedRoundId` in context; `overview?round_id=` | ✅ YES | ✅ YES | ❌ NO | ✅ YES | Connect `selectedRoundId` to Map V2 header & API call | `MapV2Workspace.tsx` | Low |
| **3. Zone Progress** | Pre-computed in `map_operations.py` (`confirmed_count`, `completion_percent`) | ✅ YES | ✅ YES | ❌ NO | ⚠️ PARTIAL (BD-05) | Fetch `overview.zones` and render progress badges on zone cards | `MapV2Workspace.tsx`, `MapV2Canvas.tsx` | Low |
| **4. Zone Assignee** | `assigned_user` on `OperationalZoneOut` from `ZoneAssignment` table | ✅ YES | ✅ YES | ❌ NO | ✅ YES | Display real assigned personnel on zone hover and inspector dock | `MapV2InspectionPanel.tsx` | Low |
| **5. Employee Real Adapter** | `employeeDataAdapter.ts` currently serves `DEMO_MAP_V2_EMPLOYEES` | ✅ YES | ✅ YES | ❌ NO | ⚠️ PARTIAL (BD-10, BD-15) | Replace demo list with real `assigned_user` mapped to zone anchors | `employeeDataAdapter.ts`, `MapV2EmployeeLayer.tsx` | Low |
| **6. Meter Live Data** | `overview.meters` returns `MapMeterOut` with semantic states | ✅ YES | ✅ YES | ❌ NO | ⚠️ PARTIAL (BD-17) | Render live meter markers using normalized coordinates | `MapV2Canvas.tsx`, `MapV2InspectionPanel.tsx` | Medium |
| **7. Zone & Meter Search** | Client-side search across loaded zones and meters | ✅ YES | ⚠️ PARTIAL | ❌ NO | ✅ YES | Build search input component in primary toolbar | `MapV2Workspace.tsx`, new `MapV2Search.tsx` | Low |
| **8. Exception Filtering** | `exceptions_count` and meter `exception_state` (`REVIEW`, `OVERDUE`) | ✅ YES | ✅ YES | ❌ NO | ✅ YES | Add exception chip to header and filter canvas markers | `MapV2Workspace.tsx`, `MapV2Canvas.tsx` | Low |
| **9. Zone ID Mapping** | `MapVersionZone.business_zone_id` schema exists in SQLite | ✅ YES | ✅ YES | ❌ NO | ❌ NO (BD-03) | Confirm V2 zone mapping table and seed/adapter into client | `zoneAnchors.ts`, `MapConfigurationProvider.tsx` | Medium |
| **10. Utility Filters** | `utilityFilter` in context; `utility_type` on `MapMeterOut` | ✅ YES | ✅ YES | ❌ NO | ✅ YES | Connect context `utilityFilter` to meter layer rendering | `MapV2Workspace.tsx`, `MapV2Layers.tsx` | Low |
| **11. Measurement Unit** | `MEASUREMENT_UNIT_DATA_GAP` (No unit column in `meters`) | ❌ NO | ❌ NO | ❌ NO | ❌ NO (NEW-01) | Avoid hardcoded units; render raw numbers with ⚡/💧 icons | `MapV2InspectionPanel.tsx` | Low |
| **12. Map ➔ Reports Navigation** | `AdminReports` exists; context `setActiveTab('reports')` | ✅ YES | ✅ YES | ❌ NO | ✅ YES | Add deep-link CTA in zone inspector dock | `MapV2InspectionPanel.tsx`, `AdminReports.tsx` | Low |
| **13. Reports ➔ Map Navigation** | Context `locateOnMap(entity)` routes to `'dashboard'` (V1) | ✅ YES | ⚠️ PARTIAL | ❌ NO | ✅ YES | Update `locateOnMap` destination to `'map_v2'` | `OperationalWorkspaceContext.tsx`, `MapV2Workspace.tsx` | Low |
| **14. Map ➔ Schedules Navigation** | Context `setActiveTab('schedules')` | ✅ YES | ✅ YES | ❌ NO | ✅ YES | Add deep-link CTA in zone inspector dock | `MapV2InspectionPanel.tsx` | Low |
| **15. Employee ➔ Staff Roster** | Context `setActiveTab('staff_roster')` | ✅ YES | ✅ YES | ❌ NO | ✅ YES | Add deep-link CTA in employee inspector dock | `MapV2InspectionPanel.tsx` | Low |
| **16. Geometry Role Gate** | Auth state `currentUser.role === 'ADMIN'` | ✅ YES | ✅ YES | ❌ NO | ✅ YES | Gate Technical Inspection mode button to admins only | `MapV2Workspace.tsx` | Low |
| **17. Technical Network Mode** | Simulated B2 topology in `utilityDemoLayout.ts` | ✅ YES | ✅ YES | ✅ YES | ✅ YES | Move utility network toggles into Layer Manager with disclosure | `MapV2Workspace.tsx`, `MapV2Layers.tsx` | Low |
| **18. Visual Theme Toggle** | Tone modes `technical` and `neon` exist in Map V2 | N/A | ✅ YES | ✅ YES | ✅ YES | Move theme toggle from primary header into `⋯` More menu | `MapV2Workspace.tsx` | Low |

---

## 2. Invariants That Must NOT Change

During any future implementation phase, the following six invariants are strictly non-negotiable:

1. **Frozen B2 Geometry Integrity**: The canonical B2 busbar and feeder coordinates, verified by `verify_b2_freeze_hash.mjs`, must remain untouched.
2. **Camera & Smooth Pan/Zoom FSM**: The inertia, spring physics, and viewport clamp math in `MapV2Canvas.tsx` are fully functional and must not be altered.
3. **Data Truthfulness Disclosures**: Mandatory badges for simulated networks (`MAP_V2_EMPLOYEE_DISCLOSURE_TEXT`, simulated utility watermarks) must remain visible whenever simulated assets are active.
4. **Zero Personal Progress**: No personal completion percentages or individual quotas may be fabricated.
5. **Accessibility Standards**: `prefers-reduced-motion` compliance, minimum 48×48px touch targets, and WCAG AA contrast standards must be preserved.
6. **Zero Database Cascades**: No destructive database resets or breaking migrations.
