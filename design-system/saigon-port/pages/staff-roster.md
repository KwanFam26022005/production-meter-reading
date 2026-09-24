# Page Override: Staff Roster Workspace (Phân ca)
**Target Workspace:** `AdminStaffRoster.tsx`, `OperationalAssignmentBoard.tsx`, `roster/*`  
**Governing Authority:** `design-system/saigon-port/MASTER.md`, `docs/contracts/operational-assignment.md` (Thread 9B)

---

## 1. Workspace Mental Model

The Staff Roster workspace is an **Operational Planning Command Center**, not a generic CRUD table. It provides full situational awareness of 24/7 port shift coverage, leave management, and operational zone staffing.

---

## 2. Workspace Layout & Composition

### 2.1 Workspace Header
- **Title:** `Phân ca & Điều động nhân sự`
- **Context Stepper:** Quick month/week navigation with Vietnamese date display (e.g., `Tháng 09 / 2026`).
- **Primary CTA:** `Tạo lịch tự động` (`AutoPatternDialog`) on right cluster.
- **Secondary Actions:** `Xuất file CSV`, `Xem xung đột`.

### 2.2 Situational Awareness Status Strip (`RosterStatusStrip`)
Consolidates critical shift indicators into a compact, single-row summary bar:
- **Định mức ca (Coverage):** Number of healthy vs understaffed shifts across active period.
- **Xung đột ca (Conflicts):** Badge count with quick-focus pulse navigation.
- **Nghỉ phép chờ duyệt (Pending Leaves):** Quick link to `LEAVES` tab.
- **Thay đổi chưa lưu (Draft Changes):** In-RAM modifications counter.
- *Strict Rule:* Never render four oversized decorative KPI metric tiles that displace the main planning matrix.

### 2.3 Sub-Navigation Tabs
- `Lịch ca` (`ROSTER`): Main 24/7 matrix grid.
- `Phân khu` (`ZONES`): Shift-zone operational assignment board.
- `Nghỉ phép` (`LEAVES`): Leave request approvals and history.

---

## 3. Roster Matrix Density & Ergonomics (`RosterMatrix`)

The matrix is the primary tool and must dominate the viewport:
- **Sticky Column:** Pinned left column displaying Employee Code, Full Name, and Shift Role badge.
- **Sticky Header:** Pinned top row displaying Days of Month, Day of Week, and Today highlight (`#003875` top border).
- **Shift Cell Encoding:**
  - `CA1` (06:00 - 14:00): Subtle blue tint `#EFF6FF`, text `#1E40AF`, border `#BFDBFE`.
  - `CA2` (14:00 - 22:00): Subtle amber tint `#FEF3C7`, text `#92400E`, border `#FDE68A`.
  - `CA3` (22:00 - 06:00): Subtle purple tint `#F3E8FF`, text `#6B21A8`, border `#E9D5FF`.
  - `HC` (07:30 - 16:30): Subtle slate tint `#F1F5F9`, text `#334155`, border `#CBD5E1`.
  - `OFF`: Neutral `#F8F9FA`, text `#94A3B8`, dashed border `#E2E8F0`.
  - `LEAVE`: Rose tint `#FFE4E6`, text `#9F1239`, border `#FECDD3`.
- **Keyboard Navigation:** Arrow keys navigate cells; Enter/Space activates `RosterCellPopover`.
- **High-Density Metrics:** Row height strictly 36px–40px, cell width 48px–54px.

---

## 4. Conflict & Unsaved State Handling

### 4.1 Conflict Notification
- Visual indicators: 2px danger border `#B43A3A`, warning exclamation icon, and hover tooltip detailing conflict reason (`APPROVED_LEAVE_CONFLICT`, `INSUFFICIENT_REST`, `UNDERSTAFFED_SHIFT`).
- No visual alarmism: Avoid full-red flashing rows.

### 4.2 Persistent Draft Bar (`RosterDraftBar`)
- Appears floating at viewport bottom when changes are in RAM:
  - Text: `[N] thay đổi ca chưa lưu`
  - Secondary Action: `Hoàn tác tất cả` (`.btn-secondary`)
  - Primary Action: `Lưu thay đổi` (`.btn-primary`)
- Disables dependence on browser `window.alert()`.
