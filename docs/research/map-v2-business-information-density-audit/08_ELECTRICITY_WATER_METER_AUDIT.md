# Map V2 Business & Information Density Audit — 08. Electricity & Water Meter Audit

## 1. Meter Data Model (Backend)

Source: `backend/app/models.py#L173`

| Field | Type | Meaning | Evidence |
| :--- | :--- | :--- | :--- |
| id | String(36) | UUID | models.py#L176 |
| meter_code | String(50) | Unique identifier | models.py#L177 |
| name | String(200) | Display name | models.py#L178 |
| location | String(200) | Physical location text | models.py#L179 |
| meter_type | String(50) | LCD / MECHANICAL / UNKNOWN | models.py#L180 |
| zone_id | FK → operational_zones | Zone membership | models.py#L181 |
| presentation_zone_id | String(50) | Display zone override | models.py#L182 |
| map_x, map_y | Float | Coordinates | models.py#L183-184 |
| route_status | String(50) | VALID / REVIEW_REQUIRED / INVALID | models.py#L185 |
| is_active | Boolean | Active status | models.py#L186 |
| lifecycle_status | String(20) | ACTIVE / INACTIVE / RETIRED | models.py#L187 |
| reading_method | String(32) | MANUAL / OCR / PULSE / ... | models.py#L188 |
| utility_type | String(32) | ELECTRICITY / WATER / OTHER / UNKNOWN | models.py#L190 |
| data_origin | String(32) | REAL / SIMULATED / LEGACY_SIMULATION | models.py#L191 |
| scenario_id | String(64) | Demo scenario identifier | models.py#L192 |

## 2. Critical Distinctions

### Utility Type vs Meter Type
- **utility_type**: ELECTRICITY vs WATER — the type of utility measured
- **meter_type**: LCD vs MECHANICAL — the display technology
- These are INDEPENDENT dimensions. An electricity meter can be LCD or mechanical.

### Unit Implications
- Electricity meters: kWh (kilowatt-hours)
- Water meters: m³ (cubic meters)
- The UI must show the correct unit based on utility_type, NOT meter_type

### Cumulative Reading vs Period Consumption
- `MeterReading.reading` stores the cumulative meter reading
- Period consumption = current reading − previous reading
- The UI must NOT confuse these two values

## 3. Map V2 Meter Representation

Currently on Map V2, meters appear in two contexts:

### A. Utility Network Demo (MapV2UtilityLayer.tsx)
- Shows SIMULATED network topology
- Nodes represent sources, feeders, and meter points
- SVG tooltip on hover with code, label, type
- No connection to backend meter data
- Provenance: SIMULATED

### B. Individual Meter Markers
- NOT IMPLEMENTED on Map V2
- Backend `Meter` model has `map_x`, `map_y` fields
- But these coordinates may be in Map V1 coordinate system, not Map V2's 1536×1024 space

## 4. Potential UI Errors to Watch For

| Risk | Current Status | Evidence |
| :--- | :--- | :--- |
| kWh shown for water meter | NOT APPLICABLE — no meter readings shown on Map V2 | — |
| Cumulative vs consumption confusion | NOT APPLICABLE — no readings shown | — |
| Fallback coordinates as verified | map_x/map_y exist but coordinate system unclear | models.py#L183-184 |
| REVIEW confused with MISSING | NOT APPLICABLE — no reading status on Map V2 | — |
| Due vs overdue not distinguished | NOT APPLICABLE — no scheduling on Map V2 | — |

## 5. Recommended Meter Hover (L2) — Future State

| Field | Source | Readiness |
| :--- | :--- | :--- |
| Meter code + name | Meter table | NEEDS_BACKEND_DATA |
| Utility type (Điện/Nước) + icon | Meter.utility_type | NEEDS_BACKEND_DATA |
| Zone name | Meter → Zone join | NEEDS_BACKEND_DATA |
| Last reading value + unit | MeterReading | NEEDS_BACKEND_DATA |
| Last reading timestamp | MeterReading.created_at | NEEDS_BACKEND_DATA |
| Reading status | MeterReading.status | NEEDS_BACKEND_DATA |

## 6. Recommended Meter Inspector (L3) — Future State

| Field | Source | Readiness |
| :--- | :--- | :--- |
| Meter code, name, location | Meter table | NEEDS_BACKEND_DATA |
| Utility type + meter type | Meter table | NEEDS_BACKEND_DATA |
| Unit (kWh / m³) | Derived from utility_type | UI_ONLY_READY |
| Current round reading | MeterReading | NEEDS_BACKEND_DATA |
| Reader identity | MeterReading.user_id → User | NEEDS_BACKEND_DATA |
| Confirmation status | MeterReading.status | NEEDS_BACKEND_DATA |
| Confirmation source | MeterReading.confirmation_source | NEEDS_BACKEND_DATA |
| Reading history (last 3-5) | MeterReading history query | NEEDS_BACKEND_DATA |
| Photo evidence | Photo storage | NEEDS_BACKEND_DATA |
| Exception flags | Derived from status + thresholds | NEEDS_BACKEND_DATA |
| Link to meter report | Route to Báo cáo tab | NEEDS_FRONTEND_INTEGRATION |
| Coordinate provenance | map_x/map_y + source | NEEDS_BUSINESS_CONFIRMATION |
