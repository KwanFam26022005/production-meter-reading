# 06. UI/UX AUDIT FINDINGS & FIELD ERGONOMICS

> **Audit Domain**: Usability, Mobile Field Ergonomics, Sunlight Readability & Interaction Hazards  
> **Evaluated Against**: Saigon Port UI Standards (`SKILL.md`), Design DNA (`DESIGN_DNA.md`), WCAG 2.1 AA  
> **Verification Level**: `VERIFIED_STATIC` & `VERIFIED_RUNTIME`

---

## 1. Overall Ergonomic Scorecard

| Dimension | Rating | Key Strength | Critical Weakness |
| :--- | :---: | :--- | :--- |
| **Field Readability (Sunlight)** | **8.5 / 10** | 52px hero reading, tabular numbers, high-contrast Navy/Charcoal. | White text on yellow accents was previously hazardous; currently avoided. |
| **Touch Ergonomics (One-Handed)**| **7.0 / 10** | Large bottom button stacks (52px CTA). | Header back button and search clear button are at the very top (outside thumb zone). |
| **Information Density** | **8.0 / 10** | Card separation of identity, location, status, and CTA. | Worklist cards are tall (~180px); only 3-4 cards visible per screen on mobile. |
| **Data Loss Prevention** | **5.5 / 10** | `UnsavedWorkConfirmModal` intercepts in-app back taps. | Hardware swipe back or browser tab reload wipes all RAM state without warning. |
| **Inspection Ergonomics** | **9.0 / 10** | Segmented ROI crop toggle and full-screen pan/zoom modal. | No side-by-side comparison (toggle requires switching back and forth). |

---

## 2. Detailed Findings

### Finding UX-01: Hardware Back & Browser Reload State Destruction (`SEVERITY_HIGH`)
- **Observed Behavior**: In `frontend/src/App.tsx`, all captured photos, OCR predictions, and edited numbers are stored exclusively in React memory (`useState`). When an operator presses the physical Android back button, swipes from the screen edge, or pulls down to refresh the page in Safari/Chrome, the page reloads or exits the app.
- **Evidence**: No `beforeunload` event listener exists in `frontend/src/`. Only the in-app `<AuthenticatedShell>` back button is wired to `UnsavedWorkConfirmModal`.
- **User Impact**: An operator who spent 2 minutes finding an electrical cabinet, photographing, and manually entering digits can lose all work with a single accidental gesture.
- **Redesign Opportunity**: Add a `window.addEventListener('beforeunload')` guard and consider lightweight `sessionStorage` draft persistence for the active meter reading.

---

### Finding UX-02: Top-Anchored Back Button Outside Primary Thumb Zone (`SEVERITY_MEDIUM`)
- **Observed Behavior**: The back button (`.btn-header-back`) is positioned at the top-left corner of the header (`top: 14px`, `left: 16px`). On modern mobile devices (390x844 or 428x926), this position is completely outside the natural one-handed thumb zone.
- **Evidence**: `frontend/src/components/AuthenticatedShell.tsx` lines 200–208.
- **User Impact**: When an operator is holding a flashlight, toolbox, or holding onto a ladder with one hand, they cannot reach the back button without shifting their grip or using their second hand.
- **Redesign Opportunity**: Ensure all primary navigation and dismissal actions can be completed via bottom-anchored action bars.

---

### Finding UX-03: Excessive Worklist Card Height & Scroll Fatigue (`SEVERITY_MEDIUM`)
- **Observed Behavior**: Each meter card (`.worklist-meter-card`) contains 6 vertical levels: identity row, name, location, status badge, reading display, missed alert pill, and capture button. Total card height exceeds 175px.
- **Evidence**: `frontend/src/components/ReadingBatchView.tsx` lines 349–465; Screenshot `01`.
- **User Impact**: In a port facility with 12 to 50 meters, the operator must scroll through thousands of vertical pixels to find a specific meter. On mobile viewports (844px height), only 2.5 cards are visible at any time.
- **Redesign Opportunity**: Introduce a high-density compact row option for experienced operators, showing code, status pill, latest kWh, and a direct camera icon button in a 72px row.

---

### Finding UX-04: Card Click Splitting Ambiguity (`SEVERITY_LOW`)
- **Observed Behavior**: Clicking anywhere on the upper 80% of a meter card opens the **Meter Detail Modal**, while clicking the bottom button (`.btn-worklist-capture`) opens the **Camera Workflow**.
- **Evidence**: `ReadingBatchView.tsx` lines 361–373 vs 449–463.
- **User Impact**: Operators frequently intend to start recording but tap slightly above the capture button, accidentally opening the Detail Modal instead of the camera.
- **Redesign Opportunity**: In mobile field mode, tapping an unrecorded (PENDING) card should directly initiate recording, or provide unmistakable visual separation between the "View Info" and "Record" zones.

---

### Finding UX-05: Missing Side-by-Side Verification on Tablet / Desktop (`SEVERITY_LOW`)
- **Observed Behavior**: On tablet (768x1024) and desktop (1280x800) screens, the result verification screen renders in a single narrow mobile-width column (max 480px) centered on screen.
- **Evidence**: `frontend/src/index.css` `.app-container { max-width: 480px; }`; Screenshots `17`, `18`.
- **User Impact**: On larger screens, the interface does not take advantage of available screen width to display the meter photo side-by-side with the reading hero and keypad.
- **Redesign Opportunity**: Support responsive 2-column layout on viewports >= 768px (photo on left, verification and keypad on right).

---

### Finding UX-06: Post-Confirmation Confusing 409 Conflict Error (`SEVERITY_HIGH`)
- **Observed Behavior**: If an operator taps "Xác nhận chỉ số", network latency occurs, and they tap the button a second time before the first response resolves, the second request reaches the backend after the first has committed. The backend responds with HTTP `409 Conflict`: `"Công tơ này đã được xác nhận chỉ số trong lượt hiện tại. V1 không hỗ trợ ghi đè chỉ số đã xác nhận."`
- **Evidence**: `backend/app/meter_logbook.py` lines 709–713; `frontend/src/App.tsx` lines 502, 532.
- **User Impact**: The operator receives an aggressive error message claiming conflict or failure, when in reality their reading was saved successfully!
- **Redesign Opportunity**: Implement strict idempotency: if the submitted value matches the existing confirmed value, return 200 OK instead of 409 Conflict. Client-side, immediately lock the submit button (`disabled={confirming}`) on initial click.
