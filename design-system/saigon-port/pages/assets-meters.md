# Page Override: Assets & Meters Workspace (Thiết bị & Công tơ)
**Target Workspace:** `AdminDevicesWorkspace.tsx`, `AdminAssets.tsx`, `AdminMeters.tsx`  
**Governing Authority:** `design-system/saigon-port/MASTER.md`, `docs/contracts/reading-schedule.md`, `docs/contracts/reporting.md`

---

## 1. Mental Model: Technical Asset Registry & Configuration Readiness

The Devices workspace manages physical port infrastructure assets (substations, quay cranes, water points) and utility measurement instruments (electricity meters, water meters). It is a **Technical Registry & Readiness Hub**, not an unformatted administrative spreadsheet.

Primary operational objectives:
1. Guarantee clear visual hierarchy between port physical assets and attached utility meters.
2. Render technical measurement metadata (`utility_type`, `measurement_unit`, `register_semantics`) with absolute accuracy.
3. Truthfully surface incomplete or unconfigured meters (`UNKNOWN` unit) to prevent reporting distortion.

---

## 2. Layout & Tab Navigation

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header: THIẾT BỊ · [Hạ tầng (Assets)]  |  [Công tơ (Meters)]           │
├────────────────────────────────────────────────────────────────────────┤
│ Filter Toolbar: Search · Status Filter · Type Filter · Refresh         │
├────────────────────────────────────────────────────────────────────────┤
│ Primary Table with Structured Columns:                                 │
│ [Mã]  [Tên thiết bị]  [Vị trí]  [Loại tiện ích]  [Đơn vị & Kiểu]  ...  │
├────────────────────────────────────────────────────────────────────────┤
│ Detail Drawer (Progressive Disclosure on Click):                       │
│ • Full technical specifications & installation parameters              │
│ • Attached parent asset / child meters relationship tree               │
│ • Latest confirmed reading & reading history link                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Meter Metadata Truthfulness & Configuration Readiness

### 3.1 Strict Truthfulness Rules
- **No Guessing / Inferring Units:** If `measurement_unit` is `UNKNOWN` or null, it must remain explicitly labeled as `Chưa cấu hình đơn vị` (`UNKNOWN`).
- **Never infer KWH or M3 for unverified meters.** Guessing units corrupts downstream consumption billing and energy baselines.
- **Visual Encoding:**
  - `KWH`: Subtle blue pill `#EFF6FF`, text `#1E40AF` (`kWh · Điện năng`).
  - `M3`: Subtle cyan pill `#ECFEFF`, text `#0E7490` (`m³ · Nước`).
  - `UNKNOWN`: Amber warning pill `#FFF4DF`, border `#FCD89C`, text `#A86200` (`Chưa cấu hình đơn vị`).

### 3.2 Register Semantics Representation
- `CUMULATIVE` (Lũy kế): Standard baseline reading (monotonically increasing counter).
- `INTERVAL` (Khoảng): Periodic pulse count.
- `UNKNOWN`: Muted warning indicator alerting supervisor that differential consumption calculations are blocked.

---

## 4. Reducing Spreadsheet Density & Form Ergonomics

### 4.1 Master Table Composition
- Row height: 44px–48px (Comfortable density for technical data inspection).
- Column width allocation:
  - Code (`font-mono font-bold text-brand`): 12%
  - Name & Sub-description: 22%
  - Location & Operational Zone: 18%
  - Utility & Measurement Unit: 16%
  - Lifecycle Status: 12%
  - Latest Reading: 14%
  - Actions menu `[•••]`: 6%

### 4.2 Progressive Disclosure Drawer
- Instead of forcing all 25+ database attributes into a horizontal scroll table, secondary metadata is disclosed in a right-hand flyout drawer (`AdminMeterDrawer` / `AdminAssetDrawer`).
- Drawer structure:
  1. *Header:* Primary Code, Equipment Type, Status Badge.
  2. *Section 1 - Technical Specs:* Serial number, CT ratio, pulse multiplier, register semantics.
  3. *Section 2 - Network & Topology:* Presentation zone, GIS coordinates, feeder/line ID.
  4. *Section 3 - Maintenance & History:* Installation date, last inspection timestamp, operator.
