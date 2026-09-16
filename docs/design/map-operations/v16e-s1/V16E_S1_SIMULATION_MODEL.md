# V16E-S1: Simulated Operational Baseline & Interaction Model

## 1. Product Decision & Philosophy

In maritime enterprise systems and port infrastructure asset management, presenting fictitious or synthetic data as official enterprise reality destroys operator trust. At the same time, developing sophisticated spatial-topology features—such as graph-based utility tracing, power-substation cascade analysis, spatial meter-to-asset bindings, and interactive map navigation—requires a realistic, richly interconnected dataset.

The product leadership and the user have established a definitive guideline for Phase V16E-S1:
- **No Authoritative Real Dataset Exists**: The enterprise has not yet supplied an official, digitally certified engineering asset register or single-line diagram for Tan Thuan Port.
- **Explicit Authorization for Simulation**: The user explicitly authorized a synthetic, realistic operational baseline to support UX exploration, network topology validation, operator logbook rounds, and administrative CRUD workflows.
- **Truthful Labeling**: Every synthetic domain entity must be distinctly marked and isolated via `data_origin = "SIMULATED"` and `scenario_id = "tan-thuan-demo-v1"`.
- **Never Pose as Real Port Data**: The UI prominently but quietly indicates simulation status.

---

## 2. Quiet UI Badge Specification

Rather than alarming users with harsh amber or red warning banners, the simulation indicator adheres to enterprise maritime design principles:
- **Label Text**: `"Dữ liệu mô phỏng"` (Vietnamese: Simulated Data)
- **Tooltip Text**: `"Dữ liệu thiết bị và mạng lưới trong môi trường này được tạo để mô phỏng và không phải dữ liệu hạ tầng thực tế của doanh nghiệp."`
- **Visual Styling**:
  - Background: Soft slate/navy (`#F1F5F9` in light mode, `rgba(30, 41, 59, 0.6)` in dark map HUD).
  - Text: Slate neutral (`#475569` in light mode, `#94A3B8` in dark mode).
  - Border: Subtle slate border (`#E2E8F0` / `rgba(148, 163, 184, 0.2)`).
  - Size: Extra small font (`text-[10px]` or `text-xs`), compact padding (`px-2 py-0.5`).
- **Placement Locations**:
  1. **Scene Header HUD**: Immediately adjacent to the port title and map version indicator.
  2. **Utility Network View**: In the network header strip next to the utility selector tabs.
  3. **Admin Shell**: Persistent badge in the administration topbar and navigation drawer.
  4. **Asset & Meter Context Surfaces**: Tagged next to verification status chips.
  5. **Admin Data Tables**: Designated `"Nguồn dữ liệu"` column with scope filtering.

---

## 3. Scope Isolation & Multi-Tenancy Architecture

To ensure simulation data never contaminates production data, the backend enforces scenario scoping:

1. **Configuration Anchors**:
   ```python
   # backend/app/config.py
   data_mode: str = "SIMULATION"  # "SIMULATION" | "PRODUCTION" | "HYBRID"
   active_scenario: str = "tan-thuan-demo-v1"
   ```

2. **Database Scoping**:
   - Every `Meter`, `Asset`, `MeterAssetRelation`, and `AssetConnection` possesses:
     - `data_origin`: `"SIMULATED"` | `"LEGACY_TEST_DATA"` | `"LEGACY_SIMULATION"` | `"VERIFIED"`
     - `scenario_id`: `"tan-thuan-demo-v1"` | `None`
   - Default queries in `asset_operations.py`, `admin.py`, and `map_operations.py` filter by `scenario_id == settings.active_scenario`.

3. **Legacy Data Quarantine**:
   - 12 legacy meters (`CT-001` through `CT-012`) holding 2,841 historical readings are permanently preserved with `lifecycle_status = "RETIRED"`, `data_origin = "LEGACY_SIMULATION"`, and `is_active = False`.
   - 364 mock assets from early development are tagged `data_origin = "LEGACY_TEST_DATA"`.
   - Administrators can toggle the data scope in the admin console to inspect quarantined assets without polluting the operational map.
