# 07. API INVENTORY & END-TO-END DATA FLOW

> **Audit Domain**: Backend REST Endpoints, Payload Contracts, File Policies & Data Lifecycles  
> **Verification Level**: `VERIFIED_STATIC` & `VERIFIED_RUNTIME`

---

## 1. Complete Meter Reading API Table

| HTTP Method & Path | Frontend Caller | Auth & Role Required | Request Payload | Response Schema | DB Writes / Mutations | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/meter-operations/today` | `ReadingBatchView.tsx` (`loadData()`) | Cookie session (`EMPLOYEE`, `ADMIN`) | Query: `date?: YYYY-MM-DD` | `TodayOperationsResponse` | **None** (Read-only) | `401 Unauthorized` |
| `GET /api/v1/reading-batches/{id}/rounds` | `ReadingBatchView.tsx` (Schedule Modal) | Cookie session (`EMPLOYEE`, `ADMIN`) | Path: `batch_id`, Query: `date` | `ReadingRoundListResponse` | **None** (Read-only) | `401`, `404 Not Found` |
| `GET /api/v1/meters/{id}` | `ReadingBatchView.tsx` (Detail Modal) | Cookie session (`EMPLOYEE`, `ADMIN`) | Path: `meter_id` | `MeterDetailResponse` | **None** (Read-only) | `401`, `404 Not Found` |
| `GET /api/v1/meters/{id}/readings` | `ReadingBatchView.tsx` (Detail History) | Cookie session (`EMPLOYEE`, `ADMIN`) | Path: `meter_id` | `list[MeterReadingHistoryItem]` | **None** (Read-only) | `401`, `404 Not Found` |
| `POST /api/v1/read-meter` | `App.tsx` (`handleReadMeter()`) | Cookie session + `X-CSRF-Token` | `multipart/form-data`: `file` (JPG/PNG <= 12MB) | `MeterReadResponse` | **None** (Transient RAM inference only) | `400 Bad Request`, `401`, `403 CSRF`, `413 File Too Large`, `415 Unsupported Media` |
| `POST /api/v1/meter-readings/confirm` | `App.tsx` (`handleConfirmReading()`) | Cookie session + `X-CSRF-Token` | `application/json`: `ConfirmReadingRequest` | `MeterReadingActionResponse` | `INSERT/UPDATE meter_readings`, `INSERT meter_reading_evidence`, `INSERT meter_training_samples` | `400 Bad Request`, `401`, `403 CSRF`, `404 Not Found`, `409 Conflict` (Already confirmed) |
| `POST /api/v1/meter-readings/review` | `App.tsx` (`handleMarkReview()`) | Cookie session + `X-CSRF-Token` | `application/json`: `MarkReviewRequest` | `MeterReadingActionResponse` | `INSERT/UPDATE meter_readings` (`status = "REVIEW"`, `reading = null`) | `400 Bad Request`, `401`, `403 CSRF`, `404 Not Found`, `409 Conflict` (Already confirmed) |
| `GET /api/v1/admin/meter-readings/{id}`| `AdminReadingInspection.tsx` | Cookie session (`ADMIN` role required) | Path: `reading_id` | `AdminMeterReadingInspectionResponse`| **None** (Read-only audit view) | `401`, `403 Forbidden`, `404 Not Found` |

---

## 2. Reading Value Provenance: Prediction vs. Official Record

When a reading is processed, the system maintains strict distinctions across four conceptual values:

```text
┌───────────────────────────┐     ┌───────────────────────────┐
│     Raw OCR Prediction    │     │   User-Edited Correction  │
│───────────────────────────│     │───────────────────────────│
│ result.reading (RAM)      │     │ editReadingValue (RAM)    │
│ Example: "04582.12"       │     │ Example: "04582.15"       │
└─────────────┬─────────────┘     └─────────────┬─────────────┘
              │                                 │
              ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Official Persisted MeterReading                │
│─────────────────────────────────────────────────────────────│
│ reading             = "04582.15"  (Official Billing Truth)  │
│ ocr_reading         = "04582.12"  (Immutable AI Audit Log)  │
│ confirmation_source = "USER_CORRECTED"                      │
│ status              = "CONFIRMED"                           │
└─────────────────────────────────────────────────────────────┘
```

1. **OCR Prediction (`ocr_reading`)**: The raw string output from `PP-OCRv6-Medium`. Stored immutably for algorithm performance evaluation.
2. **User-Edited Reading (`reading`)**: The final value vetted by the human eye. In all billing reports and exports, **the user's confirmed value is authoritative**.
3. **Confirmation Source**:
   - `"OCR_CONFIRMED"`: User confirmed the OCR prediction without modifying any digits.
   - `"USER_CORRECTED"`: User edited one or more digits from the OCR prediction.
   - `"MANUAL_ENTRY"`: OCR failed or was in review; user typed the number from scratch (`ocr_reading == null`).
4. **REVIEW State**: `reading = null`, `status = "REVIEW"`. Serves as an unfulfilled operational placeholder requiring follow-up inspection.

---

## 3. Image Pipeline & Storage Lifecycle

### 3.1 Inference Image (Transient RAM)
- Sent via `POST /api/v1/read-meter`.
- Read into memory buffer via `file.read()`.
- Decoded by OpenCV (`cv2.imdecode`).
- Inverted/normalized and processed through YOLO and PaddleOCR.
- **Persistence Policy**: **Zero disk write**. Memory buffer is garbage collected immediately upon function return.

### 3.2 Operational Evidence Image (`data/meter_reading_evidence/`)
- When user confirms a reading, `image_base64` is received by `confirm_meter_reading`.
- Backend strips EXIF metadata, re-encodes to clean **JPEG Quality 95**, calculates SHA256 hash, and writes to `data/meter_reading_evidence/<uuid>.jpg`.
- Saves a row in `meter_reading_evidence` table linked 1:1 with `meter_readings.id`.
- **Fault-Tolerance**: If disk write fails (e.g. disk full), backend catches the exception, logs a warning, and **still commits the official numerical reading**. Official records are never lost due to photo storage failures.

### 3.3 Training Sample Image (`data/meter_training_samples/`)
- Triggered automatically whenever `confirmation_source` is `USER_CORRECTED` or `MANUAL_ENTRY`.
- Strips EXIF, re-encodes to JPEG Q95, and saves a duplicate copy in `data/meter_training_samples/<uuid>.jpg`.
- Creates a `meter_training_samples` row with `annotation_status`:
  - `"READY_OCR"` if YOLO localized a valid ROI bbox.
  - `"NEEDS_BBOX"` if localization failed.
- **Privacy & Sanitization**: Stored outside public static web roots; access requires administrative authentication.
