# 01 — Problem Statement: Map V2 Simulation Architecture Cohesion

## 1. Context & Architectural Dilemma

Prior to Thread 8B, Map V2 for Saigon Port (Cảng Tân Thuận) had evolved through several high-value iterations:
- Canonical frozen geometry (1536 × 1024) across zones, buildings, roads, gates, boundaries, and operator anchors;
- Frozen B2 utility networks for electricity (11 nodes, 10 edges) and water (6 nodes, 5 edges) with source-to-host topology;
- 24 simulation meter records in SQLite audited in Thread 8A (12 active `SIM-EM-*`/`SIM-WM-*` meters and 12 legacy `CT-*` meters);
- Operational state badges (inspected readings, anomaly badges, round progress);
- Real zone assignees derived from backend roster and demo animated personnel.

However, these subsystems operated as largely independent, loosely coupled data silos:
- Utility networks were rendered from static layouts without formal bijective binding to database meter codes;
- Clicking a meter did not highlight its corresponding utility host node on the canvas;
- Clicking a utility host node did not open its hosted meter in the inspector;
- The Layer Manager lumped technical networks and demo animations alongside operational layers without clear conceptual boundaries;
- Real stationary assignees and demo personnel animations lacked formal provenance differentiation;
- There was no unified validation engine enforcing topological integrity across networks, meters, zones, and people.

```text
BEFORE (Fragmented):
B2 Electricity Network ───┐
B2 Water Network       ───┼──> Disjointed SVG Layers
SQLite SIM Meters      ───┤    (No cross-layer bindings,
Operational Overview   ───┤     unclear provenance)
Real Assignees         ───┤
Demo Personnel         ───┘

AFTER (Unified Simulation Infrastructure):
                     MAP V2 CANONICAL SURFACE
                                │
                                ▼
                    Unified Simulation Domain
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
      Zones                 Utilities                 People
        │                       │                       │
        │              ┌────────┴────────┐              │
        │              │                 │              │
        │         Electricity          Water            │
        │              │                 │              │
        │              ▼                 ▼              │
        │          Network B2        Network B2         │
        │              │                 │              │
        │              └────────┬────────┘              │
        │                       │                       │
        └────────────────── Meter Host                  │
                                │                       │
                                ▼                       ▼
                              Meter             Stationary Real /
                                │               Simulated Demo
                   ┌────────────┼────────────┐
                   │            │            │
                Reading       Status      Assignee
```

## 2. Core Directives & Constraints

1. **Map V2 Replaces Map V1**: Map V2 is the future canonical operational map surface. No hybrid UI, no legacy dependencies.
2. **Maritime Operational Minimalism**: High clarity, calm Technical Light as operational default, restrained Neon Digital Twin as optional mode.
3. **Deterministic Frozen Topology**: B2 geometry remains frozen (SHA256: `7f3a8916b841e12525969128783eb835218bcdd07f645dc1ee4305bce5a5cc6a`). Canonical crossing at `(740, 520)`.
4. **Honest Provenance Disclosure**: Never claim simulated meter coordinates are field-verified. Disclose `[MÔ PHỎNG]` and `[DEMO]` clearly in all surfaces.
5. **Strict Legacy Isolation**: Legacy `CT-001` through `CT-012` meters remain retired and isolated from active B2 utility topologies.
