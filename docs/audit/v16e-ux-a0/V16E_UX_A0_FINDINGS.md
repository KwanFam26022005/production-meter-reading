# V16E-UX-A0: CORE ARCHITECTURAL FINDINGS & SYNTHESIS

## Executive Summary
This audit evaluated the current product model, user experience, navigation hierarchy, entity models, and CRUD surfaces across the codebase, database, APIs, and runtime execution.

---

## 1. Direct Answers to Key Questions (Q1 - Q20)

### Q1: What exactly is "Danh sách" today?
**Answer**: "Danh sách" today (labeled in the top cockpit header as `"Sổ ca ghi"`) is **specifically an operational Reading Task List / Shift Logbook**, NOT a generic meter inventory.
- **Evidence**: It renders `OperationalListView.tsx`. It takes `meters` from `GET /api/v1/map/overview` (which projects `semanticState`, `latestReading`, `roundTime`, `stateLabel`), displays reading status badges (`Đã ghi`, `Quá hạn`, `Cần kiểm tra`, `Chưa ghi`), and formats numbers with units (`kWh` or `m³`). Its primary purpose is allowing shift supervisors and operators to see which meters are due or pending during the active reading round.

### Q2: What exactly is "Thiết bị" today?
**Answer**: In modern V16 code, "Thiết bị" refers exclusively to **Infrastructure Assets (`Asset` entity)**, such as Substations, Transformers, Feeders, Switchboards, RTG Cranes, Pumps, Reefer Racks, and Water Points.
- **Evidence**: The top cockpit tab `"Kho Thiết bị"` loads `AdminAssets.tsx`, which queries `GET /api/v1/admin/assets` and manages physical port equipment. While legacy V13 code in `AdminMeters.tsx` once had a table title "Danh sách thiết bị", that view was bypassed from primary navigation.

### Q3: Are "Danh sách" and "Thiết bị" backed by the same entity?
**Answer**: **NO.**
- "Danh sách" (`OperationalListView.tsx`) is backed by the **`Meter`** entity projected with shift reading task progress.
- "Thiết bị" (`AdminAssets.tsx`) is backed by the **`Asset`** entity.
- They reside in completely separate tables (`meters` vs `assets`), have different schemas, and query different API endpoints.

### Q4: Do they show overlapping data?
**Answer**: Only indirectly through relationships. An Asset row shows an attached meter count badge (`attached_meters_count`), and selecting an Asset lists the meters measuring or installed on it. Conversely, the Meter Context Surface lists the parent Asset name. But they display completely different primary records: 12 consumption meters vs 32 physical infrastructure machines.

### Q5: Do they support overlapping actions?
**Answer**: Very little. "Danh sách" is an operational logbook (read status, inspect reading crop, relocate pin). "Thiết bị" is a master data CRUD inventory (create asset, edit specifications, link meters, retire machinery).

### Q6: Is "Danh sách" primarily a shift/reading workflow rather than inventory?
**Answer**: **YES.** 100% of its data projection in `OperationalListView.tsx` relates to the shift round: scheduled round ID, latest recorded reading, completion badges (`badge-confirmed`, `badge-overdue`, `badge-due`), and reading exceptions.

### Q7: Is Meter considered a Device in product semantics?
**Answer**: Informally yes in Vietnamese colloquial terms ("thiết bị đo"), but **in product semantics and architecture, it is strictly treated as a "Công tơ" (Measuring Instrument)**, distinguished from infrastructure equipment.

### Q8: Is Asset considered a Device in product semantics?
**Answer**: **YES.** Asset is the authoritative enterprise "Thiết bị" (Electrical & Mechanical Port Equipment).

### Q9: Where is Meter CRUD actually performed?
**Answer**: Meter CRUD is divided across two surfaces:
1. **Administrative metadata CRUD** (Name, code, type, location): Performed in `AdminMeters.tsx` (or backend API).
2. **Operational spatial & lifecycle CRUD** (Relocate pin, assign zone, deactivate, retire): Performed inside the **`UnifiedContextSurface.tsx` (meter-detail and workflow variants)** directly on the Map/List workspace.

### Q10: Where is Asset CRUD actually performed?
**Answer**: Inside **`AdminAssets.tsx`** ("Kho Thiết bị"):
- Create asset (`POST /api/v1/admin/assets`)
- Edit metadata (`PUT /api/v1/admin/assets/{id}`)
- Relocate coordinates (`POST /api/v1/admin/assets/{id}/relocate`)
- Bind meters (`POST /api/v1/admin/meter-asset-relations`)
- Retire asset (`POST /api/v1/admin/assets/{id}/retire`).

### Q11: Where is reading workflow performed?
**Answer**:
- **Field capture & confirmation**: In the mobile app shell (`HomeHub` -> `ReadingBatchView` -> `MeterCamera` -> `App.tsx:handleConfirmManualReading` or OCR confirmation).
- **Control room reading inspection & review**: In `AdminReadingInspection.tsx` (accessed by clicking reading values in Map, List, or Exceptions).

### Q12: What purpose does Verification currently serve?
**Answer**: Verification (`AdminVerification.tsx`) serves a **dual governance purpose**:
1. **Engineering Asset Verification** ("Thẩm định hạ tầng"): Enables authorized port engineers to vet candidate infrastructure hypotheses imported from drawings/discovery with verifiable evidence references (`VerificationEvidence`).
2. **Reading Exception Verification** ("Đối soát ca ghi"): Allows supervisors to review flagged meter readings with OCR crop comparisons.

### Q13: What would break if Verification were removed from navigation?
**Answer**:
- Administrators would lose the ability to review unverified asset candidates, approve/reject meter relationships with attached evidence, and audit engineering proofs.
- However, routine daily meter reading, shift rounds, mobile logging, and GIS map navigation would continue functioning without disruption (V16D backward compatibility guarantee).

### Q14: What would break if List were removed from Map view?
**Answer**:
- Control room operators on laptops or smaller screens would lose the fast tabular checklist view of shift reading progress. On the spatial map, finding which 2 out of 12 meters are overdue requires visual scanning across 6 zones, whereas List provides an immediate sortable summary.

### Q15: Could List functionality be embedded into Thiết bị without losing a workflow?
**Answer**: **NO, not directly.** "Thiết bị" is an inventory of 32 infrastructure machines (substations, cranes, pumps) that do not have shift reading rounds. Embedding shift meter reading checklists into an infrastructure catalog would confuse machine management with shift reading operations. However, a unified asset inventory could offer an attached-meters subview.

### Q16: Could Meter and Asset be displayed in one unified inventory without changing the backend entity model?
**Answer**: **YES.** A unified inventory could present a top-level tabbed or segmented view: `[Thiết bị hạ tầng (32)]` and `[Công tơ đo đếm (12)]`, or a polymorphic table where each row has an `entity_type` badge while maintaining their underlying `Asset` and `Meter` backend models.

### Q17: Which current screens are genuinely unique?
**Answer**:
1. **Bản đồ (Map)**: Unique spatial GIS visual representation of port facilities and meter pins.
2. **Mạng lưới (Network)**: Unique single-line DAG schematic representing electrical and water topology with interactive upstream/downstream tracing.
3. **Kho Thiết bị (Assets)**: Unique master data catalog for physical port machinery and meter binding.
4. **Mobile Capture Flow**: Unique high-contrast field camera and OCR recognition tool.
5. **Lịch ghi / Phân ca (Schedules / Roster)**: Unique scheduling and dispatch management.

### Q18: Which screens are duplicated presentations of the same data?
**Answer**:
1. **`AdminMeters.tsx`** duplicates data presented in **`OperationalListView.tsx`** and **`OperationalScene.tsx`** (both show the same 12 meters).
2. **`AdminAssets.tsx` detail drawer** duplicates information presented in **`AssetContextSurface.tsx`** (both show attached meters, coordinates, and topology).
3. **Search & Utility Filter logic** is duplicated across 4 different components.

### Q19: What navigation structure exists in the actual current source?
**Answer**:
- **Sidebar Rail (`AdminShell.tsx`)**: 5 items (`Bản đồ`, `Lịch ghi`, `Phân ca`, `Báo cáo`, `Nhật ký`).
- **Top Operational Cockpit Header (`OperationalWorkspaceHeader.tsx`)**: 5 modes grouped as:
  - Tác nghiệp: `Bản đồ` (Map), `Mạng lưới` (Network), `Sổ ca ghi` (List).
  - Quản trị: `Kho Thiết bị` (Assets), `Trung tâm Đối soát` (Verification).
- Selecting `Kho Thiết bị` or `Trung tâm Đối soát` keeps the top cockpit visible and marks the sidebar `Bản đồ` item as active.

### Q20: What is the simplest product model supported by CURRENT implementation?
**Answer**: A **2-Pillar Operational Model**:
1. **Operational Workspace (Không gian Vận hành)**: Unified workspace combining Map (GIS), Network (Schematic), and Shift Logbook (List) with a single contextual rail (`UnifiedContextSurface` / `AssetContextSurface`).
2. **Asset & Governance Center (Quản trị & Hạ tầng)**: Unified master catalog for Equipment (Assets) and Instruments (Meters), with an integrated Verification / Review drawer.
