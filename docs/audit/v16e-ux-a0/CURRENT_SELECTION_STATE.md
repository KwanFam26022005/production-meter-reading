# CURRENT SELECTION STATE AUDIT

## 1. Inventory of Selection States

The system maintains 7 primary selection states across its architecture:

1. **`selectedEntity: SelectedEntity | null` (`useMapStateMachine`)**:
   - Union: `{ type: 'zone', id } | { type: 'operator', id } | { type: 'meter', id } | null`
   - Authority: Controls which contextual variant mounts in `UnifiedContextSurface.tsx`.
   - Behavior: Strict single-selection invariant. Selecting a meter automatically clears any zone or operator selection.

2. **`selectedAssetId: string | null` (`MapOperationsPage`)**:
   - Authority: Tracks active infrastructure asset in Map and Network views.
   - Behavior: Selecting an asset clears meter selection and opens `AssetContextSurface.tsx`. Preserved during Map <-> Network bidirectional switching.

3. **`focusedEntity: FocusedEntity | null` (`OperationalWorkspaceContext`)**:
   - Authority: Bridge entity passed when jumping across top tabs (e.g. from `AdminAssets` table to `MapOperationsPage`).
   - Behavior: Consumed on mount of the destination tab to set local selection, then retained until next focus.

4. **`selectedDate: string` (`OperationalWorkspaceContext`)**:
   - Authority: Operational calendar date (YYYY-MM-DD) in Asia/Ho_Chi_Minh timezone.
   - Behavior: Synchronized across Map, Sổ ca ghi, Lịch ghi, Báo cáo, and Đối soát ca ghi.

5. **`selectedRoundId: string | null` (`OperationalWorkspaceContext`)**:
   - Authority: Active scheduled reading round / shift ID.
   - Behavior: Filters meter reading status in Map and List views.

6. **`utilityFilter: 'ALL' | 'ELECTRICITY' | 'WATER'` (`OperationalWorkspaceContext`)**:
   - Authority: Top-level utility filter.
   - Behavior: Directs filtering in Map, Network, and Command bar.

7. **`inspectingReadingId: string | null` (`OperationalWorkspaceContext`)**:
   - Authority: Modal reading inspection.
   - Behavior: Overrides standard tab viewport to render high-resolution OCR crop inspection.

---

## 2. Representation Across Screens

An entity can be presented in multiple forms across screens:

| Domain Entity | On Bản đồ (Map) | On Mạng lưới (Network) | On Sổ ca ghi (List) | On Kho Thiết bị (Assets) | On Trung tâm Đối soát |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Meter** | Circular interactive pin with status color, utility icon, and pulse indicator | N/A (hidden from schematic nodes) | Table row with badge, latest reading value, and unit (kWh/m³) | Nested row inside Asset detail drawer under "Công tơ gắn kèm" | Row in Meter Review Matrix table |
| **Asset** | Rectangular glyph / icon on AssetLayer (when enabled) | Layered DAG node box with upstream/downstream connection handles | N/A | Full master table row with code, name, type, origin badge, lifecycle, and verification chips | Candidate review card / table row with action buttons |
