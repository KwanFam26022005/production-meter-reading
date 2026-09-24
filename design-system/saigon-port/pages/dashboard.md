# Page Override: Operations Dashboard Workspace (Tổng quan)
**Target Workspace:** `AdminDashboard.tsx`, `MapOperationsPage.tsx`  
**Governing Authority:** `design-system/saigon-port/MASTER.md`, `docs/contracts/reading-schedule.md` (Thread 9A), `docs/contracts/reporting.md` (Thread 9D)

---

## 1. Mental Model: Operational Situational Awareness

The Dashboard is an **Operational Situational Awareness Bridge**, not an executive vanity KPI wall or generic SaaS analytics board. Its primary duty is to answer three critical operational questions within 3 seconds:
1. What is the current operational round and its immediate completion state?
2. What exceptions or anomalies require urgent supervisor intervention right now?
3. What is the progress across rounds and operational zones for today?

---

## 2. Layout & Composition Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header: Tổng quan vận hành · [Bản đồ / Danh sách] · [Ngày] · [Khu vực] │
├────────────────────────────────────────────────────────────────────────┤
│ 4 Compact Operational Metric Tiles:                                    │
│ [Lượt hiện tại]    [Hoàn thành]    [Chưa hoàn tất]    [Cần kiểm tra]   │
├────────────────────────────────────────────────────────────────────────┤
│ Two-Column Operational Split:                                          │
│ ┌───────────────────────────────┐ ┌──────────────────────────────────┐ │
│ │ CẦN CHÚ Ý (Exceptions ~58%)   │ │ TIẾN ĐỘ (Progress ~42%)          │ │
│ │ • Compact Actionable Table    │ │ • [Theo lượt | Theo khu vực]     │ │
│ │ • Direct "Kiểm tra" CTA       │ │ • Stacked progress bars          │ │
│ └───────────────────────────────┘ └──────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ CHẤT LƯỢNG GHI NHẬN (Data Provenance & Verification Quality)          │
│ • Industrial ShieldCheck / Activity anchor (No SaaS sparkle)           │
│ • Stacked distribution bar: OCR confirmed / Corrected / Manual         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Visual Tone & Industrial Heuristics

### 3.1 Restrained Brand Palette
- Background: Level 0 App Canvas (`#F8F9FA`).
- Cards: Level 1 White Surface (`#FFFFFF`) with 1px border (`#E5E7EB`) and subtle elevation.
- Zero decorative gradients, zero AI sparkle iconography, zero fake telemetry.
- Brand Navy (`#003875`) is reserved for primary headers, active tab highlights, and key metric emphasis.

### 3.2 Metric Card Standards
- **No giant KPI cards:** Heights capped at 88px–96px to prevent vertical space cannibalization.
- **Tabular Numerals:** All numeric figures strictly use `font-variant-numeric: tabular-nums` to eliminate layout jitter during live updates.
- **Sub-labels:** Contextual status (e.g., `Đang mở`, `Lịch dự kiến`, `Chưa đến hạn tác nghiệp`) must use functional semantic badges, never pure decorative colors.

---

## 4. Exception Triage & Drilldown Ergonomics

### 4.1 "Cần chú ý" (Exceptions Queue)
- **Priority Density:** Table rows use high-density 36px–40px layout.
- **Direct Drilldown:** For any row in `REVIEW` status, provide an immediate one-click `Kiểm tra` button linking straight to `AdminReadingInspection`.
- **Truthful Zero State:** When no exceptions exist, render a restrained operational check card (`#EAF6F1` background, `#167A5A` checkmark) confirming all due rounds are complete and verified.

### 4.2 "Tiến độ" (Progress Segmented Control)
- Segmented toggle (`Theo lượt` vs `Theo khu vực`) uses muted track (`#F1F3F5`) with smooth active white pill transition.
- Current round row is accentuated with 2px Brand Blue border and subtle tint (`#EFF6FF`).

---

## 5. Provenance & Quality Distribution Bar

- **Anchor Icon:** Industrial `Activity` or `ShieldCheck` icon (strictly avoid consumer `Sparkles`).
- **Distribution Bar:** Proportional horizontal bar with semantic segments:
  - `OCR_CONFIRMED`: Brand Digital Blue `#0068FF`
  - `USER_CORRECTED`: Warning Amber `#F39200`
  - `MANUAL_ENTRY`: Slate Neutral `#64748B`
- **Zero-State Truthfulness:** When 0 readings exist for the date, clearly indicate `"Chưa có lượt nào được xác nhận trong ngày này"` rather than displaying 0% error states.
