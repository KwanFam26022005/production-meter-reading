# 02. BUSINESS RULES & DATA MODEL AUDIT

> **Audit Domain**: Business Logic, Data Contracts, Entity Invariants & Validation Policies  
> **Verification Level**: `VERIFIED_STATIC` (Source Code Verified) & `VERIFIED_RUNTIME` (Test Suite Verified)

---

## 1. Domain Entities & Relational Schema

The data model is implemented via SQLAlchemy in `backend/app/models.py` and mapped to SQLite/PostgreSQL.

```text
┌─────────────────┐
│      User       │
│─────────────────│
│ id (PK)         │◄──┐
│ employee_code   │   │
│ full_name       │   │
│ role            │   │
└─────────────────┘   │
                      │ 1:N
┌─────────────────┐   │   ┌───────────────────────────┐
│  ReadingBatch   │   │   │       MeterReading        │
│─────────────────│   │   │───────────────────────────│
│ id (PK)         │   │   │ id (PK)                   │
│ name            │   │   │ meter_id (FK -> Meter)    │
│ period_key      │   │   │ batch_id (FK -> Batch)    │
│ status          │   │   │ reading_round_id (FK)     │
└────────┬────────┘   │   │ user_id (FK -> User) ─────┘
         │ 1:N        │   │ reading (numeric string)  │
         ▼            │   │ ocr_reading (raw AI)      │
┌─────────────────┐   │   │ confirmation_source       │
│  ReadingRound   │   │   │ status (CONFIRMED/REVIEW) │
│─────────────────│   │   │ server_timestamp          │
│ id (PK)         │   │   │ UQ: (meter_id, round_id)  │
│ batch_id (FK)   │   │   └─────────────┬─────────────┘
│ scheduled_at    │   │                 │ 1:1
│ status          │   │                 ▼
└────────┬────────┘   │   ┌───────────────────────────┐
         │ 1:N        │   │   MeterReadingEvidence    │
         ▼            │   │───────────────────────────│
         └────────────┼──►│ id (PK)                   │
                      │   │ meter_reading_id (FK, UQ) │
┌─────────────────┐   │   │ image_filename (.jpg)     │
│      Meter      │   │   │ image_sha256              │
│─────────────────│   │   │ roi_bbox ([x1,y1,x2,y2])  │
│ id (PK)         │   │   └───────────────────────────┘
│ meter_code (UQ) │   │
│ name            │   │   ┌───────────────────────────┐
│ meter_type      │   │   │    MeterTrainingSample    │
│ utility_type    │   │   │───────────────────────────│
│ zone_id (FK)    │   └──►│ id (PK)                   │
│ is_active       │       │ sample_type               │
│ lifecycle_status│       │ corrected_reading         │
└─────────────────┘       │ ocr_reading               │
                          │ image_filename            │
                          │ annotation_status         │
                          └───────────────────────────┘
```

---

## 2. Supported Utilities: Electricity vs. Water Analysis

### 2.1 The Ground Truth: A Two-Speed System (`CRITICAL_FINDING`)
- **Backend Schema & Admin Workspace**:
  - `Meter.utility_type` (`backend/app/models.py` line 181) supports `"ELECTRICITY" | "WATER" | "OTHER" | "UNKNOWN"`.
  - In Admin Digital Twin and Device Workspace (`frontend/src/features/map-operations/`), units dynamically switch:
    `utility_type === 'WATER' || meter_code.startsWith('SIM-WM-') ? 'm³' : 'kWh'`.
- **Field User / Mobile Reading Workflow**:
  - In the field application (`App.tsx`, `ReadingBatchView.tsx`, `DESIGN_DNA.md`, `SKILL.md`), the entire UX is **100% hardcoded to Electricity**:
    - Header subtitle: `"Đo đếm điện năng"`.
    - Hero number: Hardcoded `<span className="reading-hero-unit">kWh</span>`.
    - Inline edit input: Hardcoded `<span className="edit-input-unit">kWh</span>`.
    - Worklist cards: Hardcoded tabular reading `kWh`.
- **Machine Learning Inference Pipeline**:
  - `backend/app/inference.py` lines 17–21:
    ```python
    SEQUENCE_CLASSES = {"lcd_digit_line", "mechanical_black_row"}
    METER_TYPE_MAP = {
        "lcd_digit_line": "lcd",
        "mechanical_black_row": "mechanical",
    }
    ```
  - The frozen YOLO E2 detector **only detects electricity meter register rows** (LCD digital or mechanical rolling number rows). It does **not** contain water dial detector classes or circular dial gauge models.
- **Audit Conclusion**: The current User Field Meter Reading app serves **Electricity meters exclusively** (`kWh`). Water meters exist only as assets/nodes in the Admin Digital Twin and cannot be processed by the current OCR mobile workflow.

---

## 3. Mandatory Business Rules Verification

### 3.1 Reading Batches & Rounds (Đợt & Lượt ghi)

| Question | Verified Rule | Code Reference | Level |
| :--- | :--- | :--- | :--- |
| **When is a batch opened/closed?** | A batch has `status == "OPEN"` or `"CLOSED"`. Only one batch is active at a time. If no batch is open, `/meter-operations/today` returns `batch: null, current_round: null, meters: []`. | `meter_logbook.py` 78–85 | `VERIFIED_STATIC` |
| **Can an operator record past rounds?** | **YES**. Known as "Ghi bổ sung" (Supplementary capture). Any round with `scheduled_at <= now_utc` and `status == "OPEN"` is accepted. In the UI, past unrecorded rounds are displayed under Today History with button "Ghi bổ sung". | `meter_logbook.py` 660–668; `ReadingBatchView.tsx` 640–652 | `VERIFIED_STATIC` |
| **Can an operator record future rounds?** | **NO**. Strictly forbidden. If `round.scheduled_at > now_utc`, the backend rejects with HTTP `400 Bad Request`: `"Chưa đến giờ ghi chỉ số cho lượt này (dự kiến HH:MM)"`. The UI disables the action and tags it `"Sắp tới"`. | `meter_logbook.py` 660–668; `ReadingBatchView.tsx` 169 | `VERIFIED_STATIC` |
| **Can an operator re-record a REVIEW meter?** | **YES**. The UI renders button `"Ghi lại"`. When confirmed, the backend updates the existing REVIEW record in-place to `CONFIRMED`. | `meter_logbook.py` 768–785; `ReadingBatchView.tsx` 450–462 | `VERIFIED_STATIC` |
| **How many records per meter per round?** | **EXACTLY ONE**. Database enforces `UniqueConstraint("meter_id", "reading_round_id", name="uq_meter_round")`. | `models.py` 257 | `VERIFIED_STATIC` |
| **Is attendance check-in required to record?** | **NO**. `confirm_meter_reading` validates user session authentication, but does **not** check whether the user has checked in for their shift today. An employee who has not clocked in can still confirm readings. | `meter_logbook.py` 630–858 | `VERIFIED_STATIC` |

---

### 3.2 Reading Statuses & Lifecycle Transitions

The system defines three operational statuses for a meter within a scheduled round:
1. **PENDING**: No record exists in `meter_readings` for this `(meter_id, reading_round_id)`.
2. **CONFIRMED**: A record exists with `status == "CONFIRMED"` and a valid numeric `reading`.
3. **REVIEW**: A record exists with `status == "REVIEW"` and `reading == null`.

#### State Transition Invariants
- `PENDING ──► CONFIRMED`: Valid via `POST /api/v1/meter-readings/confirm` (`OCR_CONFIRMED`, `USER_CORRECTED`, or `MANUAL_ENTRY`).
- `PENDING ──► REVIEW`: Valid via `POST /api/v1/meter-readings/review` (when OCR returns `status: "review"`).
- `REVIEW ──► CONFIRMED`: Valid via `POST /api/v1/meter-readings/confirm` (updates existing row in-place).
- `CONFIRMED ──► CONFIRMED`: **FORBIDDEN** in V1. Backend returns HTTP `409 Conflict`: `"Công tơ này đã được xác nhận chỉ số trong lượt hiện tại. V1 không hỗ trợ ghi đè chỉ số đã xác nhận."`
- `CONFIRMED ──► REVIEW`: **FORBIDDEN**. Backend returns HTTP `409 Conflict`.

#### Who Processes REVIEW?
- **Field Operator**: Can re-record ("Ghi lại") via supplementary capture or current round capture, converting the REVIEW record into CONFIRMED.
- **Admin**: Has read-only inspection capability (`GET /api/v1/admin/meter-readings/{id}`). Backend has **no admin endpoint to edit or resolve readings directly**.

---

### 3.3 Assignment & Worklist Scope

| Question | Verified Rule | Code Reference | Level |
| :--- | :--- | :--- | :--- |
| **Is the worklist scoped to the logged-in employee?** | **NO**. `get_today_meter_operations` queries `db.query(Meter).filter(Meter.is_active == True)`. All active meters across the port are returned to every employee. | `meter_logbook.py` 1100 | `VERIFIED_STATIC` |
| **What does the progress bar represent?** | The progress bar (`confirmed_current / total_meters`) represents **port-wide progress**, not individual employee progress. | `ReadingBatchView.tsx` 244; `SKILL.md` 180–184 | `VERIFIED_STATIC` |
| **Can employees see others' recording history?** | **YES**. Every reading history record returns `recorded_by: { employee_code, full_name }`. The detail modal explicitly displays who recorded each previous slot. | `meter_logbook.py` 975–982; `ReadingBatchView.tsx` 618 | `VERIFIED_STATIC` |
| **Are there per-meter or per-zone permission checks?** | **NO**. Any authenticated user with role `EMPLOYEE` or `ADMIN` can record any meter in the port. | `meter_logbook.py` 630–684 | `VERIFIED_STATIC` |

---

### 3.4 Numerical Rules & Value Validation

| Question | Verified Rule | Code Reference | Level |
| :--- | :--- | :--- | :--- |
| **Allowed characters & format** | Regex `^\d+(\.\d+)?$`, maximum length 12 characters. Commas are sanitized to dots client-side (`sanitizeReadingInput`, `normalizeReading`). | `App.tsx` 47–78; `meter_logbook.py` 56–58, 685–698 | `VERIFIED_STATIC` |
| **Leading zeros** | **Preserved**. Value is stored and transmitted as a canonical string (`VARCHAR(50)`), preserving leading zeros (e.g. `04582.12`). | `models.py` 237; `meter_logbook.py` 686 | `VERIFIED_STATIC` |
| **Lower reading check** | **NOT IMPLEMENTED**. Backend does not compare the new reading with the previous reading. Entering a lower reading is accepted without error or warning. | `meter_logbook.py` 685–715 | `NOT_IMPLEMENTED` |
| **Spike / Consumption check** | **NOT IMPLEMENTED**. Backend does not perform threshold or statistical anomaly checks. | `meter_logbook.py` 685–715 | `NOT_IMPLEMENTED` |
| **Rollover / Meter swap handling** | **NOT IMPLEMENTED**. No rollover flag or meter replacement multiplier exists in the field flow. | `meter_logbook.py` 685–715 | `NOT_IMPLEMENTED` |
| **Data saved when OCR differs from User Input** | Official confirmed reading receives user input (`reading = clean_reading`). Raw OCR is preserved in `ocr_reading`. Confirmation source is stamped `USER_CORRECTED`. | `meter_logbook.py` 728–736, 770–775 | `VERIFIED_STATIC` |
| **Is image evidence mandatory?** | **NO**. `ConfirmReadingRequest.image_base64` is optional. If missing or if file write fails, backend logs a warning and proceeds with database write: `"Official meter reading must not fail if evidence file persistence fails"`. | `meter_logbook.py` 543, 811–856; `schemas.py` 252 | `VERIFIED_STATIC` |
