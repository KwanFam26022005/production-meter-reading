# V16E-S1-R2 — Deterministic Contract & Runtime-Truth Audit

## 1. Authoritative Baseline
- **Scenario**: `tan-thuan-demo-v1`
- **Active Map Version**: `tan-thuan-sim-v1-5zone` (PUBLISHED)
- **Operational Date**: `2026-09-16`
- **Operational Shift**: `Ca 1 (06:00)`
- **Active Round ID**: `af8b6a60-80d9-596b-8db0-9c83d372c4bd`
- **Active Round Status**: `OPEN` (0/12 completed, 12/12 DUE)

---

## 2. 12 Simulated Meters: DB → API → UI Contract Table

| Meter Code | Zone ID (DB / Map) | Zone Name (Vietnamese API) | Utility Type | Reading Unit | Round State |
|:---|:---|:---|:---|:---|:---|
| **SIM-EM-001** | `pres-technical` | Khu kỹ thuật / Dịch vụ | ELECTRICITY | kWh | `DUE` |
| **SIM-EM-002** | `pres-berth` | Cầu cảng | ELECTRICITY | kWh | `DUE` |
| **SIM-EM-003** | `pres-container-west` | Bãi container phía Tây | ELECTRICITY | kWh | `DUE` |
| **SIM-EM-004** | `pres-container-center` | Bãi container trung tâm | ELECTRICITY | kWh | `DUE` |
| **SIM-EM-005** | `pres-cfs-east` | Kho / CFS phía Đông | ELECTRICITY | kWh | `DUE` |
| **SIM-EM-006** | `pres-technical` | Khu kỹ thuật / Dịch vụ | ELECTRICITY | kWh | `DUE` |
| **SIM-EM-007** | `pres-container-west` | Bãi container phía Tây | ELECTRICITY | kWh | `DUE` |
| **SIM-EM-008** | `pres-container-center` | Bãi container trung tâm | ELECTRICITY | kWh | `DUE` |
| **SIM-WM-001** | `pres-technical` | Khu kỹ thuật / Dịch vụ | WATER | m³ | `DUE` |
| **SIM-WM-002** | `pres-berth` | Cầu cảng | WATER | m³ | `DUE` |
| **SIM-WM-003** | `pres-cfs-east` | Kho / CFS phía Đông | WATER | m³ | `DUE` |
| **SIM-WM-004** | `pres-technical` | Khu kỹ thuật / Dịch vụ | WATER | m³ | `DUE` |

### Consistency Assertions
1. **Zone Resolution**: 100% of meters resolve to their presentation zone display name via `map_version_zones` lookup. Zero fallback or raw key labels.
2. **Utility Type & Units**: All 8 `SIM-EM-*` meters carry `utility_type="ELECTRICITY"` and display `kWh`. All 4 `SIM-WM-*` meters carry `utility_type="WATER"` and display `m³`.
3. **Round Independence**: The operational round starts at `0/12 hoàn tất` with `0.0%` completion and zero confirmed slots. Historical readings (4,032 records) remain strictly in the 14-day history window and do NOT leak into today's active round completion state.

---

## 3. Network Topology Contract

### Electricity Network
- **Nodes**: 25 assets (Root: `SIM-EXT-GRID` -> Substations -> Transformers -> Switchboards -> Feeders -> Cranes/Reefers/Compressors)
- **Edges**: 24 directional supply connections (`SUPPLIES`)
- **Isolation**: Strictly 0 water-exclusive assets (e.g. `SIM-CITY-WATER`, `SIM-WIN-01`, `SIM-WJ-01` are excluded).

### Water Network
- **Nodes**: 8 assets (Root: `SIM-CITY-WATER` -> Intake -> Junction -> Pumps / Hydrants / Water Points)
- **Edges**: 7 directional supply connections (`SUPPLIES`)
- **Isolation**: Strictly 0 electricity-exclusive assets (e.g. `SIM-EXT-GRID`, `SIM-SS-01`, `SIM-TR-01` are excluded).

### Selection Clearing Invariant
- Switching between Electricity and Water tabs automatically clears `selectedNode` and `selectedEdge` states, preventing cross-utility state ghosting.
