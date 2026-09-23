# 03. USER JOURNEYS & FIELD OPERATION PATHWAYS

> **Audit Domain**: Field Operator Meter Reading Workflows  
> **Verification Level**: `VERIFIED_STATIC` (Source Verified) & `VERIFIED_RUNTIME` (Browser & API Verified)

---

## Journey 1 — Normal Happy Path (OCR Success)

- **Entry Condition**: Employee is logged in (`CSG-0102`), current round is `OPEN` (e.g. `14:00`), meter `SIM-EM-001` is `PENDING`.
- **User Actions**:
  1. Opens Home Hub, taps radial menu trigger (or insight feed card) -> selects "Đo đếm điện năng".
  2. In Reading Worklist, locates meter `SIM-EM-001` in the pending list.
  3. Taps explicit CTA button `"Ghi chỉ số"`.
  4. Rear camera initializes with centered alignment reticle. Operator aligns meter display and taps `"Chụp công tơ"`.
  5. In Image Preview screen, inspects clarity, then taps `"Đọc chỉ số"`.
  6. Sees processing spinner, then arrives at Result screen (Hero value `04582.12 kWh`, ROI crop, meter type `LCD`).
  7. Taps `"Xác nhận chỉ số"`.
  8. Sees Confirmation Success screen (State 4B) with server timestamp.
  9. Taps `"Về danh sách công tơ"`.
- **UI States**: `HomeHub` ──► `ReadingBatchView` ──► `MeterCamera` ──► `Preview` ──► `Processing` ──► `Result (State 4A)` ──► `Success (State 4B)` ──► `ReadingBatchView`.
- **API Calls**:
  - `GET /api/v1/meter-operations/today` (`200 OK`)
  - `POST /api/v1/read-meter` (`200 OK`, `status: "success"`)
  - `POST /api/v1/meter-readings/confirm` (`200 OK`, `confirmation_source: "OCR_CONFIRMED"`)
  - `GET /api/v1/meter-operations/today` (Re-fetch on return)
- **Loading State**: `Processing` shows `.maritime-spinner` with text `"Đang đọc chỉ số... Giữ ứng dụng mở trong giây lát."` Save button shows `"Đang lưu vào sổ..."`.
- **Success / Recovery**: Haptic vibration feedback (`navigator.vibrate(40)`); status pill changes to green `"ĐÃ GHI NHẬN CHỈ SỐ VÀO SỔ"`.
- **Data Loss Risk**: **Zero** during normal flow.
- **Evidence**: `frontend/src/App.tsx` lines 417–537, 822–1148; Screenshots `01`, `05`, `07`, `08`, `09`, `13`.

---

## Journey 2 — OCR Recognition Error (User Correction)

- **Entry Condition**: Camera captures meter clearly, but OCR misreads a digit (e.g. AI recognizes `04582.12`, but true register is `04582.15`).
- **User Actions**:
  1. Arrives at State 4A (Result Verification).
  2. Inspects ROI crop vs. hero number; detects the last digit discrepancy.
  3. Taps inline action button `"Sửa chỉ số"`.
  4. Inline edit box opens with `inputMode="decimal"`. Operator changes `04582.12` to `04582.15`.
  5. Taps `"Lưu chỉnh sửa"`. Hero value updates to `04582.15 kWh`, and a notice appears: `"Đã chỉnh từ kết quả nhận diện 04582.12"`.
  6. Taps `"Xác nhận chỉ số"`.
- **UI States**: `Result (State 4A)` ──► `Inline Edit Form` ──► `Result (Corrected)` ──► `Success (State 4B)`.
- **API Call**:
  - `POST /api/v1/meter-readings/confirm` with payload:
    ```json
    {
      "reading": "04582.15",
      "ocr_reading": "04582.12",
      "confirmation_source": "USER_CORRECTED"
    }
    ```
- **Backend Behavior**: Database stores `reading = "04582.15"`, `ocr_reading = "04582.12"`. Automatically captures a `MeterTrainingSample` with `sample_type = "OCR_CORRECTION"` in `data/meter_training_samples/`.
- **Evidence**: `frontend/src/App.tsx` lines 466–493, 893–990; `backend/app/meter_logbook.py` lines 828–853; Screenshots `09`, `11`, `13`.

---

## Journey 3 — OCR Uncertain (Review Fallback & Manual Entry)

- **Entry Condition**: Image is blurry, dirty, shadowed, or mechanical register is half-turned. YOLO E2 fails detection or recognizer returns empty/low score.
- **User Actions**:
  1. Taps `"Đọc chỉ số"`. OCR pipeline returns `status: "review"`.
  2. Application enters State 5 (Review Fallback). UI displays amber badge `"KHÔNG THỂ NHẬN DIỆN TỰ ĐỘNG"` and support message.
  3. Operator has three choices:
     - **Option A (Manual Entry)**: Taps `"Nhập chỉ số thủ công"`, enters `04582.15`, taps quick dot button `.`, taps `"Xác nhận chỉ số"`. Backend stores `MANUAL_ENTRY` with `ocr_reading = null`.
     - **Option B (Retake)**: Taps `"Chụp lại"`, returns to live camera.
     - **Option C (Mark Review)**: Taps `"Đánh dấu cần kiểm tra"`. Application calls `POST /api/v1/meter-readings/review`, creates a record with `status = "REVIEW"`, `reading = null`, and redirects back to worklist where the card turns amber `"Cần kiểm tra"`.
- **UI States**: `Processing` ──► `Review Box (State 5)` ──► `Manual Entry Box` OR `Worklist (Review Tag)`.
- **Evidence**: `frontend/src/App.tsx` lines 539–617, 1151–1344; `backend/app/meter_logbook.py` lines 860–963; Screenshots `10`, `12`.

---

## Journey 4 — No Active Round (Closed / In-between Shifts)

- **Entry Condition**: All rounds of the operational day are closed, or the current time is outside any scheduled round (e.g. between 11:30 and 13:00, or schedule has not been generated for today).
- **Observed Behavior**:
  1. Operator opens Reading Worklist.
  2. Worklist Summary card displays: `LƯỢT HIỆN TẠI: ---` with gray badge `"Chưa có lượt"`.
  3. Progress bar displays `0/12 đã hoàn thành` (track empty).
  4. Meter cards render gray indicator: `"Chưa có lượt mở"`.
  5. **CTA Disabled**: The `"Ghi chỉ số"` button is **hidden completely** on all meter cards. Tapping card body opens Detail Modal, but the Current Slot card inside detail shows `"Chưa có lượt mở"` with no capture trigger.
- **Evidence**: `frontend/src/components/ReadingBatchView.tsx` lines 223–233, 416–420, 450; Screenshot `15`.

---

## Journey 5 — Confirmed Meter (Read-Only Review & Invariant Protection)

- **Entry Condition**: Meter `SIM-EM-002` has already been recorded and confirmed in the current round (`current_status == "CONFIRMED"`).
- **Observed Behavior**:
  1. Worklist card renders green border, checkmark icon, and displays confirmed value in bold: `04582.10 kWh`.
  2. The `"Ghi chỉ số"` button is **hidden**.
  3. Tapping card body opens Simplified Meter Detail Modal.
  4. Modal displays green check box: `"Đã ghi nhận thành công (13:15:20)"`.
  5. Detail modal provides **no edit button, no retake button, and no overwrite trigger**.
  6. **Security Invariant**: Even if a rogue client attempts `POST /api/v1/meter-readings/confirm` for this round, backend enforces `existing.status == "CONFIRMED"` and rejects with HTTP `409 Conflict`.
- **Evidence**: `frontend/src/components/ReadingBatchView.tsx` lines 424–428, 514–524; `backend/app/meter_logbook.py` lines 709–713; Screenshot `16`.

---

## Journey 6 — Disconnection & Network Failure Scenarios

### 6.1 Disconnection Before OCR
- User captures image; taps `"Đọc chỉ số"`. Network is down.
- Application displays error banner: `"Không thể kết nối đến hệ thống"`.
- `imageFile` and `previewUrl` remain intact in React state.
- Operator can tap `"Thử lại"` once connectivity resumes without losing the photo.

### 6.2 Disconnection During Confirmation
- User taps `"Xác nhận chỉ số"`. HTTP request fails.
- Error banner displays: `"Không thể lưu xác nhận chỉ số."`
- Client stays in Result screen; user can tap `"Xác nhận chỉ số"` again to retry.

### 6.3 Critical Race: Network Drops Post-Commit, Pre-Response (`CRITICAL_HAZARD`)
- Client sends `POST /api/v1/meter-readings/confirm`.
- Backend commits record to database (`status = "CONFIRMED"`).
- Network disconnects before client receives the HTTP 200 JSON body.
- Frontend enters catch block and renders error: `"Không thể lưu xác nhận chỉ số."`
- Operator taps `"Xác nhận chỉ số"` again:
  - Backend evaluates `existing and existing.status == "CONFIRMED"`.
  - Backend responds with HTTP `409 Conflict`: `"Công tơ này đã được xác nhận chỉ số trong lượt hiện tại. V1 không hỗ trợ ghi đè chỉ số đã xác nhận."`
  - Client displays the 409 error message as a failure.
  - If operator exits via Back button, Unsaved Work Modal prompts them to discard unsaved work.
  - When returning to worklist, the meter is actually `CONFIRMED` in the database, confusing the operator.

---

## Journey 7 — Unsaved Work Abandonment

- **Observed Behavior**:
  1. Operator captures a photo or edits a number, then taps in-app back button (`.btn-header-back`).
  2. `UnsavedWorkConfirmModal` appears: `"Hủy kết quả chưa lưu? Dữ liệu này sẽ bị hủy nếu quay lại danh sách."`
  3. If user selects `"Thoát"`: all RAM state is purged (`handleReset()`) and worklist re-mounts.
  4. **Hazard**: If user presses browser back button, device back button, or reloads tab: **no dialog is shown**, and all data is lost instantly.
- **Evidence**: `frontend/src/App.tsx` lines 619–637; `UnsavedWorkConfirmModal.tsx` lines 10–83; Screenshot `14`.

---

## Journey 8 — Round State Transition Mid-Operation

- **Scenario**: Operator opens camera at 13:58 (Round 13:00 is OPEN). While inspecting OCR result, clock reaches 14:01 (Round 13:00 becomes PAST, Round 14:00 becomes CURRENT).
- **Backend Behavior**:
  - In `backend/app/meter_logbook.py` line 660, backend checks `payload.reading_round_id`.
  - As long as the parent batch and the specific round are still `status == "OPEN"`, and `scheduled_at <= now_utc`, the backend **accepts the submission successfully**.
  - The reading is recorded against the 13:00 round as a supplementary/past record.
  - When the operator returns to the worklist, the worklist reflects the newly active 14:00 round, and the meter appears as `PENDING` for 14:00 while showing `13:00` as `latest_confirmed`.
