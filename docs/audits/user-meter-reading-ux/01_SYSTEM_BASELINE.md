# 01. SYSTEM BASELINE & APPLICATION ARCHITECTURE

> **Audit Domain**: Saigon Port Field Meter Reading & Operations  
> **System Baseline Version**: Production Frontend v1.0.0 (`feature/v16e-network-map-overlay-r1`, commit `5d37047`)  
> **Target Audience**: UX Designers, Frontend Architects, Product Managers, QA Engineers  
> **Verification Level**: `VERIFIED_STATIC` (Source Code Verified) & `VERIFIED_RUNTIME` (Browser Automation Verified)

---

## 1. End-to-End Operational Architecture

The field meter reading capability in `production-meter-reading` follows a centralized sequence originating from the mobile Home Hub down to database persistence and worklist reconciliation.

```text
Home Hub (HomeHub.tsx)
    │
    ▼ [Bottom Radial Arc: "Đo đếm điện năng"]
Reading Worklist (ReadingBatchView.tsx)
    │
    ├──► Meter Detail Modal [Click card body] (Today history & pre-recorded slots)
    │
    ▼ [Click CTA: "Ghi chỉ số" / "Ghi lại"]
Meter Selection Context Banner (App.tsx)
    │
    ▼ [Live WebRTC MediaStream]
Camera / Gallery Capture (MeterCamera.tsx)
    │
    ▼ [Uncropped full-resolution JPEG]
Image Preview & Framing Check (App.tsx State 2)
    │
    ▼ [POST /api/v1/read-meter (Transient RAM)]
OCR Processing Pipeline (YOLOv8 E2 + PP-OCRv6-Medium)
    │
    ▼ [Status: success]                     ▼ [Status: review]
Result Verification & Inspection        Review Fallback & Manual Entry
(App.tsx State 4A)                      (App.tsx State 5)
    │                                       │
    ├──► [Inline Correction]                ├──► [Manual Entry Form]
    ├──► [Fullscreen Pan/Zoom Modal]        ├──► [Retake Photo]
    │                                       └──► [POST /api/v1/meter-readings/review]
    ▼ [POST /api/v1/meter-readings/confirm]
Official Confirmation & Persistence (State 4B)
    │
    ▼ [Click CTA: "Về danh sách công tơ"]
Worklist Refresh & Reconciliation (ReadingBatchView.tsx)
```

---

## 2. Component Ownership & State Management

| Step / Surface | Owning Component | State Holding Mechanism | Persistence / Lifetime |
| :--- | :--- | :--- | :--- |
| **Authentication & Profile** | `App.tsx` | React State (`currentUser`, `authChecking`) | Session cookie `csg_session` (12h TTL) |
| **Screen Routing** | `App.tsx` | React State (`activeScreen: ActiveScreen`) | In-memory RAM. **No URL path or browser history routing** for user screens. |
| **Today Operations & Worklist** | `ReadingBatchView.tsx` | React State (`operations: TodayOperationsResponse`) | Refreshed on mount or explicit tap (`loadData()`). |
| **Selected Context** | `App.tsx` | React State (`selectedMeter`, `selectedBatch`, `selectedRound`) | In-memory RAM. Reset on `handleReset()`. |
| **Camera & MediaStream** | `MeterCamera.tsx` | `useRef<HTMLVideoElement>`, `useRef<MediaStream>` | Active only while camera component is mounted. Disposed on capture/unmount. |
| **Captured Image Buffer** | `App.tsx` | `imageFile: File \| null`, `previewUrl: string \| null` | Client RAM blob URL (`URL.createObjectURL`). |
| **Inference Result** | `App.tsx` | `result: MeterReadResponse \| null` | In-memory RAM. Disposed on reset. |
| **Verification & Editing** | `App.tsx` | `confirmedReadingValue`, `editReadingValue`, `isEditingReading`, `roiDataUrl` | In-memory RAM. Generated client-side via HTML5 canvas from normalized bbox. |
| **Confirmation Status** | `App.tsx` | `confirmSuccessData: MeterReadingActionResponse \| null` | In-memory RAM until user taps "Về danh sách công tơ". |

---

## 3. Navigation, Lifecycle & Routing Truths

### 3.1 React State vs. URL Routing
- **Verified Finding**: For field employee modules (`home`, `reading_batch`, `meter`, `attendance`, `schedule`), navigation is driven entirely by internal React component state (`activeScreen`) in `App.tsx`:
  ```tsx
  // frontend/src/App.tsx line 50
  type ActiveScreen = 'home' | 'reading_batch' | 'meter' | 'attendance' | 'schedule';
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  ```
- **URL Synchronization**:
  - The URL search query parameters (`window.location.search`, `?tab=...`) are **only** used for the Admin Workspace tabs (`dashboard`, `assets`, `schedules`, etc.).
  - The field user screens have **zero URL synchronization** (`/`, no route hash, no pathname change).

### 3.2 Mounting & Unmounting Invariants
- When an employee transitions from `ReadingBatchView` to `MeterCamera` (by tapping "Ghi chỉ số"), `ReadingBatchView` is **unmounted entirely**.
- When entering the meter reading workflow, `AuthenticatedShell` mounts the camera, preview, and verification cards in sequence.
- When an employee confirms a reading and taps "Về danh sách công tơ", `ReadingBatchView` is **re-mounted from scratch**, triggering a fresh HTTP call to `GET /api/v1/meter-operations/today` to re-fetch the latest meter statuses.

---

## 4. Back Navigation & Data Loss Analysis

### 4.1 In-App Header Back Guard
`App.tsx` implements an explicit dirty-state check (`hasUnsavedWork`) evaluated whenever the user taps the top-left `<AuthenticatedShell>` back button:
```tsx
// frontend/src/App.tsx lines 619-629
const hasUnsavedWork = Boolean(
  previewUrl || result || isEditingReading || isManualEntryOpen || manualReadingValue || (confirmedReadingValue && !confirmSuccessData)
);

const handleBackFromMeter = () => {
  if (hasUnsavedWork) {
    setIsUnsavedWorkModalOpen(true);
  } else {
    handleReset();
    setActiveScreen('reading_batch');
  }
};
```
- If `hasUnsavedWork === true`, the application renders `UnsavedWorkConfirmModal` ("Hủy kết quả chưa lưu?").
- If the user selects "Tiếp tục ghi", the modal closes and client state remains intact.
- If the user selects "Thoát", `handleConfirmExitMeter` calls `handleReset()` (which revokes object URLs, wipes image files, resets readings) and transitions back to `reading_batch`.

### 4.2 Browser / Hardware Navigation Vulnerability (`CRITICAL_UX_RISK`)
- **Observed Behavior**: While the in-app back button (`.btn-header-back`) is guarded by `UnsavedWorkConfirmModal`, there is **no `window.addEventListener('beforeunload', ...)`** or `history.pushState` trap.
- **Field Impact**: If an operator swipes the edge of their phone screen to perform an Android/iOS hardware back gesture, or pulls down to refresh the page in Safari/Chrome:
  - The entire page reloads or navigates out of the web application.
  - Because state is stored strictly in client RAM (`File` object and React state), **100% of the captured photo, OCR recognition, and unsaved edits are destroyed instantly without any confirmation dialog**.
