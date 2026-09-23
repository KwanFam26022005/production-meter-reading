# Map V2 Business & Information Density Audit — 09. Technical Network Boundaries

## 1. Technical Network Layer Overview

The utility network on Map V2 is a SIMULATED demo topology.

Source files:
- `frontend/src/components/map-v2/utilityDemoLayout.ts` — Network node and edge definitions
- `frontend/src/components/map-v2/utilityNetworkGraph.ts` — Graph traversal logic
- `frontend/src/components/map-v2/utilityNetworkStateMachine.ts` — Activation state machine
- `frontend/src/components/map-v2/MapV2UtilityLayer.tsx` — SVG rendering

## 2. Data Provenance

| Aspect | Current State | Evidence |
| :--- | :--- | :--- |
| Network topology | SIMULATED — demo layout, not field-surveyed | utilityDemoLayout.ts |
| Node positions | Approximated on 1536×1024 canvas | utilityDemoLayout.ts |
| Line routing | Simplified Manhattan routing, not as-built | utilityNetworkGraph.ts |
| Meter points | Simulated with fake codes (SIM-*) | utilityDemoLayout.ts |
| Electricity vs Water separation | Correctly color-coded (Amber vs Blue) | MapV2UtilityLayer.tsx |

### Disclosure
- Technical mode displays 'Mạng mô phỏng (Nhấp nguồn để mở)' label
- This disclosure is visible on the technical mode screenshot
- The simulation is clearly marked as non-production topology

## 3. Technical vs Operational Mode Boundary

| Behavior | Operational Mode | Technical Mode |
| :--- | :--- | :--- |
| Employee markers | Visible (if layer ON) | HIDDEN |
| Zone anchors/hotspots | Interactive (click → card) | All geometry visible |
| Utility network | Only if utility mode ≠ 'off' | Only if utility mode ≠ 'off' |
| Geometry inspector | Not available | Full coordinate inspection |
| Neon theme | Available | Available |

### Key Finding: Employee Suppression in Technical Mode
When switching to Technical mode, ALL employee markers are hidden.
This is intentional to keep the technical network view clean.

**Risk**: A user in Technical mode might incorrectly assume no personnel are assigned to zones. The UI provides NO indication that employees exist but are hidden.

**Recommendation**: Consider a subtle badge or indicator: 'Nhân sự ẩn trong chế độ kiểm tra' (Personnel hidden in inspection mode).

## 4. Asset Classification

### Verified vs Unverified
- All network topology on Map V2 is SIMULATED
- No field-verified electrical/water infrastructure data is displayed
- The B2 frozen hash protects the canonical geometry (zone polygons), NOT the utility network

### What's Protected
- Zone polygon vertices (frozen B2 hash)
- Zone anchor positions
- Map base image

### What's Simulated
- Utility network nodes and edges
- Meter positions within utility network
- Network activation animations
