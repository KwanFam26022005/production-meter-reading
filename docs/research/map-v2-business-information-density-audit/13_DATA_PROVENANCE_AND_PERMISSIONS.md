# Map V2 Business & Information Density Audit — 13. Data Provenance & Permissions

## 1. Data Provenance Classification

| Data Category | Source | Provenance | On Map V2 |
| :--- | :--- | :--- | :--- |
| Zone polygon geometry | tan_thuan_1_zones_edited.json | STATIC_JSON (frozen B2 hash) | Displayed |
| Zone anchors | zoneAnchors.ts | STATIC_CODE | Displayed |
| Zone labels | zoneAnchors.ts + JSON | STATIC | Displayed |
| Employee assignments | DEMO_MAP_V2_EMPLOYEES | DEMO_ONLY | Displayed with disclosure |
| Employee motion | employeeMovement.ts | SIMULATED_ANIMATION | Displayed with disclosure |
| Utility network topology | utilityDemoLayout.ts | SIMULATED | Displayed with disclosure |
| Meter positions (utility) | utilityDemoLayout.ts | SIMULATED | Displayed in utility mode |
| Zone meter progress | employeeDataAdapter.ts hardcoded strings | DEMO_ONLY | Displayed in inspector |
| Map base image | assets/map-version3.png | STATIC_ASSET | Background layer |
| Coordinate system | 1536×1024 canonical pixel space | DEFINED_BY_DESIGN | Used for all positioning |

### Nothing on Map V2 comes from real-time backend APIs.

## 2. Backend Data That EXISTS But Is Not Consumed by Map V2

| Backend Table | Endpoint | Map V2 Usage |
| :--- | :--- | :--- |
| OperationalZone | No direct endpoint for Map V2 | NOT CONSUMED |
| ZoneAssignment | No endpoint | NOT CONSUMED |
| Meter | /api/v1/meters/{id} | NOT CONSUMED |
| MeterReading | /api/v1/meter-operations/today | NOT CONSUMED |
| ReadingRound | /api/v1/rounds | NOT CONSUMED |
| User | /api/v1/auth/me (current user only) | NOT CONSUMED |
| WorkSchedule | No endpoint for Map V2 | NOT CONSUMED |
| AttendanceEvent | No endpoint for Map V2 | NOT CONSUMED |

## 3. Permission Model

Current state: Map V2 has NO permission gating.

| Action | Current Permission | Recommended Permission |
| :--- | :--- | :--- |
| View Map V2 | Any authenticated admin | Any authenticated admin |
| View operational data (progress, employees) | None (demo data) | Operations role |
| Switch to Technical mode | Anyone | Technical/admin role |
| View coordinates | Anyone | Technical/admin role |
| Copy geometry data | Anyone | Technical/admin role |
| Toggle utility network | Anyone | Any admin |
| View meter reading data | N/A (not available) | Operations role |
| View employee schedule data | N/A | Operations role |
| Export data | Not available | Admin role |

### Recommendation
Geometry inspection and coordinate copying should be gated to Technical/Admin roles when operational data is integrated. Operations users should not need to see raw polygon vertices.
