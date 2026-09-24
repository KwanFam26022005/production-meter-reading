# Page Override: Administrative Audit Log (Kiểm toán)
**Target Workspace:** `AdminAudit.tsx`  
**Governing Authority:** `design-system/saigon-port/MASTER.md`

---

## 1. Mental Model: Forensic Auditability & Compliance

The Audit Log workspace is a **Forensic Compliance & Historical Accountability Log**. Its design prioritizes scanning efficiency, precise temporal tracking, and deterministic before/after diff readability.

Design rules:
1. **Compact Density:** Strict 36px–40px table row density. Avoid bloated card walls where each event takes 150px of vertical space.
2. **Deterministic Attribution:** Every entry clearly attributes WHO (actor name + employee code), WHEN (Vietnamese timestamp with second precision), WHAT (action token + resource type), and WHY/CHANGES.
3. **Controlled JSON Disclosure:** Inline summary highlights key delta fields; deep JSON payloads open inside a dedicated modal viewer with syntax highlighting and side-by-side Before/After diffs.

---

## 2. Layout & Composition Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header: Nhật ký quản trị · [Bộ lọc Hành động] · [Bộ lọc Đối tượng]   │
├────────────────────────────────────────────────────────────────────────┤
│ Compact Forensic Data Table:                                           │
│ [Thời gian]   [Người thực hiện]   [Hành động]   [Đối tượng]   [Thay đổi] │
│ 24/09 14:15   Nguyễn Văn An (NV)   Cập nhật      METER (CT-01) name:...   │
├────────────────────────────────────────────────────────────────────────┤
│ Deep Inspection Modal (on "Xem chi tiết" click):                       │
│ • Forensic header: Actor, Timestamp, Resource ID, IP/Client context    │
│ • Side-by-side or stacked Before (Cũ) vs After (Mới) JSON diff viewer  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Action Badges & Semantic Highlighting

Action tags must use functional semantic chips that allow fast visual triage:
- `METER_CREATED` / `READING_ROUNDS_CREATED`: Success green chip `#EAF6F1`, text `#167A5A` (`Tạo mới`).
- `METER_UPDATED` / `SCHEDULE_MODIFIED`: Brand blue chip `#EFF6FF`, text `#1E40AF` (`Cập nhật`).
- `METER_DEACTIVATED` / `ROUND_CANCELLED`: Warning amber chip `#FFF4DF`, text `#A86200` (`Ngừng sử dụng`).
- `METER_ACTIVATED`: Digital blue chip `#E0E7FF`, text `#3730A3` (`Kích hoạt lại`).

---

## 4. Before/After Delta Rendering

- For scalar modifications (e.g. name, location, CT ratio), the table column renders concise inline text: `vị trí: Cầu cảng 1 → Cầu cảng 2`.
- When inspecting full JSON payloads:
  - Key attributes are formatted cleanly with indentation and monospace tabular numerals.
  - The modal explicitly separates `Dữ liệu trước thay đổi (Before)` and `Dữ liệu sau thay đổi (After)` in structured code blocks with copy-to-clipboard support.
