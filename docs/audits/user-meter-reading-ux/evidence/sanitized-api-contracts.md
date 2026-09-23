# Sanitized API Contracts for Meter Reading Operations

This document records the exact, verified HTTP REST contracts implemented in FastAPI (`backend/app/main.py`, `meter_logbook.py`, `schemas.py`) for field meter reading. All sensitive tokens, user passwords, and internal hashes have been sanitized.

---

## 1. Authentication & Bootstrap

### `POST /api/v1/auth/login`
- **Purpose**: Authenticates operator/administrator.
- **Request Body**:
  ```json
  {
    "employee_code": "CSG-0102",
    "password": "[REDACTED]"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "status": "success",
    "user": {
      "id": "u-emp-0102",
      "employee_code": "CSG-0102",
      "full_name": "Nguyễn Văn Tuấn",
      "role": "EMPLOYEE",
      "is_active": true
    },
    "message": "Đăng nhập thành công."
  }
  ```
- **Cookie**: `csg_session=[SECURE_HTTP_ONLY_TOKEN]; Path=/; HttpOnly; SameSite=Lax`

### `GET /api/v1/auth/me`
- **Purpose**: Validates active session and returns user profile.
- **Response** (`200 OK`): User object.

---

## 2. Reading Operations & Worklist

### `GET /api/v1/meter-operations/today`
- **Caller**: `ReadingBatchView.tsx` (`loadData()`), `HomeHub.tsx`.
- **Query Params**: `date` (optional, format `YYYY-MM-DD`, defaults to current date in `Asia/Ho_Chi_Minh`).
- **Response** (`200 OK`):
  ```json
  {
    "date": "2026-09-21",
    "date_formatted": "21/09/2026",
    "batch": {
      "id": "batch-2026-09",
      "name": "Kỳ đọc chỉ số mô phỏng 09/2026",
      "period_key": "2026-09",
      "status": "OPEN",
      "progress": {
        "total": 12,
        "confirmed": 4,
        "review": 1,
        "pending": 7
      }
    },
    "current_round": {
      "id": "round-0921-1400",
      "batch_id": "batch-2026-09",
      "scheduled_at": "2026-09-21T07:00:00Z",
      "scheduled_local": "14:00 - 21/09/2026",
      "scheduled_time_only": "14:00",
      "status": "OPEN",
      "is_legacy": false,
      "timing_state": "CURRENT",
      "progress": {
        "total": 12,
        "confirmed": 4,
        "review": 1,
        "pending": 7
      }
    },
    "summary": {
      "total_meters": 12,
      "confirmed_current": 4,
      "pending_current": 7,
      "review_current": 1,
      "percent_current": 33
    },
    "meters": [
      {
        "meter": {
          "id": "meter-uuid-001",
          "meter_code": "SIM-EM-001",
          "name": "Công tơ Điện Trạm Biến Áp T1",
          "location": "Trạm Biến Áp T1, Kho K1",
          "meter_type": "LCD",
          "is_active": true,
          "lifecycle_status": "ACTIVE"
        },
        "current_status": "PENDING",
        "current_reading": null,
        "current_round_id": "round-0921-1400",
        "current_scheduled_time": "14:00",
        "current_recorded_local": null,
        "latest_confirmed": {
          "reading": "04582.10",
          "ocr_reading": "04582.10",
          "confirmation_source": "OCR_CONFIRMED",
          "round_id": "round-0921-1300",
          "round_time": "13:00",
          "server_timestamp": "2026-09-21T06:15:20Z",
          "formatted_server_time": "13:15:20 - 21/09/2026",
          "is_today": true
        },
        "today_slots": [],
        "recent_slots": [],
        "trend": [],
        "missed_count": 0
      }
    ]
  }
  ```

---

## 3. Transient OCR Inference

### `POST /api/v1/read-meter`
- **Caller**: `App.tsx` (`handleReadMeter()`).
- **Headers**: `X-CSRF-Token: [TOKEN]`
- **Content-Type**: `multipart/form-data`
- **Payload**: `file: UploadFile` (binary JPG/PNG, max 12MB).
- **Backend Behavior**: Transient memory decoding in RAM via OpenCV. No disk write.
- **Success Response** (`200 OK`):
  ```json
  {
    "status": "success",
    "reading": "04582.12",
    "meter_type": "lcd",
    "det_confidence": 0.942,
    "ocr_confidence": 0.978,
    "localization_imgsz": 960,
    "pipeline_version": "e2-adaptive-ppocrv6-medium-v1",
    "roi_bbox": [0.18, 0.33, 0.82, 0.67]
  }
  ```
- **Review Response** (`200 OK`):
  ```json
  {
    "status": "review",
    "reading": null,
    "meter_type": "mechanical",
    "det_confidence": 0.65,
    "ocr_confidence": null,
    "localization_imgsz": 960,
    "pipeline_version": "e2-adaptive-ppocrv6-medium-v1",
    "roi_bbox": [0.15, 0.30, 0.85, 0.70]
  }
  ```

---

## 4. Reading Confirmation & Review

### `POST /api/v1/meter-readings/confirm`
- **Caller**: `App.tsx` (`handleConfirmReading()` / `handleConfirmManualReading()`).
- **Headers**: `X-CSRF-Token: [TOKEN]`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "meter_id": "meter-uuid-001",
    "reading_round_id": "round-0921-1400",
    "batch_id": "batch-2026-09",
    "reading": "04582.12",
    "ocr_reading": "04582.12",
    "confirmation_source": "OCR_CONFIRMED",
    "meter_type": "lcd",
    "det_confidence": 0.942,
    "ocr_confidence": 0.978,
    "localization_imgsz": 960,
    "pipeline_version": "e2-adaptive-ppocrv6-medium-v1",
    "roi_bbox": [0.18, 0.33, 0.82, 0.67],
    "image_base64": "data:image/jpeg;base64,[SANITIZED_IMAGE_BYTES]"
  }
  ```
- **Validation Rules**:
  - `round.status == "OPEN"` (400 if closed).
  - `batch.status == "OPEN"` (400 if closed).
  - `round.scheduled_at <= now` (400 if future round).
  - `meter.lifecycle_status == "ACTIVE"` (400 if RETIRED/INACTIVE).
  - `reading` matches regex `^\d+(\.\d+)?$` and length <= 12.
  - If existing reading is already `CONFIRMED`: Returns `409 Conflict`.
  - If existing reading is `REVIEW`: Updates in-place to `CONFIRMED`.
  - Enforces provenance:
    - `OCR_CONFIRMED`: `reading == ocr_reading` and `ocr_reading != null`.
    - `USER_CORRECTED`: `ocr_reading != null`.
    - `MANUAL_ENTRY`: `ocr_reading == null`.
- **Response** (`200 OK`):
  ```json
  {
    "status": "success",
    "reading_id": "mr-uuid-10023",
    "meter_id": "meter-uuid-001",
    "batch_id": "batch-2026-09",
    "reading_round_id": "round-0921-1400",
    "round_scheduled_local": "14:00 - 21/09/2026",
    "reading_status": "CONFIRMED",
    "reading": "04582.12",
    "ocr_reading": "04582.12",
    "confirmation_source": "OCR_CONFIRMED",
    "server_timestamp": "2026-09-21T07:05:12Z",
    "formatted_time": "14:05:12 - 21/09/2026",
    "message": "Đã xác nhận chỉ số 04582.12 thành công lúc 14:05:12 - 21/09/2026."
  }
  ```

### `POST /api/v1/meter-readings/review`
- **Caller**: `App.tsx` (`handleMarkReview()`).
- **Headers**: `X-CSRF-Token: [TOKEN]`
- **Request Body**:
  ```json
  {
    "meter_id": "meter-uuid-001",
    "reading_round_id": "round-0921-1400",
    "batch_id": "batch-2026-09",
    "meter_type": "mechanical",
    "det_confidence": 0.65,
    "ocr_confidence": null,
    "localization_imgsz": 960,
    "pipeline_version": "e2-adaptive-ppocrv6-medium-v1"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "status": "success",
    "reading_id": "mr-uuid-10024",
    "meter_id": "meter-uuid-001",
    "batch_id": "batch-2026-09",
    "reading_round_id": "round-0921-1400",
    "round_scheduled_local": "14:00 - 21/09/2026",
    "reading_status": "REVIEW",
    "reading": null,
    "server_timestamp": "2026-09-21T07:06:01Z",
    "formatted_time": "14:06:01 - 21/09/2026",
    "message": "Đã ghi nhận trạng thái Cần kiểm tra lúc 14:06:01 - 21/09/2026."
  }
  ```
