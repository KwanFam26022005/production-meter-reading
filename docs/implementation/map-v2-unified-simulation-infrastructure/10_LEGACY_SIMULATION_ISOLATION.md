# 10 — Legacy Simulation Isolation

## 1. Audit Context of CT-001 Through CT-012

In Thread 8A, an audit of the SQLite database revealed 24 meter records, 12 of which carried legacy codes `CT-001` through `CT-012`. These records were generated during early development phases with non-canonical coordinates and unverified zone associations.

## 2. Isolation Guarantees

In Thread 8B, the unified simulation infrastructure strictly isolates these 12 legacy records:

1. **Topology Isolation**:
   - `getMeterHostNodeId("CT-001")` returns `null`.
   - `resolveMeterNetworkPath("CT-001")` returns `null`.
   - None of the 17 nodes in `LAYOUT_B2` reference any `CT-*` meter.
2. **Lifecycle Segregation**:
   - `lifecycle_status = RETIRED`
   - `data_origin = LEGACY_SIMULATION`
   - `verifiedPhysicalCoordinate = null`
3. **Inspector Disclosure**:
   - When selected, the inspector panel shows:
     - `Dữ liệu kế thừa (Đã ngừng hoạt động)`
     - A clear explanation that the meter is not part of the active B2 digital twin network.
     - Tracing buttons are hidden or disabled.
4. **Validation Gate 13**:
   - The validation engine (`simulationValidation.ts`) programmatically tests every legacy meter code to verify that no legacy meter ever attaches to an active B2 host node or resolves a trace path.
