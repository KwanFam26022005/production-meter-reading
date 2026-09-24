# Page Override: Reading Verification & Inspection (Hậu kiểm chỉ số)
**Target Workspace:** `AdminReadingInspection.tsx`, `AdminVerification.tsx`  
**Governing Authority:** `design-system/saigon-port/MASTER.md`, `docs/contracts/reading-schedule.md`, `docs/contracts/reporting.md`

---

## 1. Mental Model: Evidence-First Supervisory Verification

The Reading Verification and Inspection workspace is the **Forensic Quality Gate** of the meter reading process. Supervisors audit high-risk, conflicting, or threshold-exceeding readings by cross-referencing camera evidence against digitized numbers.

Primary design imperatives:
1. **Evidence First:** Photographic evidence is the immutable source of ground truth and must occupy the primary visual field (~60–65% desktop width).
2. **Side-by-Side Comparison:** OCR extraction and confirmed value must be directly comparable with unmistakable visual provenance.
3. **No False Confidence:** Never convert raw machine-learning confidence scores into misleading "accuracy" claims.
4. **Ergonomic Throughput:** High-speed keyboard navigation (`←` previous reading, `→` next reading) for batch review.

---

## 2. Layout & Inspection Workspace Grid

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header: [← Quay lại]  Mã: CT-001 · Lượt 10:00 · [← Lượt trước] [Lượt sau →]│
├───────────────────────────────────┬────────────────────────────────────┤
│ EVIDENCE VIEWER (~62% Width)      │ AUDIT METADATA (~38% Width)        │
│ ┌───────────────────────────────┐ │ ┌────────────────────────────────┐ │
│ │ Controls: [Ảnh gốc | Vùng đọc]│ │ │ CHỈ SỐ CÔNG TƠ                 │ │
│ │           [Phóng to]          │ │ │ • OCR ban đầu: 12450.5         │ │
│ ├───────────────────────────────┤ │ │ • Chính thức:  12450.5 kWh     │ │
│ │                               │ │ │ • Nguồn: Xác nhận từ OCR       │ │
│ │ [ High-Resolution Photo       │ │ ├────────────────────────────────┤ │
│ │   with optional ROI crop box ]│ │ │ THÔNG SỐ THIẾT BỊ              │ │
│ │                               │ │ │ • Loại: LCD · Đơn vị: kWh      │ │
│ │                               │ │ ├────────────────────────────────┤ │
│ │                               │ │ │ TÁC NGHIỆP HIỆN TRƯỜNG         │ │
│ └───────────────────────────────┘ │ │ • Người ghi: Nguyễn Văn An     │ │
│                                   │ └────────────────────────────────┘ │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Provenance & Comparison Heuristics

### 3.1 Confirmation Source Semantics
- **`OCR_CONFIRMED`:** Machine OCR matched user acceptance without modification. Subtle blue pill `#EFF6FF`, text `#1E40AF`.
- **`USER_CORRECTED`:** Field operator corrected raw OCR text. Warning amber pill `#FFF4DF`, text `#A86200`. Displays before/after comparison with clear directional arrow (`12400.0 → 12450.0`).
- **`MANUAL_ENTRY`:** Meter entered by hand without OCR assistance. Slate neutral pill `#F1F5F9`, text `#334155`. Displays explicit tag: `Không có OCR (Nhập tay)`.

### 3.2 Evidence Integrity Standard
- Original photo must never be obscured, watermarked over meter digits, or artificially filtered.
- The `Vùng đọc` (ROI crop) toggle isolates the exact bounding box analyzed by the recognition engine while preserving the toggle back to `Ảnh gốc` (full contextual photo).

---

## 4. Keyboard Navigation & Rapid Review Ergonomics

- `ArrowLeft` (`←`): Navigates immediately to previous scheduled reading in the current audit batch.
- `ArrowRight` (`→`): Navigates immediately to next scheduled reading.
- `Escape`: Closes full-screen image modal or returns to triage list.
- Stepper buttons in the top header and footer panel indicate availability state (`disabled` when at batch boundaries).
