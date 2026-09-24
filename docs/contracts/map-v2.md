# Domain Contract — Map V2 Spatial & Digital Twin Truth

## Status
`FROZEN_AUTHORITATIVE`

## Origin / Owner Thread
Map V2 Phase A / 8A / 8B Frozen Work
Historical handoffs:
- [`docs/implementation/map-v2-spatial-meter-data-phase-b/THREAD_HANDOFF.md`](../implementation/map-v2-spatial-meter-data-phase-b/THREAD_HANDOFF.md)
- [`docs/implementation/map-v2-unified-simulation-infrastructure/THREAD_HANDOFF.md`](../implementation/map-v2-unified-simulation-infrastructure/THREAD_HANDOFF.md)

## Authoritative Entities
- `LAYOUT_B2` ([`utilityDemoLayout.ts`](../../frontend/src/components/map-v2/utilityDemoLayout.ts)): Canonical frozen B2 utility network topology.
- Simulation Domain Models ([`simulation/types.ts`](../../frontend/src/components/map-v2/simulation/types.ts)): `UnifiedUtilityNetwork`, `UnifiedSimulationNode`, `UnifiedSimulationMeter`, `UnifiedMapPerson`.
- [`ZoneAssignment`](../../backend/app/models.py): Legacy/default map zone ownership anchor.

## Frozen Truth
1. **B2 Frozen Geometry & Verification**:
   - Protected B2 configuration SHA-256 hash:
     `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`
   - Verified via [`scripts/verify_b2_freeze_hash.mjs`](../../scripts/verify_b2_freeze_hash.mjs) and gate `map-b2-freeze` in [`harness/gates.yml`](../../harness/gates.yml).
   - Exit code alone is insufficient; verification must compare stdout hash with the expected value.
   - Topology metrics: 17 nodes, 15 edges, with canonical crossing preserved at `(740, 520)`.
2. **Simulation Provenance Matrix**:
   - B2 Utility Networks (`SIM-ELECTRICITY-B2`, `SIM-WATER-B2`): `SIMULATED`
   - B2 Network Nodes & Edges: `SIMULATED`
   - Active Simulation Meters (`SIM-EM-*`, `SIM-WM-*`): `SIMULATED` (`verifiedPhysicalCoordinate: null`)
   - Legacy Meters (`CT-001..012`): `LEGACY_SIMULATION` (`lifecycle_status: RETIRED`, `hostNodeId: null`)
   - Real Zone Assignees: `AUTHORITATIVE` (stationary duty roster anchor)
   - Demo Animated Personnel: `SIMULATED` (purely cosmetic spline animation, default layer OFF)
   - Presentation Zones & Basemap Buildings: `AUTHORITATIVE` (canonical survey CAD, bounds $[0, 1536] \times [0, 1024]$)
3. **Legacy Meter Isolation**:
   - All 12 legacy `CT-*` meters are retired and isolated from active network topology.
   - Cannot resolve upstream network paths (`resolveMeterNetworkPath` returns `null`).
   - Inspector renders explicit historical isolation disclosure.
4. **Spatial Truth Limits**:
   - Canvas coordinate space is bounded to $[0, 1536] \times [0, 1024]$.
   - Stored/display coordinates are not certified field-verified physical coordinates (`verified: false` in [`config/map_v2_meter_coordinate_seed.json`](../../config/map_v2_meter_coordinate_seed.json)).
   - No GPS / GNSS live tracking exists. Personnel anchors are stationary visual indicators.
5. **Personnel & Staffing Boundaries**:
   - Map does not own or invent operational staffing semantics.
   - Legacy `ZoneAssignment` provides default map zone ownership anchors, NOT Thread 9B `OperationalAssignment`.
   - Simulated animations are not live tracking fixes.
6. **Map V1 Relationship**:
   - Map V2 is the active development and intended future replacement path.
   - Map V1 remains for backwards compatibility only; no new authoritative dependencies may be added to V1.

## Required Invariants
- B2 geometry configuration hash must match `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`.
- Simulated networks, nodes, and meters must never receive `AUTHORITATIVE` or field-verified status.
- Legacy `CT-*` meters must remain isolated with `hostNodeId: null` and `RETIRED` lifecycle status.
- Personnel positions must not be claimed as real-time GPS fixes.

## Legacy / Compatibility Behavior
- Legacy `CT-*` meters remain inspectable under historical isolation disclosure.
- Map V1 remains available as a fallback view.

## Forbidden Reinterpretations
- Never upgrade simulated objects to `AUTHORITATIVE`, `FIELD_VERIFIED`, or `AS_BUILT` without certified survey evidence.
- Never claim live GPS/GNSS tracking for stationary or animated personnel.
- Never treat legacy `ZoneAssignment` as Thread 9B `OperationalAssignment`.
- Never connect legacy `CT-*` meters into active B2 utility topology.

## Known Limitations / Unresolved Items
- Ingestion of certified physical RTK-GNSS coordinates from Port Engineering CAD remains future work.
- Authoritative measurement unit schema migration (BD-02) remains deferred.
- Live IoT gateway telemetry integration into B2 utility nodes remains future work.

## Source Evidence
- Frozen B2 layout: [`frontend/src/components/map-v2/utilityDemoLayout.ts`](../../frontend/src/components/map-v2/utilityDemoLayout.ts)
- Verification script: [`scripts/verify_b2_freeze_hash.mjs`](../../scripts/verify_b2_freeze_hash.mjs)
- Simulation models & validation: [`frontend/src/components/map-v2/simulation/`](../../frontend/src/components/map-v2/simulation/)
- Spatial tools & tests: [`scripts/audit_meter_spatial_data.py`](../../scripts/audit_meter_spatial_data.py), [`scripts/seed_meter_spatial_data.py`](../../scripts/seed_meter_spatial_data.py), [`tests/test_meter_spatial_audit_and_seed.py`](../../tests/test_meter_spatial_audit_and_seed.py)

## Change Protocol
Modifications to B2 geometry or simulation registry require explicit authorization, expected hash update in [`harness/gates.yml`](../../harness/gates.yml), and verification via gate `map-b2-freeze` ([`map-b2-hash`](../../harness/commands.yml)) and `unified-simulation`.
