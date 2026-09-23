# 05 — Simulation Meter Topology Registry

## 1. Active Simulation Meters (12 Records)

The 12 active simulation meters audited from SQLite in Thread 8A are deterministically mapped to the B2 topology:

| Meter Code | Utility | Host Node ID | Presentation Zone | Business Zone | Status | Lifecycle |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SIM-EM-001` | ELECTRICITY | `SIM-EM-HOST-1` | `ZONE_QUAY` | `zone-berth` | Active | ACTIVE |
| `SIM-EM-002` | ELECTRICITY | `SIM-EM-HOST-2` | `ZONE_QUAY` | `zone-berth` | Active | ACTIVE |
| `SIM-EM-003` | ELECTRICITY | `SIM-EM-HOST-3` | `ZONE_QUAY` | `zone-berth` | Active | ACTIVE |
| `SIM-EM-004` | ELECTRICITY | `SIM-EM-HOST-4` | `ZONE_CONTAINER` | `zone-container` | Active | ACTIVE |
| `SIM-EM-005` | ELECTRICITY | `SIM-EM-HOST-5` | `ZONE_CONTAINER` | `zone-container` | Active | ACTIVE |
| `SIM-EM-006` | ELECTRICITY | `SIM-EM-HOST-6` | `BLDG_KHO_1` | `zone-warehouse` | Active | ACTIVE |
| `SIM-EM-007` | ELECTRICITY | `SIM-EM-HOST-4` | `ZONE_CONTAINER` | `zone-container` | Active | ACTIVE |
| `SIM-EM-008` | ELECTRICITY | `SIM-EM-HOST-5` | `ZONE_CONTAINER` | `zone-container` | Active | ACTIVE |
| `SIM-WM-001` | WATER | `SIM-WM-HOST-1` | `ZONE_QUAY` | `zone-berth` | Active | ACTIVE |
| `SIM-WM-002` | WATER | `SIM-WM-HOST-2` | `ZONE_CONTAINER` | `zone-container` | Active | ACTIVE |
| `SIM-WM-003` | WATER | `SIM-WM-HOST-3` | `BLDG_KHO_2` | `zone-warehouse` | Active | ACTIVE |
| `SIM-WM-004` | WATER | `SIM-WM-HOST-4` | `ZONE_ADMIN` | `zone-technical` | Active | ACTIVE |

*Note: For multi-meter distribution cabinets, `SIM-EM-007` shares branch cabinet with `SIM-EM-HOST-4`, and `SIM-EM-008` shares branch cabinet with `SIM-EM-HOST-5` as defined in the layout configuration.*

## 2. Legacy Simulation Meters (12 Records)

The 12 legacy `CT-001` through `CT-012` meters are preserved as historical audit records:
- **Lifecycle Status**: `RETIRED`
- **Data Origin**: `LEGACY_SIMULATION`
- **Host Node ID**: `null` (Strictly detached from active B2 utility graph)
- **Verified Physical Coordinates**: `null`
- **UI Treatment**: Highlighted with amber badge `Kế thừa (Đã ngừng)` in inspector. Tracing is disabled with informational tooltips explaining retirement.
