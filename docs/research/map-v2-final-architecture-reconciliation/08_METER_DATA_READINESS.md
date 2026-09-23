# Map V2 Final Architecture Reconciliation — 08. Meter Data Readiness & Measurement Unit Audit

**Thread:** 6 — Map V2 Final Architecture Reconciliation  
**Objective:** Audit live meter data availability on Map V2 and verify measurement unit data integrity.

---

## 1. Meter Data Availability Audit

A thorough audit of [`backend/app/schemas.py#L1062`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/schemas.py#L1062), [`backend/app/map_operations.py#L264`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L264), and [`frontend/src/types.ts#L1168`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/types.ts#L1168) reveals that **live meter data is already fully projected by the backend**:

| Field Required by Map V2 | Backend Field | Frontend Type | Availability Status | Source Code Pointer |
| :--- | :--- | :--- | :---: | :--- |
| **Meter Identity** | `id`, `meter_code`, `name` | `string` | `ALREADY_AVAILABLE` | [`models.py#L176-L178`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L176) |
| **Utility Type** | `utility_type` (`ELECTRICITY`, `WATER`) | `string` | `ALREADY_AVAILABLE` | [`models.py#L190`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L190) |
| **Physical Location** | `location` | `string \| null` | `ALREADY_AVAILABLE` | [`models.py#L179`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L179) |
| **Operational Zone** | `zone_id`, `zone_code`, `zone_name` | `string \| null` | `ALREADY_AVAILABLE` | [`map_operations.py#L272-L274`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L272) |
| **Presentation Zone** | `presentation_zone_id`, `name` | `string \| null` | `ALREADY_AVAILABLE` | [`map_operations.py#L275-L276`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L275) |
| **Normalized Coordinates** | `map_x`, `map_y` ($0.0 \le c \le 1.0$) | `number \| null` | `ALREADY_AVAILABLE` | [`models.py#L183-L184`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L183) |
| **Lifecycle Status** | `lifecycle_status` (`ACTIVE`, `INACTIVE`) | `string` | `ALREADY_AVAILABLE` | [`models.py#L187`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L187) |
| **Semantic Reading State** | `semantic_state` | `string` | `ALREADY_AVAILABLE` | [`map_operations.py#L195-L235`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L195) |
| **Latest Reading Value** | `latest_reading_value` | `string \| null` | `ALREADY_AVAILABLE` | [`map_operations.py#L209-L217`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L209) |
| **Latest Reading Time** | `latest_reading_time` | `string \| null` | `ALREADY_AVAILABLE` | [`map_operations.py#L206`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L206) |
| **Exception Details** | `exception_state`, `exception_label` | `string \| null` | `ALREADY_AVAILABLE` | [`map_operations.py#L213-L221`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L213) |
| **Reading Record ID** | `reading_id` | `string \| null` | `ALREADY_AVAILABLE` | [`map_operations.py#L205`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/map_operations.py#L205) |
| **Data Provenance** | `data_origin` (`REAL`, `SIMULATED`) | `string` | `ALREADY_AVAILABLE` | [`models.py#L191`](file:///D:/Projects/production-meter-reading/production-meter-reading/backend/app/models.py#L191) |

---

## 2. Measurement Unit Data Gap Audit

In accordance with Section 13:
> *"Do NOT assume ELECTRICITY = kWh, WATER = m³ unless the domain model explicitly contains a measurement-unit contract or Cảng business rules confirm the mapping. Search current source for: measurement_unit, unit, multiplier, scale, meter_factor, rollover, replacement."*

### Search Findings
A comprehensive codebase audit reveals:
1. **`models.py`**: **ZERO occurrences** of `measurement_unit`, `unit`, `multiplier`, `scale`, `meter_factor`, `rollover`, or `replacement`.
2. **`schemas.py`**: Contains `utility_type: Optional[str]`, but **NO unit field** on `MapMeterOut`, `MeterOut`, or `AdminMeterItem`.
3. **`App.tsx`**: Contains a single hardcoded `<span className="edit-input-unit">kWh</span>` at line 1545 in the manual reading entry input.
4. **`DESIGN_DNA.md`**: Mentions kWh as a typography requirement for field OCR display, but this reflects early electric meter focus, not an authoritative multi-utility schema.

### Formal Gap Classification
**`MEASUREMENT_UNIT_DATA_GAP`**  
The database currently records raw numerical readings as strings without an authoritative measurement unit or transformation multiplier.

### Safe Implementation Policy for Map V2
1. **Avoid Hardcoded Unit Suffixes**: Do NOT hardcode `"kWh"` or `"m³"` next to meter reading values on Map V2.
2. **Utility-First Iconography**: Communicate utility identity via unambiguous outlined icons:
   - ⚡ Electricity (`Zap` icon, `#FFB703` / `#FCC959`)
   - 💧 Water (`Droplets` icon, `#0068FF`)
3. **Number Display Standard**: Render the raw reading in high-contrast tabular figures (`tabular-nums lining-nums`), e.g.:
   - `⚡ CT-001 · 10452.8`
   - `💧 DH-002 · 842.15`
4. **Target-State Recommendation**: When schema extensions are authorized in Phase C, add `measurement_unit` (`VARCHAR(16)`) and `multiplier` (`FLOAT DEFAULT 1.0`) to the `meters` table.

---

## 3. Minimal Safe Meter Hover & Inspector Contract

### L2: Meter Hover Preview (Transient Tooltip)
- **Identity**: `[⚡ | 💧] {meter_code}`
- **Name**: `{name}`
- **Semantic State Badge**:
  - `Đã ghi` (`CONFIRMED`, green dot)
  - `Cần kiểm tra` (`REVIEW`, amber warning)
  - `Trễ hạn` (`OVERDUE`, red alert)
  - `Đến hạn` (`DUE`, blue dot)
  - `Chưa mở lượt` (`PENDING`, neutral dot)
- **Latest Reading Value**: Tabular formatted number (raw value without unverified unit).
- **Time**: Concise time formatted as `HH:mm · DD/MM`.

### L3: Meter Inspector Dock (Contextual Side Rail)
- **Header**: Meter code, name, utility icon, location string, and lifecycle status (`Hoạt động`).
- **Round Reading Card**:
  - Semantic status banner with icon.
  - Large tabular reading value (32–40px).
  - Time of confirmation and server timestamp.
  - Submitter indication (if recorded).
- **Actions**:
  - `[Kiểm tra ảnh chỉ số]` ➔ Calls `openReadingInspection(reading_id)`.
  - `[Xem hồ sơ thiết bị]` ➔ Calls `openMeterDetails(meter_id, meter_code)`.
  - `[Xem lịch sử ghi]` ➔ Navigates to technical reading log.
- **Simulation Disclosure**: If `data_origin == "SIMULATED"`, render visible notice: `"Công tơ mô phỏng (Demo)"`.
