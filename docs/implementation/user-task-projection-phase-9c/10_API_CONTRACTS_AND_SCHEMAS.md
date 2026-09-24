# Saigon Port — Thread 9C API Contracts and Schemas

**Endpoints Implemented:**
1. `GET /api/v1/meter-operations/my-tasks`
2. `GET /api/v1/reading-rounds/{round_id}/my-tasks`
3. `GET /api/v1/admin/reading-rounds/{round_id}/coverage-diagnostics`

---

## 1. Schema Specifications

### 1.1 `UserTasksResponse`
```json
{
  "date": "2026-09-24",
  "date_formatted": "24/09/2026",
  "batch": { "id": "batch-uuid", "work_date": "2026-09-24", "status": "OPEN" },
  "current_round": {
    "id": "round-uuid",
    "scheduled_at": "2026-09-24T08:00:00+07:00",
    "scheduled_time_only": "08:00",
    "status": "OPEN",
    "scope_mode": "SNAPSHOT"
  },
  "assignment_context": {
    "work_date": "2026-09-24",
    "shift_code": "CA1",
    "is_in_shift": true,
    "assigned_zones": [
      {
        "zone_id": "z-cont",
        "zone_code": "CONTAINER",
        "zone_name": "Bãi container",
        "assignment_role": "PRIMARY"
      }
    ]
  },
  "summary": {
    "assigned_total": 5,
    "confirmed": 3,
    "review": 0,
    "pending": 2,
    "percent_complete": 60.0,
    "assigned_zone_count": 1,
    "primary_zone_count": 1,
    "support_zone_count": 0
  },
  "global_round_total": 12,
  "empty_reason": null,
  "meters": [
    {
      "meter": { "id": "m-01", "meter_code": "EM-CONT-01", "name": "Trạm biến áp 1", "utility_type": "ELECTRICITY" },
      "current_status": "CONFIRMED",
      "current_reading": "12450.5",
      "assignment_role": "PRIMARY",
      "zone_name_snapshot": "Bãi container",
      "recorded_by": { "employee_code": "NV-101", "full_name": "Nguyễn Văn An" },
      "recorded_at": "2026-09-24T08:15:22+07:00"
    }
  ]
}
```

### 1.2 `UserTaskCoverageDiagnostics` (Admin Only)
```json
{
  "round_id": "round-uuid",
  "scheduled_at": "2026-09-24T08:00:00+07:00",
  "status": "OPEN",
  "scope_mode": "SNAPSHOT",
  "global_meter_count": 12,
  "shift_window": {
    "target_date": "2026-09-24",
    "covering_shifts": ["CA1"]
  },
  "zone_coverage": [
    {
      "zone_id": "z-cont",
      "zone_code": "CONTAINER",
      "zone_name": "Bãi container",
      "meter_count": 5,
      "primary_assignee": { "user_id": "u-01", "employee_code": "NV-101", "full_name": "Nguyễn Văn An" },
      "support_assignees": [{ "user_id": "u-03", "employee_code": "NV-103", "full_name": "Lê Thị Chi" }],
      "is_covered": true
    }
  ],
  "unassigned_zones": [],
  "total_zones_in_scope": 3,
  "covered_zones_count": 3
}
```
