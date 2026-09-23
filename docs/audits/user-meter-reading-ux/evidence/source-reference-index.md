# Source Reference Index for Meter Reading UX & Operations

This document maps all core architectural requirements, components, functions, data models, and styling tokens to their exact physical files and line numbers in the `production-meter-reading` repository.

---

## 1. Frontend Client Architecture

| Feature / Responsibility | File Path | Line Range / Symbol | Verification Level |
| :--- | :--- | :--- | :--- |
| Application Root & Screen Routing | `frontend/src/App.tsx` | Lines 50, 749–1410 (`activeScreen`) | `VERIFIED_STATIC` |
| Reading Workflow State Container | `frontend/src/App.tsx` | Lines 298–327 (state definitions) | `VERIFIED_STATIC` |
| Client RAM ROI Cropping | `frontend/src/App.tsx` | Lines 81–119 (`generateRoiCrop`) | `VERIFIED_STATIC` |
| Sanitize / Normalize Inputs | `frontend/src/App.tsx` | Lines 61–78 (`sanitizeReadingInput`, `normalizeReading`) | `VERIFIED_STATIC` |
| Unsaved Work Protection Guard | `frontend/src/App.tsx` | Lines 619–637 (`hasUnsavedWork`, `handleBackFromMeter`) | `VERIFIED_STATIC` |
| OCR Trigger & Vibrate Feedback | `frontend/src/App.tsx` | Lines 417–464 (`handleReadMeter`) | `VERIFIED_STATIC` |
| Inline Reading Editing Flow | `frontend/src/App.tsx` | Lines 466–493, 893–990 | `VERIFIED_STATIC` |
| Reading Confirmation Dispatch | `frontend/src/App.tsx` | Lines 495–537 (`handleConfirmReading`) | `VERIFIED_STATIC` |
| Manual Entry Fallback Dispatch | `frontend/src/App.tsx` | Lines 539–590 (`handleConfirmManualReading`) | `VERIFIED_STATIC` |
| Mark Review Dispatch | `frontend/src/App.tsx` | Lines 592–617 (`handleMarkReview`) | `VERIFIED_STATIC` |
| Reading Worklist Screen | `frontend/src/components/ReadingBatchView.tsx` | Lines 46–470 | `VERIFIED_STATIC` |
| Search & Sticky Segment Filter | `frontend/src/components/ReadingBatchView.tsx` | Lines 142–160, 276–332 | `VERIFIED_STATIC` |
| Meter Worklist Card Structure | `frontend/src/components/ReadingBatchView.tsx` | Lines 349–465 | `VERIFIED_STATIC` |
| Simplified Meter Detail Modal | `frontend/src/components/ReadingBatchView.tsx` | Lines 474–725 | `VERIFIED_STATIC` |
| Hourly Schedule Modal | `frontend/src/components/ReadingBatchView.tsx` | Lines 731–795 | `VERIFIED_STATIC` |
| Rear Camera & Reticle Overlay | `frontend/src/components/MeterCamera.tsx` | Lines 9–260 | `VERIFIED_STATIC` |
| Full Uncropped Video Capture | `frontend/src/components/MeterCamera.tsx` | Lines 126–128 (`ctx.drawImage(video, 0, 0, width, height)`) | `VERIFIED_STATIC` |
| Image Pan/Zoom Inspection Modal | `frontend/src/components/ImageViewerModal.tsx` | Lines 12–244 | `VERIFIED_STATIC` |
| Unsaved Work Confirmation Modal | `frontend/src/components/UnsavedWorkConfirmModal.tsx` | Lines 10–83 | `VERIFIED_STATIC` |
| Authenticated Shell Header | `frontend/src/components/AuthenticatedShell.tsx` | Lines 1–120 | `VERIFIED_STATIC` |
| Home Hub & Bottom Radial Nav | `frontend/src/components/HomeHub.tsx`, `frontend/src/components/home/BottomRadialNav.tsx` | Lines 1–176, Lines 1–230 | `VERIFIED_STATIC` |
| Port-Wide Progress Ring | `frontend/src/components/home/BottomRadialNav.tsx` | Lines 103–137 | `VERIFIED_STATIC` |

---

## 2. Backend & Business Logic Architecture

| Feature / Responsibility | File Path | Line Range / Symbol | Verification Level |
| :--- | :--- | :--- | :--- |
| Meter Operations Today API | `backend/app/main.py`, `backend/app/meter_logbook.py` | `main.py`: 471–478, `meter_logbook.py`: 1016–1255 | `VERIFIED_STATIC` |
| Transient OCR Inference API | `backend/app/main.py`, `backend/app/inference.py` | `main.py`: 796–839, `inference.py`: 81–288 | `VERIFIED_STATIC` |
| Confirm Reading API | `backend/app/main.py`, `backend/app/meter_logbook.py` | `main.py`: 641–673, `meter_logbook.py`: 629–858 | `VERIFIED_STATIC` |
| Mark Review API | `backend/app/main.py`, `backend/app/meter_logbook.py` | `main.py`: 675–705, `meter_logbook.py`: 860–963 | `VERIFIED_STATIC` |
| Admin Reading Inspection API | `backend/app/main.py`, `backend/app/admin.py` | `main.py`: 844–853, `admin.py`: 1800–1900 | `VERIFIED_STATIC` |
| Meter Reading Model & Unique Constraint | `backend/app/models.py` | Lines 229–261 (`uq_meter_round`) | `VERIFIED_STATIC` |
| Operational Evidence Storage | `backend/app/meter_logbook.py` | Lines 458–546 (`save_meter_reading_evidence`) | `VERIFIED_STATIC` |
| Machine Learning Training Sample Capture | `backend/app/meter_logbook.py` | Lines 548–627 (`save_meter_training_sample`) | `VERIFIED_STATIC` |
| OCR Sequence Classes & Dict | `backend/app/inference.py`, `models/ppocrv6_medium/meter_digits_dict.txt` | `inference.py`: 17–22, `meter_digits_dict.txt`: Lines 1–12 | `VERIFIED_STATIC` |
| Single Source of Truth Settings | `backend/app/config.py` | Lines 7–78 | `VERIFIED_STATIC` |

---

## 3. Visual Tokens & Design System

| Token Category | File Path | Key Tokens / Classes |
| :--- | :--- | :--- |
| Saigon Port Approved Dresscode Source | `.agent/skills/saigon-port-ui/SKILL.md`, `frontend/DESIGN_DNA.md` | `--sgp-corporate-navy: #003875`, `--sgp-corporate-yellow: #FCC959`, `--sgp-corporate-porcelain: #FCFCFC` |
| Digital Derived Tokens | `frontend/DESIGN_DNA.md`, `frontend/src/index.css` | `--sgp-navy-hover: #002B5B`, `--sgp-border-derived: #E4E8EC` |
| Functional Semantic Tier | `frontend/DESIGN_DNA.md`, `frontend/src/index.css` | `--sgp-success: #167A5A`, `--sgp-warning: #A86200`, `--sgp-danger: #B43A3A` |
| Hero Reading Styling | `frontend/src/index.css` | `.reading-hero-number` (tabular-nums, 44–56px font) |
| Alignment Reticle Frame | `frontend/src/index.css` | `.meter-alignment-box`, `.reticle-corner` |
