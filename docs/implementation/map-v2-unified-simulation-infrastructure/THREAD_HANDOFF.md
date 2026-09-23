# Thread 8B — Thread Handoff Document
## Map V2 Unified Simulation Infrastructure: 25 Canonical Handoff Answers

---

### 1. What was the exact baseline branch and commit?
- **Baseline Branch**: `feature/map-v2-spatial-meter-data-phase-b`
- **Baseline Commit**: `23ed5956d4d5079f0f07ffdd2f4e7e254df756f5`

---

### 2. What branch was created and pushed?
- **Branch Created**: `feature/map-v2-unified-simulation-infrastructure`
- **Remote Target**: `origin feature/map-v2-unified-simulation-infrastructure`

---

### 3. What is the unified simulation domain model and where does it live?
- The model establishes strongly-typed relationships linking networks, nodes, meters, zones, and people under an auditable provenance structure.
- It resides in `frontend/src/components/map-v2/simulation/`:
  - `types.ts`: Type definitions (`UnifiedUtilityNetwork`, `UnifiedSimulationNode`, `UnifiedSimulationMeter`, `UnifiedMapPerson`, `MeterNetworkPathResult`, etc.)
  - `utilityRegistry.ts`: Frozen B2 utility network definitions
  - `meterRegistry.ts`: Active & legacy simulation meter registries
  - `zoneRegistry.ts`: Presentation ↔ business zone mappings
  - `peopleRegistry.ts`: Real stationary vs demo animated personnel models
  - `simulationRelationships.ts`: Bijective lookups and upstream graph path resolution
  - `simulationValidation.ts`: 17 mandatory validation gates
  - `simulationDataAdapter.ts`: Runtime adapter merging static registries with live operational overview data
  - `index.ts`: Barrel export

---

### 4. How are the B2 electricity and water networks registered and identified?
- **Electricity Network**:
  - ID: `SIM-ELECTRICITY-B2`
  - Name: `Mạng điện hạ thế Tân Thuận [MÔ PHỎNG]`
  - Source Node: `SIM-EXT-GRID` (Grid Substation at `(180, 220)`)
  - Nodes: 11 nodes (`SIM-EXT-GRID`, `SIM-EM-SUB-1`, `SIM-EM-SUB-2`, `SIM-EM-BR-1`, `SIM-EM-BR-2`, `SIM-EM-HOST-1..6`)
  - Edges: 10 edges
- **Water Network**:
  - ID: `SIM-WATER-B2`
  - Name: `Mạng cấp nước sinh hoạt & PCCC Tân Thuận [MÔ PHỎNG]`
  - Source Node: `SIM-CITY-WATER` (Municipal Supply at `(740, 880)`)
  - Nodes: 6 nodes (`SIM-CITY-WATER`, `SIM-WM-PUMP-1`, `SIM-WM-HOST-1..4`)
  - Edges: 5 edges

---

### 5. How are the 12 active simulation meters mapped to network host nodes?
Deterministic mapping in `meterRegistry.ts`:
- `SIM-EM-001` ↔ `SIM-EM-HOST-1` (Berth Quay)
- `SIM-EM-002` ↔ `SIM-EM-HOST-2` (Berth Quay)
- `SIM-EM-003` ↔ `SIM-EM-HOST-3` (Berth Quay)
- `SIM-EM-004` ↔ `SIM-EM-HOST-4` (Container Yard)
- `SIM-EM-005` ↔ `SIM-EM-HOST-5` (Container Yard)
- `SIM-EM-006` ↔ `SIM-EM-HOST-6` (Warehouse Kho 1)
- `SIM-EM-007` ↔ `SIM-EM-HOST-4` (Container Branch Sub-station)
- `SIM-EM-008` ↔ `SIM-EM-HOST-5` (Container Branch Sub-station)
- `SIM-WM-001` ↔ `SIM-WM-HOST-1` (Berth Quay Water Inlet)
- `SIM-WM-002` ↔ `SIM-WM-HOST-2` (Container Yard Water Pillar)
- `SIM-WM-003` ↔ `SIM-WM-HOST-3` (Warehouse Kho 2 Fire Main)
- `SIM-WM-004` ↔ `SIM-WM-HOST-4` (Admin Building Main Line)

---

### 6. How are the 12 legacy CT-* meters handled and isolated?
- All 12 `CT-001..012` meters carry `lifecycle_status = RETIRED` and `provenance = LEGACY_SIMULATION`.
- Host Node IDs are strictly `null`.
- They are excluded from `LAYOUT_B2` network graph and cannot resolve upstream paths (`resolveMeterNetworkPath` returns `null`).
- Inspector displays explicit historical isolation disclosure (`Dữ liệu kế thừa (Đã ngừng hoạt động)`).
- Validated via Gate 13 in `simulationValidation.ts`.

---

### 7. What is the exact data provenance assigned to each entity type?
- Active B2 Networks: `SIMULATED`
- B2 Network Nodes & Edges: `SIMULATED`
- Active Simulation Meters (`SIM-EM-*`, `SIM-WM-*`): `SIMULATED`
- Legacy Meters (`CT-*`): `LEGACY_SIMULATION`
- Real Zone Assignees: `AUTHORITATIVE` (Stationary zone anchor derived from duty roster)
- Demo Animated Personnel: `SIMULATED` (Simulated yard path)
- Presentation Zones & Basemap Buildings: `AUTHORITATIVE` (Canonical survey CAD)

---

### 8. Are any simulated meters or networks marked as field-verified or authoritative?
- **NO.** Absolute zero simulated entities are marked as field-verified or authoritative.
- Every simulation meter has `verifiedPhysicalCoordinate: null`.
- Gate 14 programmatically blocks any simulation meter or network from possessing `AUTHORITATIVE` provenance.

---

### 9. How is the physical crossing at (740, 520) preserved?
- The electricity edge between `SIM-EM-SUB-2` `(740, 360)` and `SIM-EM-BR-2` `(740, 580)` crosses the water line between `SIM-WM-HOST-1` `(740, 440)` and Primary Booster Pump `SIM-WM-PUMP-1` `(740, 720)` at exactly `X: 740, Y: 520`.
- This coordinate is verified in Gate 17 and by `scripts/verify_b2_freeze_hash.mjs`.

---

### 10. How does cross-layer selection work from meter to network host?
- Selecting a meter (via canvas click, search bar, or inspector) updates `selectedMeterCode` in `MapV2Workspace`.
- `MapV2UtilityLayer` detects the active meter's host node and renders:
  - An amber pulsing focus ring around the host node (`strokeWidth: 4.5px`);
  - A contextual label badge indicating the hosted meter code.

---

### 11. How does cross-layer selection work from network host to meter inspector?
- Clicking a utility host node on `MapV2UtilityLayer` triggers `onSelectMeterHost(nodeId, meterCode)`.
- `MapV2Workspace` intercepts the event and opens `MapV2InspectionPanel` with the full operational record for that meter.
- The corresponding meter pin is highlighted on `MapV2MeterLayer`.

---

### 12. How does tracing to source work from a meter?
- In `MapV2InspectionPanel`, the operator clicks the **"Truy vết tuyến nguồn"** button.
- This invokes `onTraceMeter(meterCode)`.
- `MapV2Workspace` automatically ensures the appropriate utility network layer is enabled and passes `tracedMeterCode` to `MapV2UtilityLayer`.
- The graph engine traces edges upward to `SIM-EXT-GRID` or `SIM-CITY-WATER`, rendering a distinct highlighted path.
- Clicking **"Hủy truy vết"** restores normal rendering.

---

### 13. How was the Layer Manager reorganized?
Reorganized into 4 canonical operational groups in `MapV2Layers.tsx`:
1. **LỚP TÁC NGHIỆP**: Boundaries, Meters, Real Assignees, Anomaly Alerts.
2. **MẠNG KỸ THUẬT**: `⚡ Mạng điện [MÔ PHỎNG]`, `💧 Mạng nước [MÔ PHỎNG]`.
3. **HOẠT HỌA**: `Nhân sự di chuyển [DEMO]`.
4. **BẢN ĐỒ NỀN**: Port Infrastructure Buildings, Gates & Traffic Routes.

---

### 14. How are real zone assignees distinguished from demo animated personnel?
- **Real Assignees** (`Người phụ trách`):
  - Positioned stationary at `operatorAnchorCanonical`;
  - Provenance derived from administrative shift roster;
  - Non-GPS, zero movement animation;
  - Default layer state: ON.
- **Demo Personnel** (`Nhân sự di chuyển [DEMO]`):
  - Animated along spline waypoints;
  - Purely cosmetic simulation;
  - Explicitly tagged `[DEMO]`;
  - Default layer state: OFF.

---

### 15. What are the 17 validation gates and what were their results?
All 17 gates implemented in `simulationValidation.ts` executed and returned **100% PASS (0 Errors, 0 Warnings)**:
- Gate 1: Network source uniqueness
- Gate 2: Active meter host binding
- Gate 3: Electricity utility isolation
- Gate 4: Water utility isolation
- Gate 5: Host node existence
- Gate 6: Referenced edges exist
- Gate 7: Edge endpoint validity
- Gate 8: Upstream source reachability
- Gate 9: Zero graph orphans
- Gate 10: Meter code uniqueness
- Gate 11: Coordinate finiteness
- Gate 12: B2 spatial bounds `[0..1536, 0..1024]`
- Gate 13: Legacy `CT-*` isolation
- Gate 14: Non-authoritative invariant
- Gate 15: Bijective host-meter mapping
- Gate 16: Presentation-to-business zone mapping
- Gate 17: Canonical crossing preservation at `(740, 520)`

---

### 16. How many unit tests were added and what were the total test results?
- **Added**: 30 new unit tests in `frontend/tests/mapV2UnifiedSimulationInfrastructure.test.ts`.
- **Operations Test Suite**: 384 passed / 0 failed (7 suites).
- **User Portal Test Suite**: 74 passed / 0 failed.
- **Spatial Audit & Seed Pytests**: 26 passed / 0 failed.
- **Total Automated Tests**: 484+ tests passing.

---

### 17. Did production builds succeed for both operations and user portals?
- **Operations Build** (`npm run build:operations`): Exit code 0 (1728 modules transformed, built in 5.04s).
- **User Build** (`npm run build:user`): Exit code 0 (1610 modules transformed, built in 2.38s).

---

### 18. Did bundle isolation pass?
- **YES.** Verified via `node scripts/verify_bundle_separation.mjs`.
- User bundle (`user-B9pd64-1.js`, 286.51 KB) is completely clean of Admin/Operations code.
- Operations bundle (`operations-r7EyCc-S.js`, 926.54 KB) is completely clean of mobile camera UI.

---

### 19. Did the B2 freeze hash remain unchanged?
- **YES.** Verified via `node scripts/verify_b2_freeze_hash.mjs`:
  - `SHA256: 7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`
  - Nodes: 17, Edges: 15.

---

### 20. What 13 screenshots were captured and where are they stored?
Stored in `docs/implementation/map-v2-unified-simulation-infrastructure/screenshots/`:
1. `01_unified_default_1920x1080.png`
2. `02_unified_default_1440x900.png`
3. `03_layer_manager_reorganized.png`
4. `04_electricity_network.png`
5. `05_water_network.png`
6. `06_both_networks.png`
7. `07_meter_selected_host_highlight.png`
8. `08_meter_trace_to_source.png`
9. `09_host_to_meter_inspector.png`
10. `10_real_assignee_layer.png`
11. `11_demo_employee_layer.png`
12. `12_technical_light.png`
13. `13_neon_network.png`

---

### 21. What visual direction and design tokens were applied?
- **Maritime Operational Minimalism** via `frontend/DESIGN_DNA.md` and `saigon-port-ui`.
- Default: Technical Light mode.
- Electricity: Amber `#FFB703` (Stroke width 2.5px).
- Water: Digital Blue `#0068FF` (Stroke width 2.5px).
- Restrained Neon glow: `stdDeviation="2.2"`.
- Accessible hit targets: 44px min.

---

### 22. What is the current replacement readiness status of Map V2 relative to Map V1?
- Map V2 surpasses Map V1 in geometric precision, vector rendering, inspector docking, and network topology.
- Map V1 remains temporarily only for backwards compatibility until certified field survey coordinates are ingested.

---

### 23. What skills were applied and what were their compliance statuses?
- `saigon-port-ui`: `APPLIED` / `VERIFIED`
- `frontend/DESIGN_DNA.md`: `APPLIED` / `VERIFIED`
- `ui-ux-pro-max`: `APPLIED` / `VERIFIED` (SKILL.md top-level only)
- `banner-design`, `brand`, `design`, `slides`: `NOT_APPLICABLE` (Skipped)

---

### 24. What are the known limitations or intentional boundaries of this implementation?
- B2 network is a frozen simulation layout, not an as-built CAD blueprint.
- Meters `SIM-EM-007` and `SIM-EM-008` share multi-meter cabinet junction points with `SIM-EM-HOST-4` and `SIM-EM-HOST-5`.
- Personnel positions are stationary zone anchors and not real-time GNSS fixes.

---

### 25. What are the recommended next steps for Thread 8C or future phases?
1. Ingest real certified RTK GNSS field coordinates for physical meters when survey completes;
2. Interface real IoT gateway telemetry into the B2 utility network nodes;
3. Deprecate and completely decommission Map V1 once operations team signs off.
