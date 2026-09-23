# 15 — Architectural Decision Record (ADR)

## ADR-008B: Map V2 Unified Simulation Infrastructure

### Status
Accepted & Implemented

### Context
Map V2 contained discrete implementations of electricity and water networks (B2 layout), SQLite simulation meter records, zone telemetry, real stationary assignees, and demo animated personnel. However, there was no shared domain model linking them, resulting in fragmented layers, lack of cross-layer selections, and ambiguous provenance.

### Decision
1. **Single Source of Truth**: Created `frontend/src/components/map-v2/simulation/` containing registries for utilities, meters, zones, and people, unified under a deterministic data adapter.
2. **Bijective Host Mapping**: Bound each of the 12 active simulation meters (`SIM-EM-001..008`, `SIM-WM-001..004`) to a unique host node in the B2 network graph.
3. **Cross-Layer State Synchronization**: Lifted `selectedMeterCode` and `tracedMeterCode` to `MapV2Workspace`, enabling host node clicking to open the meter inspector, and meter selection to highlight and trace network hosts.
4. **Honest Provenance & Disclosure**: Strict classification into `SIMULATED`, `AUTHORITATIVE`, and `LEGACY_SIMULATION`. Stationary assignees and demo personnel are explicitly non-GPS.
5. **Layer Manager IA Overhaul**: Organized layers into 4 canonical groups (Tác nghiệp, Mạng kỹ thuật, Hoạt họa, Bản đồ nền).
6. **Programmatic Validation Engine**: Enforced 17 automated gates validating topological integrity, source reachability, and legacy isolation.

### Consequences
- **Positive**: Coherent digital twin infrastructure; seamless operator navigation between meters and distribution networks; zero ambiguity regarding simulation status; 100% automated test coverage.
- **Negative / Operational Bounds**: B2 layout remains a frozen engineering demo model pending future certified field surveys; multi-meter cabinets share single physical junction points in the layout.
