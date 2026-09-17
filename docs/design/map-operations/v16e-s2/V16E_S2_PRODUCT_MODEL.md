# V16E-S2 PRODUCT MODEL: TWO-WORKSPACE CONSOLIDATION

**Document Status:** Approved Architecture  
**Release Target:** V16E-S2  
**Dataset Baseline:** `tan-thuan-demo-v1` (Frozen Simulated Dataset)  
**Primary Workspaces:** `Bản đồ` & `Thiết bị`

---

## 1. Executive Summary & Core Mental Model

The Tan Thuan Port operational management interface is consolidated into exactly **TWO PRIMARY WORKSPACES**:

| Workspace | Vietnamese Label | Core Question Answered | Operational Focus |
| :--- | :--- | :--- | :--- |
| **Workspace 1** | **Bản đồ** | *"Ở đâu và đang diễn ra điều gì?"*<br>*(Where is it and what is happening right now?)* | Spatial GIS mapping, single-line topology schematics, live shift progress monitoring, anomaly alerts, contextual field reading drawer. |
| **Workspace 2** | **Thiết bị** | *"Hệ thống đang quản lý những gì?"*<br>*(What physical entities does the system manage?)* | Master inventory catalog (44 items: 32 assets + 12 meters), technical specifications, attachment relationships, lifecycle status, read-first detail surface with administrative actions. |

This consolidation eliminates cognitive overload caused by fragmented navigation (previously 5+ competing tabs including standalone List, Meters, Assets, Verification) and anchors all user workflows to these two fundamental operational pillars.

---

## 2. Ontological Distinction: Asset vs. Meter

A critical invariant of the product architecture is the strict domain separation between **Asset** (Hạ tầng) and **Meter** (Công tơ đo lường).

```
   ┌─────────────────────────────────────────────────────────┐
   │                       ASSET                             │
   │  Physical Infrastructure / Equipment Node               │
   │  (e.g., Trạm Biến Áp TBA-01, Tủ Cấp Nguồn K1, Cầu Cảng)│
   │  - Has physical coordinate / zone                       │
   │  - Connects to upstream/downstream Assets (Topology)    │
   │  - Acts as a host/carrier for metering devices          │
   └───────────────────────────┬─────────────────────────────┘
                               │
                               │ 1:N or N:1 Attachment
                               ▼ (MeterAssetRelation)
   ┌─────────────────────────────────────────────────────────┐
   │                       METER                             │
   │  Telemetry / Measurement Instrument                     │
   │  (e.g., Công tơ điện tử LCD PE-01, Đồng hồ nước MW-02)  │
   │  - Possesses serial number, meter type, multiplier      │
   │  - Subject to reading schedules and field inspections   │
   │  - Records time-series readings and optical OCR photos  │
   └─────────────────────────────────────────────────────────┘
```

### 2.1 Backend Domain Models (Preserved Schemas)

1. **Asset (`assets` table / `Asset` model)**:
   - `id`: Unique identifier (UUID).
   - `code`: Domain code (e.g., `TBA-01`, `TC-K1-01`).
   - `name`: Descriptive name (e.g., `Trạm biến áp trung thế TBA-01`).
   - `asset_type`: Categorical taxonomy (`SUBSTATION`, `DISTRIBUTION_PANEL`, `PUMP_STATION`, `VALVE_CHAMBER`, `CONTAINER_REEFER_RACK`, `STORAGE_WAREHOUSE`, `BERTH_BOLLARD`).
   - `utility_type`: `ELECTRICITY` or `WATER`.
   - `zone_id` & `zone_name`: Spatial allocation (e.g., `Bãi Container A`, `Cầu Cảng C1`).
   - `status`: Operational condition (`OPERATIONAL`, `MAINTENANCE`, `FAULT`, `OFFLINE`).
   - `location`: Geometric coordinates `(latitude, longitude)`.

2. **Meter (`meters` table / `AdminMeterItem` model)**:
   - `id`: Unique identifier.
   - `serial_number`: Manufacturer serial number (e.g., `EM-2024-001`).
   - `meter_type`: Sensor technology (`MECHANICAL`, `ELECTRONIC_LCD`, `SMART_PULSE`).
   - `utility_type`: `ELECTRICITY` or `WATER`.
   - `multiplier`: Pulse/unit calculation factor.
   - `is_active` & `lifecycle_status`: `ACTIVE`, `INACTIVE`, or `RETIRED`.
   - `latest_reading`: Most recent reading value.
   - `latest_reading_time`: Timestamp of last verified reading.

3. **MeterAssetRelation (`meter_asset_relations` table)**:
   - Links a `Meter` to an `Asset`.
   - Tracks `installation_date`, `is_current`, and optional port/phase assignment.

4. **AssetConnection (`asset_connections` table)**:
   - Connects an upstream `from_asset_id` to downstream `to_asset_id`.
   - Forms the single-line schematic tree/network.

---

## 3. The Unified "Thiết bị" Master Inventory

While the backend maintains distinct database tables for `Asset` and `Meter`, user research demonstrated that field supervisors and operations managers think of all port hardware as "Thiết bị" (Devices / Equipment).

In **Workspace 2 (Thiết bị)**, the UI joins both entities client-side into a unified polymorphic row model:

$$\text{Total Devices (44)} = \text{Assets (32)} + \text{Meters (12)}$$

### Segmented Controls:
- **`[Tất cả 44]`**: Complete combined hardware inventory.
- **`[Hạ tầng 32]`**: Physical assets (transformers, distribution cabinets, pumps, valves, berths).
- **`[Công tơ 12]`**: Measurement meters (electric LCD/mechanical, water meters).

### Read-First Philosophy:
Clicking any device row opens the slide-over **`EntityDetailSurface`**. The default view is 100% read-only, presenting specifications, spatial coordinates, connection topology, attached meters/parent asset, and reading history. Destructive or modifying actions (`Sửa thông tin`, `Gán / Hủy công tơ`, `Đổi trạng thái`, `Tạo sự cố`) are grouped under the **`[⋮ Quản trị]`** overflow menu to prevent accidental field edits.

---

## 4. The "Bản đồ" Operational Hub & Shift Meter Panel

In **Workspace 1 (Bản đồ)**, the UI is dedicated to real-time spatial and topological understanding:

1. **GIS Spatial Map (`'map'`)**:
   - Interactive OpenStreetMap/satellite tile canvas.
   - Distinct color-coded SVG markers:
     - Electricity Assets: Gold/amber substation and panel icons.
     - Water Assets: Cyan/blue pump and valve chamber icons.
     - Meters: Circular badges indicating reading progress (`Chưa ghi` amber, `Đã ghi` green, `Bất thường` red).
   - Presentation Zones (5 zones rendered as polygon boundaries).

2. **Network Schematic (`'network'`)**:
   - Force-directed topological view of port utility distribution.
   - Electricity network: 24 directed edges starting from main transformers down to reefer container racks and quay cranes.
   - Water network: 7 directed edges starting from municipal main connection to water towers and berth hydrants.

3. **Contextual Shift Progress (`ShiftMeterPanel`)**:
   - Rather than forcing the user into a separate full-page "Danh sách", the shift progress is an accessible right-side rail (or bottom sheet on mobile).
   - Toggled via the header shift indicator: `[Ca 1 · 06:00 · 0/12]`.
   - Displays real-time progress bar (0% -> 100%), search bar, status filter chips (`Tất cả 12`, `Chưa ghi 12`, `Đã ghi 0`, `Cần chú ý 0`).
   - Clicking any meter row smoothly flies the GIS map to that meter's coordinates and opens its reading/detail surface.

---

## 5. Frozen Simulation Dataset: `tan-thuan-demo-v1`

All features in V16E-S2 operate against the frozen benchmark dataset `tan-thuan-demo-v1`:

| Entity Group | Count | Sample Identifiers / Attributes |
| :--- | :--- | :--- |
| **Meters** | 12 | `PE-01` to `PE-08` (Electric), `MW-01` to `MW-04` (Water). Multipliers: 1x, 10x, 120x. |
| **Assets** | 32 | `TBA-01` (Trạm biến áp), `TC-K1-01` (Tủ phân phối), `TBN-01` (Trạm bơm nước), `CC-01` (Cầu tàu 1). |
| **Electricity Edges** | 24 | Directed links from Substation -> Main Distribution -> Field Racks. |
| **Water Edges** | 7 | Directed links from Main Valve -> Distribution Network -> Hydrants. |
| **Zones** | 5 | Zone A (Container bãi), Zone B (Kho hàng), Zone C (Bến bãi & Cầu cảng), Zone D (Kỹ thuật), Zone E (Văn phòng). |
| **Active Shift** | 1 | Ca 1 (06:00 - 14:00) with 12 assigned meters scheduled for verification. |

**Simulation Integrity Rules:**
- Database tables and foreign keys are unaltered.
- Demo state is initialized via seeded SQLite store with deterministic IDs.
- Any manual edits in the admin surface persist locally without breaking baseline relationships.

---

## 6. Verification and Audit Integration

Under the V16E-S2 model, "Đối soát" (Reconciliation) and "Thẩm định hồ sơ" (Verification) do **not** clutter the primary navigation:
- **Field-level Verification**: Handled directly in `ShiftMeterPanel` where recorded values, confidence scores, and OCR photos are reviewed inline.
- **Formal Audit / Registry Review**: Relocated to the secondary `[⋯]` menu in the navigation shell, keeping daily operational focus sharp and uncluttered.
