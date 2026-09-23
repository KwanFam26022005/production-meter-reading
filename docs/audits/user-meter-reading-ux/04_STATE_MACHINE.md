# 04. FINITE STATE MACHINE OF METER READING WORKFLOW

> **Audit Domain**: UI State Machine & Interaction Invariants  
> **Source Owner**: `frontend/src/App.tsx`, `ReadingBatchView.tsx`, `MeterCamera.tsx`  
> **Verification Level**: `VERIFIED_STATIC` & `VERIFIED_RUNTIME`

---

## 1. Primary Operational States

The client application defines 11 distinct operational states during field meter reading:

| State ID | State Name | Component / DOM Indicator | Data Owned in State |
| :--- | :--- | :--- | :--- |
| **S0** | `WORKLIST_IDLE` | `<ReadingBatchView />` (`.meter-operations-container`) | `operations`, `searchQuery`, `statusFilter` |
| **S1** | `CAMERA_LIVE` | `<MeterCamera />` (`.meter-live-camera-viewport`) | `mediaStreamRef`, `videoRef` |
| **S1_ERR** | `CAMERA_ERROR` | `<MeterCamera />` (`.camera-permission-box`) | `cameraError` |
| **S2** | `IMAGE_PREVIEW` | `App.tsx` (`.preview-container`) | `imageFile`, `previewUrl` (Blob URL) |
| **S3** | `OCR_PROCESSING` | `App.tsx` (`.processing-card`) | `loading: true`, transient multipart request |
| **S4A** | `RESULT_INSPECTION` | `App.tsx` (`.result-card`, `.status-badge-success`) | `result`, `confirmedReadingValue`, `roiDataUrl` |
| **S4A_EDIT**| `INLINE_EDIT` | `App.tsx` (`.edit-reading-box`) | `editReadingValue`, `editError`, `isEditingReading` |
| **S5** | `REVIEW_FALLBACK` | `App.tsx` (`.result-card`, `.status-badge-review`) | `result`, `roiDataUrl` |
| **S5_MANUAL`| `MANUAL_ENTRY` | `App.tsx` (`.edit-reading-box`) | `manualReadingValue`, `manualReadingError`, `isManualEntryOpen` |
| **S4B** | `CONFIRM_SUCCESS`| `App.tsx` (`.result-card`, `.status-badge-success`) | `confirmSuccessData: MeterReadingActionResponse` |
| **S6** | `SYSTEM_ERROR` | `App.tsx` (`.error-box`) | `error: string` |
| **M_UNSAVED`| `UNSAVED_MODAL` | `<UnsavedWorkConfirmModal />` | Modal open state |
| **M_ZOOM** | `IMAGE_VIEWER` | `<ImageViewerModal />` | `scale`, `position`, `isDragging` |

---

## 2. Complete Transition Matrix

| From State | Event / Trigger | Guard / Condition | Target State | Actions & Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| **S0** | Click "Ghi chỉ số" / "Ghi lại" | `meter.is_active && round.status == "OPEN"` | **S1** | Set `selectedMeter`, `selectedRound`, `handleReset()`, set `activeScreen='meter'` |
| **S1** | Camera Stream granted | Browser permission allowed | **S1** | `video.play()`, set `cameraReady=true` |
| **S1** | Camera Stream rejected | `NotAllowedError`, `NotFoundError` | **S1_ERR** | Set `cameraError`, stop tracks |
| **S1_ERR** | Click "Thử lại camera" | - | **S1** | Clear error, call `startCamera()` |
| **S1_ERR** | Click "Chọn từ thư viện" | Valid image file selected | **S2** | Revoke previous URL, create Blob URL, set `imageFile` |
| **S1** | Click "Chụp công tơ" | `cameraReady == true` | **S2** | Full uncropped canvas draw -> File -> set `previewUrl` |
| **S1** | Click Back in Shell | `hasUnsavedWork == false` | **S0** | `handleReset()`, set `activeScreen='reading_batch'` |
| **S2** | Click "Chụp lại" | - | **S1** | `handleReset()`, unmount preview |
| **S2** | Click "Đọc chỉ số" | `imageFile != null` | **S3** | Set `loading=true`, send `POST /api/v1/read-meter` |
| **S2** | Click Back in Shell | `hasUnsavedWork == true` | **M_UNSAVED** | Set `isUnsavedWorkModalOpen=true` |
| **S3** | OCR returns 200 `success` | `result.status == "success"` | **S4A** | Set `result`, set `confirmedReadingValue`, client-crop ROI canvas, haptic vibrate |
| **S3** | OCR returns 200 `review` | `result.status == "review"` | **S5** | Set `result`, client-crop ROI canvas |
| **S3** | OCR returns HTTP error | Network timeout / 4xx / 5xx | **S6** | Set `error` message, set `loading=false` |
| **S4A** | Click "Sửa chỉ số" | `!isEditingReading` | **S4A_EDIT** | Copy confirmed value to `editReadingValue`, set `isEditingReading=true` |
| **S4A_EDIT**| Click "Lưu chỉnh sửa" | Regex `^\d+(\.\d+)?$` and len <= 12 | **S4A** | Set `confirmedReadingValue = editReadingValue`, close edit box |
| **S4A_EDIT**| Click "Hủy" / Close | - | **S4A** | Revert `editReadingValue`, set `isEditingReading=false` |
| **S4A** | Click Image Container | - | **M_ZOOM** | Set `isViewerOpen=true` (Pan/Zoom active) |
| **M_ZOOM** | Click Backdrop / Close / Esc | - | **S4A** | Set `isViewerOpen=false`, reset transform |
| **S4A** | Click "Chụp lại" | `!confirming` | **S1** | `handleReset()` |
| **S4A** | Click "Xác nhận chỉ số" | `confirmedReadingValue != ""` | **S3** (In flight) | Set `confirming=true`, send `POST /api/v1/meter-readings/confirm` |
| **S4A** | Click Back in Shell | `hasUnsavedWork == true` | **M_UNSAVED** | Open unsaved confirmation |
| **S5** | Click "Nhập chỉ số thủ công"| - | **S5_MANUAL**| Set `isManualEntryOpen=true` |
| **S5_MANUAL**| Click "Xác nhận chỉ số" | Valid decimal & len <= 12 | **S3** (In flight) | Set `confirming=true`, send `POST .../confirm` (`MANUAL_ENTRY`) |
| **S5_MANUAL**| Click "Hủy" / Close | - | **S5** | Close manual entry box |
| **S5** | Click "Chụp lại" | - | **S1** | `handleReset()` |
| **S5** | Click "Đánh dấu cần kiểm tra"| - | **S0** | Send `POST /api/v1/meter-readings/review`, `handleReset()`, set `activeScreen='reading_batch'` |
| **S5** | Click Back in Shell | `hasUnsavedWork == true` | **M_UNSAVED** | Open unsaved confirmation |
| In Flight | Confirm returns 200 OK | - | **S4B** | Set `confirmSuccessData`, set `confirming=false` |
| In Flight | Confirm returns error / 409 | Duplicate or network drop | **S4A** / **S5** | Set `error` banner, set `confirming=false` |
| **S4B** | Click "Về danh sách công tơ" | - | **S0** | `handleReset()`, set `activeScreen='reading_batch'` (re-fetches worklist) |
| **S6** | Click "Thử lại" | `imageFile != null` | **S3** | Re-dispatch `handleReadMeter()` |
| **S6** | Click "Chụp lại" | - | **S1** | `handleReset()` |
| **M_UNSAVED**| Click "Tiếp tục ghi" | - | Previous State| Close modal, retain all state |
| **M_UNSAVED**| Click "Thoát" | - | **S0** | `handleReset()`, set `activeScreen='reading_batch'` |

---

## 3. Modal Stacking & Z-Index Governance

The meter reading interface has 4 modals. Z-index hierarchy is governed in `frontend/src/index.css`:

```text
z-index: 9999  ──► ImageViewerModal (.image-viewer-backdrop)
z-index: 1000  ──► UnsavedWorkConfirmModal (.modal-backdrop)
z-index: 900   ──► LogoutConfirmModal (.modal-backdrop)
z-index: 800   ──► Simplified Meter Detail Modal (.modal-overlay)
z-index: 800   ──► Hourly Schedule Inspection Modal (.modal-overlay)
z-index: 100   ──► Segmented Filter Bar (.worklist-filter-sticky-bar)
z-index: 40    ──► Top Header (.app-header)
```

- **Invariant**: The `ImageViewerModal` sits above all overlays (`z-index: 9999`) to allow high-contrast, pinch-to-zoom evidence verification regardless of what card is active underneath.
- **Escape Key Handling**: All modals attach native `window.addEventListener('keydown')` for `Escape` key dismissal.
