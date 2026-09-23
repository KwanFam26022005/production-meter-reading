# Map V2 Final Architecture Reconciliation — 07. Employee Data Readiness & Semantic Separation

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Objective:** Reconcile employee representations between demo animations, SQLite domain tables, and Map V2 display contracts.

---

## 1. Five Semantic Invariants (Mandatory Boundaries)

To preserve data truthfulness under Saigon Port operational standards, the following five concepts must never be conflated:

```text
┌───────────────────────────┐      ┌───────────────────────────┐
│   1. ZONE ASSIGNEE        │  ≠   │   2. SCHEDULED EMPLOYEE   │
│ Permanent / Standing zone │      │ Shift roster for calendar │
│ accountability in SQLite  │      │ date (CA1, CA2, CA3, OFF) │
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │                                  │
              ≠                                  ≠
┌─────────────┴─────────────┐      ┌─────────────┴─────────────┐
│  3. CHECKED-IN EMPLOYEE   │  ≠   │   4. PHYSICAL LOCATION    │
│ Photo timestamp at gate/wharf;   │ Visual position on wharf; │
│ zero zone attribution     │      │ NO live GPS in production │
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │                                  │
              ≠                                  ≠
┌─────────────┴─────────────┐      ┌─────────────┴─────────────┐
│   5. READING SUBMITTER    │  ≠   │    ANIMATED DEMO MARKER   │
│ Worker who took photo     │      │ Simulated Lissajous motion│
│ of a specific meter       │      │ in useEmployeeAnimation.ts│
└───────────────────────────┘      └───────────────────────────┘
```

---

## 2. Model Audit & Source Evidence

| Entity Concept | Database Model | Fields Present | Relationship to Map V2 |
| :--- | :--- | :--- | :--- |
| **Zone Assignee** | [`ZoneAssignment`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L105) | `zone_id`, `user_id`, `assignment_role`, `effective_from`, `is_active` | **ALREADY RETURNED** by `GET /api/v1/map/zones` and `GET /api/v1/map/overview` as `assigned_user`. |
| **Scheduled Employee** | [`WorkSchedule`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L332) | `user_id`, `work_date`, `shift_code`, `status` | Tied strictly to calendar date `YYYY-MM-DD`. Does **NOT** link to zones or meters. |
| **Checked-In Employee** | [`AttendanceEvent`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L56) | `user_id`, `business_date`, `event_type`, `server_timestamp` | Records gate check-in. Does **NOT** carry GPS coordinates or zone attribution. |
| **Reading Submitter** | [`MeterReading`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L245) | `meter_id`, `reading_round_id`, `user_id`, `status` | Records who confirmed a specific meter reading. An open pool worker can read in any zone. |
| **Demo Animated Worker** | [`useEmployeeAnimation.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/map-v2/useEmployeeAnimation.ts) | `DEMO_MAP_V2_EMPLOYEES` (NV001–NV004) | Hardcoded static demo animation traversing zone polygons. |

---

## 3. Transition Strategy: Demo ➔ Real Standing Assignees

### Can real standing zone assignees replace demo employees now?
**YES.**  
The backend API `GET /api/v1/map/overview` already projects `assigned_user` for each zone:

```json
{
  "id": "zone-berth",
  "code": "ZONE-BERTH",
  "name": "Khu vực Cầu cảng (Berths 1 - 3)",
  "assigned_user": {
    "id": "user-uuid-1",
    "employee_code": "NV001",
    "full_name": "Nguyễn Văn Hải",
    "role": "EMPLOYEE",
    "is_active": true
  }
}
```

### Classification
**`FRONTEND_INTEGRATION_ONLY`**  
Replacing `DEMO_MAP_V2_EMPLOYEES` with real standing assignees requires zero backend modifications.

### Safe Marker Positioning Standard
1. **Stationary Anchor Positioning**: When rendering real standing assignees, place the marker at the zone's authoritative operator anchor point (`operatorAnchorCanonical` or zone anchor point from `zoneAnchors.ts`).
2. **Animation Decommissioning**: The moving Lissajous animation in `useEmployeeAnimation.ts` was designed for demo simulation. Real standing assignees should be stationary markers anchored within their assigned zone. If simulation animation is toggled on, it must retain the mandatory disclosure badge: `"Chuyển động minh họa (Demo)"`.
3. **No False "Đang trực" Status**: The marker label must be:
   - ✅ `"Người phụ trách: Nguyễn Văn Hải (NV001)"`
   - ❌ `"Đang trực"` (Prohibited unless shift attendance is verified for that specific hour).
4. **No Individual Progress Rings**: Never render personal completion bars (e.g. `8/10`). All meter progress displayed in the employee hover or inspector must be **explicitly labeled as Zone Progress** (`Tiến độ khu vực: 34 / 42 công tơ`).
