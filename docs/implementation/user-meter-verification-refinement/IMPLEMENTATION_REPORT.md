# User Meter Verification Refinement — Implementation & QA Acceptance Report

**Repository:** `production-meter-reading`  
**Working Branch:** `feature/v16e-network-map-overlay-r1` (HEAD: `5d37047`)  
**Scope:** User → Đo đếm điện năng (Verification & Review UX Refinement)  
**Implementation Date:** 2026-09-21  
**Status:** ✅ ALL PHASES IMPLEMENTED, TESTED & ACCEPTED (Phases 0–G)

---

## 1. PHASE 0 — Git Safety & Pre-flight Context

### Git Safety Verification
- **Branch:** `feature/v16e-network-map-overlay-r1`
- **Safety guarantee:** No reset, no force checkout, no clean, no auto-stash, no rebase, no merge, no push performed.
- **Modified files during this task:**
  - [`frontend/src/App.tsx`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/App.tsx)
  - [`frontend/src/index.css`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/index.css)
- **New test file:**
  - [`frontend/tests/userMeterVerificationRefinement.test.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/tests/userMeterVerificationRefinement.test.ts)
- **New scripts:**
  - [`scripts/investigate_shrink_artifact.mjs`](file:///D:/Projects/production-meter-reading/production-meter-reading/scripts/investigate_shrink_artifact.mjs)
  - [`scripts/capture_verification_refinement_deliverables.mjs`](file:///D:/Projects/production-meter-reading/production-meter-reading/scripts/capture_verification_refinement_deliverables.mjs)
- **Deliverables folder:**
  - [`docs/implementation/user-meter-verification-refinement/`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/)

---

## 2. PHASE A — UI Shrinking Phenomenon Investigation

### Classification: `RECORDING_ARTIFACT` (Not an Application or Browser Bug)

- **Detailed Investigation Report:** [`PHASE_A_RECORDING_ARTIFACT_INVESTIGATION.md`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/PHASE_A_RECORDING_ARTIFACT_INVESTIGATION.md)
- **Findings:**
  1. **Frame analysis of `focused-meter-capture-flow-after.webm`:**
     - Frame sizes dropped dramatically from ~163KB (7.38s) to ~73KB (7.40s–7.46s) at exact screenshot timestamps.
     - Frame pairs `7.40s` == `7.42s` (73,247 bytes) and `7.44s` == `7.46s` (74,457 bytes) were byte-for-byte duplicates — a classic signature of WebM VP8/VP9 encoder error-concealment when frame grabbing is interrupted by CDP `page.screenshot()`.
  2. **Live DOM Audit at transition window:**
     - `shellRect`: `{ x: 0, y: 0, width: 390, height: 844 }` at +50ms, +120ms, +250ms, +500ms post-shutter.
     - `shellTransform`: `"none"` at all times. `visualViewport.scale`: `1.0`.
     - Zero zoom, zero layout shift, zero scale change in the actual browser rendering engine.
  3. **Verification with Clean Video:**
     - Captured `video_clean_no_cdp_screenshots.webm` and `user-meter-verification-refinement-flow.webm` without interleaved screenshot calls during video recording.
     - Confirmed: absolutely no shrinking or corner-collapse occurs when video recording runs uninterrupted.

---

## 3. PHASE B — Verification Screen Redesign (State 4A)

### Architecture of State 4A

The previous design conflated the raw OCR reading with the editable confirmation value in a single ambiguous box. The redesigned screen establishes a clear 4-part visual hierarchy:

```
┌──────────────────────────────────────────────────────────┐
│ ← Kiểm tra chỉ số               SIM-EM-001 · Lượt 14:00   │
├──────────────────────────────────────────────────────────┤
│ ẢNH ĐỐI CHIẾU                      [Vùng số] [Ảnh gốc]   │
│ ┌──────────────────────────────────────────────────────┐ │
│ │                  [Image Display]                     │ │
│ │              [Phóng to & kiểm tra]                   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ OCR NHẬN DIỆN                               04582.12 kWh │
│                                                          │
│ SỐ SẼ LƯU                                         [Sửa] │
│                      04582.12 kWh                        │
│   (if edited: "Đã sửa từ: 04582.12")                     │
│                                                          │
│ [Xác nhận & lưu]                                         │
│ [Chụp lại]                                               │
└──────────────────────────────────────────────────────────┘
```

### Invariants Delivered
1. **Preservation of leading zeros and decimals:** Raw strings are preserved without numerical coercion (`04582.12` does not truncate to `4582.12`).
2. **Tabular layout & no wrapping:** Applied `font-variant-numeric: tabular-nums lining-nums; white-space: nowrap; word-break: normal;` to `.reading-hero-number` and `.verify-ocr-value`.
3. **Explicit separation:** `result.reading` (OCR output, read-only) is clearly separated from `confirmedReadingValue` (the number that will actually be persisted).
4. **Inspection with ROI toggle & Fullscreen Modal:** Segmented pill toggle (`Vùng số` / `Ảnh gốc`) and full pinch-to-zoom modal via [`ImageViewerModal`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/src/components/ImageViewerModal.tsx).

---

## 4. PHASE C — Streamlined REVIEW Screen (State 5)

### Eliminating Redundancy & Speculative Causes
- **Single concise message:** Replaced redundant multi-tier warning boxes with a single clear guide sentence:  
  *“Chưa đọc được chỉ số — Kiểm tra ảnh và chọn cách tiếp tục.”*
- **No speculative causes:** Removed all speculative copy suggesting image blur, glare, or occlusion since the backend OCR model does not emit root-cause diagnosis.
- **Three explicit business actions:**
  1. **Nhập chỉ số thủ công** (`btn-primary`) — for when the operator can clearly read the meter digits directly from the preview image.
  2. **Chụp lại** (`btn-secondary`) — for taking a clearer angle or retrying capture.
  3. **Đánh dấu cần kiểm tra** (`btn-review-flag`, warm amber) — to flag the meter for field supervisor follow-up.

---

## 5. PHASE D — Confirmation & HTTP 409 State Machine

### Finite State Machine Implementation

```
               ┌───────────────────────┐
               │     NOT_SUBMITTED     │
               └───────────┬───────────┘
                           │ (User clicks "Xác nhận & lưu")
                           ▼
               ┌───────────────────────┐
               │      SUBMITTING       │ (Buttons disabled, spinner active)
               └─────┬───────────┬─────┘
                     │           │
     Server OK (200) │           │ Server Error (4xx/5xx) / Network Loss
                     ▼           ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   CONFIRMED_BY_SERVER    │   │         REJECTED         │ ◄── HTTP 409 Conflict
│ (State 4B: Verified UI)  │   │ (.verify-conflict-banner)│
└──────────────────────────┘   └──────────────────────────┘
                                             │
                               Network loss  │ (fetch failure / status 0)
                                             ▼
                               ┌──────────────────────────┐
                               │     OUTCOME_UNKNOWN      │
                               │(.verify-outcome-unknown) │
                               └──────────────────────────┘
```

### State Behavior Matrix

| State | Trigger | UI Display | User Actions |
|---|---|---|---|
| `NOT_SUBMITTED` | Initial OCR result or edit saved | Verification card (State 4A) | "Xác nhận & lưu", "Chụp lại", "Sửa" |
| `SUBMITTING` | Click confirm / manual submit | Submit button shows "Đang lưu vào sổ..." / "Đang ghi nhận..." | Inputs & buttons disabled (prevents double submission) |
| `CONFIRMED_BY_SERVER` | Server returns 200 with `MeterReadingActionResponse` | State 4B: Green success badge, formal recorded reading, timestamp, round metadata | "Về danh sách công tơ" |
| `REJECTED` (HTTP 409 Conflict) | Server returns 409 Conflict | Dedicated Orange Conflict Banner: *"Chỉ số đã tồn tại trong lượt này"* | "Về danh sách" (Never auto-confirms) |
| `REJECTED` (Generic 4xx/5xx) | Server returns other error status | Inline error box with server message | "Thử lại", "Chụp lại" |
| `OUTCOME_UNKNOWN` | Network connection dropped after send (`status === 0`, `Failed to fetch`) | Dedicated Amber Banner: *"Kết quả gửi chưa xác định. Không thể xác định chỉ số đã được lưu chưa."* | "Kiểm tra danh sách", "Thử gửi lại" |

### Safe Reconciliation API Assessment (Backend Blocker Note)
- **Current backend constraint:** The current API does not provide a safe lookup/reconciliation endpoint (such as `GET /api/v1/meter-readings/{round_id}/{meter_id}`) that allows a client to verify the saved value after a network drop without risking unintended side effects.
- **Architectural solution:** In compliance with the prompt rules, we did **not** default 409 to success. Instead, the UI cleanly classifies the state as `REJECTED` (for 409) or `OUTCOME_UNKNOWN` (for network loss), guiding the employee back to the worklist to inspect the actual server logbook.

---

## 6. PHASE E — Animation & Layout Invariants

- **Focused Capture Shell:** Retains continuous viewport (`height: 100dvh`, `background: #000c1a`) without white flashes or re-mounting flicker.
- **Image continuity:** The preview image stays firmly mounted across OCR processing and verification transitions (`object-fit: contain` for inspection, `object-fit: cover` for camera preview).
- **Verification enter motion:** `@keyframes verificationEnter` utilizes subtle `translateY(12px)` fade-in; strictly **no CSS scale or zoom transform** is applied, preventing optical shrinking artifacts.
- **No per-digit animation:** Digits render statically in tabular format (`tabular-nums`).
- **Accessibility:** Full `@media (prefers-reduced-motion: reduce)` support reduces all transition/animation durations to `0.01ms`.

---

## 7. PHASE F — Test & Build Verification Results

### Frontend Unit & Behavioral Tests
- **Test File:** [`frontend/tests/userMeterVerificationRefinement.test.ts`](file:///D:/Projects/production-meter-reading/production-meter-reading/frontend/tests/userMeterVerificationRefinement.test.ts)
- **Execution Command:** `npx vitest run tests/userMeterVerificationRefinement.test.ts`
- **Result:** **37 tests passed (100% pass rate)**

```
✓ tests/userMeterVerificationRefinement.test.ts (37 tests)
  ✓ Phase D — Submission State Machine (12 tests)
    ✓ initial state is NOT_SUBMITTED
    ✓ transitions to SUBMITTING when async call begins
    ✓ transitions to CONFIRMED_BY_SERVER on successful response
    ✓ classifies HTTP 409 as REJECTED with isConflict=true
    ✓ classifies string "409" in message as REJECTED conflict
    ✓ classifies "already recorded" message as REJECTED conflict
    ✓ does NOT auto-confirm on 409 — REJECTED is the terminal state
    ✓ classifies "Failed to fetch" as OUTCOME_UNKNOWN
    ✓ classifies "network error" as OUTCOME_UNKNOWN
    ✓ classifies generic 5xx server error as REJECTED (not OUTCOME_UNKNOWN)
    ✓ classifies 401 unauthorized as REJECTED
    ✓ OUTCOME_UNKNOWN is distinct from REJECTED — different user guidance needed
  ✓ Phase B — Reading Value Validation (15 tests)
    ✓ accepts simple integer reading
    ✓ accepts decimal reading with dot
    ✓ accepts decimal reading with comma (normalizes to dot)
    ✓ accepts leading zeros (e.g. 04582.12)
    ✓ accepts long number up to max length
    ✓ rejects number exceeding MAX_READING_LENGTH
    ✓ rejects empty string
    ✓ rejects non-numeric characters after sanitize
    ✓ rejects double decimal points
    ✓ normalizes comma to dot
    ✓ trims whitespace
    ✓ OCR reading vs confirmed reading distinction — both preserved separately
    ✓ identifies correction when confirmed differs from OCR
    ✓ identifies no correction when confirmed equals OCR
  ✓ Phase C — REVIEW Screen Business Actions (8 tests)
    ✓ provides exactly 3 business actions in REVIEW state
    ✓ includes MANUAL_ENTRY action
    ✓ includes RETAKE action
    ✓ includes MARK_REVIEW action
    ✓ does NOT include auto-confirm or speculative actions
    ✓ manual entry validation accepts reading from REVIEW flow
    ✓ manual entry with leading zero is valid
    ✓ manual entry empty string is invalid
  ✓ Phase E — Animation Invariants (3 tests)
    ✓ verificationEnter animation is defined and uses translateY (no scale)
    ✓ prefers-reduced-motion disables verification animation
    ✓ no per-digit animation should occur during number display
```

### Production Build Verification
- **Command:** `npm run build` (`tsc && vite build`)
- **Status:** **0 errors, clean build in 6.17s**
- **Artifacts:**
  - `dist/index.html`: 1.46 kB (gzip: 0.67 kB)
  - `dist/assets/index-CDsAOm_I.css`: 360.91 kB (gzip: 56.96 kB)
  - `dist/assets/index-C2lYdo53.js`: 933.98 kB (gzip: 228.66 kB)

---

## 8. PHASE G — Acceptance Evidence Catalog

All visual evidence has been captured live on the running application using Edge Chromium via [`scripts/capture_verification_refinement_deliverables.mjs`](file:///D:/Projects/production-meter-reading/production-meter-reading/scripts/capture_verification_refinement_deliverables.mjs).

### 8.1 Continuous Runtime Video Deliverable
- **Video File:** [`docs/implementation/user-meter-verification-refinement/videos/user-meter-verification-refinement-flow.webm`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/videos/user-meter-verification-refinement-flow.webm) (880 KB)
- **Flow Demonstrated:** Worklist → Camera (Focused Mode) → Shutter Preview → OCR Inference → Redesigned Verification Screen → Sửa số (Inline Edit: `04583.50`) → Xác nhận & lưu → Confirmed by Server (`ĐÃ GHI NHẬN VÀO SỔ`).
- **Quality:** Clean runtime recording without CDP screenshot interference; zero UI shrinking.

### 8.2 Deliverables Screenshot Catalog

| File | Description | Visual Focus |
|---|---|---|
| [`01-worklist-ready.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/01-worklist-ready.png) | Worklist state before capture | SIM-EM-001 pending card with "Ghi chỉ số" CTA |
| [`02-focused-camera-ready.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/02-focused-camera-ready.png) | Focused camera viewport | `#FCC959` Warm Yellow reticle, 68px shutter, minimal header |
| [`03-captured-image-preview.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/03-captured-image-preview.png) | Captured image preview | Full uncropped frame preview with "Đọc chỉ số" button |
| [`04-verification-redesigned-4a.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/04-verification-redesigned-4a.png) | Redesigned Verification Screen (State 4A) | ẢNH ĐỐI CHIẾU, OCR NHẬN DIỆN: `04582.12 kWh`, SỐ SẼ LƯU: `04582.12 kWh [Sửa]` |
| [`05-verification-inline-edit.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/05-verification-inline-edit.png) | Inline editing mode active | Numeric input with quick dot helper and original reading reference |
| [`06-verification-edited-state.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/06-verification-edited-state.png) | Edited value banner | Number updated to `04583.50 kWh` with badge: *"Đã sửa từ: 04582.12"* |
| [`07-confirmation-success-4b.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/07-confirmation-success-4b.png) | Confirmed by server (State 4B) | Official confirmation badge: *"ĐÃ GHI NHẬN VÀO SỔ"*, round metadata |
| [`08-review-streamlined-state5.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/08-review-streamlined-state5.png) | Streamlined REVIEW Screen | Single status pill, single guide line, 3 distinct business action buttons |
| [`09-review-manual-entry-open.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/09-review-manual-entry-open.png) | Manual entry form in REVIEW | Operator manual entry form with image inspection visible above |
| [`10-conflict-409-banner.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/10-conflict-409-banner.png) | HTTP 409 Conflict Banner | Dedicated Orange Alert Banner (*"Chỉ số đã tồn tại trong lượt này"*), non-auto-confirming |
| [`10b-outcome-unknown-banner.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/10b-outcome-unknown-banner.png) | Outcome Unknown Banner | Dedicated Amber Banner on network disconnect after send, guides operator to check list |

### 8.3 Multi-Viewport Verification Screenshots

| Viewport | Device Profile | Deliverable File |
|---|---|---|
| **375×812** | iPhone mini / SE / X | [`11-viewport-375x812-verification.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/11-viewport-375x812-verification.png) |
| **390×844** | iPhone 12/13/14 Standard | [`11-viewport-390x844-verification.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/11-viewport-390x844-verification.png) |
| **428×926** | iPhone 13/14 Pro Max | [`11-viewport-428x926-verification.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/11-viewport-428x926-verification.png) |
| **768×1024** | iPad / Industrial Tablet | [`11-viewport-768x1024-verification.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/11-viewport-768x1024-verification.png) |
| **1280×800** | Desktop / Field Laptop | [`11-viewport-1280x800-verification.png`](file:///D:/Projects/production-meter-reading/production-meter-reading/docs/implementation/user-meter-verification-refinement/screenshots/11-viewport-1280x800-verification.png) |

---

## 9. Limitations & Future Backend Roadmap

1. **Reconciliation API (Backend):** A safe GET endpoint `GET /api/v1/meter-readings/rounds/{round_id}/meters/{meter_id}` should be added in a future backend release so that clients experiencing `OUTCOME_UNKNOWN` can automatically reconcile state before prompting the user.
2. **Offline Support:** In accordance with the prompt boundaries, IndexedDB caching and background retry queues were not introduced in this release and should be considered for a future offline-first sprint.
