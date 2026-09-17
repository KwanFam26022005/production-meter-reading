# RUNTIME CLICK-THROUGH AUDIT (V16E-UX-A0)

Conducted locally against simulated runtime environment (`data_mode: SIMULATION`, `active_scenario: tan-thuan-demo-v1`).

---

## FLOW A: Open Bản đồ -> Click Zone -> Click Meter -> Inspect Actions
1. **Starting Screen**: `http://localhost:5173/` logged in as `ADMIN (52300119)`. Default view loads `Bản đồ` (`currentTab='dashboard'`, `viewMode='map'`).
2. **Action 1 (Click Zone)**: Click on polygon for "Khu vực Kỹ thuật (Technical Zone)".
   - **Result**: Map camera smoothly pans and frames the zone (`zoom: 1.25`).
   - **Context Panel**: Opens `UnifiedContextSurface` with variant `zone-summary` on the right rail (360px wide).
   - **Displayed Content**: Zone title, operator assigned (`CSG-0102`), meter progress (4 meters total, 0 overdue), and quick action `"Xem danh sách công tơ khu vực"`.
3. **Action 2 (Click Meter)**: Click on meter pin `SIM-EM-001` (Trạm kỹ thuật MDB-01).
   - **Result**: Camera transitions to inspect framing (`safeRight = 440px`). Pin animates with focus glow.
   - **Context Panel**: Morph-transitions to variant `meter-detail`.
   - **Available Actions**:
     - `"Xem trên bản đồ"`
     - `"Xem mạng lưới"` (deep-links to Network view with parent asset selected)
     - `"Đặt lại vị trí công tơ"` (activates interactive pin relocation overlay)
     - `"Chuyển phân khu"`
     - `"Tạm ngừng"` / `"Ngừng sử dụng"`
     - Button to inspect reading history.

---

## FLOW B: Open Mạng lưới -> Click Asset -> Inspect Actions
1. **Starting Screen**: Click `[Mạng lưới]` in top cockpit header (`viewMode='network'`).
2. **Action 1 (Inspect Canvas)**:
   - **Result**: Renders layered DAG schematic diagram of electrical distribution network.
   - **Toolbar Controls**: Utility selector (`[Điện]` active, `[Nước]`), trace indicators, zoom controls.
3. **Action 2 (Click Asset Node)**: Click on node box `SIM-MDB-01 (Tủ phân phối tổng MDB-01)`.
   - **Result**: Node stroke highlights with bold brand navy accent. All connected downstream edges remain clear.
   - **Context Panel**: Opens `AssetContextSurface` on the right rail.
   - **Available Actions**:
     - `[Nguồn cấp]` (traces upstream feeders to root substation)
     - `[Cấp đến]` (traces downstream branches to cranes and reefer racks)
     - `"Xem trên bản đồ"` (smoothly switches to Map view and centers on coordinates)
     - `"Đối soát thiết bị"` (deep-links to Verification tab)
     - List of attached meters (`SIM-EM-001` with relation `INSTALLED_AT` and `MEASURES`).

---

## FLOW C: Open Danh sách / Sổ ca ghi -> Click One Meter -> Inspect Actions
1. **Starting Screen**: Click `[Sổ ca ghi]` in top cockpit header (`viewMode='list'`).
2. **Action 1 (Inspect Table)**:
   - **Result**: Renders clean operational table listing 12 meters scheduled for current shift.
   - **Columns**: `MÃ CÔNG TƠ`, `LOẠI` (Điện/Nước badge), `TÊN CÔNG TƠ`, `KHU VỰC`, `TRẠNG THÁI`, `CHỈ SỐ GẦN NHẤT`, `HÀNH ĐỘNG`.
3. **Action 2 (Click Row)**: Click row `SIM-EM-007` (Cẩu bãi RTG Bãi Tây).
   - **Result**: Row is highlighted with active border.
   - **Context Panel**: Opens `UnifiedContextSurface` (`meter-detail`) on right rail.
   - **Available Actions**:
     - Inspect reading status (`Chưa ghi` or `Đã ghi`)
     - Open reading inspection crop if a reading exists
     - Mutate meter lifecycle / relocation.

---

## FLOW D: Open Thiết bị -> Click Related Asset -> Inspect Actions
1. **Starting Screen**: Click `[Kho Thiết bị]` in top cockpit header (`activeTab='assets'`).
2. **Action 1 (Inspect Table)**:
   - **Result**: Master data table displaying 32 assets.
   - **Columns**: `Mã thiết bị`, `Tên thiết bị`, `Phân loại`, `Khu vực`, `Nguồn dữ liệu`, `Công tơ`, `Vòng đời`, `Xác minh`, `Thao tác`.
3. **Action 2 (Click Row)**: Click row `SIM-RTG-W01 (Cẩu bãi RTG Bãi Tây RTG-W01)`.
   - **Result**: Opens right slide-over drawer (`AssetDetailDrawer`).
   - **Available Actions**:
     - MapPin icon: Direct jump to Map (`workspace.locateOnMap()`)
     - `"Liên kết công tơ"`: Opens modal to bind a meter with `INSTALLED_AT` or `MEASURES`
     - `"Đổi vị trí"` / `"Ngừng hoạt động"`
     - View attached meter `SIM-EM-007`.

---

## FLOW E: Open Đối soát -> Inspect Item / Detail / Actions
1. **Starting Screen**: Click `[Trung tâm Đối soát]` in top cockpit header (`activeTab='verification'`).
2. **Action 1 (Inspect Workspace)**:
   - **Result**: Summary cards showing verified count (32 assets), unverified candidate count, and meter-asset review matrix.
   - **Sub-Tabs**: `Thẩm định hạ tầng` (Infrastructure Evidence) and `Đối soát ca ghi` (Shift Reading Exceptions).
3. **Action 2 (Inspect Item Actions)**:
   - In `Thẩm định hạ tầng`: Action button `"Thẩm định"` opens evidence modal to attach document/photo reference. Action button `"Từ chối"` marks proposal as `REJECTED`.
   - In `Đối soát ca ghi`: Shows list of reading exceptions with OCR reading vs confirmed reading, discrepancy delta, and button to open full-screen crop inspector.
