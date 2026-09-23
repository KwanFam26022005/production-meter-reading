# Map V2 Final Architecture Reconciliation — 03. Existing Backend Map Capabilities

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Source Code Pointers:**  
- [`backend/app/main.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1433-L1610)  
- [`backend/app/map_operations.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L1-L476)  
- [`backend/app/map_config.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_config.py#L1-L766)  
- [`backend/app/schemas.py`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L1045-L1130)  
- [`frontend/src/services/api.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/services/api.ts#L1363-L1630)  

---

## 1. Executive Reconciliation Finding

Thread 5 recorded:
> *"No backend API endpoints exist for Map V2 specifically. Connecting Map V2 to operational data: NEEDS_BACKEND_DATA."*

**This finding was incorrect.**  
A full trace through FastAPI route registration demonstrates that an entire, fully featured Map Operations API suite **already exists, is active in `main.py`, is implemented in `map_operations.py`, and has typed client wrappers in `api.ts`**.

---

## 2. Comprehensive Endpoint Audit

### Endpoint 1: `GET /api/v1/map/overview`

| Attribute | Specification | Source Pointer |
| :--- | :--- | :--- |
| **Endpoint** | `GET /api/v1/map/overview` | [`main.py#L1433`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1433) |
| **Implemented?** | **YES — 100% Fully Implemented** | [`map_operations.py#L83-L364`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L83) |
| **Auth Requirement** | `require_admin` (Bearer Session Token) | [`main.py#L1438`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1438) |
| **Query Parameters** | `date: Optional[str] = None`<br>`round_id: Optional[str] = None`<br>`include_inactive: bool = False` | [`main.py#L1435-L1437`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1435) |
| **Source Models** | `OperationalZone`, `Meter`, `MeterReading`, `ZoneAssignment`, `User`, `MapVersion`, `MapVersionZone` | [`map_operations.py#L10-L18`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L10) |
| **Response Schema** | `MapOverviewResponse` | [`schemas.py#L1091`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L1091), [`types.ts#L1197`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/types.ts#L1197) |
| **Business Formula** | **Zone Completion**: `confirmed_count / total_meters * 100` (where denominator = active meters assigned to zone).<br>**Port Completion**: `confirmed_tot / total_active * 100`.<br>**Semantic State**: Computes `CONFIRMED`, `REVIEW`, `OVERDUE`, `DUE`, `PENDING`, `INACTIVE` per meter. | [`map_operations.py#L195-L235`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L195) |
| **Date Behavior** | Projects dashboard and readings for `date_str` (defaults to today Asia/Ho_Chi_Minh). | [`map_operations.py#L94`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L94) |
| **Round Behavior** | Resolves `round_id`. If omitted, deterministically resolves priority: `CURRENT` (if open) -> last `PAST` -> first round of day. | [`map_operations.py#L136-L148`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L136) |
| **Zone Behavior** | Returns `zones[]` with active operator assignment and progress breakdown (`confirmed`, `review`, `overdue`, `due`, `pending`). | [`map_operations.py#L296-L332`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L296) |
| **Utility Behavior** | Passes `utility_type` on each `MapMeterOut` object (`ELECTRICITY` / `WATER` / `UNKNOWN`). | [`map_operations.py#L271`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L271) |
| **Known Limitations** | Meter coordinates `map_x`, `map_y` reflect canonical normalized coordinates (0.0 to 1.0), which are tailored to the 1915×821 canvas or require mapping to Map V2's 1536×1024 space. |

---

### Endpoint 2: `GET /api/v1/map/zones`

| Attribute | Specification | Source Pointer |
| :--- | :--- | :--- |
| **Endpoint** | `GET /api/v1/map/zones` | [`main.py#L1444`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1444) |
| **Implemented?** | **YES — 100% Fully Implemented** | [`map_operations.py#L31-L80`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L31) |
| **Auth Requirement** | `require_admin` | [`main.py#L1446`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1446) |
| **Query Parameters** | None | — |
| **Source Models** | `OperationalZone`, `ZoneAssignment`, `User`, `Meter` | [`map_operations.py#L33-L78`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L33) |
| **Response Schema** | `list[OperationalZoneOut]` | [`schemas.py#L1045`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L1045), [`types.ts#L1144`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/types.ts#L1144) |
| **Business Formula** | Resolves latest active `ZoneAssignment` (`is_active=True`, ordered by `effective_from desc`) to find primary standing assignee. Counts `total_meters` per zone. | [`map_operations.py#L43-L65`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L43) |
| **Date Behavior** | Static standing assignments (unfiltered by calendar date). | [`map_operations.py#L47`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L47) |
| **Round Behavior** | Not applicable (round metrics omitted, only total meters and assigned user). | — |
| **Zone Behavior** | Filters `OperationalZone.is_active == True`, ordered by `code.asc()`. | [`map_operations.py#L35`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L35) |
| **Utility Behavior** | Not filtered by utility. | — |
| **Known Limitations** | Returns backend operational zones (`zone-berth`, etc.), not Map V2 presentation zones (`ZONE_QUAY`, etc.). |

---

### Endpoint 3: `GET /api/v1/map/operators`

| Attribute | Specification | Source Pointer |
| :--- | :--- | :--- |
| **Endpoint** | `GET /api/v1/map/operators` | [`main.py#L1452`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1452) |
| **Implemented?** | **YES — 100% Fully Implemented** | [`map_operations.py#L456-L475`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L456) |
| **Auth Requirement** | `require_admin` | [`main.py#L1454`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1454) |
| **Query Parameters** | None | — |
| **Source Models** | `User` | [`map_operations.py#L459`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L459) |
| **Response Schema** | `list[UserOut]` | [`schemas.py#L65`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L65), [`types.ts#L10`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/types.ts#L10) |
| **Business Formula** | Selects all `User.is_active == True`, ordered by `employee_code.asc()`. | [`map_operations.py#L460`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L460) |
| **Date Behavior** | Agnostic of date. | — |
| **Round Behavior** | Agnostic of round. | — |
| **Zone Behavior** | Returns all personnel available for zone dispatch or reassignment. | — |
| **Utility Behavior** | Agnostic of utility. | — |
| **Known Limitations** | Does not cross-reference today's shift schedule or attendance check-in status. |

---

### Endpoint 4: `GET /api/v1/map/meters`

| Attribute | Specification | Source Pointer |
| :--- | :--- | :--- |
| **Endpoint** | `GET /api/v1/map/meters` | [`main.py#L1461`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1461) |
| **Implemented?** | **YES — 100% Fully Implemented** | [`main.py#L1470-L1474`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1470) |
| **Auth Requirement** | `require_admin` | [`main.py#L1467`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1467) |
| **Query Parameters** | `date: Optional[str] = None`<br>`round_id: Optional[str] = None`<br>`zone_id: Optional[str] = None`<br>`include_inactive: bool = False` | [`main.py#L1463-L1466`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1463) |
| **Source Models** | Delegates to `get_map_overview` and filters meters by `zone_id`. | [`main.py#L1470`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1470) |
| **Response Schema** | `list[MapMeterOut]` | [`schemas.py#L1062`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L1062), [`types.ts#L1168`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/types.ts#L1168) |
| **Business Formula** | Identical projection as `get_map_overview.meters`, optionally filtered by `zone_id`. | [`main.py#L1472-L1474`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1472) |
| **Date Behavior** | Evaluates reading state for target date. | — |
| **Round Behavior** | Evaluates reading state for target round. | — |
| **Zone Behavior** | Filters meters by `zone_id` unless `zone_id == "ALL"` or `None`. | [`main.py#L1472`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1472) |
| **Utility Behavior** | Carries `utility_type` on each meter. | — |
| **Known Limitations** | Does not have a dedicated `utility_type` query parameter filter in FastAPI (filtering is done on client or via `overview`). |

---

### Endpoint 5: `POST /api/v1/map/zones/{zone_id}/assign`

| Attribute | Specification | Source Pointer |
| :--- | :--- | :--- |
| **Endpoint** | `POST /api/v1/map/zones/{zone_id}/assign` | [`main.py#L1478`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1478) |
| **Implemented?** | **YES — 100% Fully Implemented** | [`map_operations.py#L367-L454`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L367) |
| **Auth Requirement** | `require_admin` + `enforce_csrf` | [`main.py#L1480-L1485`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1480) |
| **Payload** | `ZoneReassignRequest`: `{ user_id, assignment_role?, note? }` | [`schemas.py#L1110`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L1110) |
| **Source Models** | `OperationalZone`, `ZoneAssignment`, `User`, `AdminAuditLog` | [`map_operations.py#L376-L442`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L376) |
| **Response Schema** | `ZoneReassignResponse`: `{ status, message, zone_id, user_id, user_name }` | [`schemas.py#L1117`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L1117) |
| **Business Formula** | Deactivates previous active assignment (`is_active=False`, `effective_to=now_utc`). Creates new active assignment. Emits immutable audit log `ZONE_OPERATOR_REASSIGNED`. | [`map_operations.py#L405-L442`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L405) |
| **Audit Logging** | Produces `before_json` and `after_json` in `admin_audit_logs`. | [`map_operations.py#L434`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L434) |

---

### Endpoint 6: `GET /api/v1/map-config/active`

| Attribute | Specification | Source Pointer |
| :--- | :--- | :--- |
| **Endpoint** | `GET /api/v1/map-config/active` | [`main.py#L1494`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1494) |
| **Implemented?** | **YES — 100% Fully Implemented** | [`map_config.py#L84-L123`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_config.py#L84) |
| **Auth Requirement** | Open (Public/Authenticated session) | [`main.py#L1495`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/main.py#L1495) |
| **Response Schema** | `ActiveMapConfigurationResponse` | [`schemas.py#L1150`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L1150) |
| **Business Formula** | Returns the single active `PUBLISHED` map version, complete with canonical dimensions, zones, and landmarks. | [`map_config.py#L86-L92`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_config.py#L86) |

---

## 3. Summary of Backend Readiness

| Capability | Backend Route | Status | Frontend Client | Map V2 Consumed? |
| :--- | :--- | :--- | :--- | :---: |
| **Map Overview Projection** | `GET /api/v1/map/overview` | `OPERATIONAL` | `getMapOverview()` | ❌ NO (100% Bypassed) |
| **Operational Zones & Assignees** | `GET /api/v1/map/zones` | `OPERATIONAL` | `getMapZones()` | ❌ NO (100% Bypassed) |
| **Active Personnel Roster** | `GET /api/v1/map/operators` | `OPERATIONAL` | `getMapOperators()` | ❌ NO (100% Bypassed) |
| **Filtered Map Meters** | `GET /api/v1/map/meters` | `OPERATIONAL` | `getMapMeters()` | ❌ NO (100% Bypassed) |
| **Zone Operator Reassignment** | `POST /api/v1/map/zones/{id}/assign` | `OPERATIONAL` | `reassignZoneOperator()` | ❌ NO (100% Bypassed) |
| **Active GIS Configuration** | `GET /api/v1/map-config/active` | `OPERATIONAL` | `fetchActiveMapConfiguration()` | ❌ NO (100% Bypassed) |
