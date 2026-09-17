# Network View Status: Preserved Functionality Only (Not Visually Approved)

Date: 2026-09-17  
Authoritative Baseline Anchor: `d0165a90753bf812f5d2cb551a8aa4116e31d5e6`  
Status: **FUNCTIONAL PRESERVATION ONLY — NOT VISUALLY APPROVED**

---

## 1. Statement of Non-Approval

The V16E-S2-R1 network rewrite (`commit a5b5e7a: refactor(network): introduce progressive topology explorer`) is **NOT APPROVED** for production.

The R1 implementation introduced:
- Hardcoded schematic coordinates and synthetic progressive lane layouts.
- Artificial node hierarchies based on simulated prefix conventions (`SIM-*`).
- Heavy utility classes mimicking uninstalled Tailwind styling.
- High visual clutter that departs from the Maritime Operational Minimalism standard.

---

## 2. Recovery Action Taken

In accordance with Section 9 of the V16E-RECOVERY-R0 specification:
1. All R1 network experiments, progressive explorers, and custom lane routing have been **completely removed**.
2. `frontend/src/features/map-operations/network/UtilityNetworkView.tsx` has been restored to the stable implementation from anchor `d0165a90753bf812f5d2cb551a8aa4116e31d5e6`.
3. Network topology remains strictly a **secondary Map mode**, accessible via the operational view mode selector.

---

## 3. Preserved Domain & Topology Capabilities

The restored implementation preserves:
- **Verified-only default filtering**: Only verified operational connections are displayed by default.
- **Utility type segregation**: Clean switching between Electricity (`ELECTRICITY`) and Water (`WATER`) distribution graphs.
- **Graph traversal**: Algorithmic Breadth-First Search (BFS) for upstream and downstream tracing upon node selection.
- **Context surface coordination**: Selecting an asset node synchronizes with `AssetContextSurface` in `ImmersiveSceneShell`.
- **Authoritative data binding**: Dynamic rendering derived from `getAdminAssetNetwork` (32 assets, verified feeder lines, pipeline connections) without hardcoded coordinates.

---

## 4. Future Direction

Current recovery preserves functionality only.

A separate, isolated, graph-driven prototype with proper automatic orthogonal edge routing, visual decluttering, and mobile-friendly interactions will be designed and reviewed in a future phase. No further visual patching should be attempted on this baseline during V16E-R0.
