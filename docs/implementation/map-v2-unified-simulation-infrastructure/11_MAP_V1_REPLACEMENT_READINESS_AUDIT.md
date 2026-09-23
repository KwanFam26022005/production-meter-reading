# 11 — Map V1 Replacement Readiness Audit

## 1. Product Directive

The engineering mandate for Saigon Port is unambiguous:
**MAP V2 WILL REPLACE MAP V1.**
Map V1 is legacy software that will be completely decommissioned once Map V2 achieves full feature, operational, and data parity.

## 2. Feature & Architectural Parity Matrix

| Capability | Map V1 Status | Map V2 Status (Thread 8B) | Parity Evaluation |
| :--- | :--- | :--- | :--- |
| **Port Geometry** | 1915 × 821 raster basemap | 1536 × 1024 vector SVG basemap + zones | **V2 Superior** (Vector crispness, responsive scaling) |
| **Meter Visualization** | Simple circle dots | Styled pins with status badges & focus rings | **V2 Superior** (Stateful, accessible, clear contrast) |
| **Operational Telemetry** | Basic popup summary | Full inspector dock with anomaly badges & rounds | **V2 Superior** (Single contextual surface, responsive) |
| **Utility Infrastructure** | None (No network) | Frozen B2 Electricity & Water graph topology | **V2 Superior** (Expand, trace, cross-selection) |
| **Cross-Layer Trace** | None | Meter ↔ Host bi-directional highlight & trace | **V2 Only** (New unified simulation capability) |
| **Duty Roster Integration**| Static markers | Stationary assignees + demo movement paths | **V2 Superior** (Truthful disclosure, distinct layers) |
| **Visual Themes** | Single dark mode | Technical Light (Default) + Neon Digital Twin | **V2 Superior** (Maritime Operational Minimalism) |
| **Validation Architecture**| None | 17 programmatic validation gates | **V2 Only** (Automated domain verification) |

## 3. Decommissioning Preconditions

Before Map V1 can be permanently removed from the repository:
1. Field survey certification of physical meter coordinates (migrating `SIMULATED` to `AUTHORITATIVE`);
2. Integration with live IoT telemetry gateways (replacing simulated utility loads);
3. End-user sign-off from Saigon Port dispatchers on the Map V2 Operations surface.
