# 12 — Validation Engine & Invariants

## 1. The 17 Mandatory Validation Gates

The validation engine implemented in `frontend/src/components/map-v2/simulation/simulationValidation.ts` programmatically enforces all 17 gates defined in Section 31:

1. **Gate 1: Exactly One Source per Network** — `SIM-EXT-GRID` for Electricity, `SIM-CITY-WATER` for Water.
2. **Gate 2: Active Meter Host Binding** — All 12 active simulation meters have a non-null host node ID.
3. **Gate 3: Electricity Meter Utility Isolation** — Electricity meters attach exclusively to electricity nodes.
4. **Gate 4: Water Meter Utility Isolation** — Water meters attach exclusively to water nodes.
5. **Gate 5: Host Node Existence** — All referenced host nodes exist in `LAYOUT_B2.nodes`.
6. **Gate 6: Referenced Edges Exist** — All network edge IDs exist in `LAYOUT_B2.edges`.
7. **Gate 7: Edge Endpoint Validity** — All edge source and target IDs point to existing nodes.
8. **Gate 8: Upstream Source Reachability** — All 12 active meters trace upward to their designated source root.
9. **Gate 9: Zero Graph Orphans** — No active simulation meter is disconnected from the network graph.
10. **Gate 10: Meter Code Uniqueness** — All active simulation meter codes are unique.
11. **Gate 11: Coordinate Finiteness** — All B2 node coordinates are finite numbers.
12. **Gate 12: B2 Spatial Bounds** — All node coordinates are within `[0, 1536] × [0, 1024]`.
13. **Gate 13: Legacy Meter Isolation** — `CT-001..012` meters never enter active B2 mappings or traces.
14. **Gate 14: Non-Authoritative Invariant** — Simulated topology and coordinates never receive `AUTHORITATIVE` status.
15. **Gate 15: Bijective Host-to-Meter Mapping** — Host-to-meter mappings roundtrip identically without collisions.
16. **Gate 16: Presentation-to-Business Zone Mapping** — Every meter zone maps deterministically to a valid business zone.
17. **Gate 17: Canonical Crossing Preservation** — The unique electricity/water crossing remains at `(740, 520)`.

## 2. Validation Execution Status

All 17 gates pass with 0 errors and 0 warnings during test suite execution.
