# 14 — Visual Acceptance Matrix

All 13 required visual acceptance captures have been generated at standard resolutions using Playwright on headless Microsoft Edge:

| ID | Filename | Resolution | Description & Visual Criteria Checked | Status |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `01_unified_default_1920x1080.png` | 1920 × 1080 | Default Map V2 workspace; Technical Light; zones, meters, assignees visible; networks default off. | **VERIFIED** |
| **02** | `02_unified_default_1440x900.png` | 1440 × 900 | Laptop default view; responsive container and clean toolbar scaling. | **VERIFIED** |
| **03** | `03_layer_manager_reorganized.png` | 1920 × 1080 | Layer Manager popover displaying 4 groups: Tác nghiệp, Mạng kỹ thuật, Hoạt họa, Bản đồ nền. | **VERIFIED** |
| **04** | `04_electricity_network.png` | 1920 × 1080 | Amber `#FFB703` electricity network lines, substation, switchgears, and meter hosts visible. | **VERIFIED** |
| **05** | `05_water_network.png` | 1920 × 1080 | Digital Blue `#0068FF` water network lines, municipal inlet, booster pump, and hosts visible. | **VERIFIED** |
| **06** | `06_both_networks.png` | 1920 × 1080 | Both networks active; canonical crossing at `(740, 520)` clearly rendered. | **VERIFIED** |
| **07** | `07_meter_selected_host_highlight.png` | 1920 × 1080 | Meter selected; corresponding host node highlighted with amber pulsing focus ring. | **VERIFIED** |
| **08** | `08_meter_trace_to_source.png` | 1920 × 1080 | Upstream trace path active from meter host to `SIM-EXT-GRID` feeder source. | **VERIFIED** |
| **09** | `09_host_to_meter_inspector.png` | 1920 × 1080 | Host node clicked on network layer, immediately opening meter inspector panel. | **VERIFIED** |
| **10** | `10_real_assignee_layer.png` | 1920 × 1080 | Real stationary operator marker selected, showing duty assignment card without GPS claim. | **VERIFIED** |
| **11** | `11_demo_employee_layer.png` | 1920 × 1080 | Demo animated personnel layer active (`[DEMO]`), showing moving personnel dots along yard paths. | **VERIFIED** |
| **12** | `12_technical_light.png` | 1920 × 1080 | Clean Maritime Operational Minimalism default light mode verified across all surfaces. | **VERIFIED** |
| **13** | `13_neon_network.png` | 1920 × 1080 | Neon Digital Twin mode enabled, showing restrained glow (`stdDeviation="2.2"`) on utility lines. | **VERIFIED** |

All images are saved in `docs/implementation/map-v2-unified-simulation-infrastructure/screenshots/`.
