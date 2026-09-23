# 07 — Three-Axis Toolbar Information Architecture

**Scope:** Implementing the approved Three-Axis operational toolbar in `MapV2Workspace.tsx`.

---

## 1. Information Architecture Overview

The previous clutter of 14 competing buttons in the top bar has been restructured into a clean 3-axis hierarchy:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Bản đồ V2] [23/09/2026 - Lượt 09:00 ▼] [Tìm nhanh Q] [⚠️ 2 ngoại lệ]        │
│                                           [Lớp bản đồ (3)] [⋯ Tùy chọn]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Primary Toolbar Breakdown

1. **Title & Branding:**
   - Concise identifier: `"Bản đồ V2 — Digital Twin Cảng"`.

2. **Context Trigger (Date & Round):**
   - Displays formatted current operational date and round time.
   - Clicking opens the non-modal Context Popover with Date input and Round dropdown.

3. **Operational Search:**
   - Inline Quick Search input (`placeholder="Tìm công tơ, phân khu, nhân sự (Ctrl+K)..."`).
   - Instant dropdown results grouped by Category: Phân khu, Điểm đo công tơ, Nhân sự phụ trách.

4. **Exception Discovery Chip:**
   - Displays count of actionable anomalies: `⚠️ [N] ngoại lệ`.
   - Toggles `exceptionsOnly` layer filter instantly.

5. **Axis 2 — Layer Manager Popover (`[Lớp bản đồ]`):**
   - Partitioned into 3 distinct sections:
     - **Tác nghiệp thực tế (Live):** Phân khu vận hành, Nhân sự phụ trách (Thực tế), Điểm đo công tơ, Tín hiệu ngoại lệ.
     - **Mô phỏng hạ tầng (Simulated):** Mạng điện mô phỏng (B2), Mạng nước mô phỏng (B2), Hoạt họa nhân sự (Demo).
     - **Bản đồ nền & Hạ tầng:** Bản đồ nền kỹ thuật, Kho tàng & Hành chính, Ranh giới & Tuyến nội bộ, Điểm kiểm soát (Cổng), Điểm neo phân khu.

6. **Axis 3 — More Options Popover (`[⋯]`):**
   - **Chế độ làm việc (Work Mode):** `Vận hành` vs `Kiểm tra tọa độ` (Geometry Inspection).
   - **Giao diện (Presentation):** `Kỹ thuật` (Technical Light) vs `Neon số` (Neon Digital Twin).
   - **Chế độ khung nhìn:** `Fit toàn bộ` vs `Tràn chiều rộng`.
   - **Lối tắt quản lý lớp:** `Quản lý 6 lớp hiển thị`.
   - **Metadata kỹ thuật:** `1536×1024 px • 7 phân khu • Canonical B2`.
