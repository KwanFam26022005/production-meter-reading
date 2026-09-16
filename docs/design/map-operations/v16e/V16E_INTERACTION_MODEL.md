# V16E — INTERACTION MODEL & SYNCHRONIZATION SPECIFICATION

## 1. Selection & Context Surface State Machine

The interaction model strictly reinforces the single-selection and single-context surface invariant across the application.

```
                    +------------------------------------+
                    |        DEFAULT BROWSE STATE        |
                    | (No asset selected, canvas active) |
                    +-----------------+------------------+
                                      |
         Click Asset Glyph / Node     |     Click Blank Canvas / ESC
         ------------------------>    |    <------------------------
                                      v
                    +------------------------------------+
                    |       ASSET INSPECTION STATE       |
                    |  (selectedAssetId set, context     |
                    |   surface Layer D open & visible)  |
                    +-----------------+------------------+
                                      |
                     Click "Xem mạng" | Click "Xem bản đồ"
                                      v
                    +------------------------------------+
                    |       CROSS-VIEW TRANSITION        |
                    | (Retains selectedAssetId, switches |
                    |  viewMode, frames camera / node)   |
                    +------------------------------------+
```

### Invariants
1. **Single Context Surface Invariant**:
   - At most 1 contextual drawer or popover is ever visible at any time.
   - Selecting an asset automatically closes any open meter drawer, zone drawer, or analytics drawer.
2. **Hierarchical ESC Handling**:
   - 1st ESC press: Dismisses open trace or filter popup.
   - 2nd ESC press: Closes the active `AssetContextSurface` and resets camera.
3. **Safe Viewport Framing**:
   - When centering an asset in Map View, the camera incorporates safe margin offsets (`safeRight = 440px`) to ensure the asset is never obscured by the open context rail.

---

## 2. Network Trace Interaction Algorithm

The Utility Network View features zero-lag topological path tracing:

### A. Upstream Tracing ("Nguồn cấp")
- **Trigger**: Click `[Nguồn cấp]` button in the network toolbar or context surface.
- **Algorithm**: Breadth-First Search (BFS) traversing incoming edges (`target_asset_id === currentId`) recursively to root substations/intakes.
- **Visual Feedback**:
  - All ancestor nodes and connecting lines remain at `1.0` opacity with high-contrast accent stroke (`#073B5C` / `#12658F`).
  - All unrelated nodes and edges dim to `opacity: 0.22` within `200ms ease-out`.
  - The toolbar displays an active indicator: `Đang truy vết nguồn cấp (X thiết bị) [Hủy]`.

### B. Downstream Tracing ("Cấp đến")
- **Trigger**: Click `[Cấp đến]` button in the network toolbar or context surface.
- **Algorithm**: BFS traversing outgoing edges (`source_asset_id === currentId`) recursively to all terminal distribution boards, pumps, or loads.
- **Visual Feedback**:
  - All descendant nodes and distribution paths remain at `1.0` opacity.
  - All unrelated nodes and edges dim to `opacity: 0.22`.
  - The toolbar displays an active indicator: `Đang truy vết phụ tải cấp đến (Y thiết bị) [Hủy]`.

### C. Reset Trace
- Clicking `[Bỏ truy vết]` or pressing `ESC` immediately restores all elements to normal operational opacity (`1.0`).

---

## 3. Map ↔ Network Bidirectional Synchronization

| User Action | Origin View | Destination View | State Preservation & Camera Action |
| :--- | :--- | :--- | :--- |
| Click asset on map | Map | Map | `selectedAssetId` set, `AssetContextSurface` opens on right rail. |
| Click "Xem mạng lưới" in Context Surface | Map | Network | `viewMode` changes to `'network'`. `selectedAssetId` is preserved. Network view pans to center the node. |
| Click asset node in network | Network | Network | `selectedAssetId` set, `AssetContextSurface` opens on right rail. |
| Click "Xem trên bản đồ" in Context Surface | Network | Map | `viewMode` changes to `'map'`. `selectedAssetId` is preserved. Camera smoothly zooms and centers on asset canonical coordinates `(map_x, map_y)`. |
| Click asset without coordinates | Network | Map | Context surface displays warning `"Chưa xác minh vị trí thiết bị"`. Map remains at current framing without crashing or throwing errors. |

---

## 4. Admin Verification & Deep Linking

1. **Unverified Candidate Toggle**:
   - Read-only operators see only verified assets.
   - Administrators see the `[Duyệt chưa xác minh]` toggle in the network toolbar.
   - Enabling this toggle dynamically fetches unverified candidates and edges via `GET /api/v1/admin/asset-network?include_unverified=true`.
2. **Context Surface Warning & Action**:
   - When an unverified asset is inspected, the context surface renders a neutral amber alert banner:
     `"Thiết bị đang ở trạng thái chưa xác minh. Dữ liệu này chỉ mang tính tham khảo nội bộ và chưa được nghiệm thu chính thức."`
   - A primary button `"Đi tới xét duyệt thiết bị →"` deep-links directly to `/admin?tab=verification&asset={id}` for evidence-backed human review.
