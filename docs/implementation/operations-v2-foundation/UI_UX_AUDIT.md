# Operations V2 Foundation: Project-Wide Frontend UI/UX Audit

**Date:** 2026-09-24  
**Project:** Production Meter Reading — Cảng Sài Gòn  
**Document:** `docs/implementation/operations-v2-foundation/UI_UX_AUDIT.md`  
**Governing Standard:** `frontend/DESIGN_DNA.md` & `design-system/saigon-port/MASTER.md`

---

## 1. Audit Scope & Methodology

A read-only structural design and ergonomics audit was conducted across the entire frontend surface of both the **User Portal** (Mobile Field Ergonomics) and **Operations Portal** (Desktop Decision Workspace).

The audit assesses adherence to:
1. Saigon Port Corporate Dresscode (Source brand palette preservation, zero forbidden color combinations).
2. Information density and viewport ergonomics across 1024×768, 1366×768, and 1920×1080.
3. Typography, modular rhythm, and surface depth hierarchy.
4. WCAG 2.1 contrast compliance and accessibility.

---

## 2. Categorized Findings

### 2.1 Global Design System Issues [GLOBAL]

1. **Inconsistent Density Rhythm across Workspaces:**
   - *Observation:* While `AdminStaffRoster` uses a 36px–40px compact grid, `AdminReports` and `AdminSchedules` feature large 64px KPI card blocks and excessive vertical whitespace.
   - *Impact:* Operators on 1366×768 laptops must continuously scroll vertically to reach actual data tables.
   - *Remediation:* Standardize surface hierarchy: compact status strips for situational awareness; reserve vertical viewport space for tables and timelines.

2. **Scattered Elevation & Border Tokens:**
   - *Observation:* Multiple ad-hoc shadows (`box-shadow: 0 4px 6px -1px rgba(...)`, custom inline drop-shadows) compete with clean porcelain canvas tokens.
   - *Impact:* Visual clutter without structural hierarchy.
   - *Remediation:* Standardize to 3 elevation tiers defined in `MASTER.md` (Level 1 Surface, Level 2 Muted Surface, Level 4 Overlay).

3. **Overuse of Native Browser Dialogs (`window.alert` / `confirm`):**
   - *Observation:* Several admin state changes (e.g. unsaved roster drafts, schedule cancellation) rely on blocking native `window.alert()`.
   - *Impact:* Disrupts keyboard navigation and breaks the maritime corporate software feel.
   - *Remediation:* Replace with accessible in-app confirmation dialogs and persistent action bars (`RosterDraftBar`).

---

### 2.2 Shared Component Issues [SHARED]

1. **Filter Toolbars Visual Noise:**
   - *Observation:* Multiple workspaces (`AdminSchedules`, `AdminReports`, `AdminAssets`) render 4 to 6 unclustered input controls directly in the top bar.
   - *Remediation:* Adopt the 3-cluster composition: Temporal, Categorical (segmented control), and Search, collapsing auxiliary filters behind `Bộ lọc nâng cao`.

2. **Table Empty States Fragmentation:**
   - *Observation:* Inconsistent empty states ranging from plain text `"Không có dữ liệu"` to broken layout tables with empty headers.
   - *Remediation:* Standardize on the unified single-card empty state with clear operational copy and primary remediation CTA.

3. **Status Badges Text Contrast:**
   - *Observation:* Occasional white text on warm warning badges (`#FCC959` or `#F39200`).
   - *Remediation:* Enforce the strict dresscode rule: **White text on Corporate Yellow or Orange is strictly prohibited.** Use `#181818` or `#003875`.

---

### 2.3 Page-Specific Issues [PAGE]

#### 1. Phân ca (`AdminStaffRoster.tsx`, `roster/*`)
- **Issue 1:** Roster matrix headers previously lacked sticky positioning during deep horizontal scrolling.
- **Issue 2:** Legend occupied excessive vertical space below the matrix.
- **Issue 3:** Mobile view (< 768px) needs clear fallback cards that display shift coverage without matrix truncation.

#### 2. Lịch ghi (`AdminSchedules.tsx`)
- **Issue 1:** The destructive button `"Xóa lịch ngày"` was positioned alongside daily navigation buttons with high visual prominence.
- **Issue 2:** Rounds agenda lacked distinct visual badges for temporal states (`CURRENT` vs `PAST_INCOMPLETE`).
- **Issue 3:** Technical terminology (`scope_mode = SNAPSHOT`) was exposed raw to operators instead of plain Vietnamese operational copy.

#### 3. Báo cáo (`AdminReports.tsx`, `ReportingOperationsWorkspace.tsx`, `ReportingUsageWorkspace.tsx`)
- **Issue 1:** Operations overview tab had 4 equal-weight large KPI cards that displaced the actual round breakdown table.
- **Issue 2:** Usage tab displayed multiple repetitive `"Chưa đủ dữ liệu"` blocks when meters lacked configured units.
- **Issue 3:** Action queue presented raw table rows without visual triage severity ranking (`UNASSIGNED_DUE` vs `OVERDUE_MISSING` vs `REVIEW`).

#### 4. Thiết bị & Công tơ (`AdminDevicesWorkspace.tsx`, `AdminAssets.tsx`, `AdminMeters.tsx`)
- *Status:* Clean inventory structure with slide-over drawers; scheduled for Wave 2 polish.

#### 5. Hậu kiểm & Kiểm toán (`AdminVerification.tsx`, `AdminAudit.tsx`)
- *Status:* Functionally robust with ROI comparison canvas; scheduled for Wave 2 polish.

#### 6. Dashboard (`AdminDashboard.tsx`)
- *Status:* Map/List split view functions well; scheduled for Wave 2 shell consolidation.

---

### 2.4 Domain-Specific Exceptions [EXCEPTION]

1. **Map V2 Digital Twin Neon Aesthetic:**
   - *Scope:* Strictly isolated to the Map V2 canvas (`MapV2Workspace.tsx`, SVG layers).
   - *Rule:* The neon/cyber presentation tone used for electrical and water utility topologies is a domain-specific capability for night-shift spatial inspection. It must **not** bleed into Admin tables, forms, or general UI chrome.
2. **Field Camera Ergonomics (User Portal):**
   - *Scope:* Mobile viewport (`MeterCamera.tsx`, `ReadingBatchView.tsx`).
   - *Rule:* High contrast for bright outdoor sunlight; touch targets ≥ 48px × 48px; bottom capture bar must remain fixed and never obstructed.

---

## 3. Implementation Roadmap

- **Wave 1 (Current Scope):**
  1. Phân ca (`AdminStaffRoster.tsx`, `roster/*`)
  2. Lịch ghi (`AdminSchedules.tsx`)
  3. Báo cáo (`AdminReports.tsx`, `ReportingOperationsWorkspace.tsx`, `ReportingUsageWorkspace.tsx`)
- **Wave 2 (Operations Consolidation):**
  - Admin Dashboard, Thiết bị & Công tơ, Hậu kiểm, Kiểm toán, AdminShell rail.
- **Wave 3 (User Portal Mobile):**
  - Login view, Home Hub, User Schedule, Attendance, Meter Reading workflow.
