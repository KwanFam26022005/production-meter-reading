# 08. VISUAL EVIDENCE SCREENSHOT MANIFEST

> **Evidence Directory**: `docs/audits/user-meter-reading-ux/screenshots/`  
> **Total Files Captured**: 18 of 18 (100% Complete)  
> **Capture Engine**: Microsoft Edge Headless via `playwright-core`  
> **Privacy Guarantee**: 100% Sanitized Demo/Test data. Zero production credentials, zero real employee photos.

---

## 1. Complete Screenshot Inventory

| # | Filename | Screen / State | Viewport | Provenance Level | Description & Reproduction Method | Sensitive Data |
| :-: | :--- | :--- | :---: | :---: | :--- | :---: |
| **01** | `01-reading-worklist-top-mobile.png` | Reading Worklist (Top) | 390 × 844 | `REAL_TEST_RUNTIME` | Worklist top summary card, port progress, search, and segmented filter bar. Logged in as `CSG-0102`. | None (Demo) |
| **02** | `02-reading-worklist-scrolled-mobile.png` | Reading Worklist (Scrolled) | 390 × 844 | `REAL_TEST_RUNTIME` | Worklist scrolled down 350px. Shows sticky segmented filter bar anchored under header, and meter cards. | None (Demo) |
| **03** | `03-meter-detail-mobile.png` | Simplified Meter Detail Modal | 390 × 844 | `REAL_TEST_RUNTIME` | Tapped card body of `SIM-EM-001`. Shows modal header, current slot status, and collapsed today history. | None (Demo) |
| **04** | `04-hourly-schedule-mobile.png` | Hourly Schedule Inspection Modal | 390 × 844 | `REAL_TEST_RUNTIME` | Tapped "Lịch theo giờ" in worklist summary card. Displays rounds list and progress status pills. | None (Demo) |
| **05** | `05-camera-ready-mobile.png` | Live Camera View | 390 × 844 | `TEST_FIXTURE` | Tapped "Ghi chỉ số" with active round fixture. Shows rear camera video stream with alignment reticle. | Synthetic Canvas |
| **06** | `06-camera-permission-error-mobile.png` | Camera Permission Denied | 390 × 844 | `TEST_FIXTURE` | Intercepted `getUserMedia` to reject with `NotAllowedError`. Shows permission warning box and retry CTA. | None |
| **07** | `07-image-preview-mobile.png` | Image Preview Screen | 390 × 844 | `TEST_FIXTURE` | Uploaded test meter image. Shows centered photo preview, "Đọc chỉ số" (Primary) and "Chụp lại" (Secondary). | Synthetic Canvas |
| **08** | `08-ocr-processing-mobile.png` | OCR Processing State | 390 × 844 | `TEST_FIXTURE` | Intercepted `/api/v1/read-meter` with artificial delay. Shows `.processing-card` and `.maritime-spinner`. | None |
| **09** | `09-ocr-success-mobile.png` | Result Verification (State 4A) | 390 × 844 | `TEST_FIXTURE` | OCR success response (`04582.12 kWh`). Shows hero number, unit, ROI segmented toggle, and action buttons. | Synthetic Canvas |
| **10** | `10-ocr-review-mobile.png` | Review Fallback (State 5) | 390 × 844 | `TEST_FIXTURE` | OCR review response (`status: review`). Shows amber alert badge, manual entry button, retake, mark review. | Synthetic Canvas |
| **11** | `11-edit-reading-mobile.png` | Inline Reading Correction | 390 × 844 | `TEST_FIXTURE` | Tapped "Sửa chỉ số" in State 4A. Shows inline edit input, quick decimal dot button `.`, save and cancel buttons. | Synthetic Canvas |
| **12** | `12-manual-entry-mobile.png` | Manual Reading Entry Form | 390 × 844 | `TEST_FIXTURE` | Tapped "Nhập chỉ số thủ công" in State 5. Shows manual entry form, decimal dot button, confirm and cancel. | Synthetic Canvas |
| **13** | `13-confirmation-success-mobile.png` | Confirmation Success (State 4B) | 390 × 844 | `TEST_FIXTURE` | Confirm returned 200 OK. Shows green banner `"ĐÃ GHI NHẬN CHỈ SỐ VÀO SỔ"`, official number, timestamp, back CTA. | None |
| **14** | `14-unsaved-work-modal-mobile.png` | Unsaved Work Confirmation Modal | 390 × 844 | `TEST_FIXTURE` | Tapped top-left back button while photo preview was active. Shows modal `"Hủy kết quả chưa lưu?"`. | None |
| **15** | `15-no-active-round-mobile.png` | No Active Round Worklist | 390 × 844 | `REAL_TEST_RUNTIME` | Worklist view on today's date (no rounds currently open). Shows `"Chưa có lượt"`, CTA buttons suppressed. | None (Demo) |
| **16** | `16-confirmed-meter-mobile.png` | Confirmed Meter Detail Modal | 390 × 844 | `TEST_FIXTURE` | Detail modal for a confirmed meter showing green check box, recorded value, and immutable audit timestamp. | None (Demo) |
| **17** | `17-reading-worklist-tablet.png` | Tablet Worklist View | 768 × 1024 | `REAL_TEST_RUNTIME` | Reading worklist rendered on iPad/tablet viewport. Shows centered container layout and responsive header. | None (Demo) |
| **18** | `18-reading-worklist-desktop.png` | Desktop Worklist View | 1280 × 800 | `REAL_TEST_RUNTIME` | Reading worklist rendered on desktop viewport. Illustrates single-column max-width constraint (480px). | None (Demo) |

---

## 2. Limitations of Evidence

1. **Synthetic Image for OCR Verification**:
   - Because the audit was conducted on a development machine without physical access to outdoor maritime electrical substations, a synthetic 640x480 high-contrast meter dial canvas was used for preview and OCR simulation.
   - The OCR bounding box and confidence score (`0.942`, `0.978`) match canonical test outputs from the actual model test suite (`tests/test_meter_logbook.py`).
2. **Active Round Mocking (`TEST_FIXTURE`)**:
   - The active database seed in the repository has schedules for historical dates (e.g. `2026-09-16`). Because the local date during the audit was `2026-09-21`, today had no scheduled rounds (`current_round: null`).
   - Rather than violating safety rules by executing SQL mutations on `app.db`, screenshots `05–14` and `16` utilized an isolated Playwright route fixture to inject an active round for today, faithfully rendering the exact UI components that appear during operational hours.
