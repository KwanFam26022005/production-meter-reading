# V16B — METER LIFECYCLE SAFETY SPECIFICATION

## 1. Executive Summary
Phase V16B replaces destructive meter deletion with an authoritative three-state lifecycle model:
- **`ACTIVE`**: Fully operational meter participating in automated scheduling, active rounds, OCR readings, and operational map rendering.
- **`INACTIVE`**: Temporarily suspended meter. Excluded from new operational shifts and rounds; hidden from operational map by default; historical readings and audit records preserved; can be reactivated.
- **`RETIRED`**: Permanently decommissioned meter. Retains complete historical provenance, reading records, alert trails, and spatial history; completely excluded from operational rounds and operational maps; terminal state under standard administration.

---

## 2. State Transition Matrix

| Source State | Target State | Endpoint | Allowed? | Audit Log Action |
| :--- | :--- | :--- | :---: | :--- |
| `ACTIVE` | `INACTIVE` | `POST /admin/meters/{id}/deactivate` | **YES** | `METER_DEACTIVATED` |
| `INACTIVE` | `ACTIVE` | `POST /admin/meters/{id}/reactivate` | **YES** | `METER_REACTIVATED` |
| `ACTIVE` | `RETIRED` | `POST /admin/meters/{id}/retire` | **YES** | `METER_RETIRED` |
| `INACTIVE` | `RETIRED` | `POST /admin/meters/{id}/retire` | **YES** | `METER_RETIRED` |
| `RETIRED` | `ACTIVE` | `POST /admin/meters/{id}/reactivate` | **NO (400 Bad Request)** | N/A (Terminal State) |
| `RETIRED` | `INACTIVE` | `POST /admin/meters/{id}/deactivate` | **NO (400 Bad Request)** | N/A (Terminal State) |

### Invariants:
1. **Terminal Nature of `RETIRED`**: Once retired, a meter cannot be reactivated or deactivated through standard administration endpoints.
2. **Mutation Guard**: Any attempt to modify coordinates (`/relocate`), zone assignments (`/change-zone`), or general metadata (`PATCH /meters/{id}`) on a `RETIRED` meter is strictly rejected with HTTP 400 Bad Request.
3. **Reading Intake Guard**: Any attempt to record or confirm readings on an `INACTIVE` or `RETIRED` meter via `/api/v1/meter-readings/confirm` or `/review` is strictly rejected with HTTP 400 Bad Request.

---

## 3. Operational Map Behavioral Contract
- **Default View**: `GET /api/v1/map/overview` queries only `lifecycle_status == 'ACTIVE'`.
- **Inactive Inclusion**: `GET /api/v1/map/overview?include_inactive=true` allows viewing `INACTIVE` meters.
- **Retired Absolute Exclusion**: `RETIRED` meters are NEVER rendered on operational maps, avoiding visual clutter while protecting historical integrity.

---

## 4. UI / Visual Dress Code
- **Language**: Vietnamese operational terminology:
  - `ACTIVE` -> **"Đang sử dụng"**
  - `INACTIVE` -> **"Tạm ngừng"**
  - `RETIRED` -> **"Đã ngừng sử dụng"**
- **Tokens**: Quiet neutral presentation. Retired meters are rendered with neutral slate tones (`#94A3B8`), avoiding aggressive red error styling which is reserved strictly for operational exceptions.
