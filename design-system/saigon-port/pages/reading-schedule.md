# Page Override: Reading Schedule Workspace (Lịch ghi)
**Target Workspace:** `AdminSchedules.tsx`  
**Governing Authority:** `design-system/saigon-port/MASTER.md`, `docs/contracts/reading-schedule.md` (Thread 9A)

---

## 1. Mental Model: Daily Reading Plan

The Reading Schedule view represents a **Daily Operational Reading Plan** rather than generic database CRUD. Field supervisors use this view to inspect hourly reading progress, verify meter scope completeness, and track active rounds across shifts.

---

## 2. Layout & Information Hierarchy

### 2.1 Workspace Header
- **Title:** `Lịch ghi chỉ số công tơ`
- **Current Operational Context:** Displays active batch (e.g., `Đợt ghi 2026-09`) and current operational date.
- **Primary CTA:** `Tạo lượt ghi mới` (`.btn-primary`) positioned on the right.

### 2.2 Compact Date Navigation Bar
- Stepper controls: `< Ngày trước`, `Hôm nay` (Quick jump), `Ngày sau >`.
- Direct date selection via standardized Vietnamese DatePicker popover.
- Shift filter pills: `Tất cả ca`, `Ca 1 (06:00 - 14:00)`, `Ca 2 (14:00 - 22:00)`, `Ca 3 (22:00 - 06:00)`.

---

## 3. Round Timeline & Card Hierarchy

Rounds are displayed as an agenda timeline ordered chronologically:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 10:00 · Ca 1      [ĐANG GHI - CURRENT]            10 / 12 công tơ (83%)│
│ Phạm vi: 12 công tơ SNAPSHOT · Khu Cầu cảng, Khu Kỹ thuật             │
│ Nhân sự phân công: Nguyễn Văn An (PRIMARY), Trần Văn Bình (SUPPORT)    │
│ ────────────────────────────────────────────────────────────────────── │
│ [Xem danh sách công tơ]    [Định vị GIS]                 [••• Thao tác]│
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Status Badge Derivation
- `CURRENT` (Active round): Digital Blue `#0068FF` background tint with pulsing dot indicator.
- `UPCOMING` (Scheduled future): Neutral gray `#5E5B5B` badge with clock icon.
- `PAST_COMPLETE` (All meters recorded): Success green `#167A5A` pill with checkmark.
- `PAST_INCOMPLETE` (Past with missed meters): Warning amber `#A86200` badge.
- `CANCELLED`: Strikethrough style with muted neutral pill.

### 3.2 Scope Provenance Metadata
- Render small metadata tag: `Phạm vi SNAPSHOT (12)` or `Phạm vi ĐỘNG (Legacy)`.
- Never allow backend database terminology (`scope_mode`, `is_legacy`) to obscure clear operational Vietnamese copy.

### 3.3 Safe Deletion Ergonomics
- The destructive action `Xóa lịch ngày` is removed from top-level toolbars.
- Relocated to a lower-priority secondary overflow menu `[••• Thao tác]` with mandatory confirmation modal.

---

## 4. Single Unified Empty State

If no rounds exist for the selected date:
- Render a single clean card centered in the workspace:
  - Calendar illustration / icon.
  - Headline: `"Chưa có kế hoạch ghi chỉ số cho ngày [DD/MM/YYYY]"`.
  - Body: `"Khởi tạo các lượt ghi định kỳ theo ca hoặc tạo lượt ghi tùy chỉnh cho ngày này."`.
  - Action button: `"Tạo lịch ghi cho ngày này"`.
- Never show multiple empty placeholder rows or broken cards.
