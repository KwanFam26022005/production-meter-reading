# CURRENT TERMINOLOGY AUDIT

## 1. Inventory of Visible Vietnamese Operational Terms

| Visible Vietnamese Term | English Equivalent | Primary Surface | Actual Domain Entity / Concept | Conflict / Ambiguity |
| :--- | :--- | :--- | :--- | :--- |
| **Bản đồ** | Map | Sidebar rail, Top Cockpit | Spatial GIS map of port facilities, presentation zones, and meter markers | None (Clear spatial GIS intent) |
| **Mạng lưới** | Utility Network | Top Cockpit | Single-line schematic DAG diagram of power and water connections | None |
| **Danh sách** | List | Top view toggle in legacy components, map-operations viewMode='list' | Scheduled meters for shift logbook (`OperationalListView.tsx`) | **HIGH AMBIGUITY**: In legacy UI, "Danh sách" was used both for Meter inventory (`AdminMeters`) and Shift logbook. Disambiguated in V16 cockpit as "Sổ ca ghi". |
| **Sổ ca ghi** | Shift Logbook | Top Cockpit | Shift reading checklist of 12 meters (`OperationalListView.tsx`) | Resolves ambiguity with generic "Danh sách" |
| **Thiết bị** | Device / Equipment / Asset | Top Cockpit ("Kho Thiết bị"), Legacy AdminMeters table header ("Danh sách thiết bị") | Both `Asset` (substations, cranes, pumps) and `Meter` (electric/water meters) | **HIGH AMBIGUITY**: Historically, meters were called "Thiết bị" in AdminMeters. In modern V16 architecture, "Thiết bị" refers specifically to `Asset`, while meters are called "Công tơ". |
| **Kho Thiết bị** | Asset Catalog / Inventory | Top Cockpit | Infrastructure asset master table (`AdminAssets.tsx`) | Clear delineation of infrastructure assets |
| **Công tơ** | Meter | App-wide | `Meter` entity (electric or water consumption meter) | None (Authoritative term for meters) |
| **Hạ tầng** | Infrastructure | Top Cockpit, Headers | Physical port installations hosting utilities and meters | None |
| **Đối soát** | Reconciliation / Verification | Sidebar / Top Cockpit ("Trung tâm Đối soát") | Both Data Verification (engineering evidence for assets) and Shift Exception Review (meter reading discrepancies) | **DUAL MEANING**: In port operations, "Đối soát" usually means billing/reading reconciliation. In V16D, it was built for "Asset Verification" (engineering evidence). In V16E, it combines both into two tabs: "Thẩm định hạ tầng" and "Đối soát ca ghi". |
| **Thẩm định** | Verification / Appraisal | AdminVerification tabs and buttons | Engineering review of candidate proposals (`verification_status = VERIFIED`) | Precise term for evidence review |
| **Cần chú ý / Cần kiểm tra** | Review Required | Badges on Map, List, Exceptions | `MeterReading` flagged by operator or AI with low confidence / out of range | Standard operational exception term |
| **Quá hạn** | Overdue | Status badges | Scheduled meter reading that passed round deadline | Standard schedule term |
| **Dữ liệu mô phỏng** | Simulated Data | Header HUD badge | Entities marked `data_origin = 'SIMULATED'` | Required truthfulness badge under V16E-S1 |

---

## 2. Key Terminology Clashes

1. **"Thiết bị" (Device) vs. "Công tơ" (Meter)**:
   - In Vietnamese port terminology, a worker may informally call a meter a "thiết bị đo" (measuring device).
   - However, in engineering and software architecture, **Asset = Thiết bị hạ tầng** (equipment being powered, e.g. Crane RTG, Transformer) while **Meter = Công tơ đo đếm** (instrument recording consumption).
   - *Audit finding*: The system has successfully converged on using `"Công tơ"` for meters and `"Kho Thiết bị"` for infrastructure assets.

2. **"Đối soát" (Reconciliation) vs. "Thẩm định hồ sơ" (Engineering Verification)**:
   - "Đối soát" literally means cross-checking numbers between two parties (e.g. shipper vs port, or shift readings vs baseline).
   - The original V16D module was built as an asset hypothesis verification tool.
   - *Audit finding*: V16E bridged this by grouping both under "Trung tâm Đối soát": Tab 1 for "Thẩm định hạ tầng" (engineering) and Tab 2 for "Đối soát ca ghi" (reading exceptions).
