# 06. METER SPATIAL PLACEMENT WORKFLOW
## Cảng Tân Thuận — Spatial Operations Redesign V7

---

### 1. Architectural Purpose

In prior iterations, meter creation and relocation lacked visual spatial positioning on the port map. V7 introduces **Spatial Meter Placement Mode**, an admin-only interactive editing mode enabling users to click on the map to define or adjust physical coordinates.

---

### 2. Step-by-Step User Flow

```
STEP 1: ENTRY
  - From Admin Meters: "Thêm công tơ" -> "Chọn vị trí trên bản đồ"
  - From Zone Context Panel: "Thêm công tơ"
  - From Meter Quick Popup: "Chỉnh vị trí" (Relocation mode)
        │
        ▼
STEP 2: ZONE SELECTION & 2D FOCUS
  - Admin picks target operational zone (e.g. Bãi Container Trung tâm).
  - Map performs smooth 2D focus framing the zone.
        │
        ▼
STEP 3: MATRIX / GRID ACTIVATION
  - A subtle 32x18 coordinate matrix activates above the canonical map.
  - Grid lines become prominent inside the selected zone polygon and stay subtle elsewhere.
        │
        ▼
STEP 4: CANDIDATE CURSOR TRACKING
  - Cursor transforms to a targeting reticle with concentric alignment rings.
  - Optional snap-to-grid toggle allows snapping to nearest grid intersection or free placement.
        │
        ▼
STEP 5: POINT-IN-POLYGON VALIDATION
  - Dynamic check tests if cursor coordinate is within the selected zone's polygons.
  - If INSIDE: Green valid reticle.
  - If OUTSIDE: Warning pill appears: "Vị trí đang nằm ngoài khu vực đã chọn." Confirmation disabled.
        │
        ▼
STEP 6: CLICK POSITION & PREVIEW
  - User clicks desired physical landmark.
  - A temporary candidate preview marker pins to the canvas.
  - Placement Card displays:
      * Mã công tơ: CT-013 (or existing code)
      * Tên công tơ: Công tơ kho mới
      * Khu vực: Bãi Container Trung tâm
      * Tọa độ: x=0.6340, y=0.4110 (normalized)
      * [Chọn lại]  [Xác nhận vị trí]
        │
        ▼
STEP 7: PERSISTENCE & AUDIT
  - Clicking "Xác nhận vị trí" submits HTTP POST/PATCH to backend `/api/v1/admin/meters`.
  - Backend saves normalized `map_x` and `map_y` to database.
  - Writes audit record: `METER_CREATED` or `METER_UPDATED` with `before_json` / `after_json`.
  - UI exits placement mode and newly placed meter is rendered on the map and list immediately.
```

---

### 3. Coordinate Contract Details

- Canonical width: 1664 px
- Canonical height: 932 px
- Screen to Scene calculation:
  ```typescript
  const rect = svgElement.getBoundingClientRect();
  const scaleX = 1664 / rect.width;
  const scaleY = 932 / rect.height;
  const canonicalX = Math.round((event.clientX - rect.left) * scaleX);
  const canonicalY = Math.round((event.clientY - rect.top) * scaleY);
  const normalizedX = Number((canonicalX / 1664).toFixed(4));
  const normalizedY = Number((canonicalY / 932).toFixed(4));
  ```
- Boundary Clamping: Normalized coordinates are clamped to `[0.0000, 1.0000]`.
- Existing Meter Relocation: Reuses the identical placement component and validation pipeline.
